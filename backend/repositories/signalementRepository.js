/**
 * SignalementRepository - Acces donnees pour les signalements
 * Extends BaseRepository avec des methodes specifiques a la moderation
 */

const BaseRepository = require('./baseRepository');

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
    const modelMap = {
      oeuvre: { model: this.models.Oeuvre, pk: 'id_oeuvre' },
      evenement: { model: this.models.Evenement, pk: 'id_evenement' },
      user: { model: this.models.User, pk: 'id_user' },
      commentaire: { model: this.models.Commentaire, pk: 'id_commentaire' },
    };

    const entry = modelMap[type];
    if (!entry || !entry.model) return false;

    const entity = await entry.model.findByPk(id);
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
      case 'suspension_permanente':
        if (signalement.type_entite === 'user' && this.models.User) {
          const newStatut = action === 'suspension_temporaire' ? 'suspendu' : 'banni';
          await this.models.User.update(
            { statut: newStatut },
            { where: { id_user: signalement.id_entite } }
          );
        }
        break;

      case 'avertissement':
        // Future: envoyer email d'avertissement
        break;
    }
  }
}

module.exports = SignalementRepository;
