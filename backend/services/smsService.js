/**
 * SMS Service - Service d'envoi de SMS
 * Supporte plusieurs providers : Twilio, Nexmo/Vonage, MessageBird, ou simulation
 *
 * Configuration via variables d'environnement :
 * - SMS_PROVIDER: 'twilio' | 'vonage' | 'messagebird' | 'simulation'
 * - SMS_PAUSED: 'true' pour mode simulation forcé
 *
 * Pour Twilio:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 *
 * Pour Vonage:
 * - VONAGE_API_KEY
 * - VONAGE_API_SECRET
 * - VONAGE_PHONE_NUMBER
 */

class SMSService {
  constructor() {
    this.isPaused = process.env.SMS_PAUSED === 'true' || false;
    this.provider = process.env.SMS_PROVIDER || 'simulation';
    this.client = null;
    this.fromNumber = null;

    if (!this.isPaused) {
      this.initializeProvider();
    } else {
      console.log('📱 Service SMS en pause - mode simulation activé.');
    }
  }

  /**
   * Initialise le provider SMS selon la configuration
   */
  initializeProvider() {
    try {
      switch (this.provider) {
        case 'twilio':
          this.initializeTwilio();
          break;
        case 'vonage':
          this.initializeVonage();
          break;
        case 'messagebird':
          this.initializeMessageBird();
          break;
        default:
          console.log('📱 Service SMS en mode simulation (aucun provider configuré)');
          this.isPaused = true;
      }
    } catch (error) {
      console.error('❌ Erreur initialisation SMS service:', error);
      this.isPaused = true;
    }
  }

