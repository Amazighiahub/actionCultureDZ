/**
 * ParcoursService - Logique métier pour les parcours intelligents
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const ParcoursDTO = require('../../dto/parcours/parcoursDTO');

class ParcoursService extends BaseService {
  constructor(parcoursRepository, options = {}) {
    super(parcoursRepository, options);
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Parcours actifs
   */
  async findActive(options = {}) {
    const result = await this.repository.findActive(options);
    return {
      data: ParcoursDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Détail complet avec étapes
   */
  async findWithFullDetails(id) {
    const parcours = await this.repository.findWithFullDetails(id);
    if (!parcours) {
      throw this._notFoundError(id);
    }
    return ParcoursDTO.fromEntity(parcours);
  }

  /**
   * Par créateur
   */
  async findByCreateur(userId, options = {}) {
    const result = await this.repository.findByCreateur(userId, options);
    return {
      data: ParcoursDTO.fromEntities(result.data),
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
    const result = await this.repository.searchParcours(query, options);
    return {
      data: ParcoursDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par thème
   */
  async findByTheme(theme, options = {}) {
    const result = await this.repository.findByTheme(theme, options);
    return {
      data: ParcoursDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par difficulté
   */
  async findByDifficulte(difficulte, options = {}) {
    const result = await this.repository.findByDifficulte(difficulte, options);
    return {
      data: ParcoursDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Tous les parcours (admin)
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll({
      ...options,
      include: this.repository._includesWithEtapes(),
      order: [['date_creation', 'DESC']]
    });
    return {
      data: ParcoursDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un parcours
   */
  async create(data, userId) {
    if (!data.nom_parcours && !data.nom) {
      throw this._validationError('Le nom du parcours est requis');
    }

    const entityData = {
      nom_parcours: data.nom_parcours || data.nom,
      description: data.description || {},
      duree_estimee: data.duree_estimee || data.dureeEstimee || null,
      difficulte: data.difficulte || 'facile',
      theme: data.theme || null,
      distance_km: data.distance_km || data.distanceKm || null,
      point_depart: data.point_depart || data.pointDepart || null,
      point_arrivee: data.point_arrivee || data.pointArrivee || null,
      statut: data.statut || 'actif',
      id_createur: userId
    };

    const parcours = await this.repository.withTransaction(async (transaction) => {
      const created = await this.repository.create(entityData, { transaction });

      // Ajouter les étapes si fournies (bulkCreate au lieu de boucle)
      if (data.etapes && Array.isArray(data.etapes) && data.etapes.length > 0) {
        await this.repository.addEtapesBulk(created.id_parcours, data.etapes, { transaction });
      }

      return created;
    });

    const full = await this.repository.findWithFullDetails(parcours.id_parcours);

    this.logger.info(`Parcours créé: ${parcours.id_parcours} par user: ${userId}`);
    return ParcoursDTO.fromEntity(full);
  }

  /**
   * Modifier un parcours
   */
  async update(id, data, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (existing.id_createur !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres parcours');
    }

    const updateData = {};
    if (data.nom_parcours || data.nom) updateData.nom_parcours = data.nom_parcours || data.nom;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.duree_estimee || data.dureeEstimee) updateData.duree_estimee = data.duree_estimee || data.dureeEstimee;
    if (data.difficulte) updateData.difficulte = data.difficulte;
    if (data.theme !== undefined) updateData.theme = data.theme;
    if (data.distance_km !== undefined || data.distanceKm !== undefined) updateData.distance_km = data.distance_km || data.distanceKm;
    if (data.point_depart !== undefined || data.pointDepart !== undefined) updateData.point_depart = data.point_depart || data.pointDepart;
    if (data.point_arrivee !== undefined || data.pointArrivee !== undefined) updateData.point_arrivee = data.point_arrivee || data.pointArrivee;
    if (data.statut) updateData.statut = data.statut;

    await this.repository.update(id, updateData);
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Parcours modifié: ${id} par user: ${userId}`);
    return ParcoursDTO.fromEntity(updated);
  }

  /**
   * Supprimer un parcours
   */
  async delete(id, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (existing.id_createur !== userId) {
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres parcours');
    }

    await this.repository.delete(id);
    this.logger.info(`Parcours supprimé: ${id} par user: ${userId}`);
    return true;
  }

  // ============================================================================
  // GESTION DES ÉTAPES
  // ============================================================================

  /**
   * Ajouter une étape
   */
  async addEtape(parcoursId, etapeData, userId) {
    const parcours = await this.repository.findById(parcoursId);
    if (!parcours) throw this._notFoundError(parcoursId);

    if (parcours.id_createur !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres parcours');
    }

    if (!etapeData.id_lieu && !etapeData.lieuId) {
      throw this._validationError('L\'ID du lieu est requis');
    }

    await this.repository.addEtape(parcoursId, etapeData);
    const updated = await this.repository.findWithFullDetails(parcoursId);

    this.logger.info(`Étape ajoutée au parcours: ${parcoursId}`);
    return ParcoursDTO.fromEntity(updated);
  }

  /**
   * Supprimer une étape
   */
  async removeEtape(parcoursId, etapeId, userId) {
    const parcours = await this.repository.findById(parcoursId);
    if (!parcours) throw this._notFoundError(parcoursId);

    if (parcours.id_createur !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres parcours');
    }

    const result = await this.repository.removeEtape(parcoursId, etapeId);
    if (!result) {
      throw this._notFoundError(etapeId);
    }

    const updated = await this.repository.findWithFullDetails(parcoursId);
    this.logger.info(`Étape ${etapeId} supprimée du parcours: ${parcoursId}`);
    return ParcoursDTO.fromEntity(updated);
  }

  /**
   * Réordonner les étapes
   */
  async reorderEtapes(parcoursId, orderedIds, userId) {
    const parcours = await this.repository.findById(parcoursId);
    if (!parcours) throw this._notFoundError(parcoursId);

    if (parcours.id_createur !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres parcours');
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw this._validationError('La liste des IDs ordonnés est requise');
    }

    await this.repository.reorderEtapes(parcoursId, orderedIds);
    const updated = await this.repository.findWithFullDetails(parcoursId);

    this.logger.info(`Étapes réordonnées pour parcours: ${parcoursId}`);
    return ParcoursDTO.fromEntity(updated);
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Activer un parcours
   */
  async activate(id, adminId) {
    const parcours = await this.repository.findById(id);
    if (!parcours) throw this._notFoundError(id);

    await this.repository.update(id, { statut: 'actif' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Parcours activé: ${id} par admin: ${adminId}`);
    return ParcoursDTO.fromEntity(updated);
  }

  /**
   * Désactiver un parcours
   */
  async deactivate(id, adminId) {
    const parcours = await this.repository.findById(id);
    if (!parcours) throw this._notFoundError(id);

    await this.repository.update(id, { statut: 'inactif' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Parcours désactivé: ${id} par admin: ${adminId}`);
    return ParcoursDTO.fromEntity(updated);
  }

  /**
   * Statistiques
   */
  async getStats() {
    return this.repository.getStats();
  }
}

module.exports = ParcoursService;
