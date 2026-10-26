/**
 * Import d'une liste d'inscriptions (classeur Excel d'un formulaire en ligne) dans un événement.
 * Sert le bouton « Importer une liste » de Gérer › Participants (aperçu, puis import).
 *
 * Pour chaque ligne cochée :
 * - un compte visiteur est créé si l'email n'en a pas (sinon le compte existant est repris) ;
 *   sans mot de passe utilisable ni conditions acceptées : la personne les accepte en choisissant
 *   son mot de passe, grâce au lien d'invitation (valable 7 jours) ;
 * - elle est inscrite à l'événement « En attente » : l'organisateur confirme ou refuse ensuite ;
 * - ses réponses sont reprises dans les questions du formulaire de l'événement (colonnes reconnues
 *   par leur titre), le montant est calculé comme pour une inscription faite sur le site.
 * Relançable : une personne déjà inscrite à l'événement est laissée telle quelle.
 */
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { listerChamps, verifierReponses } = require('./formulaireInscription');
const { configAvecProfil, tarificationDe, montantInscription } = require('./tarification');
const { TYPE_USER_IDS } = require('../../constants/typeUserIds');

const LIGNES_MAX = 500;
const INVITATION_HEURES = 7 * 24;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const sansAccent = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’']/g, ' ').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

/** Valeur lisible d'une cellule exceljs (texte riche, lien, formule, date) */
const texte = (cell) => {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(r => r.text).join('').trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
};

// Colonnes du compte, reconnues par leur titre (sans accent ni casse)
const COLONNES_COMPTE = {
  date: ['date d inscription', 'horodateur', 'timestamp', 'date'],
  nom: ['nom et prenom', 'nom complet', 'prenom et nom', 'nom'],
  email: ['e mail', 'email', 'adresse e mail', 'adresse email', 'courriel']
};
// Titres courts d'un tableau d'inscriptions → questions du formulaire (clé)
const SYNONYMES = {
  tel: ['telephone whatsapp', 'telephone', 'tel', 'whatsapp'],
  age: ['age'],
  ville: ['ville ou wilaya', 'ville', 'wilaya'],
  profil: ['profil', 'vous etes'],
  profil_autre: ['precisez votre categorie', 'categorie'],
  metier: ['metier ou etudes', 'metier ou domaine d etudes', 'metier'],
  experience: ['experience', 'experience en construction traditionnelle'],
  interets: ['centres d interet', 'ce qui vous interesse'],
  presence: ['presence'],
  dates: ['dates si partielle', 'quelles dates', 'dates'],
  jours: ['nombre de jours', 'combien de jours'],
  hebergement: ['hebergement', 'besoin d hebergement'],
  sante: ['sante alimentation', 'sante'],
  urgence: ['contact d urgence', 'personne a contacter en cas d urgence'],
  motivation: ['motivation', 'pourquoi souhaitez vous participer'],
  photos: ['accord photos', 'photos'],
  frais: ['frais acceptes', 'frais'],
  engagement: ['engagement', 'consignes de securite'],
  competences: ['competences', 'competences que vous pouvez apporter'],
  idees: ['idees d amenagement', 'idees']
};

/** Lit la première feuille : une ligne de titres, puis une inscription par ligne */
async function lireClasseur(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw Object.assign(new Error('Le classeur est vide'), { statusCode: 400 });
  const titres = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => { titres[col] = texte(cell); });
  const lignes = [];
  for (let r = 2; r <= ws.rowCount && lignes.length < LIGNES_MAX; r++) {
    const row = ws.getRow(r);
    const valeurs = {};
    let vide = true;
    titres.forEach((titre, col) => {
      if (!titre) return;
      const cell = row.getCell(col);
      const v = cell?.value instanceof Date ? cell.value : texte(cell);
      if (v !== '') vide = false;
      valeurs[titre] = v;
    });
    if (!vide) lignes.push({ numero: r, valeurs });
  }
  return { titres: titres.filter(Boolean), lignes };
}

