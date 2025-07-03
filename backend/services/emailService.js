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
}

// Singleton: une seule instance du service pour toute l'application.
const emailService = new EmailService();
module.exports = emailService;