/**
 * SignalementRepository - Acces donnees pour les signalements
 * Extends BaseRepository avec des methodes specifiques a la moderation
 */

const { Op } = require('sequelize');
const BaseRepository = require('./baseRepository');
const AppError = require('../utils/appError');
const { invalidateUserSession } = require('../utils/sessionCache');
const { TYPE_USER_IDS } = require('../constants/typeUserIds');

class SignalementRepository extends BaseRepository {
  constructor(models) {
    super(models.Signalement);
    this.models = models;
  }

  /**
   * Inclusions standard : signalant
   */
  _signalantInclude() {
    return {
      model: this.models.User,
      as: 'Signalant',
      attributes: ['id_user', 'nom', 'prenom', 'email']
    };
  }

  /**
   * Inclusions standard : moderateur
   */
  _moderateurInclude() {
    return {
      model: this.models.User,
      as: 'Moderateur',
      attributes: ['id_user', 'nom', 'prenom']
    };
  }

  /**
   * Trouve un signalement existant pour un user + entite
   */
  async findExisting(type_entite, id_entite, id_user_signalant) {
    return this.findOne({
      type_entite,
      id_entite,
      id_user_signalant
    });
  }

  /**
   * Trouve un signalement par ID avec le signalant
   */
  async findByIdWithSignalant(id) {
    return this.findById(id, {
      include: [this._signalantInclude()]
    });
  }

  /**
   * Liste paginee des signalements d'un utilisateur
   */
  async findByUser(userId, options = {}) {
    const { page = 1, limit = 10 } = options;

    return this.findAll({
      page,
      limit,
      where: { id_user_signalant: userId },
      include: [this._moderateurInclude()],
      order: [['date_signalement', 'DESC']]
    });
  }

  /**
   * File de moderation avec filtres
   */
  async findModerationQueue(options = {}) {
    const { statut, priorite, page = 1, limit = 20 } = options;

    const where = {};
    if (statut) where.statut = statut;
    if (priorite) where.priorite = priorite;

    return this.findAll({
      page,
      limit,
      where,
      include: [this._signalantInclude()],
      order: [
        ['priorite', 'DESC'],
        ['date_signalement', 'ASC']
      ]
    });
  }

  /**
   * Verifie l'existence d'une entite signalee
   */
  async entityExists(type, id) {
    // Seuls les contenus visibles du public peuvent être signalés : sinon la
    // réponse (404 ou 201) révélerait l'existence d'un brouillon.
    const modelMap = {
      oeuvre: { model: this.models.Oeuvre, pk: 'id_oeuvre', where: { statut: 'publie' } },
      evenement: {
        model: this.models.Evenement, pk: 'id_evenement',
        where: { statut: { [Op.notIn]: ['brouillon', 'en_attente'] } }
      },
      user: { model: this.models.User, pk: 'id_user' },
      commentaire: { model: this.models.Commentaire, pk: 'id_commentaire', where: { statut: 'publie' } },
    };

    const entry = modelMap[type];
    if (!entry || !entry.model) return false;

    const entity = await entry.model.findOne({
      where: { [entry.pk]: id, ...(entry.where || {}) },
      attributes: [entry.pk]
    });
    return !!entity;
  }

  /**
   * Recupere l'entite signalee avec attributs restreints
   */
  async getSignaledEntity(type, id) {
    switch (type) {
      case 'oeuvre':
        return this.models.Oeuvre?.findByPk(id, {
          attributes: ['id_oeuvre', 'titre', 'statut']
        }) || null;

      case 'evenement':
        return this.models.Evenement?.findByPk(id, {
          attributes: ['id_evenement', 'nom_evenement', 'statut']
        }) || null;

      case 'user':
        return this.models.User?.findByPk(id, {
          attributes: ['id_user', 'nom', 'prenom', 'email', 'statut']
        }) || null;

      case 'commentaire':
        return this.models.Commentaire?.findByPk(id, {
          attributes: ['id_commentaire', 'contenu', 'statut'],
          include: [{
            model: this.models.User,
            attributes: ['nom', 'prenom']
          }]
        }) || null;

      default:
        return null;
    }
  }

  /** Compte visé par une sanction : la personne signalée, ou l'auteur du contenu signalé */
  async auteurSignale(signalement) {
    const { type_entite: type, id_entite: id } = signalement;
    if (type === 'user') return id;
    if (type === 'commentaire') return (await this.models.Commentaire?.findByPk(id, { attributes: ['id_user'] }))?.id_user || null;
    if (type === 'oeuvre') return (await this.models.Oeuvre?.findByPk(id, { attributes: ['saisi_par'] }))?.saisi_par || null;
    if (type === 'evenement') return (await this.models.Evenement?.findByPk(id, { attributes: ['id_user'] }))?.id_user || null;
    return null;
  }

  /**
   * Applique une action de moderation sur l'entite
   */
  async applyModerationAction(signalement, action) {
    switch (action) {
      case 'suppression_contenu':
        if (signalement.type_entite === 'commentaire' && this.models.Commentaire) {
          await this.models.Commentaire.update(
            { statut: 'supprime' },
            { where: { id_commentaire: signalement.id_entite } }
          );
        }
        break;

      case 'suspension_temporaire':
      case 'suspension_permanente': {
        // Le seul bouton « Signaler » du site vise un commentaire : c'est son auteur qui est sanctionné
        // (avant : rien ne se passait, et le signalement était marqué « traité »)
        const idAuteur = await this.auteurSignale(signalement);
        if (!idAuteur) throw AppError.badRequest('Aucun compte à sanctionner pour ce signalement');
        if (this.models.User) {
          // Un compte administrateur ne se sanctionne pas par un signalement
          const cible = await this.models.User.findByPk(idAuteur, {
            attributes: ['id_user', 'id_type_user'],
            include: this.models.Role ? [{ model: this.models.Role, as: 'Roles', attributes: ['nom_role'], through: { attributes: [] } }] : []
          });
          if (cible && (cible.id_type_user === TYPE_USER_IDS.ADMINISTRATEUR || cible.Roles?.some(r => r.nom_role === 'Administrateur'))) {
            throw AppError.forbidden('Un compte administrateur ne peut pas être sanctionné par un signalement');
          }
          const newStatut = action === 'suspension_temporaire' ? 'suspendu' : 'banni';
          // Session coupée tout de suite (avant : encore valable 15 min en cache, et le renouvellement aussi)
          await this.models.User.update(
            { statut: newStatut, refresh_token: null, refresh_token_expires: null },
            { where: { id_user: idAuteur } }
          );
          await this.models.SessionConnexion?.destroy({ where: { id_user: idAuteur } });
          await invalidateUserSession(idAuteur);
        }
        break;
      }

      // L'avertissement lui-même est envoyé par SignalementService
      case 'avertissement':
        break;
    }
  }
}

module.exports = SignalementRepository;