/** Colonne du classeur → clé (compte ou question du formulaire) */
function associerColonnes(titres, champs) {
  const parTitre = {};
  const libelleChamp = (c) => sansAccent(typeof c.label === 'string' ? c.label : c.label?.fr);
  for (const titre of titres) {
    const t = sansAccent(titre);
    const compte = Object.entries(COLONNES_COMPTE).find(([, noms]) => noms.includes(t));
    if (compte) { parTitre[titre] = { compte: compte[0] }; continue; }
    const champ = champs.find(c => libelleChamp(c) === t || (SYNONYMES[c.cle] || []).includes(t));
    if (champ) parTitre[titre] = { champ: champ.cle };
  }
  return parTitre;
}

const optionProche = (champ, valeur) => {
  const v = sansAccent(valeur);
  return (champ.options || []).find(o => sansAccent(o.valeur) === v || sansAccent(typeof o.label === 'string' ? o.label : o.label?.fr) === v);
};

/** Email du classeur : minuscules ; une faute fréquente (« gmail.coml.com ») est corrigée et signalée */
function lireEmail(brut) {
  let email = String(brut || '').trim().toLowerCase().replace(/\s+/g, '');
  const avant = email;
  email = email.replace(/@(gmail|yahoo|hotmail|outlook|icloud)\.(com|fr)[a-z.]+$/, '@$1.$2');
  return { email, corrige: email !== avant ? avant : null, valide: EMAIL_RE.test(email) };
}

/** Date « 16/10/2026 18:01:25 » (ou date Excel) → Date, sinon null */
function lireDate(v) {
  if (v instanceof Date) return v;
  const m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], (+m[4] || 0) - 1, +m[5] || 0, +m[6] || 0)); // heure d'Algérie (UTC+1)
}

/**
 * Une ligne → réponses au formulaire de l'événement, avec les remarques à montrer dans l'aperçu.
 * Un profil absent des choix (« Amateur du patrimoine ») n'est pas deviné : l'organisateur choisit
 * le vrai profil dans l'aperçu (`profilChoisi`) ; `profilInconnu` garde ce qui était écrit.
 */
function convertirLigne(ligne, colonnes, config, profilChoisi = null) {
  const champs = listerChamps(config);
  const brutes = {};
  const compte = {};
  const remarques = [];
  let profilInconnu = null;
  for (const [titre, cible] of Object.entries(colonnes)) {
    const valeur = ligne.valeurs[titre];
    if (valeur === '' || valeur === undefined || valeur === null) continue;
    if (cible.compte) { compte[cible.compte] = valeur; continue; }
    const champ = champs.find(c => c.cle === cible.champ);
    const v = String(valeur).trim();
    if (champ.type === 'choix') {
      const opt = optionProche(champ, v);
      if (opt) brutes[champ.cle] = opt.valeur;
      else if (champ.cle === 'profil') {
        profilInconnu = v;
        const choisi = profilChoisi && optionProche(champ, profilChoisi);
        if (choisi) brutes.profil = choisi.valeur;
        remarques.push(choisi ? `Profil « ${v} » → ${choisi.valeur}` : `« ${v} » n'est pas un profil : choisissez le sien`);
      } else remarques.push(`« ${v} » n'est pas un choix de « ${typeof champ.label === 'string' ? champ.label : champ.label?.fr} » : ignoré`);
    } else if (champ.type === 'choix_multiple') {
      const choisis = [];
      for (const morceau of v.split(/\s*,\s*(?![^()]*\))/)) {
        const opt = optionProche(champ, morceau);
        if (opt) choisis.push(opt.valeur);
        else if (morceau) remarques.push(`« ${morceau} » ignoré`);
      }
      if (choisis.length) brutes[champ.cle] = choisis;
    } else if (champ.type === 'accord') {
      brutes[champ.cle] = /^(oui|yes|true|1|x)$/i.test(v) ? 'Oui' : 'Non';
    } else if (champ.type === 'nombre') {
      const n = v.match(/-?\d+/);
      if (n) brutes[champ.cle] = n[0];
    } else {
      brutes[champ.cle] = v;
    }
  }
  const { reponses, erreurs } = verifierReponses(config, brutes);
  for (const e of erreurs) {
    if (e.cle === 'profil' && profilInconnu) continue; // déjà signalé : profil à choisir
    remarques.push(e.raison === 'requis' ? `Sans réponse : ${e.label}` : `Réponse non valable : ${e.label}`);
  }
  return { compte, reponses, remarques, profilInconnu };
}

