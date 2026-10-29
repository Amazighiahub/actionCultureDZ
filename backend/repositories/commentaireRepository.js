/**
 * CommentaireRepository - Repository pour les commentaires
 * Encapsule tous les accès Sequelize pour le modèle Commentaire
 */
const { Op, fn, col } = require('sequelize');
const BaseRepository = require('./baseRepository');

class CommentaireRepository extends BaseRepository {
  constructor(models) {
    super(models.Commentaire);
    this.models = models;
  }

  /**
   * Include standard : auteur du commentaire
   */
  _userInclude() {
    return {
      model: this.models.User,
      attributes: ['nom', 'prenom', 'id_type_user']
    };
  }

  /**
   * Include pour les réponses imbriquées
   */
  _reponsesInclude() {
    return {
      model: this.models.Commentaire,
      as: 'Reponses',
      where: { statut: 'publie' },
      required: false,
      include: [this._userInclude()]
    };
  }

  /**
   * Commentaires racines (sans parent) pour une oeuvre, paginés
   */
  async findByOeuvre(oeuvreId, { limit, offset }) {
    return this.model.findAndCountAll({
      where: {
        id_oeuvre: oeuvreId,
        statut: 'publie',
        commentaire_parent_id: null
      },
      include: [this._userInclude(), this._reponsesInclude()],
      distinct: true,
      col: 'id_commentaire',
      limit,
      offset,
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Commentaires racines (sans parent) pour un événement, paginés
   */
  async findByEvenement(evenementId, { limit, offset }) {
    return this.model.findAndCountAll({
      where: {
        id_evenement: evenementId,
        statut: 'publie',
        commentaire_parent_id: null
      },
      include: [this._userInclude(), this._reponsesInclude()],
      distinct: true,
      col: 'id_commentaire',
      limit,
      offset,
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Avis racines (sans parent) pour un service, paginés
   */
  async findByService(serviceId, { limit, offset }) {
    return this.model.findAndCountAll({
      where: {
        id_service: serviceId,
        statut: 'publie',
        commentaire_parent_id: null
      },
      include: [this._userInclude(), this._reponsesInclude()],
      // Compter les avis, pas les lignes jointes (un avis avec deux réponses comptait trois)
      distinct: true,
      col: 'id_commentaire',
      limit,
      offset,
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Avis déjà publié par ce membre sur ce service (un seul par personne)
   */
  async findAvisServiceDuMembre(serviceId, userId) {
    return this.model.findOne({
      where: {
        id_service: serviceId,
        id_user: userId,
        commentaire_parent_id: null,
        statut: ['publie', 'en_attente']
      },
      attributes: ['id_commentaire']
    });
  }

  /**
   * Note moyenne et nombre de notes des services donnés (avis publiés uniquement)
   * @returns {Map<number, { moyenne: number, nombre: number }>}
   */
  async notesServices(ids) {
    const stats = new Map();
    if (!ids.length) return stats;
    const lignes = await this.model.findAll({
      where: {
        id_service: { [Op.in]: ids },
        statut: 'publie',
        commentaire_parent_id: null,
        note_qualite: { [Op.ne]: null }
      },
      attributes: ['id_service', [fn('AVG', col('note_qualite')), 'moyenne'], [fn('COUNT', col('note_qualite')), 'nombre']],
      group: ['id_service'],
      raw: true
    });
    for (const l of lignes) {
      stats.set(Number(l.id_service), { moyenne: Math.round(Number(l.moyenne) * 10) / 10, nombre: Number(l.nombre) });
    }
    return stats;
  }

  /**
   * Crée un commentaire et retourne l'instance avec son auteur
   */
  async createWithAuthor(data) {
    const commentaire = await this.model.create({
      contenu: data.contenu,
      note_qualite: data.note_qualite,
      commentaire_parent_id: data.commentaire_parent_id,
      id_user: data.id_user,
      id_oeuvre: data.id_oeuvre || null,
      id_evenement: data.id_evenement || null,
      id_service: data.id_service || null,
      statut: 'publie'
    });

    return this.model.findByPk(commentaire.id_commentaire, {
      include: [this._userInclude()]
    });
  }

  /**
   * Soft delete : passe le statut à 'supprime'
   */
  async softDelete(instance) {
    return instance.update({ statut: 'supprime' });
  }

  /**
   * Modération : met à jour le statut d'un commentaire
   */
  async updateStatut(id, statut) {
    const commentaire = await this.model.findByPk(id);
    if (!commentaire) return null;
    await commentaire.update({ statut });
    return commentaire;
  }
}

module.exports = CommentaireRepository;
