/**
 * CommentaireRepository - Repository pour les commentaires
 * Encapsule tous les accès Sequelize pour le modèle Commentaire
 */
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
      limit,
      offset,
      order: [['date_creation', 'DESC']]
    });
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
