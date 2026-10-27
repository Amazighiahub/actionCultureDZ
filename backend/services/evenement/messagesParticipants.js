/**
 * Messages de l'organisateur à ses participants (organisateur de l'événement ou administration).
 *
 * Changement de programme, point de rencontre, programme en PDF, groupe WhatsApp, dossier Drive :
 * chaque participant visé reçoit une notification sur le site et un email (y compris les comptes
 * créés par import qui n'ont pas encore choisi leur mot de passe). Les emails partent un par un,
 * en arrière-plan ; le message est gardé avec le nombre d'emails envoyés.
 */
const { Op } = require('sequelize');

/** À qui : « tous » = toute personne inscrite sauf les annulés / refusés */
const CIBLES = {
  tous: ['inscrit', 'confirme', 'present', 'absent'],
  confirme: ['confirme', 'present'],
  en_attente: ['inscrit']
};
const LIMITES = { titre: 150, message: 5000, point_rencontre: 300, lien: 500 };
const LIENS = { lien_programme: 'Le lien du programme', lien_whatsapp: 'Le lien du groupe WhatsApp', lien_drive: 'Le lien du dossier Drive' };

/**
 * PDF mis en ligne depuis le formulaire (stockage Cloudinary « raw ») : Cloudinary le donne sans
 * extension ni type, et refuse les liens en « .pdf ». Le site le sert donc lui-même, sous le nom
 * « programme.pdf » ; les autres liens (Drive…) restent tels quels.
 */
const estPdfDuSite = (url) => Boolean(url && process.env.CLOUDINARY_CLOUD_NAME
  && url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/`));
const lienPublicProgramme = (m) => (estPdfDuSite(m.lien_programme)
  ? `${process.env.FRONTEND_URL}/api/evenements/${m.id_evenement}/messages/${m.id_message}/programme.pdf`
  : m.lien_programme);

const erreur = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const texte = (v) => (typeof v === 'string' ? v.trim() : '');

/** Lien http(s) complet, sinon erreur claire ; vide = pas de lien */
function lireLien(brut, libelle) {
  const v = texte(brut);
  if (!v) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw erreur(`${libelle} n'est pas une adresse valide`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
    throw erreur(`${libelle} n'est pas une adresse valide`);
  }
  if (url.href.length > LIMITES.lien) throw erreur(`${libelle} est trop long`);
  return url.href;
}

/** Données du formulaire vérifiées et nettoyées */
function lireMessage(donnees = {}) {
  const cible = Object.prototype.hasOwnProperty.call(CIBLES, donnees.cible) ? donnees.cible : 'tous';
  const titre = texte(donnees.titre);
  const message = texte(donnees.message);
  const point_rencontre = texte(donnees.point_rencontre) || null;
  if (titre.length < 3) throw erreur('Écrivez l\'objet du message');
  if (titre.length > LIMITES.titre) throw erreur(`L'objet est trop long (${LIMITES.titre} caractères au plus)`);
  if (!message) throw erreur('Écrivez le message');
  if (message.length > LIMITES.message) throw erreur(`Le message est trop long (${LIMITES.message} caractères au plus)`);
  if (point_rencontre && point_rencontre.length > LIMITES.point_rencontre) {
    throw erreur(`Le point de rencontre est trop long (${LIMITES.point_rencontre} caractères au plus)`);
  }
  const liens = {};
  for (const [champ, libelle] of Object.entries(LIENS)) liens[champ] = lireLien(donnees[champ], libelle);
  return { cible, titre: titre.replace(/[\r\n]+/g, ' '), message, point_rencontre, ...liens };
}

/** Texte de la notification sur le site : le message suivi des informations pratiques */
function texteNotification(m) {
  const infos = [
    m.point_rencontre && `📍 Point de rencontre : ${m.point_rencontre}`,
    m.lien_programme && `📄 Programme (PDF) : ${m.lien_programme}`,
    m.lien_whatsapp && `💬 Groupe WhatsApp : ${m.lien_whatsapp}`,
    m.lien_drive && `📁 Dossier Drive : ${m.lien_drive}`
  ].filter(Boolean);
  return infos.length ? `${m.message}\n\n${infos.join('\n')}` : m.message;
}

class MessagesParticipants {
  constructor(models, { emailService, logger, pauseMs = 300 } = {}) {
    this.models = models;
    this.emailService = emailService;
    this.logger = logger || console;
    this.pauseMs = pauseMs;
  }

  async _evenement(idEvenement, utilisateur) {
    const evenement = await this.models.Evenement.findByPk(idEvenement, { attributes: ['id_evenement', 'nom_evenement', 'id_user'] });
    if (!evenement) throw erreur('Événement introuvable', 404);
    if (!utilisateur.isAdmin && Number(evenement.id_user) !== Number(utilisateur.id_user)) {
      throw erreur('Seul l\'organisateur de l\'événement peut écrire à ses participants', 403);
    }
    return evenement;
  }

