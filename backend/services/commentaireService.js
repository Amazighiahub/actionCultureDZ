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
    // On ne commente qu'une œuvre publiée
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
    return oeuvre && oeuvre.statut === 'publie' ? oeuvre : null;
  }

  /**
   * Verifier qu'un evenement existe
   * @param {number|string} evenementId
   * @returns {object|null}
   */
  async findEvenement(evenementId) {
    if (!this.models.Evenement) return null;
    // Pas de commentaire sur un brouillon ni sur un événement en attente de validation
    const evenement = await this.models.Evenement.findByPk(evenementId);
    return evenement && !['brouillon', 'en_attente'].includes(evenement.statut) ? evenement : null;
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
      const idParent = await this._parentValide(commentaire_parent_id, 'id_service', serviceId);
      // Une réponse ne porte pas de note
      return this.repository.createWithAuthor({ contenu, commentaire_parent_id: idParent, id_user: userId, id_service: serviceId });
    }
    if (Number(service.id_user) === Number(userId)) {
      throw new AppError('comment.ownService', 403, 'AVIS_PROPRE_SERVICE');
    }
    if (await this.repository.findAvisServiceDuMembre(serviceId, userId)) {
      throw new AppError('comment.alreadyReviewed', 409, 'AVIS_DEJA_DONNE');
    }
    try {
      return await this.repository.createWithAuthor({ contenu, note_qualite, id_user: userId, id_service: serviceId });
    } catch (error) {
      // Deux envois simultanés : l'index unique de la base (migration 20261114) refuse le second
      if (error?.name === 'SequelizeUniqueConstraintError') throw new AppError('comment.alreadyReviewed', 409, 'AVIS_DEJA_DONNE');
      throw error;
    }
  }

  /**
   * Creer un commentaire et retourner le commentaire complet avec son auteur
   * @param {object} data - Donnees du commentaire
   * @returns {object} Commentaire complet avec User inclus
   */
  async createCommentaire(data) {
    if (data.commentaire_parent_id) {
      const [champ, valeur] = data.id_oeuvre ? ['id_oeuvre', data.id_oeuvre] : ['id_evenement', data.id_evenement];
      const idParent = await this._parentValide(data.commentaire_parent_id, champ, valeur);
      // Une réponse ne porte pas de note
      return this.repository.createWithAuthor({ ...data, commentaire_parent_id: idParent, note_qualite: null });
    }
    return this.repository.createWithAuthor(data);
  }

  /**
   * Commentaire auquel on répond : publié, sur le même contenu. Une réponse à une réponse est
   * rattachée au commentaire de départ (un seul niveau, comme l'affichage).
   * @returns {Promise<number>} id du commentaire de départ
   */
  async _parentValide(idParent, champ, valeur) {
    const parent = await this.repository.findById(idParent);
    if (!parent || parent.statut !== 'publie' || Number(parent[champ]) !== Number(valeur)) {
      throw new AppError('common.notFound', 404, 'COMMENTAIRE_INTROUVABLE');
    }
    return parent.commentaire_parent_id || parent.id_commentaire;
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
    // Seuls les champs envoyés changent ; une réponse à un avis n'a pas de note
    const maj = { date_modification: new Date() };
    if (data.contenu !== undefined) maj.contenu = data.contenu;
    if (data.note_qualite !== undefined && data.note_qualite !== null && !commentaireInstance.commentaire_parent_id) {
      maj.note_qualite = parseInt(data.note_qualite, 10);
    }
    await commentaireInstance.update(maj);

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
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres commentaires');
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
    try {
      return await this.repository.updateStatut(id, statut);
    } catch (error) {
      // Rétablir un avis alors que le membre a déjà un avis actif sur ce service : l'index unique refuse
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw this._conflictError('Ce membre a déjà un avis publié sur ce service : retirez-le avant de rétablir celui-ci.');
      }
      throw error;
    }
  }
}

module.exports = CommentaireService;