class ImportInscriptions {
  constructor(models, { emailService, logger } = {}) {
    this.models = models;
    this.emailService = emailService;
    this.logger = logger || console;
  }

  async _evenement(idEvenement, utilisateur) {
    const { Evenement, TypeEvenement } = this.models;
    const evenement = await Evenement.findByPk(idEvenement, {
      include: [{ model: TypeEvenement, as: 'TypeEvenement', attributes: ['config_inscription'], required: false }]
    });
    if (!evenement) throw Object.assign(new Error('Événement introuvable'), { statusCode: 404 });
    if (!utilisateur.isAdmin && Number(evenement.id_user) !== Number(utilisateur.id_user)) {
      throw Object.assign(new Error('Seul l\'organisateur de l\'événement peut importer ses inscriptions'), { statusCode: 403 });
    }
    const config = configAvecProfil(evenement.TypeEvenement?.config_inscription, tarificationDe(evenement));
    return { evenement, config };
  }

  /**
   * Aperçu : une ligne par inscription, ce qui sera fait, et les remarques ; rien n'est écrit.
   * `profils` : profil choisi par l'organisateur, par numéro de ligne, quand celui du classeur
   * n'est pas un des choix du formulaire.
   */
  async apercu(buffer, idEvenement, utilisateur, { profils = {} } = {}) {
    const { evenement, config } = await this._evenement(idEvenement, utilisateur);
    const { titres, lignes } = await lireClasseur(buffer);
    const colonnes = associerColonnes(titres, listerChamps(config));
    const reconnues = Object.values(colonnes);
    if (!reconnues.some(c => c.compte === 'email')) {
      throw Object.assign(new Error('Colonne « E-mail » introuvable dans la première ligne du classeur'), { statusCode: 400 });
    }

    const emails = [];
    const resultat = [];
    for (const ligne of lignes) {
      const { compte, reponses, remarques, profilInconnu } = convertirLigne(ligne, colonnes, config, profils[ligne.numero]);
      const mail = lireEmail(compte.email);
      if (mail.corrige) remarques.unshift(`Email corrigé : ${mail.corrige} → ${mail.email}`);
      let action = 'creer';
      if (!mail.valide) action = 'invalide';
      else if (emails.includes(mail.email)) action = 'doublon';
      emails.push(mail.email);
      resultat.push({
        ligne: ligne.numero,
        nom: String(compte.nom || '').trim(),
        email: mail.email,
        date: lireDate(compte.date),
        reponses,
        montant: montantInscription(evenement, reponses),
        remarques,
        action,
        // Profil du classeur absent des choix : à choisir par l'organisateur avant l'import
        profil_inconnu: profilInconnu
      });
    }

    // Comptes existants, et personnes déjà inscrites à l'événement
    const valides = resultat.filter(r => r.action === 'creer').map(r => r.email);
    if (valides.length) {
      const existants = await this.models.User.findAll({ where: { email: { [Op.in]: valides } }, attributes: ['id_user', 'email'] });
      const parEmail = new Map(existants.map(u => [u.email.toLowerCase(), u.id_user]));
      const inscrits = existants.length ? await this.models.EvenementUser.findAll({
        where: { id_evenement: evenement.id_evenement, id_user: { [Op.in]: existants.map(u => u.id_user) } }, attributes: ['id_user']
      }) : [];
      const dejaInscrits = new Set(inscrits.map(i => i.id_user));
      for (const r of resultat) {
        const id = parEmail.get(r.email);
        if (r.action !== 'creer' || !id) continue;
        r.action = dejaInscrits.has(id) ? 'deja_inscrit' : 'inscrire';
      }
    }

    const champProfil = listerChamps(config).find(c => c.cle === 'profil');
    return {
      evenement: { id: evenement.id_evenement, nom: evenement.nom_evenement },
      profils: (champProfil?.options || []).map(o => ({ valeur: o.valeur, label: o.label })),
      colonnes: titres.map(t => ({ titre: t, cible: colonnes[t] ? (colonnes[t].compte || colonnes[t].champ) : null })),
      lignes: resultat
    };
  }

