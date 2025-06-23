// services/EmailService.js - Service email amélioré avec templates
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.transporter = null;
    this.isPaused = process.env.EMAIL_PAUSED === 'true' || false;
    this.templates = {};
    
    if (!this.isPaused) {
      this.initializeTransporter();
    } else {
      console.log('📧 Service email en pause - mode simulation activé');
    }
    
    // Charger les templates au démarrage
    this.loadTemplates();
  }

  initializeTransporter() {
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }
    
    this.verifyConnection();
  }

  async verifyConnection() {
    if (this.isPaused) {
      console.log('📧 Service email en pause - vérification ignorée');
      return true;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Service email vérifié avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur de configuration email:', error);
      return false;
    }
  }

  // ========================================================================
  // MÉTHODE D'ENVOI PRINCIPALE
  // ========================================================================
async sendVerificationEmail(user, token) {
  const verificationUrl = `${process.env.BASE_URL}/verify-email/${token}`;
  
  const subject = '✉️ Vérifiez votre adresse email - Action Culture';
  const text = `
Bonjour ${user.prenom} ${user.nom},

Merci de vous être inscrit sur Action Culture !

Pour finaliser votre inscription, veuillez vérifier votre adresse email en cliquant sur le lien suivant :

${verificationUrl}

Ce lien est valable pendant 24 heures.

Si vous n'avez pas créé de compte sur Action Culture, ignorez cet email.

Cordialement,
L'équipe Action Culture
  `;

  const html = `
    <h2>✉️ Vérification de votre email</h2>
    <p>Bonjour ${user.prenom} ${user.nom},</p>
    <p>Cliquez sur le bouton ci-dessous pour vérifier votre email :</p>
    <a href="${verificationUrl}" style="
      display: inline-block;
      padding: 12px 24px;
      background-color: #2c3e50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    ">Vérifier mon email</a>
    <p><small>Ou copiez ce lien : ${verificationUrl}</small></p>
  `;

  return await this.sendEmail(user.email, subject, text, html);
}
  async sendEmail(to, subject, text, html = null, attachments = null) {
    // Mode pause - Simulation d'envoi
    if (this.isPaused) {
      console.log('\n📧 [SIMULATION] Email qui serait envoyé:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📬 Destinataire: ${to}`);
      console.log(`📋 Sujet: ${subject}`);
      console.log(`📝 Aperçu: ${text.substring(0, 150)}...`);
      if (attachments) {
        console.log(`📎 Pièces jointes: ${attachments.length} fichier(s)`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return { 
        success: true, 
        messageId: 'simulated-' + Date.now(), 
        paused: true,
        preview: { to, subject, text: text.substring(0, 150) }
      };
    }

    // Envoi réel
    try {
      const mailOptions = {
        from: `"Action Culture" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || this.textToHtml(text),
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email envoyé:', result.messageId);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // NOTIFICATIONS SPÉCIFIQUES
  // ========================================================================

  // 1. Validation/Refus d'un professionnel
  async notifierValidationProfessionnel(professionnel, evenement, statut, notes = '') {
    const estAccepte = statut === 'confirme';
    const subject = estAccepte 
      ? `✅ Votre participation à "${evenement.nom_evenement}" a été acceptée`
      : `❌ Votre participation à "${evenement.nom_evenement}" n'a pas été retenue`;

    const text = `
Bonjour ${professionnel.prenom} ${professionnel.nom},

${estAccepte 
  ? `Nous avons le plaisir de vous informer que votre demande de participation en tant que professionnel à l'événement "${evenement.nom_evenement}" a été acceptée.`
  : `Nous vous informons que votre demande de participation en tant que professionnel à l'événement "${evenement.nom_evenement}" n'a pas été retenue.`}

Détails de l'événement :
- Nom : ${evenement.nom_evenement}
- Date : ${this.formatDateRange(evenement.date_debut, evenement.date_fin)}
- Lieu : ${evenement.Lieu?.nom || 'À définir'}

${notes ? `\nMessage de l'organisateur :\n${notes}\n` : ''}

${estAccepte 
  ? `Prochaines étapes :
- Connectez-vous à votre espace professionnel
- Ajoutez vos œuvres liées à cet événement
- Consultez le programme détaillé

Nous sommes impatients de vous compter parmi les participants !`
  : `Nous vous encourageons à postuler à d'autres événements qui correspondent à votre profil.`}

Cordialement,
L'équipe Action Culture

---
Cet email a été envoyé automatiquement. Ne pas répondre directement à cette adresse.
Pour toute question : ${process.env.SUPPORT_EMAIL || 'support@actionculture.dz'}
    `;

    const html = this.generateHtmlTemplate('validation-professionnel', {
      professionnel,
      evenement,
      estAccepte,
      notes,
      dateRange: this.formatDateRange(evenement.date_debut, evenement.date_fin)
    });

    return await this.sendEmail(professionnel.email, subject, text, html);
  }

  // 2. Annulation d'événement
  async notifierAnnulationEvenement(participants, evenement, raison) {
    const subject = `⚠️ Annulation : "${evenement.nom_evenement}"`;
    
    // Préparer la liste des emails
    const emails = participants.map(p => p.User.email);
    
    const text = `
Bonjour,

Nous avons le regret de vous informer que l'événement "${evenement.nom_evenement}" a été annulé.

Détails de l'événement annulé :
- Nom : ${evenement.nom_evenement}
- Date prévue : ${this.formatDateRange(evenement.date_debut, evenement.date_fin)}
- Lieu : ${evenement.Lieu?.nom || 'À définir'}

${raison ? `\nRaison de l'annulation :\n${raison}\n` : ''}

Si vous aviez prévu de participer à cet événement, nous vous prions de nous excuser pour la gêne occasionnée.

Nous vous invitons à consulter nos autres événements culturels sur la plateforme Action Culture.

Cordialement,
L'équipe Action Culture

---
Pour plus d'informations : ${process.env.SUPPORT_EMAIL || 'support@actionculture.dz'}
    `;

    const html = this.generateHtmlTemplate('annulation-evenement', {
      evenement,
      raison,
      dateRange: this.formatDateRange(evenement.date_debut, evenement.date_fin)
    });

    // Envoyer à tous les participants
    const results = [];
    for (const email of emails) {
      const result = await this.sendEmail(email, subject, text, html);
      results.push({ email, result });
    }

    return results;
  }

  // 3. Modification du programme
  async notifierModificationProgramme(participants, evenement, programme, typeModification) {
    const subject = `📅 Modification du programme : "${evenement.nom_evenement}"`;
    
    const emails = participants.map(p => p.User.email);
    
    const modifications = {
      'horaire': 'Les horaires ont été modifiés',
      'lieu': 'Le lieu a été changé',
      'annule': 'Cette activité a été annulée',
      'reporte': 'Cette activité a été reportée',
      'nouveau': 'Une nouvelle activité a été ajoutée',
      'general': 'Le programme a été mis à jour'
    };

    const text = `
Bonjour,

Nous vous informons d'une modification dans le programme de l'événement "${evenement.nom_evenement}".

${modifications[typeModification] || modifications.general}

Activité concernée :
- Titre : ${programme.titre}
- Type : ${programme.type_activite || 'Non spécifié'}
${programme.heure_debut ? `- Nouvelle date/heure : ${this.formatDateTime(programme.heure_debut)}` : ''}
${programme.lieu_specifique ? `- Lieu : ${programme.lieu_specifique}` : ''}
${programme.description ? `\nDescription :\n${programme.description}\n` : ''}

Pour consulter le programme complet mis à jour, connectez-vous à votre compte Action Culture.

Nous vous prions de nous excuser pour tout désagrément causé par cette modification.

Cordialement,
L'équipe Action Culture

---
Gérer vos notifications : ${process.env.BASE_URL}/profil/notifications
    `;

    const html = this.generateHtmlTemplate('modification-programme', {
      evenement,
      programme,
      typeModification,
      modificationText: modifications[typeModification] || modifications.general
    });

    // Envoyer à tous les participants confirmés
    const results = [];
    for (const email of emails) {
      const result = await this.sendEmail(email, subject, text, html);
      results.push({ email, result });
    }

    return results;
  }

  // ========================================================================
  // AUTRES NOTIFICATIONS
  // ========================================================================

  async sendWelcomeEmail(user) {
    const subject = 'Bienvenue sur Action Culture ! 🎭';
    const text = `
Bonjour ${user.prenom} ${user.nom},

Bienvenue sur la plateforme Action Culture !

Votre compte a été créé avec succès en tant que ${this.getUserTypeLabel(user.type_user)}.

${user.type_user !== 'visiteur' 
  ? `En tant que professionnel, votre compte est en attente de validation par nos administrateurs. Vous serez notifié dès que votre compte sera validé.`
  : `Vous pouvez dès maintenant :
- Découvrir les œuvres culturelles
- Participer aux événements
- Enrichir votre expérience culturelle`}

Connectez-vous : ${process.env.BASE_URL}/login

Cordialement,
L'équipe Action Culture
    `;

    return await this.sendEmail(user.email, subject, text);
  }

  async notifierNouvelEvenement(users, evenement) {
    const subject = `🎉 Nouvel événement : ${evenement.nom_evenement}`;
    const emails = users.map(u => u.email);
    
    const text = `
Un nouvel événement culturel vient d'être ajouté !

${evenement.nom_evenement}
${evenement.description?.substring(0, 200)}...

📅 Date : ${this.formatDateRange(evenement.date_debut, evenement.date_fin)}
📍 Lieu : ${evenement.Lieu?.nom || 'À définir'}
🎫 Prix : ${evenement.prix_entree > 0 ? `${evenement.prix_entree} DA` : 'Gratuit'}

Inscrivez-vous dès maintenant : ${process.env.BASE_URL}/evenements/${evenement.id_evenement}

Ne manquez pas cet événement exceptionnel !

L'équipe Action Culture
    `;

    const results = [];
    for (const email of emails) {
      const result = await this.sendEmail(email, subject, text);
      results.push({ email, result });
    }

    return results;
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  formatDateTime(date) {
    if (!date) return 'Non définie';
    const d = new Date(date);
    return d.toLocaleString('fr-DZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateRange(dateDebut, dateFin) {
    if (!dateDebut) return 'Dates à définir';
    
    const debut = new Date(dateDebut);
    const fin = dateFin ? new Date(dateFin) : null;
    
    const formatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    if (!fin || debut.toDateString() === fin.toDateString()) {
      return debut.toLocaleDateString('fr-DZ', formatOptions);
    }
    
    return `Du ${debut.toLocaleDateString('fr-DZ', formatOptions)} au ${fin.toLocaleDateString('fr-DZ', formatOptions)}`;
  }

  getUserTypeLabel(type) {
    const types = {
      'visiteur': 'Visiteur',
      'ecrivain': 'Écrivain',
      'artiste': 'Artiste',
      'artisan': 'Artisan',
      'musicien': 'Musicien',
      'photographe': 'Photographe',
      'journaliste': 'Journaliste',
      'scientifique': 'Scientifique',
      'acteur': 'Acteur',
      'realisateur': 'Réalisateur',
      'danseur': 'Danseur',
      'sculpteur': 'Sculpteur'
    };
    return types[type] || type;
  }

  textToHtml(text) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Action Culture</h1>
    </div>
    <div class="content">
      ${text.replace(/\n/g, '<br>')}
    </div>
    <div class="footer">
      <p>© 2024 Action Culture - Plateforme culturelle algérienne</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  generateHtmlTemplate(templateName, data) {
    // Templates HTML simplifiés
    const templates = {
      'validation-professionnel': `
        <h2>${data.estAccepte ? '✅ Participation acceptée' : '❌ Participation refusée'}</h2>
        <p>Bonjour ${data.professionnel.prenom} ${data.professionnel.nom},</p>
        <p>${data.estAccepte 
          ? `Votre participation à l'événement <strong>${data.evenement.nom_evenement}</strong> a été acceptée.`
          : `Votre participation à l'événement <strong>${data.evenement.nom_evenement}</strong> n'a pas été retenue.`}
        </p>
        ${data.notes ? `<p><em>Message de l'organisateur : ${data.notes}</em></p>` : ''}
      `,
      
      'annulation-evenement': `
        <h2>⚠️ Événement annulé</h2>
        <p>L'événement <strong>${data.evenement.nom_evenement}</strong> a été annulé.</p>
        ${data.raison ? `<p><em>Raison : ${data.raison}</em></p>` : ''}
        <p>Dates prévues : ${data.dateRange}</p>
      `,
      
      'modification-programme': `
        <h2>📅 Programme modifié</h2>
        <p>${data.modificationText} pour l'événement <strong>${data.evenement.nom_evenement}</strong></p>
        <p>Activité : <strong>${data.programme.titre}</strong></p>
      `
    };

    return this.textToHtml(templates[templateName] || '');
  }

  async loadTemplates() {
    // Chargement des templates depuis des fichiers (si nécessaire)
    console.log('📄 Templates email chargés');
  }

  // Gestion de la pause
  pause() {
    this.isPaused = true;
    console.log('⏸️  Service email mis en pause');
  }

  resume() {
    this.isPaused = false;
    console.log('▶️  Service email repris');
    if (!this.transporter) {
      this.initializeTransporter();
    }
  }

  getStatus() {
    return {
      status: this.isPaused ? 'EN PAUSE' : 'ACTIF',
      mode: this.isPaused ? 'SIMULATION' : 'PRODUCTION'
    };
  }
}

// Singleton
const emailService = new EmailService();

module.exports = emailService;