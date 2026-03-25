/**
 * MetadataController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Models
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier/data access délèguée au MetadataService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translate, translateDeep } = require('../helpers/i18n');

class MetadataController extends BaseController {
  get metadataService() {
    return container.metadataService;
  }

  // ========================================================================
  // MÉTHODES DE CONSULTATION PUBLIQUES
  // ========================================================================

  async getAllMetadata(req, res) {
    try {
      const lang = req.lang || 'fr';
      const data = await this.metadataService.getAllMetadata();

      res.json({
        success: true,
        data: {
          langues: translateDeep(data.langues, lang),
          categories: translateDeep(data.categories, lang),
          genres: translateDeep(data.genres, lang),
          types_oeuvres: translateDeep(data.types_oeuvres, lang),
          editeurs: data.editeurs,
          types_users: translateDeep(data.types_users, lang),
          tags: translateDeep(data.tags, lang),
          materiaux: translateDeep(data.materiaux, lang),
          techniques: translateDeep(data.techniques, lang)
        },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypesOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';
      const types = await this.metadataService.getTypesOeuvres();
      res.json({ success: true, data: translateDeep(types, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getCategoriesForType(req, res) {
    try {
      const lang = req.lang || 'fr';
      const categories = await this.metadataService.getCategoriesForType(req.params.typeId);
      res.json({
        success: true,
        data: categories.map(group => ({
          ...group,
          nom: translate(group.nom, lang),
          description: translate(group.description, lang),
          categories: translateDeep(group.categories, lang)
        })),
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async hasCategoriesForType(req, res) {
    try {
      const result = await this.metadataService.hasCategoriesForType(req.params.typeId);
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getGenresParType(req, res) {
    try {
      const lang = req.lang || 'fr';
      const genres = await this.metadataService.getGenresParType(req.params.typeId);
      res.json({ success: true, data: translateDeep(genres, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getCategoriesParGenre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const categories = await this.metadataService.getCategoriesParGenre(req.params.genreId);
      res.json({ success: true, data: translateDeep(categories, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getHierarchieComplete(req, res) {
    try {
      const lang = req.lang || 'fr';
      const types = await this.metadataService.getHierarchieComplete();

      const hierarchy = types.map(type => {
        const typeJson = type.toJSON ? type.toJSON() : type;
        const togs = typeJson.typeOeuvreGenres || typeJson.type_oeuvre_genres || [];
        return {
          id_type_oeuvre: typeJson.id_type_oeuvre,
          nom_type: translate(typeJson.nom_type, lang),
          description: translate(typeJson.description, lang),
          genres: togs.map(tg => {
            const g = tg.genre || tg.Genre;
            const gcs = g?.genreCategories || g?.genre_categories || [];
            return {
              id_genre: g?.id_genre,
              nom: translate(g?.nom, lang),
              description: translate(g?.description, lang),
              ordre_affichage: tg.ordre_affichage,
              categories: gcs.map(gc => {
                const cat = gc.categorie || gc.Categorie;
                return {
                  id_categorie: cat?.id_categorie,
                  nom: translate(cat?.nom, lang),
                  description: translate(cat?.description, lang),
                  ordre_affichage: gc.ordre_affichage
                };
              })
            };
          })
        };
      });

      res.json({ success: true, data: hierarchy, lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getGenres(req, res) {
    try {
      const lang = req.lang || 'fr';
      const genres = await this.metadataService.getGenres();
      res.json({ success: true, data: translateDeep(genres, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTags(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { search, limit } = req.query;
      const tags = await this.metadataService.getTags({ search, limit });
      res.json({ success: true, data: translateDeep(tags, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMateriaux(req, res) {
    try {
      const lang = req.lang || 'fr';
      const materiaux = await this.metadataService.getMateriaux();
      res.json({ success: true, data: translateDeep(materiaux, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTechniques(req, res) {
    try {
      const lang = req.lang || 'fr';
      const techniques = await this.metadataService.getTechniques();
      res.json({ success: true, data: translateDeep(techniques, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getLangues(req, res) {
    try {
      const lang = req.lang || 'fr';
      const langues = await this.metadataService.getLangues();
      res.json({ success: true, data: translateDeep(langues, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getWilayas(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { includeDairas = 'false', includeCommunes = 'false' } = req.query;
      const wilayas = await this.metadataService.getWilayas({
        includeDairas: includeDairas === 'true',
        includeCommunes: includeCommunes === 'true'
      });
      res.json({ success: true, data: translateDeep(wilayas, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getDairasParWilaya(req, res) {
    try {
      const lang = req.lang || 'fr';
      const dairas = await this.metadataService.getDairasParWilaya(req.params.wilayaId);
      res.json({ success: true, data: translateDeep(dairas, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getCommunesParDaira(req, res) {
    try {
      const lang = req.lang || 'fr';
      const communes = await this.metadataService.getCommunesParDaira(req.params.dairaId);
      res.json({ success: true, data: translateDeep(communes, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypesEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';
      const types = await this.metadataService.getTypesEvenements();
      res.json({ success: true, data: translateDeep(types, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypesUsers(req, res) {
    try {
      const lang = req.lang || 'fr';
      const types = await this.metadataService.getTypesUsers();
      res.json({ success: true, data: translateDeep(types, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypesOrganisations(req, res) {
    try {
      const lang = req.lang || 'fr';
      const types = await this.metadataService.getTypesOrganisations();
      res.json({ success: true, data: translateDeep(types, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getEditeurs(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { search, limit } = req.query;
      const editeurs = await this.metadataService.getEditeurs({ search, limit });
      res.json({ success: true, data: translateDeep(editeurs, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // TRADUCTION ADMIN
  // ========================================================================

  async getCategorieTranslations(req, res) {
    try {
      const data = await this.metadataService.getCategorieTranslations(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateCategorieTranslation(req, res) {
    try {
      const targetLang = req.targetLanguage || req.params.lang;
      const result = await this.metadataService.updateCategorieTranslation(req.params.id, targetLang, req.body);
      if (!result) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getGenreTranslations(req, res) {
    try {
      const data = await this.metadataService.getGenreTranslations(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateGenreTranslation(req, res) {
    try {
      const targetLang = req.targetLanguage || req.params.lang;
      const result = await this.metadataService.updateGenreTranslation(req.params.id, targetLang, req.body);
      if (!result) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypeOeuvreTranslations(req, res) {
    try {
      const data = await this.metadataService.getTypeOeuvreTranslations(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateTypeOeuvreTranslation(req, res) {
    try {
      const targetLang = req.targetLanguage || req.params.lang;
      const result = await this.metadataService.updateTypeOeuvreTranslation(req.params.id, targetLang, req.body);
      if (!result) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTagTranslations(req, res) {
    try {
      const data = await this.metadataService.getTagTranslations(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateTagTranslation(req, res) {
    try {
      const targetLang = req.targetLanguage || req.params.lang;
      const result = await this.metadataService.updateTagTranslation(req.params.id, targetLang, req.body);
      if (!result) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMateriauTranslations(req, res) {
    try {
      const data = await this.metadataService.getMateriauTranslations(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateMateriauTranslation(req, res) {
    try {
      const targetLang = req.targetLanguage || req.params.lang;
      const result = await this.metadataService.updateMateriauTranslation(req.params.id, targetLang, req.body);
      if (!result) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTechniqueTranslations(req, res) {
    try {
      const data = await this.metadataService.getTechniqueTranslations(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateTechniqueTranslation(req, res) {
    try {
      const targetLang = req.targetLanguage || req.params.lang;
      const result = await this.metadataService.updateTechniqueTranslation(req.params.id, targetLang, req.body);
      if (!result) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // CRÉATION ADMIN
  // ========================================================================

  async createTypeOeuvre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const type = await this.metadataService.createTypeOeuvre(lang, req.body);
      this._sendCreated(res, translateDeep(type, lang), req.t('metadata.typeOeuvreCreated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async createGenre(req, res) {
    try {
      const lang = req.lang || 'fr';
      const genre = await this.metadataService.createGenre(lang, req.body);
      this._sendCreated(res, translateDeep(genre, lang), req.t('metadata.genreCreated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async createCategorie(req, res) {
    try {
      const lang = req.lang || 'fr';
      const categorie = await this.metadataService.createCategorie(lang, req.body);
      this._sendCreated(res, translateDeep(categorie, lang), req.t('metadata.categorieCreated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async createTag(req, res) {
    try {
      const lang = req.lang || 'fr';
      const tag = await this.metadataService.createTag(lang, req.body);
      this._sendCreated(res, translateDeep(tag, lang), req.t('metadata.tagCreated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async createMateriau(req, res) {
    try {
      const lang = req.lang || 'fr';
      const materiau = await this.metadataService.createMateriau(lang, req.body);
      if (!materiau) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendCreated(res, translateDeep(materiau, lang), req.t('metadata.materiauCreated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async createTechnique(req, res) {
    try {
      const lang = req.lang || 'fr';
      const technique = await this.metadataService.createTechnique(lang, req.body);
      if (!technique) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendCreated(res, translateDeep(technique, lang), req.t('metadata.techniqueCreated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async createEditeur(req, res) {
    try {
      const lang = req.lang || 'fr';
      const editeur = await this.metadataService.createEditeur(lang, req.body);
      if (!editeur) return res.status(404).json({ success: false, error: req.t('common.notFound') });
      this._sendCreated(res, translateDeep(editeur, lang), req.t('metadata.editeurCreated', 'Éditeur créé'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getUsageStatistics(req, res) {
    try {
      const totals = await this.metadataService.getUsageStatistics();
      this._sendSuccess(res, { totals });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new MetadataController();
