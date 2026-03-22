// services/HierarchieService.js - Version améliorée
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class HierarchieService {
  constructor() {
    this._models = null;
    this._initialized = false;
  }

  /**
   * Initialiser le service avec les modèles
   * @param {Object} models - Les modèles Sequelize
   * @returns {HierarchieService} L'instance du service
   */
  initialize(models) {
    if (!models) {
      throw new Error('Les modèles sont requis pour initialiser HierarchieService');
    }

    // Vérifier les modèles essentiels
    const requiredModels = ['TypeOeuvre', 'Genre', 'Categorie', 'TypeOeuvreGenre', 'GenreCategorie'];
    const missingModels = requiredModels.filter(modelName => !models[modelName]);
    
    if (missingModels.length > 0) {
      throw new Error(`Modèles manquants pour HierarchieService: ${missingModels.join(', ')}`);
    }

    this._models = models;
    this._initialized = true;
    
    logger.info('✅ HierarchieService initialisé avec succès');
    logger.info('   Modèles disponibles:', Object.keys(models).filter(k => requiredModels.includes(k)));
    
    return this;
  }

  /**
   * Obtenir les modèles (avec vérification)
   */
  get models() {
    if (!this._initialized || !this._models) {
      throw new Error('HierarchieService n\'est pas initialisé. Appelez initialize(models) d\'abord.');
    }
    return this._models;
  }

  /**
   * Vérifier si le service est initialisé
   */
  get isInitialized() {
    return this._initialized && this._models !== null;
  }

  /**
   * Obtenir tous les types d'œuvres
   */
  async getTypesOeuvres() {
    try {
      return await this.models.TypeOeuvre.findAll({
        attributes: ['id_type_oeuvre', 'nom_type', 'description'],
        order: [['nom_type', 'ASC']]
      });
    } catch (error) {
      logger.error('Erreur dans getTypesOeuvres:', error);
      throw new Error('Erreur lors de la récupération des types d\'œuvres');
    }
  }

  /**
   * Obtenir les genres disponibles pour un type d'œuvre
   */
  async getGenresParType(idTypeOeuvre) {
    try {
      logger.info(`🔍 Recherche des genres pour le type ${idTypeOeuvre}`);
      
      // Méthode 1: Via les associations
      const typeOeuvre = await this.models.TypeOeuvre.findByPk(idTypeOeuvre, {
        include: [{
          model: this.models.Genre,
          as: 'GenresDisponibles',
          through: {
            where: { actif: true },
            attributes: ['ordre_affichage']
          },
          attributes: ['id_genre', 'nom', 'description']
        }]
      });

      if (!typeOeuvre) {
        // Méthode 2: Requête directe sur la table de liaison
        const genreAssociations = await this.models.TypeOeuvreGenre.findAll({
          where: {
            id_type_oeuvre: idTypeOeuvre,
            actif: true
          },
          include: [{
            model: this.models.Genre,
            attributes: ['id_genre', 'nom', 'description']
          }],
          order: [['ordre_affichage', 'ASC']]
        });

        if (genreAssociations.length === 0) {
          throw new Error(`Type d'œuvre avec l'ID ${idTypeOeuvre} non trouvé ou sans genres associés`);
        }

        const genres = genreAssociations.map(assoc => ({
          id_genre: assoc.Genre.id_genre,
          nom: assoc.Genre.nom,
          description: assoc.Genre.description,
          ordre_affichage: assoc.ordre_affichage
        }));

        logger.info(`✅ ${genres.length} genres trouvés pour le type ${idTypeOeuvre} (méthode alternative)`);
        return genres;
      }

      // Extraire et formater les genres
      const genres = (typeOeuvre.GenresDisponibles || []).map(genre => ({
        id_genre: genre.id_genre,
        nom: genre.nom,
        description: genre.description,
        ordre_affichage: genre.TypeOeuvreGenre?.ordre_affichage || 0
      }));

      // Trier par ordre d'affichage
      genres.sort((a, b) => a.ordre_affichage - b.ordre_affichage);

      logger.info(`✅ ${genres.length} genres trouvés pour le type ${idTypeOeuvre}`);
      return genres;
    } catch (error) {
      logger.error('Erreur dans getGenresParType:', error);
      throw error;
    }
  }

  /**
   * Obtenir les catégories disponibles pour un genre
   */
  async getCategoriesParGenre(idGenre) {
    try {
      logger.info(`🔍 Recherche des catégories pour le genre ${idGenre}`);

      // Méthode 1: Via les associations
      const genre = await this.models.Genre.findByPk(idGenre, {
        include: [{
          model: this.models.Categorie,
          as: 'CategoriesDisponibles',
          through: {
            where: { actif: true },
            attributes: ['ordre_affichage']
          },
          attributes: ['id_categorie', 'nom', 'description']
        }]
      });

      if (!genre) {
        // Méthode 2: Requête directe
        const categorieAssociations = await this.models.GenreCategorie.findAll({
          where: {
            id_genre: idGenre,
            actif: true
          },
          include: [{
            model: this.models.Categorie,
            attributes: ['id_categorie', 'nom', 'description']
          }],
          order: [['ordre_affichage', 'ASC']]
        });

        if (categorieAssociations.length === 0) {
          throw new Error(`Genre avec l'ID ${idGenre} non trouvé ou sans catégories associées`);
        }

        const categories = categorieAssociations.map(assoc => ({
          id_categorie: assoc.Categorie.id_categorie,
          nom: assoc.Categorie.nom,
          description: assoc.Categorie.description,
          ordre_affichage: assoc.ordre_affichage
        }));

        logger.info(`✅ ${categories.length} catégories trouvées pour le genre ${idGenre} (méthode alternative)`);
        return categories;
      }

      // Extraire et formater les catégories
      const categories = (genre.CategoriesDisponibles || []).map(categorie => ({
        id_categorie: categorie.id_categorie,
        nom: categorie.nom,
        description: categorie.description,
        ordre_affichage: categorie.GenreCategorie?.ordre_affichage || 0
      }));

      // Trier par ordre d'affichage
      categories.sort((a, b) => a.ordre_affichage - b.ordre_affichage);

      logger.info(`✅ ${categories.length} catégories trouvées pour le genre ${idGenre}`);
      return categories;
    } catch (error) {
      logger.error('Erreur dans getCategoriesParGenre:', error);
      throw error;
    }
  }

  /**
   * Valider une sélection complète (Type → Genre → Catégories)
   */
  async validerSelection(idTypeOeuvre, idGenre, idCategories = []) {
    try {
      // Vérifier Type → Genre
      const genreValide = await this.models.TypeOeuvreGenre.findOne({
        where: {
          id_type_oeuvre: idTypeOeuvre,
          id_genre: idGenre,
          actif: true
        }
      });

      if (!genreValide) {
        return {
          valide: false,
          erreur: 'Le genre sélectionné n\'est pas disponible pour ce type d\'œuvre'
        };
      }

      // Vérifier Genre → Catégories
      if (idCategories.length > 0) {
        const categoriesValides = await this.models.GenreCategorie.count({
          where: {
            id_genre: idGenre,
            id_categorie: idCategories,
            actif: true
          }
        });

        if (categoriesValides !== idCategories.length) {
          return {
            valide: false,
            erreur: 'Une ou plusieurs catégories ne sont pas disponibles pour ce genre'
          };
        }
      }

      return { valide: true };
    } catch (error) {
      logger.error('Erreur dans validerSelection:', error);
      throw error;
    }
  }

  /**
   * Obtenir la hiérarchie complète
   */
  async getHierarchieComplete() {
    try {
      const types = await this.models.TypeOeuvre.findAll({
        include: [{
          model: this.models.Genre,
          as: 'GenresDisponibles',
          through: {
            where: { actif: true },
            attributes: ['ordre_affichage']
          },
          include: [{
            model: this.models.Categorie,
            as: 'CategoriesDisponibles',
            through: {
              where: { actif: true },
              attributes: ['ordre_affichage']
            }
          }]
        }],
        order: [
          ['nom_type', 'ASC']
        ]
      });

      return types;
    } catch (error) {
      logger.error('Erreur dans getHierarchieComplete:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation
   */
  async getStatistiquesUtilisation() {
    try {
      // Vérifier que le modèle Oeuvre existe
      if (!this.models.Oeuvre) {
        logger.warn('Modèle Oeuvre non disponible pour les statistiques');
        return {
          global: [],
          detaille: {}
        };
      }

      // Statistiques par type
      const statsParType = await this.models.TypeOeuvre.findAll({
        attributes: [
          'id_type_oeuvre',
          'nom_type',
          [this.models.sequelize.fn('COUNT', this.models.sequelize.col('Oeuvres.id_oeuvre')), 'count']
        ],
        include: [{
          model: this.models.Oeuvre,
          as: 'Oeuvres',
          attributes: [],
          required: false
        }],
        group: ['TypeOeuvre.id_type_oeuvre', 'TypeOeuvre.nom_type'],
        raw: true
      });

      const statsDetaillees = {};
      
      // Pour chaque type, obtenir les stats par genre
      for (const stat of statsParType) {
        const modelName = this.getModelNameByType(stat.id_type_oeuvre);
        if (modelName && this.models[modelName]) {
          try {
            const genreStats = await this.models[modelName].findAll({
              attributes: [
                [this.models.sequelize.col('Genre.nom'), 'genre'],
                [this.models.sequelize.fn('COUNT', '*'), 'count']
              ],
              include: [{
                model: this.models.Genre,
                attributes: [],
                required: true
              }],
              group: ['Genre.id_genre', 'Genre.nom'],
              raw: true
            });
            
            statsDetaillees[stat.nom_type] = {
              total: parseInt(stat.count) || 0,
              parGenre: genreStats
            };
          } catch (err) {
            logger.warn(`Impossible d'obtenir les stats pour ${modelName}:`, err.message);
          }
        }
      }

      return {
        global: statsParType.map(s => ({
          type: s.nom_type,
          count: parseInt(s.count) || 0
        })),
        detaille: statsDetaillees
      };
    } catch (error) {
      logger.error('Erreur dans getStatistiquesUtilisation:', error);
      throw error;
    }
  }

  /**
   * Ajouter un genre à un type
   */
  async ajouterGenreAuType(idTypeOeuvre, idGenre, ordreAffichage = 0) {
    try {
      // Vérifier l'existence
      const type = await this.models.TypeOeuvre.findByPk(idTypeOeuvre);
      const genre = await this.models.Genre.findByPk(idGenre);

      if (!type) throw new Error('Type d\'œuvre non trouvé');
      if (!genre) throw new Error('Genre non trouvé');

      // Créer ou mettre à jour la relation
      const [relation, created] = await this.models.TypeOeuvreGenre.findOrCreate({
        where: {
          id_type_oeuvre: idTypeOeuvre,
          id_genre: idGenre
        },
        defaults: {
          ordre_affichage: ordreAffichage,
          actif: true
        }
      });

      if (!created && !relation.actif) {
        await relation.update({ actif: true, ordre_affichage: ordreAffichage });
      }

      return relation;
    } catch (error) {
      logger.error('Erreur dans ajouterGenreAuType:', error);
      throw error;
    }
  }

  /**
   * Ajouter une catégorie à un genre
   */
  async ajouterCategorieAuGenre(idGenre, idCategorie, ordreAffichage = 0) {
    try {
      // Vérifier l'existence
      const genre = await this.models.Genre.findByPk(idGenre);
      const categorie = await this.models.Categorie.findByPk(idCategorie);

      if (!genre) throw new Error('Genre non trouvé');
      if (!categorie) throw new Error('Catégorie non trouvée');

      // Créer ou mettre à jour la relation
      const [relation, created] = await this.models.GenreCategorie.findOrCreate({
        where: {
          id_genre: idGenre,
          id_categorie: idCategorie
        },
        defaults: {
          ordre_affichage: ordreAffichage,
          actif: true
        }
      });

      if (!created && !relation.actif) {
        await relation.update({ actif: true, ordre_affichage: ordreAffichage });
      }

      return relation;
    } catch (error) {
      logger.error('Erreur dans ajouterCategorieAuGenre:', error);
      throw error;
    }
  }

  /**
   * Modifier une relation
   */
  async modifierRelation(modelName, where, updates) {
    try {
      const Model = this.models[modelName];
      if (!Model) throw new Error(`Modèle ${modelName} non trouvé`);

      const relation = await Model.findOne({ where });
      if (!relation) throw new Error('Relation non trouvée');

      await relation.update(updates);
      return relation;
    } catch (error) {
      logger.error('Erreur dans modifierRelation:', error);
      throw error;
    }
  }

  /**
   * Désactiver une relation
   */
  async desactiverRelation(modelName, where) {
    return this.modifierRelation(modelName, where, { actif: false });
  }

  /**
   * Helper pour obtenir le nom du modèle selon le type
   */
  getModelNameByType(idTypeOeuvre) {
    const mapping = {
      1: 'Livre',
      2: 'Film',
      3: 'AlbumMusical',
      4: 'Article',
      5: 'ArticleScientifique',
      6: 'OeuvreArt',
      7: 'Artisanat'
    };
    return mapping[idTypeOeuvre];
  }

  /**
   * Réinitialiser le service (utile pour les tests)
   */
  reset() {
    this._models = null;
    this._initialized = false;
    logger.info('⚠️ HierarchieService réinitialisé');
  }
}

// Créer une instance unique (singleton)
const instance = new HierarchieService();

// Exporter l'instance
module.exports = instance;