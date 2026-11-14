/**
 * Rappels automatiques aux professionnels (audit V11 OUT-23, accord de la responsable) : une
 * notification sur le site seulement, pas d'e-mail (pour ménager le quota).
 *  - Événement terminé depuis 7 à 14 jours, sans aucune photo : « Ajoutez les photos ».
 *  - Service validé et pas modifié depuis 6 mois : « Vos informations sont-elles à jour ? »,
 *    une fois par tranche de 6 mois (semaine où la fiche atteint 6, 12, 18 mois…).
 * Tâche hebdomadaire (cronService) ; un rappel déjà envoyé (même lien, même compte, notifications
 * gardées 90 jours) n'est jamais renvoyé.
 */
const { Op } = require('sequelize');
const { texteLisible } = require('../helpers/i18n');

const JOUR = 24 * 3600 * 1000;
const SEMESTRE_JOURS = 182;

const lienPhotos = (idEvenement) => `/dashboard-pro?gerer=${idEvenement}&onglet=documents`;
const lienService = (idService) => `/modifier-service/${idService}`;

/** Vrai si ce compte a déjà reçu ce rappel (même lien) depuis `depuis` */
async function dejaPrevenu(models, idUser, url, depuis) {
  const n = await models.Notification.count({
    where: { id_user: idUser, url_action: url, ...(depuis ? { date_creation: { [Op.gte]: depuis } } : {}) }
  });
  return n > 0;
}

/** Événements terminés depuis 7 à 14 jours, sans photo, dont l'organisateur n'a pas encore été prévenu */
async function rappelerPhotos(models, notificationService, maintenant = new Date()) {
  const { Evenement, Media, sequelize } = models;
  if (!Evenement || !Media || !models.Notification) return 0;
  const debut = new Date(maintenant.getTime() - 14 * JOUR);
  const fin = new Date(maintenant.getTime() - 7 * JOUR);
  const evenements = await Evenement.findAll({
    where: {
      statut: { [Op.in]: ['publie', 'planifie', 'en_cours', 'termine'] },
      id_user: { [Op.ne]: null },
      [Op.or]: [
        { date_fin: { [Op.between]: [debut, fin] } },
        { date_fin: null, date_debut: { [Op.between]: [debut, fin] } }
      ],
      [Op.and]: sequelize.literal("NOT EXISTS (SELECT 1 FROM media m WHERE m.id_evenement = `Evenement`.`id_evenement` AND m.type_media = 'image')")
    },
    attributes: ['id_evenement', 'id_user', 'nom_evenement'],
    limit: 500
  });
  let envoyes = 0;
  for (const ev of evenements) {
    const url = lienPhotos(ev.id_evenement);
    if (await dejaPrevenu(models, ev.id_user, url)) continue;
    const nom = texteLisible(ev.nom_evenement, 'fr') || 'votre événement';
    await notificationService.sendToUser(ev.id_user, {
      titre: 'Ajoutez les photos de votre événement',
      message: `« ${nom} » est terminé : montrez comment ça s’est passé. Les photos s’affichent dans la galerie de sa page.`,
      type_notification: 'autre',
      url_action: url
    });
    envoyes += 1;
  }
  return envoyes;
}

/** Services validés pas modifiés depuis 6, 12, 18… mois (semaine du passage), une fois par tranche */
async function rappelerServices(models, notificationService, maintenant = new Date()) {
  const { Service, sequelize } = models;
  if (!Service || !models.Notification) return 0;
  const limite = new Date(maintenant.getTime() - SEMESTRE_JOURS * JOUR);
  const services = await Service.findAll({
    where: {
      statut: 'valide',
      id_user: { [Op.ne]: null },
      updatedAt: { [Op.lte]: limite },
      // Semaine où la fiche atteint un multiple de 6 mois sans modification
      [Op.and]: sequelize.where(
        sequelize.literal(`MOD(DATEDIFF(${sequelize.escape(maintenant)}, \`Service\`.\`updatedAt\`), ${SEMESTRE_JOURS})`),
        { [Op.lt]: 7 }
      )
    },
    attributes: ['id', 'id_user', 'nom'],
    limit: 500
  });
  let envoyes = 0;
  const depuis = new Date(maintenant.getTime() - 30 * JOUR);
  for (const s of services) {
    const url = lienService(s.id);
    if (await dejaPrevenu(models, s.id_user, url, depuis)) continue;
    const nom = texteLisible(s.nom, 'fr') || 'votre service';
    await notificationService.sendToUser(s.id_user, {
      titre: 'Vos informations sont-elles à jour ?',
      message: `« ${nom} » n’a pas été modifié depuis 6 mois. Horaires, tarifs, téléphone : vérifiez-les pour les visiteurs.`,
      type_notification: 'autre',
      url_action: url
    });
    envoyes += 1;
  }
  return envoyes;
}

module.exports = { rappelerPhotos, rappelerServices, lienPhotos, lienService };
