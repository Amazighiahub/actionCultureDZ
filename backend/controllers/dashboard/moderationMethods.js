// controllers/dashboard/moderationMethods.js
// Moderation and admin action methods for DashboardController

const { Op } = require('sequelize');

const TYPE_USER_IDS = {
  VISITEUR: 1, ECRIVAIN: 2, JOURNALISTE: 3, SCIENTIFIQUE: 4,
  ACTEUR: 5, ARTISTE: 6, ARTISAN: 7, REALISATEUR: 8,
  MUSICIEN: 9, PHOTOGRAPHE: 10, DANSEUR: 11, SCULPTEUR: 12, AUTRE: 13
};

const moderationMethods = {

  async getPendingOeuvres(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where: { statut: { [Op.in]: ['en_attente', 'brouillon'] } },
        include: [
          { model: this.models.User, as: 'Saiseur', attributes: ['id_user', 'nom', 'prenom', 'email'] },
          { model: this.models.Media, limit: 1, attributes: ['url', 'type_media'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      const items = oeuvres.rows.map(oeuvre => ({
        id_oeuvre: oeuvre.id_oeuvre, titre: oeuvre.titre, description: oeuvre.description,
        statut: oeuvre.statut, id_type_oeuvre: oeuvre.id_type_oeuvre, type_oeuvre: oeuvre.id_type_oeuvre,
        date_creation: oeuvre.date_creation,
        auteur: oeuvre.Saiseur ? { id: oeuvre.Saiseur.id_user, nom: oeuvre.Saiseur.nom, prenom: oeuvre.Saiseur.prenom } : null,
        medias: oeuvre.Media || []
      }));

      res.json({
        success: true,
        data: {
          items,
          pagination: { total: oeuvres.count, page: parseInt(page), pages: Math.ceil(oeuvres.count / limit), limit: parseInt(limit), hasNext: page < Math.ceil(oeuvres.count / limit), hasPrev: page > 1 }
        }
      });
    } catch (error) {
      console.error('Erreur getPendingOeuvres:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getModerationQueue(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const signalements = await this.models.Signalement.findAndCountAll({
        where: { statut: 'en_attente' },
        include: [{ model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
      });

      const items = signalements.rows.map(s => ({
        id: s.id_signalement, type: s.type_entite, entity_id: s.id_entite,
        entity_title: s.titre || 'Non disponible', reason: s.motif,
        reported_by: s.Signalant ? { id: s.Signalant.id_user, nom: s.Signalant.nom } : null,
        date_signalement: s.date_signalement, status: s.statut
      }));

      res.json({
        success: true,
        data: {
          items,
          pagination: { total: signalements.count, page: parseInt(page), pages: Math.ceil(signalements.count / limit), limit: parseInt(limit), hasNext: page < Math.ceil(signalements.count / limit), hasPrev: page > 1 }
        }
      });
    } catch (error) {
      console.error('Erreur getModerationQueue:', error.message);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  },

  async getReportedContent(req, res) {
    try {
      const signalements = await this.models.Signalement.findAll({
        where: { statut: 'en_attente' },
        include: [{ model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom', 'email'] }],
        order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
      });
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
    const valide = data.valide !== undefined ? data.valide : data.validated;
    const validateur_id = data.validateur_id || data.adminId;
    const raison = data.raison || data.reason;
    const user = await this.models.User.findByPk(userId);
    if (!user) throw new Error(req ? req.t('auth.userNotFound') : 'Utilisateur non trouvé');
    if (user.id_type_user === TYPE_USER_IDS.VISITEUR) throw new Error(req ? req.t('admin.visitorNoValidation') : 'Les visiteurs n\'ont pas besoin de validation');
    if (user.statut !== 'en_attente_validation') throw new Error(req ? req.t('admin.userAlreadyProcessed', { status: user.statut }) : `Cet utilisateur a déjà été traité (statut: ${user.statut})`);

    const updateData = { statut: valide ? 'actif' : 'rejete', date_validation: new Date(), id_user_validate: validateur_id };
    if (!valide && raison) updateData.raison_rejet = raison;
    await user.update(updateData);
    await user.reload();

    if (this.models.Notification) {
      try {
        await this.models.Notification.create({
          user_id: userId,
          type: valide ? 'validation_acceptee' : 'validation_refusee',
          titre: valide ? 'Votre compte a été validé !' : 'Validation refusée',
          message: valide
            ? 'Félicitations ! Votre compte professionnel a été validé.'
            : `Votre demande a été refusée. ${raison ? `Raison : ${raison}` : ''}`,
          lue: false
        });
      } catch (err) { console.error('Erreur création notification:', err.message); }
    }

    this.clearCache('user');
    this.clearCache('overview');

    return {
      success: true,
      message: req ? (valide ? req.t('admin.userValidated') : req.t('admin.userRejected')) : (valide ? 'Utilisateur validé' : 'Utilisateur rejeté'),
      data: { id_user: user.id_user, nom: user.nom, prenom: user.prenom, email: user.email, id_type_user: user.id_type_user, statut: user.statut }
    };
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
      });
      res.json({ success: true, message: result.message, data: result.data });
    } catch (error) {
      console.error('Erreur validateUser:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async validateOeuvreAction(oeuvreId, data) {
    const { valide, validateur_id, raison_rejet } = data;
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
    if (!oeuvre) throw new Error('Œuvre non trouvée');
    await oeuvre.update({ statut: valide ? 'publie' : 'rejete', date_validation: new Date(), validateur_id, raison_rejet: !valide ? raison_rejet : null });
    return { message: valide ? 'Œuvre validée' : 'Œuvre rejetée', data: oeuvre };
  },

  async validateOeuvre(oeuvreId, data) {
    return this.validateOeuvreAction(oeuvreId, data);
  },

  async moderateSignalementAction(signalementId, data, moderatorId, req) {
    const signalement = await this.models.Signalement.findByPk(signalementId);
    if (!signalement) throw new Error(req ? req.t('admin.reportNotFound') : 'Signalement non trouvé');
    await signalement.update({ statut: 'traite', id_moderateur: moderatorId, date_traitement: new Date(), action_prise: data.action, notes_moderation: data.notes });
    return { message: req ? req.t('admin.reportProcessed') : 'Signalement traité', data: signalement };
  },

  async suspendUserAction(userId, data, req) {
    const { raison, duree } = data;
    const user = await this.models.User.findByPk(userId);
    if (!user) throw new Error(req ? req.t('auth.userNotFound') : 'Utilisateur non trouvé');
    await user.update({ statut: 'suspendu', date_suspension: new Date(), raison_suspension: raison, duree_suspension: duree || null });
    return { message: req ? req.t('admin.userSuspended') : 'Utilisateur suspendu', data: user };
  },

  async bulkModerateAction(data, moderatorId) {
    const { signalements = [], action, notes } = data;
    const results = [];
    for (const signalementId of signalements) {
      try {
        const result = await this.moderateSignalementAction(signalementId, { action, notes }, moderatorId);
        results.push({ id: signalementId, success: true, result });
      } catch (error) {
        results.push({ id: signalementId, success: false, error: error.message });
      }
    }
    return { message: `${results.filter(r => r.success).length} signalements traités`, data: results };
  }
};

module.exports = moderationMethods;
