/**
 * ProfessionnelController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Models
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier/data access délèguée au ProfessionnelService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translateDeep } = require('../helpers/i18n');

class ProfessionnelController extends BaseController {
  get professionnelService() {
    return container.professionnelService;
  }

  // ========================================================================
  // CONSULTATION PUBLIQUE
  // ========================================================================

  async getAllProfessionnels(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { specialite, wilaya, search, verifie } = req.query;

      const result = await this.professionnelService.getAllProfessionnels({
        page, limit, search, specialite, wilaya, verifie, lang
      });

      res.json({
        success: true,
        data: {
          professionnels: translateDeep(result.data, lang),
          pagination: result.pagination
        },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfessionnelById(req, res) {
    try {
      const lang = req.lang || 'fr';
      const professionnel = await this.professionnelService.getProfessionnelById(req.params.id);

      if (!professionnel) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      res.json({ success: true, data: translateDeep(professionnel, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async searchProfessionnels(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const professionnels = await this.professionnelService.searchProfessionnels(q, limit);
      res.json({ success: true, data: translateDeep(professionnels, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // PROFIL
  // ========================================================================

  async getMyProfile(req, res) {
    try {
      const lang = req.lang || 'fr';
      const professionnel = await this.professionnelService.getMyProfile(req.user.id_user);
      res.json({ success: true, data: translateDeep(professionnel, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateMyProfile(req, res) {
    try {
      const lang = req.lang || 'fr';
      const userUpdated = await this.professionnelService.updateMyProfile(req.user.id_user, lang, req.body);

      if (!userUpdated) {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }

      res.json({
        success: true,
        message: req.t('user.profileUpdated'),
        data: translateDeep(userUpdated, lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateProfessionalProfile(req, res) {
    try {
      const lang = req.lang || 'fr';
      const user = await this.professionnelService.updateProfessionalProfile(req.user.id_user, req.body);

      if (!user) {
        return res.status(404).json({ success: false, error: req.t('auth.userNotFound') });
      }

      res.json({
        success: true,
        message: req.t('user.profileUpdated'),
        data: translateDeep(user, lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // ŒUVRES
  // ========================================================================

  async getMesOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { statut } = req.query;

      const result = await this.professionnelService.getMesOeuvres(req.user.id_user, { page, limit, statut });

      res.json({
        success: true,
        data: { oeuvres: translateDeep(result.data, lang), pagination: result.pagination },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMyOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { statut, type } = req.query;

      const result = await this.professionnelService.getMyOeuvres(req.user.id_user, { page, limit, statut, type });

      res.json({
        success: true,
        data: { oeuvres: translateDeep(result.data, lang), pagination: result.pagination },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // ARTISANATS
  // ========================================================================

  async getMyArtisanats(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { statut } = req.query;

      const result = await this.professionnelService.getMyArtisanats(req.user.id_user, { page, limit, statut });

      res.json({
        success: true,
        data: { artisanats: translateDeep(result.data, lang), pagination: result.pagination },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // ÉVÉNEMENTS
  // ========================================================================

  async getMesEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { statut } = req.query;

      const result = await this.professionnelService.getMesEvenements(req.user.id_user, { page, limit, statut });

      res.json({
        success: true,
        data: { evenements: translateDeep(result.data, lang), pagination: result.pagination },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMyEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page, limit } = this._paginate(req);
      const { statut } = req.query;

      const result = await this.professionnelService.getMyEvenements(req.user.id_user, { page, limit, statut });

      res.json({
        success: true,
        data: { evenements: translateDeep(result.data, lang), pagination: result.pagination },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getEventCalendar(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { year, month } = req.query;

      const data = await this.professionnelService.getEventCalendar(req.user.id_user, { year, month });
      data.evenements = translateDeep(data.evenements, lang);

      res.json({ success: true, data, lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getMesStatistiques(req, res) {
    try {
      const lang = req.lang || 'fr';
      const data = await this.professionnelService.getMesStatistiques(req.user.id_user);
      res.json({ success: true, data, lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getOeuvreStats(req, res) {
    try {
      const stats = await this.professionnelService.getOeuvreStats(req.params.id, req.user.id_user);

      if (!stats) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      this._sendSuccess(res, stats);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getEvenementStats(req, res) {
    try {
      const stats = await this.professionnelService.getEvenementStats(req.params.id, req.user.id_user);

      if (!stats) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      this._sendSuccess(res, stats);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getAnalyticsOverview(req, res) {
    try {
      const { period = 30 } = req.query;
      const data = await this.professionnelService.getAnalyticsOverview(req.user.id_user, period);
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // DASHBOARD
  // ========================================================================

  async getDashboard(req, res) {
    try {
      const lang = req.lang || 'fr';
      const data = await this.professionnelService.getDashboard(req.user.id_user);

      data.recent.oeuvres = translateDeep(data.recent.oeuvres, lang);
      data.recent.evenements = translateDeep(data.recent.evenements, lang);

      res.json({ success: true, data, lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // GESTION PARTICIPANTS
  // ========================================================================

  async manageParticipants(req, res) {
    try {
      const { userId, action, notes } = req.body;
      const result = await this.professionnelService.manageParticipants(
        req.params.id, req.user.id_user, { userId, action, notes }
      );

      if (result.error === 'notFound' || result.error === 'participantNotFound') {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      res.json({
        success: true,
        message: req.t(`professionnel.participant.${action}`),
        data: {
          participation: result.participation,
          participant: result.participant ? {
            nom: result.participant.nom,
            prenom: result.participant.prenom,
            email: result.participant.email
          } : null
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // UPLOAD & EXPORT
  // ========================================================================

  async uploadPortfolio(req, res) {
    res.status(501).json({ success: false, error: req.t('common.notImplemented') });
  }

  async exportData(req, res) {
    try {
      const { type, format = 'csv' } = req.query;
      const data = await this.professionnelService.getExportData(req.user.id_user, type);

      if (data === null) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      if (format === 'csv') {
        if (data.length === 0) {
          return res.status(404).json({ success: false, error: req.t('common.notFound') });
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        const filenames = { oeuvres: 'mes_oeuvres', evenements: 'mes_evenements', artisanats: 'mes_artisanats' };
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filenames[type] || type}.csv`);
        res.send(csv);
      } else {
        res.json({ success: true, data, message: req.t('common.notImplemented') });
      }
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  async getNotifications(req, res) {
    try {
      const { limit = 20, offset = 0, marque } = req.query;
      const data = await this.professionnelService.getNotifications(req.user.id_user, { limit, offset, marque });
      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = ProfessionnelController;
