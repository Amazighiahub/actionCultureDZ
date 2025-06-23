// controllers/MetadataController.js - Version complète avec toutes les méthodes
const { Op } = require('sequelize');

class MetadataController {
  constructor(models) {
    if (!models) {
      throw new Error('MetadataController: Les modèles sont requis');
    }
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  /**
   * GET /api/metadata/all
   * Récupération globale de toutes les métadonnées
   */
  async getAllMetadata(req, res) {
    try {
      const [
        langues,
        categories,
        genres,
        types_oeuvres,
        editeurs,
        types_users,
        tags,
        materiaux,
        techniques
      ] = await Promise.all([
        this.models.Langue.findAll({ order: [['nom', 'ASC']] }),
        this.models.Categorie.findAll({ order: [['nom', 'ASC']] }),
        this.models.Genre.findAll({ order: [['nom', 'ASC']] }),
        this.models.TypeOeuvre.findAll({ order: [['nom_type', 'ASC']] }),
        this.models.Editeur.findAll({ 
          where: { actif: true },
          order: [['nom', 'ASC']] 
        }),
        this.models.TypeUser.findAll({ order: [['nom_type', 'ASC']] }),
        this.models.TagMotCle.findAll({ 
          order: [['nom', 'ASC']],
          limit: 100
        }),
        this.models.Materiau?.findAll({ order: [['nom', 'ASC']] }) || [],
        this.models.Technique?.findAll({ order: [['nom', 'ASC']] }) || []
      ]);

      res.json({
        success: true,
        data: {
          langues,
          categories,
          genres,
          types_oeuvres,
          editeurs,
          types_users,
          tags,
          materiaux,
          techniques
        }
      });
    } catch (error) {
      console.error('Erreur getAllMetadata:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/types-oeuvres
   * Obtenir tous les types d'œuvres
   */
  async getTypesOeuvres(req, res) {
    try {
      const types = await this.models.TypeOeuvre.findAll({
        order: [['nom_type', 'ASC']]
      });
      
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Erreur getTypesOeuvres:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/types-oeuvres/:typeId/genres
   * Obtenir les genres disponibles pour un type d'œuvre
   */
  async getGenresParType(req, res) {
    try {
      const { typeId } = req.params;
      
      const typeGenres = await this.models.TypeOeuvreGenre.findAll({
        where: {
          id_type_oeuvre: typeId,
          actif: true
        },
        include: [{
          model: this.models.Genre,
          attributes: ['id_genre', 'nom', 'description']
        }],
        order: [['ordre_affichage', 'ASC']]
      });

      const genres = typeGenres.map(tg => ({
        ...tg.Genre.toJSON(),
        ordre_affichage: tg.ordre_affichage
      }));

      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      console.error('Erreur getGenresParType:', error);
      res.status(500).json({
        success: false,
        error: error.message
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
      
      const genreCategories = await this.models.GenreCategorie.findAll({
        where: {
          id_genre: genreId,
          actif: true
        },
        include: [{
          model: this.models.Categorie,
          attributes: ['id_categorie', 'nom', 'description']
        }],
        order: [['ordre_affichage', 'ASC']]
      });

      const categories = genreCategories.map(gc => ({
        ...gc.Categorie.toJSON(),
        ordre_affichage: gc.ordre_affichage
      }));

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Erreur getCategoriesParGenre:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/validate-hierarchy
   * Valider une sélection hiérarchique
   */
  async validerHierarchie(req, res) {
    try {
      const { id_type_oeuvre, id_genre, categories = [] } = req.body;

      // Vérifier que le genre est valide pour le type
      const typeGenre = await this.models.TypeOeuvreGenre.findOne({
        where: {
          id_type_oeuvre,
          id_genre,
          actif: true
        }
      });

      if (!typeGenre) {
        return res.json({
          success: true,
          data: {
            valid: false,
            error: 'Le genre sélectionné n\'est pas valide pour ce type d\'œuvre'
          }
        });
      }

      // Vérifier que toutes les catégories sont valides pour le genre
      if (categories.length > 0) {
        const validCategories = await this.models.GenreCategorie.findAll({
          where: {
            id_genre,
            id_categorie: { [Op.in]: categories },
            actif: true
          },
          attributes: ['id_categorie']
        });

        const validCategoryIds = validCategories.map(vc => vc.id_categorie);
        const invalidCategories = categories.filter(id => !validCategoryIds.includes(id));

        if (invalidCategories.length > 0) {
          return res.json({
            success: true,
            data: {
              valid: false,
              error: 'Certaines catégories ne sont pas valides pour le genre sélectionné',
              invalidCategories
            }
          });
        }
      }

      res.json({
        success: true,
        data: { valid: true }
      });
    } catch (error) {
      console.error('Erreur validerHierarchie:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/hierarchy
   * Obtenir la hiérarchie complète
   */
  async getHierarchieComplete(req, res) {
    try {
      const types = await this.models.TypeOeuvre.findAll({
        include: [{
          model: this.models.TypeOeuvreGenre,
          as: 'type_oeuvre_genres',
          where: { actif: true },
          required: false,
          include: [{
            model: this.models.Genre,
            include: [{
              model: this.models.GenreCategorie,
              as: 'genre_categories',
              where: { actif: true },
              required: false,
              include: [{
                model: this.models.Categorie
              }]
            }]
          }]
        }],
        order: [
          ['nom_type', 'ASC'],
          ['type_oeuvre_genres', 'ordre_affichage', 'ASC'],
          ['type_oeuvre_genres', 'Genre', 'genre_categories', 'ordre_affichage', 'ASC']
        ]
      });

      // Restructurer les données pour une meilleure lisibilité
      const hierarchy = types.map(type => ({
        id_type_oeuvre: type.id_type_oeuvre,
        nom_type: type.nom_type,
        description: type.description,
        genres: type.type_oeuvre_genres?.map(tg => ({
          id_genre: tg.Genre.id_genre,
          nom: tg.Genre.nom,
          description: tg.Genre.description,
          ordre_affichage: tg.ordre_affichage,
          categories: tg.Genre.genre_categories?.map(gc => ({
            id_categorie: gc.Categorie.id_categorie,
            nom: gc.Categorie.nom,
            description: gc.Categorie.description,
            ordre_affichage: gc.ordre_affichage
          })) || []
        })) || []
      }));

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      console.error('Erreur getHierarchieComplete:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/hierarchy/statistics
   * Statistiques d'utilisation de la hiérarchie
   */
  async getHierarchieStatistics(req, res) {
    try {
      const [
        totalTypes,
        totalGenres,
        totalCategories,
        typeGenreCount,
        genreCategoryCount,
        mostUsedTypes,
        mostUsedGenres,
        mostUsedCategories
      ] = await Promise.all([
        this.models.TypeOeuvre.count(),
        this.models.Genre.count(),
        this.models.Categorie.count(),
        this.models.TypeOeuvreGenre.count({ where: { actif: true } }),
        this.models.GenreCategorie.count({ where: { actif: true } }),
        
        // Types les plus utilisés dans les œuvres
        this.models.Oeuvre?.count({
          attributes: ['id_type_oeuvre'],
          group: ['id_type_oeuvre'],
          include: [{
            model: this.models.TypeOeuvre,
            attributes: ['nom_type']
          }],
          order: [[this.sequelize.fn('COUNT', this.sequelize.col('id_oeuvre')), 'DESC']],
          limit: 5
        }) || [],
        
        // Genres les plus utilisés
        this.models.GenreOeuvre?.count({
          attributes: ['id_genre'],
          group: ['id_genre'],
          include: [{
            model: this.models.Genre,
            attributes: ['nom']
          }],
          order: [[this.sequelize.fn('COUNT', this.sequelize.col('id_genre')), 'DESC']],
          limit: 5
        }) || [],
        
        // Catégories les plus utilisées
        this.models.CategorieOeuvre?.count({
          attributes: ['id_categorie'],
          group: ['id_categorie'],
          include: [{
            model: this.models.Categorie,
            attributes: ['nom']
          }],
          order: [[this.sequelize.fn('COUNT', this.sequelize.col('id_categorie')), 'DESC']],
          limit: 5
        }) || []
      ]);

      res.json({
        success: true,
        data: {
          totals: {
            types: totalTypes,
            genres: totalGenres,
            categories: totalCategories,
            activeTypeGenreRelations: typeGenreCount,
            activeGenreCategoryRelations: genreCategoryCount
          },
          mostUsed: {
            types: mostUsedTypes,
            genres: mostUsedGenres,
            categories: mostUsedCategories
          }
        }
      });
    } catch (error) {
      console.error('Erreur getHierarchieStatistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/types/:typeId/genres
   * Ajouter un genre à un type
   */
  async ajouterGenreAuType(req, res) {
    try {
      const { typeId } = req.params;
      const { id_genre, ordre_affichage = 0 } = req.body;

      // Vérifier si la relation existe déjà
      const existing = await this.models.TypeOeuvreGenre.findOne({
        where: { id_type_oeuvre: typeId, id_genre }
      });

      if (existing) {
        // Réactiver si désactivé
        if (!existing.actif) {
          existing.actif = true;
          existing.ordre_affichage = ordre_affichage;
          await existing.save();
          return res.json({
            success: true,
            data: existing,
            message: 'Relation réactivée'
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Cette relation existe déjà'
        });
      }

      const relation = await this.models.TypeOeuvreGenre.create({
        id_type_oeuvre: typeId,
        id_genre,
        ordre_affichage,
        actif: true
      });

      res.status(201).json({
        success: true,
        data: relation
      });
    } catch (error) {
      console.error('Erreur ajouterGenreAuType:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/genres/:genreId/categories
   * Ajouter une catégorie à un genre
   */
  async ajouterCategorieAuGenre(req, res) {
    try {
      const { genreId } = req.params;
      const { id_categorie, ordre_affichage = 0 } = req.body;

      // Vérifier si la relation existe déjà
      const existing = await this.models.GenreCategorie.findOne({
        where: { id_genre: genreId, id_categorie }
      });

      if (existing) {
        // Réactiver si désactivé
        if (!existing.actif) {
          existing.actif = true;
          existing.ordre_affichage = ordre_affichage;
          await existing.save();
          return res.json({
            success: true,
            data: existing,
            message: 'Relation réactivée'
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Cette relation existe déjà'
        });
      }

      const relation = await this.models.GenreCategorie.create({
        id_genre: genreId,
        id_categorie,
        ordre_affichage,
        actif: true
      });

      res.status(201).json({
        success: true,
        data: relation
      });
    } catch (error) {
      console.error('Erreur ajouterCategorieAuGenre:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/metadata/types/:typeId/genres/:genreId
   * Modifier une relation type-genre
   */
  async modifierGenreDansType(req, res) {
    try {
      const { typeId, genreId } = req.params;
      const { ordre_affichage, actif } = req.body;

      const relation = await this.models.TypeOeuvreGenre.findOne({
        where: {
          id_type_oeuvre: typeId,
          id_genre: genreId
        }
      });

      if (!relation) {
        return res.status(404).json({
          success: false,
          error: 'Relation non trouvée'
        });
      }

      if (ordre_affichage !== undefined) relation.ordre_affichage = ordre_affichage;
      if (actif !== undefined) relation.actif = actif;

      await relation.save();

      res.json({
        success: true,
        data: relation
      });
    } catch (error) {
      console.error('Erreur modifierGenreDansType:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/metadata/types/:typeId/genres/:genreId
   * Désactiver une relation type-genre
   */
  async desactiverGenrePourType(req, res) {
    try {
      const { typeId, genreId } = req.params;

      const relation = await this.models.TypeOeuvreGenre.findOne({
        where: {
          id_type_oeuvre: typeId,
          id_genre: genreId
        }
      });

      if (!relation) {
        return res.status(404).json({
          success: false,
          error: 'Relation non trouvée'
        });
      }

      relation.actif = false;
      await relation.save();

      res.json({
        success: true,
        message: 'Relation désactivée'
      });
    } catch (error) {
      console.error('Erreur desactiverGenrePourType:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/types-oeuvres/:id/categories
   * Récupérer les catégories valides pour un type d'œuvre (groupées par genre)
   */
  /**
 * GET /api/metadata/types-oeuvres/:id/categories
 * Récupérer les catégories valides pour un type d'œuvre (groupées par genre)
 */
// MetadataController.js - Méthode getCategoriesForType mise à jour

/**
 * GET /api/metadata/types-oeuvres/:id/categories
 * Récupérer les catégories valides pour un type d'œuvre (groupées par genre)
 */
// MetadataController.js - Méthode getCategoriesForType mise à jour

/**
 * GET /api/metadata/types-oeuvres/:id/categories
 * Récupérer les catégories valides pour un type d'œuvre (groupées par genre)
 */
async getCategoriesForType(req, res) {
  try {
    const { id } = req.params;
    
    console.log(`getCategoriesForType appelé pour type_oeuvre ID: ${id}`);
    
    // 1. Récupérer tous les genres valides pour ce type avec les bonnes associations
    const validTypeGenres = await this.models.TypeOeuvreGenre.findAll({
      where: {
        id_type_oeuvre: id,
        actif: true
      },
      include: [{
        model: this.models.Genre,
        as: 'genre', // Utiliser l'alias défini dans l'association
        attributes: ['id_genre', 'nom', 'description'],
        required: true
      }],
      order: [['ordre_affichage', 'ASC']]
    });

    console.log(`Nombre de genres trouvés: ${validTypeGenres.length}`);

    if (validTypeGenres.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Aucun genre configuré pour ce type d\'œuvre'
      });
    }

    const validGenreIds = validTypeGenres.map(tg => tg.id_genre);

    // 2. Récupérer toutes les catégories de ces genres
    const genreCategories = await this.models.GenreCategorie.findAll({
      where: {
        id_genre: { [Op.in]: validGenreIds },
        actif: true
      },
      include: [
        {
          model: this.models.Genre,
          as: 'genre', // Utiliser l'alias défini
          attributes: ['id_genre', 'nom'],
          required: true
        },
        {
          model: this.models.Categorie,
          as: 'categorie', // Utiliser l'alias défini
          attributes: ['id_categorie', 'nom', 'description'],
          required: true
        }
      ],
      order: [['ordre_affichage', 'ASC']]
    });

    console.log(`Nombre de catégories trouvées: ${genreCategories.length}`);

    // 3. Grouper les catégories par genre
    const categoriesGrouped = validTypeGenres.map(tg => {
      // Accéder au genre via l'alias
      const genre = tg.genre;
      
      if (!genre) {
        console.error(`Genre non trouvé pour TypeOeuvreGenre id_genre: ${tg.id_genre}`);
        return null;
      }

      // Filtrer les catégories pour ce genre
      const categories = genreCategories
        .filter(gc => gc.id_genre === genre.id_genre)
        .map(gc => {
          const cat = gc.categorie;
          if (!cat) {
            console.error(`Categorie non trouvée pour GenreCategorie id_categorie: ${gc.id_categorie}`);
            return null;
          }
          return {
            id_categorie: cat.id_categorie,
            nom: cat.nom,
            description: cat.description
          };
        })
        .filter(cat => cat !== null);

      return {
        id_genre: genre.id_genre,
        nom: genre.nom,
        description: genre.description,

        categories: categories
      };
    }).filter(g => g !== null);

    // Filtrer pour ne garder que les genres qui ont des catégories
    const genresAvecCategories = categoriesGrouped.filter(g => g.categories.length > 0);

    res.json({
      success: true,
      data: genresAvecCategories,
      meta: {
        totalGenres: validTypeGenres.length,
        genresAvecCategories: genresAvecCategories.length,
        totalCategories: genreCategories.length
      }
    });

  } catch (error) {
    console.error('Erreur getCategoriesForType:', error);
    console.error('Stack:', error.stack);
    
    // En développement, retourner plus de détails
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des catégories',
        details: {
          message: error.message,
          stack: error.stack
        }
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des catégories'
      });
    }
  }
}
  /**
   * POST /api/metadata/validate-hierarchy
   * Valider la hiérarchie type/catégories (sans genre direct)
   */
  async validateHierarchy(req, res) {
    try {
      const { id_type_oeuvre, categories } = req.body;

      if (!id_type_oeuvre || !Array.isArray(categories)) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres invalides'
        });
      }

      if (categories.length === 0) {
        return res.json({
          success: true,
          data: { valid: true }
        });
      }

      // Récupérer les genres valides pour ce type
      const validTypeGenres = await this.models.TypeOeuvreGenre.findAll({
        where: {
          id_type_oeuvre,
          actif: true
        },
        attributes: ['id_genre']
      });

      const validGenreIds = validTypeGenres.map(tg => tg.id_genre);

      // Vérifier que toutes les catégories appartiennent à des genres valides
      const invalidCategories = [];
      
      for (const catId of categories) {
        const validCategory = await this.models.GenreCategorie.findOne({
          where: {
            id_categorie: catId,
            id_genre: { [Op.in]: validGenreIds },
            actif: true
          },
          include: [{
            model: this.models.Categorie,
            attributes: ['nom']
          }]
        });

        if (!validCategory) {
          const cat = await this.models.Categorie.findByPk(catId, {
            attributes: ['nom']
          });
          invalidCategories.push({
            id: catId,
            nom: cat?.nom || 'Inconnue'
          });
        }
      }

      const isValid = invalidCategories.length === 0;

      res.json({
        success: true,
        data: {
          valid: isValid,
          invalidCategories: isValid ? undefined : invalidCategories
        }
      });

    } catch (error) {
      console.error('Erreur validation hiérarchie:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la validation' 
      });
    }
  }

  /**
   * POST /api/metadata/genres-from-categories
   * Récupérer les genres associés à des catégories
   */
  async getGenresFromCategories(req, res) {
    try {
      const { categories } = req.body;
      
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.json({
          success: true,
          data: { genres: [] }
        });
      }

      // Récupérer les associations genre-catégorie
      const genreCategories = await this.models.GenreCategorie.findAll({
        where: {
          id_categorie: { [Op.in]: categories },
          actif: true
        },
        include: [{
          model: this.models.Genre,
          attributes: ['id_genre', 'nom', 'description']
        }],
        attributes: ['id_categorie', 'id_genre']
      });

      // Compter combien de catégories sélectionnées appartiennent à chaque genre
      const genreMap = new Map();
      
      genreCategories.forEach(gc => {
        const genre = gc.Genre;
        if (!genreMap.has(genre.id_genre)) {
          genreMap.set(genre.id_genre, {
            id_genre: genre.id_genre,
            nom: genre.nom,
            description: genre.description,
            categories_count: 0
          });
        }
        genreMap.get(genre.id_genre).categories_count++;
      });

      const genres = Array.from(genreMap.values())
        .sort((a, b) => b.categories_count - a.categories_count);

      res.json({
        success: true,
        data: { genres }
      });

    } catch (error) {
      console.error('Erreur récupération genres depuis catégories:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * GET /api/metadata/types-oeuvres/:typeId/has-categories
   * Vérifier si un type d'œuvre a des catégories disponibles
   */
  async checkIfTypeHasCategories(req, res) {
    try {
      const { typeId } = req.params;
      
      const validTypeGenres = await this.models.TypeOeuvreGenre.findAll({
        where: {
          id_type_oeuvre: typeId,
          actif: true
        },
        attributes: ['id_genre']
      });

      if (validTypeGenres.length === 0) {
        return res.json({
          success: true,
          data: { hasCategories: false, requiresCategories: false }
        });
      }

      const validGenreIds = validTypeGenres.map(tg => tg.id_genre);

      const categoriesCount = await this.models.GenreCategorie.count({
        where: {
          id_genre: { [Op.in]: validGenreIds },
          actif: true
        }
      });

      res.json({
        success: true,
        data: { 
          hasCategories: categoriesCount > 0,
          requiresCategories: categoriesCount > 0 
        }
      });

    } catch (error) {
      console.error('Erreur vérification catégories:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  /**
   * GET /api/metadata/langues
   */
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
      console.error('Erreur getLangues:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/types-users
   */
  async getTypesUsers(req, res) {
    try {
      const typesUsers = await this.models.TypeUser.findAll({
        order: [['nom_type', 'ASC']]
      });
      
      res.json({
        success: true,
        data: typesUsers
      });
    } catch (error) {
      console.error('Erreur getTypesUsers:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/editeurs
   */
  async getEditeurs(req, res) {
    try {
      const { type_editeur } = req.query;
      const where = { actif: true };
      
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
      console.error('Erreur getEditeurs:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/editeurs
   */
  async createEditeur(req, res) {
    try {
      const { nom, type_editeur = 'autre', site_web, email, telephone, description, actif = true } = req.body;
      
      if (!nom) {
        return res.status(400).json({
          success: false,
          error: 'Le nom de l\'éditeur est obligatoire'
        });
      }

      const editeur = await this.models.Editeur.create({
        nom,
        type_editeur,
        site_web,
        email,
        telephone,
        description,
        actif
      });

      res.status(201).json({
        success: true,
        data: editeur
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Un éditeur avec ce nom existe déjà'
        });
      }
      console.error('Erreur createEditeur:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/metadata/editeurs/:id
   * Mettre à jour un éditeur
   */
  async updateEditeur(req, res) {
    try {
      const { id } = req.params;
      const { nom, type_editeur, site_web, email, telephone, description, actif } = req.body;

      const editeur = await this.models.Editeur.findByPk(id);
      
      if (!editeur) {
        return res.status(404).json({
          success: false,
          error: 'Éditeur non trouvé'
        });
      }

      // Mise à jour des champs
      if (nom !== undefined) editeur.nom = nom;
      if (type_editeur !== undefined) editeur.type_editeur = type_editeur;
      if (site_web !== undefined) editeur.site_web = site_web;
      if (email !== undefined) editeur.email = email;
      if (telephone !== undefined) editeur.telephone = telephone;
      if (description !== undefined) editeur.description = description;
      if (actif !== undefined) editeur.actif = actif;

      await editeur.save();

      res.json({
        success: true,
        data: editeur
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Un éditeur avec ce nom existe déjà'
        });
      }
      console.error('Erreur updateEditeur:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/metadata/editeurs/:id
   * Supprimer/désactiver un éditeur
   */
  async deleteEditeur(req, res) {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      const editeur = await this.models.Editeur.findByPk(id);
      
      if (!editeur) {
        return res.status(404).json({
          success: false,
          error: 'Éditeur non trouvé'
        });
      }

      if (force === 'true') {
        // Suppression définitive
        await editeur.destroy();
        res.json({
          success: true,
          message: 'Éditeur supprimé définitivement'
        });
      } else {
        // Désactivation
        editeur.actif = false;
        await editeur.save();
        res.json({
          success: true,
          message: 'Éditeur désactivé'
        });
      }
    } catch (error) {
      console.error('Erreur deleteEditeur:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/tags
   */
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
      console.error('Erreur getTags:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/tags
   */
  async createTag(req, res) {
    try {
      const { nom } = req.body;
      
      if (!nom) {
        return res.status(400).json({
          success: false,
          error: 'Le nom du tag est obligatoire'
        });
      }

      const nomNormalized = nom.trim().toLowerCase();

      const [tag, created] = await this.models.TagMotCle.findOrCreate({
        where: { nom: nomNormalized },
        defaults: { nom: nomNormalized }
      });

      res.status(created ? 201 : 200).json({
        success: true,
        data: tag,
        created
      });
    } catch (error) {
      console.error('Erreur createTag:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/materiaux
   */
  async getMateriaux(req, res) {
    try {
      if (!this.models.Materiau) {
        return res.json({
          success: true,
          data: []
        });
      }

      const materiaux = await this.models.Materiau.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: materiaux
      });
    } catch (error) {
      console.error('Erreur getMateriaux:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/materiaux
   * Créer un nouveau matériau
   */
  async createMateriau(req, res) {
    try {
      if (!this.models.Materiau) {
        return res.status(404).json({
          success: false,
          error: 'Le modèle Materiau n\'est pas disponible'
        });
      }

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
        data: materiau
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Un matériau avec ce nom existe déjà'
        });
      }
      console.error('Erreur createMateriau:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/metadata/materiaux/:id
   * Mettre à jour un matériau
   */
  async updateMateriau(req, res) {
    try {
      if (!this.models.Materiau) {
        return res.status(404).json({
          success: false,
          error: 'Le modèle Materiau n\'est pas disponible'
        });
      }

      const { id } = req.params;
      const { nom, description } = req.body;

      const materiau = await this.models.Materiau.findByPk(id);
      
      if (!materiau) {
        return res.status(404).json({
          success: false,
          error: 'Matériau non trouvé'
        });
      }

      if (nom !== undefined) materiau.nom = nom;
      if (description !== undefined) materiau.description = description;

      await materiau.save();

      res.json({
        success: true,
        data: materiau
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Un matériau avec ce nom existe déjà'
        });
      }
      console.error('Erreur updateMateriau:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/metadata/materiaux/:id
   * Supprimer un matériau
   */
  async deleteMateriau(req, res) {
    try {
      if (!this.models.Materiau) {
        return res.status(404).json({
          success: false,
          error: 'Le modèle Materiau n\'est pas disponible'
        });
      }

      const { id } = req.params;

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
        message: 'Matériau supprimé'
      });
    } catch (error) {
      console.error('Erreur deleteMateriau:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/techniques
   */
  async getTechniques(req, res) {
    try {
      if (!this.models.Technique) {
        return res.json({
          success: true,
          data: []
        });
      }

      const techniques = await this.models.Technique.findAll({
        order: [['nom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: techniques
      });
    } catch (error) {
      console.error('Erreur getTechniques:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/metadata/techniques
   * Créer une nouvelle technique
   */
  async createTechnique(req, res) {
    try {
      if (!this.models.Technique) {
        return res.status(404).json({
          success: false,
          error: 'Le modèle Technique n\'est pas disponible'
        });
      }

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
        data: technique
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Une technique avec ce nom existe déjà'
        });
      }
      console.error('Erreur createTechnique:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/metadata/techniques/:id
   * Mettre à jour une technique
   */
  async updateTechnique(req, res) {
    try {
      if (!this.models.Technique) {
        return res.status(404).json({
          success: false,
          error: 'Le modèle Technique n\'est pas disponible'
        });
      }

      const { id } = req.params;
      const { nom, description } = req.body;

      const technique = await this.models.Technique.findByPk(id);
      
      if (!technique) {
        return res.status(404).json({
          success: false,
          error: 'Technique non trouvée'
        });
      }

      if (nom !== undefined) technique.nom = nom;
      if (description !== undefined) technique.description = description;

      await technique.save();

      res.json({
        success: true,
        data: technique
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Une technique avec ce nom existe déjà'
        });
      }
      console.error('Erreur updateTechnique:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/metadata/techniques/:id
   * Supprimer une technique
   */
  async deleteTechnique(req, res) {
    try {
      if (!this.models.Technique) {
        return res.status(404).json({
          success: false,
          error: 'Le modèle Technique n\'est pas disponible'
        });
      }

      const { id } = req.params;

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
        message: 'Technique supprimée'
      });
    } catch (error) {
      console.error('Erreur deleteTechnique:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/categories
   * Toutes les catégories (sans filtre)
   */
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
      console.error('Erreur getCategories:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/categories/search
   * Rechercher des catégories
   */
  async searchCategories(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const categories = await this.models.Categorie.findAll({
        where: {
          [Op.or]: [
            { nom: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } }
          ]
        },
        order: [['nom', 'ASC']],
        limit: 20
      });
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Erreur searchCategories:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/genres
   * Tous les genres (sans filtre)
   */
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
      console.error('Erreur getGenres:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/types-evenements
   */
  async getTypesEvenements(req, res) {
    try {
      if (!this.models.TypeEvenement) {
        return res.json({
          success: true,
          data: []
        });
      }

      const types = await this.models.TypeEvenement.findAll({
        order: [['nom_type', 'ASC']]
      });
      
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Erreur getTypesEvenements:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/types-organisations
   */
  async getTypesOrganisations(req, res) {
    try {
      if (!this.models.TypeOrganisation) {
        return res.json({
          success: true,
          data: []
        });
      }

      const types = await this.models.TypeOrganisation.findAll({
        order: [['nom_type', 'ASC']]
      });
      
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Erreur getTypesOrganisations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/wilayas
   */
  async getWilayas(req, res) {
    try {
      if (!this.models.Wilaya) {
        return res.json({
          success: true,
          data: []
        });
      }

      const { includeDairas, includeCommunes } = req.query;
      
      const include = [];
      
      if (includeDairas === 'true' && this.models.Daira) {
        const dairaInclude = {
          model: this.models.Daira,
          as: 'dairas',
          attributes: ['id_daira', 'nom_fr', 'nom_ar']
        };
        
        if (includeCommunes === 'true' && this.models.Commune) {
          dairaInclude.include = [{
            model: this.models.Commune,
            as: 'communes',
            attributes: ['id_commune', 'nom_fr', 'nom_ar']
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
      console.error('Erreur getWilayas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/wilayas/search
   * Rechercher des wilayas
   */
  async searchWilayas(req, res) {
    try {
      if (!this.models.Wilaya) {
        return res.json({
          success: true,
          data: []
        });
      }

      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const wilayas = await this.models.Wilaya.findAll({
        where: {
          [Op.or]: [
            { wilaya_name_ascii: { [Op.like]: `%${q}%` } },
            { nom: { [Op.like]: `%${q}%` } },
            { codeW: { [Op.like]: `%${q}%` } }
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
      console.error('Erreur searchWilayas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/wilayas/:id/dairas
   * Récupérer les dairas d'une wilaya
   */
  async getDairasByWilaya(req, res) {
    try {
      if (!this.models.Daira) {
        return res.json({
          success: true,
          data: []
        });
      }

      const { id } = req.params;
      
      const dairas = await this.models.Daira.findAll({
        where: { id_wilaya: id },
        attributes: ['id_daira', 'nom', 'daira_name_ascii'],
        order: [['daira_name_ascii', 'ASC']]
      });
      
      res.json({
        success: true,
        data: dairas
      });
    } catch (error) {
      console.error('Erreur getDairasByWilaya:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/dairas/:id/communes
   * Récupérer les communes d'une daira
   */
  async getCommunesByDaira(req, res) {
    try {
      if (!this.models.Commune) {
        return res.json({
          success: true,
          data: []
        });
      }

      const { id } = req.params;
      
      const communes = await this.models.Commune.findAll({
        where: { id_daira: id },
        attributes: ['id_commune', 'nom', 'commune_name_ascii'],
        order: [['commune_name_ascii', 'ASC']]
      });
      
      res.json({
        success: true,
        data: communes
      });
    } catch (error) {
      console.error('Erreur getCommunesByDaira:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/communes/:id/localites
   * Récupérer les localités d'une commune
   */
  async getLocalitesByCommune(req, res) {
    try {
      if (!this.models.Localite) {
        return res.json({
          success: true,
          data: []
        });
      }

      const { id } = req.params;
      
      const localites = await this.models.Localite.findAll({
        where: { id_commune: id },
        attributes: ['id_localite', 'nom_fr', 'nom_ar'],
        order: [['nom_fr', 'ASC']]
      });
      
      res.json({
        success: true,
        data: localites
      });
    } catch (error) {
      console.error('Erreur getLocalitesByCommune:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/metadata/statistics
   * Récupérer les statistiques d'utilisation des métadonnées
   */
  async getUsageStatistics(req, res) {
    try {
      const stats = {};

      // Statistiques générales
      const [
        totalLangues,
        totalCategories,
        totalGenres,
        totalTypesOeuvres,
        totalEditeurs,
        totalTags,
        totalMateriaux,
        totalTechniques
      ] = await Promise.all([
        this.models.Langue.count(),
        this.models.Categorie.count(),
        this.models.Genre.count(),
        this.models.TypeOeuvre.count(),
        this.models.Editeur.count({ where: { actif: true } }),
        this.models.TagMotCle.count(),
        this.models.Materiau?.count() || 0,
        this.models.Technique?.count() || 0
      ]);

      stats.totals = {
        langues: totalLangues,
        categories: totalCategories,
        genres: totalGenres,
        typesOeuvres: totalTypesOeuvres,
        editeurs: totalEditeurs,
        tags: totalTags,
        materiaux: totalMateriaux,
        techniques: totalTechniques
      };

      // Statistiques d'utilisation si les modèles existent
      if (this.models.Oeuvre) {
        const [
          oeuvresTotales,
          oeuvresParLangue,
          oeuvresParType,
          oeuvresParEditeur
        ] = await Promise.all([
          this.models.Oeuvre.count(),
          
          this.models.Oeuvre.count({
            attributes: ['id_langue_principale'],
            group: ['id_langue_principale'],
            include: [{
              model: this.models.Langue,
              as: 'langue_principale',
              attributes: ['nom']
            }]
          }),
          
          this.models.Oeuvre.count({
            attributes: ['id_type_oeuvre'],
            group: ['id_type_oeuvre'],
            include: [{
              model: this.models.TypeOeuvre,
              attributes: ['nom_type']
            }]
          }),
          
          this.models.Oeuvre.count({
            attributes: ['id_editeur'],
            group: ['id_editeur'],
            include: [{
              model: this.models.Editeur,
              attributes: ['nom']
            }]
          })
        ]);

        stats.usage = {
          oeuvresTotales,
          oeuvresParLangue: oeuvresParLangue.slice(0, 10),
          oeuvresParType: oeuvresParType.slice(0, 10),
          oeuvresParEditeur: oeuvresParEditeur.slice(0, 10)
        };
      }

      // Statistiques récentes
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const recentStats = {};
      
      if (this.models.TagMotCle) {
        recentStats.tagsRecents = await this.models.TagMotCle.count({
          where: {
            createdAt: { [Op.gte]: oneMonthAgo }
          }
        });
      }

      if (this.models.Editeur) {
        recentStats.editeursRecents = await this.models.Editeur.count({
          where: {
            createdAt: { [Op.gte]: oneMonthAgo }
          }
        });
      }

      stats.recent = recentStats;

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur getUsageStatistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = MetadataController;