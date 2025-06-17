// controllers/MetadataController.js - Controller pour les métadonnées (version améliorée)

const { Op } = require('sequelize');
const hierarchieService = require('../services/HierarchieService');

class MetadataController {
  constructor(models) {
    if (!models) {
      throw new Error('MetadataController: Les modèles sont requis');
    }
    
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    // Initialiser le service de hiérarchie
    this.initializeHierarchieService();
  }

  /**
   * Initialise le service de hiérarchie avec gestion d'erreur robuste
   */
  initializeHierarchieService() {
    try {
      // Vérifier si le service est déjà initialisé
      if (hierarchieService.isInitialized) {
        console.log('✅ HierarchieService déjà initialisé');
        return;
      }
      
      // Initialiser avec les modèles
      hierarchieService.initialize(this.models);
      console.log('✅ HierarchieService initialisé dans MetadataController');
      
    } catch (error) {
      console.error('⚠️ Erreur initialisation HierarchieService:', error.message);
      
      // Créer des méthodes de fallback pour éviter les erreurs
      this.hierarchieServiceAvailable = false;
      
      // Log des modèles disponibles pour debug
      const availableModels = Object.keys(this.models).filter(k => k !== 'sequelize' && k !== 'Sequelize');
      console.error('   Modèles disponibles:', availableModels.join(', '));
      
      // Vérifier spécifiquement les modèles requis
      const requiredModels = ['TypeOeuvre', 'Genre', 'Categorie', 'TypeOeuvreGenre', 'GenreCategorie'];
      const missingModels = requiredModels.filter(m => !this.models[m]);
      if (missingModels.length > 0) {
        console.error('   Modèles manquants:', missingModels.join(', '));
      }
    }
  }

  /**
   * Wrapper pour appeler les méthodes du HierarchieService avec gestion d'erreur
   */
  async callHierarchieService(methodName, ...args) {
    try {
      if (!hierarchieService.isInitialized) {
        // Tenter une réinitialisation
        this.initializeHierarchieService();
      }
      
      if (!hierarchieService[methodName]) {
        throw new Error(`Méthode ${methodName} non disponible dans HierarchieService`);
      }
      
      return await hierarchieService[methodName](...args);
      
    } catch (error) {
      console.error(`Erreur lors de l'appel à HierarchieService.${methodName}:`, error.message);
      
      // Retourner une réponse d'erreur appropriée selon la méthode
      if (methodName === 'getTypesOeuvres' || methodName === 'getGenresParType' || methodName === 'getCategoriesParGenre') {
        return [];
      }
      if (methodName === 'validerSelection') {
        return { valide: false, erreur: 'Service de validation temporairement indisponible' };
      }
      if (methodName === 'getHierarchieComplete') {
        return [];
      }
      if (methodName === 'getStatistiquesUtilisation') {
        return { global: [], detaille: {} };
      }
      
      throw error;
    }
  }

