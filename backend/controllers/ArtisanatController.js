const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class ArtisanatController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    // Configuration pour l'upload de médias spécifique à l'artisanat
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
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max (plus grand pour vidéos HD)
      },
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

  // ========================================================================
  // RÉCUPÉRATION ET LISTING
  // ========================================================================

  /**
   * Récupérer tous les produits artisanaux avec filtres avancés
   */
  async getAllArtisanats(req, res) {
    try {
      const { 
        page = 1, 
        limit = 12, // 12 pour une grille 3x4
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

      // Filtres sur la table Oeuvre
      const oeuvreWhere = {
        statut: 'publie'
      };

      // Recherche textuelle
      if (search) {
        oeuvreWhere[Op.or] = [
          { titre: { [Op.like]: '%' + search + '%' } },
          { description: { [Op.like]: '%' + search + '%' } }
        ];
      }

      // Filtre par artisan
      if (artisan) {
        oeuvreWhere.saisi_par = artisan;
      }

      // Filtres sur la table Artisanat
      if (materiau) where.id_materiau = materiau;
      if (technique) where.id_technique = technique;
      
      if (prix_min || prix_max) {
        where.prix = {};
        if (prix_min) where.prix[Op.gte] = parseFloat(prix_min);
        if (prix_max) where.prix[Op.lte] = parseFloat(prix_max);
      }

      // Inclusions
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
              limit: 1 // Image principale
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

      // Tri
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
          // Tri par nombre de favoris
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

      // Enrichir avec des statistiques
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

      res.json({
        success: true,
        data: {
          artisanats: artisanatsWithStats,
          pagination: {
            total: artisanats.count,
            page: parseInt(page),
            pages: Math.ceil(artisanats.count / limit),
            limit: parseInt(limit)
          }
        }
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
   * Récupérer un artisanat par ID avec tous les détails
   */
  async getArtisanatById(req, res) {
    try {
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

      // Récupérer les statistiques et produits similaires
      const [stats, similaires] = await Promise.all([
        this.getArtisanatStatistics(id),
        this.getArtisanatsSimilaires(artisanat)
      ]);

      // Récupérer les autres créations de l'artisan
      const autresCreations = await this.getAutresCreationsArtisan(
        artisanat.Oeuvre.saisi_par, 
        id
      );

      res.json({
        success: true,
        data: {
          ...artisanat.toJSON(),
          statistiques: stats,
          disponible: await this.checkDisponibilite(id),
          produits_similaires: similaires,
          autres_creations_artisan: autresCreations
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'artisanat:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // CRÉATION ET MODIFICATION
  // ========================================================================

  /**
   * Créer un nouveau produit artisanal
   */
  async createArtisanat(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const {
        // Données de l'œuvre
        titre,
        description,
        id_langue,
        annee_creation,
        
        // Données spécifiques à l'artisanat
        id_materiau,
        id_technique,
        dimensions,
        poids,
        prix,
        
        // Relations
        categories = [],
        tags = []
      } = req.body;

      // Validation
      if (!titre || !id_materiau || !id_technique || !prix) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs titre, matériau, technique et prix sont obligatoires'
        });
      }

      // Récupérer l'ID du type "Artisanat"
      const typeArtisanat = await this.models.TypeOeuvre.findOne({
        where: { nom_type: { [Op.like]: '%artisanat%' } }
      });

      if (!typeArtisanat) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          error: 'Type artisanat non configuré dans le système'
        });
      }

      // Créer l'œuvre principale
      const oeuvre = await this.models.Oeuvre.create({
        titre,
        id_type_oeuvre: typeArtisanat.id_type_oeuvre,
        id_langue: id_langue || 1, // Langue par défaut
        annee_creation: annee_creation || new Date().getFullYear(),
        description,
        saisi_par: req.user.id_user,
        statut: 'publie', // Publication directe pour l'artisanat
        date_creation: new Date()
      }, { transaction });

      // Créer l'artisanat
      const artisanat = await this.models.Artisanat.create({
        id_oeuvre: oeuvre.id_oeuvre,
        id_materiau,
        id_technique,
        dimensions,
        poids,
        prix,
        date_creation: new Date()
      }, { transaction });

      // Ajouter les catégories
      if (categories.length > 0) {
        const categoriesExistantes = await this.models.Categorie.findAll({
          where: { id_categorie: { [Op.in]: categories } }
        });
        await oeuvre.addCategories(categoriesExistantes, { transaction });
      }

      // Ajouter les tags
      if (tags.length > 0) {
        const tagObjects = [];
        for (const tagNom of tags) {
          const [tag] = await this.models.TagMotCle.findOrCreate({
            where: { nom: tagNom },
            defaults: { nom: tagNom },
            transaction
          });
          tagObjects.push(tag);
        }
        await oeuvre.addTagMotCles(tagObjects, { transaction });
      }

      await transaction.commit();

      // Notifier les abonnés à l'artisan
      await this.notifyNewArtisanat(artisanat, oeuvre);

      // Récupérer l'artisanat complet
      const artisanatComplet = await this.getArtisanatComplet(artisanat.id_artisanat);

      res.status(201).json({
        success: true,
        message: 'Produit artisanal créé avec succès',
        data: artisanatComplet
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
   * Mettre à jour un produit artisanal
   */
  async updateArtisanat(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

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

      // Séparer les updates œuvre et artisanat
      const {
        titre,
        description,
        id_langue,
        annee_creation,
        categories,
        tags,
        ...artisanatUpdates
      } = updates;

      // Mettre à jour l'œuvre
      if (titre || description || id_langue || annee_creation) {
        await artisanat.Oeuvre.update({
          titre,
          description,
          id_langue,
          annee_creation,
          date_modification: new Date()
        }, { transaction });
      }

      // Mettre à jour l'artisanat
      await artisanat.update(artisanatUpdates, { transaction });

      // Mettre à jour les catégories
      if (categories !== undefined) {
        await artisanat.Oeuvre.setCategories(categories, { transaction });
      }

      // Mettre à jour les tags
      if (tags !== undefined) {
        const tagObjects = [];
        for (const tagNom of tags) {
          const [tag] = await this.models.TagMotCle.findOrCreate({
            where: { nom: tagNom },
            defaults: { nom: tagNom },
            transaction
          });
          tagObjects.push(tag);
        }
        await artisanat.Oeuvre.setTagMotCles(tagObjects, { transaction });
      }

      await transaction.commit();

      const artisanatComplet = await this.getArtisanatComplet(id);

      res.json({
        success: true,
        message: 'Produit artisanal mis à jour avec succès',
        data: artisanatComplet
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
   * Supprimer un produit artisanal
   */
  async deleteArtisanat(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [{ model: this.models.Oeuvre }]
      });

      if (!artisanat) {
        return res.status(404).json({ 
          success: false, 
          error: 'Artisanat non trouvé' 
        });
      }

      // Vérifier les permissions
      if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: 'Accès refusé' 
        });
      }

      // Soft delete de l'œuvre
      await artisanat.Oeuvre.update({ 
        statut: 'supprime',
        date_modification: new Date()
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Produit artisanal supprimé avec succès'
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

  // ========================================================================
  // GESTION DES MÉDIAS
  // ========================================================================

  /**
   * Upload de photos/vidéos pour l'artisanat
   */
  async uploadMedias(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { id } = req.params;
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni'
        });
      }

      const artisanat = await this.models.Artisanat.findByPk(id, {
        include: [{ model: this.models.Oeuvre }]
      });

      if (!artisanat) {
        return res.status(404).json({
          success: false,
          error: 'Artisanat non trouvé'
        });
      }

      // Vérifier les permissions
      if (artisanat.Oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      const mediaCreated = [];
      let ordre = await this.models.Media.max('ordre', {
        where: { id_oeuvre: artisanat.id_oeuvre }
      }) || 0;

      for (const file of files) {
        // Générer une miniature pour les images
        let thumbnailUrl = null;
        if (file.mimetype.startsWith('image/')) {
          // TODO: Implémenter la génération de miniatures
          thumbnailUrl = `/uploads/artisanat/${id}/thumb_${file.filename}`;
        }

        const media = await this.models.Media.create({
          id_oeuvre: artisanat.id_oeuvre,
          type_media: this.getMediaType(file.mimetype),
          url: `/uploads/artisanat/${id}/${file.filename}`,
          thumbnail_url: thumbnailUrl,
          titre: req.body.titre || file.originalname,
          description: req.body.description,
          taille_fichier: file.size,
          mime_type: file.mimetype,
          visible_public: true,
          ordre: ++ordre,
          metadata: {
            is_360: req.body.is_360 === 'true', // Vue 360°
            is_detail: req.body.is_detail === 'true' // Photo de détail
          }
        }, { transaction });

        mediaCreated.push(media);
      }

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: `${mediaCreated.length} média(s) ajouté(s) avec succès`,
        data: mediaCreated
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de l\'upload:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'upload'
      });
    }
  }

  // ========================================================================
  // RECHERCHE ET FILTRES SPÉCIALISÉS
  // ========================================================================

  /**
   * Recherche avancée d'artisanat
   */
  async searchArtisanats(req, res) {
    try {
      const { 
        q,
        materiaux = [], // Tableau d'IDs
        techniques = [], // Tableau d'IDs
        regions = [], // Tableau de wilayas
        prix_max,
        artisan_verifie = false
      } = req.query;

      const where = {};
      const oeuvreWhere = { statut: 'publie' };
      const userWhere = {};

      // Recherche textuelle
      if (q) {
        oeuvreWhere[Op.or] = [
          { titre: { [Op.like]: '%' + q + '%' } },
          { description: { [Op.like]: '%' + q + '%' } },
          this.sequelize.literal(`EXISTS (
            SELECT 1 FROM oeuvretags ot 
            INNER JOIN tagmotcle t ON ot.id_tag = t.id_tag 
            WHERE ot.id_oeuvre = Oeuvre.id_oeuvre 
            AND t.nom LIKE '%${q}%'
          )`)
        ];
      }

      // Filtres multiples
      if (materiaux.length > 0) {
        where.id_materiau = { [Op.in]: materiaux };
      }

      if (techniques.length > 0) {
        where.id_technique = { [Op.in]: techniques };
      }

      if (prix_max) {
        where.prix = { [Op.lte]: parseFloat(prix_max) };
      }

      // Filtre par région
      if (regions.length > 0) {
        userWhere.wilaya_residence = { [Op.in]: regions };
      }

      // Filtre artisan vérifié
      if (artisan_verifie) {
        userWhere.professionnel_valide = true;
        userWhere.type_user = 'artisan';
      }

      const artisanats = await this.models.Artisanat.findAll({
        where,
        include: [
          {
            model: this.models.Oeuvre,
            where: oeuvreWhere,
            include: [
              {
                model: this.models.User,
                as: 'Saiseur',
                where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'professionnel_valide'],
                include: [{
                  model: this.models.Wilaya,
                  attributes: ['nom']
                }]
              },
              {
                model: this.models.Media,
                attributes: ['url', 'thumbnail_url'],
                limit: 1
              }
            ]
          },
          { model: this.models.Materiau },
          { model: this.models.Technique }
        ],
        limit: 50,
        order: [[this.models.Oeuvre, 'date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: artisanats,
        count: artisanats.length
      });

    } catch (error) {
      console.error('Erreur recherche artisanat:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Obtenir les artisans par région
   */
  async getArtisansByRegion(req, res) {
    try {
      const { wilayaId } = req.params;

      const artisans = await this.models.User.findAll({
        where: {
          type_user: 'artisan',
          professionnel_valide: true,
          wilaya_residence: wilayaId
        },
        attributes: [
          'id_user', 
          'nom', 
          'prenom', 
          'photo_url', 
          'biographie',
          'specialites'
        ],
        include: [
          {
            model: this.models.Oeuvre,
            as: 'OeuvresSaisies',
            where: { statut: 'publie' },
            required: true,
            include: [{
              model: this.models.TypeOeuvre,
              where: { nom_type: { [Op.like]: '%artisanat%' } }
            }],
            attributes: []
          }
        ],
        group: ['User.id_user']
      });

      // Ajouter le nombre de créations pour chaque artisan
      const artisansWithStats = await Promise.all(
        artisans.map(async (artisan) => {
          const count = await this.models.Artisanat.count({
            include: [{
              model: this.models.Oeuvre,
              where: { 
                saisi_par: artisan.id_user,
                statut: 'publie'
              }
            }]
          });

          return {
            ...artisan.toJSON(),
            nombre_creations: count
          };
        })
      );

      res.json({
        success: true,
        data: artisansWithStats
      });

    } catch (error) {
      console.error('Erreur récupération artisans:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // STATISTIQUES ET ANALYTICS
  // ========================================================================

  /**
   * Statistiques générales de l'artisanat
   */
  async getStatistiques(req, res) {
    try {
      const [
        totalProduits,
        totalArtisans,
        parMateriau,
        parTechnique,
        parWilaya,
        prixMoyen
      ] = await Promise.all([
        // Total des produits
        this.models.Artisanat.count({
          include: [{
            model: this.models.Oeuvre,
            where: { statut: 'publie' }
          }]
        }),

        // Nombre d'artisans actifs
        this.models.User.count({
          where: {
            type_user: 'artisan',
            professionnel_valide: true
          },
          include: [{
            model: this.models.Oeuvre,
            as: 'OeuvresSaisies',
            where: { statut: 'publie' },
            required: true,
            include: [{
              model: this.models.TypeOeuvre,
              where: { nom_type: { [Op.like]: '%artisanat%' } }
            }]
          }]
        }),

        // Répartition par matériau
        this.models.Artisanat.findAll({
          attributes: [
            [this.sequelize.fn('COUNT', '*'), 'count']
          ],
          include: [
            {
              model: this.models.Oeuvre,
              where: { statut: 'publie' },
              attributes: []
            },
            {
              model: this.models.Materiau,
              attributes: ['nom']
            }
          ],
          group: ['Materiau.id_materiau', 'Materiau.nom']
        }),

        // Répartition par technique
        this.models.Artisanat.findAll({
          attributes: [
            [this.sequelize.fn('COUNT', '*'), 'count']
          ],
          include: [
            {
              model: this.models.Oeuvre,
              where: { statut: 'publie' },
              attributes: []
            },
            {
              model: this.models.Technique,
              attributes: ['nom']
            }
          ],
          group: ['Technique.id_technique', 'Technique.nom']
        }),

        // Répartition par wilaya
        this.models.Artisanat.findAll({
          attributes: [
            [this.sequelize.fn('COUNT', '*'), 'count']
          ],
          include: [
            {
              model: this.models.Oeuvre,
              where: { statut: 'publie' },
              include: [{
                model: this.models.User,
                as: 'Saiseur',
                attributes: [],
                include: [{
                  model: this.models.Wilaya,
                  attributes: ['nom']
                }]
              }]
            }
          ],
          group: ['Oeuvre->Saiseur->Wilaya.id_wilaya', 'Oeuvre->Saiseur->Wilaya.nom']
        }),

        // Prix moyen
        this.models.Artisanat.findOne({
          attributes: [
            [this.sequelize.fn('AVG', this.sequelize.col('prix')), 'moyenne']
          ],
          include: [{
            model: this.models.Oeuvre,
            where: { statut: 'publie' },
            attributes: []
          }]
        })
      ]);

      res.json({
        success: true,
        data: {
          total_produits: totalProduits,
          total_artisans: totalArtisans,
          prix_moyen: prixMoyen?.dataValues?.moyenne || 0,
          par_materiau: parMateriau.map(item => ({
            materiau: item.Materiau.nom,
            count: parseInt(item.dataValues.count)
          })),
          par_technique: parTechnique.map(item => ({
            technique: item.Technique.nom,
            count: parseInt(item.dataValues.count)
          })),
          par_wilaya: parWilaya.map(item => ({
            wilaya: item.Oeuvre?.Saiseur?.Wilaya?.nom || 'Non spécifié',
            count: parseInt(item.dataValues.count)
          }))
        }
      });

    } catch (error) {
      console.error('Erreur statistiques artisanat:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================================================

  /**
   * Récupérer un artisanat complet
   */
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

  /**
   * Obtenir les statistiques d'un artisanat
   */
  async getArtisanatStatistics(artisanatId) {
    const artisanat = await this.models.Artisanat.findByPk(artisanatId);
    
    const [
      nombreFavoris,
      nombreCommentaires,
      nombreVues
    ] = await Promise.all([
      this.models.Favori.count({ 
        where: { 
          type_entite: 'artisanat',
          id_entite: artisanatId 
        } 
      }),
      this.models.Commentaire.count({ 
        where: { id_oeuvre: artisanat.id_oeuvre } 
      }),
      // Nombre de vues (à implémenter selon votre système)
      0
    ]);

    return {
      nombre_favoris: nombreFavoris,
      nombre_commentaires: nombreCommentaires,
      nombre_vues: nombreVues
    };
  }

  /**
   * Vérifier la disponibilité d'un artisanat
   */
  async checkDisponibilite(artisanatId) {
    // TODO: Implémenter selon votre logique de stock/disponibilité
    // Pour l'instant, on retourne toujours true
    return true;
  }

  /**
   * Obtenir des artisanats similaires
   */
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

  /**
   * Obtenir les autres créations d'un artisan
   */
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

  /**
   * Déterminer le type de média
   */
  getMediaType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'autre';
  }

  /**
   * Notifier nouveau produit artisanal
   */
  async notifyNewArtisanat(artisanat, oeuvre) {
    try {
      // TODO: Implémenter la notification aux abonnés
      console.log('Nouveau produit artisanal créé:', oeuvre.titre);
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  }
}

module.exports = ArtisanatController;