  async _destinataires(idEvenement, cible) {
    const inscriptions = await this.models.EvenementUser.findAll({
      where: { id_evenement: idEvenement, statut_participation: { [Op.in]: CIBLES[cible] } },
      attributes: ['id_user'],
      include: [{ model: this.models.User, as: 'User', attributes: ['id_user', 'email', 'prenom', 'nom'], required: true }]
    });
    return inscriptions.map(i => i.User);
  }

  /** Nombre de personnes pour chaque choix, et messages déjà envoyés (les plus récents d'abord) */
  async lister(idEvenement, utilisateur) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    const lignes = await this.models.EvenementUser.findAll({
      where: { id_evenement: evenement.id_evenement },
      attributes: ['statut_participation'],
      raw: true
    });
    const nombres = Object.fromEntries(Object.entries(CIBLES).map(([cible, statuts]) =>
      [cible, lignes.filter(l => statuts.includes(l.statut_participation)).length]));
    const messages = this.models.MessageEvenement ? await this.models.MessageEvenement.findAll({
      where: { id_evenement: evenement.id_evenement },
      order: [['date_creation', 'DESC']],
      limit: 30,
      raw: true
    }) : [];
    return { nombres, messages: messages.map(m => ({ ...m, lien_programme: lienPublicProgramme(m) })) };
  }

  /**
   * Envoie le message : notifications tout de suite, emails en arrière-plan.
   * @returns {{ message: object, destinataires: number, email_etat: string }}
   */
  async envoyer(idEvenement, utilisateur, donnees) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    const m = lireMessage(donnees);
    const destinataires = await this._destinataires(evenement.id_evenement, m.cible);
    if (!destinataires.length) throw erreur('Personne à prévenir pour ce choix de participants');

    const enregistre = await this.models.MessageEvenement.create({
      ...m, id_evenement: evenement.id_evenement, id_user: utilisateur.id_user, nb_destinataires: destinataires.length
    });
    const envoye = { ...m, lien_programme: lienPublicProgramme({ ...m, id_evenement: evenement.id_evenement, id_message: enregistre.id_message }) };

    await this.models.Notification.bulkCreate(destinataires.map(u => ({
      id_user: u.id_user,
      type_notification: 'message_evenement',
      titre: m.titre.slice(0, 255),
      message: texteNotification(envoye),
      id_evenement: evenement.id_evenement,
      url_action: `/evenements/${evenement.id_evenement}`,
      priorite: 'haute',
      lu: false,
      email_envoye: false
    })));

    const avecEmail = destinataires.filter(u => u.email);
    if (avecEmail.length && this.emailService) {
      this._envoyerEmails(enregistre, avecEmail, evenement, envoye)
        .catch(err => this.logger.error('Envoi des emails aux participants interrompu:', err.message));
    }

    return {
      message: enregistre,
      destinataires: destinataires.length,
      emails: avecEmail.length,
      // En pause, les emails sont seulement simulés : l'organisateur le voit
      email_etat: typeof this.emailService?.etatEnvoi === 'function' ? this.emailService.etatEnvoi() : 'actif'
    };
  }

  /** Adresse Cloudinary du PDF d'un message (servi par le site) ; 404 si ce message n'en a pas */
  async programme(idEvenement, idMessage) {
    const m = await this.models.MessageEvenement.findOne({
      where: { id_message: idMessage, id_evenement: idEvenement }, attributes: ['lien_programme'], raw: true
    });
    if (!m || !estPdfDuSite(m.lien_programme)) throw erreur('Programme introuvable', 404);
    return m.lien_programme;
  }

  /** Un email après l'autre (avec une courte pause) ; le bilan est gardé avec le message */
  async _envoyerEmails(enregistre, destinataires, evenement, m) {
    let envoyes = 0;
    let echecs = 0;
    for (const [index, user] of destinataires.entries()) {
      try {
        const res = await this.emailService.sendMessageParticipant(user, { evenement, ...m });
        if (res && res.success === false) echecs++; else envoyes++;
      } catch {
        echecs++;
      }
      if (this.pauseMs && index < destinataires.length - 1) await new Promise(r => setTimeout(r, this.pauseMs));
    }
    await enregistre.update({ nb_emails_envoyes: envoyes, nb_emails_echoues: echecs });
    this.logger.info(`Message « ${m.titre} » (événement ${evenement.id_evenement}) : ${envoyes} email(s) envoyé(s), ${echecs} échec(s)`);
    return { envoyes, echecs };
  }
}

module.exports = { MessagesParticipants, lireMessage, lireLien, texteNotification, lienPublicProgramme, CIBLES };
