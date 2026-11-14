/**
 * UserService - Service complet pour la gestion des utilisateurs
 *
 * Architecture: Controller → Service → Repository → Database
 *
 * Responsabilités:
 * - Logique métier utilisateur
 * - Transformation via DTOs
 * - Validation des règles métier
 * - Orchestration des opérations
 */

const BaseService = require('../core/baseService');
const UserDTO = require('../../dto/user/userDTO');
const CreateUserDTO = require('../../dto/user/createUserDTO');
const UpdateUserDTO = require('../../dto/user/updateUserDTO');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { signAccessToken, verifyAccessToken } = require('../../utils/jwtHelper');
const { invalidateUserSession } = require('../../utils/sessionCache');
const { deleteUserFiles } = require('./userFileCleanup');
const { TYPE_USER_IDS } = require('../../constants/typeUserIds');
const { evenementsAVenir, annulerEvenementsAVenir } = require('./evenementsAVenir');
const { texteLisible } = require('../../helpers/i18n');

const REFRESH_TOKEN_EXPIRY_DAYS = 90;
// Jeton précédent encore accepté : la réponse du renouvellement a pu se perdre sur un réseau mobile
const JETON_PRECEDENT_MINUTES = 10;
const SESSIONS_MAX_PAR_PERSONNE = 10;

