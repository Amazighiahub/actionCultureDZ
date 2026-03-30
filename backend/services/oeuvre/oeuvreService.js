/**
 * OeuvreService - Service complet pour la gestion des œuvres
 *
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const OeuvreDTO = require('../../dto/oeuvre/oeuvreDTO');
const CreateOeuvreDTO = require('../../dto/oeuvre/createOeuvreDTO');
const UpdateOeuvreDTO = require('../../dto/oeuvre/updateOeuvreDTO');
const CacheManager = require('../../utils/CacheManager');
const { subtypeRegistry, initSubtypeServices } = require('./subtypes');

class OeuvreService extends BaseService {
  constructor(oeuvreRepository, options = {}) {
    super(oeuvreRepository, options);
    this.cache = CacheManager.create({
      namespace: 'oeuvres',
      defaultTTL: 3 * 60 * 1000, // 3 min pour les listes
      maxSize: 80
    });
    this.subtypeRegistry = subtypeRegistry;

    // Initialiser les sub-services avec les modèles Sequelize
    if (this.models) {
      initSubtypeServices(this.models);
    }
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Récupère toutes les œuvres avec pagination
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll(options);

    return {
      data: OeuvreDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les œuvres publiées
   */
  async findPublished(options = {}) {
    const cacheKey = `published:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findPublished(options);
      return {
        data: OeuvreDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Récupère une œuvre par ID
   */
  async findById(id, options = {}) {
    const oeuvre = await this.repository.findById(id, options);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }
    return OeuvreDTO.fromEntity(oeuvre);
  }

  /**
   * Récupère une œuvre avec tous ses détails
   */
  async findWithFullDetails(id) {
    const oeuvre = await this.repository.findWithFullDetails(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    // Incrémenter les vues (non-bloquant)
    try { await this.repository.incrementViews(id); } catch (e) { /* colonne nb_vues peut ne pas exister */ }

    return OeuvreDTO.fromEntity(oeuvre);
  }

  /**
   * Récupère les œuvres d'un créateur
   */
  async findByCreator(userId, options = {}) {
    const result = await this.repository.findByCreator(userId, options);

    return {
      data: OeuvreDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les œuvres par type
   */
  async findByType(typeOeuvreId, options = {}) {
    const result = await this.repository.findByType(typeOeuvreId, options);

    return {
      data: OeuvreDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les œuvres par catégorie
   */
  async findByCategory(categoryId, options = {}) {
    const result = await this.repository.findByCategory(categoryId, options);

    return {
      data: OeuvreDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Recherche avancée d'œuvres
   */
  async searchAdvanced(params = {}) {
    const result = await this.repository.searchAdvanced(params);

    return {
      data: OeuvreDTO.fromEntities(result.data || result),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les œuvres populaires
   */
  async findPopular(limit = 10) {
    return this.cache.getOrSet(`popular:${limit}`, async () => {
      const oeuvres = await this.repository.findPopular(limit);
      return OeuvreDTO.fromEntities(oeuvres);
    }, 5 * 60 * 1000); // 5 min — classement stable
  }

  /**
   * Récupère les œuvres récentes
   */
  async findRecent(limit = 10) {
    return this.cache.getOrSet(`recent:${limit}`, async () => {
      const oeuvres = await this.repository.findRecent(limit);
      return OeuvreDTO.fromEntities(oeuvres);
    }, 5 * 60 * 1000);
  }

  /**
   * Récupère les œuvres similaires
   */
  async findSimilar(oeuvreId, limit = 5) {
    const oeuvres = await this.repository.findSimilar(oeuvreId, limit);
    return OeuvreDTO.fromEntities(oeuvres);
  }

  // ============================================================================
  // CRÉATION / MODIFICATION
  // ============================================================================

  /**
   * Crée une nouvelle œuvre
   */
  async create(requestBody, userId) {
    // 1. Transformer en DTO
    const createDTO = CreateOeuvreDTO.fromRequest(requestBody, userId);

    // 2. Valider
    const validation = createDTO.validate();
    if (!validation.valid) {
      throw this._validationError('Données invalides', validation.errors);
    }

    // 3. Vérifier que le type existe
    if (this.models?.TypeOeuvre) {
      const typeExists = await this.models.TypeOeuvre.findByPk(createDTO.idTypeOeuvre);
      if (!typeExists) {
        throw this._validationError('Type d\'œuvre invalide');
      }
    }

    // 3b. Vérifier les doublons potentiels (titre + type + langue)
    const titreFr = createDTO.titre?.fr;
    const titreAr = createDTO.titre?.ar;
    if (titreFr || titreAr) {
      const { Op } = require('sequelize');
      const where = {
        id_type_oeuvre: createDTO.idTypeOeuvre,
        ...(createDTO.idLangue ? { id_langue: createDTO.idLangue } : {})
      };
      const existing = await this.repository.model.findOne({ where });
      if (existing) {
        const existingTitre = existing.titre || {};
        if ((titreFr && existingTitre.fr === titreFr) || (titreAr && existingTitre.ar === titreAr)) {
          this.logger.warn(`Doublon potentiel détecté: titre="${titreFr || titreAr}", type=${createDTO.idTypeOeuvre}`);
        }
      }
    }

    const detailsSpecifiques = requestBody.details_specifiques || {};
    const idTypeOeuvre = createDTO.idTypeOeuvre;

    // 4. Créer l'œuvre dans une transaction
    const result = await this.withTransaction(async (transaction) => {
      // Créer l'œuvre
      const entityData = createDTO.toEntity();
      const newOeuvre = await this.repository.create(entityData, { transaction });

      // Associer les catégories
      const categoryIds = createDTO.getCategoryIds();
      if (categoryIds.length > 0 && this.models?.OeuvreCategorie) {
        await this._associateCategories(newOeuvre.id_oeuvre, categoryIds, transaction);
      }

      // Associer les tags
      const tagIds = await this._resolveTagIds(createDTO.getTags(), transaction);
      if (tagIds.length > 0 && this.models?.OeuvreTag) {
        await this._associateTags(newOeuvre.id_oeuvre, tagIds, transaction);
      }

      // Créer le sous-type via le registre centralisé
      let subtypeRecord = null;
      const subService = this.subtypeRegistry.getService(idTypeOeuvre);
      if (subService) {
        const detailsKey = this.subtypeRegistry.getDetailsKey(idTypeOeuvre);
        const ds = detailsSpecifiques[detailsKey] || {};
        subtypeRecord = await subService.createForOeuvre(newOeuvre.id_oeuvre, ds, transaction);
      }

      // Associer les intervenants (auteurs/contributeurs)
      await this._associateIntervenants(newOeuvre.id_oeuvre, requestBody, transaction);

      // Associer les éditeurs
      await this._associateEditeurs(newOeuvre.id_oeuvre, requestBody.editeurs, transaction);

      return { oeuvre: newOeuvre, subtypeRecord };
    });

    const { oeuvre, subtypeRecord } = result;
    this.cache.invalidate();
    this.logger.info(`Œuvre créée: ${oeuvre.id_oeuvre} par utilisateur: ${userId}`);

    // 5. Retourner l'œuvre complète et l'enregistrement sous-type
    const oeuvreFull = await this.findWithFullDetails(oeuvre.id_oeuvre);
    return {
      oeuvre: oeuvreFull,
      subtype: subtypeRecord ? subtypeRecord.get({ plain: true }) : null
    };
  }

  /**
   * Met à jour une œuvre
   * @param {number} id - ID de l'œuvre
   * @param {Object} requestBody - Données à mettre à jour
   * @param {number} userId - ID de l'utilisateur (créateur ou admin)
   * @param {boolean} [isAdmin] - Si l'utilisateur est admin (rôle Administrateur ou id_type_user 29)
   */
  async update(id, requestBody, userId, isAdmin = false) {
    // 1. Vérifier que l'œuvre existe
    const existingOeuvre = await this.repository.findById(id);
    if (!existingOeuvre) {
      throw this._notFoundError(id);
    }

    // 2. Vérifier les permissions (owner ou admin via rôle "Administrateur" / id_type_user 29)
    const ownerId = existingOeuvre.saisi_par ?? existingOeuvre.id_createur;
    if (ownerId !== userId && !isAdmin) {
      throw this._forbiddenError('Vous ne pouvez pas modifier cette œuvre');
    }

    // 3. Transformer en DTO
    const updateDTO = UpdateOeuvreDTO.fromRequest(requestBody);

    // 4. Vérifier s'il y a des modifications
    if (!updateDTO.hasChanges()) {
      throw this._validationError('Aucune modification fournie');
    }

    // 5. Valider
    const validation = updateDTO.validate();
    if (!validation.valid) {
      throw this._validationError('Données invalides', validation.errors);
    }

    // 6. Fusionner avec les données existantes (pour les champs multilingues)
    updateDTO.mergeWithExisting(existingOeuvre);

    // 7. Mettre à jour dans une transaction
    await this.withTransaction(async (transaction) => {
      // Mettre à jour l'œuvre
      const entityData = updateDTO.toEntity();
      await this.repository.update(id, entityData, { transaction });

      // Mettre à jour les catégories si fournies
      const categoryIds = updateDTO.getCategoryIds();
      if (categoryIds !== null && this.models?.OeuvreCategorie) {
        await this._syncCategories(id, categoryIds, transaction);
      }

      // Mettre à jour les tags si fournis
      const tagIds = await this._resolveTagIds(updateDTO.getTags(), transaction);
      if (tagIds !== null && this.models?.OeuvreTag) {
        await this._syncTags(id, tagIds, transaction);
      }

      // Mettre à jour le sous-type si details_specifiques fourni
      const detailsSpecifiques = requestBody.details_specifiques;
      if (detailsSpecifiques) {
        const idTypeOeuvre = existingOeuvre.id_type_oeuvre;
        const subService = this.subtypeRegistry.getService(idTypeOeuvre);
        if (subService) {
          const detailsKey = this.subtypeRegistry.getDetailsKey(idTypeOeuvre);
          const ds = detailsSpecifiques[detailsKey] || detailsSpecifiques;
          await subService.updateForOeuvre(id, ds, transaction);
        }
      }
    });

    this.cache.invalidate();
    this.logger.info(`Œuvre mise à jour: ${id} par utilisateur: ${userId}`);

    // 8. Retourner l'œuvre mise à jour
    return this.findWithFullDetails(id);
  }

  /**
   * Supprime une œuvre
   * @param {number} id - ID de l'œuvre
   * @param {number} userId - ID de l'utilisateur (créateur ou admin)
   * @param {boolean} [isAdmin] - Si l'utilisateur est admin (rôle Administrateur ou id_type_user 29)
   */
  async delete(id, userId, isAdmin = false) {
    // 1. Vérifier que l'œuvre existe
    const oeuvre = await this.repository.findById(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    // 2. Vérifier les permissions : propriétaire ou admin (rôle Administrateur)
    const ownerId = oeuvre.saisi_par ?? oeuvre.id_createur;
    if (ownerId !== userId && !isAdmin) {
      throw this._forbiddenError('Vous ne pouvez pas supprimer cette œuvre');
    }

    // 3. Nettoyer les ArticleBlocks orphelins (association polymorphique sans FK)
    const article = await this.models.Article?.findOne({ where: { id_oeuvre: id }, attributes: ['id_article'] });
    const articleSci = await this.models.ArticleScientifique?.findOne({ where: { id_oeuvre: id }, attributes: ['id_article_scientifique'] });

    if (article) {
      await this.models.ArticleBlock.destroy({ where: { id_article: article.id_article, article_type: 'article' } });
    }
    if (articleSci) {
      await this.models.ArticleBlock.destroy({ where: { id_article: articleSci.id_article_scientifique, article_type: 'article_scientifique' } });
    }

    // 4. Supprimer (les autres relations seront supprimées en cascade)
    await this.repository.delete(id);

    this.cache.invalidate();
    this.logger.info(`Œuvre supprimée: ${id} par utilisateur: ${userId}`);

    return true;
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Récupère les œuvres en attente de validation
   */
  async findPending(options = {}) {
    const result = await this.repository.findPending(options);

    return {
      data: OeuvreDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Soumet une œuvre pour validation
   */
  async submitForValidation(id, userId) {
    const oeuvre = await this.repository.findById(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    const ownerId = oeuvre.saisi_par ?? oeuvre.id_createur;
    if (ownerId !== userId) {
      throw this._forbiddenError('Vous ne pouvez pas soumettre cette œuvre');
    }

    if (oeuvre.statut !== 'brouillon') {
      throw this._conflictError('Seules les œuvres en brouillon peuvent être soumises');
    }

    const updated = await this.repository.update(id, {
      statut: 'en_attente',
      date_soumission: new Date()
    });

    this.logger.info(`Œuvre soumise pour validation: ${id}`);

    return OeuvreDTO.fromEntity(updated);
  }

  /**
   * Valide une œuvre
   */
  async validate(id, validatorId) {
    const oeuvre = await this.repository.findById(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    if (oeuvre.statut !== 'en_attente') {
      throw this._conflictError('Cette œuvre n\'est pas en attente de validation');
    }

    const updated = await this.repository.validate(id, validatorId);

    this.cache.invalidate();
    this.logger.info(`Œuvre validée: ${id} par: ${validatorId}`);

    // TODO: Envoyer notification au créateur

    return OeuvreDTO.fromEntity(updated);
  }

  /**
   * Refuse une œuvre
   */
  async reject(id, validatorId, motif) {
    const oeuvre = await this.repository.findById(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de refus est requis');
    }

    if (oeuvre.statut !== 'en_attente') {
      throw this._conflictError('Cette œuvre n\'est pas en attente de validation');
    }

    const updated = await this.repository.reject(id, validatorId, motif);

    this.cache.invalidate();
    this.logger.info(`Œuvre refusée: ${id} par: ${validatorId}`);

    // TODO: Envoyer notification au créateur

    return OeuvreDTO.fromEntity(updated);
  }

  /**
   * Met en avant une œuvre
   */
  async setFeatured(id, featured = true) {
    const oeuvre = await this.repository.findById(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    const updated = await this.repository.update(id, {
      est_mis_en_avant: featured
    });

    this.cache.invalidate();
    this.logger.info(`Œuvre ${featured ? 'mise en avant' : 'retirée de la mise en avant'}: ${id}`);

    return OeuvreDTO.fromEntity(updated);
  }

  // ============================================================================
  // STATISTIQUES
  // ============================================================================

  /**
   * Récupère les statistiques des œuvres
   */
  async getStats() {
    return this.cache.getOrSet('stats', () => this.repository.getStats(), 5 * 60 * 1000);
  }

  /**
   * Statistiques publiques des œuvres
   */
  async getPublicStats() {
    return this.cache.getOrSet('public_stats', () => this.repository.getStats(), 5 * 60 * 1000);
  }

  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================

  /**
   * Associe des catégories à une œuvre
   * @private
   */
  async _associateCategories(oeuvreId, categoryIds, transaction) {
    const records = categoryIds.map(categoryId => ({
      id_oeuvre: oeuvreId,
      id_categorie: categoryId
    }));

    await this.models.OeuvreCategorie.bulkCreate(records, {
      transaction,
      ignoreDuplicates: true
    });
  }

  /**
   * Synchronise les catégories (remplace toutes)
   * @private
   */
  async _syncCategories(oeuvreId, categoryIds, transaction) {
    // Supprimer les anciennes associations
    await this.models.OeuvreCategorie.destroy({
      where: { id_oeuvre: oeuvreId },
      transaction
    });

    // Créer les nouvelles
    if (categoryIds.length > 0) {
      await this._associateCategories(oeuvreId, categoryIds, transaction);
    }
  }

  /**
   * Associe des tags à une œuvre
   * @private
   */
  async _associateTags(oeuvreId, tagIds, transaction) {
    const records = tagIds.map(tagId => ({
      id_oeuvre: oeuvreId,
      id_tag: tagId
    }));

    await this.models.OeuvreTag.bulkCreate(records, {
      transaction,
      ignoreDuplicates: true
    });
  }

  /**
   * Synchronise les tags (remplace tous)
   * @private
   */
  async _syncTags(oeuvreId, tagIds, transaction) {
    await this.models.OeuvreTag.destroy({
      where: { id_oeuvre: oeuvreId },
      transaction
    });

    if (tagIds.length > 0) {
      await this._associateTags(oeuvreId, tagIds, transaction);
    }
  }

  /**
   * Résout des tags envoyés sous forme d'IDs ou de noms multilingues
   * @private
   */
  async _resolveTagIds(tags, transaction) {
    if (tags == null) return null;
    if (!Array.isArray(tags) || tags.length === 0 || !this.models?.TagMotCle) return [];

    const resolvedIds = [];
    const existingTags = await this.models.TagMotCle.findAll({ transaction });

    for (const tag of tags) {
      const numericTagId = Number(tag);
      if (Number.isInteger(numericTagId) && numericTagId > 0) {
        resolvedIds.push(numericTagId);
        continue;
      }

      if (typeof tag !== 'string') {
        continue;
      }

      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) {
        continue;
      }

      const existingTag = existingTags.find((tagRecord) => {
        const tagNames = Object.values(tagRecord.nom || {})
          .filter(value => typeof value === 'string')
          .map(value => value.trim().toLowerCase())
          .filter(Boolean);
        return tagNames.includes(normalizedTag);
      });

      if (existingTag) {
        resolvedIds.push(existingTag.id_tag);
        continue;
      }

      const createdTag = await this.models.TagMotCle.create({
        nom: { fr: tag.trim() }
      }, { transaction });

      existingTags.push(createdTag);
      resolvedIds.push(createdTag.id_tag);
    }

    return [...new Set(resolvedIds)];
  }

  /**
   * Associe les intervenants (auteurs/contributeurs) à une oeuvre
   * Gère 3 sources : utilisateurs inscrits, intervenants existants, nouveaux intervenants
   * @private
   */
  async _associateIntervenants(oeuvreId, requestBody, transaction) {
    if (!this.models?.OeuvreIntervenant) return;

    const records = [];

    // 1. Intervenants existants (déjà dans la table intervenant)
    const intervenantsExistants = requestBody.intervenants_non_inscrits || requestBody.intervenants_existants || [];
    for (const interv of intervenantsExistants) {
      if (interv.id_intervenant && interv.id_type_user) {
        records.push({
          id_oeuvre: oeuvreId,
          id_intervenant: interv.id_intervenant,
          id_type_user: interv.id_type_user,
          personnage: interv.personnage || null,
          ordre_apparition: interv.ordre_apparition || null,
          role_principal: interv.role_principal || false,
          description_role: interv.description_role || null
        });
      }
    }

    // 2. Contributeurs (utilisateurs inscrits → chercher/créer leur intervenant)
    const contributeurs = requestBody.utilisateurs_inscrits || [];
    for (const contrib of contributeurs) {
      if (contrib.id_user && contrib.id_type_user) {
        // Chercher un intervenant lié à cet utilisateur
        let intervenant = await this.models.Intervenant.findOne({
          where: { id_user: contrib.id_user },
          transaction
        });
        // Créer si inexistant
        if (!intervenant) {
          const user = await this.models.User.findByPk(contrib.id_user, { transaction });
          if (user) {
            intervenant = await this.models.Intervenant.create({
              nom: user.nom,
              prenom: user.prenom,
              email: user.email,
              id_user: user.id_user,
              statut: 'actif'
            }, { transaction });
          }
        }
        if (intervenant) {
          records.push({
            id_oeuvre: oeuvreId,
            id_intervenant: intervenant.id_intervenant,
            id_type_user: contrib.id_type_user,
            personnage: contrib.personnage || null,
            ordre_apparition: contrib.ordre_apparition || null,
            role_principal: contrib.role_principal || false,
            description_role: contrib.description_role || null
          });
        }
      }
    }

    // 3. Nouveaux intervenants (à créer)
    const nouveaux = requestBody.nouveaux_intervenants || [];
    for (const nouveau of nouveaux) {
      if (nouveau.nom && nouveau.id_type_user) {
        const newIntervenant = await this.models.Intervenant.create({
          nom: typeof nouveau.nom === 'string' ? { fr: nouveau.nom } : nouveau.nom,
          prenom: typeof nouveau.prenom === 'string' ? { fr: nouveau.prenom } : (nouveau.prenom || {}),
          email: nouveau.email || null,
          telephone: nouveau.telephone || null,
          statut: 'actif'
        }, { transaction });

        records.push({
          id_oeuvre: oeuvreId,
          id_intervenant: newIntervenant.id_intervenant,
          id_type_user: nouveau.id_type_user,
          personnage: nouveau.personnage || null,
          ordre_apparition: nouveau.ordre_apparition || null,
          role_principal: nouveau.role_principal || false,
          description_role: nouveau.description_role || null
        });
      }
    }

    if (records.length > 0) {
      await this.models.OeuvreIntervenant.bulkCreate(records, {
        transaction,
        ignoreDuplicates: true
      });
      this.logger.info(`${records.length} intervenant(s) associé(s) à l'oeuvre ${oeuvreId}`);
    }
  }

  /**
   * Associe les éditeurs à une oeuvre
   * @private
   */
  async _associateEditeurs(oeuvreId, editeurs, transaction) {
    if (!editeurs || editeurs.length === 0 || !this.models?.OeuvreEditeur) return;

    const records = [];
    for (const editeur of editeurs) {
      const editeurId = typeof editeur === 'number' ? editeur : editeur.id_editeur;
      if (editeurId) {
        records.push({
          id_oeuvre: oeuvreId,
          id_editeur: editeurId
        });
      }
    }

    if (records.length > 0) {
      await this.models.OeuvreEditeur.bulkCreate(records, {
        transaction,
        ignoreDuplicates: true
      });
      this.logger.info(`${records.length} éditeur(s) associé(s) à l'oeuvre ${oeuvreId}`);
    }
  }
}

module.exports = OeuvreService;
