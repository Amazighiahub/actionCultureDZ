/**
 * EmailVerificationService - Service pour la verification d'email
 * Architecture: Controller -> Service -> Models/EmailService
 *
 * Encapsule toute la logique metier et les acces Sequelize.
 * Le controller ne fait que deleguer et formater les reponses.
 */
const { Op } = require('sequelize');
const emailService = require('./emailService');

class EmailVerificationService {
  constructor(models) {
    this.models = models;
  }

  // ============================================================================
  // ENVOI DE VERIFICATION
  // ============================================================================

  /**
   * Envoie un email de verification a l'utilisateur
   * @param {number} userId
   * @param {string} ip - Adresse IP de la requete
   * @returns {Promise<{email: string, expiresIn: string}>}
   */
  async sendVerificationEmail(userId, ip) {
    if (!userId) {
      const err = new Error('userId is required');
      err.statusCode = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const user = await this.models.User.findByPk(userId);

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (user.email_verifie) {
      const err = new Error('Email already verified');
      err.statusCode = 400;
      err.code = 'ALREADY_VERIFIED';
      throw err;
    }

    const hasActive = await this.models.EmailVerification.hasActiveToken(
      userId,
      'email_verification'
    );

    if (hasActive) {
      const err = new Error('Verification already sent');
      err.statusCode = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const verification = await this.models.EmailVerification.createVerificationToken(
      userId,
      'email_verification',
      {},
      ip
    );

    const emailResult = await emailService.sendVerificationEmail(user, verification.token);

    if (!emailResult.success) {
      await verification.destroy();
      const err = new Error('Email send failed');
      err.statusCode = 500;
      err.code = 'EMAIL_SEND_ERROR';
      throw err;
    }

    return {
      email: user.email,
      expiresIn: '24 heures'
    };
  }

  // ============================================================================
  // VERIFICATION DE TOKEN EMAIL
  // ============================================================================

  /**
   * Verifie un token de verification d'email
   * @param {string} token
   * @param {string} ip
   * @returns {Promise<{user: object}>}
   */
  async verifyEmail(token, ip) {
    if (!token) {
      const err = new Error('Token is required');
      err.statusCode = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const result = await this.models.EmailVerification.verifyToken(
      token,
      'email_verification',
      ip
    );

    if (!result.success) {
      const err = new Error(result.error || 'Invalid token');
      err.statusCode = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    return {
      user: {
        id_user: result.user.id_user,
        email: result.user.email,
        nom: result.user.nom,
        prenom: result.user.prenom
      },
      message: result.message
    };
  }

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  /**
   * Demande un reset de mot de passe
   * @param {string} email
   * @param {string} ip
   * @returns {Promise<{expiresIn: string}>}
   */
  async requestPasswordReset(email, ip) {
    if (!email) {
      const err = new Error('Email is required');
      err.statusCode = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const user = await this.models.User.findOne({ where: { email } });

    // Ne pas reveler si l'email existe ou non (securite)
    if (!user) {
      return { userNotFound: true };
    }

    const hasActive = await this.models.EmailVerification.hasActiveToken(
      user.id_user,
      'password_reset'
    );

    if (hasActive) {
      const err = new Error('Reset already sent');
      err.statusCode = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const verification = await this.models.EmailVerification.createVerificationToken(
      user.id_user,
      'password_reset',
      {},
      ip
    );

    await emailService.sendPasswordResetEmail(user, verification.token);

    return { expiresIn: '2 heures' };
  }

  /**
   * Verifie le token de reset et change le mot de passe
   * @param {string} token
   * @param {string} newPassword
   * @param {string} ip
   * @returns {Promise<{email: string}>}
   */
  async resetPassword(token, newPassword, ip) {
    if (!token || !newPassword) {
      const err = new Error('Token and new password are required');
      err.statusCode = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    // Validation du mot de passe
    if (newPassword.length < 12) {
      const err = new Error('Password too short');
      err.statusCode = 400;
      err.code = 'PASSWORD_MIN_LENGTH';
      throw err;
    }
    if (!/[a-z]/.test(newPassword)) {
      const err = new Error('Password must contain lowercase');
      err.statusCode = 400;
      err.code = 'PASSWORD_LOWERCASE';
      throw err;
    }
    if (!/[A-Z]/.test(newPassword)) {
      const err = new Error('Password must contain uppercase');
      err.statusCode = 400;
      err.code = 'PASSWORD_UPPERCASE';
      throw err;
    }
    if (!/[0-9]/.test(newPassword)) {
      const err = new Error('Password must contain digit');
      err.statusCode = 400;
      err.code = 'PASSWORD_DIGIT';
      throw err;
    }

    const result = await this.models.EmailVerification.verifyToken(
      token,
      'password_reset',
      ip
    );

    if (!result.success) {
      const err = new Error(result.error || 'Invalid token');
      err.statusCode = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    const bcrypt = require('bcrypt');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, rounds);

    await result.user.update({
      password: hashedPassword,
      password_changed_at: new Date()
    });

    await this.models.EmailVerification.invalidateUserTokens(result.user.id_user);

    await emailService.sendPasswordChangedEmail(result.user);

    return { email: result.user.email };
  }

  // ============================================================================
  // EMAIL CHANGE
  // ============================================================================

  /**
   * Demande un changement d'email
   * @param {number} userId
   * @param {string} newEmail
   * @param {string} password
   * @param {string} ip
   * @returns {Promise<{currentEmail: string, newEmail: string, expiresIn: string}>}
   */
  async requestEmailChange(userId, newEmail, password, ip) {
    if (!newEmail || !password) {
      const err = new Error('New email and password are required');
      err.statusCode = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      const err = new Error('Invalid email format');
      err.statusCode = 400;
      err.code = 'INVALID_EMAIL';
      throw err;
    }

    const user = await this.models.User.findByPk(userId);

    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      const err = new Error('Wrong password');
      err.statusCode = 401;
      err.code = 'WRONG_PASSWORD';
      throw err;
    }

    const emailExists = await this.models.User.findOne({
      where: {
        email: newEmail,
        id_user: { [Op.ne]: userId }
      }
    });

    if (emailExists) {
      const err = new Error('Email already used');
      err.statusCode = 409;
      err.code = 'EMAIL_CONFLICT';
      throw err;
    }

    const verification = await this.models.EmailVerification.createVerificationToken(
      userId,
      'email_change',
      { newEmail },
      ip
    );

    await Promise.all([
      emailService.sendEmailChangeNotification(user, newEmail),
      emailService.sendEmailChangeConfirmation(newEmail, user, verification.token)
    ]);

    return {
      currentEmail: user.email,
      newEmail,
      expiresIn: '24 heures'
    };
  }

  /**
   * Confirme le changement d'email
   * @param {string} token
   * @param {string} ip
   * @returns {Promise<{newEmail: string}>}
   */
  async confirmEmailChange(token, ip) {
    const result = await this.models.EmailVerification.verifyToken(
      token,
      'email_change',
      ip
    );

    if (!result.success) {
      const err = new Error(result.error || 'Invalid token');
      err.statusCode = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    return { newEmail: result.user.email };
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  /**
   * Obtient les statistiques de verification
   * @returns {Promise<object>}
   */
  async getVerificationStats() {
    return this.models.EmailVerification.getStats();
  }

  /**
   * Nettoie les tokens expires
   * @returns {Promise<number>} Nombre de tokens nettoyes
   */
  async cleanupTokens() {
    return this.models.EmailVerification.cleanExpiredTokens();
  }
}

module.exports = EmailVerificationService;
