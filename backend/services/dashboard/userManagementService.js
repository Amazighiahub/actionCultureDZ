/**
 * Service de gestion des utilisateurs pour le Dashboard Admin
 */
const { Op, fn, col } = require('sequelize');
const logger = require('../../utils/logger');
const bcrypt = require('bcrypt');
const { texteLisible } = require('../../helpers/i18n');
const crypto = require('crypto');
const { TYPE_USER_IDS, REGISTRABLE_TYPE_USER_IDS } = require('../../constants/typeUserIds');
const { invalidateUserSession } = require('../../utils/sessionCache');
const { deleteUserFiles } = require('../user/userFileCleanup');
const { annulerEvenementsAVenir } = require('../user/evenementsAVenir');
const { aRoleAdministration } = require('../../constants/roles');

// Erreur avec son code HTTP (404, 400, 409…) : sinon une erreur attendue finissait en 500.
// Le texte ne change pas (les contrôleurs le comparent encore).
const erreurHttp = (message, statusCode) => Object.assign(new Error(message), { statusCode });

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
      // Toutes les langues, sans majuscules ni accents (avant : français seulement, sensible à la casse)
      const { rechercheNomPersonne } = require('../../utils/multiLangSearchBuilder');
      const sequelize = this.models.User.sequelize;
      where[Op.or] = [
        ...(await rechercheNomPersonne(sequelize, this.models.User, sanitizeLike(search), 'User')),
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
      default: {
        const { rechercheNomPersonne } = require('../../utils/multiLangSearchBuilder');
        const terme = searchTerm.replace(/^%|%$/g, '');
        whereClause = { [Op.or]: await rechercheNomPersonne(this.models.User.sequelize, this.models.User, terme, 'User') };
      }
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
      throw erreurHttp('Utilisateur non trouvé', 404);
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

  /** Comptes administrateurs (type administrateur, ou rôle Administrateur) — pas les modérateurs */
  async _idsAdministration() {
    if (!this.models?.User?.findAll) return new Set();
    const parType = await this.models.User.findAll({ where: { id_type_user: TYPE_USER_IDS.ADMINISTRATEUR }, attributes: ['id_user'] });
    const parRole = this.models.Role ? await this.models.User.findAll({
      attributes: ['id_user'],
      include: [{ model: this.models.Role, as: 'Roles', where: { nom_role: 'Administrateur' }, attributes: [], through: { attributes: [] } }]
    }) : []; // pas de .catch : en cas d'erreur, l'action échoue plutôt que de passer sans protection
    return new Set([...parType, ...parRole].map((u) => Number(u.id_user)));
  }

  /**
   * Protection entre comptes d'administration : on ne modifie ni l'e-mail, ni le statut, ni le type,
   * ni le rôle d'un autre compte d'administration depuis le tableau de bord. Sinon un seul compte
   * administrateur volé suffisait à prendre les autres (e-mail changé, puis « mot de passe oublié »).
   */
  async _refuserSiAdministration(userId, parId, action) {
    if (parId && Number(userId) === Number(parId)) {
      throw erreurHttp(`Vous ne pouvez pas ${action} votre propre compte ici`, 403);
    }
    if ((await this._idsAdministration()).has(Number(userId))) {
      throw erreurHttp(`Un compte d’administration ne peut pas être ${action === 'modifier' ? 'modifié' : 'changé de rôle'} depuis le tableau de bord`, 403);
    }
  }

  /**
   * Mise à jour d'un utilisateur (champs autorisés uniquement)
   */
  async updateUser(userId, data, parId = null) {
    await this._refuserSiAdministration(userId, parId, 'modifier');
    const avant = data.email !== undefined ? await this.userRepo.findById(userId) : null;
    const allowedFields = [
      'nom', 'prenom', 'email', 'telephone', 'id_type_user',
      'entreprise', 'biographie', 'statut'
    ];

    // Devenir administrateur passe par le changement de rôle (journal CHANGE_USER_ROLE)
    if (Number(data.id_type_user) === 29) {
      const err = new Error('Pour nommer un administrateur, utilisez « Changer le rôle »');
      err.statusCode = 400;
      throw err;
    }

    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    updateData.date_modification = new Date();

    const user = await this.userRepo.update(userId, updateData);
    if (!user) {
      throw erreurHttp('Utilisateur non trouvé', 404);
    }
    await this._invalidateUserCache(userId);
    // E-mail changé par l'administration : l'ancienne adresse est prévenue
    if (avant?.email && updateData.email && String(updateData.email).toLowerCase() !== String(avant.email).toLowerCase()) {
      const emailService = require('../emailService');
      Promise.resolve(emailService.sendEmail(avant.email, 'L’adresse e-mail de votre compte Tala DZ a été changée',
        '<p>Bonjour,</p><p>L’administration de Tala DZ a changé l’adresse e-mail de votre compte. Si vous n’en êtes pas à l’origine, écrivez tout de suite à contact@taladz.com.</p>',
        null, null, { type: 'securite' })).catch(() => {});
    }
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
      throw erreurHttp('Utilisateur non trouvé', 404);
    }

    // Vérification métier : ne pas supprimer un admin (via Roles OU id_type_user=29)
    if (
      aRoleAdministration(user.Roles)
      || user.id_type_user === TYPE_USER_IDS.ADMINISTRATEUR
    ) {
      throw erreurHttp('CANNOT_DELETE_ADMIN', 403);
    }

    // Vérification métier : ne pas se supprimer soi-même
    if (user.id_user === adminId) {
      throw erreurHttp('CANNOT_DELETE_SELF', 400);
    }

    if (hardDelete) {
      await annulerEvenementsAVenir(this.models, userId, adminId);
      const result = await this.userRepo.hardDeleteUser(userId, {
        adminId,
        userEmail: user.email,
        userType: user.id_type_user
      });
      await this._invalidateUserCache(userId);
      if (result?.files?.length) await deleteUserFiles(this.models, result.files);
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
      throw erreurHttp('Utilisateur non trouvé', 404);
    }
    await this._invalidateUserCache(userId);
    return user;
  }

  /**
   * Changement de rôle (transactionnel)
   */
  /**
   * Changer le type de compte (inscription dans le mauvais métier, ou visiteur qui devient professionnel).
   * Vers un type professionnel : le compte passe « en attente de validation », l'administration le
   * valide ensuite comme d'habitude (accès au tableau de bord pro après validation). Vers « visiteur » :
   * compte actif. Jamais pour un compte d'administration ni pour son propre compte ; pas pour un compte
   * suspendu, banni ou refusé (le réactiver d'abord).
   */
  async changerTypeCompte(userId, idType, adminId) {
    await this._refuserSiAdministration(userId, adminId, 'changer le type de');
    const nouveau = Number(idType);
    if (!REGISTRABLE_TYPE_USER_IDS.has(nouveau)) throw erreurHttp('Type de compte invalide', 400);
    const user = await this.userRepo.findById(userId);
    if (!user) throw erreurHttp('Utilisateur non trouvé', 404);
    if (Number(user.id_type_user) === nouveau) throw erreurHttp('Le compte a déjà ce type', 409);
    if (['suspendu', 'banni', 'rejete', 'inactif'].includes(user.statut)) {
      throw erreurHttp(`Compte ${user.statut} : réactivez-le avant de changer son type`, 409);
    }
    const ancien = Number(user.id_type_user);
    const versPro = nouveau !== TYPE_USER_IDS.VISITEUR;
    const statut = versPro ? 'en_attente_validation' : 'actif';

    // Type et rôle changent ensemble (une seule transaction) : le serveur reconnaît un professionnel
    // à son type OU à son rôle « Professionnel » ; un ancien pro repassé visiteur qui garderait ce rôle
    // resterait « professionnel ». Les rôles Administrateur et Moderateur ne sont jamais touchés.
    await this.userRepo.withTransaction(async (transaction) => {
      await this.userRepo.update(userId, { id_type_user: nouveau, statut }, { transaction });
      if (!this.models.UserRole || !this.models.Role) return;
      const roles = await this.models.Role.findAll({ where: { nom_role: ['Professionnel', 'User'] }, attributes: ['id_role', 'nom_role'], transaction });
      const idRole = (nom) => roles.find((r) => r.nom_role === nom)?.id_role;
      const [garder, retirer] = versPro ? ['Professionnel', 'User'] : ['User', 'Professionnel'];
      if (idRole(retirer)) await this.models.UserRole.destroy({ where: { id_user: userId, id_role: idRole(retirer) }, transaction });
      if (idRole(garder)) {
        await this.models.UserRole.findOrCreate({ where: { id_user: userId, id_role: idRole(garder) }, defaults: { id_user: userId, id_role: idRole(garder) }, transaction });
      } else {
        logger.warn(`Changement de type : rôle « ${garder} » absent de la base, seul le type est changé`);
      }
    });
    await this._invalidateUserCache(userId);

    const libelle = this.models.TypeUser
      ? (await this.models.TypeUser.findByPk(nouveau, { attributes: ['nom_type'] }))?.nom_type
      : null;
    logger.info('Type de compte changé', { action: 'CHANGE_USER_TYPE', targetUserId: userId, ancien, nouveau, statut, adminId });
    if (this.models.Notification) {
      try {
        await this.models.Notification.create({
          id_user: userId,
          type_notification: 'message_admin',
          titre: 'Type de compte modifié',
          message: versPro
            ? `Votre compte est maintenant « ${texteLisible(libelle) || 'professionnel'} ». Il sera actif dès que l’équipe l’aura validé : vous aurez alors accès au tableau de bord professionnel.`
            : 'Votre compte est maintenant un compte visiteur.',
          lu: false
        });
      } catch (err) { logger.error('Notification changement de type :', err.message); }
    }
    return { id_user: Number(userId), id_type_user: nouveau, statut, ancien_type: ancien };
  }

  async changeUserRole(userId, roleId, adminId) {
    await this._refuserSiAdministration(userId, adminId, 'changer le rôle de');
    const user = await this.userRepo.findById(userId);
    if (!user) throw erreurHttp('Utilisateur non trouvé', 404);

    const role = await this.models.Role.findByPk(roleId);
    if (!role) throw erreurHttp('Rôle non trouvé', 404);

    let previousRole = null;
    if (this.models.UserRole) {
      await this.userRepo.withTransaction(async (transaction) => {
        const existing = await this.models.UserRole.findOne({ where: { id_user: userId }, transaction });
        if (existing) {
          const prevRole = await this.models.Role.findByPk(existing.id_role, { transaction });
          previousRole = prevRole ? prevRole.nom_role : existing.id_role;
        }
        await this.models.UserRole.destroy({ where: { id_user: userId }, transaction });
        await this.models.UserRole.create({
          id_user: userId, id_role: roleId,
          attribue_par: adminId, date_attribution: new Date()
        }, { transaction });
      });
    }

    logger.info('Role change', {
      action: 'CHANGE_ROLE',
      targetUserId: userId,
      targetUserEmail: user.email,
      previousRole,
      newRole: role.nom_role,
      newRoleId: roleId,
      adminId,
      timestamp: new Date().toISOString()
    });

    await this._invalidateUserCache(userId);
    return { user, role };
  }

  /**
   * Réinitialisation demandée par l'administration : le mot de passe actuel est remplacé par un
   * mot de passe aléatoire que personne ne connaît (sessions coupées), et la personne reçoit par
   * e-mail le lien « Choisir un nouveau mot de passe » (le même que « mot de passe oublié »).
   * Aucun mot de passe n'est renvoyé à l'administrateur : il ne peut pas se connecter à sa place.
   */
  async resetUserPassword(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw erreurHttp('Utilisateur non trouvé', 404);

    const tempPassword = crypto.randomBytes(24).toString('hex');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(tempPassword, rounds);

    await this.userRepo.update(userId, {
      password: hashedPassword,
      doit_changer_mdp: true,
      // coupe les sessions existantes (contrôle pwdAt/iat + plus de refresh)
      password_changed_at: new Date(),
      refresh_token: null,
      refresh_token_expires: null,
      date_modification: new Date()
    });

    await this._invalidateUserCache(userId);
    // Injectable pour les tests ; sinon le service de l'application
    const verification = this.emailVerificationService || require('../serviceContainer').emailVerificationService;
    const envoi = await verification.requestPasswordReset(user.email, null);
    // rateLimited : un lien encore valide (2 h) a déjà été envoyé
    return { success: true, lienEnvoye: !envoi?.userNotFound && !envoi?.envoiEchoue };
  }

  /**
   * Vérifie manuellement l'email d'un utilisateur (action admin)
   */
  async verifyEmailManually(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw erreurHttp('Utilisateur non trouvé', 404);
    if (user.email_verifie) throw erreurHttp('EMAIL_ALREADY_VERIFIED', 409);

    await this.userRepo.update(userId, {
      email_verifie: true,
      date_modification: new Date()
    });

    await this._invalidateUserCache(userId);
    return { success: true };
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
      // Ni soi-même ni un autre compte d'administration (même règle que le changement un par un)
      const administration = await this._idsAdministration();
      const ecartes = userIds.filter((id) => Number(id) === Number(adminId) || administration.has(Number(id)));
      userIds = userIds.filter((id) => !ecartes.includes(id));
      for (const id of ecartes) results.errors.push({ id, error: 'Compte d’administration ou votre propre compte : rôle non changé' });
      if (this.models.UserRole && userIds.length) {
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
      // Ni soi-même ni un administrateur : on pouvait se couper l'accès d'un clic
      const permis = [];
      for (const userId of userIds) {
        const user = await this.userRepo.findWithRoles(userId);
        const estAdmin = user?.id_type_user === TYPE_USER_IDS.ADMINISTRATEUR
          || aRoleAdministration(user?.Roles);
        if (!user || estAdmin || Number(userId) === Number(adminId)) {
          results.errors.push({ id: userId, error: 'CANNOT_DEACTIVATE' });
        } else {
          permis.push(userId);
        }
      }
      if (permis.length) {
        await this.userRepo.updateMany({ id_user: { [Op.in]: permis } }, { statut: 'inactif' });
        await this._invalidateUserCacheBulk(permis);
      }
      results.success = permis;
      return results;
    }

    if (action === 'delete') {
      // Même suppression que pour une seule personne (transaction, contenus rattachés au compte
      // « Utilisateur supprimé », fichiers retirés, administrateurs et soi-même protégés). L'ancienne
      // version, en arrière-plan sans transaction ni erreur visible, laissait des comptes à moitié
      // supprimés tout en répondant « supprimé ».
      for (const userId of userIds) {
        try {
          await this.deleteUser(userId, adminId, { hardDelete: true });
          results.success.push(userId);
        } catch (err) {
          logger.error(`Erreur suppression utilisateur ${userId}:`, err.message);
          results.errors.push({ id: userId, error: err.message });
        }
      }
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

    throw erreurHttp(`Action non reconnue: ${action}`, 400);
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
    if (!user) throw erreurHttp('Utilisateur non trouvé', 404);
    if (user.id_type_user === TYPE_USER_IDS.VISITEUR) throw erreurHttp('Les visiteurs n\'ont pas besoin de validation', 400);
    if (user.statut !== 'en_attente_validation') throw erreurHttp(`Cet utilisateur a déjà été traité (statut: ${user.statut})`, 409);
    await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, validateur_id, userId, 'votre propre compte');

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
          const prenom = texteLisible(user.prenom);
          const html = valide
            ? `<h2>Félicitations ${prenom} !</h2><p>Votre compte professionnel a été validé. Vous pouvez maintenant publier du contenu sur la plateforme.</p><p><a href="${process.env.FRONTEND_URL || 'https://taladz.com'}/dashboard-pro">Accéder à votre tableau de bord</a></p>`
            : `<h2>Bonjour ${prenom}</h2><p>Votre demande de compte professionnel a été refusée.${raison ? ` Raison : ${raison}` : ''}</p><p>Pour compléter votre demande ou poser une question, écrivez-nous à contact@taladz.com.</p>`;
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
    const { raison, duree, suspendu_par: suspenduPar } = data;
    const user = await this.userRepo.findById(userId);
    if (!user) throw erreurHttp('Utilisateur non trouvé', 404);
    if (user.id_type_user === TYPE_USER_IDS.ADMINISTRATEUR || (await this._idsAdministration()).has(Number(userId))) {
      throw erreurHttp('Un compte administrateur ne peut pas être suspendu ainsi', 403);
    }
    // Colonnes réelles : motif, fin et auteur étaient perdus, et la suspension ne prenait jamais fin
    await this.userRepo.suspend(userId, suspenduPar, Number(duree) || 0, raison);
    await this._invalidateUserCache(userId);
    await user.reload();
    return { message: 'Utilisateur suspendu', data: user };
  }

  // ===========================================================================
  // CACHE HELPERS
  // ===========================================================================

  async _invalidateUserCache(userId) {
    await invalidateUserSession(userId);
  }

  async _invalidateUserCacheBulk(userIds) {
    await invalidateUserSession(userIds);
  }

}

module.exports = DashboardUserManagementService;
