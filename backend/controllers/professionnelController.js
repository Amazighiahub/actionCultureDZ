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
const { csvRow } = require('../utils/csv');

class ProfessionnelController extends BaseController {
  get professionnelService() {
    return container.professionnelService;
  }

  // ========================================================================
  // PROFIL
  // ========================================================================

  async updateProfessionalProfile(req, res) {
    try {
      const lang = req.lang || 'fr';
      // Mêmes contrôles que le profil membre (UpdateUserDTO : photo hébergée
      // par la plateforme, format du téléphone, URL du site…)
      const user = await container.userService.update(req.user.id_user, req.body, req.user.id_user);

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
      if (result.error === 'invitationEnAttente') {
        return res.status(409).json({ success: false, error: "Cette personne n'a pas encore confirmé son inscription", code: 'INVITATION_EN_ATTENTE' });
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
      const { type, format = 'csv', evenementId } = req.query;
      const data = await this.professionnelService.getExportData(req.user.id_user, type, {
        evenementId: evenementId ? parseInt(evenementId, 10) : undefined
      });

      if (data === null) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      if (data.length === 0) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      const filenames = {
        oeuvres: 'mes_oeuvres',
        evenements: 'mes_evenements',
        artisanats: 'mes_artisanats',
        participants: `participants_evenement_${evenementId}`
      };
      const filename = filenames[type] || type;

      if (format === 'csv') {
        const headers = csvRow(Object.keys(data[0]));
        const rows = data.map(row => csvRow(Object.values(row))).join('\n');
        // BOM : Excel ouvre alors le fichier en UTF-8 (accents, arabe)
        const csv = `\uFEFF${headers}\n${rows}`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csv);
      } else {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(type);
        worksheet.columns = Object.keys(data[0]).map(header => ({ header, key: header, width: 24 }));
        const cellule = (v) => (v && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);
        data.forEach(row => worksheet.addRow(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, cellule(v)]))));
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
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

module.exports = new ProfessionnelController();
