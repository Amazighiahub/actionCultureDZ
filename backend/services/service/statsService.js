/**
 * Statistiques d'un service pour son professionnel (accord de la responsable, 2026-11-16) : vues de la
 * fiche, clics sur WhatsApp, « Réserver en ligne » et « Appeler ». Une ligne par service et par jour
 * (table service_stat, migration 20261230). Rien sur la personne : ni compte, ni adresse IP ; c'est le
 * navigateur qui ne compte qu'une fois par jour, le serveur limite seulement les abus.
 */
const { peutGerer, estModeration } = require('../../utils/droits');

const ACTIONS = { vue: 'vues', whatsapp: 'whatsapp', reservation: 'reservation', appel: 'appel' };
const COLONNES = Object.values(ACTIONS);

/** Connexion à la base (models.sequelize, sinon celle du modèle) */
const base = (models) => models.sequelize || models.Service.sequelize;

const erreur = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

/** Jour en Algérie (AAAA-MM-JJ) */
const jourAlgerie = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(d);

/**
 * +1 pour l'action du jour ; ignoré pour un service non publié ou pour son propre professionnel.
 * @returns {Promise<boolean>} vrai si compté
 */
async function compter(models, idService, action, utilisateur = null) {
  const colonne = ACTIONS[action];
  if (!colonne) throw erreur('Action inconnue');
  const service = await models.Service.findByPk(idService, { attributes: ['id', 'id_user', 'statut'] });
  if (!service || service.statut !== 'valide') return false;
  // Le professionnel qui regarde sa propre fiche ne gonfle pas ses chiffres
  if (utilisateur?.id_user && Number(utilisateur.id_user) === Number(service.id_user)) return false;
  // Colonne prise dans une liste fermée (jamais du texte reçu)
  await base(models).query(
    `INSERT INTO service_stat (id_service, jour, ${colonne}) VALUES (:id, :jour, 1)
     ON DUPLICATE KEY UPDATE ${colonne} = ${colonne} + 1`,
    { replacements: { id: service.id, jour: jourAlgerie() } }
  );
  return true;
}

/** Totaux des 30 derniers jours et depuis le début, et le détail jour par jour (30 jours) */
async function statistiques(models, idService, utilisateur) {
  const service = await models.Service.findByPk(idService, { attributes: ['id', 'id_user'] });
  if (!service) throw erreur('Service introuvable', 404);
  if (!peutGerer(service.id_user, { userId: utilisateur?.id_user, isModerator: estModeration(utilisateur) })) {
    throw erreur('Seul le professionnel de ce service peut voir ses statistiques', 403);
  }
  const depuis = jourAlgerie(new Date(Date.now() - 29 * 24 * 3600 * 1000));
  const somme = COLONNES.map((c) => `COALESCE(SUM(${c}), 0) AS ${c}`).join(', ');
  const [[total]] = await base(models).query(`SELECT ${somme} FROM service_stat WHERE id_service = :id`, { replacements: { id: service.id } });
  const [[trente]] = await base(models).query(`SELECT ${somme} FROM service_stat WHERE id_service = :id AND jour >= :depuis`,
    { replacements: { id: service.id, depuis } });
  const [jours] = await base(models).query(`SELECT jour, ${COLONNES.join(', ')} FROM service_stat
    WHERE id_service = :id AND jour >= :depuis ORDER BY jour`, { replacements: { id: service.id, depuis } });
  const nombres = (l) => Object.fromEntries(COLONNES.map((c) => [c, Number(l?.[c] || 0)]));
  return {
    total: nombres(total),
    trente_jours: nombres(trente),
    par_jour: jours.map((j) => ({ jour: String(j.jour).slice(0, 10), ...nombres(j) }))
  };
}

module.exports = { compter, statistiques, ACTIONS, jourAlgerie };
