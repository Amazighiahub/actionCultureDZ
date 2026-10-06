/**
 * UserRepository - Repository pour les utilisateurs
 * Étend BaseRepository avec des méthodes spécifiques aux utilisateurs
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Compte réservé « Utilisateur supprimé » (voir _getDeletedUserSentinel)
const DELETED_USER_EMAIL = 'deleted-user@invalid.local';
const { PUBLIC_USER_PROFILE_ATTRIBUTES, stripPrivateContact } = require('../constants/publicAttributes');

// Types professionnels (2..28) : ni visiteur (1) ni administrateur (29)
const PROFESSIONAL_TYPE_IDS = Array.from({ length: 27 }, (_, i) => i + 2);

class UserRepository extends BaseRepository {
  constructor(models) {
    super(models.User);
    this.models = models;
  }

  /**
   * Trouve un utilisateur par email
   * @param {string} email
   * @param {Object} [options]
   * @param {boolean} [options.includeRoles] - Charge aussi les rôles (nécessaire pour
   *   détecter un admin lors du login, par exemple)
   */
  async findByEmail(email, options = {}) {
    const { includeRoles, includeAuth, ...rest } = options;
    const finalOptions = { ...rest };

    if (includeRoles && this.models.Role) {
      finalOptions.include = [
        ...(finalOptions.include || []),
        {
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] },
          required: false
        }
      ];
    }

    // includeAuth: true → bypass defaultScope pour avoir password + refresh_token
    if (includeAuth) {
      return this.model.unscoped().findOne({ where: { email }, ...finalOptions });
    }
    return this.findOne({ email }, finalOptions);
  }

  /**
   * Trouve les utilisateurs en attente de validation
   */
  async findPendingValidation(options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        statut: 'en_attente_validation'
      },
      order: [['date_creation', 'ASC']]
    });
  }

  /**
   * Trouve les utilisateurs actifs
   */
  async findActive(options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        statut: 'actif'
      }
    });
  }

  /**
   * Trouve les utilisateurs par type
   */
  async findByType(typeUser, options = {}) {
    return this.findAll({
      ...options,
      where: {
        ...options.where,
        id_type_user: typeUser
      }
    });
  }

  /**
   * Trouve les professionnels validés
   */
  async findValidatedProfessionals(options = {}) {
    // Route publique : uniquement le profil public, contact selon les préférences
    const result = await this.findAll({
      ...options,
      attributes: PUBLIC_USER_PROFILE_ATTRIBUTES,
      where: {
        id_type_user: { [Op.in]: PROFESSIONAL_TYPE_IDS },
        statut: 'actif'
      }
    });
    result.data.forEach(stripPrivateContact);
    return result;
  }

  /**
   * Recherche d'utilisateurs
   */
  async searchUsers(query, options = {}, { includePrivate = false } = {}) {
    // Échapper les wildcards LIKE pour éviter la manipulation de résultats
    const escaped = query.replace(/[%_\\]/g, '\\$&');
    const criteria = [
      { nom: { [Op.like]: `%${escaped}%` } },
      { prenom: { [Op.like]: `%${escaped}%` } },
      { entreprise: { [Op.like]: `%${escaped}%` } }
    ];
    // Recherche par email et comptes non actifs : réservés à l'administration
    if (includePrivate) criteria.push({ email: { [Op.like]: `%${escaped}%` } });

    const result = await this.findAll({
      ...options,
      ...(includePrivate ? {} : { attributes: PUBLIC_USER_PROFILE_ATTRIBUTES }),
      where: {
        [Op.or]: criteria,
        ...(includePrivate ? {} : { statut: 'actif' }),
        ...options.where
      }
    });
    if (!includePrivate) result.data.forEach(stripPrivateContact);
    return result;
  }

  /**
   * Obtient un utilisateur avec ses rôles
   */
  async findWithRoles(userId) {
    return this.findById(userId, {
      include: [{
        model: this.models.Role,
        as: 'Roles',
        through: { attributes: [] }
      }]
    });
  }

  /**
   * Obtient un utilisateur avec ses œuvres
   */
  async findWithOeuvres(userId, options = {}) {
    return this.findById(userId, {
      include: [{
        model: this.models.Oeuvre,
        as: 'Oeuvres',
        limit: options.oeuvresLimit || 10,
        order: [['date_creation', 'DESC']]
      }]
    });
  }

  /**
   * Obtient un utilisateur avec ses événements
   */
  async findWithEvenements(userId, options = {}) {
    return this.findById(userId, {
      include: [{
        model: this.models.Evenement,
        as: 'EvenementsOrganises',
        limit: options.evenementsLimit || 10,
        order: [['date_debut', 'DESC']]
      }]
    });
  }

  /**
   * Trouve un utilisateur par refresh token
   */
  async findByIdWithAuth(userId) {
    return this.model.unscoped().findByPk(userId);
  }

  async findByRefreshToken(refreshToken, options = {}) {
    const { transaction, lock } = options;
    // unscoped() car refresh_token est exclu par defaultScope
    return this.model.unscoped().findOne({
      where: { refresh_token: refreshToken },
      ...(transaction ? { transaction } : {}),
      ...(lock ? { lock } : {})
    });
  }

  /**
   * Met à jour la dernière connexion
   */
  async updateLastLogin(userId) {
    return this.update(userId, {
      derniere_connexion: new Date()
    });
  }

  /**
   * Valide un utilisateur
   */
  async validate(userId, validatorId) {
    return this.update(userId, {
      statut: 'actif',
      date_validation: new Date(),
      id_user_validate: validatorId
    });
  }

  /**
   * Refuse un utilisateur
   */
  async reject(userId, validatorId, motif) {
    return this.update(userId, {
      statut: 'rejete',
      date_validation: new Date(),
      id_user_validate: validatorId,
      raison_rejet: motif
    });
  }

  /**
   * Suspend un utilisateur
   * @param {number} userId
   * @param {number} adminId - Admin à l'origine de la suspension
   * @param {number} duree - Durée en jours (0 ou null = indéfinie)
   * @param {string} motif - Motif obligatoire (tracé pour audit)
   */
  async suspend(userId, adminId, duree, motif) {
    const now = new Date();
    const suspensionJusquAu = duree && duree > 0
      ? new Date(now.getTime() + duree * 24 * 60 * 60 * 1000)
      : null;

    return this.update(userId, {
      statut: 'suspendu',
      suspension_motif: motif,
      suspension_jusqu_au: suspensionJusquAu,
      suspendu_par: adminId,
      suspendu_le: now
    });
  }

  /**
   * Réactive un utilisateur (conserve le motif pour historique, mais efface la date de fin)
   */
  async reactivate(userId, adminId) {
    return this.update(userId, {
      statut: 'actif',
      suspension_jusqu_au: null,
      suspendu_par: adminId,
      suspendu_le: new Date()
    });
  }

  /**
   * Liste paginée des utilisateurs avec filtres (dashboard admin)
   * @param {Object} options - { where, page, limit }
   * @returns {Promise<Object>} { data, pagination }
   */
  async findAllFiltered(options = {}) {
    const { where = {}, page = 1, limit = 20 } = options;
    return this.findAll({
      where,
      page,
      limit,
      attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone', 'photo_url',
        'entreprise', 'id_type_user', 'statut', 'wilaya_residence',
        'date_creation', 'derniere_connexion', 'email_verifie'],
      include: [{ model: this.models.TypeUser, as: 'TypeUser', attributes: ['id_type_user', 'nom_type'], required: false }],
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Recherche rapide d'utilisateurs par champ spécifique (dashboard)
   * @param {Object} whereClause - clause where construite par le service
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async searchFiltered(whereClause, limit = 20) {
    return this.model.findAll({
      where: whereClause,
      attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url',
        'entreprise', 'id_type_user', 'statut', 'date_creation'],
      limit,
      order: [['nom', 'ASC'], ['prenom', 'ASC']]
    });
  }

  /**
   * Utilisateurs en attente de validation (non-visiteurs) paginés
   * @param {Object} options - { page, limit }
   * @returns {Promise<Object>} { data, pagination }
   */
  async findPendingNonVisiteurs(options = {}) {
    const { page = 1, limit = 10 } = options;
    return this.findAll({
      where: {
        id_type_user: { [Op.ne]: 1 },
        statut: 'en_attente_validation'
      },
      page,
      limit,
      attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url',
        'entreprise', 'id_type_user', 'statut', 'wilaya_residence',
        'date_creation', 'email_verifie'],
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Trouve un utilisateur avec ses rôles (attributs limités pour dashboard)
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async findDetailsWithRoles(userId) {
    return this.findById(userId, {
      attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone', 'photo_url',
        'entreprise', 'bio', 'id_type_user', 'statut', 'wilaya_residence',
        'date_creation', 'derniere_connexion', 'email_verifie', 'date_validation'],
      include: [{
        model: this.models.Role,
        as: 'Roles',
        through: { attributes: [] },
        attributes: ['id_role', 'nom_role']
      }]
    });
  }

  /**
   * Export paginé des utilisateurs avec rôles
   * @param {Object} options - { where, pageSize, maxResults }
   * @returns {Promise<Array>}
   */
  async findForExport(options = {}) {
    const { where = {}, pageSize = 200, maxResults = 2000 } = options;
    const allUsers = [];
    let offset = 0;

    while (allUsers.length < maxResults) {
      const batch = await this.model.findAll({
        where,
        attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone', 'entreprise',
          'id_type_user', 'statut', 'wilaya_residence', 'date_creation', 'derniere_connexion'],
        include: [{
          model: this.models.Role,
          as: 'Roles',
          attributes: ['id_role', 'nom_role'],
          through: { attributes: [] }
        }],
        order: [['date_creation', 'DESC']],
        limit: pageSize,
        offset,
        subQuery: false
      });
      if (batch.length === 0) break;
      allUsers.push(...batch);
      offset += pageSize;
      if (batch.length < pageSize) break;
    }

    return allUsers.length > maxResults ? allUsers.slice(0, maxResults) : allUsers;
  }

  /**
   * Compte réservé auquel sont rattachés les contenus qui exigent un auteur
   * (événements, commentaires, parcours) quand leur auteur supprime son compte.
   * Créé à la volée s'il n'existe pas ; inactif, il ne peut pas se connecter.
   */
  async _getDeletedUserSentinel(transaction) {
    const User = this.model.unscoped();
    let sentinel = await User.findOne({ where: { email: DELETED_USER_EMAIL }, transaction });
    if (!sentinel) {
      sentinel = await User.create({
        email: DELETED_USER_EMAIL,
        // mot de passe aléatoire jamais communiqué : connexion impossible
        password: crypto.randomBytes(32).toString('hex'),
        nom: { fr: 'Utilisateur', ar: 'مستخدم' },
        prenom: { fr: 'supprimé', ar: 'محذوف' },
        id_type_user: 1,
        accepte_conditions: true,
        profil_public: false
      }, { transaction });
    }
    if (sentinel.statut !== 'inactif') {
      await sentinel.update({ statut: 'inactif' }, { transaction });
    }
    return sentinel;
  }

  /**
   * Suppression définitive d'un compte (RGPD art. 17) :
   * - supprime les données personnelles et les liens propres à la personne ;
   * - rattache au compte « Utilisateur supprimé » les contenus qui exigent un auteur ;
   * - détache (NULL) les autres références.
   * Tout ou rien (transaction). Les fichiers (photo, justificatifs) sont renvoyés
   * pour être supprimés APRÈS la transaction par l'appelant.
   * @returns {Promise<{deleted: boolean, type: string, files: string[]}>}
   */
  async hardDeleteUser(userId, options = {}) {
    const { adminId = null, userEmail, userType } = options;
    const m = this.models;
    // validate:false : on écrit des valeurs connues ; les validateurs de modèle
    // (ex. Commentaire) exigent des champs absents d'un update partiel.
    const UPDATE = { validate: false, hooks: false };

    return this.withTransaction(async (transaction) => {
      const tx = { transaction };
      const user = await this.model.unscoped().findByPk(userId, {
        attributes: ['id_user', 'email', 'photo_url', 'documents_fournis'],
        transaction
      });
      if (!user) return { deleted: false, type: 'hard', files: [] };
      if (user.email === DELETED_USER_EMAIL) {
        throw new Error('Le compte « Utilisateur supprimé » ne peut pas être supprimé');
      }

      const sentinel = await this._getDeletedUserSentinel(transaction);
      const SENTINEL_ID = sentinel.id_user;
      const reassign = async (Model, column) => {
        if (Model) await Model.update({ [column]: SENTINEL_ID }, { where: { [column]: userId }, ...tx, ...UPDATE });
      };
      const detach = async (Model, column) => {
        if (Model) await Model.update({ [column]: null }, { where: { [column]: userId }, ...tx, ...UPDATE });
      };
      const destroy = async (Model, where) => {
        if (Model) await Model.destroy({ where, ...tx });
      };

      // 1. Données et liens propres à la personne : supprimés
      await destroy(m.UserRole, { id_user: userId });
      await destroy(m.UserOrganisation, { id_user: userId });
      await destroy(m.OeuvreUser, { id_user: userId });
      await destroy(m.EvenementUser, { id_user: userId });
      await destroy(m.Favori, { id_user: userId });
      await destroy(m.Notification, { id_user: userId });
      await destroy(m.EmailVerification, { id_user: userId });
      // index uniques (oeuvre, user) / (entité, signalant) : suppression plutôt que réattribution
      await destroy(m.CritiqueEvaluation, { id_user: userId });
      await destroy(m.Signalement, { id_user_signalant: userId });
      await destroy(m.Signalement, { type_entite: 'user', id_entite: userId });

      // 2. Contenus qui exigent un auteur : rattachés au compte « Utilisateur supprimé »
      await reassign(m.Evenement, 'id_user');
      await reassign(m.Commentaire, 'id_user');
      await reassign(m.Parcours, 'id_createur');

      // 3. Autres références : détachées
      await detach(m.AuditLog, 'id_admin');
      await detach(m.Oeuvre, 'saisi_par');
      await detach(m.Oeuvre, 'validateur_id');
      await detach(m.Signalement, 'id_moderateur');
      await detach(m.EvenementUser, 'valide_par');
      await detach(m.EvenementOeuvre, 'id_presentateur');
      await detach(m.DetailLieu, 'id_dernier_contributeur');
      await detach(m.Lieu, 'id_createur');
      await detach(m.LieuIntervenant, 'id_contributeur');
      await detach(m.Service, 'id_user');
      await detach(m.Vue, 'id_user');
      await detach(m.QRScan, 'id_user');
      await detach(m.UserOrganisation, 'id_superviseur');
      await detach(this.model, 'id_user_validate');
      // Fiche intervenant liée au compte : on retire le lien et les coordonnées personnelles
      if (m.Intervenant) {
        await m.Intervenant.update(
          { id_user: null, email: null, telephone: null },
          { where: { id_user: userId }, ...tx, ...UPDATE }
        );
      }

      // 4. Trace d'audit (sans l'email en clair : empreinte SHA-256)
      if (m.AuditLog) {
        await m.AuditLog.create({
          id_admin: adminId || null,
          action: adminId ? 'DELETE_USER' : 'SELF_DELETE_USER',
          entity_type: 'user',
          entity_id: userId,
          details: {
            method: 'hard_delete',
            email_sha256: crypto.createHash('sha256').update(String(userEmail || user.email || '')).digest('hex'),
            user_type: userType ?? null,
            deleted_at: new Date().toISOString()
          },
          date_action: new Date()
        }, tx);
      }

      // 5. Suppression du compte
      await this.model.unscoped().destroy({ where: { id_user: userId }, ...tx });

      let documents = user.documents_fournis;
      if (typeof documents === 'string') {
        try { documents = JSON.parse(documents); } catch { documents = []; }
      }
      const files = [user.photo_url, ...(Array.isArray(documents) ? documents : [])]
        .map(f => (typeof f === 'string' ? f : f?.url))
        .filter(Boolean);

      return { deleted: true, type: 'hard', files };
    });
  }

  /**
   * Artisans (non-visiteurs) par wilaya avec type et wilaya inclus
   * @param {number} wilayaId
   * @returns {Promise<Array>}
   */
  async findArtisansByWilaya(wilayaId, options = {}) {
    const { limit = 100, offset = 0 } = options;
    const includes = [];
    if (this.models.TypeUser) {
      includes.push({ model: this.models.TypeUser, attributes: ['id_type_user', 'nom_type'], required: false });
    }
    if (this.models.Wilaya) {
      includes.push({ model: this.models.Wilaya, attributes: ['id_wilaya', 'nom', 'code'], required: false });
    }

    // Route publique : professionnels actifs uniquement (jamais les admins),
    // contact selon les préférences de confidentialité
    const artisans = await this.model.findAll({
      where: {
        wilaya_residence: parseInt(wilayaId),
        id_type_user: { [Op.in]: PROFESSIONAL_TYPE_IDS },
        statut: 'actif'
      },
      attributes: PUBLIC_USER_PROFILE_ATTRIBUTES,
      include: includes,
      limit,
      offset
    });
    return artisans.map(stripPrivateContact);
  }

  /**
   * Statistiques utilisateurs
   */
  async getStats() {
    const [
      total,
      pendingCount,
      activeCount,
      suspendedCount,
      byType
    ] = await Promise.all([
      this.count(),
      this.count({ statut: 'en_attente_validation' }),
      this.count({ statut: 'actif' }),
      this.count({ statut: 'suspendu' }),
      this.model.findAll({
        attributes: [
          'id_type_user',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_user')), 'count']
        ],
        group: ['id_type_user'],
        raw: true,
        limit: 50
      })
    ]);

    return {
      total,
      pending: pendingCount,
      active: activeCount,
      suspended: suspendedCount,
      byType: byType.reduce((acc, item) => {
        acc[item.id_type_user] = parseInt(item.count);
        return acc;
      }, {})
    };
  }
}

module.exports = UserRepository;
module.exports.DELETED_USER_EMAIL = DELETED_USER_EMAIL;
