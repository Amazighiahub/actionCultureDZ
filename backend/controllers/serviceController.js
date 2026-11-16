/**
 * ServiceController - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class ServiceController extends BaseController {
  get serviceService() {
    return container.serviceService;
  }

  /** Note moyenne des avis : { moyenne, nombre } par identifiant de service (vide si indisponible : la fiche reste affichée) */
  async _notes(ids) {
    try {
      return await container.commentaireService.notesServices(ids);
    } catch (error) {
      console.error('[ServiceController] notes des avis indisponibles :', error.message);
      return new Map();
    }
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { type, lieu } = req.query;
      const { page, limit } = this._paginate(req);
      const result = await this.serviceService.findValidated({ page, limit, type, lieuId: lieu });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** GET /services/annuaire?type=&wilaya=&q= : services validés, avec les wilayas proposées */
  async annuaire(req, res) {
    try {
      const { type, wilaya, q } = req.query;
      const data = await this.serviceService.annuaire({
        type: typeof type === 'string' && type ? type : null,
        wilaya: wilaya && /^\d+$/.test(String(wilaya)) ? Number(wilaya) : null,
        q: typeof q === 'string' ? q.slice(0, 100) : '',
        // Note et classement par wilaya (sur tous les services, avant les filtres)
        notesDe: (ids) => this._notes(ids)
      });
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q } = req.query;
      const { page, limit } = this._paginate(req);
      const result = await this.serviceService.search(q, { page, limit });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Rang du service parmi ceux du même type dans sa wilaya ({ rang, total, wilaya }), ou null */
  async _classement(raw) {
    if (raw?.statut !== 'valide' || !raw.type_service) return null;
    try {
      const { rangs, wilayas } = await this.serviceService.classement((ids) => this._notes(ids));
      const rang = rangs.get(Number(raw.id));
      const w = wilayas.get(Number(raw.id));
      return rang ? { ...rang, wilaya: w ? { id_wilaya: w.id_wilaya, nom: w.nom, wilaya_name_ascii: w.wilaya_name_ascii } : null } : null;
    } catch {
      return null;
    }
  }

  async getById(req, res) {
    try {
      const service = await this.serviceService.findWithFullDetails(parseInt(req.params.id));
      // Service en attente ou rejeté : visible seulement par son propriétaire et la modération
      const raw = service?._raw || service;
      if (raw && raw.statut !== 'valide' && !this._canSeeUnpublished(req, raw.id_user)) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      const notes = await this._notes([raw.id]);
      // Galerie de photos et menus (PDF ou image) ajoutés par le professionnel
      const medias = await require('../services/service/mediasService').lister(container.models, raw.id).catch(() => ({ photos: [], menus: [] }));
      // Photos des visiteurs (avis, relues par l'équipe) et classement dans la wilaya
      const photosVisiteurs = await require('../services/commentairePhotos').photosVisiteurs(container.models, raw.id).catch(() => []);
      const classement = await this._classement(raw);
      res.json({
        success: true,
        data: {
          ...service.toDetailJSON(req.lang), note: notes.get(Number(raw.id)) || null, galerie: medias.photos, menus: medias.menus,
          photos_visiteurs: photosVisiteurs, classement
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // Galerie de photos et menus d'un service (professionnel du service ou modération)
  async ajouterMedia(req, res) {
    try {
      const data = await require('../services/service/mediasService').ajouter(container.models, parseInt(req.params.id), req.user, req.body || {}, container.notificationService);
      res.status(201).json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async retirerMedia(req, res) {
    try {
      await require('../services/service/mediasService').retirer(container.models, parseInt(req.params.id), parseInt(req.params.idMedia), req.user);
      res.json({ success: true });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Menu PDF servi par le site (même principe que les documents d'un événement) */
  async menuPdf(req, res) {
    try {
      const id = parseInt(req.params.id);
      const service = await container.models.Service.findByPk(id, { attributes: ['id', 'statut', 'id_user'] });
      if (!service || (service.statut !== 'valide' && !this._canSeeUnpublished(req, service.id_user))) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      const url = await require('../services/service/mediasService').fichierMenu(container.models, id, parseInt(req.params.idMedia));
      const { servirPdf } = require('../utils/servirPdf');
      // Pas de cache public : un menu retiré (fichier effacé) ne doit plus être servi
      if (!(await servirPdf(res, url, { nomFichier: 'menu.pdf', enCachePublic: false }))) {
        return res.status(502).json({ success: false, error: req.t('common.serverError') });
      }
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getByLieu(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.serviceService.findByLieu(parseInt(req.params.lieuId), { page, limit });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  async getMyServices(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.serviceService.findByProfessionnel(req.user.id_user, { page, limit });

      res.json({
        success: true,
        data: result.data.map(s => s.toCardJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async create(req, res) {
    try {
      const service = await this.serviceService.create(req.body, req.user.id_user);
      res.status(201).json({
        success: true,
        message: req.t('service.created'),
        data: service.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async update(req, res) {
    try {
      const service = await this.serviceService.update(
        parseInt(req.params.id),
        req.body,
        req.user.id_user,
        this._estModeration(req)
      );
      res.json({
        success: true,
        message: req.t('service.updated'),
        data: service.toDetailJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.serviceService.delete(
        parseInt(req.params.id),
        req.user.id_user,
        this._estModeration(req)
      );
      res.json({ success: true, message: req.t('service.deleted') });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async getPending(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.serviceService.findPending({ page, limit });

      res.json({
        success: true,
        data: result.data.map(s => s.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async listForModeration(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.serviceService.findForModeration({
        page, limit, statut: req.query.statut, type_service: req.query.type_service, q: req.query.q
      });
      res.json({
        success: true,
        data: result.data.map(s => s.toAdminJSON(req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validate(req, res) {
    try {
      const service = await this.serviceService.validate(
        parseInt(req.params.id),
        req.user.id_user
      );
      res.json({
        success: true,
        message: req.t('service.validated'),
        data: service.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async reject(req, res) {
    try {
      const { motif } = req.body;
      const service = await this.serviceService.reject(
        parseInt(req.params.id),
        req.user.id_user,
        motif
      );
      res.json({
        success: true,
        message: req.t('service.rejected'),
        data: service.toAdminJSON(req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.serviceService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      this._handleError(res, error);
    }
  }

}

module.exports = new ServiceController();
