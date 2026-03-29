/**
 * Service de gestion des utilisateurs pour le Dashboard Admin
 */
const { Op, fn, col } = require('sequelize');
const logger = require('../../utils/logger');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { TYPE_USER_IDS } = require('../../constants/typeUserIds');
const { getClient: getRedisClient } = require('../../utils/redisClient');

class DashboardUserManagementService {
  constructor(models, repositories = {}) {
    this.models = models;
    this.repositories = repositories;
    this.userRepo = repositories.user || null;
  }

  /**
   * Liste paginée des utilisateurs avec filtres (dashboard)
   * Construit le where et délègue au repository
   */
  async getAllUsersFiltered(options = {}) {
    const { search, type_user, statut, page = 1, limit = 20 } = options;
    const where = {};

    if (statut && statut !== 'tous') where.statut = statut;
    if (type_user && type_user !== 'tous') where.id_type_user = parseInt(type_user);
    if (search && search.trim().length >= 2) {
      const { sanitizeLike } = require('../../utils/sanitize');
      const { where: seqWhere, literal } = require('sequelize');
      const searchTerm = `%${sanitizeLike(search)}%`;
      where[Op.or] = [
        seqWhere(fn('JSON_UNQUOTE', fn('JSON_EXTRACT', col('nom'), literal("'$.fr'"))), { [Op.like]: searchTerm }),
        seqWhere(fn('JSON_UNQUOTE', fn('JSON_EXTRACT', col('prenom'), literal("'$.fr'"))), { [Op.like]: searchTerm }),
        { email: { [Op.like]: searchTerm } }
      ];
    }

    return this.userRepo.findAllFiltered({ where, page: parseInt(page), limit: parseInt(limit) });
  }

  /**
   * Recherche rapide d'utilisateurs par type de champ
   */
  async quickSearchUsers(query, type = 'nom') {
    const { sanitizeLike } = require('../../utils/sanitize');
    const searchTerm = `%${sanitizeLike(query)}%`;
    let whereClause = {};

    switch (type) {
      case 'email': whereClause = { email: { [Op.like]: searchTerm } }; break;
      case 'telephone': whereClause = { telephone: { [Op.like]: searchTerm } }; break;
      default: whereClause = { [Op.or]: [{ nom: { [Op.like]: searchTerm } }, { prenom: { [Op.like]: searchTerm } }] };
    }

    return this.userRepo.searchFiltered(whereClause, 20);
  }

  /**
   * Utilisateurs en attente de validation (non-visiteurs)
   */
  async getPendingUsers(options = {}) {
    return this.userRepo.findPendingNonVisiteurs(options);
  }

