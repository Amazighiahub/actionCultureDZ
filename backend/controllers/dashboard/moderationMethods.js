// controllers/dashboard/moderationMethods.js
// Moderation and admin action methods for DashboardController

const container = require('../../services/serviceContainer');

const moderationMethods = {

  async getPendingOeuvres(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const data = await container.moderationService.getPendingOeuvres({ page, limit });
      res.json({ success: true, data });
    } catch (error) {
      console.error('Erreur getPendingOeuvres:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getModerationQueue(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const data = await container.moderationService.getSignalementsModerationQueue({ page, limit });
      res.json({ success: true, data });
    } catch (error) {
      console.error('Erreur getModerationQueue:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getReportedContent(req, res) {
    try {
      const signalements = await container.moderationService.getReportedContent();
      res.json({ success: true, data: signalements });
    } catch (error) {
      console.error('Erreur getReportedContent:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async performAdminAction(req, res) {
    try {
      const { action, entityType, entityId, data = {} } = req.body;
      let result;

      switch (action) {
        case 'validate_user':
          result = await this.validateUserAction(entityId, {
            valide: data.validated !== undefined ? data.validated : data.valide,
            validateur_id: req.user.id_user,
            raison: data.reason || data.raison
          }, req);
          break;
        case 'validate_oeuvre':
          result = await this.validateOeuvreAction(entityId, data);
          // Invalider le cache du service oeuvre pour que le listing public se rafraîchisse
          try { container.oeuvreService.cache.invalidate(); } catch (_) { /* cache optionnel */ }
          break;
        case 'moderate_signalement':
          result = await this.moderateSignalementAction(entityId, data, req.user.id_user, req);
          break;
        case 'suspend_user':
          result = await this.suspendUserAction(entityId, data, req);
          break;
        case 'bulk_moderate':
          result = await this.bulkModerateAction(data, req.user.id_user);
          break;
        default:
          return res.status(400).json({ success: false, error: `Action non reconnue: ${action}` });
      }

      this.clearCache(entityType);
      res.json({ success: true, message: result.message || req.t('admin.actionSuccess', { action }), data: result.data || result });
    } catch (error) {
      console.error('Erreur performAdminAction:', error.message);
      res.status(500).json({ success: false, error: error.message || req.t('common.serverError') });
    }
  },

  async validateUserAction(userId, data, req) {
    const result = await container.userManagementService.validateUserAction(userId, data);
    this.clearCache('user');
    this.clearCache('overview');
    if (req) {
      const valide = data.valide !== undefined ? data.valide : data.validated;
      result.message = valide ? req.t('admin.userValidated') : req.t('admin.userRejected');
    }
    return result;
  },

  async validateUser(req, res) {
    try {
      const { userId, id } = req.params;
      const targetUserId = userId || id;
      const { validated, valide, reason, raison } = req.body;
      const result = await this.validateUserAction(targetUserId, {
        valide: validated !== undefined ? validated : valide,
        validateur_id: req.user.id_user,
        raison: reason || raison
      }, req);
      res.json({ success: true, message: result.message, data: result.data });
    } catch (error) {
      console.error('Erreur validateUser:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async validateOeuvreAction(oeuvreId, data) {
    return container.moderationService.validateOeuvreAction(oeuvreId, data);
  },

  async moderateSignalementAction(signalementId, data, moderatorId, req) {
    const signalement = await container.signalementService.traiterSignalement(
      signalementId,
      { action_prise: data.action, notes_moderation: data.notes },
      moderatorId
    );
    return { message: req ? req.t('admin.reportProcessed') : 'Signalement traité', data: signalement };
  },

  async suspendUserAction(userId, data, req) {
    const result = await container.userManagementService.suspendUserAction(userId, data);
    if (req) result.message = req.t('admin.userSuspended');
    return result;
  },

  async bulkModerateAction(data, moderatorId) {
    const { signalements = [], action, notes } = data;
    const results = [];
    for (const signalementId of signalements) {
      try {
        const result = await container.signalementService.traiterSignalement(
          signalementId,
          { action_prise: action, notes_moderation: notes },
          moderatorId
        );
        results.push({ id: signalementId, success: true, result });
      } catch (error) {
        results.push({ id: signalementId, success: false, error: error.message });
      }
    }
    return { message: `${results.filter(r => r.success).length} signalements traités`, data: results };
  }
};

module.exports = moderationMethods;
