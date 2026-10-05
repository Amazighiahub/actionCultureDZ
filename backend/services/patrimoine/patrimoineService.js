/**
 * PatrimoineService - Logique métier pour les sites patrimoniaux
 * Architecture: Controller → Service → Repository → Database
 */

const { Op } = require('sequelize');
const BaseService = require('../core/baseService');
const PatrimoineDTO = require('../../dto/patrimoine/patrimoineDTO');

/**
 * Vrai si la valeur ne contient aucun texte (null, '', {} ou objet dont toutes
 * les valeurs, même imbriquées, sont vides). Sert à ne compléter que les champs vides.
 */
function isEmptyMultilang(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') return Object.values(value).every(isEmptyMultilang);
  return false;
}

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
   * Si lieuId fourni (modération uniquement) : met à jour le lieu existant et synchronise les entités liées.
   * Si un lieu existe déjà aux mêmes coordonnées, il est réutilisé sans rien écraser :
   * seuls les champs de détail encore vides sont complétés.
   * @param {Object} data
   * @param {Object} [options]
   * @param {boolean} [options.isModerator] - admin ou modérateur (calculé par authMiddleware)
   */
  async create(data, { isModerator = false } = {}) {
    if (data.lieuId && !isModerator) {
      throw this._forbiddenError('Seule la modération peut rattacher un site à un lieu existant');
    }
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
      // true quand on a retrouvé un lieu existant par ses coordonnées :
      // ce lieu appartient à quelqu'un d'autre, on ne doit rien y détruire.
      let reusedByCoords = false;

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
        // Vérifier si un lieu avec le même nom existe dans la même commune
        const nomSearch = typeof data.nom === 'object' ? (data.nom.fr || data.nom.ar || '') : data.nom;
        if (nomSearch && data.communeId) {
          const { Sequelize } = require('sequelize');
          const existingByName = await Lieu.findOne({
            where: {
              communeId: data.communeId,
              [Op.or]: [
                Sequelize.where(Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom'), Sequelize.literal("'$.fr'")), nomSearch),
                Sequelize.where(Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom'), Sequelize.literal("'$.ar'")), nomSearch),
              ]
            },
            transaction
          });

          if (existingByName) {
            const err = new Error('Un site avec ce nom existe déjà dans cette commune');
            err.statusCode = 409;
            err.code = 'DUPLICATE_SITE';
            err.data = { existingId: existingByName.id_lieu, existingNom: existingByName.nom };
            throw err;
          }
        }

        // Vérifier aussi par coordonnées proches
        const tolerance = 0.001; // ~100 mètres
        const lat = Number(data.latitude);
        const lon = Number(data.longitude);
        let existingByCoords = null;
        if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
          existingByCoords = await Lieu.findOne({
            where: {
              latitude: { [Op.between]: [lat - tolerance, lat + tolerance] },
              longitude: { [Op.between]: [lon - tolerance, lon + tolerance] }
            },
            transaction
          });
        }

        if (existingByCoords) {
          lieuId = existingByCoords.id_lieu;
          reusedByCoords = true;
          if (!existingByCoords.typePatrimoine && data.typePatrimoine) {
            await existingByCoords.update({ typePatrimoine: data.typePatrimoine }, { transaction });
          }
        } else {
          const entityData = {
            nom: data.nom,
            adresse: data.adresse || {},
            latitude: data.latitude,
            longitude: data.longitude,
            typeLieu: data.typeLieu || 'Commune',
            typePatrimoine: data.typePatrimoine || 'monument',
            communeId: data.communeId,
            localiteId: data.localiteId || null,
            id_createur: data.id_createur || null,
            statut: (isModerator && data.statut) || 'publie'
          };
          const site = await Lieu.create(entityData, { transaction });
          lieuId = site.id_lieu;
        }
      }

      // Créer ou mettre à jour DetailLieu
      let detail = await DetailLieu?.findOne({ where: { id_lieu: lieuId }, transaction });
      const detailData = {
        description: data.description || {},
        horaires: data.horaires || {},
        histoire: data.histoire || {},
        referencesHistoriques: data.referencesHistoriques || {}
      };
      if (detail && reusedByCoords) {
        // Ne compléter que les champs vides : ne jamais écraser la fiche d'un site existant
        const fill = {};
        for (const [key, value] of Object.entries(detailData)) {
          if (isEmptyMultilang(detail[key]) && !isEmptyMultilang(value)) fill[key] = value;
        }
        if (Object.keys(fill).length > 0) await detail.update(fill, { transaction });
      } else if (detail) {
        await detail.update(detailData, { transaction });
      } else if (DetailLieu) {
        detail = await DetailLieu.create({ id_lieu: lieuId, ...detailData }, { transaction });
      }

      const detailId = detail?.id_detailLieu;

      // Site existant retrouvé par coordonnées : aucune synchronisation destructive
      if (reusedByCoords) {
        this.logger.info(`Site patrimonial existant réutilisé (coordonnées): ${lieuId}`);
        return { id_lieu: lieuId, id: lieuId, toDetailJSON: () => ({ id_lieu: lieuId, id: lieuId }) };
      }

      // Synchroniser les monuments (dédupliqués par nom+type)
      if (detailId && Monument && Array.isArray(data.monuments)) {
        await Monument.destroy({ where: { id_detail_lieu: detailId }, transaction });
        const seen = new Set();
        const monumentRows = data.monuments
          .filter(m => m?.nom?.fr || m?.nom)
          .map(m => ({
            id_detail_lieu: detailId,
            nom: m.nom || { fr: '' },
            description: m.description || { fr: '' },
            type: this._normalizeMonumentType(m.type)
          }))
          .filter(m => {
            const key = `${(typeof m.nom === 'object' ? m.nom.fr : m.nom) || ''}_${m.type}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        if (monumentRows.length) {
          await Monument.bulkCreate(monumentRows, { transaction });
        }
      }

      // Synchroniser les vestiges (dédupliqués par nom+type)
      if (detailId && Vestige && Array.isArray(data.vestiges)) {
        await Vestige.destroy({ where: { id_detail_lieu: detailId }, transaction });
        const seen = new Set();
        const vestigeRows = data.vestiges
          .filter(v => v?.nom?.fr || v?.nom)
          .map(v => ({
            id_detail_lieu: detailId,
            nom: v.nom || { fr: '' },
            description: v.description || { fr: '' },
            type: this._normalizeVestigeType(v.type)
          }))
          .filter(v => {
            const key = `${(typeof v.nom === 'object' ? v.nom.fr : v.nom) || ''}_${v.type}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        if (vestigeRows.length) {
          await Vestige.bulkCreate(vestigeRows, { transaction });
        }
      }

      // Synchroniser les services (bulkCreate)
      if (Service && Array.isArray(data.services)) {
        // Ne supprimer que les équipements du site, jamais les services appartenant à un pro
        await Service.destroy({ where: { id_lieu: lieuId, id_user: null }, transaction });
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

      this.logger.info(`Site patrimonial créé: ${lieuId}`);
      // Retourner un objet minimal depuis la mémoire pour éviter findWithFullDetails
      // (même pattern que oeuvreService : évite 4-5 requêtes séquentielles = timeout/null)
      // Le frontend n'utilise que id_lieu pour la navigation après création.
      return { id_lieu: lieuId, id: lieuId, toDetailJSON: () => ({ id_lieu: lieuId, id: lieuId }) };
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
        // Ne supprimer que les équipements du site, jamais les services appartenant à un pro
        await Service.destroy({ where: { id_lieu: lieuId, id_user: null }, transaction });
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

  // ============================================================================
  // TYPES / NOTATION / FAVORIS / MÉDIAS
  // ============================================================================

  /**
   * Liste des types de patrimoine avec compteurs
   */
  async getTypes() {
    const { fn, col } = require('sequelize');
    const { Lieu } = this.models || {};
    if (!Lieu) return [];
    const types = await Lieu.findAll({
      attributes: ['typeLieu', [fn('COUNT', col('id_lieu')), 'count']],
      group: ['typeLieu'],
      raw: true
    });
    return types.map(t => ({ value: t.typeLieu, label: t.typeLieu, count: parseInt(t.count) }));
  }

  /**
   * Noter un site patrimonial
   */
  async noter(siteId, note) {
    if (!note || note < 1 || note > 5) {
      throw this._validationError('La note doit être entre 1 et 5');
    }
    const { DetailLieu } = this.models || {};
    if (!DetailLieu) throw this._validationError('Modèle DetailLieu non disponible');

    const detailLieu = await DetailLieu.findOne({ where: { id_lieu: siteId } });
    if (!detailLieu) {
      throw this._notFoundError(siteId);
    }
    const currentNote = detailLieu.noteMoyenne || 0;
    const currentCount = detailLieu.nb_notations || 0;
    const newCount = currentCount + 1;
    const newNote = (currentNote * currentCount + note) / newCount;
    const rounded = Math.round(newNote * 10) / 10;
    await detailLieu.update({ noteMoyenne: rounded, nb_notations: newCount });
    return { noteMoyenne: rounded };
  }

  /**
   * Ajouter un site aux favoris
   */
  async ajouterFavoris(siteId, userId) {
    const { Favori } = this.models || {};
    if (!Favori) throw this._validationError('Modèle Favori non disponible');

    const [favori, created] = await Favori.findOrCreate({
      where: { id_user: userId, type_entite: 'patrimoine', id_entite: siteId },
      defaults: { id_user: userId, type_entite: 'patrimoine', id_entite: siteId }
    });
    return { favori, created };
  }

  /**
   * Retirer un site des favoris
   */
  async retirerFavoris(siteId, userId) {
    const { Favori } = this.models || {};
    if (!Favori) throw this._validationError('Modèle Favori non disponible');

    const deleted = await Favori.destroy({
      where: { id_user: userId, type_entite: 'patrimoine', id_entite: siteId }
    });
    return { deleted: deleted > 0 };
  }

  /**
   * Upload de médias pour un site
   */
  async uploadMedias(siteId, files) {
    const { Lieu, LieuMedia } = this.models || {};
    if (!Lieu || !LieuMedia) throw this._validationError('Modèles non disponibles');

    const lieu = await Lieu.findByPk(siteId);
    if (!lieu) {
      throw this._notFoundError(siteId);
    }
    if (!files || files.length === 0) {
      throw this._validationError('Aucun fichier fourni');
    }
    const medias = await Promise.all(files.map(async (file) => {
      // multer-storage-cloudinary expose file.path = URL Cloudinary securisee
      // file.filename = public_id Cloudinary (pour suppression future)
      const url = file.path || file.secure_url || file.url;
      if (!url) throw new Error(`Upload Cloudinary échoué pour ${file.originalname}`);
      const type = file.mimetype?.startsWith('image') ? 'image'
                 : file.mimetype?.startsWith('video') ? 'video'
                 : 'document';
      return LieuMedia.create({
        id_lieu: siteId,
        type,
        url,
        description: {}
      });
    }));
    return medias;
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(siteId, mediaId) {
    const { LieuMedia } = this.models || {};
    if (!LieuMedia) throw this._validationError('Modèle LieuMedia non disponible');

    const media = await LieuMedia.findOne({
      where: { id: parseInt(mediaId, 10), id_lieu: parseInt(siteId, 10) }
    });
    if (!media) {
      throw this._notFoundError(mediaId);
    }
    await media.destroy();
    return true;
  }
}

module.exports = PatrimoineService;
