/**
 * PatrimoineService - Logique métier pour les sites patrimoniaux
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const PatrimoineDTO = require('../../dto/patrimoine/patrimoineDTO');

class PatrimoineService extends BaseService {
  constructor(patrimoineRepository, options = {}) {
    super(patrimoineRepository, options);
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Sites populaires
   */
  async findPopular(options = {}) {
    const sites = await this.repository.findPopular(options);
    return PatrimoineDTO.fromEntities(sites);
  }

  /**
   * Tous les sites avec pagination
   */
  async findAllSites(options = {}) {
    const result = await this.repository.findAllSites(options);
    return {
      data: PatrimoineDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Détail complet d'un site
   */
  async findWithFullDetails(id) {
    const site = await this.repository.findWithFullDetails(id);
    if (!site) {
      throw this._notFoundError(id);
    }
    return PatrimoineDTO.fromEntity(site);
  }

  /**
   * Recherche
   */
  async search(query, options = {}) {
    if (!query || query.length < 2) {
      throw this._validationError('Requête de recherche trop courte (min 2 caractères)');
    }
    const result = await this.repository.searchSites(query, options);
    return {
      data: PatrimoineDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Données pour la carte
   */
  async findForMap(options = {}) {
    const sites = await this.repository.findForMap(options);
    return PatrimoineDTO.fromEntities(sites);
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un site patrimonial
   */
  async create(data) {
    if (!data.nom) {
      throw this._validationError('Le nom du site est requis');
    }
    if (!data.latitude || !data.longitude) {
      throw this._validationError('Les coordonnées GPS sont requises');
    }

    const entityData = {
      nom: data.nom,
      adresse: data.adresse || {},
      latitude: data.latitude,
      longitude: data.longitude,
      typeLieu: data.typeLieu || 'Commune',
      typePatrimoine: data.typePatrimoine || 'monument',
      communeId: data.communeId,
      localiteId: data.localiteId || null
    };

    const site = await this.repository.create(entityData);
    const full = await this.repository.findWithFullDetails(site.id_lieu);

    this.logger.info(`Site patrimonial créé: ${site.id_lieu}`);
    return PatrimoineDTO.fromEntity(full);
  }

  /**
   * Modifier un site
   */
  async update(id, data) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    const updateData = {};
    if (data.nom) updateData.nom = data.nom;
    if (data.adresse) updateData.adresse = data.adresse;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.typeLieu) updateData.typeLieu = data.typeLieu;
    if (data.typePatrimoine) updateData.typePatrimoine = data.typePatrimoine;
    if (data.communeId) updateData.communeId = data.communeId;
    if (data.localiteId !== undefined) updateData.localiteId = data.localiteId;

    await this.repository.update(id, updateData);
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Site patrimonial modifié: ${id}`);
    return PatrimoineDTO.fromEntity(updated);
  }

  /**
   * Supprimer un site
   */
  async delete(id) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    await this.repository.delete(id);
    this.logger.info(`Site patrimonial supprimé: ${id}`);
    return true;
  }

  /**
   * Statistiques
   */
  async getStats() {
    return this.repository.getStats();
  }
}

module.exports = PatrimoineService;