  /**
   * GET /api/metadata/types-oeuvres
   * Obtenir tous les types d'œuvres
   */
  async getTypesOeuvres(req, res) {
    try {
      const types = await this.callHierarchieService('getTypesOeuvres');
      
      res.json({
        success: true,
        data: types,
        total: types.length
      });
    } catch (error) {
      console.error('Erreur getTypesOeuvres:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * GET /api/metadata/types/:typeId/genres
   * Obtenir les genres disponibles pour un type d'œuvre
   */
  async getGenresParType(req, res) {
    try {
      const { typeId } = req.params;
      
      if (!typeId || isNaN(typeId)) {
        return res.status(400).json({
          success: false,
          error: 'ID du type invalide'
        });
      }

      const genres = await this.callHierarchieService('getGenresParType', parseInt(typeId));
      
      res.json({
        success: true,
        data: genres,
        total: genres.length
      });
    } catch (error) {
      console.error('Erreur getGenresParType:', error);
      res.status(error.message.includes('non trouvé') ? 404 : 500).json({
        success: false,
        error: error.message || 'Une erreur est survenue. Veuillez réessayer plus tard.'
      });
    }
  }

  /**
   * GET /api/metadata/genres/:genreId/categories
   * Obtenir les catégories disponibles pour un genre
   */
 async getCategoriesParGenre(req, res) {
  try {
    const { genreId } = req.params;
    console.log('🔍 Recherche des catégories pour le genre:', genreId);

    // Option 1 : Via le modèle Genre avec le BON alias
    const genre = await this.models.Genre.findByPk(genreId, {
      include: [{
        model: this.models.Categorie,
        as: 'CategoriesDisponibles', // ✅ Utiliser le bon alias !
        through: {
          attributes: ['ordre_affichage']
          // Retirer where: { actif: true } si ça pose problème
        }
      }]
    });

    if (!genre) {
      return res.status(404).json({
        success: false,
        error: 'Genre non trouvé'
      });
    }

    res.json({
      success: true,
      data: genre.CategoriesDisponibles || []
    });

  } catch (error) {
    console.error('❌ Erreur getCategoriesParGenre:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

  /**
   * POST /api/metadata/validate-hierarchy
   * Valider une sélection hiérarchique Type → Genre → Catégories
   */
  async validerHierarchie(req, res) {
    try {
      const { id_type_oeuvre, id_genre, categories = [] } = req.body;
      
      // Validation des paramètres
      if (!id_type_oeuvre || !id_genre) {
        return res.status(400).json({
          success: false,
          error: 'Type et genre sont obligatoires'
        });
      }

      if (!Array.isArray(categories)) {
        return res.status(400).json({
          success: false,
          error: 'Les catégories doivent être un tableau'
        });
      }

      const validation = await this.callHierarchieService(
        'validerSelection',
        id_type_oeuvre,
        id_genre,
        categories
      );

      if (!validation.valide) {
        return res.status(400).json({
          success: false,
          error: validation.erreur,
          details: {
            id_type_oeuvre,
            id_genre,
            categories
          }
        });
      }

      res.json({
        success: true,
        message: 'Hiérarchie valide',
        data: {
          id_type_oeuvre,
          id_genre,
          categories
        }
      });
    } catch (error) {
      console.error('Erreur validerHierarchie:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * GET /api/metadata/hierarchy
   * Obtenir la hiérarchie complète Type → Genre → Catégorie
   */
  async getHierarchieComplete(req, res) {
    try {
      const { simplified = false } = req.query;
      const hierarchie = await this.callHierarchieService('getHierarchieComplete');
      
      if (simplified === 'true' && Array.isArray(hierarchie)) {
        // Version simplifiée pour les formulaires
        const simplifiedData = hierarchie.map(type => ({
          id: type.id_type_oeuvre,
          nom: type.nom_type,
          genres: (type.GenresDisponibles || []).map(genre => ({
            id: genre.id_genre,
            nom: genre.nom,
            categories: (genre.CategoriesDisponibles || []).map(cat => ({
              id: cat.id_categorie,
              nom: cat.nom
            }))
          }))
        }));
        
        return res.json({
          success: true,
          data: simplifiedData
        });
      }

      res.json({
        success: true,
        data: hierarchie
      });
    } catch (error) {
      console.error('Erreur getHierarchieComplete:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * GET /api/metadata/hierarchy/statistics
   * Obtenir les statistiques d'utilisation de la hiérarchie
   */
  async getHierarchieStatistics(req, res) {
    try {
      const stats = await this.callHierarchieService('getStatistiquesUtilisation');
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur getHierarchieStatistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * POST /api/metadata/types/:typeId/genres
   * Ajouter un genre à un type (Admin uniquement)
   */
  async ajouterGenreAuType(req, res) {
    try {
      const { typeId } = req.params;
      const { id_genre, ordre_affichage = 0 } = req.body;

      if (!id_genre) {
        return res.status(400).json({
          success: false,
          error: 'ID du genre requis'
        });
      }

      const result = await this.callHierarchieService(
        'ajouterGenreAuType',
        parseInt(typeId),
        id_genre,
        ordre_affichage
      );

      res.status(201).json({
        success: true,
        message: 'Genre ajouté au type avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur ajouterGenreAuType:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * POST /api/metadata/genres/:genreId/categories
   * Ajouter une catégorie à un genre (Admin uniquement)
   */
  async ajouterCategorieAuGenre(req, res) {
    try {
      const { genreId } = req.params;
      const { id_categorie, ordre_affichage = 0 } = req.body;

      if (!id_categorie) {
        return res.status(400).json({
          success: false,
          error: 'ID de la catégorie requis'
        });
      }

      const result = await this.callHierarchieService(
        'ajouterCategorieAuGenre',
        parseInt(genreId),
        id_categorie,
        ordre_affichage
      );

      res.status(201).json({
        success: true,
        message: 'Catégorie ajoutée au genre avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur ajouterCategorieAuGenre:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * PUT /api/metadata/types/:typeId/genres/:genreId
   * Modifier l'ordre d'affichage ou l'état actif d'un genre dans un type
   */
  async modifierGenreDansType(req, res) {
    try {
      const { typeId, genreId } = req.params;
      const { ordre_affichage, actif } = req.body;

      const result = await this.callHierarchieService(
        'modifierRelation',
        'TypeOeuvreGenre',
        { id_type_oeuvre: parseInt(typeId), id_genre: parseInt(genreId) },
        { ordre_affichage, actif }
      );

      res.json({
        success: true,
        message: 'Relation mise à jour avec succès',
        data: result
      });
    } catch (error) {
      console.error('Erreur modifierGenreDansType:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  /**
   * DELETE /api/metadata/types/:typeId/genres/:genreId
   * Désactiver un genre pour un type (soft delete)
   */
  async desactiverGenrePourType(req, res) {
    try {
      const { typeId, genreId } = req.params;

      const result = await this.callHierarchieService(
        'desactiverRelation',
        'TypeOeuvreGenre',
        { id_type_oeuvre: parseInt(typeId), id_genre: parseInt(genreId) }
      );

      res.json({
        success: true,
        message: 'Genre désactivé pour ce type',
        data: result
      });
    } catch (error) {
      console.error('Erreur desactiverGenrePourType:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Une erreur est survenue'
      });
    }
  }

  // ===== MÉTHODES POUR LES AUTRES MÉTADONNÉES =====
  
  /**
   * GET /api/metadata/materiaux
   */
  async getMateriaux(req, res) {
    try {
      const materiaux = await this.models.Materiau.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: materiaux,
        total: materiaux.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des matériaux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des matériaux'
      });
    }
  }

  /**
   * POST /api/metadata/materiaux
   */
  async createMateriau(req, res) {
    try {
      const { nom, description } = req.body;
      
      if (!nom) {
        return res.status(400).json({
          success: false,
          error: 'Le nom du matériau est obligatoire'
        });
      }

      const materiau = await this.models.Materiau.create({
        nom,
        description
      });

      res.status(201).json({
        success: true,
        data: materiau,
        message: 'Matériau créé avec succès'
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Un matériau avec ce nom existe déjà'
        });
      }
      console.error('Erreur lors de la création du matériau:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création du matériau'
      });
    }
  }

  /**
   * PUT /api/metadata/materiaux/:id
   */
  async updateMateriau(req, res) {
    try {
      const { id } = req.params;
      const { nom, description } = req.body;

      const materiau = await this.models.Materiau.findByPk(id);
      
      if (!materiau) {
        return res.status(404).json({
          success: false,
          error: 'Matériau non trouvé'
        });
      }

      await materiau.update({ nom, description });

      res.json({
        success: true,
        data: materiau,
        message: 'Matériau mis à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du matériau:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du matériau'
      });
    }
  }

  /**
   * DELETE /api/metadata/materiaux/:id
   */
  async deleteMateriau(req, res) {
    try {
      const { id } = req.params;
      
      // Vérifier s'il est utilisé
      const count = await this.models.Artisanat.count({
        where: { id_materiau: id }
      });

      if (count > 0) {
        return res.status(400).json({
          success: false,
          error: `Ce matériau est utilisé par ${count} artisanat(s) et ne peut pas être supprimé`
        });
      }

      const materiau = await this.models.Materiau.findByPk(id);
      
      if (!materiau) {
        return res.status(404).json({
          success: false,
          error: 'Matériau non trouvé'
        });
      }

      await materiau.destroy();

      res.json({
        success: true,
        message: 'Matériau supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du matériau:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la suppression du matériau'
      });
    }
  }

  // Méthodes similaires pour techniques, langues, catégories, etc.
  // (Les autres méthodes restent inchangées car elles n'utilisent pas HierarchieService)

  // ===== TECHNIQUES =====
  
  async getTechniques(req, res) {
    try {
      const techniques = await this.models.Technique.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: techniques
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des techniques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des techniques'
      });
    }
  }

  async createTechnique(req, res) {
    try {
      const { nom, description } = req.body;
      
      if (!nom) {
        return res.status(400).json({
          success: false,
          error: 'Le nom de la technique est obligatoire'
        });
      }

      const technique = await this.models.Technique.create({
        nom,
        description
      });

      res.status(201).json({
        success: true,
        data: technique,
        message: 'Technique créée avec succès'
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Une technique avec ce nom existe déjà'
        });
      }
      console.error('Erreur lors de la création de la technique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création de la technique'
      });
    }
  }

  async updateTechnique(req, res) {
    try {
      const { id } = req.params;
      const { nom, description } = req.body;

      const technique = await this.models.Technique.findByPk(id);
      
      if (!technique) {
        return res.status(404).json({
          success: false,
          error: 'Technique non trouvée'
        });
      }

      await technique.update({ nom, description });

      res.json({
        success: true,
        data: technique,
        message: 'Technique mise à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la technique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour de la technique'
      });
    }
  }

  async deleteTechnique(req, res) {
    try {
      const { id } = req.params;
      
      // Vérifier si elle est utilisée
      const count = await this.models.Artisanat.count({
        where: { id_technique: id }
      });

      if (count > 0) {
        return res.status(400).json({
          success: false,
          error: `Cette technique est utilisée par ${count} artisanat(s) et ne peut pas être supprimée`
        });
      }

      const technique = await this.models.Technique.findByPk(id);
      
      if (!technique) {
        return res.status(404).json({
          success: false,
          error: 'Technique non trouvée'
        });
      }

      await technique.destroy();

      res.json({
        success: true,
        message: 'Technique supprimée avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la technique:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la suppression de la technique'
      });
    }
  }

  // ===== LANGUES =====
  
  async getLangues(req, res) {
    try {
      const langues = await this.models.Langue.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: langues
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des langues:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des langues'
      });
    }
  }

  // ===== CATÉGORIES =====
  
  async getCategories(req, res) {
    try {
      const categories = await this.models.Categorie.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des catégories'
      });
    }
  }

  // ===== GENRES =====
  
  async getGenres(req, res) {
    try {
      const genres = await this.models.Genre.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des genres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des genres'
      });
    }
  }

  // ===== ÉDITEURS =====
  
  async getEditeurs(req, res) {
    try {
      const { type_editeur } = req.query;
      
      const where = {};
      if (type_editeur) {
        where.type_editeur = type_editeur;
      }
      
      const editeurs = await this.models.Editeur.findAll({
        where,
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: editeurs
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des éditeurs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des éditeurs'
      });
    }
  }

  // ===== TYPES D'ORGANISATIONS =====
  
  async getTypesOrganisations(req, res) {
    try {
      const typesOrganisations = await this.models.TypeOrganisation.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: typesOrganisations
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des types d\'organisations:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des types d\'organisations'
      });
    }
  }

  // ===== WILAYAS =====
  
  async getWilayas(req, res) {
    try {
      const { includeDairas, includeCommunes } = req.query;
      
      const include = [];
      
      if (includeDairas === 'true') {
        const dairaInclude = {
          model: this.models.Daira,
          attributes: ['id_daira', 'nom', 'daira_name_ascii']
        };
        
        if (includeCommunes === 'true') {
          dairaInclude.include = [{
            model: this.models.Commune,
            attributes: ['id_commune', 'nom', 'commune_name_ascii']
          }];
        }
        
        include.push(dairaInclude);
      }
      
      const wilayas = await this.models.Wilaya.findAll({
        attributes: ['id_wilaya', 'codeW', 'nom', 'wilaya_name_ascii'],
        include,
        order: [['codeW', 'ASC']]
      });
      
      res.json({
        success: true,
        data: wilayas
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des wilayas:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des wilayas'
      });
    }
  }

  async getDairasByWilaya(req, res) {
    try {
      const { id } = req.params;
      const { includeCommunes } = req.query;
      
      const include = [];
      
      if (includeCommunes === 'true') {
        include.push({
          model: this.models.Commune,
          attributes: ['id_commune', 'nom', 'commune_name_ascii']
        });
      }
      
      const dairas = await this.models.Daira.findAll({
        where: { wilayaId: id },
        attributes: ['id_daira', 'nom', 'daira_name_ascii'],
        include,
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: dairas
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des dairas:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des dairas'
      });
    }
  }

  async getCommunesByDaira(req, res) {
    try {
      const { id } = req.params;
      
      const communes = await this.models.Commune.findAll({
        where: { dairaId: id },
        attributes: ['id_commune', 'nom', 'commune_name_ascii'],
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: communes
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des communes:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des communes'
      });
    }
  }

  async getLocalitesByCommune(req, res) {
    try {
      const { id } = req.params;
      
      const localites = await this.models.Localite.findAll({
        where: { id_commune: id },
        attributes: ['id_localite', 'nom', 'localite_name_ascii'],
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: localites
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des localités:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des localités'
      });
    }
  }

  // ===== TAGS/MOTS-CLÉS =====
  
  async getTags(req, res) {
    try {
      const { search, limit = 50 } = req.query;
      
      const where = {};
      if (search) {
        where.nom = { [Op.like]: `%${search}%` };
      }
      
      const tags = await this.models.TagMotCle.findAll({
        where,
        order: [['nom', 'ASC']],
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des tags:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des tags'
      });
    }
  }

  async createTag(req, res) {
    try {
      const { nom } = req.body;
      
      if (!nom) {
        return res.status(400).json({
          success: false,
          error: 'Le nom du tag est obligatoire'
        });
      }

      const [tag, created] = await this.models.TagMotCle.findOrCreate({
        where: { nom },
        defaults: { nom }
      });

      res.status(created ? 201 : 200).json({
        success: true,
        data: tag,
        message: created ? 'Tag créé avec succès' : 'Tag existant'
      });
    } catch (error) {
      console.error('Erreur lors de la création du tag:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création du tag'
      });
    }
  }

  // ===== RÉCUPÉRATION GLOBALE =====
  
  async getAllMetadata(req, res) {
    try {
      const [
        langues,
        categories,
        genres,
        types_oeuvres,
        types_evenements,
        materiaux,
        techniques,
        wilayas,
        editeurs,
        types_organisations
      ] = await Promise.all([
        this.models.Langue.findAll({ order: [['nom', 'ASC']] }),
        this.models.Categorie.findAll({ order: [['nom', 'ASC']] }),
        this.models.Genre.findAll({ order: [['nom', 'ASC']] }),
        this.callHierarchieService('getTypesOeuvres').catch(() => []),
        this.models.TypeEvenement ? 
          this.models.TypeEvenement.findAll({ order: [['nom_type', 'ASC']] }) : 
          [],
        this.models.Materiau.findAll({ order: [['nom', 'ASC']] }),
        this.models.Technique.findAll({ order: [['nom', 'ASC']] }),
        this.models.Wilaya.findAll({ 
          attributes: ['id_wilaya', 'codeW', 'nom', 'wilaya_name_ascii'],
          order: [['codeW', 'ASC']] 
        }),
        this.models.Editeur ? 
          this.models.Editeur.findAll({ 
            where: { actif: true },
            order: [['nom', 'ASC']] 
          }) : 
          [],
        this.models.TypeOrganisation ? 
          this.models.TypeOrganisation.findAll({ order: [['nom', 'ASC']] }) : 
          []
      ]);

      res.json({
        success: true,
        data: {
          langues,
          categories,
          genres,
          types_oeuvres,
          types_evenements,
          materiaux,
          techniques,
          wilayas,
          editeurs,
          types_organisations
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des métadonnées'
      });
    }
  }

  // ===== MÉTHODES DE RECHERCHE =====
  
  async searchWilayas(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      const wilayas = await this.models.Wilaya.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.like]: `%${q}%` } },
            { wilaya_name_ascii: { [Op.like]: `%${q}%` } },
            this.sequelize.where(
              this.sequelize.cast(this.sequelize.col('codeW'), 'CHAR'),
              { [Op.like]: `%${q}%` }
            )
          ]
        },
        attributes: ['id_wilaya', 'codeW', 'nom', 'wilaya_name_ascii'],
        order: [['codeW', 'ASC']],
        limit: 10
      });
      
      res.json({
        success: true,
        data: wilayas
      });
    } catch (error) {
      console.error('Erreur lors de la recherche de wilayas:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche'
      });
    }
  }

  async searchCategories(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      const categories = await this.models.Categorie.findAll({
        where: {
          nom: { [Op.like]: `%${q}%` }
        },
        order: [['nom', 'ASC']],
        limit: 10
      });
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Erreur lors de la recherche de catégories:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche'
      });
    }
  }

  // ===== STATISTIQUES D'UTILISATION =====
  
  async getUsageStatistics(req, res) {
    try {
      const statistics = {
        // Nombre total par type
        counts: {
          oeuvres: await this.models.Oeuvre.count(),
          langues: await this.models.Langue.count(),
          categories: await this.models.Categorie.count(),
          genres: await this.models.Genre.count(),
          materiaux: await this.models.Materiau.count(),
          techniques: await this.models.Technique.count(),
          wilayas: await this.models.Wilaya.count(),
          dairas: await this.models.Daira.count(),
          communes: await this.models.Commune.count()
        },
        
        // Utilisation des matériaux
        materiauxUsage: await this.models.Materiau.findAll({
          attributes: [
            'id_materiau',
            'nom',
            [this.sequelize.fn('COUNT', this.sequelize.col('Artisanats.id_artisanat')), 'usage_count']
          ],
          include: [{
            model: this.models.Artisanat,
            attributes: [],
            required: false
          }],
          group: ['Materiau.id_materiau', 'Materiau.nom'],
          order: [[this.sequelize.literal('usage_count'), 'DESC']],
          limit: 10,
          raw: true
        }),
        
        // Utilisation des techniques
        techniquesUsage: await this.models.Technique.findAll({
          attributes: [
            'id_technique',
            'nom',
            [this.sequelize.fn('COUNT', this.sequelize.col('Artisanats.id_artisanat')), 'usage_count']
          ],
          include: [{
            model: this.models.Artisanat,
            attributes: [],
            required: false
          }],
          group: ['Technique.id_technique', 'Technique.nom'],
          order: [[this.sequelize.literal('usage_count'), 'DESC']],
          limit: 10,
          raw: true
        })
      };
      
      // Ajouter les statistiques de hiérarchie si disponibles
      try {
        const hierarchyStats = await this.callHierarchieService('getStatistiquesUtilisation');
        statistics.hierarchy = hierarchyStats;
      } catch (err) {
        console.warn('Impossible d\'obtenir les statistiques de hiérarchie:', err.message);
      }
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des statistiques'
      });
    }
  }
}

module.exports = MetadataController;