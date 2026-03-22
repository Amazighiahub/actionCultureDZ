/**
 * EmailVerificationController - Refactore avec BaseController + Service Pattern
 * Architecture: BaseController -> Controller -> Service -> Models/EmailService
 *
 * ZERO acces direct aux models Sequelize.
 * ZERO import de emailService.
 * Toute logique metier deleguee au EmailVerificationService via le container.
 */
const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class EmailVerificationController extends BaseController {
  get emailVerificationService() {
    return container.emailVerificationService;
  }

  // ============================================================================
  // ENVOI DE VERIFICATION
  // ============================================================================

  /**
   * Envoyer un email de verification
   */
  async sendVerificationEmail(req, res) {
    try {
      const userId = req.user?.id_user || req.body.userId;

      const data = await this.emailVerificationService.sendVerificationEmail(userId, req.ip);

      res.json({
        success: true,
        message: req.t('email.verificationSent'),
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // VERIFICATION DE TOKEN EMAIL
  // ============================================================================

  /**
   * Verifier un token d'email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const result = await this.emailVerificationService.verifyEmail(token, req.ip);

      res.json({
        success: true,
        message: result.message,
        data: { user: result.user }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  /**
   * Demander un reset de mot de passe
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const result = await this.emailVerificationService.requestPasswordReset(email, req.ip);

      // Toujours renvoyer la meme reponse (empeche l'enumeration de comptes)
      res.json({
        success: true,
        message: req.t('email.resetLinkSent'),
        data: { expiresIn: '2 heures' }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Verifier le token de reset et changer le mot de passe
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      const data = await this.emailVerificationService.resetPassword(token, newPassword, req.ip);

      res.json({
        success: true,
        message: req.t('auth.passwordChanged'),
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // EMAIL CHANGE
  // ============================================================================

  /**
   * Demander un changement d'email
   */
  async requestEmailChange(req, res) {
    try {
      const { newEmail, password } = req.body;
      const userId = req.user.id_user;

      const data = await this.emailVerificationService.requestEmailChange(
        userId, newEmail, password, req.ip
      );

      res.json({
        success: true,
        message: req.t('email.changeConfirmationSent'),
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Confirmer le changement d'email
   */
  async confirmEmailChange(req, res) {
    try {
      const { token } = req.params;

      const data = await this.emailVerificationService.confirmEmailChange(token, req.ip);

      res.json({
        success: true,
        message: req.t('email.changeSuccess'),
        data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  /**
   * Obtenir les statistiques des verifications
   */
  async getVerificationStats(req, res) {
    try {
      const stats = await this.emailVerificationService.getVerificationStats();

      this._sendSuccess(res, stats);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Nettoyer les tokens expires (admin only)
   */
  async cleanupTokens(req, res) {
    try {
      const count = await this.emailVerificationService.cleanupTokens();

      res.json({
        success: true,
        message: req.t ? req.t('dashboard.tokensCleared', { count }) : `${count} tokens cleaned`,
        data: { cleaned: count }
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }
}

module.exports = new EmailVerificationController();
