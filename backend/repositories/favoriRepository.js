/**
 * FavoriRepository - Repository pour les favoris
 * Encapsule tous les accès Sequelize pour le modèle Favori
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class FavoriRepository extends BaseRepository {
  constructor(models) {
    super(models.Favori);
    this.models = models;
    this.sequelize = models.sequelize || models.Favori.sequelize;
  }

  /**
   * Favoris paginés d'un utilisateur, filtrable par type
   */
  async findByUser(idUser, { limit, offset, type }) {
    const where = { id_user: idUser };
    if (type) where.type_entite = type;

    return this.model.findAndCountAll({
      where,
      limit,
      offset,
      order: [['date_ajout', 'DESC']]
    });
  }

  /**
   * Vérifie si un favori existe pour un user/type/entité
   */
  async findByUserAndEntity(idUser, type, idEntite) {
    return this.model.findOne({
      where: { id_user: idUser, type_entite: type, id_entite: idEntite }
    });
  }

  /**
   * Statistiques des favoris groupées par type pour un user
   */
  async statsByUser(idUser) {
    return this.model.findAll({
      where: { id_user: idUser },
      attributes: [
        'type_entite',
        [this.sequelize.fn('COUNT', this.sequelize.col('id_favori')), 'count']
      ],
      group: ['type_entite']
    });
  }

  /**
   * Entités les plus mises en favoris (agrégation)
   */
  async findPopular({ type, limit = 10 }) {
    const where = {};
    if (type) where.type_entite = type;

    return this.model.findAll({
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
  }

  /**
   * findOrCreate atomique (élimine race condition check-then-insert)
   */
  async findOrCreateFavori(idUser, typeEntite, idEntite) {
    return this.model.findOrCreate({
      where: { id_user: idUser, type_entite: typeEntite, id_entite: idEntite },
      defaults: { date_ajout: new Date() }
    });
  }

  /**
   * Supprime un favori par ID + userId (sécurisé)
   */
  async removeByIdAndUser(idFavori, idUser) {
    const favori = await this.model.findOne({
      where: { id_favori: idFavori, id_user: idUser }
    });
    if (!favori) return null;
    await favori.destroy();
    return true;
  }

  /**
   * Supprime un favori par type + ID entité + userId
   */
  async removeByEntity(idUser, type, idEntite) {
    const favori = await this.model.findOne({
      where: { id_user: idUser, type_entite: type, id_entite: idEntite }
    });
    if (!favori) return null;
    await favori.destroy();
    return true;
  }
}

module.exports = FavoriRepository;
