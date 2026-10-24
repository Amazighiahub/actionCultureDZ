/**
 * PatrimoineService - Logique métier pour les sites patrimoniaux
 * Architecture: Controller → Service → Repository → Database
 */

const { Op } = require('sequelize');
const BaseService = require('../core/baseService');
const PatrimoineDTO = require('../../dto/patrimoine/patrimoineDTO');
const { MONUMENT_TYPES, VESTIGE_TYPES, LANGUES_AUDIO, MAX_NIVEAUX_LIEU } = require('../../constants/patrimoineTypes');
const { lireReleve, ImportReleve, resumerPlan } = require('./importReleve');
const { mergeTranslations } = require('../../helpers/i18n');

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
  static MONUMENT_TYPES = MONUMENT_TYPES;
  static VESTIGE_TYPES = VESTIGE_TYPES;

  /**
   * Normalise le type monument (type inconnu → « Autre »)
   */
  _normalizeMonumentType(type) {
    return MONUMENT_TYPES.includes(type) ? type : 'Autre';
  }

  /**
   * Normalise le type vestige (type inconnu → « Autre »)
   */
  _normalizeVestigeType(type) {
    return VESTIGE_TYPES.includes(type) ? type : 'Autre';
  }

  /**
   * Site auquel rattacher un point de visite, ou null pour un lieu principal.
   * Refuse un site inexistant, un arbre trop profond, et (en modification) une boucle
   * où un lieu deviendrait le point de l'un de ses propres points.
   * @param {number|string|null} idParent
   * @param {Object} [options]
   * @param {number} [options.idLieu] - lieu modifié (contrôle de boucle)
   */
  async _resolveParent(idParent, { idLieu } = {}) {
    if (idParent === undefined || idParent === null || idParent === '') return null;
    const id = parseInt(idParent, 10);
    if (!Number.isInteger(id) || id <= 0) {
      throw this._validationError('Site parent invalide');
    }
    if (idLieu && id === idLieu) {
      throw this._validationError('Un lieu ne peut pas être un point de lui-même');
    }
    const parent = await this.models.Lieu.findByPk(id);
    if (!parent) {
      throw this._validationError('Le site parent n\'existe pas');
    }
    const ancetres = await this.repository.findAncetres(parent.id_lieu_parent);
    if (idLieu && ancetres.some(a => a.id_lieu === idLieu)) {
      throw this._validationError('Ce rattachement créerait une boucle entre les lieux');
    }
    // ancêtres + site parent + le point lui-même
    if (ancetres.length + 2 > MAX_NIVEAUX_LIEU) {
      throw this._validationError(`Un site ne peut pas dépasser ${MAX_NIVEAUX_LIEU} niveaux (site › point › sous-point…)`);
    }
    return parent;
  }

  /**
   * Ordre d'un nouveau point : celui demandé, sinon à la suite des points du site
   */
  async _ordreVisite(ordre, idParent, transaction) {
    const demande = parseInt(ordre, 10);
    if (Number.isInteger(demande) && demande >= 0) return demande;
    const max = await this.models.Lieu.max('ordre_visite', { where: { id_lieu_parent: idParent }, transaction });
    return (Number(max) || 0) + 1;
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
    // Point de visite : sans position propre (salle d'un musée…), il reprend celle du site,
    // et il est toujours dans la commune du site
    const parent = await this._resolveParent(data.id_lieu_parent);
    if (parent) {
      const sansPosition = !data.latitude && !data.longitude;
      data = {
        ...data,
        latitude: sansPosition ? parent.latitude : data.latitude,
        longitude: sansPosition ? parent.longitude : data.longitude,
        communeId: data.communeId || parent.communeId,
        localiteId: data.localiteId !== undefined ? data.localiteId : parent.localiteId
      };
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
          // Un point n'est comparé qu'aux autres points du même site (« Salle 1 » existe
          // dans plusieurs musées d'une même commune) ; un site, qu'aux autres sites
          const existingByName = await Lieu.findOne({
            where: {
              communeId: data.communeId,
              id_lieu_parent: parent ? parent.id_lieu : null,
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

        // Vérifier aussi par coordonnées proches — sauf pour un point de visite :
        // l'Arc de Trajan est à moins de 100 m de Timgad, ce n'est pas un doublon
        const tolerance = 0.001; // ~100 mètres
        const lat = Number(data.latitude);
        const lon = Number(data.longitude);
        let existingByCoords = null;
        if (!parent && Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
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
            statut: (isModerator && data.statut) || 'publie',
            id_lieu_parent: parent ? parent.id_lieu : null,
            ordre_visite: parent ? await this._ordreVisite(data.ordre_visite, parent.id_lieu, transaction) : null,
            repere: parent && !isEmptyMultilang(data.repere) ? data.repere : null
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
   * Droit de modifier un site (fiche, photos, audios) : la modération, ou le compte qui l'a créé.
   * Un point de visite est aussi modifiable par le créateur de son site.
   * @returns {Promise<boolean>}
   */
  async peutModifier(siteId, { userId, isModerator = false } = {}) {
    if (isModerator) return true;
    const { Lieu } = this.models || {};
    const site = await Lieu.findByPk(siteId, { attributes: ['id_lieu', 'id_createur', 'id_lieu_parent'] });
    if (!site) throw this._notFoundError(siteId);
    if (userId && site.id_createur === userId) return true;
    if (userId && site.id_lieu_parent) {
      const parent = await Lieu.findByPk(site.id_lieu_parent, { attributes: ['id_createur'] });
      return !!parent && parent.id_createur === userId;
    }
    return false;
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
      // Champs multilingues fusionnés : envoyer le français seul n'efface plus l'arabe
      if (data.nom) updateData.nom = mergeTranslations(plain.nom, data.nom);
      if (data.adresse) updateData.adresse = mergeTranslations(plain.adresse, data.adresse);
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.typeLieu) updateData.typeLieu = data.typeLieu;
      if (data.typePatrimoine) updateData.typePatrimoine = data.typePatrimoine;
      if (data.communeId) updateData.communeId = data.communeId;
      if (data.localiteId !== undefined) updateData.localiteId = data.localiteId;
      if (data.id_lieu_parent !== undefined) {
        const parent = await this._resolveParent(data.id_lieu_parent, { idLieu: lieuId });
        updateData.id_lieu_parent = parent ? parent.id_lieu : null;
        // Un lieu qui devient point de visite d'un autre site prend place à la fin de la visite ;
        // détaché, il redevient un lieu principal (sans ordre de visite)
        if (data.ordre_visite === undefined && updateData.id_lieu_parent !== (plain.id_lieu_parent ?? null)) {
          updateData.ordre_visite = parent ? await this._ordreVisite(undefined, parent.id_lieu, transaction) : null;
        }
      }
      if (data.ordre_visite !== undefined) {
        const ordre = parseInt(data.ordre_visite, 10);
        updateData.ordre_visite = Number.isInteger(ordre) && ordre >= 0 ? ordre : null;
      }
      if (data.repere !== undefined) updateData.repere = isEmptyMultilang(data.repere) ? null : data.repere;

      if (Object.keys(updateData).length > 0) {
        await existing.update(updateData, { transaction });
      }

      let detail = await DetailLieu?.findOne({ where: { id_lieu: lieuId }, transaction });
      const champsFiche = ['description', 'horaires', 'histoire', 'referencesHistoriques'];
      if (champsFiche.some(champ => data[champ] !== undefined)) {
        const detailData = {};
        for (const champ of champsFiche) {
          if (data[champ] !== undefined) detailData[champ] = mergeTranslations(detail?.[champ], data[champ]);
        }
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
   * Types de patrimoine des sites publics (filtres de la page Patrimoine), avec compteurs.
   * Regroupe par typePatrimoine (musée, site archéologique…), pas par division administrative,
   * et ne compte que les lieux principaux publiés : les points de visite restent sur la fiche du site.
   */
  async getTypes() {
    const { fn, col } = require('sequelize');
    const { Lieu } = this.models || {};
    if (!Lieu) return [];
    const types = await Lieu.findAll({
      attributes: ['typePatrimoine', [fn('COUNT', col('id_lieu')), 'count']],
      where: { statut: 'publie', id_lieu_parent: null },
      group: ['typePatrimoine'],
      raw: true
    });
    return types.map(t => ({ value: t.typePatrimoine, label: t.typePatrimoine, count: parseInt(t.count, 10) }));
  }

  /**
   * Noter un site patrimonial
   */
  /**
   * Note un site (1 à 5). Une note par utilisateur : un nouveau vote remplace le précédent,
   * et la moyenne est recalculée à partir des votes enregistrés.
   */
  async noter(siteId, note, userId) {
    const value = parseInt(note, 10);
    if (!value || value < 1 || value > 5) {
      throw this._validationError('La note doit être entre 1 et 5');
    }
    const { DetailLieu, LieuNotation } = this.models || {};
    if (!DetailLieu || !LieuNotation) throw this._validationError('Modèles de notation non disponibles');

    return this.repository.withTransaction(async (transaction) => {
      const detailLieu = await DetailLieu.findOne({ where: { id_lieu: siteId }, transaction });
      if (!detailLieu) {
        throw this._notFoundError(siteId);
      }

      const existing = await LieuNotation.findOne({ where: { id_lieu: siteId, id_user: userId }, transaction });
      if (existing) {
        await existing.update({ note: value }, { transaction });
      } else {
        await LieuNotation.create({ id_lieu: siteId, id_user: userId, note: value }, { transaction });
      }

      const { fn, col } = require('sequelize');
      const stats = await LieuNotation.findOne({
        attributes: [[fn('AVG', col('note')), 'moyenne'], [fn('COUNT', col('id_lieu_notation')), 'total']],
        where: { id_lieu: siteId },
        raw: true,
        transaction
      });
      const rounded = Math.round(Number(stats?.moyenne || 0) * 10) / 10;
      const total = Number(stats?.total || 0);
      await detailLieu.update({ noteMoyenne: rounded, nb_notations: total }, { transaction });
      return { noteMoyenne: rounded, nb_notations: total, maNote: value };
    });
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
   * @param {number} siteId
   * @param {Array} files
   * @param {Object} [options]
   * @param {string} [options.langue] - langue des enregistrements audio envoyés
   */
  async uploadMedias(siteId, files, { langue } = {}) {
    const { Lieu, LieuMedia } = this.models || {};
    if (!Lieu || !LieuMedia) throw this._validationError('Modèles non disponibles');

    const lieu = await Lieu.findByPk(siteId);
    if (!lieu) {
      throw this._notFoundError(siteId);
    }
    if (!files || files.length === 0) {
      throw this._validationError('Aucun fichier fourni');
    }
    if (langue && !LANGUES_AUDIO.includes(langue)) {
      throw this._validationError('Langue de l\'enregistrement invalide');
    }
    const medias = await Promise.all(files.map(async (file) => {
      // multer-storage-cloudinary expose file.path = URL Cloudinary securisee
      // file.filename = public_id Cloudinary (pour suppression future)
      const url = file.path || file.secure_url || file.url;
      if (!url) throw new Error(`Upload Cloudinary échoué pour ${file.originalname}`);
      // Un .m4a de téléphone Android a l'en-tête d'un MP4 vidéo : l'extension d'origine tranche
      const nomAudio = /\.(m4a|mp3|wav|ogg|aac)$/i.test(file.originalname || '');
      const type = file.mimetype?.startsWith('image') ? 'image'
                 : file.mimetype?.startsWith('audio') || (nomAudio && file.mimetype === 'video/mp4') ? 'audio'
                 : file.mimetype?.startsWith('video') ? 'video'
                 : 'document';
      return LieuMedia.create({
        id_lieu: siteId,
        type,
        url,
        // La langue ne concerne que l'audio (guide, conte, prononciation)
        langue: type === 'audio' ? (langue || null) : null,
        description: {}
      });
    }));
    return medias;
  }

  /**
   * Réordonne les points de visite d'un site. Réservé à la modération et au créateur du site.
   * @param {number} siteId
   * @param {number[]} ids - tous les points du site, dans le nouvel ordre
   */
  async reordonnerPoints(siteId, ids, { userId, isModerator = false } = {}) {
    const { Lieu } = this.models || {};
    const site = await Lieu.findByPk(siteId, { attributes: ['id_lieu', 'id_createur'] });
    if (!site) throw this._notFoundError(siteId);
    if (!isModerator && site.id_createur !== userId) {
      throw this._forbiddenError('Seuls le créateur du site et la modération peuvent changer l\'ordre de visite');
    }
    const ordre = Array.isArray(ids) ? ids.map(id => parseInt(id, 10)) : [];
    if (ordre.length === 0 || ordre.some(id => !Number.isInteger(id)) || new Set(ordre).size !== ordre.length) {
      throw this._validationError('Liste de points invalide');
    }
    const points = await Lieu.findAll({ where: { id_lieu_parent: siteId }, attributes: ['id_lieu'] });
    const attendus = new Set(points.map(p => p.id_lieu));
    if (ordre.length !== attendus.size || ordre.some(id => !attendus.has(id))) {
      throw this._validationError('La liste doit contenir exactement les points de ce site');
    }
    await this.repository.withTransaction(async (transaction) => {
      for (const [index, id] of ordre.entries()) {
        await Lieu.update({ ordre_visite: index + 1 }, { where: { id_lieu: id, id_lieu_parent: siteId }, transaction });
      }
    });
    return this.repository.findPointsDuSite(siteId);
  }

  /**
   * Relevé Excel de points de visite (modèle Taladz) : aperçu, rien n'est écrit.
   * @param {Buffer} fichier - classeur .xlsx
   * @param {object} [opts]
   * @param {number} [opts.parentId] - lieu choisi ; sinon celui de la feuille « Site »
   */
  async apercuReleve(fichier, { parentId } = {}) {
    const { plan } = await this._planReleve(fichier, parentId);
    return resumerPlan(plan);
  }

  /**
   * Importe un relevé Excel (création du lieu de la feuille « Site » si besoin).
   * @param {Buffer} fichier - classeur .xlsx
   * @param {object} [opts]
   * @param {number} [opts.parentId]
   * @param {number} [opts.userId] - auteur d'un lieu créé depuis la feuille « Site »
   */
  async importerReleve(fichier, { parentId, userId } = {}) {
    const { importeur, plan } = await this._planReleve(fichier, parentId);
    if (plan.erreurs.length) throw this._validationError(plan.erreurs.join(' ; '));
    const bilan = await importeur.executer(plan, { createurId: userId || null });
    this.logger.info(`Relevé Excel importé sur le lieu ${bilan.idLieu} : ${bilan.crees} créés, ${bilan.maj} mis à jour`);
    return bilan;
  }

  async _planReleve(fichier, parentId) {
    let releve;
    try {
      releve = await lireReleve(fichier);
    } catch (error) {
      // Classeur illisible ou colonne obligatoire absente : message pour l'utilisateur
      throw this._validationError(/introuvable|vide/.test(error.message) ? error.message : 'Fichier Excel illisible');
    }
    const importeur = new ImportReleve(this.models, this);
    const plan = await importeur.planifier(releve, { parentId });
    return { importeur, plan };
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
