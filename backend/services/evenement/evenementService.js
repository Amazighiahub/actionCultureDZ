/**
 * EvenementService - Logique métier pour les événements
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const EvenementDTO = require('../../dto/evenement/evenementDTO');
const CacheManager = require('../../utils/CacheManager');

class EvenementService extends BaseService {
  constructor(evenementRepository, options = {}) {
    super(evenementRepository, options);
    this.cache = CacheManager.create({
      namespace: 'evenements',
      defaultTTL: 2 * 60 * 1000, // 2 min — les événements changent plus souvent que les metadata
      maxSize: 50
    });
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Liste des événements publiés
   */
  async findPublished(options = {}) {
    const cacheKey = `published:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findPublished(options);
      return {
        data: EvenementDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Événements à venir
   */
  async findUpcoming(options = {}) {
    const cacheKey = `upcoming:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findUpcoming(options);
      return {
        data: EvenementDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Détail complet d'un événement
   */
  async findWithFullDetails(id) {
    const evenement = await this.repository.findWithFullDetails(id);
    if (!evenement) {
      throw this._notFoundError(id);
    }
    return EvenementDTO.fromEntity(evenement);
  }

  /**
   * Événements associés à une œuvre
   */
  async findByOeuvre(oeuvreId) {
    const evenements = await this.repository.findByOeuvre(oeuvreId);
    return EvenementDTO.fromEntities(evenements);
  }

  /**
   * Événements par organisateur
   */
  async findByOrganisateur(userId, options = {}) {
    const result = await this.repository.findByOrganisateur(userId, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Recherche
   */
  async search(query, options = {}) {
    if (!query || query.length < 2) {
      throw this._validationError('Requête de recherche trop courte (min 2 caractères)');
    }
    const result = await this.repository.searchEvenements(query, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par wilaya
   */
  async findByWilaya(wilayaId, options = {}) {
    const cacheKey = `wilaya:${wilayaId}:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findByWilaya(wilayaId, options);
      return {
        data: EvenementDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Tous les événements (admin)
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll({
      ...options,
      include: this.repository._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un événement
   */
  async create(data, userId) {
    if (!data.nom_evenement && !data.nom) {
      throw this._validationError('Le nom de l\'événement est requis');
    }

    const lieuId = data.id_lieu || data.lieuId;
    if (lieuId && this.models?.Lieu) {
      const lieu = await this.models.Lieu.findByPk(lieuId);
      if (!lieu) throw this._validationError('Le lieu spécifié n\'existe pas');
    }

    const typeId = data.id_type_evenement || data.typeEvenementId;
    if (typeId && this.models?.TypeEvenement) {
      const type = await this.models.TypeEvenement.findByPk(typeId);
      if (!type) throw this._validationError('Le type d\'événement spécifié n\'existe pas');
    }

    const entityData = {
      nom_evenement: data.nom_evenement || data.nom,
      description: data.description || {},
      date_debut: data.date_debut || data.dateDebut,
      date_fin: data.date_fin || data.dateFin,
      id_lieu: data.id_lieu || data.lieuId,
      id_type_evenement: data.id_type_evenement || data.typeEvenementId,
      statut: data.statut || 'brouillon',
      capacite_max: data.capacite_max || data.capaciteMax,
      tarif: data.tarif || 0,
      inscription_requise: data.inscription_requise || data.inscriptionRequise || false,
      contact_email: data.contact_email || data.contactEmail,
      contact_telephone: data.contact_telephone || data.contactTelephone,
      url_virtuel: data.url_virtuel || data.urlVirtuel,
      image_url: data.image_url || data.imageUrl,
      age_minimum: data.age_minimum || data.ageMinimum,
      accessibilite: data.accessibilite || {},
      certificat_delivre: data.certificat_delivre || data.certificatDelivre || false,
      date_limite_inscription: data.date_limite_inscription || data.dateLimiteInscription,
      id_user: userId
    };

    const evenement = await this.repository.create(entityData);
    const full = await this.repository.findWithFullDetails(evenement.id_evenement);

    this.cache.invalidate();
    this.logger.info(`Événement créé: ${evenement.id_evenement} par user: ${userId}`);

    return EvenementDTO.fromEntity(full);
  }

  /**
   * Modifier un événement
   */
  async update(id, data, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    // Vérifier propriété
    if (existing.id_user !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    const updateData = {};
    if (data.nom_evenement || data.nom) updateData.nom_evenement = data.nom_evenement || data.nom;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date_debut || data.dateDebut) updateData.date_debut = data.date_debut || data.dateDebut;
    if (data.date_fin || data.dateFin) updateData.date_fin = data.date_fin || data.dateFin;
    if (data.id_lieu || data.lieuId) updateData.id_lieu = data.id_lieu || data.lieuId;
    if (data.id_type_evenement || data.typeEvenementId) updateData.id_type_evenement = data.id_type_evenement || data.typeEvenementId;
    if (data.statut) updateData.statut = data.statut;
    if (data.capacite_max || data.capaciteMax) updateData.capacite_max = data.capacite_max || data.capaciteMax;
    if (data.tarif !== undefined) updateData.tarif = data.tarif;
    if (data.image_url || data.imageUrl) updateData.image_url = data.image_url || data.imageUrl;
    if (data.contact_email || data.contactEmail) updateData.contact_email = data.contact_email || data.contactEmail;
    if (data.contact_telephone || data.contactTelephone) updateData.contact_telephone = data.contact_telephone || data.contactTelephone;

    await this.repository.update(id, updateData);
    const updated = await this.repository.findWithFullDetails(id);

    this.cache.invalidate();
    this.logger.info(`Événement modifié: ${id} par user: ${userId}`);

    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Supprimer un événement
   */
  async delete(id, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (existing.id_user !== userId) {
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres événements');
    }

    await this.repository.delete(id);
    this.cache.invalidate();
    this.logger.info(`Événement supprimé: ${id} par user: ${userId}`);
    return true;
  }

  // ============================================================================
  // INSCRIPTION / PARTICIPANTS
  // ============================================================================

  /**
   * Inscrire un participant
   */
  async registerParticipant(evenementId, userId) {
    const evenement = await this.repository.findById(evenementId);
    if (!evenement) {
      throw this._notFoundError(evenementId);
    }

    if (evenement.date_limite_inscription && new Date() > new Date(evenement.date_limite_inscription)) {
      throw this._validationError('La date limite d\'inscription est dépassée');
    }

    const registration = await this.withTransaction(async (transaction) => {
      if (evenement.capacite_max) {
        const count = await this.repository.countParticipants(evenementId, { transaction });
        if (count >= evenement.capacite_max) {
          throw this._validationError('L\'événement est complet');
        }
      }

      return this.repository.registerParticipant(evenementId, userId, { transaction });
    });

    this.logger.info(`Participant inscrit: user ${userId} → événement ${evenementId}`);
    return registration;
  }

  /**
   * Désinscrire un participant
   */
  async unregisterParticipant(evenementId, userId) {
    const result = await this.repository.unregisterParticipant(evenementId, userId);
    if (!result) {
      throw this._notFoundError(evenementId);
    }
    this.logger.info(`Participant désinscrit: user ${userId} → événement ${evenementId}`);
    return true;
  }

  // ============================================================================
  // PARTICIPANTS
  // ============================================================================

  /**
   * Vérifie que le demandeur est le créateur ou un admin
   */
  async _assertEventOwnerOrAdmin(evenementId, userId, userTypeId) {
    const evenement = await this.repository.findById(evenementId);
    if (!evenement) throw this._notFoundError(evenementId);
    if (evenement.id_user !== userId && userTypeId !== 1) {
      throw this._forbiddenError('Accès non autorisé');
    }
    return evenement;
  }

  /**
   * Liste les participants d'un événement
   */
  async getParticipants(evenementId, requesterId, requesterTypeId) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, requesterTypeId);
    return this.repository.getParticipants(evenementId);
  }

  /**
   * Vérifie l'inscription d'un utilisateur à un événement
   */
  async getMyRegistration(evenementId, userId) {
    const inscription = await this.repository.getRegistration(evenementId, userId);
    if (!inscription) {
      return { isRegistered: false, status: null };
    }
    return {
      isRegistered: true,
      status: inscription.statut_participation,
      inscription
    };
  }

  /**
   * Valide ou refuse la participation d'un utilisateur
   */
  async validateParticipation(evenementId, userId, validated, validatedBy, notes) {
    await this._assertEventOwnerOrAdmin(evenementId, validatedBy.id, validatedBy.typeId);

    const participation = await this.repository.updateParticipationStatus(evenementId, userId, {
      statut_participation: validated ? 'confirme' : 'annule',
      date_validation: new Date(),
      valide_par: validatedBy.id
    });

    if (!participation) {
      throw this._notFoundError(userId);
    }

    // Notification (best effort)
    try {
      if (this.models?.Notification) {
        const NotificationService = require('../notificationService');
        const notifService = new NotificationService(this.models);
        await notifService.notifierValidationParticipation(
          evenementId, userId, validated ? 'confirme' : 'refuse', notes || ''
        );
      }
    } catch (notifError) {
      this.logger.error('Erreur notification validation participation:', notifError);
    }

    return participation;
  }

  /**
   * Récupère le profil d'un participant inscrit à un événement
   */
  async getParticipantProfil(evenementId, userId) {
    const participation = await this.repository.getRegistration(evenementId, userId);
    if (!participation) {
      throw this._notFoundError(userId);
    }

    const user = await this.repository.getParticipantProfile(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    return { profil: user, participation };
  }

  /**
   * Liste les professionnels en attente pour un événement
   */
  async getProfessionnelsEnAttente(evenementId, requesterId, requesterTypeId) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, requesterTypeId);
    return this.repository.getPendingProfessionals(evenementId);
  }

  // ============================================================================
  // OEUVRES D'UN ÉVÉNEMENT
  // ============================================================================

  /**
   * Récupère les oeuvres d'un user pour un événement (ajoutées + disponibles)
   */
  async getMesOeuvres(evenementId, userId) {
    const { oeuvresAjoutees, toutesOeuvres } = await this.repository.getOeuvresForUser(evenementId, userId);
    const idsAjoutees = new Set(oeuvresAjoutees.map(eo => eo.id_oeuvre));
    const oeuvresDisponibles = toutesOeuvres.filter(o => !idsAjoutees.has(o.id_oeuvre));
    return { oeuvres_ajoutees: oeuvresAjoutees, oeuvres_disponibles: oeuvresDisponibles };
  }

  /**
   * Ajoute une oeuvre à un événement
   */
  async addOeuvreToEvent(evenementId, oeuvreId, userId, data = {}) {
    // Vérifier ownership
    const oeuvre = await this.repository.findOeuvreByOwner(oeuvreId, userId);
    if (!oeuvre) {
      throw this._notFoundError(oeuvreId);
    }

    // Vérifier doublon
    const existing = await this.repository.findEvenementOeuvre(evenementId, oeuvreId);
    if (existing) {
      const error = this._validationError('Oeuvre déjà ajoutée à cet événement');
      error.statusCode = 409;
      throw error;
    }

    return this.repository.addOeuvreToEvent({
      id_evenement: evenementId,
      id_oeuvre: oeuvreId,
      id_presentateur: userId,
      description_presentation: data.description_presentation,
      duree_presentation: data.duree_presentation
    });
  }

  /**
   * Met à jour une oeuvre dans un événement
   */
  async updateOeuvreInEvent(evenementId, oeuvreId, userId, body) {
    const updates = {};
    if (body.description_presentation !== undefined) updates.description_presentation = body.description_presentation;
    if (body.duree_presentation !== undefined) updates.duree_presentation = body.duree_presentation;
    if (body.ordre_presentation !== undefined) updates.ordre_presentation = body.ordre_presentation;
    else if (body.ordre !== undefined) updates.ordre_presentation = body.ordre;

    const result = await this.repository.updateOeuvreInEvent(evenementId, oeuvreId, userId, updates);
    if (!result) {
      throw this._notFoundError(oeuvreId);
    }
    return result;
  }

  /**
   * Réordonne les oeuvres d'un événement
   */
  async reorderOeuvres(evenementId, userId, oeuvres) {
    if (!oeuvres || !oeuvres.length) {
      throw this._validationError('Liste des oeuvres requise');
    }
    await this.repository.reorderOeuvres(evenementId, userId, oeuvres);
    return this.repository.getOeuvresOrdered(evenementId, userId);
  }

  /**
   * Supprime une oeuvre d'un événement
   */
  async removeOeuvreFromEvent(evenementId, oeuvreId, userId) {
    const deleted = await this.repository.removeOeuvreFromEvent(evenementId, oeuvreId, userId);
    if (!deleted) {
      throw this._notFoundError(oeuvreId);
    }
    return true;
  }

  /**
   * Exporte les données d'un événement (après vérification d'autorisation)
   */
  async exportEventData(evenementId, requesterId, requesterTypeId) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, requesterTypeId);
    const evenement = await this.repository.findWithFullDetails(evenementId);
    if (!evenement) throw this._notFoundError(evenementId);
    return EvenementDTO.fromEntity(evenement);
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Événements en attente
   */
  async findPending(options = {}) {
    const result = await this.repository.findPending(options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Publier un événement
   */
  async publish(id, adminId) {
    const evenement = await this.repository.findById(id);
    if (!evenement) throw this._notFoundError(id);

    await this.repository.update(id, { statut: 'publie' });
    const updated = await this.repository.findWithFullDetails(id);

    this.cache.invalidate();
    this.logger.info(`Événement publié: ${id} par admin: ${adminId}`);
    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Annuler un événement
   */
  async cancel(id, adminId, motif) {
    const evenement = await this.repository.findById(id);
    if (!evenement) throw this._notFoundError(id);

    await this.repository.update(id, { statut: 'annule' });
    const updated = await this.repository.findWithFullDetails(id);

    // Notification annulation (best effort)
    try {
      if (this.models?.Notification) {
        const NotificationService = require('../notificationService');
        const notifService = new NotificationService(this.models);
        await notifService.notifierAnnulationEvenement(id, motif || 'Annulation par l\'organisateur');
      }
    } catch (notifError) {
      this.logger.error('Erreur notification annulation:', notifError);
    }

    this.cache.invalidate();
    this.logger.info(`Événement annulé: ${id} par admin: ${adminId}, motif: ${motif}`);
    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Statistiques (cached 5 min)
   */
  async getStats() {
    return this.cache.getOrSet('stats', () => this.repository.getStats(), 5 * 60 * 1000);
  }
}

module.exports = EvenementService;
