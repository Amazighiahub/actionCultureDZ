/**
 * ArtisanatService - Logique métier pour l'artisanat
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const ArtisanatDTO = require('../../dto/artisanat/artisanatDTO');
const BaseDTO = require('../../dto/baseDTO');
const { mergeTranslations } = require('../../helpers/i18n');
const { peutGerer } = require('../../utils/droits');

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

  /** Type d'œuvre « Artisanat » (voir subtypeRegistry) */
  static TYPE_OEUVRE_ARTISANAT = 7;

  /**
   * Créer un artisanat.
   * - avec id_oeuvre : rattache la fiche à une œuvre existante de l'utilisateur
   * - sans id_oeuvre (formulaire « Ajouter un artisanat ») : crée l'œuvre parente puis la fiche,
   *   et la soumet à la modération. Auparavant ce cas était refusé : le formulaire ne pouvait
   *   rien créer (« L'ID de l'oeuvre parente est requis »).
   */
  async create(data, userId, isAdmin = false) {
    if (!data.id_oeuvre && !data.oeuvreId) {
      return this._createAvecOeuvre(data, userId);
    }

    // L'œuvre parente doit appartenir à l'utilisateur (sinon il se rattacherait à
    // l'œuvre d'un autre, qui en deviendrait responsable) et n'avoir qu'un artisanat
    const oeuvreId = parseInt(data.id_oeuvre || data.oeuvreId, 10);
    if (this.models?.Oeuvre) {
      const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId, { attributes: ['id_oeuvre', 'saisi_par'] });
      if (!oeuvre) throw this._notFoundError(oeuvreId);
      if (!peutGerer(oeuvre.saisi_par, { userId, isModerator: isAdmin })) {
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
   * Crée l'œuvre parente (type Artisanat) et sa fiche via OeuvreService, qui gère la
   * transaction, les mots-clés et la protection contre le double envoi, puis la soumet
   * à la modération (statut « en attente »).
   */
  async _createAvecOeuvre(data, userId) {
    const container = require('../serviceContainer');
    const oeuvreService = container.oeuvreService;

    // Langue d'origine obligatoire pour une œuvre : celle fournie, sinon le français
    let idLangue = parseInt(data.id_langue, 10) || null;
    if (!idLangue && this.models?.Langue) {
      const langue = await this.models.Langue.findOne({ where: { code: 'fr' }, attributes: ['id_langue'] })
        || await this.models.Langue.findOne({ attributes: ['id_langue'], order: [['id_langue', 'ASC']] });
      idLangue = langue?.id_langue || null;
    }

    const prix = data.prix ?? data.prix_min;
    const { oeuvre } = await oeuvreService.create({
      titre: data.nom ?? data.titre,
      description: data.description,
      id_type_oeuvre: ArtisanatService.TYPE_OEUVRE_ARTISANAT,
      id_langue: idLangue,
      tags: data.tags,
      details_specifiques: {
        artisanat: {
          id_materiau: data.id_materiau || data.materiauId || null,
          id_technique: data.id_technique || data.techniqueId || null,
          dimensions: data.dimensions || null,
          poids: data.poids ?? null,
          prix: prix === '' || prix === undefined ? null : prix,
          prix_max: data.prix_max ?? null,
          delai_fabrication: data.delai_fabrication ?? null,
          en_stock: data.en_stock ?? null,
          sur_commande: data.sur_commande
        }
      }
    }, userId);

    const oeuvreId = oeuvre.id_oeuvre ?? oeuvre.id;
    await oeuvreService.submitForValidation(oeuvreId, userId);

    const fiche = await this.models.Artisanat.findOne({ where: { id_oeuvre: oeuvreId }, attributes: ['id_artisanat'] });
    const full = await this.repository.findWithFullDetails(fiche.id_artisanat);
    this.logger.info(`Artisanat créé avec son œuvre: ${fiche.id_artisanat} (œuvre ${oeuvreId}) par user: ${userId}`);
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
    if (!peutGerer(ownerId, { userId, isModerator: isAdmin })) {
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
    else if (data.prix_min !== undefined) updateData.prix = data.prix_min === '' ? null : data.prix_min;
    for (const champ of ['prix_max', 'delai_fabrication', 'en_stock']) {
      if (data[champ] !== undefined) updateData[champ] = data[champ] === '' ? null : data[champ];
    }
    if (data.sur_commande !== undefined) updateData.sur_commande = !!data.sur_commande;

    await this.repository.update(id, updateData);

    // Nom et description sont portés par l'œuvre parente : sans cela, les modifier
    // depuis le formulaire n'avait aucun effet
    const oeuvreData = {};
    // Fusion des langues : une langue laissée vide ne remplace pas la traduction existante
    if (data.nom !== undefined || data.titre !== undefined) oeuvreData.titre = mergeTranslations(existing.Oeuvre?.titre, BaseDTO.normalizeMultilang(data.nom ?? data.titre));
    if (data.description !== undefined) oeuvreData.description = mergeTranslations(existing.Oeuvre?.description, BaseDTO.normalizeMultilang(data.description));
    if (Object.keys(oeuvreData).length && existing.id_oeuvre && this.models?.Oeuvre) {
      await this.models.Oeuvre.update(oeuvreData, { where: { id_oeuvre: existing.id_oeuvre } });
    }
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Artisanat modifié: ${id} par user: ${userId}`);
    return ArtisanatDTO.fromEntity(updated);
  }

  /**
   * Fiche de son propriétaire (ou de l'administration) ; sinon erreur. Sert aux photos.
   */
  async verifierProprietaire(id, userId, isAdmin = false) {
    const existing = await this.repository.findById(id);
    if (!existing) throw this._notFoundError(id);
    const ownerId = existing.Oeuvre?.saisi_par ?? existing.Oeuvre?.id_createur;
    if (!peutGerer(ownerId, { userId, isModerator: isAdmin })) {
      throw this._forbiddenError('Vous ne pouvez pas modifier cet artisanat');
    }
    return existing;
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
    if (!peutGerer(ownerId, { userId, isModerator: isAdmin })) {
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