class UserService extends BaseService {
  constructor(userRepository, options = {}) {
    super(userRepository, options);
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be configured. Set it in your .env file.');
    }
    this.jwtSecret = process.env.JWT_SECRET;
    // JWT_EXPIRATION (legacy) prime, sinon on retombe sur JWT_EXPIRES_IN
    // (utilise par .env.example + envAdapter). Le helper jwtHelper fait la
    // meme fallback pour rester coherent.
    this.jwtExpiration = process.env.JWT_EXPIRATION
      || process.env.JWT_EXPIRES_IN
      || '1h';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || (process.env.NODE_ENV === 'production' ? 14 : 12);
  }

  // ============================================================================
  // AUTHENTIFICATION
  // ============================================================================

  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} requestBody - Corps de la requête
   * @returns {Promise<{user: UserDTO, token: string}>}
   */
  async register(requestBody, clientIp = null) {
    // 1. Transformer la requête en DTO (injecter l'IP pour RGPD Art. 7)
    const createDTO = CreateUserDTO.fromRequest({ ...requestBody, _ipClient: clientIp });

    // 2. Valider les données
    const validation = createDTO.validate();
    if (!validation.valid) {
      throw this._validationError('Données invalides', validation.errors);
    }

    // 3. Vérifier si l'email existe déjà
    const existingUser = await this.repository.findByEmail(createDTO.email);
    if (existingUser) {
      throw this._conflictError('Cet email est déjà utilisé');
    }

    // 4. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createDTO.password, this.bcryptRounds);

    // 5. Préparer les données pour la base
    const entityData = createDTO.toEntity();
    await this._resolveCommune(entityData);
    entityData.password = hashedPassword;

    // 6. Créer l'utilisateur + refresh token dans une transaction
    const result = await this.repository.withTransaction(async (transaction) => {
      const newUser = await this.repository.create(entityData, { transaction });

      const refreshToken = this._generateRefreshToken();
      const session = await this._saveRefreshToken(newUser.id_user, refreshToken, transaction);
      const token = this._generateToken(newUser, session.id_session);

      const userDTO = UserDTO.fromEntity(newUser);

      return { user: userDTO, token, refreshToken, userId: newUser.id_user };
    });

    this.logger.info(`Nouvel utilisateur inscrit: ${result.userId}`);

    // Envoyer l'email de vérification (fire-and-forget)
    if (process.env.SKIP_EMAIL_VERIFICATION !== 'true') {
      try {
        const container = require('../serviceContainer');
        const evService = container.emailVerificationService;
        if (evService) {
          evService.sendVerificationEmail(result.userId, '0.0.0.0').catch(err => {
            this.logger.error('Erreur envoi email vérification:', err.message);
          });
        }
      } catch (err) {
        this.logger.error('Email verification service non disponible:', err.message);
      }
    }

    return {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    };
  }

  /**
   * Connexion d'un utilisateur
   * @param {string} email
   * @param {string} motDePasse
   * @returns {Promise<{user: UserDTO, token: string}>}
   */
  async login(email, motDePasse) {
    // 1. Trouver l'utilisateur avec ses rôles (nécessaire pour détecter un admin)
    const user = await this.repository.findByEmail(email, { includeRoles: true, includeAuth: true });

    // 2. Vérifier le mot de passe AVANT tout message de statut, et toujours exécuter
    //    bcrypt (hash factice si l'email est inconnu) : ni la réponse ni le temps de
    //    réponse ne doivent révéler l'existence d'un compte.
    const isValidPassword = await bcrypt.compare(
      String(motDePasse || ''),
      user?.password || await this._getDummyHash()
    );
    if (!user || !isValidPassword) {
      throw this._unauthorizedError('Email ou mot de passe incorrect');
    }

    // 3. Vérifier le statut (mot de passe prouvé : les messages précis sont légitimes)
    if (user.statut === 'inactif' || user.statut === 'banni') {
      throw this._forbiddenError('Votre compte est désactivé');
    }

    if (user.statut === 'suspendu') {
      throw this._forbiddenError('Votre compte est suspendu');
    }

    // 2b. Vérifier l'email (admins exemptés uniquement par rôle DB, pas par id_type_user hardcodé)
    const hasAdminRole = Array.isArray(user.Roles) && user.Roles.some(r => r.nom_role === 'Administrateur');
    if (!user.email_verifie && !hasAdminRole) {
      throw this._forbiddenError('Veuillez vérifier votre adresse email avant de vous connecter');
    }

    // 2c. Vérifier la validation admin (professionnels)
    if (user.statut === 'en_attente_validation') {
      // Code lu par la page de connexion : elle explique la vérification au lieu d'une simple erreur
      throw this._forbiddenError('Votre compte est en attente de validation par un administrateur', 'COMPTE_EN_ATTENTE');
    }

    if (user.statut === 'rejete') {
      throw this._forbiddenError('Votre demande de compte professionnel a été refusée', 'COMPTE_REFUSE');
    }

    // 4. Mettre à jour la dernière connexion
    await this.repository.updateLastLogin(user.id_user);

    // 5. Générer les tokens
    const refreshToken = this._generateRefreshToken();
    // Lecture des anciennes connexions, fermeture des plus vieilles et ouverture de la nouvelle :
    // une seule transaction, comme à l'inscription et au renouvellement
    const session = await this.repository.withTransaction(
      (transaction) => this._saveRefreshToken(user.id_user, refreshToken, transaction)
    );
    const token = this._generateToken(user, session.id_session);

    // 6. Transformer en DTO
    const userDTO = UserDTO.fromEntity(user);

    this.logger.info(`Connexion réussie: ${user.id_user}`);

    return {
      user: userDTO,
      token,
      refreshToken
    };
  }

  /**
   * Rafraîchit les tokens à l'aide d'un refresh token opaque (rotation)
   * @param {string} refreshToken - Refresh token actuel
   * @returns {Promise<{user: UserDTO, token: string, refreshToken: string}>}
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw this._unauthorizedError('Refresh token requis');
    }

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await this.repository.withTransaction(async (transaction) => {
      const { SessionConnexion } = this.models;
      const maintenant = new Date();
      let session = await SessionConnexion.findOne({
        where: {
          [Op.or]: [
            { jeton_hash: hashedToken },
            { jeton_precedent_hash: hashedToken, precedent_jusqua: { [Op.gt]: maintenant } }
          ]
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      let user;
      if (session) {
        user = await this.repository.model.unscoped().findByPk(session.id_user, { transaction });
        if (!user || maintenant > new Date(session.expire_le)) {
          this.logger.warn('Session de connexion expirée');
          throw this._unauthorizedError('Refresh token expiré');
        }
        // Mot de passe changé après l'ouverture de cette connexion (comparaison à la seconde, comme en base)
        const ouverte = Math.floor(new Date(session.date_creation).getTime() / 1000);
        if (user.password_changed_at && ouverte < Math.floor(new Date(user.password_changed_at).getTime() / 1000)) {
          throw this._unauthorizedError('Refresh token invalide');
        }
      } else {
        // Connexion ouverte avant la séparation par appareil : elle continue sans redemander le mot de passe
        user = await this.repository.findByRefreshToken(hashedToken, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user) {
          // Ancien jeton d'une connexion, déjà remplacé et hors délai de grâce : quelqu'un d'autre l'a
          // utilisé (vol probable). La connexion est coupée après la transaction (avant : simple refus,
          // le voleur qui avait renouvelé le premier gardait la session).
          const reutilise = await SessionConnexion.findOne({
            where: { jeton_precedent_hash: hashedToken },
            attributes: ['id_session', 'id_user'],
            transaction
          });
          if (reutilise) return { reutilise };
          this.logger.warn(`Refresh token invalide ou déjà consommé — possible réutilisation`);
          throw this._unauthorizedError('Refresh token invalide');
        }
        if (maintenant > new Date(user.refresh_token_expires)) {
          throw this._unauthorizedError('Refresh token expiré');
        }
        await this.repository.update(user.id_user, { refresh_token: null, refresh_token_expires: null }, { transaction });
      }

      if (user.statut === 'inactif' || user.statut === 'banni' || user.statut === 'suspendu') {
        await this._clearRefreshToken(user.id_user, { transaction });
        throw this._forbiddenError('Compte désactivé ou suspendu');
      }

      // E-mail non vérifié : la session ouverte à l'inscription n'est pas prolongée (la connexion est déjà
      // refusée dans ce cas ; avant, un compte à adresse inventée gardait une session sans fin).
      // Administrateurs exemptés, comme à la connexion.
      if (!user.email_verifie && process.env.SKIP_EMAIL_VERIFICATION !== 'true') {
        const admin = await this.models.User.findByPk(user.id_user, {
          attributes: ['id_user'],
          include: [{ model: this.models.Role, as: 'Roles', attributes: ['nom_role'], where: { nom_role: 'Administrateur' }, required: true }],
          transaction
        });
        if (!admin) {
          await this._clearRefreshToken(user.id_user, { transaction });
          throw this._forbiddenError('Veuillez vérifier votre adresse email');
        }
      }

      const newRefreshToken = this._generateRefreshToken();
      const nouveauHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      if (session) {
        // Le jeton reçu a pu être l'ancien : le dernier émis reste alors valable quelques minutes à sa place
        await session.update({
          jeton_precedent_hash: session.jeton_hash,
          precedent_jusqua: new Date(maintenant.getTime() + JETON_PRECEDENT_MINUTES * 60000),
          jeton_hash: nouveauHash,
          expire_le: this._finDeSession()
        }, { transaction });
      } else {
        session = await this._saveRefreshToken(user.id_user, newRefreshToken, transaction);
      }
      const newAccessToken = this._generateToken(user, session.id_session);

      return { user, newAccessToken, newRefreshToken };
    });

    if (result.reutilise) {
      await this.models.SessionConnexion.destroy({ where: { id_session: result.reutilise.id_session } });
      this.logger.warn(`Jeton de rafraîchissement réutilisé : connexion ${result.reutilise.id_session} coupée (utilisateur ${result.reutilise.id_user})`);
      throw this._unauthorizedError('Refresh token invalide');
    }

    this.logger.info(`Token rafraîchi pour: ${result.user.id_user}`);
    return {
      user: UserDTO.fromEntity(result.user),
      token: result.newAccessToken,
      refreshToken: result.newRefreshToken
    };
  }

  /**
   * Vérifie un token JWT
   * @param {string} token
   * @returns {Promise<UserDTO>}
   */
  async verifyToken(token) {
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw this._unauthorizedError('Token invalide ou expiré');
    }
    const user = await this.repository.findById(decoded.userId);
    if (!user) {
      throw this._unauthorizedError('Token invalide');
    }
    return UserDTO.fromEntity(user);
  }

  /**
   * Vérifie si un email existe déjà
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async checkEmailExists(email) {
    const user = await this.repository.findByEmail(email);
    return !!user;
  }

  // ============================================================================
  // CRUD UTILISATEURS
  // ============================================================================

  /**
   * Récupère tous les utilisateurs avec pagination
   * @param {Object} options - Options de pagination et filtres
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll(options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère un utilisateur par ID
   * @param {number} id
   * @param {Object} options
   * @returns {Promise<UserDTO>}
   */
  /**
   * Traduction d'une langue (administration, PATCH …/translation/:lang) : les champs reçus sont fusionnés
   * dans le texte multilingue, les autres langues restent intactes. La route l'appelait mais la méthode
   * n'existait pas : erreur 500 à chaque appel (audit V11).
   */
  async updateTranslation(id, lang, champs = {}) {
    const { mergeTranslations } = require('../../helpers/i18n');
    const ligne = await this.models.User.findByPk(id);
    if (!ligne) throw this._notFoundError(id);
    const updates = {};
    for (const champ of ['prenom', 'nom', 'biographie']) {
      const valeur = champs[champ];
      if (typeof valeur === 'string' && valeur.trim()) updates[champ] = mergeTranslations(ligne[champ], { [lang]: valeur.trim() });
    }
    if (!Object.keys(updates).length) throw this._validationError('Aucun champ valide à mettre à jour');
    await ligne.update(updates);
    return this.findById(id);
  }

  async findById(id, options = {}) {
    const user = await this.repository.findById(id, options);
    if (!user) {
      throw this._notFoundError(id);
    }
    return UserDTO.fromEntity(user, options);
  }

  /**
   * Récupère le profil complet d'un utilisateur
   * @param {number} userId
   * @returns {Promise<UserDTO>}
   */
  async getProfile(userId) {
    const user = await this.repository.findWithRoles(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }
    return UserDTO.fromEntity(user, { includeStats: true });
  }

  /**
   * Récupère un utilisateur avec ses œuvres
   * @param {number} userId
   * @param {Object} options
   * @returns {Promise<{user: UserDTO, oeuvres: Array}>}
   */
  async findWithOeuvres(userId, options = {}) {
    const user = await this.repository.findWithOeuvres(userId, options);
    if (!user) {
      throw this._notFoundError(userId);
    }

    return {
      user: UserDTO.fromEntity(user),
      oeuvres: user.Oeuvres || []
    };
  }

  /**
   * Met à jour un utilisateur
   * @param {number} id
   * @param {Object} requestBody
   * @param {number} currentUserId - ID de l'utilisateur faisant la modification
   * @returns {Promise<UserDTO>}
   */
  async update(id, requestBody, currentUserId = null, isAdmin = false) {
    // 1. Vérifier que l'utilisateur existe
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw this._notFoundError(id);
    }

    // 2. Vérifier les permissions (si currentUserId fourni)
    // Seul l'utilisateur lui-même ou un admin (calculé par authMiddleware) peut modifier
    if (currentUserId && Number(currentUserId) !== Number(id) && !isAdmin) {
      throw this._forbiddenError('Vous ne pouvez pas modifier ce profil');
    }

    // 3. Transformer en DTO
    const updateDTO = UpdateUserDTO.fromRequest(requestBody);

    // 4. Valider
    const validation = updateDTO.validate();
    if (!validation.valid) {
      throw this._validationError('Données invalides', validation.errors);
    }

    // 5. Vérifier si le nouvel email est disponible
    if (updateDTO.email && updateDTO.email !== existingUser.email) {
      const emailExists = await this.repository.findByEmail(updateDTO.email);
      if (emailExists) {
        throw this._conflictError('Cet email est déjà utilisé');
      }
    }

    // 6. Préparer les données
    const entityData = updateDTO.toEntity();
    await this._resolveCommune(entityData, existingUser);

    // 7. Mettre à jour
    const updatedUser = await this.repository.update(id, entityData);

    this.logger.info(`Utilisateur mis à jour: ${id}`);

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Change le mot de passe d'un utilisateur
   * @param {number} userId
   * @param {string} ancienMotDePasse
   * @param {string} nouveauMotDePasse
   * @returns {Promise<boolean>}
   */
  async changePassword(userId, ancienMotDePasse, nouveauMotDePasse) {
    const user = await this.repository.findByIdWithAuth(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    // Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(ancienMotDePasse, user.password);
    if (!isValid) {
      throw this._validationError('Mot de passe actuel incorrect');
    }

    // Valider le nouveau mot de passe (mêmes critères que l'inscription)
    // Interdire la réutilisation du même mot de passe
    const isSamePassword = await bcrypt.compare(nouveauMotDePasse, user.password);
    if (isSamePassword) {
      throw this._validationError('Le nouveau mot de passe doit être différent de l\'ancien');
    }
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 12) {
      throw this._validationError('Le nouveau mot de passe doit contenir au moins 12 caractères');
    }
    if (!/[A-Z]/.test(nouveauMotDePasse) || !/[a-z]/.test(nouveauMotDePasse) || !/[0-9]/.test(nouveauMotDePasse) || !/[^A-Za-z0-9]/.test(nouveauMotDePasse)) {
      throw this._validationError('Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial');
    }

    // Hasher et mettre à jour
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, this.bcryptRounds);
    await this.repository.update(userId, {
      password: hashedPassword,
      password_changed_at: new Date()
    });

    // Révoquer le refresh token pour forcer la re-authentification
    await this._clearRefreshToken(userId);
    // Liens en attente aussi : un changement d'adresse demandé par un intrus ne doit pas survivre
    await this.models?.EmailVerification?.invalidateUserTokens(userId);

    this.logger.info(`Mot de passe changé pour: ${userId}`);

    return true;
  }

  /**
   * Supprime un utilisateur
   * @param {number} id
   * @param {number} adminId - ID de l'admin effectuant la suppression
   * @returns {Promise<boolean>}
   */
  async delete(id, adminId) {
    const user = await this.repository.findWithRoles(id);
    if (!user) {
      throw this._notFoundError(id);
    }

    // Empêcher la suppression de son propre compte admin
    if (Number(id) === Number(adminId)) {
      throw this._forbiddenError('Vous ne pouvez pas supprimer votre propre compte');
    }
    if (user.Roles?.some(r => r.nom_role === 'Administrateur')
        || user.id_type_user === TYPE_USER_IDS.ADMINISTRATEUR) {
      throw this._forbiddenError('Impossible de supprimer un compte administrateur');
    }

    await annulerEvenementsAVenir(this.models, id, adminId);

    // Suppression complète (données liées nettoyées) — un destroy direct échouait
    // sur les clés étrangères RESTRICT et laissait les données personnelles liées.
    await this._eraseAccount(id, { adminId, userEmail: user.email, userType: user.id_type_user });

    this.logger.info(`Utilisateur supprimé: ${id} par admin: ${adminId}`);

    return true;
  }

  // ============================================================================
  // RGPD — DROIT À L'EFFACEMENT ET PORTABILITÉ
  // ============================================================================

  /**
   * Suppression du propre compte de l'utilisateur (RGPD art. 17)
   * Anonymise les contenus liés et supprime les données personnelles
   * @param {number} userId - ID de l'utilisateur qui demande la suppression
   * @param {string} password - Mot de passe pour confirmer l'identité
   */
  async deleteMyAccount(userId, password) {
    const user = await this.repository.findByIdWithAuth(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    // Vérifier le mot de passe pour confirmer l'identité
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw this._validationError('Mot de passe incorrect');
    }

    // Commandes en cours (à payer ou à envoyer) : elles sont terminées ou annulées d'abord ; sinon l'autre
    // partie perdrait la trace d'un paiement
    const enCours = await require('../commandes').commandesEnCours(this.models || {}, userId);
    if (enCours > 0) {
      throw this._conflictError(`Vous avez encore ${enCours} commande(s) à régler : annulez vos achats pas encore payés, et envoyez `
        + 'ou annulez vos ventes en cours, depuis « Mes commandes », avant de supprimer votre compte.');
    }

    // Organisateur d'événements à venir : il les annule d'abord (les inscrits sont prévenus) ou les confie à
    // l'équipe ; sinon ils resteraient publiés sans personne pour les gérer
    const aVenir = await this._evenementsAVenir(userId);
    if (aVenir.length) {
      const noms = aVenir.slice(0, 3).map(e => `« ${texteLisible(e.nom_evenement)} »`).join(', ');
      throw this._conflictError(`Vous organisez encore ${aVenir.length} événement(s) à venir (${noms}${aVenir.length > 3 ? '…' : ''}) : `
        + 'annulez-les depuis votre tableau de bord, ou écrivez à contact@taladz.com pour les confier à l’équipe, avant de supprimer votre compte.');
    }

    // Suppression complète : données personnelles, liens, fichiers, sessions
    await this._eraseAccount(userId, { adminId: null, userEmail: user.email, userType: user.id_type_user });

    this.logger.info(`RGPD: Compte supprimé par l'utilisateur lui-même: ${userId}`);

    return { deleted: true };
  }

  /**
   * Export des données personnelles de l'utilisateur (RGPD art. 20)
   * Retourne toutes les données associées à l'utilisateur au format JSON
   * @param {number} userId
   */
  /**
   * Retrait du consentement newsletter (lien de désinscription signé)
   */
  async unsubscribeNewsletter(userId) {
    await this.repository.update(userId, { accepte_newsletter: false });
    this.logger.info(`RGPD: désinscription newsletter: ${userId}`);
    return true;
  }

  /** Lien « Ne plus recevoir ces annonces » des e-mails envoyés aux inscrits */
  async unsubscribeAnnonces(userId) {
    await this.repository.update(userId, { notifications_evenements: false });
    this.logger.info(`Désinscription des annonces par e-mail: ${userId}`);
    return true;
  }

  async exportMyData(userId) {
    const models = this.repository.models;
    // unscoped : le defaultScope masque les IP de consentement, qui font partie des données à remettre
    const user = await models.User.unscoped().findByPk(userId, {
      attributes: { exclude: ['password', 'refresh_token', 'refresh_token_expires'] },
      raw: true
    });
    if (!user) {
      throw this._notFoundError(userId);
    }

    const data = {
      export_date: new Date().toISOString(),
      export_format: 'RGPD Article 15 / 20 — Droit d\'accès et à la portabilité',
      // Profil complet : identité, coordonnées, préférences, consentements, statut
      personal_info: user
    };

    const EXPORT_LIMIT = 10000;
    // [clé de l'export, modèle, condition, colonnes exclues]
    const SECTIONS = [
      ['oeuvres', models.Oeuvre, { saisi_par: userId }],
      ['contributions_oeuvres', models.OeuvreUser, { id_user: userId }],
      ['evenements_organises', models.Evenement, { id_user: userId }],
      ['inscriptions_evenements', models.EvenementUser, { id_user: userId }],
      ['commentaires', models.Commentaire, { id_user: userId }],
      ['critiques', models.CritiqueEvaluation, { id_user: userId }],
      ['notes_sites_patrimoine', models.LieuNotation, { id_user: userId }],
      ['favoris', models.Favori, { id_user: userId }],
      ['notifications', models.Notification, { id_user: userId }],
      ['professionnels_suivis', models.SuiviProfessionnel, { id_user: userId }],
      ['appareils_notifications', models.PushAbonnement, { id_user: userId }, ['p256dh', 'auth']],
      ['signalements_effectues', models.Signalement, { id_user_signalant: userId }],
      ['organisations', models.UserOrganisation, { id_user: userId }],
      ['roles', models.UserRole, { id_user: userId }],
      ['fiche_intervenant', models.Intervenant, { id_user: userId }],
      ['services', models.Service, { id_user: userId }],
      ['lieux_crees', models.Lieu, { id_createur: userId }],
      ['parcours', models.Parcours, { id_createur: userId }],
      ['verifications_email', models.EmailVerification, { id_user: userId }, ['token']],
      ['consultations', models.Vue, { id_user: userId }],
      ['scans_qr', models.QRScan, { id_user: userId }],
      ['messages_aux_participants', models.MessageEvenement, { id_user: userId }],
      ['modifications_lieux', models.HistoriqueLieu, { id_user: userId }],
      ['propositions_articles', models.ArticleRevision, { id_auteur: userId }]
    ];

    for (const [key, Model, where, exclude = []] of SECTIONS) {
      if (!Model) continue;
      data[key] = await Model.findAll({
        where,
        attributes: exclude.length ? { exclude } : undefined,
        raw: true,
        limit: EXPORT_LIMIT
      });
    }

    // Tables sans modèle Sequelize
    const sequelize = models.sequelize || models.User.sequelize;
    const TABLES = [
      ['demandes_organisations', 'SELECT id_organisation, message, statut, motif, date_creation, date_decision FROM organisation_revendication WHERE id_user = :id'],
      ['propositions_patrimoine', 'SELECT id_lieu, action, donnees, statut, motif, date_creation, date_decision FROM proposition_lieu WHERE id_user = :id']
    ];
    for (const [key, sql] of TABLES) {
      if (!sequelize) break;
      try {
        data[key] = await sequelize.query(`${sql} LIMIT ${EXPORT_LIMIT}`, {
          replacements: { id: userId }, type: sequelize.QueryTypes.SELECT
        });
      } catch (err) {
        this.logger.warn(`RGPD export: ${key} indisponible (${err.message})`);
      }
    }

    this.logger.info(`RGPD: Export de données demandé par l'utilisateur: ${userId}`);

    return data;
  }

  // ============================================================================
  // RECHERCHE ET FILTRAGE
  // ============================================================================

  /**
   * Recherche d'utilisateurs
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async search(query, options = {}, { includePrivate = false } = {}) {
    const result = await this.repository.searchUsers(query, options, { includePrivate });

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les utilisateurs par type
   * @param {string} typeUser
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findByType(typeUser, options = {}) {
    const result = await this.repository.findByType(typeUser, options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Récupère les professionnels validés
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  /**
   * Professionnels proches d'une commune / wilaya (suggestions de contributeurs, fiche lieu)
   */
  /** Portfolio public d'un professionnel (null si le profil n'est pas public, sauf options.inclurePrive) */
  async getPublicPortfolio(userId, options = {}) {
    return this.repository.findPublicPortfolio(userId, options);
  }

  /** Professionnel validé (pour le QR code de son portfolio), ou null */
  async getPublicProfessional(userId) {
    return this.repository.findPublicProfessional(userId);
  }

  async findNearbyProfessionals(params = {}) {
    return this.repository.findNearbyProfessionals(params);
  }

  async findValidatedProfessionals(options = {}) {
    const result = await this.repository.findValidatedProfessionals(options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // MODÉRATION / ADMIN
  // ============================================================================

  /**
   * Récupère les utilisateurs en attente de validation
   * @param {Object} options
   * @returns {Promise<{data: Array<UserDTO>, pagination: Object}>}
   */
  async findPendingValidation(options = {}) {
    const result = await this.repository.findPendingValidation(options);

    return {
      data: UserDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Valide un utilisateur professionnel
   * @param {number} userId
   * @param {number} validatorId
   * @returns {Promise<UserDTO>}
   */
  async validateUser(userId, validatorId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    // Valider ne sert qu'à sortir un compte de l'attente : un compte suspendu/banni
    // se réactive via reactivate (réservé à l'admin).
    if (user.statut !== 'en_attente_validation') {
      throw this._conflictError('Seul un compte en attente peut être validé');
    }
    await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, validatorId, userId, 'votre propre compte');

    const updatedUser = await this.repository.validate(userId, validatorId);
    await invalidateUserSession(userId);

    this.logger.info(`Utilisateur validé: ${userId} par: ${validatorId}`);

    // TODO: Envoyer notification à l'utilisateur

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Refuse un utilisateur
   * @param {number} userId
   * @param {number} validatorId
   * @param {string} motif
   * @returns {Promise<UserDTO>}
   */
  async rejectUser(userId, validatorId, motif) {
    const user = await this.repository.findWithRoles(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (Number(userId) === Number(validatorId)) {
      throw this._forbiddenError('Vous ne pouvez pas refuser votre propre compte');
    }
    const STAFF_ROLES = ['Administrateur', 'Modérateur', 'Moderateur'];
    if (user.Roles?.some(r => STAFF_ROLES.includes(r.nom_role))) {
      throw this._forbiddenError('Impossible de refuser un compte administrateur ou modérateur');
    }
    if (user.statut !== 'en_attente_validation') {
      throw this._conflictError('Seul un compte en attente peut être refusé');
    }

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de refus est requis');
    }

    const updatedUser = await this.repository.reject(userId, validatorId, motif);
    await invalidateUserSession(userId);

    this.logger.info(`Utilisateur refusé: ${userId} par: ${validatorId}`);

    // TODO: Envoyer notification à l'utilisateur

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Suspend un utilisateur
   * @param {number} userId
   * @param {number} adminId
   * @param {number} duree - Durée en jours
   * @param {string} motif
   * @returns {Promise<UserDTO>}
   */
  async suspendUser(userId, adminId, duree, motif) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (user.statut === 'suspendu') {
      throw this._conflictError('Cet utilisateur est déjà suspendu');
    }

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de suspension est requis');
    }

    const updatedUser = await this.repository.suspend(userId, adminId, duree, motif);
    await invalidateUserSession(userId);

    this.logger.info(`Utilisateur suspendu: ${userId} par: ${adminId} pour ${duree} jours`);

    // TODO: Envoyer notification à l'utilisateur

    return UserDTO.fromEntity(updatedUser);
  }

  /**
   * Réactive un utilisateur
   * @param {number} userId
   * @param {number} adminId
   * @returns {Promise<UserDTO>}
   */
  async reactivateUser(userId, adminId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    if (user.statut === 'actif') {
      throw this._conflictError('Cet utilisateur est déjà actif');
    }

    const updatedUser = await this.repository.reactivate(userId, adminId);
    await invalidateUserSession(userId);

    this.logger.info(`Utilisateur réactivé: ${userId} par: ${adminId}`);

    return UserDTO.fromEntity(updatedUser);
  }

  // ============================================================================
  // STATISTIQUES
  // ============================================================================

  /**
   * Récupère les statistiques utilisateurs
   * @returns {Promise<Object>}
   */
  async getStats() {
    return this.repository.getStats();
  }

  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================

  /**
   * Vérifie la commune et aligne la wilaya sur celle de la commune.
   * - commune inconnue, ou wilaya différente de celle de la commune : erreur 400
   * - wilaya modifiée sans commune : l'ancienne commune (autre wilaya) est retirée
   * @param {object} entityData - données à enregistrer (modifiées en place)
   * @param {object} [current] - utilisateur existant (mise à jour)
   */
  async _resolveCommune(entityData, current = null) {
    const { Commune, Daira } = this.models || {};
    if (entityData.id_commune) {
      if (!Commune) return;
      const commune = await Commune.findByPk(entityData.id_commune, {
        attributes: ['id_commune', 'dairaId'],
        include: Daira ? [{ model: Daira, attributes: ['id_daira', 'wilayaId'] }] : []
      });
      if (!commune) {
        throw this._validationError('Commune inconnue', [{ field: 'id_commune', message: 'Commune inconnue' }]);
      }
      const wilayaId = commune.Daira?.wilayaId;
      if (entityData.wilaya_residence && wilayaId && Number(entityData.wilaya_residence) !== Number(wilayaId)) {
        throw this._validationError('La commune n\'appartient pas à la wilaya choisie',
          [{ field: 'id_commune', message: 'La commune n\'appartient pas à la wilaya choisie' }]);
      }
      if (wilayaId) entityData.wilaya_residence = wilayaId;
    } else if (current && entityData.wilaya_residence !== undefined && entityData.id_commune === undefined
               && Number(entityData.wilaya_residence) !== Number(current.wilaya_residence)) {
      entityData.id_commune = null;
    }
  }

  /** Événements publiés et pas encore terminés organisés par ce compte */
  async _evenementsAVenir(userId) {
    return evenementsAVenir(this.models, userId);
  }

  /** Hash bcrypt factice (même coût que les vrais) pour égaliser le temps de réponse du login */
  _getDummyHash() {
    if (!this._dummyHashPromise) {
      this._dummyHashPromise = bcrypt.hash(crypto.randomBytes(16).toString('hex'), this.bcryptRounds);
    }
    return this._dummyHashPromise;
  }

  /**
   * Efface un compte (RGPD art. 17) : transaction en base, puis fichiers et sessions.
   */
  async _eraseAccount(userId, { adminId, userEmail, userType }) {
    const result = await this.repository.hardDeleteUser(userId, { adminId, userEmail, userType });
    await invalidateUserSession(userId);
    if (result.files?.length && this.models) {
      await deleteUserFiles(this.models, result.files);
    }
    return result;
  }

  /**
   * Révoque la connexion de cet appareil (déconnexion). Sans numéro de session (jeton plus ancien) :
   * toutes les connexions de la personne, comme avant.
   * @param {number} userId
   * @param {number} [idSession]
   * @returns {Promise<void>}
   */
  async revokeRefreshToken(userId, idSession) {
    if (idSession) {
      await this.models.SessionConnexion.destroy({ where: { id_session: idSession, id_user: userId } });
    } else {
      await this._clearRefreshToken(userId);
    }
    this.logger.info(`Refresh token révoqué pour: ${userId}`);
  }

  /**
   * Coupe la connexion désignée par son cookie : la déconnexion fonctionne même jeton d'accès expiré.
   * @param {string} jeton
   */
  async revokeParJeton(jeton) {
    if (typeof jeton !== 'string' || !jeton) return;
    const empreinte = crypto.createHash('sha256').update(jeton).digest('hex');
    await this.models.SessionConnexion.destroy({
      where: { [Op.or]: [{ jeton_hash: empreinte }, { jeton_precedent_hash: empreinte }] }
    });
    // Connexion ouverte avant la séparation par appareil
    await this.repository.model.unscoped().update(
      { refresh_token: null, refresh_token_expires: null },
      { where: { refresh_token: empreinte } }
    );
  }

  /**
   * Génère un token JWT
   * @private
   */
  _generateToken(user, idSession) {
    // Delegue au helper central : ajoute jti (UUID v4), issuer et audience.
    // On conserve la signature de retour (string) pour ne pas casser les
    // callers historiques (register/login/verifyEmail/refreshSession).
    const { token } = signAccessToken(
      {
        userId: user.id_user,
        email: user.email,
        typeUser: user.id_type_user,
        // Connexion de cet appareil : la déconnexion ne coupe qu'elle
        ...(idSession ? { sid: idSession } : {}),
        // Omettre pwdAt si null — 0 serait falsy et annulerait la vérification côté middleware
        ...(user.password_changed_at ? {
          pwdAt: Math.floor(new Date(user.password_changed_at).getTime() / 1000)
        } : {}),
      },
      { expiresIn: this.jwtExpiration, subject: user.id_user }
    );
    return token;
  }

  /**
   * Génère un refresh token opaque cryptographiquement sûr
   * @private
   */
  _generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Date de fin d'une connexion : repoussée à chaque renouvellement
   * @private
   */
  _finDeSession() {
    const fin = new Date();
    fin.setDate(fin.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return fin;
  }

  /**
   * Ouvre une connexion pour cet appareil, sans toucher à celles des autres appareils
   * @private
   * @returns {Promise<{id_session: number}>}
   */
  async _saveRefreshToken(userId, refreshToken, transaction = null) {
    const { SessionConnexion } = this.models;
    const options = transaction ? { transaction } : {};
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Connexions expirées de CETTE personne seulement (index id_user) : elles ne comptent pas dans la
    // limite d'appareils. La purge de toute la table est faite la nuit par cronService.cleanExpiredTokens
    // (avant : à chaque connexion et à chaque renouvellement, avec un verrou de plage sur expire_le
    // partagé par toutes les connexions simultanées ; audit V11 BDD-17). Une connexion expirée reste
    // refusée au renouvellement (refreshToken compare expire_le), purgée ou non.
    await SessionConnexion.destroy({ where: { id_user: userId, expire_le: { [Op.lt]: new Date() } }, ...options });
    // Au-delà de la limite, la connexion la plus ancienne se ferme
    const anciennes = await SessionConnexion.findAll({
      where: { id_user: userId },
      attributes: ['id_session'],
      order: [['id_session', 'DESC']],
      offset: SESSIONS_MAX_PAR_PERSONNE - 1,
      limit: 100,
      ...options
    });
    if (anciennes.length) {
      await SessionConnexion.destroy({ where: { id_session: anciennes.map((s) => s.id_session) }, ...options });
    }

    return SessionConnexion.create({
      id_user: userId,
      jeton_hash: hashedToken,
      expire_le: this._finDeSession()
    }, options);
  }

  /**
   * Coupe toutes les connexions d'une personne, sur tous ses appareils
   * @private
   */
  async _clearRefreshToken(userId, options = {}) {
    await this.models.SessionConnexion.destroy({ where: { id_user: userId }, ...options });
    await this.repository.update(userId, {
      refresh_token: null,
      refresh_token_expires: null
    }, options);
  }
}

module.exports = UserService;