  /**
   * Initialise Twilio
   */
  initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !this.fromNumber) {
        throw new Error('Configuration Twilio incomplète');
      }

      // Import dynamique de Twilio
      const twilio = require('twilio');
      this.client = twilio(accountSid, authToken);
      console.log('✅ Service SMS Twilio initialisé');
    } catch (error) {
      console.warn('⚠️ Twilio non configuré:', error.message);
      this.isPaused = true;
    }
  }

  /**
   * Initialise Vonage (ex-Nexmo)
   */
  initializeVonage() {
    try {
      const apiKey = process.env.VONAGE_API_KEY;
      const apiSecret = process.env.VONAGE_API_SECRET;
      this.fromNumber = process.env.VONAGE_PHONE_NUMBER || 'ActionCulture';

      if (!apiKey || !apiSecret) {
        throw new Error('Configuration Vonage incomplète');
      }

      const { Vonage } = require('@vonage/server-sdk');
      this.client = new Vonage({
        apiKey,
        apiSecret
      });
      console.log('✅ Service SMS Vonage initialisé');
    } catch (error) {
      console.warn('⚠️ Vonage non configuré:', error.message);
      this.isPaused = true;
    }
  }

  /**
   * Initialise MessageBird
   */
  initializeMessageBird() {
    try {
      const apiKey = process.env.MESSAGEBIRD_API_KEY;
      this.fromNumber = process.env.MESSAGEBIRD_ORIGINATOR || 'ActionCulture';

      if (!apiKey) {
        throw new Error('Configuration MessageBird incomplète');
      }

      const messagebird = require('messagebird')(apiKey);
      this.client = messagebird;
      console.log('✅ Service SMS MessageBird initialisé');
    } catch (error) {
      console.warn('⚠️ MessageBird non configuré:', error.message);
      this.isPaused = true;
    }
  }

  /**
   * Normalise un numéro de téléphone au format international
   * @param {string} phoneNumber - Numéro à normaliser
   * @returns {string} - Numéro normalisé au format +XXX...
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    // Supprimer les espaces, tirets et parenthèses
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Si le numéro commence par 0 (format local algérien), ajouter +213
    if (cleaned.startsWith('0')) {
      cleaned = '+213' + cleaned.substring(1);
    }

    // Si le numéro ne commence pas par +, supposer format algérien
    if (!cleaned.startsWith('+')) {
      cleaned = '+213' + cleaned;
    }

    return cleaned;
  }

  /**
   * Valide un numéro de téléphone
   * @param {string} phoneNumber - Numéro à valider
   * @returns {boolean}
   */
  isValidPhoneNumber(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    if (!normalized) return false;

    // Vérifier le format international (minimum 10 chiffres après le +)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(normalized);
  }

  /**
   * Envoie un SMS
   * @param {string} to - Numéro du destinataire
   * @param {string} message - Message à envoyer (max 160 caractères standard)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendSMS(to, message) {
    const normalizedTo = this.normalizePhoneNumber(to);

    // Validation du numéro
    if (!this.isValidPhoneNumber(normalizedTo)) {
      console.error(`❌ Numéro de téléphone invalide: ${to}`);
      return { success: false, error: 'Numéro de téléphone invalide' };
    }

    // Mode simulation
    if (this.isPaused) {
      console.log(`\n📱 [SMS SIMULATION] Envoi à: ${normalizedTo}`);
      console.log(`📱 [SMS SIMULATION] Message: ${message}`);
      console.log(`📱 [SMS SIMULATION] Longueur: ${message.length} caractères\n`);
      return { success: true, messageId: 'simulated-' + Date.now() };
    }

    try {
      let result;

      switch (this.provider) {
        case 'twilio':
          result = await this.sendViaTwilio(normalizedTo, message);
          break;
        case 'vonage':
          result = await this.sendViaVonage(normalizedTo, message);
          break;
        case 'messagebird':
          result = await this.sendViaMessageBird(normalizedTo, message);
          break;
        default:
          return { success: false, error: 'Provider SMS non configuré' };
      }

      console.log(`✅ SMS envoyé à ${normalizedTo}. ID: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error(`❌ Erreur envoi SMS à ${normalizedTo}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie via Twilio
   */
  async sendViaTwilio(to, message) {
    const result = await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: to
    });
    return { success: true, messageId: result.sid };
  }

  /**
   * Envoie via Vonage
   */
  async sendViaVonage(to, message) {
    return new Promise((resolve, reject) => {
      this.client.sms.send({
        from: this.fromNumber,
        to: to.replace('+', ''), // Vonage sans le +
        text: message
      }, (err, responseData) => {
        if (err) {
          reject(err);
        } else {
          if (responseData.messages[0].status === '0') {
            resolve({
              success: true,
              messageId: responseData.messages[0]['message-id']
            });
          } else {
            reject(new Error(responseData.messages[0]['error-text']));
          }
        }
      });
    });
  }

  /**
   * Envoie via MessageBird
   */
  async sendViaMessageBird(to, message) {
    return new Promise((resolve, reject) => {
      this.client.messages.create({
        originator: this.fromNumber,
        recipients: [to],
        body: message
      }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            messageId: response.id
          });
        }
      });
    });
  }

  // ========================================================================
  // MÉTHODES SPÉCIFIQUES POUR L'APPLICATION
  // ========================================================================

  /**
   * Envoie une confirmation d'inscription à un événement
   * @param {Object} params
   * @param {string} params.telephone - Numéro du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   * @param {string} params.dateEvenement - Date de l'événement
   * @param {string} [params.lieu] - Lieu de l'événement
   * @param {string} [params.reference] - Référence de l'inscription
   */
  async sendEventRegistrationConfirmation({ telephone, prenom, nomEvenement, dateEvenement, lieu, reference }) {
    // Construire un message court (SMS standard 160 caractères)
    let message = `Bonjour ${prenom}! Inscription confirmée pour "${nomEvenement}" le ${dateEvenement}.`;

    if (lieu) {
      message += ` Lieu: ${lieu}.`;
    }

    if (reference) {
      message += ` Réf: ${reference}`;
    }

    // Tronquer si trop long
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    return await this.sendSMS(telephone, message);
  }

  /**
   * Envoie un rappel d'événement
   * @param {Object} params
   * @param {string} params.telephone - Numéro du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   * @param {string} params.dateEvenement - Date de l'événement
   * @param {string} params.heureDebut - Heure de début
   */
  async sendEventReminder({ telephone, prenom, nomEvenement, dateEvenement, heureDebut }) {
    const message = `Rappel: ${prenom}, l'événement "${nomEvenement}" a lieu demain (${dateEvenement}) à ${heureDebut}. À bientôt!`;
    return await this.sendSMS(telephone, message);
  }

  /**
   * Envoie une notification de validation de soumission
   * @param {Object} params
   * @param {string} params.telephone - Numéro du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   * @param {string} params.statut - 'accepte' | 'refuse'
   */
  async sendSubmissionValidation({ telephone, prenom, nomEvenement, statut }) {
    const statutText = statut === 'accepte'
      ? 'acceptée'
      : 'malheureusement refusée';

    const message = `Bonjour ${prenom}, votre soumission pour "${nomEvenement}" a été ${statutText}. Connectez-vous pour plus de détails.`;
    return await this.sendSMS(telephone, message);
  }

  /**
   * Envoie une notification d'annulation d'événement
   * @param {Object} params
   * @param {string} params.telephone - Numéro du destinataire
   * @param {string} params.prenom - Prénom du participant
   * @param {string} params.nomEvenement - Nom de l'événement
   */
  async sendEventCancellation({ telephone, prenom, nomEvenement }) {
    const message = `Info: ${prenom}, l'événement "${nomEvenement}" a été annulé. Nous vous prions de nous excuser pour ce désagrément.`;
    return await this.sendSMS(telephone, message);
  }

  /**
   * Envoie un code de vérification OTP
   * @param {string} telephone - Numéro du destinataire
   * @param {string} code - Code OTP à envoyer
   */
  async sendOTPCode(telephone, code) {
    const message = `Votre code de vérification Action Culture est: ${code}. Ce code expire dans 10 minutes.`;
    return await this.sendSMS(telephone, message);
  }
}

// Singleton: une seule instance du service pour toute l'application
const smsService = new SMSService();
module.exports = smsService;
