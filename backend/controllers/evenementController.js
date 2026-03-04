/**
 * EvenementControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const container = require('../services/serviceContainer');
const NotificationService = require('../services/notificationService');

const IS_DEV_MODE = process.env.NODE_ENV === 'development';

class EvenementControllerV2 {
  get evenementService() {
    return container.evenementService;
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { page = 1, limit = 20, upcoming } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };

      let result;
      if (upcoming === 'true') {
        result = await this.evenementService.findUpcoming(options);
      } else {
        result = await this.evenementService.findPublished(options);
      }

      res.json({
        success: true,
        data: result.data.map(e => e.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const result = await this.evenementService.search(q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(e => e.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const evenement = await this.evenementService.findWithFullDetails(parseInt(req.params.id));
      res.json({
        success: true,
        data: evenement.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getByWilaya(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.evenementService.findByWilaya(parseInt(req.params.wilayaId), {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(e => e.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyEvenements(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.evenementService.findByOrganisateur(req.user.id_user, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.data.map(e => e.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const evenement = await this.evenementService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: 'Événement créé avec succès',
        data: evenement.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const evenement = await this.evenementService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Événement mis à jour',
        data: evenement.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.evenementService.delete(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, message: 'Événement supprimé' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // INSCRIPTION
  // ============================================================================

  async register(req, res) {
    try {
      await this.evenementService.registerParticipant(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({ success: true, message: 'Inscription confirmée' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async unregister(req, res) {
    try {
      await this.evenementService.unregisterParticipant(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({ success: true, message: 'Désinscription effectuée' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async listAll(req, res) {
    try {
      const { page = 1, limit = 20, statut } = req.query;
      const options = { page: parseInt(page), limit: parseInt(limit) };
      if (statut) options.where = { statut };

      const result = await this.evenementService.findAll(options);
      res.json({
        success: true,
        data: result.data.map(e => e.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getPending(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.evenementService.findPending({
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json({
        success: true,
        data: result.data.map(e => e.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async publish(req, res) {
    try {
      const evenement = await this.evenementService.publish(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: 'Événement publié',
        data: evenement.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async cancel(req, res) {
    try {
      const { motif } = req.body;
      const evenement = await this.evenementService.cancel(
        parseInt(req.params.id),
        req.user.id_user,
        motif
      );

      // Notifier les participants de l'annulation
      try {
        const notificationService = new NotificationService(container.models);
        await notificationService.notifierAnnulationEvenement(parseInt(req.params.id), motif || 'Annulation par l\'organisateur');
      } catch (notifError) {
        console.error('Erreur notification annulation:', notifError);
      }

      res.json({
        success: true,
        message: 'Événement annulé',
        data: evenement.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.evenementService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // OEUVRE / MEDIAS
  // ============================================================================

  async getByOeuvre(req, res) {
    try {
      const result = await this.evenementService.findByOeuvre(parseInt(req.params.oeuvreId));
      res.json({
        success: true,
        data: result.map(e => e.toCardJSON(req.lang))
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMedias(req, res) {
    try {
      const evenement = await this.evenementService.findWithFullDetails(parseInt(req.params.id));
      const data = evenement.toJSON(req.lang);
      res.json({
        success: true,
        data: data.Medias || data.medias || []
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PARTICIPANTS & MES OEUVRES
  // ============================================================================

  async getParticipants(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const models = container.models;

      const participants = await models.EvenementUser.findAll({
        where: { id_evenement: evenementId },
        include: [{
          model: models.User,
          as: 'User',
          attributes: { exclude: ['password'] }
        }],
        order: [['date_inscription', 'DESC']]
      });

      res.json({
        success: true,
        data: participants
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMesOeuvres(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const userId = req.user.id_user;
      const models = container.models;

      // Oeuvres déjà ajoutées à cet événement par l'utilisateur
      const oeuvresAjoutees = await models.EvenementOeuvre.findAll({
        where: { id_evenement: evenementId },
        include: [{
          model: models.Oeuvre,
          as: 'Oeuvre',
          where: { saisi_par: userId },
          required: true
        }],
        order: [['ordre_presentation', 'ASC']]
      });

      // Toutes les oeuvres de l'utilisateur (pour proposer celles disponibles)
      const toutesOeuvres = await models.Oeuvre.findAll({
        where: { saisi_par: userId, statut: 'publie' }
      });

      const idsAjoutees = oeuvresAjoutees.map(eo => eo.id_oeuvre);
      const oeuvresDisponibles = toutesOeuvres.filter(o => !idsAjoutees.includes(o.id_oeuvre));

      res.json({
        success: true,
        data: {
          oeuvres_ajoutees: oeuvresAjoutees,
          oeuvres_disponibles: oeuvresDisponibles
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getShareData(req, res) {
    try {
      const evenement = await this.evenementService.findWithFullDetails(parseInt(req.params.id));
      const data = evenement.toDetailJSON(req.lang);
      
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const eventUrl = `${baseUrl}/evenements/${req.params.id}`;

      res.json({
        success: true,
        data: {
          title: data.titre || data.nom_evenement,
          description: data.description,
          url: eventUrl,
          image: data.image_url || null,
          calendar_links: {
            google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.titre || '')}&dates=${data.date_debut || ''}/${data.date_fin || ''}`,
            outlook: eventUrl,
            ical: eventUrl
          },
          social_links: {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
            twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(data.titre || '')}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent((data.titre || '') + ' ' + eventUrl)}`
          }
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMyRegistration(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const userId = req.user.id_user;
      const models = container.models;

      const inscription = await models.EvenementUser.findOne({
        where: { id_evenement: evenementId, id_user: userId }
      });

      if (!inscription) {
        return res.json({
          success: true,
          data: { isRegistered: false, status: null }
        });
      }

      res.json({
        success: true,
        data: {
          isRegistered: true,
          status: inscription.statut_participation,
          inscription
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async addOeuvre(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const oeuvreId = parseInt(req.body.id_oeuvre ?? req.body.oeuvre_id);
      const descriptionPresentation = req.body.description_presentation;
      const dureePresentation = req.body.duree_presentation;
      const userId = req.user.id_user;
      const models = container.models;

      if (!Number.isInteger(oeuvreId)) {
        return res.status(400).json({ success: false, error: 'ID œuvre invalide' });
      }

      // Vérifier que l'oeuvre appartient à l'utilisateur
      const oeuvre = await models.Oeuvre.findOne({
        where: { id_oeuvre: oeuvreId, saisi_par: userId }
      });

      if (!oeuvre) {
        return res.status(404).json({ success: false, error: 'Œuvre non trouvée ou non autorisée' });
      }

      // Vérifier si déjà ajoutée
      const existing = await models.EvenementOeuvre.findOne({
        where: { id_evenement: evenementId, id_oeuvre: oeuvreId }
      });

      if (existing) {
        return res.status(409).json({ success: false, error: 'Œuvre déjà ajoutée à cet événement' });
      }

      // Obtenir le prochain ordre
      const maxOrdre = await models.EvenementOeuvre.max('ordre_presentation', {
        where: { id_evenement: evenementId }
      });

      const association = await models.EvenementOeuvre.create({
        id_evenement: evenementId,
        id_oeuvre: oeuvreId,
        id_presentateur: userId,
        ordre_presentation: (maxOrdre || 0) + 1,
        description_presentation: descriptionPresentation,
        duree_presentation: dureePresentation
      });

      const created = await models.EvenementOeuvre.findByPk(association.id_EventOeuvre, {
        include: [{ model: models.Oeuvre, as: 'Oeuvre', required: false }]
      });

      res.status(201).json({
        success: true,
        message: 'Œuvre ajoutée à l\'événement',
        data: created || association
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateOeuvre(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const oeuvreId = parseInt(req.params.oeuvreId);
      const userId = req.user.id_user;
      const models = container.models;

      const association = await models.EvenementOeuvre.findOne({
        where: {
          id_evenement: evenementId,
          id_oeuvre: oeuvreId,
          id_presentateur: userId
        }
      });

      if (!association) {
        return res.status(404).json({ success: false, error: 'Association non trouvée' });
      }

      const updates = {};
      if (req.body.description_presentation !== undefined) {
        updates.description_presentation = req.body.description_presentation;
      }
      if (req.body.duree_presentation !== undefined) {
        updates.duree_presentation = req.body.duree_presentation;
      }
      if (req.body.ordre_presentation !== undefined) {
        updates.ordre_presentation = req.body.ordre_presentation;
      } else if (req.body.ordre !== undefined) {
        updates.ordre_presentation = req.body.ordre;
      }

      await association.update(updates);

      const updated = await models.EvenementOeuvre.findOne({
        where: { id_evenement: evenementId, id_oeuvre: oeuvreId },
        include: [{ model: models.Oeuvre, as: 'Oeuvre', required: false }]
      });

      res.json({
        success: true,
        message: 'Œuvre mise à jour dans l\'événement',
        data: updated || association
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reorderOeuvres(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const userId = req.user.id_user;
      const models = container.models;
      const oeuvres = Array.isArray(req.body.oeuvres) ? req.body.oeuvres : [];

      if (!oeuvres.length) {
        return res.status(400).json({ success: false, error: 'Liste d\'œuvres invalide' });
      }

      const transaction = await models.sequelize.transaction();
      try {
        for (const item of oeuvres) {
          const idOeuvre = parseInt(item.id_oeuvre);
          const ordre = parseInt(item.ordre ?? item.ordre_presentation);

          if (!Number.isInteger(idOeuvre) || !Number.isInteger(ordre)) {
            throw new Error('Données de réorganisation invalides');
          }

          const [updatedCount] = await models.EvenementOeuvre.update(
            { ordre_presentation: ordre },
            {
              where: {
                id_evenement: evenementId,
                id_oeuvre: idOeuvre,
                id_presentateur: userId
              },
              transaction
            }
          );

          if (!updatedCount) {
            throw new Error(`Association introuvable pour l'œuvre ${idOeuvre}`);
          }
        }

        await transaction.commit();
      } catch (txError) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: txError.message || 'Erreur lors de la réorganisation des œuvres'
        });
      }

      const reordered = await models.EvenementOeuvre.findAll({
        where: { id_evenement: evenementId, id_presentateur: userId },
        include: [{ model: models.Oeuvre, as: 'Oeuvre', required: false }],
        order: [['ordre_presentation', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Ordre des œuvres mis à jour',
        data: reordered
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async removeOeuvre(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const oeuvreId = parseInt(req.params.oeuvreId);
      const userId = req.user.id_user;
      const models = container.models;

      const deleted = await models.EvenementOeuvre.destroy({
        where: {
          id_evenement: evenementId,
          id_oeuvre: oeuvreId,
          id_presentateur: userId
        }
      });

      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Association non trouvée' });
      }

      res.json({ success: true, message: 'Œuvre retirée de l\'événement' });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validateParticipation(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { validated } = req.body;
      const models = container.models;

      const participation = await models.EvenementUser.findOne({
        where: { id_evenement: evenementId, id_user: userId }
      });

      if (!participation) {
        return res.status(404).json({ success: false, error: 'Participation non trouvée' });
      }

      await participation.update({
        statut_participation: validated ? 'confirme' : 'annule',
        date_validation: new Date(),
        valide_par: req.user.id_user
      });

      // Notifier le participant de la validation/refus
      try {
        const notificationService = new NotificationService(container.models);
        await notificationService.notifierValidationParticipation(
          evenementId,
          userId,
          validated ? 'confirme' : 'refuse',
          req.body.notes || ''
        );
      } catch (notifError) {
        console.error('Erreur notification validation participation:', notifError);
      }

      res.json({
        success: true,
        message: validated ? 'Participation confirmée' : 'Participation refusée',
        data: participation
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getParticipantProfil(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const models = container.models;

      // Vérifier que l'utilisateur est bien inscrit à cet événement
      const participation = await models.EvenementUser.findOne({
        where: { id_evenement: evenementId, id_user: userId }
      });

      if (!participation) {
        return res.status(404).json({ success: false, error: 'Participant non trouvé pour cet événement' });
      }

      // Récupérer le profil complet du participant
      const user = await models.User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [
          { model: models.TypeUser, required: false },
          { model: models.Wilaya, required: false },
          {
            model: models.Oeuvre,
            as: 'OeuvresSaisies',
            where: { statut: 'publie' },
            required: false,
            limit: 10
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      res.json({
        success: true,
        data: {
          profil: user,
          participation
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfessionnelsEnAttente(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const models = container.models;

      const participants = await models.EvenementUser.findAll({
        where: {
          id_evenement: evenementId,
          statut_participation: 'en_attente'
        },
        include: [{
          model: models.User,
          as: 'User',
          attributes: { exclude: ['password'] },
          include: [
            { model: models.TypeUser, required: false }
          ]
        }],
        order: [['date_inscription', 'ASC']]
      });

      res.json({
        success: true,
        data: participants
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async exportEvent(req, res) {
    try {
      const evenementId = parseInt(req.params.id);
      const evenement = await this.evenementService.findWithFullDetails(evenementId);
      const data = evenement.toDetailJSON(req.lang);

      res.json({
        success: true,
        data: {
          evenement: data,
          export_date: new Date().toISOString()
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _handleError(res, error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';

    if (IS_DEV_MODE) {
      console.error(`❌ Error [${code}]:`, error.message);
      if (statusCode === 500) console.error(error.stack);
    }

    const response = { success: false, error: error.message || 'Erreur serveur', code };
    if (error.errors) response.errors = error.errors;
    if (IS_DEV_MODE && statusCode === 500) response.stack = error.stack;

    res.status(statusCode).json(response);
  }
}

module.exports = new EvenementControllerV2();
