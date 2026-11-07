/**
 * OeuvreService - Service complet pour la gestion des œuvres
 *
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const { resolveTagIds } = require('../../helpers/tags');
const { entitesBrutes } = require('../../utils/entitesBrutes');
const OeuvreDTO = require('../../dto/oeuvre/oeuvreDTO');
const CreateOeuvreDTO = require('../../dto/oeuvre/createOeuvreDTO');
const UpdateOeuvreDTO = require('../../dto/oeuvre/updateOeuvreDTO');
const CacheManager = require('../../utils/CacheManager');
const { subtypeRegistry, initSubtypeServices } = require('./subtypes');

class OeuvreService extends BaseService {
  constructor(oeuvreRepository, options = {}) {
    super(oeuvreRepository, options);
    this.notificationService = options.notificationService;
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
    const cacheKey = `brut:published:${JSON.stringify(options)}`;
    const { data, pagination } = await this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findPublished(options);
      return { data: entitesBrutes(result.data), pagination: result.pagination };
    });
    return { data: OeuvreDTO.fromEntities(data), pagination };
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
   * @param {number} id
   * @param {Object} [options]
   * @param {boolean} [options.incrementViews=true] - Incrémenter le compteur de vues.
   *   À passer à false quand on ré-hydrate l'œuvre après une mutation, sinon créer
   *   ou éditer une œuvre lui donnerait artificiellement une vue.
   */
  async findWithFullDetails(id, options = {}) {
    const { incrementViews = true } = options;

    const oeuvre = await this.repository.findWithFullDetails(id);
    if (!oeuvre) {
      throw this._notFoundError(id);
    }

    if (incrementViews) {
      // Non-bloquant : viewCounter bufferise dans Redis
      try { await this.repository.incrementViews(id); } catch (e) { /* colonne nb_vues peut ne pas exister */ }
    }

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
    const oeuvres = await this.cache.getOrSet(`brut:popular:${limit}`, async () =>
      entitesBrutes(await this.repository.findPopular(limit)), 5 * 60 * 1000); // 5 min — classement stable
    return OeuvreDTO.fromEntities(oeuvres);
  }

  /**
   * Récupère les œuvres récentes
   */
  async findRecent(limit = 10) {
    const oeuvres = await this.cache.getOrSet(`brut:recent:${limit}`, async () =>
      entitesBrutes(await this.repository.findRecent(limit)), 5 * 60 * 1000);
    return OeuvreDTO.fromEntities(oeuvres);
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

    // 3b. Protection anti double-envoi (même user, même type, < 60s)
    //     Utilise uniquement des colonnes indexées (saisi_par, id_type_oeuvre, created_at)
    //     pour éviter un full table scan sur la colonne JSON `titre`.
    const titreFr = createDTO.titre?.fr?.trim();
    const titreAr = createDTO.titre?.ar?.trim();
    if (titreFr || titreAr) {
      const { Op } = require('sequelize');
      const recentOeuvre = await this.repository.model.findOne({
        where: {
          saisi_par: userId,
          id_type_oeuvre: createDTO.idTypeOeuvre,
          date_creation: { [Op.gte]: new Date(Date.now() - 60000) }
        },
        attributes: ['id_oeuvre', 'titre']
      });
      if (recentOeuvre) {
        // Comparer le titre en mémoire (pas de JSON_EXTRACT en DB)
        const t = recentOeuvre.titre || {};
        const frMatch = titreFr && (t.fr === titreFr || (typeof t === 'string' && t.includes(titreFr)));
        const arMatch = titreAr && (t.ar === titreAr || (typeof t === 'string' && t.includes(titreAr)));
        if (frMatch || arMatch) {
          this.logger.info(`Double-envoi détecté pour user=${userId}, retour de l'oeuvre existante id=${recentOeuvre.id_oeuvre}`);
          const existingOeuvre = await this.findWithFullDetails(recentOeuvre.id_oeuvre, { incrementViews: false });
          return { oeuvre: existingOeuvre, subtype: null, duplicate: true };
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

      // "Je suis l'auteur" → ajouter dans OeuvreUser
      // L'erreur doit remonter pour rollback la transaction : si on ne peut
      // pas enregistrer l'auteur, l'œuvre ne doit pas être créée sans auteur.
      if (requestBody.je_suis_auteur && this.models?.OeuvreUser) {
        const user = await this.models.User.findByPk(userId, { attributes: ['id_type_user'], transaction });
        await this.models.OeuvreUser.create({
          id_oeuvre: newOeuvre.id_oeuvre,
          id_user: userId,
          id_type_user: user?.id_type_user || 1,
          role_principal: true
        }, { transaction });
        this.logger.info(`User ${userId} ajouté comme auteur de l'oeuvre ${newOeuvre.id_oeuvre}`);
      }

      // Associer les intervenants (auteurs/contributeurs externes)
      await this._associateIntervenants(newOeuvre.id_oeuvre, requestBody, transaction);

      // Associer les éditeurs
      await this._associateEditeurs(newOeuvre.id_oeuvre, requestBody.editeurs, transaction);

      return { oeuvre: newOeuvre, subtypeRecord };
    });

    const { oeuvre, subtypeRecord } = result;
    this.cache.invalidate();
    this.logger.info(`Œuvre créée: ${oeuvre.id_oeuvre} par utilisateur: ${userId}`);

    // 5. Retourner l'œuvre depuis l'entité déjà en mémoire — pas besoin
    //    de recharger depuis la DB (évite 4-5 requêtes séquentielles = timeout 30s).
    //    Le frontend n'utilise que id_oeuvre pour la suite (upload médias, soumission).
    return {
      oeuvre: OeuvreDTO.fromEntity(oeuvre),
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
    // Les champs de modération ne passent que par les routes dédiées
    // (validate/reject/feature) : un propriétaire non admin ne peut pas les fixer ici.
    let safeBody = requestBody;
    if (!isAdmin && requestBody) {
      safeBody = { ...requestBody };
      for (const field of ['statut', 'est_mis_en_avant', 'estMisEnAvant']) delete safeBody[field];
    }
    const updateDTO = UpdateOeuvreDTO.fromRequest(safeBody);

    // 4. Vérifier s'il y a des modifications (ajouter seulement un intervenant ou un éditeur en est une)
    const nonVide = (v) => Array.isArray(v) && v.length > 0;
    const ajoutsLies = ['intervenants_non_inscrits', 'intervenants_existants', 'utilisateurs_inscrits', 'nouveaux_intervenants', 'editeurs']
      .some(cle => nonVide(requestBody?.[cle]));
    if (!updateDTO.hasChanges() && !ajoutsLies) {
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

      // Intervenants et éditeurs ajoutés en modification (avant : ignorés, « succès » affiché quand même).
      // Ajout seulement (doublons ignorés) : le formulaire de modification ne montre pas les liens existants,
      // les remplacer les effacerait.
      await this._associateIntervenants(id, requestBody, transaction);
      await this._associateEditeurs(id, requestBody.editeurs, transaction);
    });

    this.cache.invalidate();
    this.logger.info(`Œuvre mise à jour: ${id} par utilisateur: ${userId}`);
    if (!isAdmin) await this._signalerModificationPubliee(existingOeuvre, userId, 'a modifié');
    if (existingOeuvre.statut === 'publie') require('../indexNow').signalerOeuvre(this.models, existingOeuvre);

    // 8. Retourner l'œuvre mise à jour (sans compter comme vue)
    return this.findWithFullDetails(id, { incrementViews: false });
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

    // Fichiers Cloudinary des médias, retirés après la suppression en base (avant : laissés pour toujours)
    const fichiers = this.models?.Media
      ? await this.models.Media.findAll({ where: { id_oeuvre: id }, attributes: ['url', 'mime_type', 'metadata'] })
      : [];

    // 3. Suppression atomique : les ArticleBlock (polymorphique sans FK)
    // doivent être liés au sort de l'Oeuvre. Un échec DB ne doit pas laisser
    // l'article orphelin vidé de ses blocs.
    await this.withTransaction(async (transaction) => {
      const [article, articleSci] = await Promise.all([
        this.models.Article?.findOne({ where: { id_oeuvre: id }, attributes: ['id_article'], transaction }),
        this.models.ArticleScientifique?.findOne({ where: { id_oeuvre: id }, attributes: ['id_article_scientifique'], transaction })
      ]);

      if (article && this.models.ArticleBlock) {
        await this.models.ArticleBlock.destroy({
          where: { id_article: article.id_article, article_type: 'article' },
          transaction
        });
      }
      if (articleSci && this.models.ArticleBlock) {
        await this.models.ArticleBlock.destroy({
          where: { id_article: articleSci.id_article_scientifique, article_type: 'article_scientifique' },
          transaction
        });
      }

      await this.repository.delete(id, { transaction });
    });

    // Après la validation en base seulement : une suppression annulée garde ses fichiers
    await this._supprimerFichiersCloudinary(fichiers);

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

    // Une œuvre refusée, corrigée par son auteur, peut être renvoyée (l'email de refus l'annonce)
    if (!['brouillon', 'rejete'].includes(oeuvre.statut)) {
      throw this._conflictError('Seules les œuvres en brouillon ou refusées peuvent être soumises');
    }

    const updated = await this.repository.update(id, {
      statut: 'en_attente',
      date_soumission: new Date()
    });

    this.logger.info(`Œuvre soumise pour validation: ${id}`);
    await this._prevenirModeration(oeuvre, userId);

    return OeuvreDTO.fromEntity(updated);
  }

  /** Œuvre ou article en attente : les administrateurs sont prévenus (un échec ne bloque pas l'envoi) */
  async _prevenirModeration(oeuvre, userId) {
    if (!this.models?.User) return;
    try {
      const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
      const { texteLisible } = require('../../helpers/i18n');
      for (const idAdmin of await idsAdministrateurs(this.models)) {
        if (idAdmin === userId) continue;
        await notifier(this.notificationService, idAdmin, {
          titre: 'Œuvre à valider',
          message: `« ${texteLisible(oeuvre.titre)} » attend votre validation avant d’être publiée.`,
          url_action: '/admin/dashboard?tab=oeuvres', metadata: { id_oeuvre: oeuvre.id_oeuvre }
        });
      }
    } catch (e) {
      this.logger.error('Prévenir la modération d’une œuvre :', e.message);
    }
  }

  /**
   * Valide une œuvre
   */
  async validate(id, validatorId) {
    const updated = await this.withTransaction(async (transaction) => {
      const oeuvre = await this.repository.findById(id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!oeuvre) throw this._notFoundError(id);
      if (oeuvre.statut !== 'en_attente') {
        throw this._conflictError('Cette œuvre n\'est pas en attente de validation');
      }
      await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, validatorId, oeuvre.saisi_par ?? oeuvre.id_createur, 'votre propre œuvre');
      return this.repository.validate(id, validatorId, { transaction });
    });

    this.cache.invalidate();
    this.logger.info(`Œuvre validée: ${id} par: ${validatorId}`);
    // Nouvelle page publique : Bing (et donc ChatGPT) est prévenu tout de suite
    require('../indexNow').signalerOeuvre(this.models, updated);

    return OeuvreDTO.fromEntity(updated);
  }

  /**
   * Refuse une œuvre
   */
  async reject(id, validatorId, motif) {
    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de refus est requis');
    }

    const updated = await this.withTransaction(async (transaction) => {
      const oeuvre = await this.repository.findById(id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!oeuvre) throw this._notFoundError(id);
      if (oeuvre.statut !== 'en_attente') {
        throw this._conflictError('Cette œuvre n\'est pas en attente de validation');
      }
      await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, validatorId, oeuvre.saisi_par ?? oeuvre.id_createur, 'votre propre œuvre');
      return this.repository.reject(id, validatorId, motif, { transaction });
    });

    this.cache.invalidate();
    this.logger.info(`Œuvre refusée: ${id} par: ${validatorId}`);

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
   * Ajouter des médias à une œuvre existante
   * @param {number} oeuvreId
   * @param {Array|Object} files - fichier(s) uploadé(s) par multer
   * @param {number} userId
   */
  async addMedia(oeuvreId, files, userId, isAdmin = false) {
    // Auteur ou administration (même règle que le retrait et le réordonnancement)
    const oeuvre = await this._oeuvrePourMedias(oeuvreId, userId, isAdmin);

    const medias = await this.enregistrerMedias(oeuvreId, files, userId);
    // L'équipe n'a pas besoin d'être prévenue de ses propres ajouts
    if (!isAdmin) await this._signalerModificationPubliee(oeuvre, userId, 'a ajouté des médias à');
    return medias;
  }

  /**
   * Œuvre déjà publiée modifiée par son auteur : elle reste en ligne, l'équipe est prévenue pour
   * vérifier (audit V7 fiabilité E2 ; avant, aucune trace). Une notification manquée n'annule rien.
   */
  async _signalerModificationPubliee(oeuvre, userId, action) {
    if (oeuvre?.statut !== 'publie' || !this.models?.User) return;
    try {
      const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
      const { texteLisible } = require('../../helpers/i18n');
      const auteur = await this.models.User.findByPk(userId, { attributes: ['nom', 'prenom'] });
      const qui = [texteLisible(auteur?.prenom), texteLisible(auteur?.nom)].filter(Boolean).join(' ') || 'L’auteur';
      for (const idAdmin of await idsAdministrateurs(this.models)) {
        await notifier(this.notificationService, idAdmin, {
          titre: 'Œuvre publiée modifiée',
          message: `${qui} ${action} « ${texteLisible(oeuvre.titre)} », déjà publiée : à vérifier.`,
          url_action: `/oeuvres/${oeuvre.id_oeuvre}`, metadata: { id_oeuvre: oeuvre.id_oeuvre }
        });
      }
    } catch (e) {
      this.logger.error('Signalement de modification d’une œuvre publiée :', e.message);
    }
  }

  /** Œuvre dont ce compte peut gérer les médias (auteur ou administration) */
  async _oeuvrePourMedias(oeuvreId, userId, isAdmin) {
    const oeuvre = await this.repository.findById(oeuvreId);
    if (!oeuvre) throw this._notFoundError(oeuvreId);
    const ownerId = oeuvre.saisi_par ?? oeuvre.id_createur;
    if (Number(ownerId) !== Number(userId) && !isAdmin) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres œuvres');
    }
    return oeuvre;
  }

  /**
   * Extrait d'un livre en PDF ou en audio : le fichier devient un média de l'œuvre et la fiche du
   * livre le désigne ; l'ancien extrait du même genre est retiré (pas de fichiers oubliés).
   * @param {'pdf'|'audio'} genre
   */
  async definirExtraitFichier(oeuvreId, genre, fichier, userId, isAdmin = false) {
    const oeuvre = await this._oeuvrePourMedias(oeuvreId, userId, isAdmin);
    if (oeuvre.id_type_oeuvre !== 1 || !this.models?.Livre) throw this._validationError('Un extrait de lecture ne concerne qu’un livre');
    if (!fichier) throw this._validationError('Aucun fichier reçu');
    const colonne = genre === 'pdf' ? 'id_media_extrait_pdf' : 'id_media_extrait_audio';
    const [media] = await this.enregistrerMedias(oeuvreId, fichier, userId);
    let livre = await this.models.Livre.findOne({ where: { id_oeuvre: oeuvreId } });
    if (!livre) livre = await this.models.Livre.create({ id_oeuvre: oeuvreId });
    const ancien = livre[colonne];
    await livre.update({ [colonne]: media.id_media });
    if (ancien && ancien !== media.id_media) {
      await this.deleteMedia(oeuvreId, ancien, userId, isAdmin).catch(() => {});
    }
    this.cache.invalidate();
    return { id_media: media.id_media, url: media.url, type_media: media.type_media };
  }

  /** Retire l'extrait PDF ou audio d'un livre (le média et son fichier compris) */
  async retirerExtraitFichier(oeuvreId, genre, userId, isAdmin = false) {
    await this._oeuvrePourMedias(oeuvreId, userId, isAdmin);
    const colonne = genre === 'pdf' ? 'id_media_extrait_pdf' : 'id_media_extrait_audio';
    const livre = this.models?.Livre ? await this.models.Livre.findOne({ where: { id_oeuvre: oeuvreId } }) : null;
    const id = livre?.[colonne];
    if (!id) return false;
    await livre.update({ [colonne]: null });
    await this.deleteMedia(oeuvreId, id, userId, isAdmin).catch(() => {});
    this.cache.invalidate();
    return true;
  }

  /**
   * Retire un média de l'œuvre (fichier Cloudinary compris). Avant : méthode absente, erreur 500 —
   * une mauvaise pochette ou un mauvais extrait ne pouvait plus être retiré.
   */
  async deleteMedia(oeuvreId, mediaId, userId, isAdmin = false) {
    await this._oeuvrePourMedias(oeuvreId, userId, isAdmin);
    const media = await this.models.Media.findOne({ where: { id_media: mediaId, id_oeuvre: oeuvreId } });
    if (!media) throw this._notFoundError(mediaId);

    await media.destroy();
    // Un échec Cloudinary n'empêche pas de retirer le média de la fiche (deleteAsset le journalise)
    await this._supprimerFichiersCloudinary([media]);
    this.cache.invalidate();
    return true;
  }

  /** Fichiers Cloudinary de médias supprimés (sans effet sur les fichiers hébergés ailleurs) ; un échec est journalisé */
  async _supprimerFichiersCloudinary(medias) {
    if (!medias?.length) return;
    const cloudinary = require('../cloudinaryService');
    for (const media of medias) {
      const meta = media.metadata && typeof media.metadata === 'object' ? media.metadata : {};
      const publicId = meta.cloudinaryPublicId || cloudinary.extractPublicId(media.url);
      if (publicId && cloudinary.isCloudinaryUrl(media.url)) {
        await cloudinary.deleteAsset(publicId, cloudinary.getResourceType(media.mime_type));
      }
    }
  }

  /** Ordre d'affichage des médias : `orderedIds` = tous ou une partie des médias de l'œuvre */
  async reorderMedias(oeuvreId, orderedIds, userId, isAdmin = false) {
    await this._oeuvrePourMedias(oeuvreId, userId, isAdmin);
    const ids = Array.isArray(orderedIds) ? orderedIds.map(Number) : [];
    if (!ids.length || ids.some(id => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
      throw this._validationError("orderedIds doit être la liste des médias de l'œuvre");
    }
    const medias = await this.models.Media.findAll({ where: { id_oeuvre: oeuvreId, id_media: ids }, attributes: ['id_media'] });
    if (medias.length !== ids.length) throw this._validationError("Un des médias n'appartient pas à cette œuvre");
    await this.withTransaction(async (transaction) => {
      for (const [ordre, id] of ids.entries()) {
        await this.models.Media.update({ ordre }, { where: { id_media: id, id_oeuvre: oeuvreId }, transaction });
      }
    });
    this.cache.invalidate();
    return true;
  }

  /**
   * Enregistre les fichiers déjà envoyés (Cloudinary) comme médias de l'œuvre.
   * Sans contrôle de propriété : à appeler après ce contrôle (œuvre, fiche artisanat…).
   */
  async enregistrerMedias(oeuvreId, files, userId = null) {
    const fileArray = Array.isArray(files) ? files : [files];
    const results = [];

    for (const file of fileArray) {
      if (!file) continue;
      if (this.models?.Media) {
        const media = await this.models.Media.create({
          id_oeuvre: oeuvreId,
          // « audio » : sans lui, un extrait MP3 était rangé en document et le lecteur ne le trouvait jamais
          type_media: file.mimetype?.startsWith('image') ? 'image'
            : file.mimetype?.startsWith('video') ? 'video'
            : file.mimetype?.startsWith('audio') ? 'audio' : 'document',
          url: file.path || file.location || file.url,
          mime_type: file.mimetype,
          taille_fichier: file.size,
          visible_public: true,
          metadata: {
            originalName: file.originalname,
            cloudinaryPublicId: file.filename,
            // Lu par la suppression générique (DELETE /upload/:id) ; absent, elle était toujours refusée
            ...(userId ? { uploadedBy: userId } : {})
          }
        });
        results.push(media);
      }
    }

    this.cache.invalidate();
    return results;
  }

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
    return resolveTagIds(this.models, tags, transaction);
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

    // 2. Contributeurs (utilisateurs inscrits → chercher/créer leur intervenant) — batch
    const contributeurs = requestBody.utilisateurs_inscrits || [];
    const validContributeurs = contributeurs.filter(c => c.id_user && c.id_type_user);
    if (validContributeurs.length > 0) {
      const { Op } = require('sequelize');
      const allUserIds = validContributeurs.map(c => c.id_user);

      const existingIntervenants = await this.models.Intervenant.findAll({
        where: { id_user: { [Op.in]: allUserIds } },
        transaction
      });
      const intervenantByUserId = new Map(existingIntervenants.map(i => [i.id_user, i]));

      const missingUserIds = allUserIds.filter(uid => !intervenantByUserId.has(uid));
      if (missingUserIds.length > 0) {
        const users = await this.models.User.findAll({
          where: { id_user: { [Op.in]: missingUserIds } },
          transaction
        });
        if (users.length > 0) {
          await this.models.Intervenant.bulkCreate(
            users.map(u => ({ nom: u.nom, prenom: u.prenom, email: u.email, id_user: u.id_user, actif: true })),
            { transaction, ignoreDuplicates: true }
          );
          const created = await this.models.Intervenant.findAll({
            where: { id_user: { [Op.in]: missingUserIds } },
            transaction
          });
          for (const interv of created) intervenantByUserId.set(interv.id_user, interv);
        }
      }

      for (const contrib of validContributeurs) {
        const intervenant = intervenantByUserId.get(contrib.id_user);
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
          actif: true
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
        const record = { id_oeuvre: oeuvreId, id_editeur: editeurId };
        if (typeof editeur === 'object') {
          if (editeur.role_editeur) record.role_editeur = editeur.role_editeur;
          if (editeur.statut_edition) record.statut_edition = editeur.statut_edition;
        }
        records.push(record);
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
