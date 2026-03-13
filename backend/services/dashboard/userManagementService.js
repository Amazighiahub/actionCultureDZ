/**
 * Service de gestion des utilisateurs pour le Dashboard Admin
 */
const { Op, fn, col } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class DashboardUserManagementService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Recherche d'utilisateurs avec filtres
   */
  async searchUsers(options = {}) {
    const {
      query,
      type_user,
      statut,
      page = 1,
      limit = 20,
      sortBy = 'date_creation',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    if (query) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${query}%` } },
        { prenom: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } }
      ];
    }

    if (type_user) where.id_type_user = type_user;
    if (statut) where.statut = statut;

    const { rows: users, count } = await this.models.User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'refresh_token'] },
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Détails d'un utilisateur
   */
  async getUserDetails(userId) {
    const user = await this.models.User.findByPk(userId, {
      attributes: { exclude: ['password', 'refresh_token'] },
      include: [
        {
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        },
        {
          model: this.models.Oeuvre,
          as: 'Oeuvres',
          attributes: ['id_oeuvre', 'titre', 'statut', 'date_creation'],
          limit: 10
        }
      ]
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Stats utilisateur
    const stats = await this.getUserStats(userId);

    return { user, stats };
  }

  /**
   * Stats d'un utilisateur
   */
  async getUserStats(userId) {
    const stats = {
      oeuvres: 0,
      evenements: 0,
      commentaires: 0
    };

    if (this.models.Oeuvre) {
      stats.oeuvres = await this.models.Oeuvre.count({
        where: { saisi_par: userId }
      });
    }

    if (this.models.Evenement) {
      stats.evenements = await this.models.Evenement.count({
        where: { id_user: userId }
      });
    }

    if (this.models.Commentaire) {
      stats.commentaires = await this.models.Commentaire.count({
        where: { id_user: userId }
      });
    }

    return stats;
  }

  /**
   * Mise à jour d'un utilisateur
   */
  async updateUser(userId, data, adminId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Filtrer les champs modifiables
    const allowedFields = [
      'nom', 'prenom', 'email', 'telephone', 'id_type_user',
      'entreprise', 'biographie', 'statut'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    updateData.date_modification = new Date();

    await user.update(updateData);
    return user;
  }

  /**
   * Suppression d'un utilisateur (soft delete)
   */
  async deleteUser(userId, adminId, options = {}) {
    const { hardDelete = false, reason } = options;

    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    if (hardDelete) {
      // Suppression définitive
      await user.destroy();
      return { deleted: true, type: 'hard' };
    } else {
      // Soft delete
      await user.update({
        statut: 'inactif'
      });
      return { deleted: true, type: 'soft' };
    }
  }

  /**
   * Réactivation d'un utilisateur
   */
  async reactivateUser(userId, adminId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    await user.update({
      statut: 'actif'
    });

    return user;
  }

  /**
   * Changement de rôle
   */
  async changeUserRole(userId, roleId, adminId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const role = await this.models.Role.findByPk(roleId);
    if (!role) {
      throw new Error('Rôle non trouvé');
    }

    // Supprimer les anciens rôles
    if (this.models.UserRole) {
      await this.models.UserRole.destroy({
        where: { id_user: userId }
      });

      // Ajouter le nouveau rôle
      await this.models.UserRole.create({
        id_user: userId,
        id_role: roleId,
        attribue_par: adminId,
        date_attribution: new Date()
      });
    }

    return { user, role };
  }

  /**
   * Reset mot de passe
   */
  async resetUserPassword(userId, adminId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Générer un mot de passe temporaire
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(tempPassword, rounds);

    await user.update({
      password: hashedPassword,
      date_modification: new Date()
    });

    return {
      success: true,
      tempPassword,
      message: 'Mot de passe réinitialisé. L\'utilisateur devra le changer à sa prochaine connexion.'
    };
  }

  /**
   * Actions groupées sur les utilisateurs
   */
  async bulkUserAction(action, userIds, data, adminId) {
    const results = { success: [], errors: [] };

    for (const userId of userIds) {
      try {
        switch (action) {
          case 'activate':
            await this.reactivateUser(userId, adminId);
            break;
          case 'deactivate':
            await this.deleteUser(userId, adminId, { hardDelete: false, reason: data.reason });
            break;
          case 'changeRole':
            await this.changeUserRole(userId, data.roleId, adminId);
            break;
          case 'validate':
            await this.models.User.update(
              { statut: 'actif', id_user_validate: adminId, date_validation: new Date() },
              { where: { id_user: userId } }
            );
            break;
          default:
            throw new Error(`Action non reconnue: ${action}`);
        }
        results.success.push(userId);
      } catch (error) {
        results.errors.push({ userId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Export des utilisateurs avec pagination pour éviter de surcharger la mémoire
   */
  async exportUsers(options = {}) {
    const { format = 'json', filters = {}, maxResults = 10000 } = options;

    const where = {};
    if (filters.type_user) where.id_type_user = filters.type_user;
    if (filters.statut) where.statut = filters.statut;
    if (filters.dateFrom) {
      where.date_creation = { [Op.gte]: new Date(filters.dateFrom) };
    }

    const pageSize = 100;
    let page = 1;
    let allUsers = [];
    let hasMore = true;

    while (hasMore) {
      const result = await this.models.User.findAll({
        where,
        attributes: { exclude: ['password', 'refresh_token'] },
        limit: pageSize,
        offset: (page - 1) * pageSize,
        order: [['date_creation', 'DESC']],
        raw: true
      });

      allUsers = allUsers.concat(result);
      hasMore = result.length === pageSize && allUsers.length < maxResults;
      page++;
    }

    if (allUsers.length > maxResults) {
      allUsers = allUsers.slice(0, maxResults);
    }

    if (format === 'csv') {
      return this.convertToCSV(allUsers);
    }

    return allUsers;
  }

  /**
   * Convertit en CSV
   */
  convertToCSV(data) {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = DashboardUserManagementService;
