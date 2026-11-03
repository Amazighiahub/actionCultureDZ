/**
 * SignalementService - Logique metier pour les signalements
 * Extends BaseService avec la gestion de moderation
 */

const BaseService = require('../core/baseService');

const VALID_TYPES = ['commentaire', 'oeuvre', 'evenement', 'user', 'artisanat'];
const VALID_MOTIFS = [
  'spam', 'contenu_inapproprie', 'faux_contenu', 'violation_droits',
  'harcelement', 'incitation_haine', 'contenu_illegal', 'autre'
];
const VALID_ACTIONS = [
  'aucune', 'avertissement', 'suppression_contenu',
  'suspension_temporaire', 'suspension_permanente', 'signalement_autorites'
];

class SignalementService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
  }

  /**
   * Cree un signalement
   * @param {Object} data - { type_entite, id_entite, motif, description }
   * @param {number} userId - ID de l'utilisateur signalant
   * @param {Object} files - Fichiers uploades (screenshot)
   * @returns {Promise<Object>} signalement cree avec signalant
   */
  async createSignalement(data, userId, files = null) {
    const { type_entite, id_entite, motif, description } = data;

    // Validation du type d'entite
    if (!VALID_TYPES.includes(type_entite)) {
      throw this._validationError('Type d\'entite invalide');
    }

    // Validation du motif
    if (!VALID_MOTIFS.includes(motif)) {
      throw this._validationError('Motif de signalement invalide');
    }

    // Verifier que l'entite existe
    const entityExists = await this.repository.entityExists(type_entite, id_entite);
    if (!entityExists) {
      throw this._notFoundError(id_entite);
    }

    // Verifier doublon (un user ne peut signaler la meme entite qu'une fois)
    const existing = await this.repository.findExisting(type_entite, id_entite, userId);
    if (existing) {
      throw this._conflictError('Vous avez deja signale cette entite');
    }

    // Pas d'envoi de capture d'écran : la route n'en reçoit pas (url_screenshot reste vide).
    // L'ancien appel donnait un objet multer au lieu d'une image et n'enregistrait jamais rien.
    const url_screenshot = null;

    // Creer le signalement
    const signalement = await this.repository.create({
      type_entite,
      id_entite,
      id_user_signalant: userId,
      motif,
      description,
      url_screenshot,
      statut: 'en_attente',
      date_signalement: new Date()
    });

    // Recharger avec le signalant
    return this.repository.findByIdWithSignalant(signalement.id_signalement);
  }

  /**
   * Liste paginee des signalements d'un utilisateur
   * @param {number} userId
   * @param {Object} options - { page, limit }
   */
  async getMesSignalements(userId, options = {}) {
    return this.repository.findByUser(userId, options);
  }

  /**
   * File de moderation (admin)
   * Enrichit chaque signalement avec l'entite signalee
   * @param {Object} options - { statut, priorite, page, limit }
   */
  async getModerationQueue(options = {}) {
    const result = await this.repository.findModerationQueue(options);

    // Enrichir avec les entites signalees
    const enrichedData = await Promise.all(
      result.data.map(async (signalement) => {
        const entity = await this.repository.getSignaledEntity(
          signalement.type_entite,
          signalement.id_entite
        );
        return {
          ...signalement.toJSON(),
          entite_signalee: entity
        };
      })
    );

    return {
      data: enrichedData,
      pagination: result.pagination
    };
  }

  /**
   * Traiter un signalement (admin)
   * @param {number} id - ID du signalement
   * @param {Object} data - { action_prise, notes_moderation }
   * @param {number} moderateurId - ID du moderateur
   */
  async traiterSignalement(id, data, moderateurId) {
    const { action_prise, notes_moderation } = data;

    // Validation de l'action
    if (!VALID_ACTIONS.includes(action_prise)) {
      throw this._validationError('Action de moderation invalide');
    }

    // Trouver le signalement
    const signalement = await this.repository.findById(id);
    if (!signalement) {
      throw this._notFoundError(id);
    }

    // L'action d'abord : si elle est refusée, le signalement ne doit pas passer pour « traité »
    await this.repository.applyModerationAction(signalement, action_prise);
    if (action_prise === 'avertissement') await this._avertirAuteur(signalement);

    // Mettre a jour le signalement
    await signalement.update({
      statut: 'traite',
      id_moderateur: moderateurId,
      date_traitement: new Date(),
      action_prise,
      notes_moderation
    });

    return signalement;
  }

  /** Notification et e-mail à l'auteur : les notes de modération restent internes */
  async _avertirAuteur(signalement) {
    const idAuteur = await this.repository.auteurSignale(signalement);
    if (!idAuteur) throw this._validationError('Aucun compte à avertir pour ce signalement');
    const titre = 'Avertissement de l’équipe Tala DZ';
    const message = 'Un de vos contenus a été signalé et ne respecte pas les règles du site. En cas de nouveau manquement, votre compte pourra être suspendu.';
    const { notificationService, emailService } = require('../serviceContainer');
    await notificationService.enregistrerNotificationsMultiples([{
      id_user: idAuteur, type_notification: 'message_admin', titre, message, url_action: null, priorite: 'haute', lu: false
    }]);
    const auteur = await this.repository.models.User?.findByPk(idAuteur, { attributes: ['email'] });
    if (auteur?.email) {
      await emailService.sendEmail(auteur.email, titre, `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2>${titre}</h2><p>${message}</p><p style="color:#666;font-size:12px">L’équipe Tala DZ</p></div>`);
    }
  }
}

module.exports = SignalementService;
