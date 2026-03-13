/**
 * ParcoursService - Logique métier pour les parcours intelligents
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const ParcoursDTO = require('../../dto/parcours/parcoursDTO');
const { haversineKm, boundingBox, rayonParTransport, vitesseParTransport } = require('../utils/geoUtils');

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
  // PARCOURS PERSONNALISÉ
  // ============================================================================

  /**
   * Génère un parcours personnalisé basé sur la géolocalisation
   * @param {Object} params - Paramètres métier (pas de req/res)
   */
  async generatePersonnalise({ lat, lng, interests = [], duration = 240, transport = 'voiture', maxSites = 5, includeRestaurants = false, includeHotels = false }) {
    const rayonKm = rayonParTransport(transport);
    const bbox = boundingBox(lat, lng, rayonKm);
    const vitesseKmH = vitesseParTransport(transport);

    // 1. Chercher les lieux patrimoniaux à proximité
    const lieux = await this.repository.findLieuxProximite(bbox, maxSites * 3);

    // 2. Calculer distances, filtrer par rayon, trier, limiter
    const lieuxAvecDist = lieux
      .map(lieu => {
        const raw = lieu.get({ plain: true });
        const dist = haversineKm(lat, lng, parseFloat(raw.latitude), parseFloat(raw.longitude));
        return { raw, dist };
      })
      .filter(l => l.dist <= rayonKm)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxSites);

    // 3. Construire les étapes
    const etapes = lieuxAvecDist.map(({ raw, dist }) => {
      const dureeTrajet = Math.round((dist / vitesseKmH) * 60);
      const dureeVisite = 30;
      const nom = typeof raw.nom === 'object' ? (raw.nom.fr || raw.nom.ar || raw.nom.en || '') : (raw.nom || '');
      const desc = raw.DetailLieu?.description;
      const description = typeof desc === 'object' ? (desc.fr || desc.ar || '') : (desc || '');
      const medias = raw.LieuMedias || raw.LieuMedia || [];
      const image = Array.isArray(medias) && medias.length > 0 ? medias[0].url : null;

      return {
        id: raw.id_lieu,
        nom,
        type: raw.typePatrimoine || 'monument',
        latitude: parseFloat(raw.latitude),
        longitude: parseFloat(raw.longitude),
        distance: parseFloat(dist.toFixed(2)),
        duree: dureeTrajet + dureeVisite,
        description: (description || '').substring(0, 150),
        image,
        horaires: null,
        note: null
      };
    });

    // 4. Chercher les services (restaurants, hôtels) si demandé
    const servicesResult = { restaurants: [], hotels: [] };
    const serviceTypes = [];
    if (includeRestaurants) serviceTypes.push('restaurant');
    if (includeHotels) serviceTypes.push('hotel');

    if (serviceTypes.length > 0) {
      const lieuIds = lieuxAvecDist.map(l => l.raw.id_lieu);

      try {
        const services = await this.repository.findServicesProximite(serviceTypes, lieuIds, bbox, 10);

        services.forEach(s => {
          const raw = s.get({ plain: true });
          const nom = typeof raw.nom === 'object' ? (raw.nom.fr || '') : (raw.nom || '');
          const desc = typeof raw.description === 'object' ? (raw.description.fr || '') : (raw.description || '');
          const sLat = parseFloat(raw.latitude) || raw.Lieu?.latitude;
          const sLng = parseFloat(raw.longitude) || raw.Lieu?.longitude;

          let dist = 0;
          if (sLat && sLng) {
            dist = haversineKm(lat, lng, sLat, sLng);
          }

          const serviceItem = {
            id: raw.id,
            nom,
            type: raw.type_service,
            latitude: sLat || null,
            longitude: sLng || null,
            distance: parseFloat(dist.toFixed(2)),
            duree: 5,
            description: (desc || '').substring(0, 100),
            telephone: raw.telephone,
            tarif_min: raw.tarif_min ? parseFloat(raw.tarif_min) : null,
            tarif_max: raw.tarif_max ? parseFloat(raw.tarif_max) : null
          };

          if (raw.type_service === 'restaurant') {
            servicesResult.restaurants.push(serviceItem);
          } else if (raw.type_service === 'hotel') {
            servicesResult.hotels.push(serviceItem);
          }
        });
      } catch (serviceErr) {
        this.logger.error('Erreur recherche services (non bloquant):', serviceErr.message);
      }

      // Insérer le restaurant au milieu du parcours
      if (includeRestaurants && servicesResult.restaurants.length > 0) {
        const insertIdx = Math.floor(etapes.length / 2);
        const resto = servicesResult.restaurants[0];
        etapes.splice(insertIdx, 0, {
          ...resto,
          type: 'restaurant',
          duree: 45,
          horaires: '12:00 – 15:00'
        });
      }

      // Ajouter l'hôtel en fin de parcours
      if (includeHotels && servicesResult.hotels.length > 0) {
        const hotel = servicesResult.hotels[0];
        etapes.push({
          ...hotel,
          type: 'hotel',
          duree: 0,
          horaires: 'Check-in: 14:00'
        });
      }
    }

    // 5. Calculer les totaux
    const distanceTotale = etapes.reduce((sum, e) => sum + (e.distance || 0), 0);
    const dureeEstimee = etapes.reduce((sum, e) => sum + (e.duree || 0), 0);

    return {
      etapes,
      distanceTotale: parseFloat(distanceTotale.toFixed(1)),
      dureeEstimee: Math.min(dureeEstimee, duration),
      pointsInteret: etapes.length,
      services: servicesResult
    };
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
