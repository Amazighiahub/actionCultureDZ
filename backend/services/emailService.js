// services/EmailService.js - Service email refactorisé avec templates externes
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isPaused = process.env.EMAIL_PAUSED === 'true' || false;
    this.compiledTemplates = {}; // Cache pour les templates compilés
  }

  /**
   * Échappe les caractères HTML pour prévenir les injections XSS dans les emails.
   * @param {string} str - La chaîne à échapper.
   * @returns {string} La chaîne échappée.
   */
  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
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
      logger.info('✅ Service email prêt à envoyer.');
    } catch (error) {
      logger.error('❌ Erreur de configuration du service email:', error);
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
      logger.error(`❌ Erreur lors du chargement du template email "${templateName}":`, error);
      throw new Error(`Le template ${templateName} est introuvable.`);
    }
  }

  /**
   * Méthode d'envoi d'email principale et générique.
   */
  async sendEmail(to, subject, html, attachments = null) {
    // Protection contre l'injection CRLF dans les en-têtes email
    if (/[\r\n]/.test(to) || /[\r\n]/.test(subject)) {
      logger.error(`Tentative d'injection email détectée — to: ${to?.substring(0, 50)}`);
      return { success: false, error: 'Invalid email headers' };
    }

    if (this.isPaused) {
      logger.info(`\n📧 [SIMULATION] Envoi à: ${to} | Sujet: ${subject}`);
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
      logger.info(`✅ Email envoyé avec succès à ${to}. Message ID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error);
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
      logger.error("Erreur dans sendVerificationEmail:", error);
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
      logger.error("Erreur dans sendPasswordChangeEmail:", error);
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
            <p>Bonjour ${this._escapeHtml(user.prenom)},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
            <p><a href="${encodeURI(resetUrl)}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
            <p>Ce lien est valable pendant 2 heures.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            <p>L'équipe Action Culture</p>
          </div>
        `;
      }

      return await this.sendEmail(user.email, 'Réinitialisation de votre mot de passe', html);
    } catch (error) {
      logger.error("Erreur dans sendPasswordResetEmail:", error);
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
            <p>Bonjour ${this._escapeHtml(user.prenom)},</p>
            <p>Votre mot de passe a été modifié avec succès le ${new Date().toLocaleString('fr-FR')}.</p>
            <p>Si vous n'êtes pas à l'origine de cette modification, veuillez nous contacter immédiatement.</p>
            <p>L'équipe Action Culture</p>
          </div>
        `;
      }

      return await this.sendEmail(user.email, 'Votre mot de passe a été modifié', html);
    } catch (error) {
      logger.error("Erreur dans sendPasswordChangedEmail:", error);
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
          <p>Bonjour ${this._escapeHtml(user.prenom)},</p>
          <p>Une demande de changement d'adresse email a été effectuée sur votre compte.</p>
          <p><strong>Ancien email :</strong> ${this._escapeHtml(user.email)}</p>
          <p><strong>Nouvel email demandé :</strong> ${this._escapeHtml(newEmail)}</p>
          <p>Un email de confirmation a été envoyé à la nouvelle adresse.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, veuillez nous contacter immédiatement.</p>
          <p>L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(user.email, 'Demande de changement d\'email', html);
    } catch (error) {
      logger.error("Erreur dans sendEmailChangeNotification:", error);
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
          <p>Bonjour ${this._escapeHtml(user.prenom)},</p>
          <p>Pour confirmer que ${this._escapeHtml(newEmail)} est bien votre nouvelle adresse email, cliquez sur le lien ci-dessous :</p>
          <p><a href="${encodeURI(confirmUrl)}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Confirmer mon email</a></p>
          <p>Ce lien est valable pendant 24 heures.</p>
          <p>L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(newEmail, 'Confirmez votre nouvelle adresse email', html);
    } catch (error) {
      logger.error("Erreur dans sendEmailChangeConfirmation:", error);
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
      logger.error("Erreur dans sendEventRegistrationConfirmation:", error);
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

      const esc = this._escapeHtml.bind(this);
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Votre soumission a été ${statutText}</h2>
          <p>Bonjour ${esc(prenom)},</p>
          <p>L'organisateur de l'événement <strong>${esc(nomEvenement)}</strong> a examiné votre soumission.</p>
          <p style="font-size: 18px; color: ${statusColor}; font-weight: bold;">
            Statut : ${statutText.charAt(0).toUpperCase() + statutText.slice(1)}
          </p>
          ${message ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Message de l'organisateur :</strong></p>
              <p style="font-style: italic;">${esc(message)}</p>
            </div>
          ` : ''}
          <p><a href="${encodeURI(eventUrl)}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir l'événement</a></p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(
        email,
        `Soumission ${statutText} : ${nomEvenement}`,
        html
      );
    } catch (error) {
      logger.error("Erreur dans sendSubmissionValidationEmail:", error);
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
  /**
   * Notifier la validation/refus d'un professionnel pour un événement
   * @param {object} professionnel - L'utilisateur professionnel
   * @param {object} evenement - L'événement concerné
   * @param {string} statut - 'confirme' | 'refuse'
   * @param {string} notes - Notes optionnelles
   */
  async notifierValidationProfessionnel(professionnel, evenement, statut, notes = '') {
    try {
      const prenomStr = typeof professionnel.prenom === 'object' ? (professionnel.prenom.fr || professionnel.prenom.ar || '') : (professionnel.prenom || '');
      const nomEvenementStr = typeof evenement.nom_evenement === 'object' ? (evenement.nom_evenement.fr || evenement.nom_evenement.ar || '') : (evenement.nom_evenement || '');
      const statutText = statut === 'confirme' ? 'acceptée' : 'refusée';
      const statusColor = statut === 'confirme' ? '#27ae60' : '#e74c3c';
      const eventUrl = `${process.env.FRONTEND_URL}/evenements/${evenement.id_evenement}`;

      const esc = this._escapeHtml.bind(this);
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Participation ${statutText}</h2>
          <p>Bonjour ${esc(prenomStr)},</p>
          <p>Votre demande de participation à l'événement <strong>${esc(nomEvenementStr)}</strong> a été <strong style="color: ${statusColor};">${statutText}</strong>.</p>
          ${notes ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Message de l'organisateur :</strong></p>
              <p style="font-style: italic;">${esc(notes)}</p>
            </div>
          ` : ''}
          <p><a href="${encodeURI(eventUrl)}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir l'événement</a></p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
        </div>
      `;

      return await this.sendEmail(
        professionnel.email,
        `Participation ${statutText} : ${nomEvenementStr}`,
        html
      );
    } catch (error) {
      logger.error("Erreur dans notifierValidationProfessionnel:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notifier l'annulation d'un événement à tous les participants
   * @param {Array} participants - Liste des EvenementUser avec User inclus
   * @param {object} evenement - L'événement annulé
   * @param {string} raison - Raison de l'annulation
   * @returns {Array} Résultats d'envoi par participant
   */
  async notifierAnnulationEvenement(participants, evenement, raison) {
    const nomEvenementStr = typeof evenement.nom_evenement === 'object' ? (evenement.nom_evenement.fr || evenement.nom_evenement.ar || '') : (evenement.nom_evenement || '');

    const results = await Promise.all(participants.map(async (participant) => {
      try {
        const user = participant.User;
        const prenomStr = typeof user.prenom === 'object' ? (user.prenom.fr || user.prenom.ar || '') : (user.prenom || '');

        const esc = this._escapeHtml.bind(this);
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">⚠️ Événement annulé</h2>
            <p>Bonjour ${esc(prenomStr)},</p>
            <p>Nous sommes au regret de vous informer que l'événement <strong>${esc(nomEvenementStr)}</strong> a été annulé.</p>
            ${raison ? `
              <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Raison :</strong> ${esc(raison)}</p>
              </div>
            ` : ''}
            <p>Nous nous excusons pour la gêne occasionnée.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
          </div>
        `;

        const result = await this.sendEmail(user.email, `Événement annulé : ${nomEvenementStr}`, html);
        return { email: user.email, result };
      } catch (error) {
        logger.error(`Erreur envoi annulation à ${participant.User?.email}:`, error);
        return { email: participant.User?.email, result: { success: false, error: error.message } };
      }
    }));

    return results;
  }

  /**
   * Notifier la modification d'un programme aux participants
   * @param {Array} participants - Liste des EvenementUser avec User inclus
   * @param {object} evenement - L'événement concerné
   * @param {object} programme - Le programme modifié
   * @param {string} typeModification - 'general' | 'annule' | 'reporte' | 'nouveau'
   * @returns {Array} Résultats d'envoi par participant
   */
  async notifierModificationProgramme(participants, evenement, programme, typeModification = 'general') {
    const nomEvenementStr = typeof evenement.nom_evenement === 'object' ? (evenement.nom_evenement.fr || evenement.nom_evenement.ar || '') : (evenement.nom_evenement || '');
    const titreProgramme = typeof programme.titre === 'object' ? (programme.titre.fr || programme.titre.ar || '') : (programme.titre || '');

    const titres = {
      'general': 'Programme modifié',
      'annule': 'Programme annulé',
      'reporte': 'Programme reporté',
      'nouveau': 'Nouveau programme ajouté'
    };
    const sujet = titres[typeModification] || 'Programme modifié';

    const results = await Promise.all(participants.map(async (participant) => {
      try {
        const user = participant.User;
        const prenomStr = typeof user.prenom === 'object' ? (user.prenom.fr || user.prenom.ar || '') : (user.prenom || '');
        const eventUrl = `${process.env.FRONTEND_URL}/evenements/${evenement.id_evenement}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12;">📋 ${sujet}</h2>
            <p>Bonjour ${prenomStr},</p>
            <p>Le programme <strong>"${titreProgramme}"</strong> de l'événement <strong>${nomEvenementStr}</strong> a été modifié.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Type de modification :</strong> ${sujet}</p>
              ${programme.date_debut ? `<p><strong>Date :</strong> ${new Date(programme.date_debut).toLocaleDateString('fr-FR')}</p>` : ''}
              ${programme.heure_debut ? `<p><strong>Heure :</strong> ${programme.heure_debut}</p>` : ''}
            </div>
            <p><a href="${eventUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir les détails</a></p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
          </div>
        `;

        const result = await this.sendEmail(user.email, `${sujet} : ${nomEvenementStr}`, html);
        return { email: user.email, result };
      } catch (error) {
        logger.error(`Erreur envoi modification programme à ${participant.User?.email}:`, error);
        return { email: participant.User?.email, result: { success: false, error: error.message } };
      }
    }));

    return results;
  }

  /**
   * Notifier un nouvel événement aux utilisateurs intéressés
   * @param {Array} users - Liste des utilisateurs à notifier
   * @param {object} evenement - Le nouvel événement
   * @returns {Array} Résultats d'envoi par utilisateur
   */
  async notifierNouvelEvenement(users, evenement) {
    const nomEvenementStr = typeof evenement.nom_evenement === 'object' ? (evenement.nom_evenement.fr || evenement.nom_evenement.ar || '') : (evenement.nom_evenement || '');
    const descriptionStr = typeof evenement.description === 'object' ? (evenement.description.fr || evenement.description.ar || '') : (evenement.description || '');
    const eventUrl = `${process.env.FRONTEND_URL}/evenements/${evenement.id_evenement}`;

    const results = await Promise.all(users.map(async (user) => {
      try {
        const prenomStr = typeof user.prenom === 'object' ? (user.prenom.fr || user.prenom.ar || '') : (user.prenom || '');

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">🎉 Nouvel événement</h2>
            <p>Bonjour ${prenomStr},</p>
            <p>Un nouvel événement vient d'être publié : <strong>${nomEvenementStr}</strong></p>
            ${descriptionStr ? `<p>${descriptionStr.substring(0, 200)}${descriptionStr.length > 200 ? '...' : ''}</p>` : ''}
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${evenement.date_debut ? `<p><strong>📅 Date :</strong> ${new Date(evenement.date_debut).toLocaleDateString('fr-FR')}</p>` : ''}
              ${evenement.Lieu?.nom ? `<p><strong>📍 Lieu :</strong> ${typeof evenement.Lieu.nom === 'object' ? (evenement.Lieu.nom.fr || '') : evenement.Lieu.nom}</p>` : ''}
              ${evenement.TypeEvenement?.nom_type ? `<p><strong>🏷️ Type :</strong> ${evenement.TypeEvenement.nom_type}</p>` : ''}
            </div>
            <p><a href="${eventUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Découvrir l'événement</a></p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">L'équipe Action Culture</p>
          </div>
        `;

        const result = await this.sendEmail(user.email, `Nouvel événement : ${nomEvenementStr}`, html);
        return { email: user.email, result };
      } catch (error) {
        logger.error(`Erreur envoi nouvel événement à ${user.email}:`, error);
        return { email: user.email, result: { success: false, error: error.message } };
      }
    }));

    return results;
  }

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
      logger.error("Erreur dans sendEventReminder:", error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton: une seule instance du service pour toute l'application.
const emailService = new EmailService();
module.exports = emailService;