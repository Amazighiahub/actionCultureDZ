/**
 * LieuController - Controller refactored with BaseController + Service Pattern
 * Architecture: BaseController -> Controller -> Service -> Database
 *
 * All data access goes through container.lieuService.
 * Translation (translateDeep, translate) stays here as presentation logic.
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translate, translateDeep, mergeTranslations } = require('../helpers/i18n');

const ALLOWED_LANGS = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

class LieuController extends BaseController {
  get service() {
    return container.lieuService;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  /**
   * Recuperer tous les lieux avec pagination et filtres
   */
  async getAllLieux(req, res) {
    try {
      const lang = ALLOWED_LANGS.includes(req.lang) ? req.lang : 'fr';
      const { page, limit } = this._paginate(req, { limit: 10 });
      const { wilaya, daira, commune, type_lieu, search, with_events = false } = req.query;

      const result = await this.service.getAllLieux({
        lang, page, limit, wilaya, daira, commune, type_lieu, search, with_events
      });

      const translatedLieux = translateDeep(result.rows, lang);
      res.json({
        success: true,
        data: {
          items: translatedLieux,
          lieux: translatedLieux,
          pagination: {
            total: result.count,
            page,
            pages: Math.ceil(result.count / limit),
            limit
          }
        },
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Recuperer les lieux d'une wilaya specifique
   */
  async getLieuxByWilaya(req, res) {
    try {
      const lang = ALLOWED_LANGS.includes(req.lang) ? req.lang : 'fr';
      const { wilayaId } = req.params;
      const { page, limit } = this._paginate(req, { limit: 10 });

      const result = await this.service.getLieuxByWilaya(wilayaId, { lang, page, limit });

      if (!result.wilaya) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.wilayaNotFound')
        });
      }

      res.json({
        success: true,
        data: {
          wilaya: translate(result.wilaya, lang),
          lieux: translateDeep(result.rows, lang),
          pagination: {
            total: result.count,
            page,
            pages: Math.ceil(result.count / limit)
          }
        },
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Obtenir un lieu par ID
   */
  async getLieuById(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const lieuData = await this.service.getLieuById(id);

      if (!lieuData) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      res.json({
        success: true,
        data: translateDeep(lieuData, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // CREATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  /**
   * Creer un nouveau lieu
   */
  async createLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const {
        nom, typeLieu = 'Commune', typeLieuCulturel, communeId, wilayaId,
        localiteId, adresse, description, histoire, latitude, longitude,
        details, detail
      } = req.body;

      // Resolve communeId from wilayaId if needed
      let finalCommuneId = communeId;
      if (!communeId && wilayaId) {
        const commune = await this.service.findCommuneByWilaya(wilayaId);
        if (commune) {
          finalCommuneId = commune.id_commune;
        }
      }

      // Validation
      if (!nom || !adresse || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: req.t('lieu.missingFields')
        });
      }

      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
          success: false,
          error: req.t('lieu.invalidLatitude')
        });
      }

      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          error: req.t('lieu.invalidLongitude')
        });
      }

      // Validate commune if provided (via service's translations lookup as existence check)
      if (finalCommuneId) {
        const communeCheck = await this.service.findCommuneById(finalCommuneId);
        if (!communeCheck) {
          return res.status(404).json({
            success: false,
            error: req.t('lieu.communeNotFound')
          });
        }

        if (localiteId) {
          const localiteCheck = await this.service.findLocaliteById(localiteId);
          if (!localiteCheck || localiteCheck.id_commune !== finalCommuneId) {
            return res.status(400).json({
              success: false,
              error: req.t('lieu.invalidLocalite')
            });
          }
        }
      }

      const lieuComplet = await this.service.createLieu({
        nom, typeLieu, typeLieuCulturel,
        communeId: finalCommuneId, localiteId,
        adresse, description, histoire,
        latitude, longitude, details, detail
      }, lang);

      res.status(201).json({
        success: true,
        message: req.t('lieu.created'),
        data: translateDeep(lieuComplet, lang)
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Mettre a jour un lieu
   */
  async updateLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { nom, adresse, description, histoire } = req.body;

      // Whitelist des champs modifiables
      const allowedFields = [
        'latitude', 'longitude', 'type_lieu', 'commune_id', 'wilaya_id',
        'photo_url', 'site_web', 'telephone', 'email', 'capacite',
        'accessibilite', 'statut'
      ];
      const updates = {};
      allowedFields.forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });

      // Fetch existing translations to merge multilang fields
      const existingLieu = await this.service.getLieuTranslations(id);
      if (!existingLieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      // Merge multilang fields (presentation logic stays in controller)
      if (nom !== undefined) {
        if (typeof nom === 'object') {
          updates.nom = mergeTranslations(existingLieu.nom, nom);
        } else {
          updates.nom = mergeTranslations(existingLieu.nom, { [lang]: nom });
        }
      }

      if (adresse !== undefined) {
        if (typeof adresse === 'object') {
          updates.adresse = mergeTranslations(existingLieu.adresse, adresse);
        } else {
          updates.adresse = mergeTranslations(existingLieu.adresse, { [lang]: adresse });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object') {
          updates.description = mergeTranslations(existingLieu.description, description);
        } else {
          updates.description = mergeTranslations(existingLieu.description, { [lang]: description });
        }
      }

      if (histoire !== undefined) {
        if (typeof histoire === 'object') {
          updates.histoire = mergeTranslations(existingLieu.histoire, histoire);
        } else {
          updates.histoire = mergeTranslations(existingLieu.histoire, { [lang]: histoire });
        }
      }

      const lieuMisAJour = await this.service.updateLieu(id, updates);

      if (!lieuMisAJour) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      res.json({
        success: true,
        message: req.t('lieu.updated'),
        data: translateDeep(lieuMisAJour, lang)
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Supprimer un lieu
   */
  async deleteLieu(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.deleteLieu(id);

      if (!result.lieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      if (result.hasEvents) {
        return res.status(400).json({
          success: false,
          error: req.t('lieu.hasEvents')
        });
      }

      return this._sendMessage(res, req.t('lieu.deleted'));
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // RECHERCHE
  // ========================================================================

  /**
   * Rechercher des lieux
   */
  async searchLieux(req, res) {
    try {
      const lang = ALLOWED_LANGS.includes(req.lang) ? req.lang : 'fr';
      const { page, limit } = this._paginate(req, { limit: 20 });
      const { q, type, commune, daira, wilaya, radius, lat, lng } = req.query;

      const result = await this.service.searchLieux({
        lang, q, type, commune, daira, wilaya, radius, lat, lng, page, limit
      });

      // Handle validation errors from the service
      if (result.invalidCoords) {
        return res.status(400).json({
          success: false,
          error: req.t('lieu.invalidCoords')
        });
      }

      if (result.coordsOutOfRange) {
        return res.status(400).json({
          success: false,
          error: req.t('lieu.coordsOutOfRange')
        });
      }

      const translatedLieux = translateDeep(result.rows, lang);
      res.json({
        success: true,
        data: {
          items: translatedLieux,
          lieux: translatedLieux,
          pagination: {
            total: result.count,
            page,
            pages: Math.ceil(result.count / limit)
          }
        },
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Lieux a proximite (pour patrimoine routes)
   */
  async getLieuxProximite(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { latitude, longitude, rayon = 10, limit = 20 } = req.query;

      const lieux = await this.service.getLieuxProximite({
        latitude, longitude, rayon, limit
      });

      res.json({
        success: true,
        data: translateDeep(lieux, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  /**
   * Statistiques des lieux (alias pour patrimoine routes)
   */
  async getStatistiquesLieux(req, res) {
    return this.getStatistiques(req, res);
  }

  /**
   * Statistiques des lieux
   */
  async getStatistiques(req, res) {
    try {
      const lang = req.lang || 'fr';

      const stats = await this.service.getStatistiques();

      res.json({
        success: true,
        data: stats,
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // VERIFICATION DOUBLONS
  // ========================================================================

  /**
   * Verifier les doublons de lieu/patrimoine
   */
  async checkDuplicate(req, res) {
    try {
      const { nom, latitude, longitude, typePatrimoine } = req.body;
      const lang = req.lang || 'fr';

      const result = await this.service.checkDuplicate({
        nom, latitude, longitude, typePatrimoine
      });

      if (result.exists) {
        const translated = translateDeep(result.lieu, lang);
        return this._sendSuccess(res, {
          exists: true,
          lieu: translated,
          matchType: result.matchType,
          isPatrimoine: result.isPatrimoine,
          hasDetailLieu: result.hasDetailLieu,
          typePatrimoine: result.typePatrimoine
        });
      }

      return this._sendSuccess(res, { exists: false });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // TRADUCTIONS (ADMIN)
  // ========================================================================

  /**
   * Recuperer toutes les traductions d'un lieu (admin)
   */
  async getLieuTranslations(req, res) {
    try {
      const { id } = req.params;

      const lieu = await this.service.getLieuTranslations(id);

      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      return this._sendSuccess(res, lieu);
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Mettre a jour une traduction specifique (admin)
   */
  async updateLieuTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, adresse, description, histoire } = req.body;

      const { lieu, updates } = await this.service.updateLieuTranslation(
        id, lang, { nom, adresse, description, histoire }
      );

      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: req.t('common.noDataToUpdate')
        });
      }

      res.json({
        success: true,
        message: req.t('translation.updated', { lang }),
        data: lieu
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // GESTION DES SERVICES D'UN LIEU
  // ========================================================================

  /**
   * Obtenir les services d'un lieu
   */
  async getServicesLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const { lieu, services } = await this.service.getServicesLieu(id);

      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      res.json({
        success: true,
        data: translateDeep(services, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Ajouter un service a un lieu
   */
  async addServiceLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { nom, description, disponible = true, services } = req.body;

      const result = await this.service.addServiceLieu(
        id,
        { nom, description, disponible, services },
        lang
      );

      if (!result.lieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      if (result.isMultiple) {
        return res.status(201).json({
          success: true,
          message: req.t ? req.t('lieu.serviceAdded') : `${result.created.length} services added`,
          data: translateDeep(result.created, lang),
          lang
        });
      }

      res.status(201).json({
        success: true,
        message: req.t('lieu.serviceAdded'),
        data: translateDeep(result.created, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Mettre a jour un service
   */
  async updateServiceLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id, serviceId } = req.params;
      const { nom, description, disponible } = req.body;

      const service = await this.service.updateServiceLieu(
        id, serviceId, { nom, description, disponible }, lang
      );

      if (!service) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.serviceNotFound')
        });
      }

      res.json({
        success: true,
        message: req.t('lieu.serviceUpdated'),
        data: translateDeep(service, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Supprimer un service
   */
  async deleteServiceLieu(req, res) {
    try {
      const { id, serviceId } = req.params;

      const deleted = await this.service.deleteServiceLieu(id, serviceId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.serviceNotFound')
        });
      }

      return this._sendMessage(res, req.t('lieu.serviceDeleted'));
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  // ========================================================================
  // GESTION DES DETAILS D'UN LIEU
  // ========================================================================

  /**
   * Obtenir les details d'un lieu
   */
  async getDetailsLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const details = await this.service.getDetailsLieu(id);

      if (!details) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.detailsNotFound')
        });
      }

      res.json({
        success: true,
        data: translateDeep(details, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * Creer ou mettre a jour les details d'un lieu
   */
  async updateDetailsLieu(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { description, horaires, histoire, referencesHistoriques } = req.body;

      const result = await this.service.updateDetailsLieu(
        id,
        { description, horaires, histoire, referencesHistoriques },
        lang
      );

      if (!result.lieu) {
        return res.status(404).json({
          success: false,
          error: req.t('lieu.notFound')
        });
      }

      res.json({
        success: true,
        message: req.t('lieu.detailsUpdated'),
        data: translateDeep(result.details, lang),
        lang
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }
}

module.exports = LieuController;
