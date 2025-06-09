const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

class OeuvreController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    // Configuration pour l'upload de médias
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const dir = path.join('uploads', 'oeuvres', req.params.id || 'temp');
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
        fileSize: 50 * 1024 * 1024 // 50MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Type de fichier non autorisé'));
        }
      }
    });
  }

  // ========================================================================
  // CRUD DE BASE
  // ========================================================================

  /**
   * Récupérer toutes les œuvres avec pagination et filtres
   */
  async getAllOeuvres(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        type, 
        langue, 
        statut = 'publie',
        annee_min,
        annee_max,
        auteur,
        search,
        sort = 'recent',
        with_critiques = false,
        editeur_id
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Exclure l'artisanat (qui a son propre module)
      where.id_type_oeuvre = {
        [Op.ne]: await this.getArtisanatTypeId()
      };

      // Filtres de base
      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      if (statut) where.statut = statut;
      
      // Filtre par année
      if (annee_min || annee_max) {
        where.annee_creation = {};
        if (annee_min) where.annee_creation[Op.gte] = parseInt(annee_min);
        if (annee_max) where.annee_creation[Op.lte] = parseInt(annee_max);
      }

      // Recherche textuelle
      if (search) {
        where[Op.or] = [
          { titre: { [Op.like]: '%' + search + '%' } },
          { description: { [Op.like]: '%' + search + '%' } }
        ];
      }

      // Inclusions de base
      const include = [
        { 
          model: this.models.TypeOeuvre,
          attributes: ['nom_type', 'description']
        },
        { 
          model: this.models.Langue,
          attributes: ['nom', 'code']
        },
        { 
          model: this.models.User, 
          as: 'Saiseur', 
          attributes: ['nom', 'prenom', 'type_user']
        },
        {
          model: this.models.Categorie,
          through: { attributes: [] },
          attributes: ['id_categorie', 'nom']
        },
        {
          model: this.models.Media,
          attributes: ['id_media', 'type_media', 'url', 'titre', 'thumbnail_url'],
          required: false
        }
      ];

      // Inclure les critiques si demandé
      if (with_critiques === 'true') {
        include.push({
          model: this.models.CritiqueEvaluation,
          attributes: ['note', 'commentaire', 'date_creation'],
          include: [{
            model: this.models.User,
            attributes: ['nom', 'prenom']
          }],
          required: false
        });
      }

      // Filtre par éditeur
      if (editeur_id) {
        include.push({
          model: this.models.Editeur,
          through: { 
            model: this.models.OeuvreEditeur,
            where: { id_editeur: editeur_id }
          },
          required: true
        });
      }

      // Tri
      let order;
      switch (sort) {
        case 'recent':
          order = [['date_creation', 'DESC']];
          break;
        case 'title':
          order = [['titre', 'ASC']];
          break;
        case 'year':
          order = [['annee_creation', 'DESC']];
          break;
        case 'rating':
          // Tri par note moyenne des critiques
          order = [[this.sequelize.literal('(SELECT AVG(note) FROM critique_evaluation WHERE critique_evaluation.id_oeuvre = Oeuvre.id_oeuvre)'), 'DESC NULLS LAST']];
          break;
        default:
          order = [['date_creation', 'DESC']];
      }

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include,
        order,
        distinct: true
      });

      // Ajouter les statistiques pour chaque œuvre
      const oeuvresWithStats = await Promise.all(oeuvres.rows.map(async (oeuvre) => {
        const stats = await this.getOeuvreStatistics(oeuvre.id_oeuvre);
        return {
          ...oeuvre.toJSON(),
          statistiques: stats
        };
      }));

      res.json({
        success: true,
        data: {
          oeuvres: oeuvresWithStats,
          pagination: {
            total: oeuvres.count,
            page: parseInt(page),
            pages: Math.ceil(oeuvres.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des œuvres:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des œuvres' 
      });
    }
  }

  /**
   * Récupérer une œuvre par ID avec TOUTES ses relations
   */
  async getOeuvreById(req, res) {
    try {
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id, {
        include: [
          // Informations de base
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom', 'email'] },
          { model: this.models.User, as: 'Validateur', attributes: ['nom', 'prenom'] },
          
          // Œuvre originale (pour les traductions)
          {
            model: this.models.Oeuvre,
            as: 'OeuvreOriginale',
            attributes: ['id_oeuvre', 'titre', 'id_langue'],
            include: [{
              model: this.models.Langue,
              attributes: ['nom', 'code']
            }]
          },
          
          // Catégories et tags
          {
            model: this.models.Categorie,
            through: { attributes: [] }
          },
          {
            model: this.models.TagMotCle,
            through: { attributes: [] }
          },
          
          // Éditeurs avec détails de liaison
          {
            model: this.models.Editeur,
            through: { 
              model: this.models.OeuvreEditeur,
              attributes: ['role_editeur', 'date_edition', 'isbn_editeur', 'tirage', 'prix_vente']
            }
          },
          
          // Détails spécialisés selon le type (SANS ARTISANAT)
          { model: this.models.Livre },
          { model: this.models.Film },
          { model: this.models.AlbumMusical },
          { model: this.models.Article },
          { model: this.models.ArticleScientifique },
          { model: this.models.OeuvreArt },
          
          // Médias
          { 
            model: this.models.Media,
            order: [['ordre', 'ASC']]
          },
          
          // Critiques et évaluations
          {
            model: this.models.CritiqueEvaluation,
            include: [{
              model: this.models.User,
              attributes: ['nom', 'prenom', 'photo_url']
            }],
            order: [['date_creation', 'DESC']]
          },
          
          // Événements associés
          {
            model: this.models.Evenement,
            through: { 
              model: this.models.EvenementOeuvre,
              attributes: ['ordre_presentation', 'duree_presentation', 'description_presentation']
            },
            attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'statut'],
            required: false
          }
        ]
      });

      if (!oeuvre) {
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      // Ajouter les statistiques
      const stats = await this.getOeuvreStatistics(id);
      
      res.json({
        success: true,
        data: {
          ...oeuvre.toJSON(),
          statistiques: stats
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération de l\'œuvre' 
      });
    }
  }

  /**
   * Créer une nouvelle œuvre COMPLÈTE
   */
  async createOeuvre(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const {
        // Champs de base
        titre,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        description,
        id_oeuvre_originale, // Pour les traductions
        
        // Relations
        categories = [],
        tags = [],
        editeurs = [], // [{id_editeur, role_editeur, date_edition, isbn_editeur, ...}]
        
        // Détails spécifiques selon le type
        details_specifiques = {}
      } = req.body;

      // Validation des champs obligatoires
      if (!titre || !id_type_oeuvre || !id_langue) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs titre, type d\'œuvre et langue sont obligatoires'
        });
      }

      // Vérifier que ce n'est pas un artisanat
      const artisanatTypeId = await this.getArtisanatTypeId();
      if (id_type_oeuvre === artisanatTypeId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'L\'artisanat doit être créé via le module dédié'
        });
      }

      // Vérifier l'unicité du titre pour cette langue et œuvre originale
      const existingOeuvre = await this.models.Oeuvre.findOne({
        where: { 
          titre, 
          id_langue,
          id_oeuvre_originale: id_oeuvre_originale || null
        }
      });

      if (existingOeuvre) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          error: 'Une œuvre avec ce titre existe déjà dans cette langue'
        });
      }

      // Créer l'œuvre principale
      const oeuvre = await this.models.Oeuvre.create({
        titre,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        description,
        id_oeuvre_originale,
        saisi_par: req.user?.id_user,
        statut: 'brouillon',
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

      // Ajouter les éditeurs avec leurs détails
      if (editeurs.length > 0) {
        for (const editeur of editeurs) {
          await this.models.OeuvreEditeur.create({
            id_oeuvre: oeuvre.id_oeuvre,
            id_editeur: editeur.id_editeur,
            role_editeur: editeur.role_editeur || 'principal',
            date_edition: editeur.date_edition,
            isbn_editeur: editeur.isbn_editeur,
            tirage: editeur.tirage,
            prix_vente: editeur.prix_vente,
            langue_edition: editeur.langue_edition,
            format: editeur.format,
            statut_edition: editeur.statut_edition || 'disponible',
            notes: editeur.notes
          }, { transaction });
        }
      }

      // Créer les détails spécifiques selon le type
      const typeOeuvre = await this.models.TypeOeuvre.findByPk(id_type_oeuvre);
      if (typeOeuvre && details_specifiques) {
        await this.createSpecificDetails(oeuvre, typeOeuvre, details_specifiques, transaction);
      }

      await transaction.commit();

      // Créer une notification pour l'administrateur
      await this.notifyNewOeuvre(oeuvre);

      // Récupérer l'œuvre complète pour la réponse
      const oeuvreComplete = await this.getOeuvreComplete(oeuvre.id_oeuvre);

      res.status(201).json({
        success: true,
        message: 'Œuvre créée avec succès',
        data: oeuvreComplete
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création de l\'œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création de l\'œuvre' 
      });
    }
  }

  /**
   * Mettre à jour une œuvre complètement
   */
  async updateOeuvre(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      // Vérifier les permissions (déjà fait par le middleware requireOwnership)

      // Mettre à jour les champs de base
      const { 
        categories, 
        tags, 
        editeurs,
        details_specifiques, 
        ...baseUpdates 
      } = updates;
      
      await oeuvre.update({
        ...baseUpdates,
        date_modification: new Date()
      }, { transaction });

      // Mettre à jour les catégories
      if (categories !== undefined) {
        await oeuvre.setCategories(categories, { transaction });
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
        await oeuvre.setTagMotCles(tagObjects, { transaction });
      }

      // Mettre à jour les éditeurs
      if (editeurs !== undefined) {
        // Supprimer les liaisons existantes
        await this.models.OeuvreEditeur.destroy({
          where: { id_oeuvre: id },
          transaction
        });

        // Créer les nouvelles liaisons
        for (const editeur of editeurs) {
          await this.models.OeuvreEditeur.create({
            id_oeuvre: id,
            ...editeur
          }, { transaction });
        }
      }

      // Mettre à jour les détails spécifiques
      if (details_specifiques) {
        const typeOeuvre = await this.models.TypeOeuvre.findByPk(oeuvre.id_type_oeuvre);
        if (typeOeuvre) {
          await this.updateSpecificDetails(oeuvre, typeOeuvre, details_specifiques, transaction);
        }
      }

      await transaction.commit();

      const oeuvreComplete = await this.getOeuvreComplete(id);

      res.json({
        success: true,
        message: 'Œuvre mise à jour avec succès',
        data: oeuvreComplete
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour de l\'œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la mise à jour de l\'œuvre' 
      });
    }
  }

  /**
   * Supprimer une œuvre (soft delete)
   */
  async deleteOeuvre(req, res) {
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
      await oeuvre.update({ 
        statut: 'supprime',
        date_modification: new Date()
      });

      res.json({
        success: true,
        message: 'Œuvre supprimée avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression de l\'œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la suppression de l\'œuvre' 
      });
    }
  }

  // ========================================================================
  // VALIDATION ET MODÉRATION
  // ========================================================================

  /**
   * Valider ou rejeter une œuvre (admin)
   */
  async validateOeuvre(req, res) {
    try {
      const { id } = req.params;
      const { statut, raison_rejet } = req.body;

      if (!['publie', 'rejete'].includes(statut)) {
        return res.status(400).json({
          success: false,
          error: 'Statut invalide. Doit être "publie" ou "rejete"'
        });
      }

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      const updateData = {
        statut,
        validateur_id: req.user?.id_user,
        date_validation: new Date(),
        date_modification: new Date()
      };

      if (statut === 'rejete' && raison_rejet) {
        updateData.raison_rejet = raison_rejet;
      }

      await oeuvre.update(updateData);

      // Notifier l'auteur
      await this.notifyValidationStatus(oeuvre, statut, raison_rejet);

      res.json({
        success: true,
        message: `Œuvre ${statut === 'publie' ? 'publiée' : 'rejetée'} avec succès`,
        data: oeuvre
      });

    } catch (error) {
      console.error('Erreur lors de la validation de l\'œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la validation de l\'œuvre' 
      });
    }
  }

  // ========================================================================
  // GESTION DES MÉDIAS
  // ========================================================================

  /**
   * Uploader des médias pour une œuvre
   */
  async uploadMedia(req, res) {
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

      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      // Vérifier les permissions
      if (oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      const mediaCreated = [];

      for (const file of files) {
        const media = await this.models.Media.create({
          id_oeuvre: id,
          type_media: this.getMediaType(file.mimetype),
          url: `/uploads/oeuvres/${id}/${file.filename}`,
          titre: req.body.titre || file.originalname,
          description: req.body.description,
          taille_fichier: file.size,
          mime_type: file.mimetype,
          visible_public: true,
          ordre: req.body.ordre || 0
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

  /**
   * Récupérer les médias d'une œuvre
   */
  async getMedias(req, res) {
    try {
      const { id } = req.params;

      const medias = await this.models.Media.findAll({
        where: { id_oeuvre: id },
        order: [['ordre', 'ASC'], ['id_media', 'DESC']]
      });

      res.json({
        success: true,
        data: medias
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des médias:', error);
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
      const { id, mediaId } = req.params;

      const media = await this.models.Media.findOne({
        where: { 
          id_media: mediaId,
          id_oeuvre: id
        }
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: 'Média non trouvé'
        });
      }

      // Vérifier les permissions via l'œuvre
      const oeuvre = await this.models.Oeuvre.findByPk(id);
      if (oeuvre.saisi_par !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }

      // Supprimer le fichier physique
      try {
        await fs.unlink(path.join(__dirname, '..', media.url));
      } catch (err) {
        console.warn('Fichier introuvable:', err.message);
      }

      await media.destroy();

      res.json({
        success: true,
        message: 'Média supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du média:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // ========================================================================
  // RECHERCHE ET FILTRES
  // ========================================================================

  /**
   * Recherche avancée d'œuvres
   */
  async searchOeuvres(req, res) {
    try {
      const { 
        q,
        type,
        langue,
        annee_debut,
        annee_fin,
        categorie,
        editeur,
        note_min,
        limit = 20
      } = req.query;

      const where = {
        statut: 'publie',
        // Exclure l'artisanat
        id_type_oeuvre: {
          [Op.ne]: await this.getArtisanatTypeId()
        }
      };
      
      const include = [
        { model: this.models.TypeOeuvre },
        { model: this.models.Langue },
        {
          model: this.models.Categorie,
          through: { attributes: [] }
        }
      ];

      // Recherche textuelle générale
      if (q) {
        where[Op.or] = [
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

      // Filtres spécifiques
      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      
      if (annee_debut || annee_fin) {
        where.annee_creation = {};
        if (annee_debut) where.annee_creation[Op.gte] = parseInt(annee_debut);
        if (annee_fin) where.annee_creation[Op.lte] = parseInt(annee_fin);
      }

      // Filtre par catégorie
      if (categorie) {
        include.push({
          model: this.models.Categorie,
          where: { id_categorie: categorie },
          through: { attributes: [] },
          required: true
        });
      }

      // Filtre par éditeur
      if (editeur) {
        include.push({
          model: this.models.Editeur,
          where: { id_editeur: editeur },
          through: { attributes: [] },
          required: true
        });
      }

      // Filtre par note minimum
      if (note_min) {
        where[Op.and] = [
          this.sequelize.literal(`(
            SELECT AVG(note) FROM critique_evaluation 
            WHERE critique_evaluation.id_oeuvre = Oeuvre.id_oeuvre
          ) >= ${parseInt(note_min)}`)
        ];
      }

      const oeuvres = await this.models.Oeuvre.findAll({
        where,
        include,
        limit: parseInt(limit),
        order: [['date_creation', 'DESC']],
        subQuery: false
      });

      res.json({
        success: true,
        data: oeuvres,
        count: oeuvres.length
      });

    } catch (error) {
      console.error('Erreur lors de la recherche d\'œuvres:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la recherche' 
      });
    }
  }

  // ========================================================================
  // PARTAGE SOCIAL
  // ========================================================================

  /**
   * Générer les liens de partage social pour une œuvre
   */
  async getShareLinks(req, res) {
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

      const baseUrl = process.env.FRONTEND_URL || 'https://actionculture.dz';
      const url = `${baseUrl}/oeuvres/${id}`;
      const title = encodeURIComponent(oeuvre.titre);
      const description = encodeURIComponent(oeuvre.description?.substring(0, 100) || '');

      const shareLinks = {
        facebook: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        twitter: `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        whatsapp: `https://wa.me/?text=${title}%20${encodeURIComponent(url)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${title}`,
        email: `mailto:?subject=${title}&body=${description}%0A%0A${encodeURIComponent(url)}`
      };

      res.json({ 
        success: true, 
        data: shareLinks 
      });

    } catch (error) {
      console.error('Erreur lors de la génération des liens:', error);
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
   * Créer les détails spécifiques selon le type d'œuvre
   */
  async createSpecificDetails(oeuvre, typeOeuvre, details, transaction) {
    const typeName = typeOeuvre.nom_type.toLowerCase();
    
    switch (typeName) {
      case 'livre':
        if (details.livre) {
          await this.models.Livre.create({
            id_oeuvre: oeuvre.id_oeuvre,
            isbn: details.livre.isbn,
            nb_pages: details.livre.nb_pages,
            id_genre: details.livre.id_genre
          }, { transaction });
        }
        break;
        
      case 'film':
        if (details.film) {
          await this.models.Film.create({
            id_oeuvre: oeuvre.id_oeuvre,
            duree_minutes: details.film.duree_minutes,
            realisateur: details.film.realisateur,
            id_genre: details.film.id_genre
          }, { transaction });
        }
        break;
        
      case 'album musical':
        if (details.album) {
          await this.models.AlbumMusical.create({
            id_oeuvre: oeuvre.id_oeuvre,
            duree: details.album.duree,
            id_genre: details.album.id_genre,
            label: details.album.label
          }, { transaction });
        }
        break;
        
      case 'article':
        if (details.article) {
          await this.models.Article.create({
            id_oeuvre: oeuvre.id_oeuvre,
            auteur: details.article.auteur,
            source: details.article.source,
            type_article: details.article.type_article,
            categorie: details.article.categorie,
            date_publication: details.article.date_publication,
            url_source: details.article.url_source
          }, { transaction });
        }
        break;
        
      case 'article scientifique':
        if (details.article_scientifique) {
          await this.models.ArticleScientifique.create({
            id_oeuvre: oeuvre.id_oeuvre,
            journal: details.article_scientifique.journal,
            doi: details.article_scientifique.doi,
            pages: details.article_scientifique.pages,
            volume: details.article_scientifique.volume,
            numero: details.article_scientifique.numero,
            peer_reviewed: details.article_scientifique.peer_reviewed || false,
            open_access: details.article_scientifique.open_access || false
          }, { transaction });
        }
        break;
        
      case 'oeuvre art':
      case 'art':
        if (details.oeuvre_art) {
          await this.models.OeuvreArt.create({
            id_oeuvre: oeuvre.id_oeuvre,
            technique: details.oeuvre_art.technique,
            dimensions: details.oeuvre_art.dimensions,
            support: details.oeuvre_art.support
          }, { transaction });
        }
        break;
    }
  }

  /**
   * Mettre à jour les détails spécifiques
   */
  async updateSpecificDetails(oeuvre, typeOeuvre, details, transaction) {
    const typeName = typeOeuvre.nom_type.toLowerCase();
    
    switch (typeName) {
      case 'livre':
        const livre = await this.models.Livre.findOne({ 
          where: { id_oeuvre: oeuvre.id_oeuvre } 
        });
        if (livre && details.livre) {
          await livre.update(details.livre, { transaction });
        } else if (!livre && details.livre) {
          await this.models.Livre.create({
            id_oeuvre: oeuvre.id_oeuvre,
            ...details.livre
          }, { transaction });
        }
        break;
        
      case 'film':
        const film = await this.models.Film.findOne({ 
          where: { id_oeuvre: oeuvre.id_oeuvre } 
        });
        if (film && details.film) {
          await film.update(details.film, { transaction });
        } else if (!film && details.film) {
          await this.models.Film.create({
            id_oeuvre: oeuvre.id_oeuvre,
            ...details.film
          }, { transaction });
        }
        break;
        
      // Ajouter les autres cas de la même manière...
    }
  }

  /**
   * Récupérer une œuvre complète avec toutes ses relations
   */
  async getOeuvreComplete(id) {
    return await this.models.Oeuvre.findByPk(id, {
      include: [
        { model: this.models.TypeOeuvre },
        { model: this.models.Langue },
        { model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom'] },
        {
          model: this.models.Categorie,
          through: { attributes: [] }
        },
        {
          model: this.models.TagMotCle,
          through: { attributes: [] }
        },
        {
          model: this.models.Editeur,
          through: { 
            model: this.models.OeuvreEditeur,
            attributes: ['role_editeur', 'date_edition']
          }
        },
        { model: this.models.Media }
      ]
    });
  }

  /**
   * Obtenir les statistiques d'une œuvre
   */
  async getOeuvreStatistics(oeuvreId) {
    const [
      noteMoyenne,
      nombreCritiques,
      nombreFavoris,
      nombreCommentaires
    ] = await Promise.all([
      this.models.CritiqueEvaluation.findOne({
        where: { id_oeuvre: oeuvreId },
        attributes: [[this.sequelize.fn('AVG', this.sequelize.col('note')), 'moyenne']]
      }),
      this.models.CritiqueEvaluation.count({ where: { id_oeuvre: oeuvreId } }),
      this.models.Favori.count({ 
        where: { 
          type_entite: 'oeuvre',
          id_entite: oeuvreId 
        } 
      }),
      this.models.Commentaire.count({ where: { id_oeuvre: oeuvreId } })
    ]);

    return {
      note_moyenne: noteMoyenne?.dataValues?.moyenne || 0,
      nombre_critiques: nombreCritiques,
      nombre_favoris: nombreFavoris,
      nombre_commentaires: nombreCommentaires
    };
  }

  /**
   * Obtenir l'ID du type artisanat
   */
  async getArtisanatTypeId() {
    const type = await this.models.TypeOeuvre.findOne({
      where: { nom_type: { [Op.like]: '%artisanat%' } }
    });
    return type?.id_type_oeuvre || -1;
  }

  /**
   * Déterminer le type de média selon le mimetype
   */
  getMediaType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf')) return 'document';
    return 'autre';
  }

  /**
   * Créer une notification pour une nouvelle œuvre
   */
  async notifyNewOeuvre(oeuvre) {
    try {
      // Notifier les admins
      const admins = await this.models.User.findAll({
        include: [{
          model: this.models.Role,
          where: { nom_role: 'Admin' },
          through: { attributes: [] }
        }]
      });

      for (const admin of admins) {
        await this.models.Notification.create({
          id_user: admin.id_user,
          type_notification: 'nouvelle_oeuvre',
          titre: 'Nouvelle œuvre à valider',
          message: `Une nouvelle œuvre "${oeuvre.titre}" a été soumise et attend validation.`,
          id_oeuvre: oeuvre.id_oeuvre,
          url_action: `/admin/oeuvres/${oeuvre.id_oeuvre}/validate`
        });
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  }

  /**
   * Notifier le statut de validation
   */
  async notifyValidationStatus(oeuvre, statut, raison) {
    try {
      await this.models.Notification.create({
        id_user: oeuvre.saisi_par,
        type_notification: 'validation_oeuvre',
        titre: statut === 'publie' ? 'Œuvre publiée' : 'Œuvre rejetée',
        message: statut === 'publie' 
          ? `Votre œuvre "${oeuvre.titre}" a été publiée avec succès.`
          : `Votre œuvre "${oeuvre.titre}" a été rejetée. ${raison || ''}`,
        id_oeuvre: oeuvre.id_oeuvre,
        url_action: `/mes-oeuvres/${oeuvre.id_oeuvre}`
      });
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  }
}

module.exports = OeuvreController;