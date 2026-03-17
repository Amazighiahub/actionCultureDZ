/**
 * ServiceService - Logique métier pour les services culturels
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const ServiceDTO = require('../../dto/service/serviceDTO');

class ServiceService extends BaseService {
  constructor(serviceRepository, options = {}) {
    super(serviceRepository, options);
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Services validés avec filtres
   */
  async findValidated(options = {}) {
    const result = await this.repository.findValidated(options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Détail complet
   */
  async findWithFullDetails(id) {
    const service = await this.repository.findWithFullDetails(id);
    if (!service) {
      throw this._notFoundError(id);
    }
    return ServiceDTO.fromEntity(service);
  }

  /**
   * Par lieu
   */
  async findByLieu(lieuId, options = {}) {
    const result = await this.repository.findByLieu(lieuId, options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par professionnel
   */
  async findByProfessionnel(userId, options = {}) {
    const result = await this.repository.findByProfessionnel(userId, options);
    return {
      data: ServiceDTO.fromEntities(result.data),
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
    const result = await this.repository.searchServices(query, options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un service
   */
  async create(data, userId) {
    if (!data.nom) {
      throw this._validationError('Le nom du service est requis');
    }
    if (!data.type_service && !data.typeService) {
      throw this._validationError('Le type de service est requis');
    }

    const lieuId = data.id_lieu || data.lieuId;
    if (lieuId && this.models?.Lieu) {
      const lieu = await this.models.Lieu.findByPk(lieuId);
      if (!lieu) throw this._validationError('Le lieu spécifié n\'existe pas');
    }

    // Validate GPS coordinates if provided
    const { isValidLatitude, isValidLongitude } = require('../utils/geoUtils');
    if (data.latitude != null && data.latitude !== '' && !isValidLatitude(data.latitude)) {
      throw this._validationError('Coordonnées GPS invalides (latitude : -90 à 90)');
    }
    if (data.longitude != null && data.longitude !== '' && !isValidLongitude(data.longitude)) {
      throw this._validationError('Coordonnées GPS invalides (longitude : -180 à 180)');
    }

    const entityData = {
      nom: data.nom,
      description: data.description || {},
      type_service: data.type_service || data.typeService,
      disponible: data.disponible !== undefined ? data.disponible : true,
      id_lieu: data.id_lieu || data.lieuId || null,
      id_user: userId,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      adresse: data.adresse || {},
      telephone: data.telephone || null,
      email: data.email || null,
      site_web: data.site_web || data.siteWeb || null,
      horaires: data.horaires || {},
      tarif_min: data.tarif_min || data.tarifMin || null,
      tarif_max: data.tarif_max || data.tarifMax || null,
      photo_url: data.photo_url || data.photoUrl || null,
      statut: 'en_attente'
    };

    const service = await this.repository.create(entityData);
    const full = await this.repository.findWithFullDetails(service.id);

    this.logger.info(`Service créé: ${service.id} par user: ${userId}`);
    return ServiceDTO.fromEntity(full);
  }

  /**
   * Modifier un service
   */
  async update(id, data, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    // Vérifier propriété
    if (existing.id_user && existing.id_user !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres services');
    }

    const updateData = {};
    if (data.nom) updateData.nom = data.nom;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type_service || data.typeService) updateData.type_service = data.type_service || data.typeService;
    if (data.disponible !== undefined) updateData.disponible = data.disponible;
    if (data.id_lieu || data.lieuId) updateData.id_lieu = data.id_lieu || data.lieuId;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.adresse) updateData.adresse = data.adresse;
    if (data.telephone !== undefined) updateData.telephone = data.telephone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.site_web !== undefined || data.siteWeb !== undefined) updateData.site_web = data.site_web || data.siteWeb;
    if (data.horaires) updateData.horaires = data.horaires;
    if (data.tarif_min !== undefined || data.tarifMin !== undefined) updateData.tarif_min = data.tarif_min || data.tarifMin;
    if (data.tarif_max !== undefined || data.tarifMax !== undefined) updateData.tarif_max = data.tarif_max || data.tarifMax;
    if (data.photo_url || data.photoUrl) updateData.photo_url = data.photo_url || data.photoUrl;

    await this.repository.update(id, updateData);
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Service modifié: ${id} par user: ${userId}`);
    return ServiceDTO.fromEntity(updated);
  }

  /**
   * Supprimer
   */
  async delete(id, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (existing.id_user && existing.id_user !== userId) {
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres services');
    }

    await this.repository.delete(id);
    this.logger.info(`Service supprimé: ${id} par user: ${userId}`);
    return true;
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * En attente de validation
   */
  async findPending(options = {}) {
    const result = await this.repository.findPending(options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Valider un service
   */
  async validate(id, adminId) {
    const service = await this.repository.findById(id);
    if (!service) throw this._notFoundError(id);

    if (service.statut === 'valide') {
      throw this._conflictError('Ce service est déjà validé');
    }

    await this.repository.update(id, { statut: 'valide' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Service validé: ${id} par admin: ${adminId}`);
    return ServiceDTO.fromEntity(updated);
  }

  /**
   * Rejeter un service
   */
  async reject(id, adminId, motif) {
    const service = await this.repository.findById(id);
    if (!service) throw this._notFoundError(id);

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de rejet est requis');
    }

    await this.repository.update(id, { statut: 'rejete' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Service rejeté: ${id} par admin: ${adminId}, motif: ${motif}`);
    return ServiceDTO.fromEntity(updated);
  }

  /**
   * Statistiques
   */
  async getStats() {
    return this.repository.getStats();
  }
}

module.exports = ServiceService;
