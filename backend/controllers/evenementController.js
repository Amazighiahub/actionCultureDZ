/**
 * EvenementController - Controller refactoré avec Service Pattern
 * Architecture: Controller → Service → Repository → Database
 */

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');
const QRCode = require('qrcode');
const { evenementPath } = require('../utils/slug');

class EvenementController extends BaseController {
  get evenementService() {
    return container.evenementService;
  }

  /**
   * Safe serialization — gère 2 cas :
   * 1. e est une instance EvenementDTO (méthodes toCardJSON/toDetailJSON/toAdminJSON)
   * 2. e est un plain object (récupéré du cache Redis sérialisé) — perd les méthodes
   *    Dans ce cas, on utilise BaseDTO.translateRaw() sur _raw pour traduire correctement
   */
  _serialize(e, method, lang) {
    if (!e) return null;
    if (typeof e[method] === 'function') return e[method](lang);
    // Plain object depuis cache : utiliser _raw via BaseDTO.translateRaw pour traduire
    const BaseDTO = require('../dto/baseDTO');
    const raw = e._raw || e;
    return BaseDTO.translateRaw(raw, lang);
  }

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  async list(req, res) {
    try {
      const { upcoming, q, statut } = req.query;
      const { page, limit } = this._paginate(req);
      // Filtres de la page Événements (ignorés auparavant : recherche et listes déroulantes sans effet)
      const type = req.query.type_evenement || req.query.type;
      const options = { page, limit, filters: { q, statut, type } };

      let result;
      if (upcoming === 'true') {
        result = await this.evenementService.findUpcoming(options);
      } else {
        result = await this.evenementService.findPublished(options);
      }

      res.json({
        success: true,
        data: result.data.map(e => this._serialize(e, 'toCardJSON', req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async search(req, res) {
    try {
      const { q } = req.query;
      const { page, limit } = this._paginate(req);
      const result = await this.evenementService.search(q, { page, limit });

      res.json({
        success: true,
        data: result.data.map(e => this._serialize(e, 'toCardJSON', req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getById(req, res) {
    try {
      const evenement = await this.evenementService.findWithFullDetails(parseInt(req.params.id));
      // Brouillon ou en attente de validation : visible seulement par l'organisateur et la modération
      const raw = evenement._raw || evenement;
      if (['brouillon', 'en_attente'].includes(raw.statut) && !this._canSeeUnpublished(req, raw.id_user)) {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }
      res.json({
        success: true,
        data: this._serialize(evenement, 'toDetailJSON', req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getByWilaya(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.evenementService.findByWilaya(parseInt(req.params.wilayaId), { page, limit });

      res.json({
        success: true,
        data: result.data.map(e => this._serialize(e, 'toCardJSON', req.lang)),
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
      const { page, limit } = this._paginate(req);
      const result = await this.evenementService.findByOrganisateur(req.user.id_user, { page, limit });

      res.json({
        success: true,
        data: result.data.map(e => this._serialize(e, 'toCardJSON', req.lang)),
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
      const evenement = await this.evenementService.create(req.body, req.user.id_user, { isAdmin: req.user.isAdmin });
      res.status(201).json({
        success: true,
        message: req.t('event.created'),
        data: this._serialize(evenement, 'toDetailJSON', req.lang)
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
        req.user.id_user,
        { isAdmin: req.user.isAdmin }
      );
      res.json({
        success: true,
        message: req.t('event.updated'),
        data: this._serialize(evenement, 'toDetailJSON', req.lang)
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async delete(req, res) {
    try {
      await this.evenementService.delete(parseInt(req.params.id), req.user.id_user, { isAdmin: req.user.isAdmin });
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
      const { nombre_personnes, commentaire, reponses } = req.body || {};
      await this.evenementService.registerParticipant(
        parseInt(req.params.id),
        req.user.id_user,
        { nombre_personnes, commentaire, reponses }
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
      const { statut } = req.query;
      const { page, limit } = this._paginate(req);
      const options = { page, limit };
      if (statut) options.where = { statut };

      const result = await this.evenementService.findAll(options);
      res.json({
        success: true,
        data: result.data.map(e => this._serialize(e, 'toAdminJSON', req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getPending(req, res) {
    try {
      const { page, limit } = this._paginate(req);
      const result = await this.evenementService.findPending({ page, limit });
      res.json({
        success: true,
        data: result.data.map(e => this._serialize(e, 'toAdminJSON', req.lang)),
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Aperçu d'une liste d'inscriptions : rien n'est écrit */
  async apercuImportInscriptions(req, res) {
    try {
      const data = await container.importInscriptionsService.apercu(req.file.buffer, parseInt(req.params.id), req.user, {
        profils: this._profilsChoisis(req.body?.profils)
      });
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Profils choisis dans l'aperçu : { numéro de ligne: profil } (JSON) */
  _profilsChoisis(brut) {
    let profils = {};
    try { profils = brut ? JSON.parse(brut) : {}; } catch { profils = {}; }
    if (!profils || typeof profils !== 'object' || Array.isArray(profils)) return {};
    return Object.fromEntries(Object.entries(profils)
      .filter(([ligne, v]) => Number.isInteger(Number(ligne)) && typeof v === 'string')
      .map(([ligne, v]) => [Number(ligne), v.slice(0, 80)]));
  }

  /** Import des lignes cochées (numéros de ligne), invitations envoyées aux comptes créés */
  async importerInscriptions(req, res) {
    try {
      let lignes = null;
      try { lignes = req.body?.lignes ? JSON.parse(req.body.lignes) : null; } catch { lignes = null; }
      const data = await container.importInscriptionsService.importer(req.file.buffer, parseInt(req.params.id), req.user, {
        lignes: Array.isArray(lignes) ? lignes.map(Number).filter(Number.isInteger) : null,
        inviter: req.body?.inviter !== 'false',
        profils: this._profilsChoisis(req.body?.profils)
      });
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async publish(req, res) {
    try {
      // Corps vide : publier ; { statut: 'rejete', raison } : refuser (retour en brouillon)
      const evenement = await this.evenementService.publish(
        parseInt(req.params.id),
        req.user.id_user,
        { statut: req.body?.statut, raison: req.body?.raison }
      );
      res.json({
        success: true,
        message: req.t('event.published'),
        data: this._serialize(evenement, 'toAdminJSON', req.lang)
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
        req.body.motif,
        { isAdmin: req.user.isAdmin }
      );

      res.json({
        success: true,
        message: req.t('event.cancelled'),
        data: this._serialize(evenement, 'toAdminJSON', req.lang)
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
        data: result.map(e => this._serialize(e, 'toCardJSON', req.lang))
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getMedias(req, res) {
    try {
      const evenement = await this.evenementService.findWithFullDetails(parseInt(req.params.id));
      const data = this._serialize(evenement, 'toJSON', req.lang);
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

  /** Liste publique des participants confirmés (nom, prénom, photo seulement) */
  async getPublicParticipants(req, res) {
    try {
      const participants = await this.evenementService.getPublicParticipants(
        parseInt(req.params.id)
      );
      res.json({ success: true, data: participants });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getParticipants(req, res) {
    try {
      const participants = await this.evenementService.getParticipants(
        parseInt(req.params.id),
        req.user.id_user,
        req.user.isAdmin
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
      const data = this._serialize(evenement, 'toDetailJSON', req.lang);
      
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const eventUrl = `${baseUrl}${evenementPath(parseInt(req.params.id), data?.nom_evenement ?? evenement?.nom_evenement)}`;

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
        },
        { isAdmin: req.user.isAdmin }
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

  /** Renvoi de l'email « Choisir mon mot de passe » à un participant (compte créé par import) */
  async renvoyerInvitation(req, res) {
    try {
      const data = await container.importInscriptionsService.renvoyerInvitation(parseInt(req.params.id), parseInt(req.params.userId), req.user);
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Messages de l'organisateur à ses participants : nombres de destinataires et messages déjà envoyés */
  async listerMessagesParticipants(req, res) {
    try {
      const data = await container.messagesParticipantsService.lister(parseInt(req.params.id), req.user);
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Programme en PDF d'un message, lu chez Cloudinary et servi en « programme.pdf » (lien de l'email
   * et de la notification : il s'ouvre sans être connecté, sur téléphone comme sur ordinateur).
   */
  async programmeMessage(req, res) {
    try {
      const url = await container.messagesParticipantsService.programme(parseInt(req.params.id), parseInt(req.params.idMessage));
      const fichier = await fetch(url);
      if (!fichier.ok || !fichier.body) return res.status(502).json({ success: false, error: req.t('common.serverError') });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="programme.pdf"',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      });
      if (fichier.headers.get('content-length')) res.set('Content-Length', fichier.headers.get('content-length'));
      require('stream').Readable.fromWeb(fichier.body).pipe(res);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /** Message envoyé aux participants (notification sur le site + email) */
  async envoyerMessageParticipants(req, res) {
    try {
      const data = await container.messagesParticipantsService.envoyer(parseInt(req.params.id), req.user, req.body || {});
      res.status(201).json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getProfilsParticipants(req, res) {
    try {
      const data = await this.evenementService.getProfilsParticipants(parseInt(req.params.id), req.user.id_user, req.user.isAdmin);
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async changerProfilParticipant(req, res) {
    try {
      if (typeof req.body?.profil !== 'string' || !req.body.profil.trim()) {
        return res.status(400).json({ success: false, error: req.t('validation.invalidData') });
      }
      const data = await this.evenementService.changerProfilParticipant(
        parseInt(req.params.id), parseInt(req.params.userId), req.body.profil.trim().slice(0, 80),
        { id: req.user.id_user, isAdmin: req.user.isAdmin }
      );
      res.json({ success: true, data });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async validateParticipation(req, res) {
    try {
      const { validated } = req.body;
      if (typeof validated !== 'boolean') {
        return res.status(400).json({ success: false, error: req.t('validation.invalidData') });
      }
      const participation = await this.evenementService.validateParticipation(
        parseInt(req.params.id),
        parseInt(req.params.userId),
        validated,
        { id: req.user.id_user, isAdmin: req.user.isAdmin },
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
        req.user.isAdmin
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
        req.user.isAdmin
      );

      res.json({
        success: true,
        data: {
          evenement: this._serialize(evenement, 'toDetailJSON', req.lang),
          export_date: new Date().toISOString()
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // QR CODE
  // ============================================================================

  async getQRCode(req, res) {
    try {
      const eventId = parseInt(req.params.id);
      // Verify event exists (lightweight check)
      const evenement = await this.evenementService.findById(eventId);

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const eventUrl = `${baseUrl}${evenementPath(eventId, evenement?.nom_evenement)}`;

      const { format = 'dataurl', size = 300 } = req.query;
      const qrSize = Math.min(Math.max(parseInt(size) || 300, 100), 1000);

      if (format === 'svg') {
        const svg = await QRCode.toString(eventUrl, {
          type: 'svg',
          width: qrSize,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=86400');
        return res.send(svg);
      }

      if (format === 'png') {
        const buffer = await QRCode.toBuffer(eventUrl, {
          width: qrSize,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('Content-Disposition', `inline; filename="event-${eventId}-qr.png"`);
        return res.send(buffer);
      }

      // Default: return data URL
      const dataUrl = await QRCode.toDataURL(eventUrl, {
        width: qrSize,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      res.set('Cache-Control', 'public, max-age=86400');
      res.json({
        success: true,
        data: {
          qr_data_url: dataUrl,
          event_url: eventUrl,
          event_id: eventId
        }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

}

module.exports = new EvenementController();
