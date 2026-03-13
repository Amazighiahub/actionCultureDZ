/**
 * IntervenantController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Models
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier/data access délèguée au IntervenantService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translate, translateDeep } = require('../helpers/i18n');

class IntervenantController extends BaseController {
  get intervenantService() {
    return container.intervenantService;
  }

  // ========================================================================
  // CONSULTATION
  // ========================================================================

  async getIntervenants(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { search, organisation, pays_origine, actif, verifie, order, direction } = req.query;

      const result = await this.intervenantService.getIntervenants({
        page, limit, search, organisation, pays_origine, actif, verifie, order, direction, lang
      });

      res.json({
        success: true,
        data: translateDeep(result.data, lang),
        pagination: result.pagination,
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getIntervenantById(req, res) {
    try {
      const lang = req.lang || 'fr';
      const result = await this.intervenantService.getIntervenantById(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      res.json({
        success: true,
        data: { ...translateDeep(result.intervenant, lang), statistiques: result.stats },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getOeuvresByIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);

      const result = await this.intervenantService.getOeuvresByIntervenant(req.params.id, { page, limit });

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      res.json({
        success: true,
        data: {
          oeuvres: result.data.map(o => translateDeep(o, lang)),
          pagination: result.pagination
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async searchIntervenants(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const intervenants = await this.intervenantService.searchIntervenants(q, limit, lang);
      const translated = translateDeep(intervenants, lang);

      res.json({
        success: true,
        data: translated.map(i => ({
          id: i.id_intervenant,
          label: `${i.titre_professionnel ? i.titre_professionnel + ' ' : ''}${i.prenom} ${i.nom}`,
          value: i.id_intervenant,
          titre: i.titre_professionnel,
          organisation: i.organisation,
          specialites: i.specialites || [],
          photo_url: i.photo_url
        })),
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTypesIntervenants(req, res) {
    try {
      const data = await this.intervenantService.getTypesIntervenants();
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // CRÉATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  async createIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { nom, prenom } = req.body;

      if (!nom || !prenom) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      const intervenant = await this.intervenantService.createIntervenant(lang, req.body);
      this._sendCreated(res, translate(intervenant, lang), req.t('intervenant.created'));
    } catch (error) {
      if (error.code === 'EMAIL_EXISTS') {
        return res.status(400).json({ success: false, error: req.t('intervenant.emailExists') });
      }
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest'),
          details: error.errors.map(e => ({ field: e.path, message: e.message }))
        });
      }
      this._handleError(res, error);
    }
  }

  async updateIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      const updated = await this.intervenantService.updateIntervenant(req.params.id, lang, req.body);

      if (!updated) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      res.json({
        success: true,
        message: req.t('intervenant.updated'),
        data: translateDeep(updated, lang)
      });
    } catch (error) {
      if (error.code === 'EMAIL_EXISTS') {
        return res.status(400).json({ success: false, error: req.t('auth.emailAlreadyUsed') });
      }
      this._handleError(res, error);
    }
  }

  async deleteIntervenant(req, res) {
    try {
      const result = await this.intervenantService.deleteIntervenant(req.params.id);

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }
      if (result.error === 'hasPrograms') {
        return res.status(400).json({
          success: false,
          error: req.t('intervenant.hasPrograms', { count: result.count })
        });
      }

      this._sendMessage(res, req.t('intervenant.deactivated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // TRADUCTIONS
  // ========================================================================

  async getIntervenantTranslations(req, res) {
    try {
      const data = await this.intervenantService.getIntervenantTranslations(req.params.id);

      if (!data) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateIntervenantTranslation(req, res) {
    try {
      const targetLang = req.params.lang;
      const result = await this.intervenantService.updateIntervenantTranslation(req.params.id, targetLang, req.body);

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }
      if (result.empty) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getStatistiques(req, res) {
    try {
      const data = await this.intervenantService.getStatistiques();
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = IntervenantController;
