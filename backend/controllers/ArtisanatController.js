// controllers/ArtisanatController.js - VERSION i18n
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

class ArtisanatController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const dir = path.join('uploads', 'artisanat', req.params.id || 'temp');
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Type de fichier non autorisé pour l\'artisanat'));
        }
      }
    });
  }

  // ⚡ Recherche multilingue
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
      )
    ];
  }

  /**
   * Récupérer tous les produits artisanaux
   */
  async getAllArtisanats(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { 
        page = 1, 
        limit = 12,
        materiau,
        technique,
        wilaya,
        prix_min,
        prix_max,
        disponible = true,
        artisan,
        search,
        sort = 'recent'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      const oeuvreWhere = {
        statut: 'publie'
      };

      // ⚡ Recherche multilingue
      if (search) {
        oeuvreWhere[Op.or] = [
          ...this.buildMultiLangSearch('Oeuvre.titre', search),
          ...this.buildMultiLangSearch('Oeuvre.description', search)
        ];
      }

      if (artisan) {
        oeuvreWhere.saisi_par = artisan;
      }

      if (materiau) where.id_materiau = materiau;
      if (technique) where.id_technique = technique;
      
      if (prix_min || prix_max) {
        where.prix = {};
        if (prix_min) where.prix[Op.gte] = parseFloat(prix_min);
        if (prix_max) where.prix[Op.lte] = parseFloat(prix_max);
      }

      const include = [
        {
          model: this.models.Oeuvre,
          where: oeuvreWhere,
          include: [
            {
              model: this.models.User,
              as: 'Saiseur',
              attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'type_user'],
              include: wilaya ? [{
                model: this.models.Wilaya,
                where: { id_wilaya: wilaya },
                attributes: ['nom']
              }] : []
            },
            {
              model: this.models.Media,
              attributes: ['id_media', 'url', 'type_media', 'thumbnail_url'],
              required: false,
              limit: 1
            },
            {
              model: this.models.Categorie,
              through: { attributes: [] },
              attributes: ['id_categorie', 'nom']
            },
            {
              model: this.models.Langue,
              attributes: ['nom', 'code']
            }
          ]
        },
        {
          model: this.models.Materiau,
          attributes: ['id_materiau', 'nom', 'description']
        },
        {
          model: this.models.Technique,
          attributes: ['id_technique', 'nom', 'description']
        }
      ];

      let order;
      switch (sort) {
        case 'recent':
          order = [[this.models.Oeuvre, 'date_creation', 'DESC']];
          break;
        case 'prix_asc':
          order = [['prix', 'ASC']];
          break;
        case 'prix_desc':
          order = [['prix', 'DESC']];
          break;
        case 'populaire':
          order = [[
            this.sequelize.literal(`(
              SELECT COUNT(*) FROM favoris 
              WHERE type_entite = 'artisanat' 
              AND id_entite = Artisanat.id_artisanat
            )`), 
            'DESC'
          ]];
          break;
        default:
          order = [[this.models.Oeuvre, 'date_creation', 'DESC']];
      }

      const artisanats = await this.models.Artisanat.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
        distinct: true
      });

      const artisanatsWithStats = await Promise.all(
        artisanats.rows.map(async (artisanat) => {
          const stats = await this.getArtisanatStatistics(artisanat.id_artisanat);
          return {
            ...artisanat.toJSON(),
            statistiques: stats,
            disponible: await this.checkDisponibilite(artisanat.id_artisanat)
          };
        })
      );

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          artisanats: translateDeep(artisanatsWithStats, lang),
          pagination: {
            total: artisanats.count,
            page: parseInt(page),
            pages: Math.ceil(artisanats.count / limit),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des artisanats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des artisanats' 
      });
    }
  }

  /**
   * Récupérer un artisanat par ID
   */
  async getArtisanatById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [
          {
            model: this.models.Oeuvre,
            include: [
              {
                model: this.models.User,
                as: 'Saiseur',
                attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'type_user', 'email', 'telephone', 'biographie'],
                include: [{
                  model: this.models.Wilaya,
                  attributes: ['nom', 'code']
                }]
              },
              {
                model: this.models.Media,
                order: [['ordre', 'ASC']]
              },
              {
                model: this.models.Categorie,
                through: { attributes: [] }
              },
              {
                model: this.models.TagMotCle,
                through: { attributes: [] }
              },
              {
                model: this.models.Langue
              }
            ]
          },
          {
            model: this.models.Materiau,
            attributes: ['id_materiau', 'nom', 'description']
          },
          {
            model: this.models.Technique,
            attributes: ['id_technique', 'nom', 'description']
          }
        ]
      });

      if (!artisanat) {
        return res.status(404).json({ 
          success: false, 
          error: 'Artisanat non trouvé' 
        });
      }

      const [stats, similaires] = await Promise.all([
        this.getArtisanatStatistics(id),
        this.getArtisanatsSimilaires(artisanat)
      ]);

      const autresCreations = await this.getAutresCreationsArtisan(
        artisanat.Oeuvre.saisi_par, 
        artisanat.id_artisanat
      );

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          artisanat: translateDeep(artisanat, lang),
          statistiques: stats,
          similaires: translateDeep(similaires, lang),
          autres_creations: translateDeep(autresCreations, lang)
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'artisanat:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ⚡ Préparer un champ multilingue
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  /**
   * Créer un nouveau produit artisanal
   */
  async createArtisanat(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const lang = req.lang || 'fr';  // ⚡
      const {
        titre,
        description,
        id_type_oeuvre,
        id_langue,
        id_materiau,
        id_technique,
        dimensions,
        poids,
        prix,
        annee_creation,
        categories = [],
        tags = []
      } = req.body;

      // Validation
      if (!titre) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Le titre est obligatoire'
        });
      }

      // ⚡ Préparer les champs multilingues
      const titreMultiLang = this.prepareMultiLangField(titre, lang);
      const descriptionMultiLang = this.prepareMultiLangField(description, lang);

      // Créer l'œuvre de base
      const oeuvre = await this.models.Oeuvre.create({
        titre: titreMultiLang,
        description: descriptionMultiLang,
        id_type_oeuvre: id_type_oeuvre || 6, // Type artisanat par défaut
        id_langue: id_langue || 1,
        annee_creation,
        saisi_par: req.user.id_user,
        statut: 'brouillon',
        date_creation: new Date()
      }, { transaction });

      // Créer l'artisanat
      const artisanat = await this.models.Artisanat.create({
        id_oeuvre: oeuvre.id_oeuvre,
        id_materiau,
        id_technique,
        dimensions,
        poids,
        prix
      }, { transaction });

      // Associations
      if (categories.length > 0) {
        await oeuvre.setCategories(categories, { transaction });
      }

      if (tags.length > 0) {
        await oeuvre.setTagMotCles(tags, { transaction });
      }

      await transaction.commit();

      const artisanatComplet = await this.getArtisanatComplet(artisanat.id_artisanat);

      // ⚡ Traduire
      res.status(201).json({
        success: true,
        message: 'Produit artisanal créé avec succès',
        data: translateDeep(artisanatComplet, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création de l\'artisanat:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création' 
      });
    }
  }

  /**
   * Mettre à jour un artisanat
   */
  async updateArtisanat(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const { titre, description, ...otherUpdates } = req.body;

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [{ model: this.models.Oeuvre }]
      });

      if (!artisanat) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Artisanat non trouvé'
        });
      }

      // Vérifier les permissions
      if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      // MAJ Artisanat
      const artisanatUpdates = {};
      ['id_materiau', 'id_technique', 'dimensions', 'poids', 'prix'].forEach(field => {
        if (otherUpdates[field] !== undefined) {
          artisanatUpdates[field] = otherUpdates[field];
        }
      });

      if (Object.keys(artisanatUpdates).length > 0) {
        await artisanat.update(artisanatUpdates, { transaction });
      }

      // ⚡ MAJ Oeuvre avec champs multilingues
      const oeuvreUpdates = {};
      if (titre !== undefined) {
        if (typeof titre === 'object') {
          oeuvreUpdates.titre = mergeTranslations(artisanat.Oeuvre.titre, titre);
        } else {
          oeuvreUpdates.titre = mergeTranslations(artisanat.Oeuvre.titre, { [lang]: titre });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object') {
          oeuvreUpdates.description = mergeTranslations(artisanat.Oeuvre.description, description);
        } else {
          oeuvreUpdates.description = mergeTranslations(artisanat.Oeuvre.description, { [lang]: description });
        }
      }

      ['id_type_oeuvre', 'id_langue', 'annee_creation', 'statut'].forEach(field => {
        if (otherUpdates[field] !== undefined) {
          oeuvreUpdates[field] = otherUpdates[field];
        }
      });

      if (Object.keys(oeuvreUpdates).length > 0) {
        await artisanat.Oeuvre.update(oeuvreUpdates, { transaction });
      }

      await transaction.commit();

      const artisanatComplet = await this.getArtisanatComplet(id);

      // ⚡ Traduire
      res.json({
        success: true,
        message: 'Artisanat mis à jour avec succès',
        data: translateDeep(artisanatComplet, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Supprimer un artisanat
   */
  async deleteArtisanat(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [{ model: this.models.Oeuvre }]
      });

      if (!artisanat) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Artisanat non trouvé'
        });
      }

      // Vérifier les permissions
      if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      // Soft delete
      await artisanat.Oeuvre.update({ statut: 'archive' }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Artisanat supprimé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la suppression:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ⚡ Récupérer toutes les traductions d'un artisanat (admin)
  async getArtisanatTranslations(req, res) {
    try {
      const { id } = req.params;

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [{
          model: this.models.Oeuvre,
          attributes: ['id_oeuvre', 'titre', 'description']
        }]
      });

      if (!artisanat) {
        return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
      }

      res.json({
        success: true,
        data: {
          id_artisanat: artisanat.id_artisanat,
          titre: artisanat.Oeuvre.titre,
          description: artisanat.Oeuvre.description
        }
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ⚡ Mettre à jour une traduction spécifique (admin)
  async updateArtisanatTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { titre, description } = req.body;

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [{ model: this.models.Oeuvre }]
      });

      if (!artisanat) {
        return res.status(404).json({ success: false, error: 'Artisanat non trouvé' });
      }

      const updates = {};
      if (titre) updates.titre = mergeTranslations(artisanat.Oeuvre.titre, { [lang]: titre });
      if (description) updates.description = mergeTranslations(artisanat.Oeuvre.description, { [lang]: description });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Aucune donnée à mettre à jour' });
      }

      await artisanat.Oeuvre.update(updates);
      res.json({ success: true, message: `Traduction ${lang} mise à jour`, data: artisanat.Oeuvre });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  async getArtisanatComplet(id) {
    return await this.models.Artisanat.findByPk(id, {
      include: [
        {
          model: this.models.Oeuvre,
          include: [
            { model: this.models.User, as: 'Saiseur' },
            { model: this.models.Categorie },
            { model: this.models.TagMotCle },
            { model: this.models.Media }
          ]
        },
        { model: this.models.Materiau },
        { model: this.models.Technique }
      ]
    });
  }

  async getArtisanatStatistics(artisanatId) {
    const artisanat = await this.models.Artisanat.findByPk(artisanatId);
    
    const [nombreFavoris, nombreCommentaires] = await Promise.all([
      this.models.Favori.count({ 
        where: { 
          type_entite: 'artisanat',
          id_entite: artisanatId 
        } 
      }),
      this.models.Commentaire.count({ 
        where: { id_oeuvre: artisanat.id_oeuvre } 
      })
    ]);

    return {
      nombre_favoris: nombreFavoris,
      nombre_commentaires: nombreCommentaires,
      nombre_vues: 0
    };
  }

  async checkDisponibilite(artisanatId) {
    return true;
  }

  async getArtisanatsSimilaires(artisanat, limit = 4) {
    const similaires = await this.models.Artisanat.findAll({
      where: {
        id_artisanat: { [Op.ne]: artisanat.id_artisanat },
        [Op.or]: [
          { id_materiau: artisanat.id_materiau },
          { id_technique: artisanat.id_technique }
        ]
      },
      include: [
        {
          model: this.models.Oeuvre,
          where: { statut: 'publie' },
          include: [
            {
              model: this.models.Media,
              attributes: ['url', 'thumbnail_url'],
              limit: 1
            },
            {
              model: this.models.User,
              as: 'Saiseur',
              attributes: ['nom', 'prenom']
            }
          ]
        },
        { model: this.models.Materiau, attributes: ['nom'] },
        { model: this.models.Technique, attributes: ['nom'] }
      ],
      limit,
      order: this.sequelize.random()
    });

    return similaires;
  }

  async getAutresCreationsArtisan(artisanId, excludeId, limit = 6) {
    const creations = await this.models.Artisanat.findAll({
      where: {
        id_artisanat: { [Op.ne]: excludeId }
      },
      include: [
        {
          model: this.models.Oeuvre,
          where: { 
            statut: 'publie',
            saisi_par: artisanId
          },
          include: [
            {
              model: this.models.Media,
              attributes: ['url', 'thumbnail_url'],
              limit: 1
            }
          ]
        },
        { model: this.models.Materiau, attributes: ['nom'] },
        { model: this.models.Technique, attributes: ['nom'] }
      ],
      limit,
      order: [[this.models.Oeuvre, 'date_creation', 'DESC']]
    });

    return creations;
  }
}

module.exports = ArtisanatController;
