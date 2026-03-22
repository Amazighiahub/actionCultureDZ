/**
 * ProgrammeController - Refactoré avec BaseController + Service Pattern
 * Architecture: BaseController → Controller → Service → Models
 *
 * ZÉRO accès direct aux models Sequelize.
 * Toute logique métier/data access délèguée au ProgrammeService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const { translateDeep } = require('../helpers/i18n');

class ProgrammeController extends BaseController {
  get programmeService() {
    return container.programmeService;
  }

  get notificationService() {
    return container.notificationService;
  }

  // ========================================================================
  // CONSULTATION
  // ========================================================================

  async getProgrammesByEvenement(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { evenementId } = req.params;
      const { date, type_activite } = req.query;

      const result = await this.programmeService.getProgrammesByEvenement(evenementId, { date, type_activite });

      res.json({
        success: true,
        data: {
          programmes: translateDeep(result.programmes, lang),
          byDay: translateDeep(result.byDay, lang),
          total: result.programmes.length
        },
        lang
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProgrammeById(req, res) {
    try {
      const lang = req.lang || 'fr';
      const programme = await this.programmeService.getProgrammeById(req.params.id);

      if (!programme) {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }

      res.json({ success: true, data: translateDeep(programme, lang), lang });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async exportProgramme(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { evenementId } = req.params;
      const { format = 'json' } = req.query;

      const programmes = await this.programmeService.getExportData(evenementId);

      if (programmes.length === 0) {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }

      const translated = translateDeep(programmes, lang);

      switch (format) {
        case 'csv': {
          const csv = this.programmeService.formatProgrammesToCSV(translated);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="programme-${evenementId}.csv"`);
          res.send(csv);
          break;
        }
        case 'pdf':
          res.status(501).json({ success: false, error: req.t('common.notImplemented') });
          break;
        case 'json':
        default:
          res.json({
            success: true,
            data: {
              evenement: translated[0]?.Evenement || null,
              programmes: translated.map(p => ({
                titre: p.titre,
                description: p.description,
                heure_debut: p.heure_debut,
                heure_fin: p.heure_fin,
                lieu: p.Lieu?.nom || p.lieu_specifique,
                type_activite: p.type_activite,
                intervenants: p.Intervenants?.map(i => ({
                  nom: `${i.prenom} ${i.nom}`,
                  entreprise: i.entreprise,
                  role: i.ProgrammeIntervenant?.role_intervenant,
                  sujet: i.ProgrammeIntervenant?.sujet_intervention
                }))
              })),
              total: programmes.length
            },
            lang
          });
      }
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // GESTION (CRUD)
  // ========================================================================

  async createProgramme(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { evenementId } = req.params;

      const result = await this.programmeService.createProgramme(
        evenementId, req.user.id_user, req.user.isAdmin, lang, req.body
      );

      if (result.error === 'evenementNotFound') {
        return res.status(404).json({ success: false, error: req.t('evenement.notFound') });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: req.t('auth.forbidden') });
      }
      if (result.error === 'lieuNotFound') {
        return res.status(404).json({ success: false, error: req.t('lieu.notFound') });
      }

      this._sendCreated(res, translateDeep(result.programme, lang), req.t('programme.created'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateProgramme(req, res) {
    try {
      const lang = req.lang || 'fr';

      const result = await this.programmeService.updateProgramme(
        req.params.id, req.user.id_user, req.user.isAdmin, lang, req.body
      );

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: req.t('auth.forbidden') });
      }

      res.json({
        success: true,
        message: req.t('programme.updated'),
        data: translateDeep(result.programme, lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async deleteProgramme(req, res) {
    try {
      const result = await this.programmeService.deleteProgramme(
        req.params.id, req.user.id_user, req.user.isAdmin
      );

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: req.t('auth.forbidden') });
      }

      this._sendMessage(res, req.t('programme.deleted'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateStatut(req, res) {
    try {
      const { statut } = req.body;

      const result = await this.programmeService.updateStatut(
        req.params.id, req.user.id_user, req.user.isAdmin, statut
      );

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: req.t('auth.forbidden') });
      }

      if (result.shouldNotify) {
        try {
          await this.notificationService.notifierModificationProgramme(
            req.params.id, statut === 'annule' ? 'annule' : 'reporte'
          );
        } catch (notifError) {
          // Notification failure is non-blocking
        }
      }

      res.json({
        success: true,
        message: req.t('programme.statusUpdated'),
        data: result.programme
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async duplicateProgramme(req, res) {
    try {
      const lang = req.lang || 'fr';

      const result = await this.programmeService.duplicateProgramme(
        req.params.id, req.user.id_user, req.user.isAdmin
      );

      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: req.t('auth.forbidden') });
      }

      this._sendCreated(res, translateDeep(result.programme, lang), req.t('programme.duplicated'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reorderProgrammes(req, res) {
    try {
      const { evenementId } = req.params;
      const { programmes } = req.body;

      const result = await this.programmeService.reorderProgrammes(
        evenementId, req.user.id_user, req.user.isAdmin, programmes
      );

      if (result.error === 'evenementNotFound') {
        return res.status(404).json({ success: false, error: req.t('evenement.notFound') });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: req.t('auth.forbidden') });
      }

      this._sendMessage(res, req.t('programme.reordered'));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ========================================================================
  // TRADUCTIONS
  // ========================================================================

  async getProgrammeTranslations(req, res) {
    try {
      const data = await this.programmeService.getProgrammeTranslations(req.params.id);

      if (!data) {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }

      this._sendSuccess(res, data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateProgrammeTranslation(req, res) {
    try {
      const targetLang = req.params.lang;
      const result = await this.programmeService.updateProgrammeTranslation(req.params.id, targetLang, req.body);

      if (!result) {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }
      if (result.empty) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      this._sendMessage(res, req.t('translation.updated', { lang: targetLang }));
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new ProgrammeController();