  /**
   * Détails d'un utilisateur avec rôles (dashboard)
   */
  async getUserDetails(userId) {
    const user = await this.userRepo.findDetailsWithRoles(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    return user;
  }

  /**
   * Stats d'un utilisateur via repositories
   */
  async getUserStats(userId) {
    const oeuvreRepo = this.repositories.oeuvre;
    const evenementRepo = this.repositories.evenement;
    const commentaireRepo = this.repositories.commentaire;

    const [oeuvres, evenements, commentaires] = await Promise.all([
      oeuvreRepo ? oeuvreRepo.count({ saisi_par: userId }) : 0,
      evenementRepo ? evenementRepo.count({ id_user: userId }) : 0,
      commentaireRepo ? commentaireRepo.count({ id_user: userId }) : 0
    ]);

    return { oeuvres, evenements, commentaires };
  }

  /**
   * Mise à jour d'un utilisateur (champs autorisés uniquement)
   */
  async updateUser(userId, data) {
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

    const user = await this.userRepo.update(userId, updateData);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    await this._invalidateUserCache(userId);
    return user;
  }

  /**
   * Suppression d'un utilisateur avec vérifications métier
   * Vérifie qu'on ne supprime pas un admin ou soi-même, puis délègue au repository
   * @param {number} userId - ID de l'utilisateur à supprimer
   * @param {number} adminId - ID de l'admin qui supprime
   * @param {Object} options - { hardDelete }
   * @returns {Object} { deleted, type, userId, deletedBy, timestamp }
   */
  async deleteUser(userId, adminId, options = {}) {
    const { hardDelete = false } = options;

    // Charger l'utilisateur avec ses rôles via le repository
    const user = await this.userRepo.findWithRoles(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérification métier : ne pas supprimer un admin
    if (user.Roles && user.Roles.some(r => r.nom_role === 'Admin' || r.nom_role === 'Super Admin')) {
      throw new Error('CANNOT_DELETE_ADMIN');
    }

    // Vérification métier : ne pas se supprimer soi-même
    if (user.id_user === adminId) {
      throw new Error('CANNOT_DELETE_SELF');
    }

    if (hardDelete) {
      await this.userRepo.hardDeleteUser(userId, {
        adminId,
        userEmail: user.email,
        userType: user.type_user,
        userName: `${user.nom} ${user.prenom}`
      });
      await this._invalidateUserCache(userId);
      return {
        deleted: true, type: 'hard',
        userId: parseInt(userId), deletedBy: adminId,
        timestamp: new Date().toISOString()
      };
    } else {
      await this.userRepo.update(userId, { statut: 'inactif' });
      await this._invalidateUserCache(userId);
      return { deleted: true, type: 'soft' };
    }
  }

  /**
   * Réactivation d'un utilisateur
   */
  async reactivateUser(userId) {
    const user = await this.userRepo.update(userId, {
      statut: 'actif',
      date_suspension: null,
      date_fin_suspension: null,
      raison_suspension: null,
      suspendu_par: null
    });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    await this._invalidateUserCache(userId);
    return user;
  }

  /**
   * Changement de rôle (transactionnel)
   */
  async changeUserRole(userId, roleId, adminId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    const role = await this.models.Role.findByPk(roleId);
    if (!role) throw new Error('Rôle non trouvé');

    if (this.models.UserRole) {
      await this.userRepo.withTransaction(async (transaction) => {
        await this.models.UserRole.destroy({ where: { id_user: userId }, transaction });
        await this.models.UserRole.create({
          id_user: userId, id_role: roleId,
          attribue_par: adminId, date_attribution: new Date()
        }, { transaction });
      });
    }

    await this._invalidateUserCache(userId);
    return { user, role };
  }

  /**
   * Reset mot de passe
   */
  async resetUserPassword(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(tempPassword, rounds);

    await this.userRepo.update(userId, {
      password: hashedPassword,
      doit_changer_mdp: true,
      date_modification: new Date()
    });

    await this._invalidateUserCache(userId);
    return { success: true, tempPassword };
  }

  /**
   * Actions groupées sur les utilisateurs
   */
  async bulkUserAction(action, userIds, data, adminId) {
    const results = { success: [], errors: [] };

    // Batch optimize : 'validate' = 1 seule query via repository
    if (action === 'validate') {
      await this.userRepo.updateMany(
        { id_user: { [Op.in]: userIds } },
        { statut: 'actif', id_user_validate: adminId, date_validation: new Date() }
      );
      results.success = userIds;
      await this._invalidateUserCacheBulk(userIds);
      return results;
    }

    // change_role en batch via repository
    if (action === 'change_role' && data.role_id) {
      if (this.models.UserRole) {
        await this.userRepo.withTransaction(async (transaction) => {
          await this.models.UserRole.destroy({ where: { id_user: { [Op.in]: userIds } }, transaction });
          await this.models.UserRole.bulkCreate(
            userIds.map(id => ({ id_user: id, id_role: data.role_id })),
            { transaction }
          );
        });
      }
      results.success = userIds;
      await this._invalidateUserCacheBulk(userIds);
      return results;
    }

    // Batch UPDATE pour deactivate/delete (1 seule query)
    if (action === 'deactivate') {
      await this.userRepo.updateMany(
        { id_user: { [Op.in]: userIds } },
        { statut: 'inactif' }
      );
      results.success = userIds;
      await this._invalidateUserCacheBulk(userIds);
      return results;
    }

    if (action === 'delete') {
      // Répondre immédiatement — suppression en arrière-plan
      results.success = userIds;

      // Lancer le nettoyage en arrière-plan (ne bloque pas la réponse)
      setImmediate(async () => {
        for (const userId of userIds) {
          try {
            const cleanup = [
              'Favori', 'Commentaire', 'Vue', 'Notification',
              'EvenementUser', 'UserRole', 'EmailVerification',
              'CritiqueEvaluation', 'Signalement', 'QRScan',
              'OeuvreUser', 'UserSpecialite', 'UserOrganisation'
            ];
            for (const model of cleanup) {
              if (this.models[model]) {
                await this.models[model].destroy({ where: { id_user: userId } }).catch(() => {});
              }
            }
            if (this.models.Oeuvre) await this.models.Oeuvre.update({ saisi_par: null }, { where: { saisi_par: userId } }).catch(() => {});
            if (this.models.Oeuvre) await this.models.Oeuvre.update({ validateur_id: null }, { where: { validateur_id: userId } }).catch(() => {});
            if (this.models.Evenement) await this.models.Evenement.update({ id_user: null }, { where: { id_user: userId } }).catch(() => {});
            if (this.models.Intervenant) await this.models.Intervenant.update({ id_user: null }, { where: { id_user: userId } }).catch(() => {});
            if (this.models.Service) await this.models.Service.update({ id_user: null }, { where: { id_user: userId } }).catch(() => {});
            await this.userRepo.delete(userId);
            logger.info(`Utilisateur ${userId} supprimé définitivement`);
          } catch (err) {
            logger.error(`Erreur suppression utilisateur ${userId}:`, err.message);
          }
        }
        await this._invalidateUserCacheBulk(userIds);
      });

      return results;
    }

    // activate: logique métier par user → parallèle avec Promise.allSettled
    if (action === 'activate') {
      const settled = await Promise.allSettled(
        userIds.map(userId => this.reactivateUser(userId))
      );
      settled.forEach((result, i) => {
        if (result.status === 'fulfilled') results.success.push(userIds[i]);
        else results.errors.push({ userId: userIds[i], error: result.reason?.message });
      });
      return results;
    }

    throw new Error(`Action non reconnue: ${action}`);
  }

  /**
   * Export des utilisateurs via repository
   */
  async exportUsers(options = {}) {
    const { filters = {}, maxResults = 10000 } = options;
    const where = {};
    if (filters.type_user) where.id_type_user = filters.type_user;
    if (filters.statut) where.statut = filters.statut;
    if (filters.start_date && filters.end_date) {
      where.date_creation = { [Op.between]: [new Date(filters.start_date), new Date(filters.end_date)] };
    }

    return this.userRepo.findForExport({ where, maxResults });
  }

  /**
   * Valide ou rejette un utilisateur professionnel (dashboard admin)
   * Vérifie les prérequis, met à jour le statut, crée une notification
   * @param {number} userId
   * @param {Object} data - { valide, validateur_id, raison }
   * @returns {Object} { success, message, data }
   */
  async validateUserAction(userId, data) {
    const valide = data.valide !== undefined ? data.valide : data.validated;
    const validateur_id = data.validateur_id || data.adminId;
    const raison = data.raison || data.reason;

    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    if (user.id_type_user === TYPE_USER_IDS.VISITEUR) throw new Error('Les visiteurs n\'ont pas besoin de validation');
    if (user.statut !== 'en_attente_validation') throw new Error(`Cet utilisateur a déjà été traité (statut: ${user.statut})`);

    const updateData = { statut: valide ? 'actif' : 'rejete', date_validation: new Date(), id_user_validate: validateur_id };
    if (!valide && raison) updateData.raison_rejet = raison;
    await this.userRepo.update(userId, updateData);
    await this._invalidateUserCache(userId);
    await user.reload();

    if (this.models.Notification) {
      try {
        await this.models.Notification.create({
          id_user: userId,
          type_notification: valide ? 'validation_compte' : 'message_admin',
          titre: valide ? 'Votre compte a été validé !' : 'Validation refusée',
          message: valide
            ? 'Félicitations ! Votre compte professionnel a été validé.'
            : `Votre demande a été refusée. ${raison ? `Raison : ${raison}` : ''}`,
          lu: false
        });
      } catch (err) { logger.error('Erreur création notification:', err.message); }

      // Envoyer email de notification (fire-and-forget)
      try {
        const emailService = require('../emailService');
        if (emailService && emailService.sendEmail) {
          const subject = valide
            ? 'Votre compte professionnel a été validé - Tala DZ'
            : 'Mise à jour de votre demande - Tala DZ';
          const prenom = typeof user.prenom === 'object' ? (user.prenom?.fr || Object.values(user.prenom)[0] || '') : (user.prenom || '');
          const html = valide
            ? `<h2>Félicitations ${prenom} !</h2><p>Votre compte professionnel a été validé. Vous pouvez maintenant publier du contenu sur la plateforme.</p><p><a href="${process.env.FRONTEND_URL || 'https://taladz.com'}/dashboard-pro">Accéder à votre tableau de bord</a></p>`
            : `<h2>Bonjour ${prenom}</h2><p>Votre demande de compte professionnel a été refusée.${raison ? ` Raison : ${raison}` : ''}</p><p>Vous pouvez soumettre une nouvelle demande avec des informations complémentaires.</p>`;
          emailService.sendEmail(user.email, subject, html).catch(err => {
            logger.error('Erreur envoi email validation:', err.message);
          });
        }
      } catch (err) { logger.error('Email service non disponible:', err.message); }
    }

    return {
      success: true,
      message: valide ? 'Utilisateur validé' : 'Utilisateur rejeté',
      data: { id_user: user.id_user, nom: user.nom, prenom: user.prenom, email: user.email, id_type_user: user.id_type_user, statut: user.statut }
    };
  }

  /**
   * Suspend un utilisateur (dashboard admin)
   * @param {number} userId
   * @param {Object} data - { raison, duree }
   * @returns {Object} { message, data }
   */
  async suspendUserAction(userId, data) {
    const { raison, duree } = data;
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    await this.userRepo.update(userId, { statut: 'suspendu', date_suspension: new Date(), raison_suspension: raison, duree_suspension: duree || null });
    await this._invalidateUserCache(userId);
    await user.reload();
    return { message: 'Utilisateur suspendu', data: user };
  }

  // ===========================================================================
  // CACHE HELPERS
  // ===========================================================================

  async _invalidateUserCache(userId) {
    const redis = getRedisClient();
    if (redis) {
      try { await redis.del(`user:session:${userId}`); } catch (_) { /* best-effort */ }
    }
  }

  async _invalidateUserCacheBulk(userIds) {
    const redis = getRedisClient();
    if (redis && userIds.length > 0) {
      try {
        const keys = userIds.map(id => `user:session:${id}`);
        await redis.del(keys);
      } catch (_) { /* best-effort */ }
    }
  }

}

module.exports = DashboardUserManagementService;
