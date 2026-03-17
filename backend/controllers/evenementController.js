/**
 * EvenementControllerV2 - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class EvenementControllerV2 extends BaseController {
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
      if (req.file) {
        req.body.image_url = req.file.path;
      }
      const evenement = await this.evenementService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: req.t('event.created'),
        data: evenement.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      if (req.file) {
        req.body.image_url = req.file.path;
      }
      const evenement = await this.evenementService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('event.updated'),
        data: evenement.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.evenementService.delete(parseInt(req.params.id), req.user.id_user);
      res.json({ success: true, message: req.t('event.deleted') });
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
      res.json({ success: true, message: req.t('event.registered') });
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
      res.json({ success: true, message: req.t('event.unregistered') });
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
        message: req.t('event.published'),
        data: evenement.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async cancel(req, res) {
    try {
      const evenement = await this.evenementService.cancel(
        parseInt(req.params.id),
        req.user.id_user,
        req.body.motif
      );

      res.json({
        success: true,
        message: req.t('event.cancelled'),
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
      const participants = await this.evenementService.getParticipants(
        parseInt(req.params.id),
        req.user.id_user,
        req.user.id_type_user
      );
      res.json({ success: true, data: participants });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMesOeuvres(req, res) {
    try {
      const data = await this.evenementService.getMesOeuvres(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({ success: true, data });
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
      const data = await this.evenementService.getMyRegistration(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async addOeuvre(req, res) {
    try {
      const oeuvreId = parseInt(req.body.id_oeuvre ?? req.body.oeuvre_id);
      if (!Number.isInteger(oeuvreId)) {
        return res.status(400).json({ success: false, error: req.t('oeuvre.invalidId') });
      }

      const result = await this.evenementService.addOeuvreToEvent(
        parseInt(req.params.id),
        oeuvreId,
        req.user.id_user,
        {
          description_presentation: req.body.description_presentation,
          duree_presentation: req.body.duree_presentation
        }
      );

      res.status(201).json({
        success: true,
        message: req.t('oeuvre.addedToEvent'),
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateOeuvre(req, res) {
    try {
      const result = await this.evenementService.updateOeuvreInEvent(
        parseInt(req.params.id),
        parseInt(req.params.oeuvreId),
        req.user.id_user,
        req.body
      );

      res.json({
        success: true,
        message: req.t('oeuvre.updatedInEvent'),
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reorderOeuvres(req, res) {
    try {
      const oeuvres = Array.isArray(req.body.oeuvres) ? req.body.oeuvres : [];
      const reordered = await this.evenementService.reorderOeuvres(
        parseInt(req.params.id),
        req.user.id_user,
        oeuvres
      );

      res.json({
        success: true,
        message: req.t('oeuvre.orderUpdated'),
        data: reordered
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async removeOeuvre(req, res) {
    try {
      await this.evenementService.removeOeuvreFromEvent(
        parseInt(req.params.id),
        parseInt(req.params.oeuvreId),
        req.user.id_user
      );
      res.json({ success: true, message: req.t('oeuvre.removedFromEvent') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validateParticipation(req, res) {
    try {
      const { validated } = req.body;
      const participation = await this.evenementService.validateParticipation(
        parseInt(req.params.id),
        parseInt(req.params.userId),
        validated,
        { id: req.user.id_user, typeId: req.user.id_type_user },
        req.body.notes
      );

      res.json({
        success: true,
        message: validated ? req.t('professionnel.participant.confirmer') : req.t('professionnel.participant.rejeter'),
        data: participation
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getParticipantProfil(req, res) {
    try {
      const data = await this.evenementService.getParticipantProfil(
        parseInt(req.params.id),
        parseInt(req.params.userId)
      );
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfessionnelsEnAttente(req, res) {
    try {
      const participants = await this.evenementService.getProfessionnelsEnAttente(
        parseInt(req.params.id),
        req.user.id_user,
        req.user.id_type_user
      );
      res.json({ success: true, data: participants });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async exportEvent(req, res) {
    try {
      const evenement = await this.evenementService.exportEventData(
        parseInt(req.params.id),
        req.user.id_user,
        req.user.id_type_user
      );

      res.json({
        success: true,
        data: {
          evenement: evenement.toDetailJSON(req.lang),
          export_date: new Date().toISOString()
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

}

module.exports = new EvenementControllerV2();
