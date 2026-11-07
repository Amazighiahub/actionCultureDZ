/**
 * Paiement direct au professionnel : Tala DZ affiche ses moyens de paiement et garde la trace de la
 * réservation, mais n'encaisse rien et ne prend aucune commission. L'argent va de l'acheteur au
 * professionnel ; c'est le professionnel qui confirme l'avoir reçu.
 */
const AppError = require('../utils/appError');
const { texteLisible } = require('../helpers/i18n');
const { notifier } = require('../utils/notifierModeration');

// Caractères invisibles (contrôle, sens d'écriture forcé) : ils peuvent maquiller un nom ou un texte
// eslint-disable-next-line no-control-regex -- volontaire : ces caractères sont justement ceux à retirer
const INVISIBLES = /[\u0000-\u0009\u000B-\u001F\u007F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
/** Mêmes invisibles, plus le « joiner » graphique U+034F (marque combinante : retirée par son code) */
const sansInvisibles = (s) => Array.from(String(s).replace(INVISIBLES, '')).filter((ch) => ch.codePointAt(0) !== 0x034F).join('');
const texte = (v, max, champ) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw AppError.badRequest(`${champ} invalide`);
  const t = sansInvisibles(v.replace(/\r\n?/g, '\n')).trim();
  if (t.length > max) throw AppError.badRequest(`${champ} : ${max} caractères au plus`);
  return t || null;
};
const chiffres = (v, champ, min, max) => {
  const t = texte(v, 40, champ);
  if (!t) return null;
  const c = t.replace(/[\s.-]/g, '');
  if (!/^\d+$/.test(c) || c.length < min || c.length > max) {
    throw AppError.badRequest(min === max ? `${champ} : ${min} chiffres` : `${champ} : de ${min} à ${max} chiffres`);
  }
  return c;
};

/** Nom de la plateforme, en lettres latines ou arabes (y compris l'ancienne graphie) */
// Latin : « Tala DZ », « Thala-DZ », « taladz » ; arabe : « ثالا » (l'écriture de la plateforme) partout,
// « تالا » seulement suivi de « DZ » / « دي زد » (c'est aussi un prénom courant)
const MOTIF_TALA = /\bth?ala\s*[-_.]?\s*dz\b|th?aladz|ثالا|تالا\s*[-_.]?\s*(dz|دي\s*زا?د|ديزا?د)/i;
const NOM_ARABE_SEUL = /^\s*(ثالا|تالا)\s*$/;
// Lettres cyrilliques qui ressemblent aux lettres latines du nom
const SOSIES = { 'а': 'a', 'А': 'a', 'т': 't', 'Т': 't', 'ӏ': 'l', 'Ӏ': 'l', 'і': 'i', 'І': 'i', 'ԁ': 'd', 'Ԁ': 'd', 'һ': 'h', 'о': 'o', 'е': 'e', 'с': 'c', 'р': 'p', 'х': 'x', 'у': 'y' };
/** Tatouil et voyelles arabes (fatha, kasra…) : retirés avant la comparaison */
const sansVoyellesArabes = (s) => Array.from(s).filter((ch) => {
  const c = ch.codePointAt(0);
  return !(c === 0x0640 || (c >= 0x064B && c <= 0x065F) || c === 0x0670);
}).join('');
/** Le texte imite-t-il le nom de la plateforme ? (formes compatibles, invisibles et voyelles retirés) */
const normaliserNom = (s) => sansVoyellesArabes(sansInvisibles(String(s).normalize('NFKC'))).replace(/[\u0400-\u04FF\u0500-\u052F]/g, (ch) => SOSIES[ch] || ch).toLowerCase();
const imiteTala = (s, { nomSeul = false } = {}) => {
  const n = normaliserNom(s);
  return MOTIF_TALA.test(n) || (nomSeul && NOM_ARABE_SEUL.test(n));
};
/** Adresse d'un lien : lettres seules (« paytala-dz.com » → « paytaladzcom ») */
const hoteImiteTala = (hote) => imiteTala(hote) || /th?aladz/.test(normaliserNom(hote).replace(/[^a-z]/g, ''));

