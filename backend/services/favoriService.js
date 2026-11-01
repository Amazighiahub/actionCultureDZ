/**
 * FavoriService - Service pour la gestion des favoris
 * Gère : CRUD favoris, vérification entités, enrichissement, statistiques
 *
 * Architecture: Controller → Service → Repository → Database
 * Délègue tous les accès Sequelize au FavoriRepository.
 */
const { Op } = require('sequelize');
const BaseService = require('./core/baseService');

const TYPES_VALIDES = ['oeuvre', 'evenement', 'lieu', 'artisanat'];

class FavoriService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
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
    const result = await this.repository.findByUser(idUser, { limit, offset, type });

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

  /** Identifiants des favoris d'un type (cœurs pleins dans les listes) */
  async idsFavoris(idUser, type) {
    return this.repository.idsByUser(idUser, type);
  }

  /**
   * Vérifie si une entité est dans les favoris d'un utilisateur
   * @param {number} idUser
   * @param {string} type
   * @param {number} idEntite
   * @returns {{ isFavorite: boolean, favori: object|null }}
   */
  async checkFavori(idUser, type, idEntite) {
    const favori = await this.repository.findByUserAndEntity(idUser, type, idEntite);
    return { isFavorite: !!favori, favori };
  }

  /**
   * Statistiques des favoris groupées par type
   * @param {number} idUser
   * @returns {{ total: number, byType: object }}
   */
  async getUserFavorisStats(idUser) {
    const stats = await this.repository.statsByUser(idUser);

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
    const populaires = await this.repository.findPopular({ type, limit });

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
    const [favori, created] = await this.repository.findOrCreateFavori(idUser, typeEntite, idEntite);

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
    const result = await this.repository.removeByIdAndUser(idFavori, idUser);
    if (!result) return { error: 'notFound' };
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
    const result = await this.repository.removeByEntity(idUser, type, idEntite);
    if (!result) return { error: 'notFound' };
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
   * Vérifie que l'entité existe et est visible du public (un brouillon, un contenu en attente ou
   * refusé ne peut pas être mis en favori : son numéro suffisait pour en lire tout le contenu)
   * @private
   */
  async _verifierEntiteExiste(type, id) {
    return !!(await this._getEntiteDetails(type, id));
  }

  /**
   * Détails d'une entité pour les cartes de favoris : contenu publié seulement (mêmes règles que les
   * pages publiques), champs publics seulement (avant : toutes les colonnes, dont celles de modération
   * et les coordonnées de contact d'un événement en brouillon). null si absent ou non publié.
   * @private
   */
  async _getEntiteDetails(type, id) {
    const m = this.models;
    const image = (model) => ({
      model, attributes: ['url', 'thumbnail_url'], where: { visible_public: true, type_media: 'image' },
      separate: true, limit: 1, order: [['ordre', 'ASC']]
    });
    try {
      switch (type) {
        case 'oeuvre':
          return await m.Oeuvre.findOne({
            where: { id_oeuvre: id, statut: 'publie' },
            attributes: ['id_oeuvre', 'titre', 'description', 'id_type_oeuvre', 'annee_creation', 'statut'],
            include: [{ model: m.TypeOeuvre, attributes: ['nom_type'] }, image(m.Media)]
          });
        case 'evenement':
          return await m.Evenement.findOne({
            where: { id_evenement: id, statut: { [Op.notIn]: ['brouillon', 'en_attente'] } },
            attributes: ['id_evenement', 'nom_evenement', 'description', 'date_debut', 'date_fin', 'image_url', 'statut', 'tarif'],
            include: [
              { model: m.TypeEvenement, as: 'TypeEvenement', attributes: ['nom_type'] },
              { model: m.Lieu, as: 'Lieu', attributes: ['nom'] }
            ]
          });
        case 'lieu':
          return await m.Lieu.findOne({
            where: { id_lieu: id, statut: 'publie' },
            attributes: ['id_lieu', 'nom', 'adresse', 'typeLieu', 'typePatrimoine', 'latitude', 'longitude', 'statut'],
            include: [
              {
                model: m.Commune, attributes: ['nom'],
                include: [{ model: m.Daira, attributes: ['nom'], include: [{ model: m.Wilaya, attributes: ['nom'] }] }]
              },
              { model: m.LieuMedia, attributes: ['url'], separate: true, limit: 1 }
            ]
          });
        case 'artisanat':
          return await m.Artisanat.findOne({
            where: { id_artisanat: id },
            attributes: ['id_artisanat', 'id_oeuvre', 'prix', 'prix_max', 'en_stock', 'sur_commande', 'dimensions'],
            include: [
              {
                model: m.Oeuvre, required: true, where: { statut: 'publie' },
                attributes: ['id_oeuvre', 'titre', 'description', 'statut'],
                include: [image(m.Media)]
              },
              { model: m.Materiau, attributes: ['nom'] },
              { model: m.Technique, attributes: ['nom'] }
            ]
          });
        default:
          return null;
      }
    } catch (error) {
      this.logger.error('Erreur récupération détails entité:', error);
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
