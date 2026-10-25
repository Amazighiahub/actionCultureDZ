/**
 * Notifications de la modération : qui prévenir, et comment, quand un contenu attend une
 * validation (proposition d'article, événement envoyé) ou quand une décision est prise.
 */
const { TYPE_USER_IDS } = require('../constants/typeUserIds');

/** Comptes administrateurs actifs (rôle Administrateur ou type administrateur) */
async function idsAdministrateurs(models) {
  const { User, Role } = models;
  const parType = await User.findAll({ where: { id_type_user: TYPE_USER_IDS.ADMINISTRATEUR }, attributes: ['id_user'] });
  const parRole = Role ? await User.findAll({
    attributes: ['id_user'],
    include: [{ model: Role, as: 'Roles', where: { nom_role: 'Administrateur' }, attributes: [], through: { attributes: [] } }]
  }) : [];
  return [...new Set([...parType, ...parRole].map(u => u.id_user))];
}

/** Notification simple ; une notification manquée ne doit jamais annuler l'action qui l'a déclenchée */
async function notifier(notificationService, idUser, { titre, message, url_action, metadata }) {
  if (!idUser || !notificationService) return;
  try {
    await notificationService.sendToUser(idUser, { titre, message, url_action, metadata, type_notification: 'autre', priorite: 'normale' });
  } catch {
    // ignorée
  }
}

module.exports = { idsAdministrateurs, notifier };