/** Coordonnées qui servent à payer : leur changement demande le mot de passe et prévient le titulaire */
const CLES_PAIEMENT = ['titulaire', 'baridimob_rip', 'ccp_numero', 'ccp_cle', 'especes', 'lien_url', 'lien_libelle', 'consignes'];
// Toutes : un texte de consignes (« notre RIP a changé… ») détournerait autant qu'un RIP
const CLES_SENSIBLES = CLES_PAIEMENT;

/** Montant en DA (0 : gratuit ; vide : null) */
const montant = (v, champ) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1000000) throw AppError.badRequest(`${champ} : montant invalide`);
  return Math.round(n * 100) / 100;
};

/**
 * Moyens saisis par le professionnel → valeur enregistrée (null s'il n'a rien indiqué)
 * { titulaire, baridimob_rip, ccp_numero, ccp_cle, especes, lien_url, lien_libelle, consignes,
 *   envoi_algerie, envoi_etranger, main_propre }  (frais d'envoi des commandes, en DA ; null : pas d'envoi)
 */
function normaliserMoyens(entree) {
  if (entree === null) return null;
  if (typeof entree !== 'object' || Array.isArray(entree)) throw AppError.badRequest('Moyens de paiement invalides');
  const m = {
    titulaire: texte(entree.titulaire, 100, 'Titulaire du compte'),
    // RIP BaridiMob : 20 chiffres ; CCP : numéro et clé
    baridimob_rip: chiffres(entree.baridimob_rip, 'RIP BaridiMob', 20, 20),
    ccp_numero: chiffres(entree.ccp_numero, 'Numéro de CCP', 6, 12),
    ccp_cle: chiffres(entree.ccp_cle, 'Clé du CCP', 2, 2),
    especes: entree.especes === true,
    lien_url: texte(entree.lien_url, 500, 'Lien de paiement'),
    lien_libelle: texte(entree.lien_libelle, 60, 'Nom du lien'),
    consignes: texte(entree.consignes, 500, 'Consignes'),
    // Commandes de livres, d'œuvres d'art et d'artisanat : frais d'envoi et remise en main propre
    envoi_algerie: montant(entree.envoi_algerie, 'Frais d’envoi en Algérie'),
    envoi_etranger: montant(entree.envoi_etranger, 'Frais d’envoi à l’étranger'),
    main_propre: entree.main_propre === true,
  };
  if (m.lien_url && !/^https:\/\/[^\s]+$/i.test(m.lien_url)) {
    throw AppError.badRequest('Le lien de paiement doit commencer par https://');
  }
  if (m.lien_url) {
    let hote = '';
    try { hote = new URL(m.lien_url).hostname.toLowerCase(); } catch { throw AppError.badRequest('Lien de paiement invalide'); }
    // Un lien « tala… » ferait croire que Tala DZ encaisse : refusé
    if (hoteImiteTala(hote) || hote.startsWith('xn--') || hote.includes('.xn--')) {
      throw AppError.badRequest('Ce lien de paiement n’est pas accepté : utilisez le lien direct de votre service de paiement.');
    }
  }
  // Tala DZ n'encaisse jamais : un nom qui l'imite tromperait les acheteurs
  for (const [champ, nom] of [['titulaire', 'Titulaire du compte'], ['lien_libelle', 'Nom du lien'], ['consignes', 'Consignes']]) {
    if (m[champ] && imiteTala(m[champ], { nomSeul: champ === 'lien_libelle' })) throw AppError.badRequest(`${nom} : le nom de Tala DZ ne peut pas y figurer.`);
  }
  if ((m.ccp_numero && !m.ccp_cle) || (!m.ccp_numero && m.ccp_cle)) {
    throw AppError.badRequest('CCP : indiquez le numéro et la clé');
  }
  const rempli = m.baridimob_rip || m.ccp_numero || m.especes || m.lien_url;
  const autre = m.consignes || m.titulaire || m.envoi_algerie !== null || m.envoi_etranger !== null || m.main_propre;
  if (!rempli) return autre ? { ...m } : null;
  return m;
}

