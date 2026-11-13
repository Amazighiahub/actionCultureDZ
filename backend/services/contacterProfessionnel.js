/**
 * Un visiteur connecté écrit à un professionnel depuis sa page (audit V11 UX-26, choix de la responsable).
 *
 * Le message part par e-mail au professionnel, avec l'adresse du visiteur en « Répondre à » : le pro
 * répond depuis sa messagerie. L'adresse du professionnel n'est jamais montrée au visiteur.
 * Garde-fous : visiteur connecté (e-mail vérifié), 5 messages par heure au plus (route), anti-robot,
 * même professionnel 3 fois par jour au plus, texte échappé, en-têtes sans retour à la ligne.
 */
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const { PROFESSIONAL_TYPE_IDS } = require('../constants/publicAttributes');
const { premiereFoisPendant, oublierUneFois } = require('./quotaEmail');
const { nomComplet, sansInvisibles } = require('../utils/texte');
const logger = require('../utils/logger');

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const SUJET_MAX = 200;
const PAR_JOUR_MEME_PRO = 3;

// Une ligne, sans caractères invisibles (un sens d'écriture forcé pouvait maquiller le sujet)
const unaLigne = (v, max) => sansInvisibles(String(v || '')).replace(/[\r\n\u2028\u2029\u0085]+/g, ' ').trim().slice(0, max);

async function contacterProfessionnel(models, emailService, { idExpediteur, idPro, sujet, message }) {
  if (Number(idExpediteur) === Number(idPro)) throw AppError.badRequest('Vous ne pouvez pas vous écrire à vous-même');
  const texte = sansInvisibles(String(message || '').replace(/\r\n?/g, '\n')).trim();
  if (texte.length < MESSAGE_MIN || texte.length > MESSAGE_MAX) {
    throw AppError.badRequest('Le message doit faire entre 10 et 2000 caractères');
  }

  const pro = await models.User.findOne({
    where: { id_user: idPro, statut: 'actif', profil_public: true, accepte_conditions: true, id_type_user: { [Op.in]: PROFESSIONAL_TYPE_IDS } },
    attributes: ['id_user', 'prenom', 'nom', 'email'],
  });
  if (!pro?.email) throw new AppError('Ce professionnel est introuvable', 404, 'PRO_INTROUVABLE');

  const expediteur = await models.User.findByPk(idExpediteur, { attributes: ['id_user', 'prenom', 'nom', 'email', 'statut'] });
  if (!expediteur?.email || expediteur.statut !== 'actif') throw AppError.forbidden('Votre compte ne peut pas envoyer de message');

  // Pas plus de 3 messages par jour au même professionnel (chaque essai réserve une place)
  let place = null;
  for (let i = 1; i <= PAR_JOUR_MEME_PRO && !place; i++) {
    const cle = `contact-pro:${idExpediteur}:${idPro}:${i}`;
    if (await premiereFoisPendant(cle, 24 * 3600)) place = cle;
  }
  if (!place) throw new AppError('Vous avez déjà écrit plusieurs fois à ce professionnel aujourd’hui. Réessayez demain.', 429, 'CONTACT_PRO_LIMITE');

  const qui = unaLigne(nomComplet(expediteur), 120) || 'Un visiteur de Tala DZ';
  const objet = unaLigne(sujet, SUJET_MAX);
  const esc = (v) => emailService._escapeHtml(v || '');
  const page = `${process.env.FRONTEND_URL || 'https://taladz.com'}/professionnels/${pro.id_user}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2b2a26;">
      <h2 style="color: #3A4224;">Nouveau message sur Tala DZ</h2>
      <p>Bonjour ${esc(nomComplet(pro))},</p>
      <p><b>${esc(qui)}</b> vous écrit depuis votre page Tala DZ${objet ? ` (sujet : <b>${esc(objet)}</b>)` : ''} :</p>
      <div style="background-color: #f6f4ec; padding: 14px 16px; border-radius: 8px; white-space: pre-wrap;">${esc(texte)}</div>
      <p>Pour répondre, utilisez simplement « Répondre » dans votre messagerie : la réponse partira à ${esc(qui)}.</p>
      <p style="font-size: 13px; color: #6b6a63;">Votre adresse e-mail n'a pas été montrée à cette personne ; elle la verra seulement si vous lui répondez.
      Message abusif ? Transférez-le à contact@taladz.com.</p>
      <p style="font-size: 13px; color: #6b6a63;"><a href="${encodeURI(page)}">Votre page Tala DZ</a></p>
    </div>`;
  const text = `${qui} vous écrit depuis votre page Tala DZ${objet ? ` (sujet : ${objet})` : ''} :\n\n${texte}\n\nPour répondre, utilisez « Répondre » dans votre messagerie.`;

  const resultat = await emailService.sendEmail(
    pro.email,
    `Message de ${unaLigne(qui, 80)} sur Tala DZ${objet ? ` : ${objet}` : ''}`,
    html,
    null,
    text,
    // Part du quota et compteur par destinataire à part : ces messages ne privent jamais le site
    // (commandes, confirmations…) ni le pro de ses autres e-mails
    { type: 'contact_pro', headers: { 'Reply-To': unaLigne(expediteur.email, 254) } }
  );
  if (!resultat?.success) {
    // Rien n'est parti : la place du jour pour ce professionnel est rendue
    await oublierUneFois(place);
    // Pas le texte brut de la messagerie (il contient souvent l'adresse du destinataire)
    logger.warn(`Message à un professionnel non envoyé (${resultat?.limite ? `limite : ${resultat.limite}` : 'échec d’envoi'})`);
    if (resultat?.limite) {
      throw new AppError('Trop de messages ont été envoyés aujourd’hui. Réessayez demain.', 429, 'CONTACT_PRO_QUOTA');
    }
    throw new AppError('Le message n’a pas pu être envoyé. Réessayez dans un instant.', 503, 'CONTACT_PRO_NON_ENVOYE');
  }
  logger.info(`Message d'un visiteur à un professionnel : ${idExpediteur} → ${idPro}`);
  return { envoye: true };
}

module.exports = { contacterProfessionnel, MESSAGE_MIN, MESSAGE_MAX, SUJET_MAX };
