// controllers/OeuvreController.js - Version complète régénérée
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

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
   * Liste des œuvres avec pagination
   */
  async list(req, res) {
    try {
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
      
      // Recherche
      if (search) {
        where[Op.or] = [
          { titre: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
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
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          oeuvres: result.rows,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        }
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

      res.json({
        success: true,
        data: oeuvre
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
   * Créer une nouvelle œuvre
   */
  async create(req, res) {
    let transaction;

    try {
      // Démarrer la transaction
      transaction = await this.sequelize.transaction();

      const {
        // Champs de base
        titre,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        description,
        prix,
        id_oeuvre_originale,
        
        // Relations
        categories = [],
        tags = [],
        editeurs = [],
        
        // Contributeurs
        utilisateurs_inscrits = [],
        intervenants_non_inscrits = [],
        nouveaux_intervenants = [],
        
        // Médias
        medias = [],
        
        // Détails spécifiques
        details_specifiques = {}
      } = req.body;

      console.log('📝 Création œuvre:', {
        titre,
        id_type_oeuvre,
        nb_categories: categories.length,
        nb_medias: medias.length,
        nb_files: req.files ? req.files.length : 0
      });

      // 1. Validation basique
      if (!titre || !id_type_oeuvre || !id_langue) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs titre, type d\'œuvre et langue sont obligatoires'
        });
      }

      // 2. S'assurer que categories est un tableau
      const categoriesArray = Array.isArray(categories) ? categories : categories ? [categories] : [];

      // 3. Créer l'œuvre principale
      const oeuvre = await this.models.Oeuvre.create({
        titre,
        id_type_oeuvre,
        id_langue,
        annee_creation,
        description,
        prix,
        id_oeuvre_originale,
        saisi_par: req.user?.id_user,
        statut: 'brouillon',
        date_creation: new Date()
      }, { transaction });

      console.log('✅ Œuvre créée avec ID:', oeuvre.id_oeuvre);

      // 4. Ajouter les catégories
      if (categoriesArray.length > 0) {
  for (const catId of categoriesArray) {
    await this.models.OeuvreCategorie.findOrCreate({
      where: {
        id_oeuvre: oeuvre.id_oeuvre,
        id_categorie: catId
      },
      defaults: {
        id_oeuvre: oeuvre.id_oeuvre,
        id_categorie: catId
      },
      transaction
    });
  }
  console.log(`✅ ${categoriesArray.length} catégorie(s) ajoutée(s)`);
}

      // 5. Ajouter les tags
      if (tags.length > 0) {
        for (const tagNom of tags) {
          const [tag] = await this.models.TagMotCle.findOrCreate({
            where: { nom: tagNom },
            defaults: { nom: tagNom },
            transaction
          });
          
          await this.models.OeuvreTag.create({
            id_oeuvre: oeuvre.id_oeuvre,
            id_tag: tag.id_tag
          }, { transaction });
        }
        console.log(`✅ ${tags.length} tag(s) ajouté(s)`);
      }

      // 6. Gérer les utilisateurs inscrits
      if (utilisateurs_inscrits.length > 0) {
        for (const user of utilisateurs_inscrits) {
          await this.models.OeuvreUser.create({
            id_oeuvre: oeuvre.id_oeuvre,
            id_user: user.id_user,
            id_type_user: user.id_type_user,
            personnage: user.personnage,
            ordre_apparition: user.ordre_apparition || 1,
            role_principal: user.role_principal ?? true,
            description_role: user.description_role
          }, { transaction });
        }
        console.log(`✅ ${utilisateurs_inscrits.length} utilisateur(s) inscrit(s) ajouté(s)`);
      }

      // 7. Gérer les intervenants non inscrits existants
      if (intervenants_non_inscrits.length > 0) {
        for (const intervenant of intervenants_non_inscrits) {
          await this.models.OeuvreIntervenant.create({
            id_oeuvre: oeuvre.id_oeuvre,
            id_intervenant: intervenant.id_intervenant,
            id_type_user: intervenant.id_type_user,
            personnage: intervenant.personnage,
            ordre_apparition: intervenant.ordre_apparition || 1,
            role_principal: intervenant.role_principal ?? true,
            description_role: intervenant.description_role
          }, { transaction });
        }
        console.log(`✅ ${intervenants_non_inscrits.length} intervenant(s) existant(s) ajouté(s)`);
      }

      // 8. Créer les nouveaux intervenants
      if (nouveaux_intervenants.length > 0) {
        for (const nouvelIntervenant of nouveaux_intervenants) {
          const intervenant = await this.findOrCreateIntervenant(nouvelIntervenant, transaction);

          await this.models.OeuvreIntervenant.create({
            id_oeuvre: oeuvre.id_oeuvre,
            id_intervenant: intervenant.id_intervenant,
            id_type_user: nouvelIntervenant.id_type_user,
            personnage: nouvelIntervenant.personnage,
            ordre_apparition: nouvelIntervenant.ordre_apparition || 1,
            role_principal: nouvelIntervenant.role_principal ?? true,
            description_role: nouvelIntervenant.description_role
          }, { transaction });
        }
        console.log(`✅ ${nouveaux_intervenants.length} nouvel(aux) intervenant(s) créé(s)`);
      }

      // 9. Ajouter les éditeurs
      if (editeurs.length > 0) {
        for (const editeur of editeurs) {
          await this.models.OeuvreEditeur.create({
            id_oeuvre: oeuvre.id_oeuvre,
            id_editeur: editeur.id_editeur,
            role_editeur: editeur.role_editeur || 'editeur_principal',
            date_edition: editeur.date_edition,
            isbn_editeur: editeur.isbn_editeur,
            tirage: editeur.tirage,
            prix_vente: editeur.prix_vente,
            langue_edition: editeur.langue_edition,
            format: editeur.format,
            statut_edition: editeur.statut_edition || 'en_cours',
            notes: editeur.notes
          }, { transaction });
        }
        console.log(`✅ ${editeurs.length} éditeur(s) ajouté(s)`);
      }

      // 10. Traitement des médias
      let ordre = 1;
      
      // 10.1 Traiter les fichiers uploadés via multipart/form-data
      if (req.files && req.files.length > 0) {
        console.log(`📎 ${req.files.length} fichier(s) uploadé(s) à traiter`);
        
        for (const file of req.files) {
          try {
            const mediaData = {
              id_oeuvre: oeuvre.id_oeuvre,
              type_media: this.detectMediaType(file.originalname || file.filename),
              titre: file.originalname || `Media ${ordre}`,
              description: `Fichier uploadé pour ${titre}`,
              url: `/uploads/oeuvres/${file.filename}`,
              thumbnail_url: null,
              nom_fichier: file.originalname,
              taille_fichier: file.size,
              mime_type: file.mimetype,
              ordre: ordre++,
              visible_public: true,
              date_creation: new Date()
            };

            // Générer thumbnail pour les images
            if (mediaData.type_media === 'image') {
              mediaData.thumbnail_url = mediaData.url;
            }

            await this.models.Media.create(mediaData, { transaction });
            console.log(`✅ Fichier média créé: ${file.originalname}`);
            
          } catch (fileError) {
            console.error(`❌ Erreur traitement fichier ${file.originalname}:`, fileError);
          }
        }
      }
      
      // 10.2 Traiter les médias passés dans le body
      if (medias.length > 0) {
        console.log(`📎 ${medias.length} média(s) dans le body à traiter`);
        
        for (const media of medias) {
          try {
            const mediaData = {
              id_oeuvre: oeuvre.id_oeuvre,
              type_media: media.type_media || this.detectMediaType(media.filename || media.url || 'default.jpg'),
              titre: media.titre || `Media ${ordre}`,
              description: media.description,
              ordre: media.ordre || ordre++,
              visible_public: media.visible_public ?? true,
              date_creation: new Date()
            };

            // Cas 1: URL externe
            if (media.url && (media.url.startsWith('http://') || media.url.startsWith('https://'))) {
              mediaData.url = media.url;
              mediaData.thumbnail_url = media.thumbnail_url || media.url;
            }
            // Cas 2: Fichier déjà uploadé (chemin relatif)
            else if (media.url && media.url.startsWith('/uploads/')) {
              mediaData.url = media.url;
              mediaData.thumbnail_url = media.thumbnail_url || media.url;
            }
            // Cas 3: Base64
            else if (media.base64) {
              const uploadResult = await this.processBase64Media(
                media.base64, 
                media.filename || `media-${Date.now()}.jpg`,
                oeuvre.id_oeuvre
              );
              mediaData.url = uploadResult.url;
              mediaData.thumbnail_url = uploadResult.thumbnail_url || uploadResult.url;
              mediaData.taille_fichier = uploadResult.size;
              mediaData.mime_type = uploadResult.mime_type;
              mediaData.nom_fichier = uploadResult.filename;
            }

            await this.models.Media.create(mediaData, { transaction });
            console.log(`✅ Média créé: ${mediaData.titre}`);
            
          } catch (mediaError) {
            console.error(`❌ Erreur ajout média ${media.titre}:`, mediaError);
          }
        }
      }

      // 11. Créer les détails spécifiques selon le type
      const typeOeuvre = await this.models.TypeOeuvre.findByPk(id_type_oeuvre, { transaction });
      if (typeOeuvre && details_specifiques && Object.keys(details_specifiques).length > 0) {
        await this.createSpecificDetails(oeuvre, typeOeuvre, details_specifiques, transaction);
      }

      // 12. Commit de la transaction
      await transaction.commit();
      console.log('✅ Transaction committée avec succès');

      // 13. Récupérer l'œuvre complète
      const oeuvreComplete = await this.models.Oeuvre.findByPk(oeuvre.id_oeuvre, {
  include: [
    { model: this.models.TypeOeuvre },
    { model: this.models.Langue },
    { model: this.models.Categorie },
    { model: this.models.TagMotCle },
    { model: this.models.Editeur },
    { model: this.models.Media, where: { visible_public: true }, required: false }
  ]
});

res.status(201).json({
  success: true,
  message: 'Œuvre créée avec succès',
  data: { 
    oeuvre: oeuvreComplete || oeuvre
  }
});

    } catch (error) {
      // Rollback si la transaction existe
      if (transaction && !transaction.finished) {
        try {
          await transaction.rollback();
          console.log('✅ Transaction rollback effectué');
        } catch (rollbackError) {
          console.error('❌ Erreur lors du rollback:', rollbackError);
        }
      }
      
      console.error('❌ Erreur création œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Erreur serveur lors de la création de l\'œuvre' 
      });
    }
  }

  /**
   * Alias pour create
   */
  async createOeuvre(req, res) {
    return this.create(req, res);
  }

  /**
   * Mettre à jour une œuvre
   */
  async update(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      // Récupérer l'œuvre existante
      const oeuvre = await this.models.Oeuvre.findByPk(id, { transaction });

      if (!oeuvre) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      // Mettre à jour les champs de base
      const fieldsToUpdate = [
        'titre', 'description', 'annee_creation', 'prix',
        'id_langue', 'id_type_oeuvre', 'details_specifiques'
      ];

      fieldsToUpdate.forEach(field => {
        if (updates[field] !== undefined) {
          oeuvre[field] = updates[field];
        }
      });

      oeuvre.date_modification = new Date();
      await oeuvre.save({ transaction });

      // Gérer les catégories
      if (updates.categories !== undefined) {
        await this.models.OeuvreCategorie.destroy({
          where: { id_oeuvre: id },
          transaction
        });

        for (const catId of updates.categories) {
          await this.models.OeuvreCategorie.create({
            id_oeuvre: id,
            id_categorie: catId
          }, { transaction });
        }
      }

      // Gérer les tags
      if (updates.tags !== undefined) {
        await this.models.OeuvreTag.destroy({
          where: { id_oeuvre: id },
          transaction
        });

        for (const tagNom of updates.tags) {
          const [tag] = await this.models.TagMotCle.findOrCreate({
            where: { nom: tagNom },
            defaults: { nom: tagNom },
            transaction
          });

          await this.models.OeuvreTag.create({
            id_oeuvre: id,
            id_tag: tag.id_tag
          }, { transaction });
        }
      }

      // Gérer les éditeurs
      if (updates.editeurs !== undefined) {
        await this.models.OeuvreEditeur.destroy({
          where: { id_oeuvre: id },
          transaction
        });

        for (const editeur of updates.editeurs) {
          await this.models.OeuvreEditeur.create({
            id_oeuvre: id,
            id_editeur: editeur.id_editeur,
            role_editeur: editeur.role_editeur || 'editeur_principal',
            date_edition: editeur.date_edition,
            isbn_editeur: editeur.isbn_editeur,
            prix_vente: editeur.prix_vente,
            statut_edition: editeur.statut_edition || 'en_cours',
            notes: editeur.notes
          }, { transaction });
        }
      }

      await transaction.commit();

      // Récupérer l'œuvre mise à jour
      const oeuvreComplete = await this.getById({ params: { id } }, { json: (data) => data });

      res.json({
        success: true,
        message: 'Œuvre mise à jour avec succès',
        data: oeuvreComplete.data || oeuvre
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur mise à jour œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la mise à jour' 
      });
    }
  }

  /**
   * Alias pour update
   */
  async updateOeuvre(req, res) {
    return this.update(req, res);
  }

  /**
   * Supprimer une œuvre
   */
  async delete(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;

      const oeuvre = await this.models.Oeuvre.findByPk(id, { transaction });

      if (!oeuvre) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      // Supprimer les médias associés
      const medias = await this.models.Media.findAll({
        where: { id_oeuvre: id },
        transaction
      });

      // TODO: Supprimer les fichiers physiques
      for (const media of medias) {
        if (media.url && media.url.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', media.url);
          try {
            await fs.unlink(filePath);
          } catch (err) {
            console.warn(`Impossible de supprimer le fichier: ${filePath}`);
          }
        }
      }

      // Suppression de l'œuvre (cascade supprimera les relations)
      await oeuvre.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Œuvre supprimée avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur suppression œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la suppression' 
      });
    }
  }

  /**
   * Alias pour delete
   */
  async deleteOeuvre(req, res) {
    return this.delete(req, res);
  }

  /**
   * Récupérer les œuvres récentes
   */
  async getRecent(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      
      const oeuvres = await this.models.Oeuvre.findAll({
        where: { statut: 'publie' },
        order: [['date_creation', 'DESC']],
        limit,
        include: [
          { 
            model: this.models.TypeOeuvre,
            attributes: ['id_type_oeuvre', 'nom_type']
          },
          { 
            model: this.models.Langue,
            attributes: ['id_langue', 'nom']
          },
          {
            model: this.models.Media,
            where: { visible_public: true },
            required: false,
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ]
      });

      res.json({
        success: true,
        data: {
          oeuvres,
          pagination: {
            total: oeuvres.length,
            page: 1,
            pages: 1,
            limit
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur récupération œuvres récentes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(req, res) {
    try {
      const [
        totalOeuvres,
        parType,
        parLangue,
        noteMoyenne
      ] = await Promise.all([
        // Total des œuvres publiées
        this.models.Oeuvre.count({ where: { statut: 'publie' } }),
        
        // Par type
        this.models.Oeuvre.findAll({
          attributes: [
            [this.sequelize.fn('COUNT', this.sequelize.col('Oeuvre.id_oeuvre')), 'count']
          ],
          include: [{
            model: this.models.TypeOeuvre,
            attributes: ['nom_type']
          }],
          where: { statut: 'publie' },
          group: ['TypeOeuvre.id_type_oeuvre', 'TypeOeuvre.nom_type'],
          raw: true
        }),
        
        // Par langue
        this.models.Oeuvre.findAll({
          attributes: [
            [this.sequelize.fn('COUNT', this.sequelize.col('Oeuvre.id_oeuvre')), 'count']
          ],
          include: [{
            model: this.models.Langue,
            attributes: ['nom']
          }],
          where: { statut: 'publie' },
          group: ['Langue.id_langue', 'Langue.nom'],
          raw: true
        }),
        
        // Note moyenne (si vous avez un système de notation)
        Promise.resolve(0)
      ]);

      res.json({
        success: true,
        data: {
          total: totalOeuvres,
          parType: parType.map(item => ({
            type: item['TypeOeuvre.nom_type'],
            count: parseInt(item.count)
          })),
          parLangue: parLangue.map(item => ({
            langue: item['Langue.nom'],
            count: parseInt(item.count)
          })),
          noteMoyenneGlobale: noteMoyenne
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
   * Recherche avancée
   */
  async search(req, res) {
    try {
      const {
        q,
        type,
        categorie,
        langue,
        annee_min,
        annee_max,
        editeur,
        prix_min,
        prix_max,
        page = 1,
        limit = 20
      } = req.query;

      const where = { statut: 'publie' };
      const include = [
        { model: this.models.TypeOeuvre },
        { model: this.models.Langue }
      ];

      // Recherche textuelle
      if (q) {
        where[Op.or] = [
          { titre: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } }
        ];
      }

      // Filtres
      if (type) where.id_type_oeuvre = type;
      if (langue) where.id_langue = langue;
      
      // Filtre par année
      if (annee_min || annee_max) {
        where.annee_creation = {};
        if (annee_min) where.annee_creation[Op.gte] = annee_min;
        if (annee_max) where.annee_creation[Op.lte] = annee_max;
      }

      // Filtre par prix
      if (prix_min || prix_max) {
        where.prix = {};
        if (prix_min) where.prix[Op.gte] = prix_min;
        if (prix_max) where.prix[Op.lte] = prix_max;
      }

      // Filtre par catégorie
      if (categorie) {
        include.push({
          model: this.models.Categorie,
          where: { id_categorie: categorie },
          through: { attributes: [] }
        });
      }

      // Filtre par éditeur
      if (editeur) {
        include.push({
          model: this.models.Editeur,
          where: { id_editeur: editeur },
          through: { attributes: [] }
        });
      }

      const offset = (page - 1) * limit;

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true,
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          oeuvres: result.rows,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur recherche œuvres:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la recherche' 
      });
    }
  }

  /**
   * Alias pour search
   */
  async searchOeuvres(req, res) {
    return this.search(req, res);
  }

  /**
   * Récupérer les médias d'une œuvre
   */
  async getMedias(req, res) {
    try {
      const { id } = req.params;
      
      const medias = await this.models.Media.findAll({
        where: { id_oeuvre: id },
        order: [['ordre', 'ASC'], ['date_creation', 'ASC']]
      });

      res.json({
        success: true,
        data: medias
      });

    } catch (error) {
      console.error('❌ Erreur récupération médias:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Upload de médias pour une œuvre
   */
  async uploadMedia(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const files = req.files;

      if (!files || files.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'Aucun fichier fourni' 
        });
      }

      // Vérifier que l'œuvre existe
      const oeuvre = await this.models.Oeuvre.findByPk(id, { transaction });
      if (!oeuvre) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      const medias = [];
      let ordre = await this.models.Media.count({ where: { id_oeuvre: id } }) + 1;

      for (const file of files) {
        const media = await this.models.Media.create({
          id_oeuvre: id,
          type_media: this.detectMediaType(file.originalname),
          url: `/uploads/oeuvres/${file.filename}`,
          titre: file.originalname,
          nom_fichier: file.originalname,
          taille_fichier: file.size,
          mime_type: file.mimetype,
          ordre: ordre++,
          visible_public: true,
          date_creation: new Date()
        }, { transaction });

        medias.push(media);
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `${medias.length} média(s) ajouté(s) avec succès`,
        data: medias
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur upload médias:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de l\'upload' 
      });
    }
  }

  /**
   * Alias pour uploadMedia
   */
  async uploadMedias(req, res) {
    return this.uploadMedia(req, res);
  }

  /**
   * Réorganiser l'ordre des médias
   */
  async reorderMedias(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { mediaIds } = req.body;

      if (!Array.isArray(mediaIds)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'mediaIds doit être un tableau'
        });
      }

      // Mettre à jour l'ordre
      for (let i = 0; i < mediaIds.length; i++) {
        await this.models.Media.update(
          { ordre: i + 1 },
          { 
            where: { 
              id_media: mediaIds[i],
              id_oeuvre: id 
            },
            transaction 
          }
        );
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Ordre des médias mis à jour'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur réorganisation médias:', error);
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
    const transaction = await this.sequelize.transaction();

    try {
      const { id, mediaId } = req.params;

      const media = await this.models.Media.findOne({
        where: { 
          id_media: mediaId,
          id_oeuvre: id 
        },
        transaction
      });

      if (!media) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Média non trouvé' 
        });
      }

      // Supprimer le fichier physique
      if (media.url && media.url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', media.url);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.warn(`Impossible de supprimer le fichier: ${filePath}`);
        }
      }

      await media.destroy({ transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: 'Média supprimé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur suppression média:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Valider ou rejeter une œuvre (admin)
   */
  async validate(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const { statut, raison_rejet } = req.body;

      const oeuvre = await this.models.Oeuvre.findByPk(id, { transaction });

      if (!oeuvre) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Œuvre non trouvée' 
        });
      }

      oeuvre.statut = statut;
      oeuvre.date_validation = new Date();
      oeuvre.id_user_validate = req.user.id_user;

      if (statut === 'rejete') {
        oeuvre.raison_rejet = raison_rejet;
      }

      await oeuvre.save({ transaction });

      // Créer une notification si le modèle existe
      if (this.models.Notification) {
        await this.models.Notification.create({
          id_user: oeuvre.saisi_par,
          type_notification: statut === 'publie' ? 'oeuvre_validee' : 'oeuvre_rejetee',
          titre: statut === 'publie' ? 'Œuvre validée' : 'Œuvre rejetée',
          message: statut === 'publie' 
            ? `Votre œuvre "${oeuvre.titre}" a été validée et est maintenant publiée.`
            : `Votre œuvre "${oeuvre.titre}" a été rejetée. Raison: ${raison_rejet}`,
          id_oeuvre: id,
          date_creation: new Date()
        }, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: `Œuvre ${statut === 'publie' ? 'validée' : 'rejetée'} avec succès`
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erreur validation œuvre:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Alias pour validate
   */
  async validateOeuvre(req, res) {
    return this.validate(req, res);
  }

  /**
   * Obtenir les liens de partage social
   */
  async getShareLinks(req, res) {
    try {
      const { id } = req.params;
      const oeuvre = await this.models.Oeuvre.findByPk(id, {
        include: [{ model: this.models.TypeOeuvre }]
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
      const description = encodeURIComponent(oeuvre.description || '');

      const shareLinks = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        whatsapp: `https://wa.me/?text=${title}%20${url}`,
        email: `mailto:?subject=${title}&body=${description}%20${url}`
      };

      res.json({
        success: true,
        data: shareLinks
      });

    } catch (error) {
      console.error('❌ Erreur génération liens partage:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Récupérer les œuvres de l'utilisateur connecté
   */
  async getMyWorks(req, res) {
    try {
      const userId = req.user.id_user;
      const { page = 1, limit = 10, statut } = req.query;
      const offset = (page - 1) * limit;

      const where = { saisi_par: userId };
      if (statut) where.statut = statut;

      const result = await this.models.Oeuvre.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']],
        include: [
          { 
            model: this.models.TypeOeuvre,
            attributes: ['nom_type']
          },
          { 
            model: this.models.Langue,
            attributes: ['nom']
          },
          {
            model: this.models.Media,
            where: { visible_public: true },
            required: false,
            limit: 1,
            order: [['ordre', 'ASC']]
          }
        ]
      });

      res.json({
        success: true,
        data: {
          oeuvres: result.rows,
          pagination: {
            total: result.count,
            page: parseInt(page),
            pages: Math.ceil(result.count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur mes œuvres:', error);
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
        return res.json({
          success: true,
          data: []
        });
      }

      const intervenants = await this.models.Intervenant.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.like]: `%${q}%` } },
            { prenom: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
            { organisation: { [Op.like]: `%${q}%` } }
          ]
        },
        limit: 10,
        order: [['nom', 'ASC'], ['prenom', 'ASC']]
      });

      // Formatter les résultats pour le frontend
      const results = intervenants.map(intervenant => ({
        id: intervenant.id_intervenant,
        label: `${intervenant.titre_professionnel ? intervenant.titre_professionnel + ' ' : ''}${intervenant.prenom} ${intervenant.nom}`,
        titre: intervenant.titre_professionnel,
        organisation: intervenant.organisation,
        specialites: intervenant.specialites || [],
        photo_url: intervenant.photo_url
      }));

      res.json(results);

    } catch (error) {
      console.error('❌ Erreur recherche intervenants:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * Vérifier si un email existe
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
        user: user ? {
          id_user: user.id_user,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email
        } : null
      });

    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ==================================================
  // MÉTHODES HELPER
  // ==================================================

  /**
   * Détecter le type de média à partir du nom de fichier
   */
  detectMediaType(filename) {
    if (!filename) return 'document';
    
    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv', 'flv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    return 'document';
  }

  /**
   * Traiter un média base64
   */
  async processBase64Media(base64String, filename, oeuvreId) {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) throw new Error('Format base64 invalide');
    
    const mimeType = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    
    // Générer un nom unique
    const ext = mimeType.split('/')[1] || 'jpg';
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const uniqueFilename = `oeuvre-${oeuvreId}-${uniqueSuffix}.${ext}`;
    
    // Déterminer le dossier
    let subDir = 'images';
    if (mimeType.startsWith('video/')) subDir = 'videos';
    else if (mimeType.startsWith('audio/')) subDir = 'audios';
    else if (!mimeType.startsWith('image/')) subDir = 'documents';
    
    // Créer le dossier si nécessaire
    const uploadDir = path.join(__dirname, '..', 'uploads', 'oeuvres', subDir);
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Sauvegarder le fichier
    const filePath = path.join(uploadDir, uniqueFilename);
    await fs.writeFile(filePath, buffer);
    
    console.log(`✅ Fichier base64 sauvegardé: ${filePath}`);
    
    return {
      url: `/uploads/oeuvres/${subDir}/${uniqueFilename}`,
      thumbnail_url: mimeType.startsWith('image/') ? `/uploads/oeuvres/${subDir}/${uniqueFilename}` : null,
      size: buffer.length,
      mime_type: mimeType,
      filename: uniqueFilename
    };
  }

  /**
   * Créer les détails spécifiques selon le type d'œuvre
   */
  async createSpecificDetails(oeuvre, typeOeuvre, details, transaction) {
    const typeName = typeOeuvre.nom_type.toLowerCase();
    
    switch (typeName) {
      case 'livre':
        if (details.livre && this.models.Livre) {
          await this.models.Livre.create({
            id_oeuvre: oeuvre.id_oeuvre,
            isbn: details.livre.isbn,
            nb_pages: details.livre.nb_pages,
            format: details.livre.format,
            collection: details.livre.collection
          }, { transaction });
        }
        break;
        
      case 'film':
        if (details.film && this.models.Film) {
          await this.models.Film.create({
            id_oeuvre: oeuvre.id_oeuvre,
            duree_minutes: details.film.duree_minutes,
            realisateur: details.film.realisateur,
            producteur: details.film.producteur,
            studio: details.film.studio
          }, { transaction });
        }
        break;
        
      // Ajouter d'autres types selon vos besoins
    }
  }

  /**
   * Rechercher ou créer un intervenant
   */
  async findOrCreateIntervenant(intervenantData, transaction) {
    let intervenant = null;
    
    // Normaliser les données
    const normalizedData = {
      ...intervenantData,
      nom: intervenantData.nom?.trim(),
      prenom: intervenantData.prenom?.trim(),
      email: intervenantData.email?.trim().toLowerCase()
    };
    
    // 1. Recherche par email
    if (normalizedData.email) {
      intervenant = await this.models.Intervenant.findOne({
        where: { email: normalizedData.email },
        transaction
      });
      
      if (intervenant) {
        console.log(`ℹ️ Intervenant trouvé par email: ${normalizedData.email}`);
        return intervenant;
      }
    }
    
    // 2. Recherche par nom/prénom
    if (!intervenant && normalizedData.nom && normalizedData.prenom) {
      intervenant = await this.models.Intervenant.findOne({
        where: {
          nom: normalizedData.nom,
          prenom: normalizedData.prenom
        },
        transaction
      });
      
      if (intervenant) {
        console.log(`ℹ️ Intervenant trouvé par nom/prénom: ${normalizedData.nom} ${normalizedData.prenom}`);
        
        // Mettre à jour l'email si fourni et absent
        if (normalizedData.email && !intervenant.email) {
          intervenant.email = normalizedData.email;
          await intervenant.save({ transaction });
          console.log(`✅ Email ajouté à l'intervenant existant`);
        }
        
        return intervenant;
      }
    }
    
    // 3. Création si non trouvé
    try {
      intervenant = await this.models.Intervenant.create({
        nom: normalizedData.nom || '',
        prenom: normalizedData.prenom || '',
        email: normalizedData.email || null,
        telephone: normalizedData.telephone || null,
        titre_professionnel: normalizedData.titre_professionnel || '',
        organisation: normalizedData.organisation || '',
        biographie: normalizedData.biographie || '',
        site_web: normalizedData.site_web || null,
        pays_origine: normalizedData.pays_origine || null,
        date_naissance: normalizedData.date_naissance || null,
        date_deces: normalizedData.date_deces || null,
        statut: normalizedData.statut || 'actif'
      }, { transaction });
      
      console.log(`✅ Nouvel intervenant créé: ${intervenant.nom} ${intervenant.prenom}`);
      
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.error('⚠️ Contrainte d\'unicité violée:', error.fields);
        throw new Error('Un intervenant avec ces informations existe déjà');
      }
      throw error;
    }
    
    return intervenant;
  }

  /**
   * Configuration Multer pour l'upload de fichiers
   */
  static getMulterConfig() {
    const multer = require('multer');
    const fsSyc = require('fs');
    
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'oeuvres');
        
        // Créer le dossier s'il n'existe pas
        if (!fsSyc.existsSync(uploadDir)) {
          fsSyc.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Générer un nom unique
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `oeuvre-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Types MIME autorisés
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mpeg',
        'audio/mpeg',
        'audio/mp3',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
      }
    };

    return multer({
      storage,
      limits: { 
        fileSize: 100 * 1024 * 1024, // 100MB max
        files: 10 // Max 10 fichiers
      },
      fileFilter
    });
  }
}

module.exports = OeuvreController;