/** Au moins un moyen utilisable par l'acheteur */
const aUnMoyen = (m) => !!(m && (m.baridimob_rip || m.ccp_numero || m.especes || m.lien_url));

const lireMoyens = (v) => {
  if (!v) return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v;
};

async function mesMoyens(models, idUser) {
  const u = await models.User.findByPk(idUser, { attributes: ['moyens_paiement'] });
  return lireMoyens(u?.moyens_paiement);
}

/**
 * Enregistrement des moyens de paiement. Changer le RIP, le CCP, le titulaire ou le lien demande le
 * mot de passe (une session volée ne suffit pas à détourner les paiements) ; le titulaire du compte
 * est prévenu par e-mail et par notification, et le changement est journalisé.
 */
async function enregistrerMoyens(models, idUser, entree, { motDePasse, ip, userAgent, emailService, notificationService } = {}) {
  const moyens = normaliserMoyens(entree);
  const u = await models.User.unscoped().findByPk(idUser, { attributes: ['id_user', 'email', 'nom', 'prenom', 'password', 'moyens_paiement'] });
  if (!u) throw AppError.notFound('Compte');
  const avant = lireMoyens(u.moyens_paiement);
  // Vide, absent et « non coché » valent la même chose : seul un vrai changement compte
  const valeur = (v) => (v === undefined || v === null || v === '' || v === false ? null : v);
  const change = CLES_SENSIBLES.filter((k) => valeur(avant?.[k]) !== valeur(moyens?.[k]));
  if (change.length) {
    if (!motDePasse || typeof motDePasse !== 'string') {
      throw AppError.badRequest('Confirmez avec votre mot de passe pour changer vos coordonnées de paiement.', 'MOT_DE_PASSE_REQUIS');
    }
    const bcrypt = require('bcrypt');
    if (!u.password || !(await bcrypt.compare(motDePasse, u.password))) {
      throw AppError.badRequest('Mot de passe incorrect', 'MOT_DE_PASSE_INCORRECT');
    }
  }
  await models.User.update({ moyens_paiement: moyens }, { where: { id_user: idUser } });

  if (change.length) {
    if (models.AuditLog?.create) {
      await models.AuditLog.create({
        id_admin: idUser, action: 'moyens_paiement_modifies', entity_type: 'user', entity_id: idUser,
        details: { champs: change }, ip_address: ip ? String(ip).slice(0, 45) : null, user_agent: userAgent ? String(userAgent).slice(0, 500) : null,
      }).catch(() => {});
    }
    await notifier(notificationService, idUser, {
      titre: 'Coordonnées de paiement modifiées',
      message: 'Vos coordonnées de paiement viennent d’être modifiées. Si ce n’est pas vous, changez votre mot de passe tout de suite et écrivez à contact@taladz.com.',
      url_action: '/dashboard-pro', metadata: { champs: change },
    });
    if (emailService?.sendEmail && u.email) {
      const nom = [texteLisible(u.prenom), texteLisible(u.nom)].filter(Boolean).join(' ');
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      Promise.resolve(emailService.sendEmail(u.email, 'Vos coordonnées de paiement ont été modifiées',
        `<p>Bonjour ${esc(nom || '')},</p><p>Les coordonnées de paiement de votre compte Tala DZ (RIP, CCP ou lien de paiement) viennent d’être modifiées.</p>`
        + '<p>Si c’est vous, il n’y a rien à faire.</p><p><b>Si ce n’est pas vous</b> : changez tout de suite votre mot de passe (« Mot de passe oublié » sur la page de connexion) et écrivez à contact@taladz.com.</p>'
        + '<p>Rappel : Tala DZ n’encaisse jamais d’argent et ne vous demandera jamais vos codes bancaires.</p>', null, null, { type: 'securite' })).catch(() => {});
    }
  }
  return moyens;
}

