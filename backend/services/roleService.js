// services/roleService.js
const logger = require('../utils/logger');

class RoleService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Détermine le rôle selon le type d'utilisateur
   */
  getRoleByUserType(type_user) {
    const roleMapping = {
      'visiteur': 'User',
      'ecrivain': 'Professionnel',
      'journaliste': 'Professionnel',
      'scientifique': 'Professionnel',
      'acteur': 'Professionnel',
      'artiste': 'Professionnel',
      'artisan': 'Professionnel',
      'realisateur': 'Professionnel',
      'musicien': 'Professionnel',
      'photographe': 'Professionnel',
      'danseur': 'Professionnel',
      'sculpteur': 'Professionnel',
      'autre': 'Professionnel'
    };

    return roleMapping[type_user] || 'User';
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRoleToUser(userId, roleName, transaction = null) {
    try {
      // Validation des paramètres
      if (!userId) {
        throw new Error('ID utilisateur requis');
      }

      if (!roleName) {
        throw new Error('Nom du rôle requis');
      }

      logger.info(`📋 Assignation du rôle "${roleName}" à l'utilisateur ID: ${userId}`);

      // Récupérer le rôle
      const role = await this.models.Role.findOne({
        where: { nom_role: roleName },
        transaction
      });

      if (!role) {
        throw new Error(`Rôle "${roleName}" non trouvé dans la base de données`);
      }

      // Vérifier si l'association existe déjà
      const existingAssignment = await this.models.UserRole.findOne({
        where: {
          id_user: userId,
          id_role: role.id_role
        },
        transaction
      });

      if (existingAssignment) {
        logger.info(`ℹ️  L'utilisateur ${userId} possède déjà le rôle "${roleName}"`);
        return existingAssignment;
      }

      // Créer l'association
      const userRole = await this.models.UserRole.create({
        id_user: userId,
        id_role: role.id_role
      }, { transaction });

      logger.info(`✅ Rôle "${roleName}" assigné avec succès à l'utilisateur ${userId}`);
      return userRole;

    } catch (error) {
      logger.error('❌ Erreur lors de l\'assignation du rôle:', error.message);
      throw error;
    }
  }

  /**
   * Retirer un rôle à un utilisateur
   */
  async removeRoleFromUser(userId, roleName, transaction = null) {
    try {
      const role = await this.models.Role.findOne({
        where: { nom_role: roleName },
        transaction
      });

      if (!role) {
        throw new Error(`Rôle "${roleName}" non trouvé`);
      }

      const result = await this.models.UserRole.destroy({
        where: {
          id_user: userId,
          id_role: role.id_role
        },
        transaction
      });

      if (result > 0) {
        logger.info(`✅ Rôle "${roleName}" retiré de l'utilisateur ${userId}`);
      } else {
        logger.info(`ℹ️  L'utilisateur ${userId} n'avait pas le rôle "${roleName}"`);
      }

      return result;

    } catch (error) {
      logger.error('❌ Erreur lors de la suppression du rôle:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir tous les rôles d'un utilisateur
   */
  async getUserRoles(userId, transaction = null) {
    try {
      const user = await this.models.User.findByPk(userId, {
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        }],
        transaction
      });

      return user ? user.Roles : [];
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des rôles:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier si un utilisateur a un rôle spécifique
   */
  async userHasRole(userId, roleName, transaction = null) {
    try {
      const role = await this.models.Role.findOne({
        where: { nom_role: roleName },
        transaction
      });

      if (!role) {
        return false;
      }

      const userRole = await this.models.UserRole.findOne({
        where: {
          id_user: userId,
          id_role: role.id_role
        },
        transaction
      });

      return !!userRole;
    } catch (error) {
      logger.error('❌ Erreur lors de la vérification du rôle:', error.message);
      return false;
    }
  }

  /**
   * Mettre à jour les rôles d'un utilisateur lors d'un changement de type
   */
  async updateUserRolesOnTypeChange(userId, oldType, newType, transaction = null) {
    try {
      const oldRole = this.getRoleByUserType(oldType);
      const newRole = this.getRoleByUserType(newType);

      if (oldRole === newRole) {
        return; // Pas de changement nécessaire
      }

      // Retirer l'ancien rôle
      if (oldRole) {
        await this.removeRoleFromUser(userId, oldRole, transaction);
      }

      // Assigner le nouveau rôle
      await this.assignRoleToUser(userId, newRole, transaction);

      logger.info(`✅ Rôles mis à jour: ${oldRole} → ${newRole}`);

    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour des rôles:', error.message);
      throw error;
    }
  }
}

module.exports = RoleService;