/**
 * Services montrés au public : ceux d'un professionnel une fois validés par l'équipe,
 * et les équipements d'un site (parking, toilettes…, sans propriétaire) saisis avec le site.
 * Un service en attente ou refusé reste visible de son propriétaire et de la modération seulement.
 */
const { Op } = require('sequelize');

const whereServicesVisibles = () => ({ [Op.or]: [{ statut: 'valide' }, { id_user: null }] });

module.exports = { whereServicesVisibles };
