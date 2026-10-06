/**
 * ArtisanatService - Logique métier pour l'artisanat
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const ArtisanatDTO = require('../../dto/artisanat/artisanatDTO');

class ArtisanatService extends BaseService {
  constructor(artisanatRepository, options = {}) {
    super(artisanatRepository, options);
    this.repositories = options.repositories || {};
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Liste des artisanats publiés avec filtres
   */
  async findPublished(options = {}) {
    const result = await this.repository.findPublished(options);
    return {
      data: ArtisanatDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Détail complet
   */
  async findWithFullDetails(id) {
    const artisanat = await this.repository.findWithFullDetails(id);
    if (!artisanat) {
      throw this._notFoundError(id);
    }
    return ArtisanatDTO.fromEntity(artisanat);
  }

  /**
   * Recherche
   */
  async search(query, options = {}) {
    if (!query || query.length < 2) {
      throw this._validationError('Requête de recherche trop courte (min 2 caractères)');
    }
    const result = await this.repository.searchArtisanats(query, options);
    return {
      data: ArtisanatDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par artisan
   */
  async findByArtisan(userId, options = {}) {
    const result = await this.repository.findByArtisan(userId, options);
    return {
      data: ArtisanatDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un artisanat (nécessite une Oeuvre parente)
   */
  async create(data, userId, isAdmin = false) {
    if (!data.id_oeuvre && !data.oeuvreId) {
      throw this._validationError('L\'ID de l\'oeuvre parente est requis');
    }

    // L'œuvre parente doit appartenir à l'utilisateur (sinon il se rattacherait à
    // l'œuvre d'un autre, qui en deviendrait responsable) et n'avoir qu'un artisanat
    const oeuvreId = parseInt(data.id_oeuvre || data.oeuvreId, 10);
    if (this.models?.Oeuvre) {
      const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId, { attributes: ['id_oeuvre', 'saisi_par'] });
      if (!oeuvre) throw this._notFoundError(oeuvreId);
      if (!isAdmin && Number(oeuvre.saisi_par) !== Number(userId)) {
        throw this._forbiddenError('Vous ne pouvez rattacher un artisanat qu\'à vos propres œuvres');
      }
    }
    if (this.models?.Artisanat) {
      const already = await this.models.Artisanat.count({ where: { id_oeuvre: oeuvreId } });
      if (already > 0) throw this._conflictError('Cette œuvre a déjà une fiche artisanat');
    }

    const entityData = {
      id_oeuvre: data.id_oeuvre || data.oeuvreId,
      id_materiau: data.id_materiau || data.materiauId || null,
      id_technique: data.id_technique || data.techniqueId || null,
      dimensions: data.dimensions || null,
      poids: data.poids || null,
      prix: data.prix || null
    };

    const artisanat = await this.repository.create(entityData);
    const full = await this.repository.findWithFullDetails(artisanat.id_artisanat);

    this.logger.info(`Artisanat créé: ${artisanat.id_artisanat} par user: ${userId}`);
    return ArtisanatDTO.fromEntity(full);
  }

  /**
   * Modifier un artisanat
   */
  async update(id, data, userId, isAdmin = false) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    const ownerId = existing.Oeuvre?.saisi_par ?? existing.Oeuvre?.id_createur;
    if (ownerId !== userId && !isAdmin) {
      throw this._forbiddenError('Vous ne pouvez pas modifier cet artisanat');
    }

    const updateData = {};
    if (data.id_materiau !== undefined || data.materiauId !== undefined) {
      updateData.id_materiau = data.id_materiau || data.materiauId;
    }
    if (data.id_technique !== undefined || data.techniqueId !== undefined) {
      updateData.id_technique = data.id_technique || data.techniqueId;
    }
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
    if (data.poids !== undefined) updateData.poids = data.poids;
    if (data.prix !== undefined) updateData.prix = data.prix;

    await this.repository.update(id, updateData);
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Artisanat modifié: ${id} par user: ${userId}`);
    return ArtisanatDTO.fromEntity(updated);
  }

  /**
   * Supprimer
   */
  async delete(id, userId, isAdmin = false) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    const ownerId = existing.Oeuvre?.saisi_par ?? existing.Oeuvre?.id_createur;
    if (ownerId !== userId && !isAdmin) {
      throw this._forbiddenError('Vous ne pouvez pas supprimer cet artisanat');
    }

    await this.repository.delete(id);
    this.logger.info(`Artisanat supprimé: ${id} par user: ${userId}`);
    return true;
  }

  /**
   * Statistiques
   */
  async getStats() {
    return this.repository.getStats();
  }

  /**
   * Artisans (non-visiteurs) d'une wilaya donnée
   * @param {number} wilayaId
   * @returns {Promise<Array>}
   */
  async getArtisansByRegion(wilayaId) {
    const userRepo = this.repositories.user;
    if (!userRepo) {
      throw this._validationError('UserRepository non disponible');
    }
    return userRepo.findArtisansByWilaya(wilayaId);
  }
}

module.exports = ArtisanatService;
