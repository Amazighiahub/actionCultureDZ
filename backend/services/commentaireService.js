/**
 * CommentaireService - Service pour la gestion des commentaires
 *
 * Encapsule toute la logique d'acces aux donnees (Sequelize) pour les commentaires.
 * Le controller n'a plus qu'a appeler ces methodes et formater les reponses HTTP.
 */

class CommentaireService {
  constructor(models) {
    this.models = models;
  }

  // ========================================================================
  // INCLUDES HELPERS
  // ========================================================================

  /**
   * Include standard pour un commentaire avec son auteur
   */
  _userInclude() {
    return {
      model: this.models.User,
      attributes: ['nom', 'prenom', 'id_type_user']
    };
  }

  /**
   * Include pour les reponses imbriquees (replies) d'un commentaire
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

  // ========================================================================
  // LECTURE
  // ========================================================================

  /**
   * Recuperer les commentaires d'une oeuvre (pagine, avec reponses)
   * @param {number|string} oeuvreId
   * @param {object} pagination - { limit, offset }
   * @returns {{ rows, count }}
   */
  async getCommentairesOeuvre(oeuvreId, { limit, offset }) {
    return this.models.Commentaire.findAndCountAll({
      where: {
        id_oeuvre: oeuvreId,
        statut: 'publie',
        commentaire_parent_id: null
      },
      include: [
        this._userInclude(),
        this._reponsesInclude()
      ],
      limit,
      offset,
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Recuperer les commentaires d'un evenement (pagine, avec reponses)
   * @param {number|string} evenementId
   * @param {object} pagination - { limit, offset }
   * @returns {{ rows, count }}
   */
  async getCommentairesEvenement(evenementId, { limit, offset }) {
    return this.models.Commentaire.findAndCountAll({
      where: {
        id_evenement: evenementId,
        statut: 'publie',
        commentaire_parent_id: null
      },
      include: [
        this._userInclude(),
        this._reponsesInclude()
      ],
      limit,
      offset,
      order: [['date_creation', 'DESC']]
    });
  }

  // ========================================================================
  // CREATION
  // ========================================================================

  /**
   * Verifier qu'une oeuvre existe
   * @param {number|string} oeuvreId
   * @returns {object|null}
   */
  async findOeuvre(oeuvreId) {
    return this.models.Oeuvre.findByPk(oeuvreId);
  }

  /**
   * Verifier qu'un evenement existe
   * @param {number|string} evenementId
   * @returns {object|null}
   */
  async findEvenement(evenementId) {
    return this.models.Evenement.findByPk(evenementId);
  }

  /**
   * Creer un commentaire et retourner le commentaire complet avec son auteur
   * @param {object} data - Donnees du commentaire
   * @returns {object} Commentaire complet avec User inclus
   */
  async createCommentaire(data) {
    const commentaire = await this.models.Commentaire.create({
      contenu: data.contenu,
      note_qualite: data.note_qualite,
      commentaire_parent_id: data.commentaire_parent_id,
      id_user: data.id_user,
      id_oeuvre: data.id_oeuvre || null,
      id_evenement: data.id_evenement || null,
      statut: 'publie'
    });

    return this.models.Commentaire.findByPk(commentaire.id_commentaire, {
      include: [this._userInclude()]
    });
  }

  // ========================================================================
  // MODIFICATION
  // ========================================================================

  /**
   * Mettre a jour un commentaire (via instance deja chargee par middleware)
   * @param {object} commentaireInstance - Instance Sequelize du commentaire (req.resource)
   * @param {object} data - { contenu, note_qualite }
   * @returns {object} Instance mise a jour
   */
  async updateCommentaire(commentaireInstance, data) {
    await commentaireInstance.update({
      contenu: data.contenu,
      note_qualite: data.note_qualite,
      date_modification: new Date()
    });

    return commentaireInstance;
  }

  // ========================================================================
  // SUPPRESSION
  // ========================================================================

  /**
   * Soft delete d'un commentaire (via instance deja chargee par middleware)
   * @param {object} commentaireInstance - Instance Sequelize du commentaire (req.resource)
   */
  async deleteCommentaire(commentaireInstance) {
    await commentaireInstance.update({ statut: 'supprime' });
  }

  // ========================================================================
  // MODERATION
  // ========================================================================

  /**
   * Moderer un commentaire (admin) - cherche par ID et met a jour le statut
   * @param {number|string} id
   * @param {string} statut
   * @returns {object|null} Commentaire mis a jour ou null si introuvable
   */
  async moderateCommentaire(id, statut) {
    const commentaire = await this.models.Commentaire.findByPk(id);
    if (!commentaire) return null;

    await commentaire.update({ statut });
    return commentaire;
  }
}

module.exports = CommentaireService;
