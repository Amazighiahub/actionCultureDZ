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

  /** Types Monument/Vestige autorisés (alignés avec la base) */
  static MONUMENT_TYPES = ['Mosquée', 'Palais', 'Statue', 'Tour', 'Musée'];
  static VESTIGE_TYPES = ['Ruines', 'Murailles', 'Site archéologique'];

  /**
   * Normalise le type monument (mappe "Autre" vers un type valide)
   */
  _normalizeMonumentType(type) {
    const valid = PatrimoineService.MONUMENT_TYPES;
    return valid.includes(type) ? type : 'Palais';
  }

  /**
   * Normalise le type vestige
   */
  _normalizeVestigeType(type) {
    const valid = PatrimoineService.VESTIGE_TYPES;
    return valid.includes(type) ? type : 'Ruines';
  }

  /**
   * Créer un site patrimonial (Lieu + DetailLieu + monuments, vestiges, services, medias)
   * Si lieuId fourni : met à jour le lieu existant et synchronise les entités liées
   */
  async create(data) {
    if (!data.nom) {
      throw this._validationError('Le nom du site est requis');
    }
    if (!data.latitude || !data.longitude) {
      throw this._validationError('Les coordonnées GPS sont requises');
    }
    const { isValidLatitude, isValidLongitude } = require('../utils/geoUtils');
    if (!isValidLatitude(data.latitude)) {
      throw this._validationError('Coordonnées GPS invalides (latitude : -90 à 90)');
    }
    if (!isValidLongitude(data.longitude)) {
      throw this._validationError('Coordonnées GPS invalides (longitude : -180 à 180)');
    }
    if (!data.communeId) {
      throw this._validationError('La commune est requise');
    }

    const { Lieu, DetailLieu, Monument, Vestige, Service, LieuMedia } = this.models || {};
    if (!Lieu) {
      throw this._validationError('Modèles non disponibles');
    }

    return this.repository.withTransaction(async (transaction) => {
      let lieuId;

      if (data.lieuId) {
        // Réutiliser un lieu existant
        const existing = await Lieu.findByPk(data.lieuId, { transaction });
        if (!existing) {
          throw this._validationError('Le lieu sélectionné n\'existe pas');
        }
        lieuId = existing.id_lieu;
        await existing.update({
          nom: data.nom || existing.nom,
          adresse: data.adresse || existing.adresse,
          latitude: data.latitude ?? existing.latitude,
          longitude: data.longitude ?? existing.longitude,
          typeLieu: data.typeLieu || existing.typeLieu || 'Commune',
          typePatrimoine: data.typePatrimoine || existing.typePatrimoine || 'monument',
          communeId: data.communeId ?? existing.communeId,
          localiteId: data.localiteId !== undefined ? data.localiteId : existing.localiteId
        }, { transaction });
      } else {
        // Créer un nouveau lieu
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
        const site = await Lieu.create(entityData, { transaction });
        lieuId = site.id_lieu;
      }

      // Créer ou mettre à jour DetailLieu
      let detail = await DetailLieu?.findOne({ where: { id_lieu: lieuId }, transaction });
      const detailData = {
        description: data.description || {},
        horaires: data.horaires || {},
        histoire: data.histoire || {},
        referencesHistoriques: data.referencesHistoriques || {}
      };
      if (detail) {
        await detail.update(detailData, { transaction });
      } else if (DetailLieu) {
        detail = await DetailLieu.create({ id_lieu: lieuId, ...detailData }, { transaction });
      }

      const detailId = detail?.id_detailLieu;

      // Synchroniser les monuments (bulkCreate au lieu de boucle)
      if (detailId && Monument && Array.isArray(data.monuments)) {
        await Monument.destroy({ where: { id_detail_lieu: detailId }, transaction });
        const monumentRows = data.monuments
          .filter(m => m?.nom?.fr || m?.nom)
          .map(m => ({
            id_detail_lieu: detailId,
            nom: m.nom || { fr: '' },
            description: m.description || { fr: '' },
            type: this._normalizeMonumentType(m.type)
          }));
        if (monumentRows.length) {
          await Monument.bulkCreate(monumentRows, { transaction });
        }
      }

      // Synchroniser les vestiges (bulkCreate)
      if (detailId && Vestige && Array.isArray(data.vestiges)) {
        await Vestige.destroy({ where: { id_detail_lieu: detailId }, transaction });
        const vestigeRows = data.vestiges
          .filter(v => v?.nom?.fr || v?.nom)
          .map(v => ({
            id_detail_lieu: detailId,
            nom: v.nom || { fr: '' },
            description: v.description || { fr: '' },
            type: this._normalizeVestigeType(v.type)
          }));
        if (vestigeRows.length) {
          await Vestige.bulkCreate(vestigeRows, { transaction });
        }
      }

      // Synchroniser les services (bulkCreate)
      if (Service && Array.isArray(data.services)) {
        await Service.destroy({ where: { id_lieu: lieuId }, transaction });
        const serviceRows = data.services
          .filter(s => s?.nom?.fr || s?.nom)
          .map(s => ({
            id_lieu: lieuId,
            nom: s.nom || { fr: '' },
            description: s.description || {},
            type_service: s.type_service || 'autre',
            disponible: s.disponible !== false,
            telephone: s.telephone || null,
            adresse: s.adresse || {}
          }));
        if (serviceRows.length) {
          await Service.bulkCreate(serviceRows, { transaction });
        }
      }

      // Synchroniser les médias (bulkCreate)
      if (LieuMedia && Array.isArray(data.medias)) {
        await LieuMedia.destroy({ where: { id_lieu: lieuId }, transaction });
        const mediaRows = data.medias
          .filter(m => m?.url)
          .map(m => ({
            id_lieu: lieuId,
            url: m.url,
            type: m.type || 'image',
            description: m.description || {}
          }));
        if (mediaRows.length) {
          await LieuMedia.bulkCreate(mediaRows, { transaction });
        }
      }

      const full = await this.repository.findWithFullDetails(lieuId);
      this.logger.info(`Site patrimonial créé: ${lieuId}`);
      return PatrimoineDTO.fromEntity(full);
    });
  }

  /**
   * Modifier un site patrimonial
   */
  async update(id, data) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    const { DetailLieu, Monument, Vestige, Service, LieuMedia } = this.models || {};
    const plain = existing.get ? existing.get({ plain: true }) : existing;
    const lieuId = plain.id_lieu;

    return this.repository.withTransaction(async (transaction) => {
      const updateData = {};
      if (data.nom) updateData.nom = data.nom;
      if (data.adresse) updateData.adresse = data.adresse;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.typeLieu) updateData.typeLieu = data.typeLieu;
      if (data.typePatrimoine) updateData.typePatrimoine = data.typePatrimoine;
      if (data.communeId) updateData.communeId = data.communeId;
      if (data.localiteId !== undefined) updateData.localiteId = data.localiteId;

      if (Object.keys(updateData).length > 0) {
        await existing.update(updateData, { transaction });
      }

      let detail = await DetailLieu?.findOne({ where: { id_lieu: lieuId }, transaction });
      if (data.description !== undefined || data.horaires !== undefined || data.histoire !== undefined) {
        const detailData = {};
        if (data.description !== undefined) detailData.description = data.description;
        if (data.horaires !== undefined) detailData.horaires = data.horaires;
        if (data.histoire !== undefined) detailData.histoire = data.histoire;
        if (data.referencesHistoriques !== undefined) detailData.referencesHistoriques = data.referencesHistoriques;
        if (detail) {
          await detail.update(detailData, { transaction });
        } else if (DetailLieu && Object.keys(detailData).length > 0) {
          detail = await DetailLieu.create({ id_lieu: lieuId, ...detailData }, { transaction });
        }
      }

      const detailId = detail?.id_detailLieu;

      if (Array.isArray(data.monuments) && detailId && Monument) {
        await Monument.destroy({ where: { id_detail_lieu: detailId }, transaction });
        const monumentRows = data.monuments
          .filter(m => m?.nom?.fr || m?.nom)
          .map(m => ({
            id_detail_lieu: detailId,
            nom: m.nom || { fr: '' },
            description: m.description || { fr: '' },
            type: this._normalizeMonumentType(m.type)
          }));
        if (monumentRows.length) {
          await Monument.bulkCreate(monumentRows, { transaction });
        }
      }

      if (Array.isArray(data.vestiges) && detailId && Vestige) {
        await Vestige.destroy({ where: { id_detail_lieu: detailId }, transaction });
        const vestigeRows = data.vestiges
          .filter(v => v?.nom?.fr || v?.nom)
          .map(v => ({
            id_detail_lieu: detailId,
            nom: v.nom || { fr: '' },
            description: v.description || { fr: '' },
            type: this._normalizeVestigeType(v.type)
          }));
        if (vestigeRows.length) {
          await Vestige.bulkCreate(vestigeRows, { transaction });
        }
      }

      if (Array.isArray(data.services) && Service) {
        await Service.destroy({ where: { id_lieu: lieuId }, transaction });
        const serviceRows = data.services
          .filter(s => s?.nom?.fr || s?.nom)
          .map(s => ({
            id_lieu: lieuId,
            nom: s.nom || { fr: '' },
            description: s.description || {},
            type_service: s.type_service || 'autre',
            disponible: s.disponible !== false
          }));
        if (serviceRows.length) {
          await Service.bulkCreate(serviceRows, { transaction });
        }
      }

      if (Array.isArray(data.medias) && LieuMedia) {
        await LieuMedia.destroy({ where: { id_lieu: lieuId }, transaction });
        const mediaRows = data.medias
          .filter(m => m?.url)
          .map(m => ({
            id_lieu: lieuId,
            url: m.url,
            type: m.type || 'image',
            description: m.description || {}
          }));
        if (mediaRows.length) {
          await LieuMedia.bulkCreate(mediaRows, { transaction });
        }
      }

      const updated = await this.repository.findWithFullDetails(lieuId);
      this.logger.info(`Site patrimonial modifié: ${lieuId}`);
      return PatrimoineDTO.fromEntity(updated);
    });
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
