// controllers/OeuvreController.js - VERSION i18n
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class OeuvreController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    if (!this.sequelize) {
      console.error('❌ Sequelize non trouvé dans les modèles!');
    } else {
      console.log('✅ OeuvreController initialisé avec succès');
    }
  }

  /**
   * ⚡ Recherche multilingue dans les champs JSON
   * ✅ OPTIMISATION: Utilise maintenant l'utilitaire centralisé
   */
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search, 'Oeuvre');
  }

  /**
   * Liste des œuvres avec pagination
   */
  async list(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      
      const { 
        page = 1, 
        limit = 10, 
        type, 
        langue, 
        statut = 'publie',
        search,
        sort = 'recent'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtres
      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      if (statut) where.statut = statut;
      
      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('titre', search),
          ...this.buildMultiLangSearchLocal('description', search)
        ];
      }

      // Tri
      let order;
      switch (sort) {
        case 'recent':
          order = [['date_creation', 'DESC']];
          break;
        case 'title':
          order = [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('titre'), `$.${lang}`), 'ASC']];
          break;
        case 'year':
          order = [['annee_creation', 'DESC']];
          break;
        case 'rating':
          order = [['note_moyenne', 'DESC']];
          break;
        default:
          order = [['date_creation', 'DESC']];
      }

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [
          { 
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          { 
            model: this.models.Langue,
            attributes: ['id_langue', 'nom', 'code']
          },
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            attributes: ['id_categorie', 'nom']
          },
          {
            model: this.models.Media,
            where: { visible_public: true },
            required: false,
            separate: true,
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ],
        distinct: true
      });

      // ⚡ Traduire les résultats
      const translatedOeuvres = translateDeep(result.rows, lang);

      res.json({
        success: true,
        data: {
          oeuvres: translatedOeuvres,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération œuvres:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des œuvres' 
      });
    }
  }

  /**
   * Alias pour list
   */
  async getAllOeuvres(req, res) {
    return this.list(req, res);
  }

  /**
   * Récupérer une œuvre par ID
   */
  async getById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      const { id } = req.params;
      
      const oeuvre = await this.models.Oeuvre.findByPk(id, {
        include: [
          // Type et langue
          {
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          {
            model: this.models.Langue,
            attributes: ['id_langue', 'nom', 'code']
          },
          
          // Catégories et tags
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            attributes: ['id_categorie', 'nom', 'description']
          },
          {
            model: this.models.TagMotCle,
            as: 'Tags',
            through: { attributes: [] },
            attributes: ['id_tag', 'nom']
          },
          
          // Éditeurs
          {
            model: this.models.Editeur,
            through: {
              model: this.models.OeuvreEditeur,
              attributes: ['role_editeur', 'date_edition', 'isbn_editeur', 'prix_vente', 'statut_edition']
            },
            attributes: ['id_editeur', 'nom', 'pays', 'ville']
          },
          
          // Médias
          {
            model: this.models.Media,
            where: { visible_public: true },
            required: false,
            attributes: ['id_media', 'type_media', 'url', 'titre', 'description', 'thumbnail_url', 'ordre'],
            order: [['ordre', 'ASC']]
          }
        ]
      });

      if (!oeuvre) {
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      // ⚡ Traduire la réponse
      res.json({
        success: true,
        data: translateDeep(oeuvre, lang),
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération de l\'œuvre' 
      });
    }
  }

  /**
   * Alias pour getById
   */
  async getOeuvreById(req, res) {
    return this.getById(req, res);
  }

  /**
   * ✅ NOUVELLE FONCTION - Récupérer les médias d'une œuvre
   */
  async getMedias(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      // Vérifier que l'œuvre existe
      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // Récupérer les médias
      const medias = await this.models.Media.findAll({
        where: {
          id_oeuvre: id,
          visible_public: true
        },
        attributes: [
          'id_media',
          'type_media',
          'url',
          'titre',
          'description',
          'thumbnail_url',
          'ordre',
          'is_principal',
          'date_creation'
        ],
        order: [
          ['is_principal', 'DESC'],
          ['ordre', 'ASC'],
          ['date_creation', 'ASC']
        ]
      });

      res.json({
        success: true,
        data: translateDeep(medias, lang),
        count: medias.length,
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération médias œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des médias'
      });
    }
  }

  /**
   * ⚡ Préparer un champ multilingue
   */
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  /**
   * Créer une nouvelle œuvre
   */
  async create(req, res) {
    let transaction;

    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      transaction = await this.sequelize.transaction();

      const {
        titre,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        description,
        prix,
        id_oeuvre_originale,
        categories = [],
        tags = [],
        editeurs = [],
        utilisateurs_inscrits = [],
        intervenants_non_inscrits = [],
        nouveaux_intervenants = [],
        medias = [],
        details_specifiques = {}
      } = req.body;

      console.log('📝 Création œuvre:', {
        titre,
        id_type_oeuvre,
        lang,
        nb_categories: categories.length,
        nb_medias: medias.length
      });

      // 1. Validation basique
      if (!titre || !id_type_oeuvre || !id_langue) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs titre, type d\'œuvre et langue sont obligatoires'
        });
      }

      // 2. Créer l'œuvre
      const oeuvre = await this.models.Oeuvre.create({
        titre: this.prepareMultiLangField(titre, lang),
        description: this.prepareMultiLangField(description, lang),
        id_type_oeuvre,
        id_langue,
        annee_creation,
        prix,
        id_oeuvre_originale,
        saisi_par: req.user?.id_user,
        statut: 'brouillon'
      }, { transaction });

      // 2b. Créer l'entrée dans la table spécifique selon le type d'œuvre
      if (details_specifiques && Object.keys(details_specifiques).length > 0) {
        const typeOeuvre = await this.models.TypeOeuvre.findByPk(id_type_oeuvre);
        const typeName = typeOeuvre?.nom_type;

        console.log('📝 Création détails spécifiques pour:', typeName, details_specifiques);

        try {
          switch (typeName) {
            case 'Livre':
              if (details_specifiques.livre && this.models.Livre) {
                await this.models.Livre.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.livre
                }, { transaction });
              }
              break;

            case 'Film':
              if (details_specifiques.film && this.models.Film) {
                await this.models.Film.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.film
                }, { transaction });
              }
              break;

            case 'Album Musical':
              if (details_specifiques.album_musical && this.models.AlbumMusical) {
                await this.models.AlbumMusical.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.album_musical
                }, { transaction });
              }
              break;

            case 'Article':
              if (details_specifiques.article && this.models.Article) {
                await this.models.Article.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.article
                }, { transaction });
              }
              break;

            case 'Article Scientifique':
              if (details_specifiques.article_scientifique && this.models.ArticleScientifique) {
                await this.models.ArticleScientifique.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.article_scientifique
                }, { transaction });
              }
              break;

            case 'Artisanat':
              if (details_specifiques.artisanat && this.models.Artisanat) {
                await this.models.Artisanat.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.artisanat
                }, { transaction });
              }
              break;

            case 'Œuvre d\'Art':
            case 'Oeuvre d\'Art':
              if (details_specifiques.oeuvre_art && this.models.OeuvreArt) {
                await this.models.OeuvreArt.create({
                  id_oeuvre: oeuvre.id_oeuvre,
                  ...details_specifiques.oeuvre_art
                }, { transaction });
              }
              break;

            default:
              console.log('⚠️ Type d\'œuvre non reconnu pour les détails spécifiques:', typeName);
          }
        } catch (detailsError) {
          console.error('⚠️ Erreur création détails spécifiques:', detailsError.message);
          // On continue même si les détails spécifiques échouent
        }
      }

      // 3. Associer les catégories
      if (categories.length > 0) {
        const categoriesArray = Array.isArray(categories) ? categories : [categories];
        await oeuvre.setCategories(categoriesArray, { transaction });
      }

      // 4. Associer les tags
      if (tags.length > 0) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        // Créer les tags s'ils n'existent pas
        const tagInstances = [];
        for (const tagNom of tagsArray) {
          const [tag] = await this.models.TagMotCle.findOrCreate({
            where: { nom: tagNom },
            defaults: { nom: tagNom },
            transaction
          });
          tagInstances.push(tag);
        }
        await oeuvre.setTags(tagInstances, { transaction });
      }

      await transaction.commit();

      // Recharger avec les relations
      const oeuvreComplete = await this.models.Oeuvre.findByPk(oeuvre.id_oeuvre, {
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { model: this.models.Categorie, through: { attributes: [] } },
          { model: this.models.TagMotCle, as: 'Tags', through: { attributes: [] } }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Œuvre créée avec succès',
        data: {
          oeuvre: translateDeep(oeuvreComplete, lang)
        }
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('❌ Erreur création œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la création de l\'œuvre',
        details: error.message
      });
    }
  }

  /**
   * Mettre à jour une œuvre
   */
  async update(req, res) {
    let transaction;

    try {
      const lang = req.lang || 'fr';  // ⚡ Récupérer la langue
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // 🔒 Vérification ownership - seul le créateur ou admin peut modifier
      const isAdmin = req.user?.role === 'Admin' || req.user?.isAdmin;
      const isOwner = oeuvre.id_user === req.user?.id_user;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à modifier cette œuvre'
        });
      }

      transaction = await this.sequelize.transaction();

      const {
        titre,
        description,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        prix,
        statut,
        categories,
        tags
      } = req.body;

      const updates = {};

      // ⚡ Gérer les champs multilingues
      if (titre !== undefined) {
        if (typeof titre === 'object' && titre !== null) {
          updates.titre = mergeTranslations(oeuvre.titre, titre);
        } else if (typeof titre === 'string') {
          updates.titre = mergeTranslations(oeuvre.titre, { [lang]: titre });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object' && description !== null) {
          updates.description = mergeTranslations(oeuvre.description, description);
        } else if (typeof description === 'string') {
          updates.description = mergeTranslations(oeuvre.description, { [lang]: description });
        }
      }

      // Champs normaux
      if (id_type_oeuvre !== undefined) updates.id_type_oeuvre = id_type_oeuvre;
      if (id_langue !== undefined) updates.id_langue = id_langue;
      if (annee_creation !== undefined) updates.annee_creation = annee_creation;
      if (prix !== undefined) updates.prix = prix;
      if (statut !== undefined) updates.statut = statut;

      await oeuvre.update(updates, { transaction });

      // Mettre à jour les relations
      if (categories !== undefined) {
        const categoriesArray = Array.isArray(categories) ? categories : [categories];
        await oeuvre.setCategories(categoriesArray, { transaction });
      }

      if (tags !== undefined) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        await oeuvre.setTags(tagsArray, { transaction });
      }

      await transaction.commit();

      // Recharger
      const oeuvreComplete = await this.models.Oeuvre.findByPk(id, {
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { model: this.models.Categorie, through: { attributes: [] } },
          { model: this.models.TagMotCle, as: 'Tags', through: { attributes: [] } }
        ]
      });

      res.json({
        success: true,
        message: 'Œuvre mise à jour avec succès',
        data: translateDeep(oeuvreComplete, lang)
      });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('❌ Erreur mise à jour œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'œuvre'
      });
    }
  }

  /**
   * Supprimer une œuvre
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // 🔒 Vérification ownership - seul le créateur ou admin peut supprimer
      const isAdmin = req.user?.role === 'Admin' || req.user?.isAdmin;
      const isOwner = oeuvre.id_user === req.user?.id_user;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à supprimer cette œuvre'
        });
      }

      // Soft delete
      await oeuvre.update({ statut: 'archive' });

      res.json({
        success: true,
        message: 'Œuvre supprimée avec succès'
      });

    } catch (error) {
      console.error('❌ Erreur suppression œuvre:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de l\'œuvre'
      });
    }
  }

  /**
   * ⚡ Récupérer toutes les traductions d'une œuvre (admin)
   */
  async getOeuvreTranslations(req, res) {
    try {
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id, {
        attributes: ['id_oeuvre', 'titre', 'description']
      });

      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      res.json({
        success: true,
        data: {
          id_oeuvre: oeuvre.id_oeuvre,
          titre: oeuvre.titre,
          description: oeuvre.description
        }
      });

    } catch (error) {
      console.error('❌ Erreur récupération traductions:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * ⚡ Mettre à jour une traduction spécifique (admin)
   */
  async updateOeuvreTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { titre, description } = req.body;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      const updates = {};

      if (titre) {
        updates.titre = mergeTranslations(oeuvre.titre, { [lang]: titre });
      }

      if (description) {
        updates.description = mergeTranslations(oeuvre.description, { [lang]: description });
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        });
      }

      await oeuvre.update(updates);

      res.json({
        success: true,
        message: `Traduction ${lang} mise à jour avec succès`,
        data: oeuvre
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour traduction:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Recherche avancée d'œuvres
   */
  async search(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { q, type, categorie, langue, annee_min, annee_max, page = 1, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const where = {
        statut: 'publie',
        [Op.or]: [
          ...this.buildMultiLangSearchLocal('titre', q),
          ...this.buildMultiLangSearchLocal('description', q)
        ]
      };

      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      if (annee_min) where.annee_creation = { ...where.annee_creation, [Op.gte]: annee_min };
      if (annee_max) where.annee_creation = { ...where.annee_creation, [Op.lte]: annee_max };

      const offset = (page - 1) * limit;

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
          { model: this.models.Langue, attributes: ['nom', 'code'] },
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            where: categorie ? { id_categorie: categorie } : undefined,
            required: !!categorie
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_creation', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        data: translateDeep(result.rows, lang),
        pagination: {
          total: result.count,
          page: parseInt(page),
          pages: Math.ceil(result.count / limit),
          limit: parseInt(limit)
        },
        query: q,
        lang
      });

    } catch (error) {
      console.error('❌ Erreur recherche œuvres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recherche'
      });
    }
  }

  /**
   * Récupérer les œuvres de l'utilisateur connecté
   */
  async getMyWorks(req, res) {
    try {
      const lang = req.lang || 'fr';
      const userId = req.user?.id_user;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Utilisateur non authentifié'
        });
      }

      const {
        page = 1,
        limit = 50,
        statut,
        sort = 'recent'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { saisi_par: userId };

      // Filtre par statut si spécifié
      if (statut) {
        where.statut = statut;
      }

      // Tri
      let order;
      switch (sort) {
        case 'recent':
          order = [['date_creation', 'DESC']];
          break;
        case 'title':
          order = [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('titre'), `$.${lang}`), 'ASC']];
          break;
        case 'year':
          order = [['annee_creation', 'DESC']];
          break;
        default:
          order = [['date_creation', 'DESC']];
      }

      console.log(`📚 Récupération des œuvres pour l'utilisateur ${userId}...`);

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        include: [
          {
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          {
            model: this.models.Langue,
            attributes: ['id_langue', 'nom', 'code']
          },
          {
            model: this.models.Categorie,
            through: { attributes: [] },
            attributes: ['id_categorie', 'nom']
          },
          {
            model: this.models.Media,
            required: false,
            separate: true,
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ],
        distinct: true
      });

      console.log(`✅ ${result.count} œuvres trouvées pour l'utilisateur ${userId}`);

      // Traduire les résultats
      const translatedOeuvres = translateDeep(result.rows, lang);

      res.json({
        success: true,
        data: {
          oeuvres: translatedOeuvres,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('❌ Erreur récupération mes œuvres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération de vos œuvres'
      });
    }
  }

  // ========================================================================
  // ALIAS POUR COMPATIBILITÉ AVEC LES ROUTES
  // ========================================================================

  /**
   * Alias pour create
   */
  async createOeuvre(req, res) {
    return this.create(req, res);
  }

  /**
   * Alias pour update
   */
  async updateOeuvre(req, res) {
    return this.update(req, res);
  }

  /**
   * Alias pour delete
   */
  async deleteOeuvre(req, res) {
    return this.delete(req, res);
  }

  /**
   * Alias pour search
   */
  async searchOeuvres(req, res) {
    return this.search(req, res);
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(req, res) {
    try {
      const stats = await this.models.Oeuvre.findAll({
        attributes: [
          'statut',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['statut'],
        raw: true
      });

      const total = stats.reduce((sum, s) => sum + parseInt(s.count), 0);

      res.json({
        success: true,
        data: {
          total,
          parStatut: stats.reduce((acc, s) => {
            acc[s.statut] = parseInt(s.count);
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('❌ Erreur statistiques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Récupérer les liens de partage d'une œuvre
   */
  async getShareLinks(req, res) {
    try {
      const { id } = req.params;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const oeuvreUrl = `${baseUrl}/oeuvres/${id}`;

      res.json({
        success: true,
        data: {
          direct: oeuvreUrl,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(oeuvreUrl)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(oeuvreUrl)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(oeuvreUrl)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(oeuvreUrl)}`
        }
      });
    } catch (error) {
      console.error('❌ Erreur liens partage:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Upload de médias
   */
  async uploadMedia(req, res) {
    try {
      const { id } = req.params;
      const files = req.files || [];

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier uploadé'
        });
      }

      const medias = [];
      for (const file of files) {
        const media = await this.models.Media.create({
          id_oeuvre: id,
          type_media: file.mimetype.startsWith('image/') ? 'image' : 'document',
          url: `/uploads/oeuvres/${file.filename}`,
          titre: file.originalname,
          visible_public: true
        });
        medias.push(media);
      }

      res.json({
        success: true,
        message: `${medias.length} média(s) uploadé(s)`,
        data: medias
      });
    } catch (error) {
      console.error('❌ Erreur upload média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'upload'
      });
    }
  }

  /**
   * Réordonner les médias
   */
  async reorderMedias(req, res) {
    try {
      const { mediaIds } = req.body;

      for (let i = 0; i < mediaIds.length; i++) {
        await this.models.Media.update(
          { ordre: i + 1 },
          { where: { id_media: mediaIds[i] } }
        );
      }

      res.json({
        success: true,
        message: 'Ordre des médias mis à jour'
      });
    } catch (error) {
      console.error('❌ Erreur réordonnancement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Supprimer un média
   */
  async deleteMedia(req, res) {
    try {
      const { mediaId } = req.params;

      const media = await this.models.Media.findByPk(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      await media.destroy();

      res.json({
        success: true,
        message: 'Média supprimé'
      });
    } catch (error) {
      console.error('❌ Erreur suppression média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Valider une œuvre (admin)
   */
  async validateOeuvre(req, res) {
    try {
      const { id } = req.params;
      const { statut, raison_rejet } = req.body;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      const updates = { statut };
      if (statut === 'rejete' && raison_rejet) {
        updates.raison_rejet = raison_rejet;
      }

      await oeuvre.update(updates);

      res.json({
        success: true,
        message: `Œuvre ${statut === 'publie' ? 'publiée' : 'rejetée'} avec succès`,
        data: oeuvre
      });
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Rechercher des intervenants
   */
  async searchIntervenants(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const users = await this.models.User.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.like]: `%${q}%` } },
            { prenom: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } }
          ],
          statut: 'actif'
        },
        attributes: ['id_user', 'nom', 'prenom', 'email'],
        limit: 10
      });

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('❌ Erreur recherche intervenants:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Vérifier un email
   */
  async checkEmail(req, res) {
    try {
      const { email } = req.body;

      const user = await this.models.User.findOne({
        where: { email },
        attributes: ['id_user', 'nom', 'prenom', 'email']
      });

      res.json({
        success: true,
        exists: !!user,
        user: user || null
      });
    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }
}

module.exports = OeuvreController;