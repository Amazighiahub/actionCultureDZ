/**
 * FavoriService - Service pour la gestion des favoris
 * Gère : CRUD favoris, vérification entités, enrichissement, statistiques
 *
 * Architecture: Controller → Service → Models
 * Toutes les requêtes Sequelize sont ici, ZÉRO dans le controller.
 */
const { Op } = require('sequelize');

const TYPES_VALIDES = ['oeuvre', 'evenement', 'lieu', 'artisanat'];

class FavoriService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  /**
   * Récupère les favoris paginés d'un utilisateur
   * @param {number} idUser
   * @param {object} options - { page, limit, offset, type }
   * @returns {{ rows: Array, count: number }}
   */
  async getUserFavoris(idUser, { page, limit, offset, type }) {
    const where = { id_user: idUser };

    if (type) {
      where.type_entite = type;
    }

    const result = await this.models.Favori.findAndCountAll({
      where,
      limit,
      offset,
      order: [['date_ajout', 'DESC']],
      include: this._getIncludesForFavoris()
    });

    return {
      rows: result.rows,
      count: result.count,
      pagination: {
        total: result.count,
        page,
        pages: Math.ceil(result.count / limit),
        limit
      }
    };
  }

  /**
   * Vérifie si une entité est dans les favoris d'un utilisateur
   * @param {number} idUser
   * @param {string} type
   * @param {number} idEntite
   * @returns {{ isFavorite: boolean, favori: object|null }}
   */
  async checkFavori(idUser, type, idEntite) {
    const favori = await this.models.Favori.findOne({
      where: {
        id_user: idUser,
        type_entite: type,
        id_entite: idEntite
      }
    });

    return { isFavorite: !!favori, favori };
  }

  /**
   * Statistiques des favoris groupées par type
   * @param {number} idUser
   * @returns {{ total: number, byType: object }}
   */
  async getUserFavorisStats(idUser) {
    const stats = await this.models.Favori.findAll({
      where: { id_user: idUser },
      attributes: [
        'type_entite',
        [this.sequelize.fn('COUNT', this.sequelize.col('id_favori')), 'count']
      ],
      group: ['type_entite']
    });

    const byType = {};
    let total = 0;
    stats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      byType[stat.type_entite] = count;
      total += count;
    });

    return { total, byType };
  }

  /**
   * Entités les plus mises en favoris
   * @param {object} options - { type, limit }
   * @returns {Array<{ type_entite, id_entite, count, entite }>}
   */
  async getPopularFavorites({ type, limit = 10 }) {
    const where = {};
    if (type) {
      where.type_entite = type;
    }

    const populaires = await this.models.Favori.findAll({
      where,
      attributes: [
        'type_entite',
        'id_entite',
        [this.sequelize.fn('COUNT', this.sequelize.col('id_favori')), 'count']
      ],
      group: ['type_entite', 'id_entite'],
      order: [[this.sequelize.literal('count'), 'DESC']],
      limit: parseInt(limit)
    });

    const enriched = await Promise.all(
      populaires.map(item => this._getEntiteDetails(item.type_entite, item.id_entite)
        .then(entite => entite ? { type: item.type_entite, count: parseInt(item.dataValues.count), entite } : null)
      )
    );

    return enriched.filter(Boolean);
  }

  // ========================================================================
  // ÉCRITURE
  // ========================================================================

  /**
   * Ajoute un favori après validation
   * @param {number} idUser
   * @param {string} typeEntite
   * @param {number} idEntite
   * @returns {{ error?: string, favori?: object, entite?: object }}
   */
  async addFavori(idUser, typeEntite, idEntite) {
    if (!TYPES_VALIDES.includes(typeEntite)) {
      return { error: 'invalidType' };
    }

    const entiteExiste = await this._verifierEntiteExiste(typeEntite, idEntite);
    if (!entiteExiste) {
      return { error: 'entityNotFound' };
    }

    // findOrCreate atomique — élimine la race condition check-then-insert
    const [favori, created] = await this.models.Favori.findOrCreate({
      where: { id_user: idUser, type_entite: typeEntite, id_entite: idEntite },
      defaults: { date_ajout: new Date() }
    });

    if (!created) {
      return { error: 'duplicate' };
    }

    const entite = await this._getEntiteDetails(typeEntite, idEntite);

    return { favori, entite };
  }

  /**
   * Supprime un favori par son ID
   * @param {number} idFavori
   * @param {number} idUser
   * @returns {{ error?: string }}
   */
  async removeFavori(idFavori, idUser) {
    const favori = await this.models.Favori.findOne({
      where: { id_favori: idFavori, id_user: idUser }
    });

    if (!favori) {
      return { error: 'notFound' };
    }

    await favori.destroy();
    return { success: true };
  }

  /**
   * Supprime un favori par type + ID entité
   * @param {number} idUser
   * @param {string} type
   * @param {number} idEntite
   * @returns {{ error?: string }}
   */
  async removeFavoriByEntity(idUser, type, idEntite) {
    const favori = await this.models.Favori.findOne({
      where: {
        id_user: idUser,
        type_entite: type,
        id_entite: idEntite
      }
    });

    if (!favori) {
      return { error: 'notFound' };
    }

    await favori.destroy();
    return { success: true };
  }

  // ========================================================================
  // HELPERS (privés)
  // ========================================================================

  /**
   * Enrichit une liste de favoris avec les détails des entités
   * @param {Array} favoris
   * @returns {Array} favoris enrichis (plain objects)
   */
  async enrichirFavoris(favoris) {
    return Promise.all(
      favoris.map(async (favori) => {
        const entite = await this._getEntiteDetails(favori.type_entite, favori.id_entite);
        return { ...favori.toJSON(), entite };
      })
    );
  }

  /**
   * Vérifie qu'une entité existe dans la base
   * @private
   */
  async _verifierEntiteExiste(type, id) {
    try {
      let entite;
      switch (type) {
        case 'oeuvre':
          entite = await this.models.Oeuvre.findByPk(id);
          break;
        case 'evenement':
          entite = await this.models.Evenement.findByPk(id);
          break;
        case 'lieu':
          entite = await this.models.Lieu.findByPk(id);
          break;
        case 'artisanat':
          entite = await this.models.Artisanat.findByPk(id);
          break;
      }
      return !!entite;
    } catch (error) {
      console.error('Erreur vérification entité:', error);
      return false;
    }
  }

  /**
   * Récupère les détails complets d'une entité avec ses includes
   * @private
   */
  async _getEntiteDetails(type, id) {
    try {
      let entite;
      switch (type) {
        case 'oeuvre':
          entite = await this.models.Oeuvre.findByPk(id, {
            include: [
              { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
              { model: this.models.Media, attributes: ['url'], limit: 1 }
            ]
          });
          break;
        case 'evenement':
          entite = await this.models.Evenement.findByPk(id, {
            include: [
              { model: this.models.TypeEvenement, attributes: ['nom_type'] },
              { model: this.models.Lieu, attributes: ['nom'] }
            ]
          });
          break;
        case 'lieu':
          entite = await this.models.Lieu.findByPk(id, {
            include: [
              { model: this.models.Wilaya, attributes: ['nom'] },
              { model: this.models.LieuMedia, attributes: ['url'], limit: 1 }
            ]
          });
          break;
        case 'artisanat':
          entite = await this.models.Artisanat.findByPk(id, {
            include: [
              {
                model: this.models.Oeuvre,
                include: [
                  { model: this.models.Media, attributes: ['url'], limit: 1 }
                ]
              },
              { model: this.models.Materiau, attributes: ['nom'] },
              { model: this.models.Technique, attributes: ['nom'] }
            ]
          });
          break;
      }
      return entite;
    } catch (error) {
      console.error('Erreur récupération détails entité:', error);
      return null;
    }
  }

  /**
   * Includes par défaut pour les requêtes de favoris
   * @private
   */
  _getIncludesForFavoris() {
    return [];
  }
}

module.exports = FavoriService;
