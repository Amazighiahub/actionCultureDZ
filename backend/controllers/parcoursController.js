/**
 * ParcoursControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const container = require('../services/serviceContainer');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class ParcoursControllerV2 {
  get parcoursService() {
    return container.parcoursService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 20, theme, difficulte } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };

      let result;
      if (theme) {
        result = await this.parcoursService.findByTheme(theme, options);
      } else if (difficulte) {
        result = await this.parcoursService.findByDifficulte(difficulte, options);
      } else {
        result = await this.parcoursService.findActive(options);
      }

      res.json({
        success: true,
        data: result.data.map(p => p.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.parcoursService.search(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(p => p.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const parcours = await this.parcoursService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMap(req, res) {
    try {
      const parcours = await this.parcoursService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: parcours.toMapJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyParcours(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.parcoursService.findByCreateur(req.user.id_user, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(p => p.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const parcours = await this.parcoursService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: 'Parcours créé avec succès',
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const parcours = await this.parcoursService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Parcours mis à jour',
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.parcoursService.delete(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, message: 'Parcours supprimé' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // GESTION DES ÉTAPES
  // ============================================================================

  async addEtape(req, res) {
    try {
      const parcours = await this.parcoursService.addEtape(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.status(201).json({
        success: true,
        message: 'Étape ajoutée',
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async removeEtape(req, res) {
    try {
      const parcours = await this.parcoursService.removeEtape(
        parseInt(req.params.id),
        parseInt(req.params.etapeId),
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Étape supprimée',
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reorderEtapes(req, res) {
    try {
      const { orderedIds } = req.body;
      const parcours = await this.parcoursService.reorderEtapes(
        parseInt(req.params.id),
        orderedIds,
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Étapes réordonnées',
        data: parcours.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async listAll(req, res) {
    try {
      const { page = 1, limit = 20, statut } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };
      if (statut) options.where = { statut };

      const result = await this.parcoursService.findAll(options);
      res.json({
        success: true,
        data: result.data.map(p => p.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async activate(req, res) {
    try {
      const parcours = await this.parcoursService.activate(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Parcours activé',
        data: parcours.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async deactivate(req, res) {
    try {
      const parcours = await this.parcoursService.deactivate(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Parcours désactivé',
        data: parcours.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.parcoursService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PARCOURS PERSONNALISÉ (avec services)
  // ============================================================================

  async personnalise(req, res) {
    try {
      const {
        latitude, longitude, interests = [], duration = 240,
        transport = 'voiture', maxSites = 5,
        includeRestaurants = false, includeHotels = false
      } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Les coordonnées GPS (latitude, longitude) sont requises'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const models = require('../models');
      const { Op } = require('sequelize');

      // Haversine en JS
      function haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      // Rayon de recherche en km selon le transport
      const rayonKm = transport === 'marche' ? 5 : transport === 'velo' ? 15 : 50;

      // Bounding box approximatif (1° lat ≈ 111 km)
      const deltaLat = rayonKm / 111;
      const deltaLng = rayonKm / (111 * Math.cos(lat * Math.PI / 180));

      // Trouver les lieux patrimoniaux à proximité via bounding box
      const lieux = await models.Lieu.findAll({
        where: {
          latitude: { [Op.between]: [lat - deltaLat, lat + deltaLat] },
          longitude: { [Op.between]: [lng - deltaLng, lng + deltaLng] }
        },
        include: [
          { model: models.DetailLieu, attributes: ['description'], required: false },
          { model: models.LieuMedia, attributes: ['url', 'type_media'], required: false }
        ],
        limit: maxSites * 3
      });

      // Calculer distances en JS, trier, limiter
      const lieuxAvecDist = lieux
        .map(lieu => {
          const raw = lieu.get({ plain: true });
          const dist = haversineKm(lat, lng, parseFloat(raw.latitude), parseFloat(raw.longitude));
          return { raw, dist };
        })
        .filter(l => l.dist <= rayonKm)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, maxSites);

      // Vitesse moyenne (km/h) selon le transport
      const vitesseKmH = transport === 'marche' ? 4 : transport === 'velo' ? 15 : 40;

      // Construire les étapes
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

      // Chercher les services (restaurants, hôtels) à proximité
      const serviceTypes = [];
      if (includeRestaurants) serviceTypes.push('restaurant');
      if (includeHotels) serviceTypes.push('hotel');

      let servicesResult = { restaurants: [], hotels: [] };

      if (serviceTypes.length > 0) {
        const lieuIds = lieuxAvecDist.map(l => l.raw.id_lieu);

        const whereClause = {
          type_service: { [Op.in]: serviceTypes }
        };

        // Construire le OR avec les conditions disponibles
        const orConditions = [];
        if (lieuIds.length > 0) {
          orConditions.push({ id_lieu: { [Op.in]: lieuIds } });
        }
        orConditions.push({
          latitude: { [Op.between]: [lat - deltaLat, lat + deltaLat] },
          longitude: { [Op.between]: [lng - deltaLng, lng + deltaLng] }
        });

        whereClause[Op.or] = orConditions;

        try {
          const services = await models.Service.findAll({
            where: whereClause,
            include: [{
              model: models.Lieu,
              attributes: ['id_lieu', 'nom', 'latitude', 'longitude'],
              required: false
            }],
            limit: 10,
            order: [['createdAt', 'DESC']]
          });

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
          console.error('Erreur recherche services (non bloquant):', serviceErr.message);
        }

        // Insérer les restaurants entre les étapes (après la moitié du parcours)
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

      // Calculer les totaux
      const distanceTotale = etapes.reduce((sum, e) => sum + (e.distance || 0), 0);
      const dureeEstimee = etapes.reduce((sum, e) => sum + (e.duree || 0), 0);

      res.json({
        success: true,
        data: {
          etapes,
          distanceTotale: parseFloat(distanceTotale.toFixed(1)),
          dureeEstimee: Math.min(dureeEstimee, duration),
          pointsInteret: etapes.length,
          services: servicesResult
        }
      });
    } catch (error) {
      console.error('Erreur personnalise:', error.message, error.stack);
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _handleError(res, error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    if (IS_DEV_MODE) {
      console.error(`❌ Error [${code}]:`, error.message);
      if (statusCode === 500) console.error(error.stack);
    }

    const response = { success: false, error: error.message || 'Erreur serveur', code };
    if (error.errors) response.errors = error.errors;
    if (IS_DEV_MODE && statusCode === 500) response.stack = error.stack;

    res.status(statusCode).json(response);
  }
}

module.exports = new ParcoursControllerV2();
