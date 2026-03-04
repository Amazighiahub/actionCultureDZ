/**
 * WhatsApp Service - Service d'envoi de messages WhatsApp
 * Utilise l'API Twilio WhatsApp Business ou Meta Cloud API
 *
 * Configuration via variables d'environnement :
 * - WHATSAPP_PROVIDER: 'twilio' | 'meta' | 'simulation'
 * - WHATSAPP_PAUSED: 'true' pour mode simulation forcé
 *
 * Pour Twilio WhatsApp:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_NUMBER (format: whatsapp:+14155238886)
 *
 * Pour Meta Cloud API:
 * - META_WHATSAPP_TOKEN
 * - META_WHATSAPP_PHONE_ID
 */

class WhatsAppService {
  constructor() {
    this.isPaused = process.env.WHATSAPP_PAUSED === 'true' || true;
    this.provider = process.env.WHATSAPP_PROVIDER || 'simulation';
    this.client = null;
    this.fromNumber = null;

    if (!this.isPaused && this.provider !== 'simulation') {
      this.initializeProvider();
    } else {
      console.log('💬 Service WhatsApp en pause - mode simulation activé.');
    }
  }

  /**
   * Initialise le provider WhatsApp
   */
  initializeProvider() {
    try {
      switch (this.provider) {
        case 'twilio':
          this.initializeTwilio();
          break;
        case 'meta':
          this.initializeMeta();
          break;
        default:
          console.log('💬 Service WhatsApp en mode simulation');
          this.isPaused = true;
      }
    } catch (error) {
      console.error('❌ Erreur initialisation WhatsApp service:', error);
      this.isPaused = true;
    }
  }

  /**
   * Initialise Twilio WhatsApp
   */
  initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

      if (!accountSid || !authToken) {
        throw new Error('Configuration Twilio incomplète');
      }

