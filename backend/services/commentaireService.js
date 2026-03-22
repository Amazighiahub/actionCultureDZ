/**
 * CommentaireService - Service pour la gestion des commentaires
 *
 * Architecture: Controller → Service → Repository → Database
 * Délègue tous les accès Sequelize au CommentaireRepository.
 */
const BaseService = require('./core/baseService');

class CommentaireService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
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
    return this.repository.findByOeuvre(oeuvreId, { limit, offset });
  }

  /**
   * Recuperer les commentaires d'un evenement (pagine, avec reponses)
   * @param {number|string} evenementId
   * @param {object} pagination - { limit, offset }
   * @returns {{ rows, count }}
   */
  async getCommentairesEvenement(evenementId, { limit, offset }) {
    return this.repository.findByEvenement(evenementId, { limit, offset });
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
    if (!this.models.Oeuvre) return null;
    return this.models.Oeuvre.findByPk(oeuvreId);
  }

  /**
   * Verifier qu'un evenement existe
   * @param {number|string} evenementId
   * @returns {object|null}
   */
  async findEvenement(evenementId) {
    if (!this.models.Evenement) return null;
    return this.models.Evenement.findByPk(evenementId);
  }

  /**
   * Creer un commentaire et retourner le commentaire complet avec son auteur
   * @param {object} data - Donnees du commentaire
   * @returns {object} Commentaire complet avec User inclus
   */
  async createCommentaire(data) {
    return this.repository.createWithAuthor(data);
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
    return this.repository.softDelete(commentaireInstance);
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
    return this.repository.updateStatut(id, statut);
  }
}

module.exports = CommentaireService;
