// services/EmailService.js - Service email refactorisé avec templates externes
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isPaused = process.env.EMAIL_PAUSED === 'true' || false;
    this.compiledTemplates = {}; // Cache pour les templates compilés

    if (!this.isPaused) {
      this.initializeTransporter();
    } else {
      console.log('📧 Service email en pause - mode simulation activé.');
    }
  }

  /**
   * Initialise le transporteur Nodemailer.
   */
  initializeTransporter() {
    // Cette partie ne change pas.
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      // Configuration SMTP alternative
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    this.verifyConnection();
  }

  /**
   * Vérifie la connexion au serveur SMTP.
   */
  async verifyConnection() {
    if (this.isPaused || !this.transporter) return;
    try {
      await this.transporter.verify();
      console.log('✅ Service email prêt à envoyer.');
    } catch (error) {
      console.error('❌ Erreur de configuration du service email:', error);
    }
  }

  /**
   * Récupère, compile et met en cache un template HTML.
   * @param {string} templateName - Le nom du fichier de template (sans .html).
   * @returns {Function} - La fonction de template Handlebars compilée.
   */
  async getTemplate(templateName) {
    // Si le template est déjà compilé, on le retourne depuis le cache.
    if (this.compiledTemplates[templateName]) {
      return this.compiledTemplates[templateName];
    }

    try {
      const templatePath = path.join(__dirname, `../templates/emails/${templateName}.html`);
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      
      // Compilation et mise en cache.
      this.compiledTemplates[templateName] = handlebars.compile(templateSource);
      return this.compiledTemplates[templateName];
    } catch (error) {
      console.error(`❌ Erreur lors du chargement du template email "${templateName}":`, error);
      throw new Error(`Le template ${templateName} est introuvable.`);
    }
  }

  /**
   * Méthode d'envoi d'email principale et générique.
   */
  async sendEmail(to, subject, html, attachments = null) {
    if (this.isPaused) {
      console.log(`\n📧 [SIMULATION] Envoi à: ${to} | Sujet: ${subject}`);
      return { success: true, messageId: 'simulated-' + Date.now() };
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email envoyé avec succès à ${to}. Message ID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // MÉTHODES SPÉCIFIQUES UTILISANT LES TEMPLATES
  // ========================================================================

  /**
   * Envoie l'email de vérification de compte.
   * @param {object} user - L'objet utilisateur (doit contenir prenom, email).
   * @param {string} token - Le jeton de vérification.
   */
  async sendVerificationEmail(user, token) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
      
      const template = await this.getTemplate('user-verification');
      const html = template({
        prenom: user.prenom,
        verificationUrl: verificationUrl,
      });

      return await this.sendEmail(user.email, 'Vérifiez votre compte Action Culture', html);
    } catch (error) {
      console.error("Erreur dans sendVerificationEmail:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie l'email de confirmation de changement de mot de passe.
   * @param {object} user - L'objet utilisateur (doit contenir prenom, email).
   */
  async sendPasswordChangeEmail(user) {
    try {
      const template = await this.getTemplate('password-change');
      const html = template({
        prenom: user.prenom,
        email: user.email,
      });

      return await this.sendEmail(user.email, 'Confirmation de changement de mot de passe', html);
    } catch (error) {
      console.error("Erreur dans sendPasswordChangeEmail:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie l'email de réinitialisation de mot de passe.
   * @param {object} user - L'objet utilisateur
   * @param {string} token - Le jeton de réinitialisation
   */
  async sendPasswordResetEmail(user, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

      // Utiliser un template simple si le template dédié n'existe pas
      let html;
      try {
        const template = await this.getTemplate('password-reset');
        html = template({
          prenom: user.prenom,
          resetUrl: resetUrl,
        });
      } catch {
        // Template de secours
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Réinitialisation de mot de passe</h2>
            <p>Bonjour ${user.prenom},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
            <p><a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
            <p>Ce lien est valable pendant 2 heures.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            <p>L'équipe Action Culture</p>
          </div>
        `;
      }

      return await this.sendEmail(user.email, 'Réinitialisation de votre mot de passe', html);
    } catch (error) {
      console.error("Erreur dans sendPasswordResetEmail:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un email de confirmation après changement de mot de passe
   * @param {object} user - L'objet utilisateur
   */
  async sendPasswordChangedEmail(user) {
    try {
      let html;
      try {
        const template = await this.getTemplate('password-changed');
        html = template({
          prenom: user.prenom,
          email: user.email,
          date: new Date().toLocaleString('fr-FR')
        });
      } catch {
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Mot de passe modifié</h2>
            <p>Bonjour ${user.prenom},</p>
            <p>Votre mot de passe a été modifié avec succès le ${new Date().toLocaleString('fr-FR')}.</p>
            <p>Si vous n'êtes pas à l'origine de cette modification, veuillez nous contacter immédiatement.</p>
            <p>L'équipe Action Culture</p>
          </div>
        `;
      }

      return await this.sendEmail(user.email, 'Votre mot de passe a été modifié', html);
    } catch (error) {
      console.error("Erreur dans sendPasswordChangedEmail:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notifie l'utilisateur qu'une demande de changement d'email a été faite
   * @param {object} user - L'utilisateur actuel
   * @param {string} newEmail - Le nouvel email demandé
   */
  async sendEmailChangeNotification(user, newEmail) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Demande de changement d'email</h2>
          <p>Bonjour ${user.prenom},</p>
          <p>Une demande de changement d'adresse email a été effectuée sur votre compte.</p>
          <p><strong>Ancien email :</strong> ${user.email}</p>
          <p><strong>Nouvel email demandé :</strong> ${newEmail}</p>
          <p>Un email de confirmation a été envoyé à la nouvelle adresse.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, veuillez nous contacter immédiatement.</p>
          <p>L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(user.email, 'Demande de changement d\'email', html);
    } catch (error) {
      console.error("Erreur dans sendEmailChangeNotification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un email de confirmation au nouvel email
   * @param {string} newEmail - Le nouvel email
   * @param {object} user - L'utilisateur
   * @param {string} token - Le token de confirmation
   */
  async sendEmailChangeConfirmation(newEmail, user, token) {
    try {
      const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email-change/${token}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Confirmez votre nouvelle adresse email</h2>
          <p>Bonjour ${user.prenom},</p>
          <p>Pour confirmer que ${newEmail} est bien votre nouvelle adresse email, cliquez sur le lien ci-dessous :</p>
          <p><a href="${confirmUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Confirmer mon email</a></p>
          <p>Ce lien est valable pendant 24 heures.</p>
          <p>L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(newEmail, 'Confirmez votre nouvelle adresse email', html);
    } catch (error) {
      console.error("Erreur dans sendEmailChangeConfirmation:", error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // MÉTHODES POUR LES ÉVÉNEMENTS
  // ========================================================================

  /**
   * Envoie une confirmation d'inscription à un événement
   * @param {Object} params
   * @param {string} params.email - Email du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   * @param {string} params.dateDebut - Date de début
   * @param {string} [params.dateFin] - Date de fin
   * @param {string} [params.heureDebut] - Heure de début
   * @param {string} [params.heureFin] - Heure de fin
   * @param {string} [params.lieu] - Nom du lieu
   * @param {string} [params.adresse] - Adresse du lieu
   * @param {string} [params.typeEvenement] - Type d'événement
   * @param {number} [params.nombrePersonnes] - Nombre de personnes inscrites
   * @param {string} [params.reference] - Référence de l'inscription
   * @param {Array} [params.oeuvresSoumises] - Liste des œuvres soumises
   * @param {string} [params.qrCodeUrl] - URL du QR code
   * @param {string} params.eventUrl - URL de la page événement
   * @param {string} [params.calendarUrl] - URL pour ajouter au calendrier
   * @param {boolean} [params.isPaid] - Si l'événement est payant
   * @param {string} [params.montantTotal] - Montant total
   * @param {string} [params.paymentInstructions] - Instructions de paiement
   * @param {string} [params.contactEmail] - Email de contact de l'organisateur
   * @param {string} [params.contactTelephone] - Téléphone de contact
   */
  async sendEventRegistrationConfirmation(params) {
    try {
      const {
        email,
        prenom,
        nomEvenement,
        dateDebut,
        dateFin,
        heureDebut,
        heureFin,
        lieu,
        adresse,
        typeEvenement,
        nombrePersonnes,
        reference,
        oeuvresSoumises,
        qrCodeUrl,
        eventUrl,
        calendarUrl,
        isPaid,
        montantTotal,
        paymentInstructions,
        contactEmail,
        contactTelephone
      } = params;

      let html;
      try {
        const template = await this.getTemplate('event-registration-confirmation');
        html = template({
          prenom,
          nomEvenement,
          dateDebut,
          dateFin,
          heureDebut,
          heureFin,
          lieu,
          adresse,
          typeEvenement,
          nombrePersonnes,
          reference,
          oeuvresSoumises,
          nombreOeuvres: oeuvresSoumises?.length || 0,
          qrCodeUrl,
          eventUrl,
          calendarUrl,
          isPaid,
          montantTotal,
          paymentInstructions,
          contactEmail,
          contactTelephone
        });
      } catch {
        // Template de secours
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Inscription Confirmée ✓</h2>
            <p>Bonjour ${prenom},</p>
            <p>Votre inscription à l'événement <strong>${nomEvenement}</strong> a été confirmée !</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date :</strong> ${dateDebut}${dateFin ? ' - ' + dateFin : ''}</p>
              ${lieu ? `<p><strong>Lieu :</strong> ${lieu}</p>` : ''}
              ${adresse ? `<p><strong>Adresse :</strong> ${adresse}</p>` : ''}
              ${reference ? `<p><strong>Référence :</strong> ${reference}</p>` : ''}
            </div>
            ${oeuvresSoumises && oeuvresSoumises.length > 0 ? `
              <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>Vos œuvres soumises (${oeuvresSoumises.length})</h4>
                <ul>${oeuvresSoumises.map(o => `<li>${o.titre}</li>`).join('')}</ul>
              </div>
            ` : ''}
            <p><a href="${eventUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir l'événement</a></p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
          </div>
        `;
      }

      return await this.sendEmail(
        email,
        `Confirmation d'inscription : ${nomEvenement}`,
        html
      );
    } catch (error) {
      console.error("Erreur dans sendEventRegistrationConfirmation:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie une notification de validation/refus de soumission
   * @param {Object} params
   * @param {string} params.email - Email du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   * @param {string} params.statut - 'accepte' | 'refuse'
   * @param {string} [params.message] - Message personnalisé de l'organisateur
   * @param {string} params.eventUrl - URL de la page événement
   */
  async sendSubmissionValidationEmail(params) {
    try {
      const { email, prenom, nomEvenement, statut, message, eventUrl } = params;

      const statutText = statut === 'accepte' ? 'acceptée' : 'refusée';
      const statusColor = statut === 'accepte' ? '#27ae60' : '#e74c3c';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Votre soumission a été ${statutText}</h2>
          <p>Bonjour ${prenom},</p>
          <p>L'organisateur de l'événement <strong>${nomEvenement}</strong> a examiné votre soumission.</p>
          <p style="font-size: 18px; color: ${statusColor}; font-weight: bold;">
            Statut : ${statutText.charAt(0).toUpperCase() + statutText.slice(1)}
          </p>
          ${message ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Message de l'organisateur :</strong></p>
              <p style="font-style: italic;">${message}</p>
            </div>
          ` : ''}
          <p><a href="${eventUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir l'événement</a></p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(
        email,
        `Soumission ${statutText} : ${nomEvenement}`,
        html
      );
    } catch (error) {
      console.error("Erreur dans sendSubmissionValidationEmail:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un rappel d'événement
   * @param {Object} params
   * @param {string} params.email - Email du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   * @param {string} params.dateDebut - Date de l'événement
   * @param {string} params.heureDebut - Heure de début
   * @param {string} params.lieu - Lieu de l'événement
   * @param {string} params.eventUrl - URL de la page événement
   */
  async sendEventReminder(params) {
    try {
      const { email, prenom, nomEvenement, dateDebut, heureDebut, lieu, eventUrl } = params;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f39c12;">⏰ Rappel : Événement demain !</h2>
          <p>Bonjour ${prenom},</p>
          <p>Nous vous rappelons que l'événement <strong>${nomEvenement}</strong> aura lieu demain !</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📅 Date :</strong> ${dateDebut}</p>
            <p><strong>🕐 Heure :</strong> ${heureDebut}</p>
            ${lieu ? `<p><strong>📍 Lieu :</strong> ${lieu}</p>` : ''}
          </div>
          <p><a href="${eventUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir les détails</a></p>
          <p style="margin-top: 30px;">À demain !</p>
          <p style="font-size: 12px; color: #666;">L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(
        email,
        `Rappel : ${nomEvenement} - Demain !`,
        html
      );
    } catch (error) {
      console.error("Erreur dans sendEventReminder:", error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton: une seule instance du service pour toute l'application.
const emailService = new EmailService();
module.exports = emailService;