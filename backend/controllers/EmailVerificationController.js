// controllers/EmailVerificationController.js
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

class EmailVerificationController {
  constructor(models) {
    this.models = models;
  }

  /**
   * Envoyer un email de vérification
   */
  async sendVerificationEmail(req, res) {
    try {
      const userId = req.user?.id_user || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'ID utilisateur requis'
        });
      }

      // Vérifier si l'utilisateur existe et n'est pas déjà vérifié
      const user = await this.models.User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      if (user.email_verifie) {
        return res.status(400).json({
          success: false,
          error: 'Email déjà vérifié'
        });
      }

      // Vérifier s'il y a déjà un token actif
      const hasActiveToken = await this.models.EmailVerification.hasActiveToken(
        userId, 
        'email_verification'
      );

      if (hasActiveToken) {
        return res.status(429).json({
          success: false,
          error: 'Un email de vérification a déjà été envoyé. Veuillez vérifier votre boîte mail ou réessayer plus tard.'
        });
      }

      // Créer un nouveau token
      const verification = await this.models.EmailVerification.createVerificationToken(
        userId,
        'email_verification',
        {},
        req.ip
      );

      // Envoyer l'email
      const emailResult = await emailService.sendVerificationEmail(user, verification.token);

      if (!emailResult.success) {
        // Si l'envoi échoue, supprimer le token
        await verification.destroy();
        
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de l\'envoi de l\'email'
        });
      }

      res.json({
        success: true,
        message: 'Email de vérification envoyé',
        data: {
          email: user.email,
          expiresIn: '24 heures'
        }
      });

    } catch (error) {
      console.error('Erreur envoi email vérification:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Vérifier un token d'email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token requis'
        });
      }

      // Vérifier le token
      const result = await this.models.EmailVerification.verifyToken(
        token,
        'email_verification',
        req.ip
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Token invalide'
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          user: {
            id_user: result.user.id_user,
            email: result.user.email,
            nom: result.user.nom,
            prenom: result.user.prenom
          }
        }
      });

    } catch (error) {
      console.error('Erreur vérification email:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification'
      });
    }
  }

  /**
   * Demander un reset de mot de passe
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email requis'
        });
      }

      // Trouver l'utilisateur
      const user = await this.models.User.findOne({
        where: { email }
      });

      // Ne pas révéler si l'email existe ou non (sécurité)
      if (!user) {
        return res.json({
          success: true,
          message: 'Si cet email existe dans notre système, vous recevrez un lien de réinitialisation.'
        });
      }

      // Vérifier s'il y a déjà un token actif
      const hasActiveToken = await this.models.EmailVerification.hasActiveToken(
        user.id_user,
        'password_reset'
      );

      if (hasActiveToken) {
        return res.status(429).json({
          success: false,
          error: 'Une demande de réinitialisation est déjà en cours. Veuillez vérifier votre email.'
        });
      }

      // Créer un token de reset
      const verification = await this.models.EmailVerification.createVerificationToken(
        user.id_user,
        'password_reset',
        {},
        req.ip
      );

      // Envoyer l'email
      await emailService.sendPasswordResetEmail(user, verification.token);

      res.json({
        success: true,
        message: 'Si cet email existe dans notre système, vous recevrez un lien de réinitialisation.',
        data: {
          expiresIn: '2 heures'
        }
      });

    } catch (error) {
      console.error('Erreur demande reset password:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Vérifier le token de reset et changer le mot de passe
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token et nouveau mot de passe requis'
        });
      }

      // Valider le mot de passe
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }

      // Vérifier le token
      const result = await this.models.EmailVerification.verifyToken(
        token,
        'password_reset',
        req.ip
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Token invalide'
        });
      }

      // Changer le mot de passe
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await result.user.update({
        password: hashedPassword,
        password_changed_at: new Date()
      });

      // Invalider tous les tokens de l'utilisateur
      await this.models.EmailVerification.invalidateUserTokens(result.user.id_user);

      // Envoyer un email de confirmation
      await emailService.sendPasswordChangedEmail(result.user);

      res.json({
        success: true,
        message: 'Mot de passe modifié avec succès',
        data: {
          email: result.user.email
        }
      });

    } catch (error) {
      console.error('Erreur reset password:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la réinitialisation'
      });
    }
  }

  /**
   * Demander un changement d'email
   */
  async requestEmailChange(req, res) {
    try {
      const { newEmail, password } = req.body;
      const userId = req.user.id_user;

      if (!newEmail || !password) {
        return res.status(400).json({
          success: false,
          error: 'Nouvel email et mot de passe requis'
        });
      }

      // Vérifier le format de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Format d\'email invalide'
        });
      }

      // Récupérer l'utilisateur
      const user = await this.models.User.findByPk(userId);

      // Vérifier le mot de passe
      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Mot de passe incorrect'
        });
      }

      // Vérifier si l'email est déjà utilisé
      const emailExists = await this.models.User.findOne({
        where: { 
          email: newEmail,
          id_user: { [Op.ne]: userId }
        }
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'Cet email est déjà utilisé'
        });
      }

      // Créer un token avec le nouvel email
      const verification = await this.models.EmailVerification.createVerificationToken(
        userId,
        'email_change',
        { newEmail },
        req.ip
      );

      // Envoyer les emails
      await Promise.all([
        // Email à l'ancienne adresse
        emailService.sendEmailChangeNotification(user, newEmail),
        // Email à la nouvelle adresse
        emailService.sendEmailChangeConfirmation(newEmail, user, verification.token)
      ]);

      res.json({
        success: true,
        message: 'Emails de confirmation envoyés aux deux adresses',
        data: {
          currentEmail: user.email,
          newEmail,
          expiresIn: '24 heures'
        }
      });

    } catch (error) {
      console.error('Erreur changement email:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Confirmer le changement d'email
   */
  async confirmEmailChange(req, res) {
    try {
      const { token } = req.params;

      const result = await this.models.EmailVerification.verifyToken(
        token,
        'email_change',
        req.ip
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Token invalide'
        });
      }

      res.json({
        success: true,
        message: 'Email mis à jour avec succès',
        data: {
          newEmail: result.user.email
        }
      });

    } catch (error) {
      console.error('Erreur confirmation changement email:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Obtenir les statistiques des vérifications
   */
  async getVerificationStats(req, res) {
    try {
      const stats = await this.models.EmailVerification.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur stats vérifications:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Nettoyer les tokens expirés (admin only)
   */
  async cleanupTokens(req, res) {
    try {
      const count = await this.models.EmailVerification.cleanExpiredTokens();

      res.json({
        success: true,
        message: `${count} tokens nettoyés`,
        data: { cleaned: count }
      });

    } catch (error) {
      console.error('Erreur nettoyage tokens:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }
}

module.exports = EmailVerificationController;