  /**
   * Import des lignes choisies (numéros de ligne du classeur) ; invitation envoyée aux comptes
   * créés si `inviter`. Retourne le bilan.
   */
  async importer(buffer, idEvenement, utilisateur, { lignes: choisies, inviter = true, profils = {} } = {}) {
    const { evenement } = await this._evenement(idEvenement, utilisateur);
    const apercu = await this.apercu(buffer, idEvenement, utilisateur, { profils });
    const aFaire = apercu.lignes.filter(l => (!choisies || choisies.includes(l.ligne)) && ['creer', 'inscrire'].includes(l.action));
    const bilan = { comptes_crees: 0, inscrits: 0, invitations: 0, erreurs: [] };
    // Pas d'inscription sans vrai profil : la personne reste à inscrire une fois son profil choisi
    for (const l of aFaire.filter(x => x.profil_inconnu && !x.reponses.profil)) {
      bilan.erreurs.push(`Ligne ${l.ligne} (${l.nom || l.email}) : profil à choisir, non inscrite`);
    }
    aFaire.splice(0, aFaire.length, ...aFaire.filter(x => !(x.profil_inconnu && !x.reponses.profil)));

    for (const l of aFaire) {
      try {
        let user = await this.models.User.findOne({ where: { email: l.email } });
        let nouveau = false;
        if (!user) {
          const mdp = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10); // inutilisable : remplacé via l'invitation
          // Hooks désactivés : les conditions d'utilisation seront acceptées avec le mot de passe
          user = await this.models.User.create({
            nom: { fr: l.nom || l.email.split('@')[0] },
            prenom: { fr: '' },
            email: l.email,
            password: mdp,
            telephone: typeof l.reponses.tel === 'string' ? l.reponses.tel.slice(0, 20) : null,
            id_type_user: TYPE_USER_IDS.VISITEUR,
            statut: 'actif',
            email_verifie: false,
            accepte_conditions: false
          }, { hooks: false });
          nouveau = true;
          bilan.comptes_crees += 1;
        }
        const [, cree] = await this.models.EvenementUser.findOrCreate({
          where: { id_evenement: evenement.id_evenement, id_user: user.id_user },
          defaults: {
            statut_participation: 'inscrit',
            role_participation: 'participant',
            date_inscription: l.date || new Date(),
            reponses_inscription: l.reponses,
            montant_du: l.montant
          }
        });
        if (cree) bilan.inscrits += 1;
        if (nouveau && inviter && this.emailService) {
          const jeton = await this.models.EmailVerification.createVerificationToken(user.id_user, 'password_reset', { invitation: true }, null, INVITATION_HEURES);
          const envoi = await this.emailService.sendInvitationInscription(user, jeton.token, evenement);
          if (envoi?.success !== false) bilan.invitations += 1;
          else bilan.erreurs.push(`${l.email} : invitation non envoyée`);
        }
      } catch (e) {
        this.logger.error?.(`Import inscription ligne ${l.ligne}: ${e.message}`);
        bilan.erreurs.push(`Ligne ${l.ligne} (${l.email}) : ${e.message}`);
      }
    }
    return bilan;
  }
}

module.exports = { ImportInscriptions, lireClasseur, associerColonnes, convertirLigne, lireEmail, lireDate, INVITATION_HEURES };
