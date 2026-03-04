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
        statut_validation: 'en_attente'
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
        statut_validation: 'valide',
        statut: 'actif'
      }
    });
  }

  /**
   * Recherche d'utilisateurs
   */
  async searchUsers(query, options = {}) {
    return this.findAll({
      ...options,
      where: {
        [Op.or]: [
          { nom: { [Op.like]: `%${query}%` } },
          { prenom: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { entreprise: { [Op.like]: `%${query}%` } }
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
      statut_validation: 'valide',
      date_validation: new Date(),
      id_user_validate: validatorId
    });
  }

  /**
   * Refuse un utilisateur
   */
  async reject(userId, validatorId, motif) {
    return this.update(userId, {
      statut_validation: 'rejete',
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
      this.count({ statut_validation: 'en_attente' }),
      this.count({ statut: 'actif' }),
      this.count({ statut: 'suspendu' }),
      this.model.findAll({
        attributes: [
          'id_type_user',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_user')), 'count']
        ],
        group: ['id_type_user'],
        raw: true
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
