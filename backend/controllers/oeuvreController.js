/**
 * OeuvreControllerV2 - Controller refactoré avec Service Pattern
 *
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class OeuvreControllerV2 extends BaseController {
  /**
   * Getter pour le service œuvre
   * @private
   */
  get oeuvreService() {
    return container.oeuvreService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  /**
   * GET /api/v2/oeuvres
   * Liste des œuvres publiées
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 20, type, category } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      let result;

      if (type) {
        result = await this.oeuvreService.findByType(parseInt(type), options);
      } else if (category) {
        result = await this.oeuvreService.findByCategory(parseInt(category), options);
      } else {
        result = await this.oeuvreService.findPublished(options);
      }

      res.json({
        success: true,
        data: this._translateOeuvres(result.data, req.lang),
        pagination: result.pagination
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/search
   * Recherche avancée
   */
  async search(req, res) {
    try {
      const {
        q: query,
        type: typeOeuvre,
        langue,
        categories,
        anneeMin,
        anneeMax,
        prixMin,
        prixMax,
        page = 1,
        limit = 20,
        sortBy = 'date_creation',
        sortOrder = 'DESC'
      } = req.query;

      const result = await this.oeuvreService.searchAdvanced({
        query,
        typeOeuvre: typeOeuvre ? parseInt(typeOeuvre) : null,
        langue: langue ? parseInt(langue) : null,
        categories: categories ? categories.split(',').map(Number) : null,
        anneeMin: anneeMin ? parseInt(anneeMin) : null,
        anneeMax: anneeMax ? parseInt(anneeMax) : null,
        prixMin: prixMin ? parseFloat(prixMin) : null,
        prixMax: prixMax ? parseFloat(prixMax) : null,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        data: this._translateOeuvres(result.data, req.lang),
        pagination: result.pagination
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/popular
   * Œuvres populaires
   */
  async getPopular(req, res) {
    try {
      const { limit = 10 } = req.query;
      const oeuvres = await this.oeuvreService.findPopular(parseInt(limit));

      res.json({
        success: true,
        data: this._translateOeuvres(oeuvres, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/recent
   * Œuvres récentes
   */
  async getRecent(req, res) {
    try {
      const { limit = 10 } = req.query;
      const oeuvres = await this.oeuvreService.findRecent(parseInt(limit));

      res.json({
        success: true,
        data: this._translateOeuvres(oeuvres, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/:id
   * Détails d'une œuvre
   */
  async getById(req, res) {
    try {
      const oeuvre = await this.oeuvreService.findWithFullDetails(parseInt(req.params.id));

      res.json({
        success: true,
        data: this._translateOeuvre(oeuvre, req.lang, 'detail')
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/:id/similar
   * Œuvres similaires
   */
  async getSimilar(req, res) {
    try {
      const { limit = 5 } = req.query;
      const oeuvres = await this.oeuvreService.findSimilar(
        parseInt(req.params.id),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: this._translateOeuvres(oeuvres, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  /**
   * POST /api/v2/oeuvres
   * Créer une œuvre
   */
  async create(req, res) {
    try {
      const result = await this.oeuvreService.create(req.body, req.user.id_user);

      const responseData = {
        oeuvre: this._translateOeuvre(result.oeuvre, req.lang)
      };
      if (result.article_scientifique) {
        responseData.article_scientifique = result.article_scientifique;
      }
      if (result.article) {
        responseData.article = result.article;
      }

      res.status(201).json({
        success: true,
        message: req.t('oeuvre.created'),
        data: responseData
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * PUT /api/v2/oeuvres/:id
   * Mettre à jour une œuvre
   */
  async update(req, res) {
    try {
      const oeuvre = await this.oeuvreService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );

      res.json({
        success: true,
        message: req.t('oeuvre.updated'),
        data: this._translateOeuvre(oeuvre, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * DELETE /api/v2/oeuvres/:id
   * Supprimer une œuvre
   */
  async delete(req, res) {
    try {
      await this.oeuvreService.delete(
        parseInt(req.params.id),
        req.user.id_user
      );

      res.json({
        success: true,
        message: req.t('oeuvre.deleted')
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/my
   * Mes œuvres (créateur connecté)
   */
  async getMyOeuvres(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await this.oeuvreService.findByCreator(req.user.id_user, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: this._translateOeuvres(result.data, req.lang),
        pagination: result.pagination
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/oeuvres/:id/submit
   * Soumettre pour validation
   */
  async submit(req, res) {
    try {
      const oeuvre = await this.oeuvreService.submitForValidation(
        parseInt(req.params.id),
        req.user.id_user
      );

      res.json({
        success: true,
        message: req.t('oeuvre.submitted'),
        data: this._translateOeuvre(oeuvre, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  /**
   * GET /api/v2/oeuvres/admin/all
   * Toutes les œuvres (admin)
   */
  async listAll(req, res) {
    try {
      const { page = 1, limit = 20, statut } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (statut) {
        options.where = { statut };
      }

      const result = await this.oeuvreService.findAll(options);

      res.json({
        success: true,
        data: result.data.map(o => o.toAdminJSON(req.lang)),
        pagination: result.pagination
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/admin/pending
   * Œuvres en attente
   */
  async getPending(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await this.oeuvreService.findPending({
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(o => o.toAdminJSON(req.lang)),
        pagination: result.pagination
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/oeuvres/:id/validate
   * Valider une œuvre
   */
  async validate(req, res) {
    try {
      const oeuvre = await this.oeuvreService.validate(
        parseInt(req.params.id),
        req.user.id_user
      );

      res.json({
        success: true,
        message: req.t('oeuvre.validated'),
        data: this._translateOeuvre(oeuvre, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/oeuvres/:id/reject
   * Refuser une œuvre
   */
  async reject(req, res) {
    try {
      const { motif } = req.body;

      const oeuvre = await this.oeuvreService.reject(
        parseInt(req.params.id),
        req.user.id_user,
        motif
      );

      res.json({
        success: true,
        message: req.t('oeuvre.rejected'),
        data: this._translateOeuvre(oeuvre, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/oeuvres/:id/feature
   * Mettre en avant une œuvre
   */
  async setFeatured(req, res) {
    try {
      const { featured = true } = req.body;

      const oeuvre = await this.oeuvreService.setFeatured(
        parseInt(req.params.id),
        featured
      );

      res.json({
        success: true,
        message: featured ? (req.t ? req.t('oeuvre.featured') : 'Work featured') : (req.t ? req.t('oeuvre.unfeatured') : 'Work unfeatured'),
        data: this._translateOeuvre(oeuvre, req.lang)
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/stats
   * Statistiques
   */
  async getStats(req, res) {
    try {
      const stats = await this.oeuvreService.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ENDPOINTS SUPPLÉMENTAIRES (migrés de v1)
  // ============================================================================

  /**
   * GET /api/v2/oeuvres/statistics
   * Statistiques publiques des œuvres
   */
  async getStatistics(req, res) {
    try {
      const stats = await this.oeuvreService.getPublicStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/:id/translations
   * Récupérer les traductions d'une œuvre (admin)
   */
  async getTranslations(req, res) {
    try {
      const oeuvre = await this.oeuvreService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: oeuvre.toRawTranslations ? oeuvre.toRawTranslations() : oeuvre.toJSON()
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * PATCH /api/v2/oeuvres/:id/translation/:lang
   * Mettre à jour une traduction spécifique (admin)
   */
  async updateTranslation(req, res) {
    try {
      const oeuvre = await this.oeuvreService.updateTranslation(
        parseInt(req.params.id),
        req.params.lang,
        req.body
      );
      res.json({
        success: true,
        message: req.t('translation.updated', { lang: req.params.lang }),
        data: this._translateOeuvre(oeuvre, req.lang, 'detail')
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/:id/share-links
   * Liens de partage pour une œuvre
   */
  async getShareLinks(req, res) {
    try {
      const oeuvre = await this.oeuvreService.findWithFullDetails(parseInt(req.params.id));
      const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173';
      const oeuvreUrl = `${baseUrl}/oeuvres/${req.params.id}`;
      const title = oeuvre.toJSON(req.lang)?.titre || '';

      res.json({
        success: true,
        data: {
          url: oeuvreUrl,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(oeuvreUrl)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(oeuvreUrl)}&text=${encodeURIComponent(title)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(oeuvreUrl)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + oeuvreUrl)}`
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/:id/medias
   * Médias d'une œuvre
   */
  async getMedias(req, res) {
    try {
      const oeuvre = await this.oeuvreService.findWithFullDetails(parseInt(req.params.id));
      const data = oeuvre.toJSON(req.lang);
      res.json({
        success: true,
        data: data.Media || data.medias || []
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/my/statistics
   * Statistiques des œuvres du créateur connecté
   */
  async getMyStatistics(req, res) {
    try {
      const stats = await this.oeuvreService.getUserStats(req.user.id_user);
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * POST /api/v2/oeuvres/:id/medias/upload
   * Upload de médias pour une œuvre
   */
  async uploadMedia(req, res) {
    try {
      const result = await this.oeuvreService.addMedia(
        parseInt(req.params.id),
        req.files || req.file,
        req.user.id_user
      );
      res.status(201).json({
        success: true,
        message: req.t('media.uploaded'),
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * PUT /api/v2/oeuvres/:id/medias/reorder
   * Réordonner les médias
   */
  async reorderMedias(req, res) {
    try {
      const { orderedIds } = req.body;
      await this.oeuvreService.reorderMedias(
        parseInt(req.params.id),
        orderedIds,
        req.user.id_user
      );
      res.json({ success: true, message: req.t('media.reordered') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * DELETE /api/v2/oeuvres/:id/medias/:mediaId
   * Supprimer un média
   */
  async deleteMedia(req, res) {
    try {
      await this.oeuvreService.deleteMedia(
        parseInt(req.params.id),
        parseInt(req.params.mediaId),
        req.user.id_user
      );
      res.json({ success: true, message: req.t('media.deleted') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/admin/rejected
   * Œuvres rejetées (admin)
   */
  async getRejected(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.oeuvreService.findRejected({
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json({
        success: true,
        data: this._translateOeuvres(result.data, req.lang, 'admin'),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * GET /api/v2/oeuvres/search/intervenants
   * Recherche d'intervenants
   */
  async searchIntervenants(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.oeuvreService.searchIntervenants(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================

  /**
   * Traduit une œuvre selon la langue et le format
   * @private
   */
  _translateOeuvre(oeuvreDTO, lang = 'fr', format = 'default') {
    if (!oeuvreDTO) return null;

    switch (format) {
      case 'card':
        return oeuvreDTO.toCardJSON(lang);
      case 'detail':
        return oeuvreDTO.toDetailJSON(lang);
      case 'admin':
        return oeuvreDTO.toAdminJSON(lang);
      default:
        return oeuvreDTO.toJSON(lang);
    }
  }

  /**
   * Traduit un tableau d'œuvres
   * @private
   */
  _translateOeuvres(oeuvreDTOs, lang = 'fr', format = 'card') {
    if (!Array.isArray(oeuvreDTOs)) return [];
    return oeuvreDTOs.map(dto => this._translateOeuvre(dto, lang, format));
  }

}

// Export singleton
module.exports = new OeuvreControllerV2();