      const twilio = require('twilio');
      this.client = twilio(accountSid, authToken);
      console.log('✅ Service WhatsApp Twilio initialisé');
    } catch (error) {
      console.warn('⚠️ Twilio WhatsApp non configuré:', error.message);
      this.isPaused = true;
    }
  }

  /**
   * Initialise Meta Cloud API
   */
  initializeMeta() {
    try {
      this.metaToken = process.env.META_WHATSAPP_TOKEN;
      this.metaPhoneId = process.env.META_WHATSAPP_PHONE_ID;

      if (!this.metaToken || !this.metaPhoneId) {
        throw new Error('Configuration Meta WhatsApp incomplète');
      }

      console.log('✅ Service WhatsApp Meta Cloud API initialisé');
    } catch (error) {
      console.warn('⚠️ Meta WhatsApp non configuré:', error.message);
      this.isPaused = true;
    }
  }

  /**
   * Normalise un numéro pour WhatsApp
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '+213' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+213' + cleaned;
    }
    return cleaned;
  }

  /**
   * Envoie un message WhatsApp
   * @param {string} to - Numéro du destinataire
   * @param {string} message - Message à envoyer
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendMessage(to, message) {
    const normalizedTo = this.normalizePhoneNumber(to);

    if (!normalizedTo) {
      return { success: false, error: 'Numéro de téléphone invalide' };
    }

    // Mode simulation
    if (this.isPaused) {
      console.log(`\n💬 [WHATSAPP SIMULATION] Envoi à: ${normalizedTo}`);
      console.log(`💬 [WHATSAPP SIMULATION] Message: ${message}`);
      return { success: true, messageId: 'wa-simulated-' + Date.now() };
    }

    try {
      let result;

      switch (this.provider) {
        case 'twilio':
          result = await this.sendViaTwilio(normalizedTo, message);
          break;
        case 'meta':
          result = await this.sendViaMeta(normalizedTo, message);
          break;
        default:
          return { success: false, error: 'Provider WhatsApp non configuré' };
      }

      console.log(`✅ WhatsApp envoyé à ${normalizedTo}. ID: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error(`❌ Erreur envoi WhatsApp à ${normalizedTo}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie via Twilio WhatsApp
   */
  async sendViaTwilio(to, message) {
    const result = await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: `whatsapp:${to}`
    });
    return { success: true, messageId: result.sid };
  }

  /**
   * Envoie via Meta Cloud API
   */
  async sendViaMeta(to, message) {
    const fetch = require('node-fetch');
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.metaPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body: message }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erreur Meta WhatsApp API');
    }
    return { success: true, messageId: data.messages?.[0]?.id || 'meta-' + Date.now() };
  }

  // ========================================================================
  // MÉTHODES SPÉCIFIQUES POUR L'APPLICATION
  // ========================================================================

  /**
   * Confirmation d'inscription à un événement
   */
  async sendEventRegistrationConfirmation({ telephone, prenom, nomEvenement, dateEvenement, lieu }) {
    let message = `✅ *Inscription Confirmée*\n\nBonjour ${prenom},\nVotre inscription à *${nomEvenement}* est confirmée.\n\n📅 Date: ${dateEvenement}`;
    if (lieu) message += `\n📍 Lieu: ${lieu}`;
    message += `\n\n_Action Culture_`;

    return await this.sendMessage(telephone, message);
  }

  /**
   * Validation/refus de participation
   */
  async sendParticipationValidation({ telephone, prenom, nomEvenement, statut, notes }) {
    const statutText = statut === 'confirme' ? '✅ *Acceptée*' : '❌ *Refusée*';
    let message = `${statutText}\n\nBonjour ${prenom},\nVotre participation à *${nomEvenement}* a été ${statut === 'confirme' ? 'acceptée' : 'refusée'}.`;
    if (notes) message += `\n\n💬 _${notes}_`;
    message += `\n\n_Action Culture_`;

    return await this.sendMessage(telephone, message);
  }

  /**
   * Annulation d'événement
   */
  async sendEventCancellation({ telephone, prenom, nomEvenement, raison }) {
    let message = `⚠️ *Événement Annulé*\n\nBonjour ${prenom},\nL'événement *${nomEvenement}* a été annulé.`;
    if (raison) message += `\n\n📝 Raison: ${raison}`;
    message += `\n\nNous nous excusons pour ce désagrément.\n_Action Culture_`;

    return await this.sendMessage(telephone, message);
  }

  /**
   * Modification de programme
   */
  async sendProgrammeModification({ telephone, prenom, nomEvenement, titreProgramme, typeModification }) {
    const types = {
      'general': 'modifié',
      'annule': 'annulé',
      'reporte': 'reporté',
      'nouveau': 'ajouté'
    };
    const typeText = types[typeModification] || 'modifié';

    const message = `📋 *Programme ${typeText}*\n\nBonjour ${prenom},\nLe programme *"${titreProgramme}"* de l'événement *${nomEvenement}* a été ${typeText}.\n\nConnectez-vous pour voir les détails.\n_Action Culture_`;

    return await this.sendMessage(telephone, message);
  }

  /**
   * Rappel d'événement
   */
  async sendEventReminder({ telephone, prenom, nomEvenement, dateEvenement, heureDebut }) {
    const message = `⏰ *Rappel*\n\nBonjour ${prenom},\nL'événement *${nomEvenement}* a lieu demain !\n\n📅 ${dateEvenement}\n🕐 ${heureDebut}\n\nÀ demain !\n_Action Culture_`;

    return await this.sendMessage(telephone, message);
  }

  /**
   * Nouvel événement
   */
  async sendNewEvent({ telephone, prenom, nomEvenement, dateEvenement, lieu }) {
    let message = `🎉 *Nouvel Événement*\n\nBonjour ${prenom},\nDécouvrez *${nomEvenement}* !\n\n📅 Date: ${dateEvenement}`;
    if (lieu) message += `\n📍 Lieu: ${lieu}`;
    message += `\n\nConnectez-vous pour en savoir plus.\n_Action Culture_`;

    return await this.sendMessage(telephone, message);
  }
}

// Singleton
const whatsappService = new WhatsAppService();
module.exports = whatsappService;
