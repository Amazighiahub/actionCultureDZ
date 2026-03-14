/**
 * UserRepository - Repository pour les utilisateurs
 * Étend BaseRepository avec des méthodes spécifiques aux utilisateurs
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');

class UserRepository extends BaseRepository {
  constructor(models) {
    super(models.User);
    this.models = models;
  }

  /**
   * Trouve un utilisateur par email
   */
  async findByEmail(email, options = {}) {
    return this.findOne({ email }, options);
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
    const professionalTypeIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];

    return this.findAll({
      ...options,
      where: {
        id_type_user: { [Op.in]: professionalTypeIds },
        statut: 'actif'
      }
    });
  }

  /**
   * Recherche d'utilisateurs
   */
  async searchUsers(query, options = {}) {
    // Échapper les wildcards LIKE pour éviter la manipulation de résultats
    const escaped = query.replace(/[%_\\]/g, '\\$&');
    return this.findAll({
      ...options,
      where: {
        [Op.or]: [
          { nom: { [Op.like]: `%${escaped}%` } },
          { prenom: { [Op.like]: `%${escaped}%` } },
          { email: { [Op.like]: `%${escaped}%` } },
          { entreprise: { [Op.like]: `%${escaped}%` } }
        ],
        ...options.where
      }
    });
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
  async findByRefreshToken(refreshToken) {
    return this.findOne({ refresh_token: refreshToken });
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
   */
  async suspend(userId, adminId, duree, motif) {
    return this.update(userId, {
      statut: 'suspendu'
    });
  }

  /**
   * Réactive un utilisateur
   */
  async reactivate(userId, adminId) {
    return this.update(userId, {
      statut: 'actif'
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
   * Suppression définitive d'un utilisateur avec nettoyage transactionnel
   * Anonymise les contenus liés, supprime les associations, crée un audit log
   * @param {number} userId - ID de l'utilisateur à supprimer
   * @param {Object} options - { adminId, userEmail, userType, userName }
   * @returns {Promise<Object>} résultat de la suppression
   */
  async hardDeleteUser(userId, options = {}) {
    const { adminId, userEmail, userType, userName } = options;

    return this.withTransaction(async (transaction) => {
      const txOpts = { transaction };

      // 1. Anonymiser les audit logs de cet admin
      if (this.models.AuditLog) {
        await this.models.AuditLog.update(
          { id_admin: null },
          { where: { id_admin: userId }, ...txOpts }
        );
      }

      // 2. Supprimer les associations directes
      if (this.models.UserRole) {
        await this.models.UserRole.destroy({ where: { id_user: userId }, ...txOpts });
      }
      if (this.models.UserOrganisation) {
        await this.models.UserOrganisation.destroy({ where: { id_user: userId }, ...txOpts });
      }
      if (this.models.OeuvreUser) {
        await this.models.OeuvreUser.destroy({ where: { id_user: userId }, ...txOpts });
      }
      if (this.models.EvenementUser) {
        await this.models.EvenementUser.destroy({ where: { id_user: userId }, ...txOpts });
      }

      // 3. Anonymiser les contenus créés/validés
      if (this.models.Oeuvre) {
        await this.models.Oeuvre.update({ saisi_par: null }, { where: { saisi_par: userId }, ...txOpts });
        await this.models.Oeuvre.update({ validateur_id: null }, { where: { validateur_id: userId }, ...txOpts });
      }
      if (this.models.Evenement) {
        await this.models.Evenement.update({ id_user: null }, { where: { id_user: userId }, ...txOpts });
      }
      if (this.models.Commentaire) {
        await this.models.Commentaire.update({ id_user: null }, { where: { id_user: userId }, ...txOpts });
      }
      if (this.models.CritiqueEvaluation) {
        await this.models.CritiqueEvaluation.update({ id_user: null }, { where: { id_user: userId }, ...txOpts });
      }
      if (this.models.Signalement) {
        await this.models.Signalement.update({ id_user: null }, { where: { id_user: userId }, ...txOpts });
        await this.models.Signalement.update({ id_moderateur: null }, { where: { id_moderateur: userId }, ...txOpts });
      }

      // 4. Supprimer les données personnelles
      if (this.models.Favori) {
        await this.models.Favori.destroy({ where: { id_user: userId }, ...txOpts });
      }
      if (this.models.Notification) {
        await this.models.Notification.destroy({ where: { id_user: userId }, ...txOpts });
      }
      if (this.models.Session) {
        await this.models.Session.destroy({ where: { id_user: userId }, ...txOpts });
      }

      // 5. Créer l'entrée d'audit
      if (this.models.AuditLog && adminId) {
        await this.models.AuditLog.create({
          id_admin: adminId,
          action: 'DELETE_USER',
          type_entite: 'user',
          id_entite: userId,
          details: JSON.stringify({
            method: 'hard_delete',
            user_email: userEmail,
            user_type: userType,
            user_name: userName,
            deleted_at: new Date().toISOString()
          }),
          date_action: new Date()
        }, txOpts);
      }

      // 6. Supprimer l'utilisateur
      await this.model.destroy({ where: { id_user: userId }, ...txOpts });

      return { deleted: true, type: 'hard' };
    });
  }

  /**
   * Artisans (non-visiteurs) par wilaya avec type et wilaya inclus
   * @param {number} wilayaId
   * @returns {Promise<Array>}
   */
  async findArtisansByWilaya(wilayaId) {
    const includes = [];
    if (this.models.TypeUser) {
      includes.push({ model: this.models.TypeUser, attributes: ['id_type_user', 'nom_type'], required: false });
    }
    if (this.models.Wilaya) {
      includes.push({ model: this.models.Wilaya, attributes: ['id_wilaya', 'nom', 'code'], required: false });
    }

    return this.model.findAll({
      where: {
        wilaya_residence: parseInt(wilayaId),
        id_type_user: { [Op.ne]: 1 }
      },
      attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url',
        'entreprise', 'id_type_user', 'statut', 'wilaya_residence'],
      include: includes
    });
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
