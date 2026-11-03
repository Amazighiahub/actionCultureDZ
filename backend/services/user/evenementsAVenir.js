/**
 * Événements à venir d'un compte qu'on supprime. Sans annulation, ils restaient publiés au nom
 * d'« Utilisateur supprimé », le rappel partait et plus personne ne pouvait les annuler.
 */
const { Op } = require('sequelize');
const { pasTermine } = require('../../helpers/finEvenement');

/** Événements publiés et pas encore terminés organisés par ce compte */
async function evenementsAVenir(models, userId) {
  const { Evenement } = models || {};
  if (!Evenement) return [];
  return Evenement.findAll({
    where: { id_user: userId, statut: ['publie', 'planifie', 'en_cours'], [Op.and]: [pasTermine(new Date())] },
    attributes: ['id_evenement', 'nom_evenement']
  });
}

/** Annule ces événements et prévient les inscrits, avant l'effacement du compte */
async function annulerEvenementsAVenir(models, userId, adminId) {
  const aVenir = await evenementsAVenir(models, userId);
  if (!aVenir.length) return;
  const container = require('../serviceContainer');
  for (const ev of aVenir) {
    await container.evenementService.cancel(ev.id_evenement, adminId, 'Le compte de l’organisateur a été supprimé', { isAdmin: true });
  }
}

module.exports = { evenementsAVenir, annulerEvenementsAVenir };