const STATUTS_SANS_PAIEMENT = ['invitation', 'annule'];
// Organisateur dont on peut montrer les coordonnées (pas un compte suspendu, banni ou supprimé)
const ORGANISATEUR_EN_REGLE = ['actif'];

/**
 * Ce que voit le participant : montant, état du paiement et moyens de l'organisateur.
 * Les coordonnées ne sont montrées qu'aux personnes inscrites (pas en public).
 */
async function paiementDuParticipant(models, idEvenement, idUser) {
  const inscription = await models.EvenementUser.findOne({
    where: { id_evenement: idEvenement, id_user: idUser },
    attributes: ['statut_participation', 'montant_du', 'date_paiement'],
  });
  if (!inscription || STATUTS_SANS_PAIEMENT.includes(inscription.statut_participation)) {
    throw new AppError('Inscription introuvable', 404, 'INSCRIPTION_INTROUVABLE');
  }
  const montant = inscription.montant_du === null ? null : Number(inscription.montant_du);
  if (montant === 0) return { montant: 0, paye: false, date_paiement: null, moyens: null, organisateur: null };
  const evenement = await models.Evenement.findByPk(idEvenement, { attributes: ['id_user'] });
  const organisateur = evenement?.id_user
    ? await models.User.findByPk(evenement.id_user, { attributes: ['id_user', 'nom', 'prenom', 'moyens_paiement', 'statut'] })
    : null;
  // Organisateur suspendu (par exemple pour fraude) : plus de coordonnées de paiement montrées
  const enRegle = !!organisateur && ORGANISATEUR_EN_REGLE.includes(organisateur.statut);
  const moyens = enRegle ? lireMoyens(organisateur?.moyens_paiement) : null;
  return {
    montant,
    paye: !!inscription.date_paiement,
    date_paiement: inscription.date_paiement,
    moyens: aUnMoyen(moyens) ? moyens : null,
    // Ne pas payer : l'organisateur n'est plus en règle (le site le dit au participant)
    organisateur_indisponible: !!organisateur && !enRegle,
    organisateur: organisateur
      ? { id: organisateur.id_user, nom: [texteLisible(organisateur.prenom), texteLisible(organisateur.nom)].filter(Boolean).join(' ') }
      : null,
  };
}

/**
 * L'organisateur (ou l'administration) indique qu'il a reçu le paiement, ou corrige une erreur.
 * Une inscription encore « en attente » est confirmée en même temps : le participant est prévenu.
 */
async function confirmerPaiement(models, evenementService, notificationService, { idEvenement, idParticipant, recu, par }) {
  const evenement = await evenementService._assertEventOwnerOrAdmin(idEvenement, par.id, par.isAdmin);
  const inscription = await models.EvenementUser.findOne({ where: { id_evenement: idEvenement, id_user: idParticipant } });
  if (!inscription || STATUTS_SANS_PAIEMENT.includes(inscription.statut_participation)) {
    throw new AppError('Inscription introuvable', 404, 'INSCRIPTION_INTROUVABLE');
  }
  const dejaRecu = !!inscription.date_paiement;
  await inscription.update({ date_paiement: recu ? (inscription.date_paiement || new Date()) : null });
  if (recu && !dejaRecu) {
    if (inscription.statut_participation === 'inscrit') {
      // Même chemin qu'une validation : statut confirmé et message de confirmation au participant
      await evenementService.validateParticipation(idEvenement, idParticipant, true, par, '');
    } else {
      await notifier(notificationService, idParticipant, {
        titre: 'Paiement reçu',
        message: `L’organisateur a bien reçu votre paiement pour « ${texteLisible(evenement.nom_evenement)} ».`,
        url_action: `/evenements/${idEvenement}`,
        metadata: { id_evenement: Number(idEvenement) },
      });
    }
  }
  return { paye: recu, date_paiement: inscription.date_paiement };
}

module.exports = { INVISIBLES, CLES_PAIEMENT, CLES_SENSIBLES, normaliserMoyens, aUnMoyen, lireMoyens, mesMoyens, enregistrerMoyens, paiementDuParticipant, confirmerPaiement };
