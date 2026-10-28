/**
 * CommentaireService - Service pour la gestion des commentaires
 *
 * Architecture: Controller → Service → Repository → Database
 * Délègue tous les accès Sequelize au CommentaireRepository.
 */
const BaseService = require('./core/baseService');
const AppError = require('../utils/appError');

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

  /**
   * Avis d'un service (pagine, avec reponses)
   */
  async getCommentairesService(serviceId, { limit, offset }) {
    return this.repository.findByService(serviceId, { limit, offset });
  }

  /**
   * Note moyenne et nombre de notes de chaque service
   * @param {number[]} ids
   * @returns {Promise<Map<number, { moyenne: number, nombre: number }>>}
   */
  async notesServices(ids) {
    return this.repository.notesServices(ids.map(Number).filter(Boolean));
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
   * Publier un avis sur un service : service validé uniquement, pas sur son propre service,
   * un seul avis par membre (les réponses passent par commentaire_parent_id).
   */
  async creerAvisService(serviceId, userId, { contenu, note_qualite, commentaire_parent_id }) {
    const service = this.models.Service
      ? await this.models.Service.findByPk(serviceId, { attributes: ['id', 'id_user', 'statut'] })
      : null;
    if (!service || service.statut !== 'valide') {
      throw new AppError('service.notFound', 404, 'SERVICE_INTROUVABLE');
    }
    if (commentaire_parent_id) {
      const parent = await this.repository.findById(commentaire_parent_id);
      if (!parent || Number(parent.id_service) !== Number(serviceId)) {
        throw new AppError('common.notFound', 404, 'AVIS_INTROUVABLE');
      }
      // Une réponse ne porte pas de note
      return this.repository.createWithAuthor({ contenu, commentaire_parent_id, id_user: userId, id_service: serviceId });
    }
    if (Number(service.id_user) === Number(userId)) {
      throw new AppError('comment.ownService', 403, 'AVIS_PROPRE_SERVICE');
    }
    if (await this.repository.findAvisServiceDuMembre(serviceId, userId)) {
      throw new AppError('comment.alreadyReviewed', 409, 'AVIS_DEJA_DONNE');
    }
    return this.repository.createWithAuthor({ contenu, note_qualite, id_user: userId, id_service: serviceId });
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
   * Soft delete d'un commentaire
   * @param {object} commentaireInstance - Instance Sequelize du commentaire
   * @param {number} [userId] - ID de l'utilisateur demandant la suppression (optionnel, vérifie ownership)
   */
  async deleteCommentaire(commentaireInstance, userId) {
    if (userId !== undefined && commentaireInstance.id_user !== userId) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
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
