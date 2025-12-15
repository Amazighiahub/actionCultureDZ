// controllers/OeuvreController.js - VERSION i18n
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

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
   */
  buildMultiLangSearch(field, search) {
    return [
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.fr'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.ar'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.en'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$."tz-ltn"'),
        { [Op.like]: `%${search}%` }
      )
    ];
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
          ...this.buildMultiLangSearch('titre', search),
          ...this.buildMultiLangSearch('description', search)
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

      // ⚡ Préparer les champs multilingues
      const titreMultiLang = this.prepareMultiLangField(titre, lang);
      const descriptionMultiLang = this.prepareMultiLangField(description, lang);

      const categoriesArray = Array.isArray(categories) ? categories : categories ? [categories] : [];

      // 3. Créer l'œuvre principale
      const oeuvre = await this.models.Oeuvre.create({
        titre: titreMultiLang,           // ⚡ JSON multilingue
        description: descriptionMultiLang, // ⚡ JSON multilingue
        id_type_oeuvre,
        id_langue,
        annee_creation,
        prix,
        id_oeuvre_originale,
        id_createur: req.user.id_user,
        statut: 'brouillon',
        date_creation: new Date()
      }, { transaction });

      console.log(`✅ Œuvre créée avec ID: ${oeuvre.id_oeuvre}`);

      // 4. Associer les catégories
      if (categoriesArray.length > 0) {
        await oeuvre.setCategories(categoriesArray, { transaction });
        console.log(`✅ ${categoriesArray.length} catégorie(s) associée(s)`);
      }

      // 5. Associer les tags
      if (tags.length > 0) {
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        await oeuvre.setTags(tagsArray, { transaction });
        console.log(`✅ ${tagsArray.length} tag(s) associé(s)`);
      }

      await transaction.commit();

      // Recharger l'œuvre avec les relations
      const oeuvreComplete = await this.models.Oeuvre.findByPk(oeuvre.id_oeuvre, {
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { model: this.models.Categorie, through: { attributes: [] } },
          { model: this.models.TagMotCle, as: 'Tags', through: { attributes: [] } }
        ]
      });

      // ⚡ Traduire la réponse
      res.status(201).json({
        success: true,
        message: 'Œuvre créée avec succès',
        data: translateDeep(oeuvreComplete, lang)
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
          ...this.buildMultiLangSearch('titre', q),
          ...this.buildMultiLangSearch('description', q)
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
}

module.exports = OeuvreController;
