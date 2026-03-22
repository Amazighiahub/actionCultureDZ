const { Op } = require('sequelize');
const { sanitizeLike } = require('../utils/sanitize');
const logger = require('../utils/logger');

class SearchService {
  constructor(models) {
    this.models = models;
  }

  // Recherche globale dans toutes les entités
  async globalSearch(query, options = {}) {
    const { limit: rawLimit = 20, types = ['oeuvres', 'evenements', 'lieux', 'users'] } = options;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 100);
    const safeQuery = sanitizeLike(query);
    const results = {};

    try {
      // Recherche dans les œuvres
      if (types.includes('oeuvres')) {
        results.oeuvres = await this.models.Oeuvre.findAll({
          where: {
            [Op.and]: [
              { statut: 'publie' },
              {
                [Op.or]: [
                  { titre: { [Op.like]: `%${safeQuery}%` } },
                  { description: { [Op.like]: `%${safeQuery}%` } }
                ]
              }
            ]
          },
          include: [
            { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
            { model: this.models.Langue, attributes: ['nom'] }
          ],
          limit: Math.floor(limit / types.length),
          order: [['date_creation', 'DESC']]
        });
      }

      // Recherche dans les événements
      if (types.includes('evenements')) {
        results.evenements = await this.models.Evenement.findAll({
          where: {
            [Op.or]: [
              { nom_evenement: { [Op.like]: `%${safeQuery}%` } },
              { description: { [Op.like]: `%${safeQuery}%` } }
            ]
          },
          include: [
            { model: this.models.TypeEvenement, attributes: ['nom_type'] },
            { model: this.models.Lieu, attributes: ['nom'] }
          ],
          limit: Math.floor(limit / types.length),
          order: [['date_debut', 'ASC']]
        });
      }

      // Recherche dans les lieux
      if (types.includes('lieux')) {
        results.lieux = await this.models.Lieu.findAll({
          where: {
            [Op.or]: [
              { nom: { [Op.like]: `%${safeQuery}%` } },
              { adresse: { [Op.like]: `%${safeQuery}%` } }
            ]
          },
          include: [
            { model: this.models.Wilaya, attributes: ['nom'] }
          ],
          limit: Math.floor(limit / types.length),
          order: [['nom', 'ASC']]
        });
      }

      // Recherche dans les utilisateurs (publics uniquement)
      if (types.includes('users')) {
        results.users = await this.models.User.findAll({
          where: {
            [Op.or]: [
              { nom: { [Op.like]: `%${safeQuery}%` } },
              { prenom: { [Op.like]: `%${safeQuery}%` } }
            ]
          },
          attributes: ['id_user', 'nom', 'prenom', 'type_user'],
          limit: Math.floor(limit / types.length),
          order: [['nom', 'ASC']]
        });
      }

      return {
        success: true,
        query,
        results,
        total: Object.values(results).reduce((sum, items) => sum + items.length, 0)
      };

    } catch (error) {
      logger.error('Erreur lors de la recherche globale:', error);
      return {
        success: false,
        error: 'Erreur lors de la recherche'
      };
    }
  }

  // Suggestions de recherche
  async getSuggestions(query, limit = 10) {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const safeQuery = sanitizeLike(query);
    try {
      const suggestions = [];

      // Suggestions depuis les titres d'œuvres
      const oeuvres = await this.models.Oeuvre.findAll({
        where: {
          titre: { [Op.like]: `%${safeQuery}%` },
          statut: 'publie'
        },
        attributes: ['titre'],
        limit: Math.floor(safeLimit / 2)
      });

      suggestions.push(...oeuvres.map(o => ({ text: o.titre, type: 'oeuvre' })));

      // Suggestions depuis les noms d'événements
      const evenements = await this.models.Evenement.findAll({
        where: {
          nom_evenement: { [Op.like]: `%${safeQuery}%` }
        },
        attributes: ['nom_evenement'],
        limit: Math.floor(safeLimit / 2)
      });

      suggestions.push(...evenements.map(e => ({ text: e.nom_evenement, type: 'evenement' })));

      return {
        success: true,
        suggestions: suggestions.slice(0, safeLimit)
      };

    } catch (error) {
      logger.error('Erreur lors de la génération de suggestions:', error);
      return {
        success: false,
        error: 'Erreur lors de la génération de suggestions'
      };
    }
  }
}

module.exports = SearchService;