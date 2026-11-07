/**
 * Newsletter sans compte : l'e-mail seul suffit, confirmé par un lien avant tout envoi. Sans cette
 * confirmation, n'importe qui pourrait inscrire l'adresse d'une autre personne.
 */
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/maskPII');
const { signUnsubscribe, verifyUnsubscribe } = require('../utils/newsletterUnsubscribe');
const { budgetEnvoiGroupe } = require('./quotaEmail');

const CONFIRMATION_JOURS = 7;
const RENVOI_APRES_HEURES = 24;
const PURGE_JOURS = 30;

const adresseValide = (email) => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const lienConfirmation = (id) => `${(process.env.FRONTEND_URL || '').replace(/\/+$/, '')}/newsletter/confirmer?u=${id}&t=${signUnsubscribe(id, 'abonneConfirm')}`;

/** Lien de désabonnement, signé et sans connexion, présent dans chaque newsletter */
function lienDesabonnement(id) {
  const base = (process.env.API_URL || process.env.BASE_URL || '').replace(/\/+$/, '');
  return `${base}/api/newsletter/desabonner?u=${id}&t=${signUnsubscribe(id, 'abonnes')}`;
}

async function envoyerConfirmation(abonne) {
  const emailService = require('./emailService');
  const lien = lienConfirmation(abonne.id_abonne);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2b2a26;">
      <h2 style="color: #3A4224;">Confirmez votre inscription à la newsletter</h2>
      <p>Bonjour,</p>
      <p>Vous avez demandé à recevoir la newsletter de <b>Tala DZ (taladz.com)</b>, la plateforme de la culture algérienne : nouveaux événements et nouvelles œuvres.</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${encodeURI(lien)}" style="background-color: #3A4224; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirmer mon inscription</a>
      </p>
      <p>Aucun compte ni mot de passe n'est nécessaire. Ce lien est valable ${CONFIRMATION_JOURS} jours.</p>
      <p style="font-size: 14px; color: #6b6a63;">Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message : votre adresse ne recevra rien de plus.</p>
    </div>`;
  return emailService.sendEmail(abonne.email, 'Confirmez votre inscription à la newsletter Tala DZ', html, null, null, { type: 'newsletter' });
}

/**
 * Demande d'inscription. La réponse est toujours la même : elle ne révèle jamais si une adresse
 * est déjà inscrite. Aucun e-mail de plus sur une adresse relancée il y a moins de 24 h.
 */
async function demander(models, emailBrut) {
  const email = String(emailBrut || '').trim().toLowerCase();
  if (!adresseValide(email)) return { invalide: true };

  // La part du quota réservée aux e-mails importants reste intacte, même en cas d'abus
  if ((await budgetEnvoiGroupe()) <= 0) {
    logger.warn('Newsletter : quota du jour atteint, inscription ignorée');
    return { ok: true };
  }

  const existant = await models.NewsletterAbonne.findOne({ where: { email } });
  if (existant?.statut === 'actif') return { ok: true };
  if (existant && Date.now() - new Date(existant.date_demande).getTime() < RENVOI_APRES_HEURES * 3600 * 1000) {
    return { ok: true };
  }

  const abonne = existant
    ? await existant.update({ date_demande: new Date() })
    : await models.NewsletterAbonne.create({ email, statut: 'en_attente', date_demande: new Date() });
  const envoi = await envoyerConfirmation(abonne);
  if (envoi?.success === false) logger.warn(`Confirmation newsletter non envoyée à ${maskEmail(email)}`);
  return { ok: true };
}

/** Confirmation par le lien reçu : faux si le lien est invalide, expiré, ou le compte absent */
async function confirmer(models, id, jeton) {
  if (!verifyUnsubscribe(id, jeton, 'abonneConfirm')) return false;
  const abonne = await models.NewsletterAbonne.findByPk(id);
  if (!abonne) return false;
  if (abonne.statut === 'actif') return true;
  if (Date.now() - new Date(abonne.date_demande).getTime() > CONFIRMATION_JOURS * 24 * 3600 * 1000) return false;
  await abonne.update({ statut: 'actif', date_confirmation: new Date() });
  return true;
}

/** Désabonnement : l'adresse n'est pas gardée */
async function desabonner(models, id, jeton) {
  if (!verifyUnsubscribe(id, jeton, 'abonnes')) return false;
  await models.NewsletterAbonne.destroy({ where: { id_abonne: id } });
  return true;
}

/** Demandes jamais confirmées : effacées */
async function purgerNonConfirmes(models) {
  if (!models?.NewsletterAbonne) return 0;
  const limite = new Date(Date.now() - PURGE_JOURS * 24 * 3600 * 1000);
  return models.NewsletterAbonne.destroy({ where: { statut: 'en_attente', date_demande: { [Op.lt]: limite } } });
}

module.exports = { demander, confirmer, desabonner, purgerNonConfirmes, lienDesabonnement, adresseValide };
