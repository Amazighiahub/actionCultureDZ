// controllers/MetadataController.js - Controller pour les métadonnées

const { Op } = require('sequelize');

class MetadataController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ===== MATÉRIAUX =====
  
  async getMateriaux(req, res) {
    try {
      const materiaux = await this.models.Materiau.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: materiaux
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des matériaux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des matériaux'
      });
    }
  }

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

  // ===== TYPES D'ŒUVRES =====
  
  async getTypesOeuvres(req, res) {
    try {
      const typesOeuvres = await this.models.TypeOeuvre.findAll({
        order: [['nom_type', 'ASC']]
      });
      
      res.json({
        success: true,
        data: typesOeuvres
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des types d\'œuvres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des types d\'œuvres'
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
        this.models.TypeOeuvre.findAll({ order: [['nom_type', 'ASC']] }),
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