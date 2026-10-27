// services/NotificationService.js - Orchestrateur des notifications
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/maskPII');
const { buildUnsubscribeUrl, unsubscribeHeaders, withUnsubscribeFooter } = require('../utils/newsletterUnsubscribe');
const emailService = require('./emailService');
const smsService = require('./smsService');
const whatsappService = require('./whatsappService');
const { Op } = require('sequelize');
const { getClient: getRedisClient } = require('../utils/redisClient');
const { translate, lireMultiLang } = require('../helpers/i18n');

class NotificationService {
  constructor(models, options = {}) {
    this.models = models;
    this.emailService = emailService;
    this.smsService = smsService;
    this.whatsappService = whatsappService;
    this.repositories = options.repositories || {};
  }

  /** @returns {import('../repositories/notificationRepository')} */
  get notificationRepo() {
    return this.repositories.notification;
  }

  /** @returns {import('../repositories/userRepository')} */
  get userRepo() {
    return this.repositories.user;
  }

  // Texte d'un champ multilingue (français, sinon la langue remplie : arabe, tamazight…)
  _str(val) {
    return translate(lireMultiLang(val), 'fr');
  }

  /**
   * Envoie SMS + WhatsApp à un utilisateur si le téléphone est disponible
   * @param {object} user - Objet utilisateur avec telephone
   * @param {string} type - Type de notification ('validation', 'annulation', 'programme', 'rappel', 'nouvel_evenement')
   * @param {object} params - Paramètres spécifiques au type
   */
  async _envoyerSmsWhatsapp(user, type, params) {
    if (!user.telephone) return;

    const prenom = this._str(user.prenom);
    const baseParams = { telephone: user.telephone, prenom, ...params };

    try {
      // SMS
      switch (type) {
        case 'validation':
          await this.smsService.sendSubmissionValidation(baseParams);
          break;
        case 'annulation':
          await this.smsService.sendEventCancellation(baseParams);
          break;
        case 'rappel':
          await this.smsService.sendEventReminder(baseParams);
          break;
        case 'inscription':
          await this.smsService.sendEventRegistrationConfirmation(baseParams);
          break;
      }
    } catch (err) {
      logger.error(`⚠️ Erreur SMS (${type}):`, err.message);
    }

    try {
      // WhatsApp
      switch (type) {
        case 'validation':
          await this.whatsappService.sendParticipationValidation(baseParams);
          break;
        case 'annulation':
          await this.whatsappService.sendEventCancellation(baseParams);
          break;
        case 'programme':
          await this.whatsappService.sendProgrammeModification(baseParams);
          break;
        case 'rappel':
          await this.whatsappService.sendEventReminder(baseParams);
          break;
        case 'inscription':
          await this.whatsappService.sendEventRegistrationConfirmation(baseParams);
          break;
        case 'nouvel_evenement':
          await this.whatsappService.sendNewEvent(baseParams);
          break;
      }
    } catch (err) {
      logger.error(`⚠️ Erreur WhatsApp (${type}):`, err.message);
    }
  }

  /**
   * Exécute asyncFn sur les items en batches pour éviter de saturer le serveur SMTP.
   * @param {Array} items
   * @param {Function} asyncFn - reçoit un item, retourne une Promise
   * @param {number} batchSize
   * @param {number} delayMs - pause entre batches (ms)
   */
  async _sendBatch(items, asyncFn, batchSize = 10, delayMs = 200) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(item => asyncFn(item).catch(err => ({ error: err.message }))));
      results.push(...batchResults);
      if (i + batchSize < items.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return results;
  }

  // ========================================================================
  // NOTIFICATIONS ÉVÉNEMENTS
  // ========================================================================

  // Notifier la validation/refus d'un professionnel pour un événement
  async notifierValidationParticipation(evenementId, userId, statut, notes = '') {
    try {
      logger.info(`📧 Notification validation participation: Event ${evenementId}, User ${userId}, Statut ${statut}`);

      // Récupérer les informations nécessaires
      const [professionnel, evenement] = await Promise.all([
        this.models.User.findByPk(userId, {
          attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone', 'id_type_user']
        }),
        this.models.Evenement.findByPk(evenementId, {
          include: [
            { model: this.models.Lieu, as: 'Lieu', attributes: ['nom'] },
            { model: this.models.TypeEvenement, as: 'TypeEvenement', attributes: ['nom_type'] }
          ]
        })
      ]);

      if (!professionnel || !evenement) {
        throw new Error('Utilisateur ou événement non trouvé');
      }

      // Envoyer l'email
      const result = await this.emailService.notifierValidationProfessionnel(
        professionnel,
        evenement,
        statut,
        notes
      );

      // SMS + WhatsApp
      await this._envoyerSmsWhatsapp(professionnel, 'validation', {
        nomEvenement: this._str(evenement.nom_evenement),
        statut,
        notes
      });

      // Enregistrer la notification dans la base
      await this.enregistrerNotification({
        id_user: userId,
        type_notification: 'validation_participation',
        titre: statut === 'confirme' ? 'Participation acceptée' : 'Participation refusée',
        message: `Votre participation à « ${this._str(evenement.nom_evenement)} » a été ${statut === 'confirme' ? 'acceptée' : 'refusée'}`,
        id_evenement: evenementId,
        email_envoye: result.success
      });

      return result;

    } catch (error) {
      logger.error('❌ Erreur notification validation:', error);
      throw error;
    }
  }

  /**
   * Rappel « c'est demain » aux participants confirmés (email, SMS / WhatsApp, notification).
   * Appelé par la tâche du matin pour les événements du lendemain ; une erreur remonte, pour
   * que l'événement ne soit pas marqué « rappel envoyé ».
   * @returns {Promise<{ envoyes: number }>}
   */
  async envoyerRappelEvenement(evenementId) {
    const evenement = await this.models.Evenement.findByPk(evenementId, {
      include: [{ model: this.models.Lieu, as: 'Lieu', attributes: ['nom', 'adresse'] }]
    });
    if (!evenement) throw new Error(`Événement ${evenementId} introuvable`);

    const nomEvenement = this._str(evenement.nom_evenement);
    const debut = new Date(evenement.date_debut);
    const enAlgerie = { timeZone: 'Africa/Algiers' };
    const dateDebut = debut.toLocaleDateString('fr-FR', { ...enAlgerie, weekday: 'long', day: 'numeric', month: 'long' });
    const heureDebut = debut.toLocaleTimeString('fr-FR', { ...enAlgerie, hour: '2-digit', minute: '2-digit' });
    const lieu = [this._str(evenement.Lieu?.nom), this._str(evenement.Lieu?.adresse)].filter(Boolean).join(', ');

    const participants = await this.models.EvenementUser.findAll({
      where: { id_evenement: evenementId, statut_participation: 'confirme' },
      include: [{
        model: this.models.User,
        as: 'User',
        attributes: ['id_user', 'email', 'nom', 'prenom', 'telephone'],
        where: { notifications_evenements: true }
      }]
    });

    const redis = getRedisClient();
    let envoyes = 0;
    await this._sendBatch(participants, async (participant) => {
      // Déduplication : éviter d'envoyer le rappel plusieurs fois si la tâche est relancée
      if (redis) {
        try {
          const dedupeKey = `notif:rappel:${evenementId}:${participant.id_user}`;
          const claimed = await redis.set(dedupeKey, '1', { NX: true, EX: 26 * 3600 });
          if (!claimed) return; // rappel déjà envoyé à ce participant
        } catch { /* si Redis indisponible, on continue sans déduplication */ }
      }

      await this.emailService.sendEventReminder({
        email: participant.User.email,
        prenom: this._str(participant.User.prenom),
        nomEvenement,
        dateDebut,
        heureDebut,
        lieu,
        eventUrl: `${process.env.FRONTEND_URL}/evenements/${evenementId}`
      });

      await this._envoyerSmsWhatsapp(participant.User, 'rappel', { nomEvenement, dateEvenement: dateDebut, heureDebut });

      await this.enregistrerNotification({
        id_user: participant.id_user,
        type_notification: 'rappel_evenement',
        titre: 'C’est demain !',
        message: `« ${nomEvenement} » a lieu demain, ${dateDebut} à ${heureDebut}${lieu ? ` — ${lieu}` : ''}.`,
        id_evenement: evenementId,
        url_action: `/evenements/${evenementId}`
      });
      envoyes++;
    });
    return { envoyes };
  }

  // Notifier l'annulation d'un événement
  async notifierAnnulationEvenement(evenementId, raison) {
    try {
      logger.info(`📧 Notification annulation événement: ${evenementId}`);

      // Récupérer l'événement et ses participants
      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.Lieu, as: 'Lieu' },
          { model: this.models.TypeEvenement, as: 'TypeEvenement' }
        ]
      });

      if (!evenement) {
        throw new Error('Événement non trouvé');
      }

      // Récupérer les participants ayant activé les notifications événements
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: evenementId,
          statut_participation: {
            [Op.in]: ['confirme', 'inscrit']
          }
        },
        include: [
          {
            model: this.models.User,
            as: 'User',
            attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone'],
            where: { notifications_evenements: true }
          }
        ]
      });

      if (participants.length === 0) {
        logger.info('ℹ️ Aucun participant à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierAnnulationEvenement(
        participants,
        evenement,
        raison
      );

      // SMS + WhatsApp pour chaque participant (en parallèle)
      await Promise.all(participants.map(participant =>
        this._envoyerSmsWhatsapp(participant.User, 'annulation', {
          nomEvenement: this._str(evenement.nom_evenement),
          raison
        })
      ));

      // Enregistrer les notifications (bulk)
      const notifications = participants.map(participant => ({
        id_user: participant.id_user,
        type_notification: 'annulation_evenement',
        titre: 'Événement annulé',
        message: `L'événement « ${this._str(evenement.nom_evenement)} » a été annulé`,
        id_evenement: evenementId,
        email_envoye: results.find(r => r.email === participant.User.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      logger.info(`✅ ${successCount}/${participants.length} participants notifiés`);

      return {
        success: true,
        notified: successCount,
        total: participants.length,
        results
      };

    } catch (error) {
      logger.error('❌ Erreur notification annulation:', error);
      throw error;
    }
  }

  // ========================================================================
  // NOTIFICATIONS PROGRAMMES
  // ========================================================================

  // Notifier la modification d'un programme
  async notifierModificationProgramme(programmeId, typeModification = 'general') {
    try {
      logger.info(`📧 Notification modification programme: ${programmeId}, Type: ${typeModification}`);

      // Récupérer le programme et l'événement
      const programme = await this.models.Programme.findByPk(programmeId, {
        include: [
          {
            model: this.models.Evenement,
            include: [
              { model: this.models.Lieu, as: 'Lieu' },
              { model: this.models.TypeEvenement, as: 'TypeEvenement' }
            ]
          }
        ]
      });

      if (!programme || !programme.Evenement) {
        throw new Error('Programme ou événement non trouvé');
      }

      // Récupérer les participants confirmés ayant activé les notifications
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: programme.id_evenement,
          statut_participation: 'confirme'
        },
        include: [
          {
            model: this.models.User,
            as: 'User',
            attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone'],
            where: { notifications_evenements: true }
          }
        ]
      });

      if (participants.length === 0) {
        logger.info('ℹ️ Aucun participant confirmé à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierModificationProgramme(
        participants,
        programme.Evenement,
        programme,
        typeModification
      );

      // SMS + WhatsApp pour chaque participant (en parallèle)
      await Promise.all(participants.map(participant =>
        this._envoyerSmsWhatsapp(participant.User, 'programme', {
          nomEvenement: this._str(programme.Evenement.nom_evenement),
          titreProgramme: this._str(programme.titre),
          typeModification
        })
      ));

      // Enregistrer les notifications
      const notifications = participants.map(participant => ({
        id_user: participant.id_user,
        type_notification: 'modification_programme',
        titre: 'Programme modifié',
        message: `Le programme de « ${this._str(programme.Evenement.nom_evenement)} » a été modifié`,
        id_evenement: programme.id_evenement,
        id_programme: programmeId,
        email_envoye: results.find(r => r.email === participant.User.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      logger.info(`✅ ${successCount}/${participants.length} participants notifiés`);

      return {
        success: true,
        notified: successCount,
        total: participants.length,
        results
      };

    } catch (error) {
      logger.error('❌ Erreur notification modification programme:', error);
      throw error;
    }
  }

  // ========================================================================
  // NOTIFICATIONS UTILISATEURS
  // ========================================================================

  // Notifier un nouvel événement aux utilisateurs intéressés
  async notifierNouvelEvenement(evenementId, filtres = {}) {
    try {
      logger.info(`📧 Notification nouvel événement: ${evenementId}`);

      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.Lieu, include: [{ model: this.models.Wilaya }] },
          { model: this.models.TypeEvenement, as: 'TypeEvenement' }
        ]
      });

      if (!evenement) {
        throw new Error('Événement non trouvé');
      }

      // Construire la requête pour les utilisateurs à notifier
      const whereClause = {
        statut: 'actif',
        notifications_evenements: true
      };

      // Filtrer par wilaya si l'événement a un lieu
      if (filtres.wilayaProximite && evenement.Lieu?.id_wilaya) {
        whereClause.wilaya_residence = evenement.Lieu.id_wilaya;
      }

      // Récupérer les utilisateurs à notifier
      const users = await this.models.User.findAll({
        where: whereClause,
        attributes: ['id_user', 'email', 'nom', 'prenom', 'telephone'],
        limit: filtres.limit || 100 // Limiter pour éviter trop d'envois
      });

      if (users.length === 0) {
        logger.info('ℹ️ Aucun utilisateur à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierNouvelEvenement(users, evenement);

      // SMS + WhatsApp pour chaque utilisateur
      const nomEvt = this._str(evenement.nom_evenement);
      const dateEvt = evenement.date_debut ? new Date(evenement.date_debut).toLocaleDateString('fr-FR') : '';
      const lieuEvt = evenement.Lieu ? this._str(evenement.Lieu.nom) : '';
      await Promise.all(users.map(user =>
        this._envoyerSmsWhatsapp(user, 'nouvel_evenement', {
          nomEvenement: nomEvt,
          dateEvenement: dateEvt,
          lieu: lieuEvt
        })
      ));

      // Enregistrer les notifications
      const notifications = users.map(user => ({
        id_user: user.id_user,
        type_notification: 'nouvel_evenement',
        titre: 'Nouvel événement',
        message: `Découvrez « ${this._str(evenement.nom_evenement)} »`,
        id_evenement: evenementId,
        email_envoye: results.find(r => r.email === user.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      logger.info(`✅ ${successCount}/${users.length} utilisateurs notifiés`);

      return {
        success: true,
        notified: successCount,
        total: users.length
      };

    } catch (error) {
      logger.error('❌ Erreur notification nouvel événement:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  // Enregistrer une notification dans la base
  async enregistrerNotification(data) {
    try {
      // Si vous avez une table Notification
      if (this.models.Notification) {
        await this.models.Notification.create({
          ...data,
          date_creation: new Date(),
          lu: false
        });
      }
      
      // Log de l'activité
      logger.info(`📝 Notification enregistrée: ${data.type_notification} pour user ${data.id_user}`);
      
    } catch (error) {
      logger.error('❌ Erreur enregistrement notification:', error);
      // Ne pas faire échouer l'envoi si l'enregistrement échoue
    }
  }

  // Enregistrer plusieurs notifications
  async enregistrerNotificationsMultiples(notifications) {
    try {
      if (this.models.Notification) {
        const notificationsAvecDate = notifications.map(n => ({
          ...n,
          date_creation: new Date(),
          lu: false
        }));
        
        await this.models.Notification.bulkCreate(notificationsAvecDate);
      }
      
      logger.info(`📝 ${notifications.length} notifications enregistrées`);
      
    } catch (error) {
      logger.error('❌ Erreur enregistrement notifications:', error);
    }
  }

  // ========================================================================
  // NOTIFICATIONS ADMIN DASHBOARD
  // ========================================================================

  /**
   * Récupère les notifications admin d'un utilisateur (dashboard)
   * Filtre sur les types admin/système/modération
   * @param {number} userId
   * @param {Object} options - { page, limit, unreadOnly }
   * @returns {Object} { items, pagination }
   */
  async getAdminNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    const where = {
      id_user: userId,
      type_notification: { [Op.in]: ['admin_alert', 'system_notification', 'moderation_required'] }
    };
    if (unreadOnly) where.lu = false;

    const result = await this.models.Notification?.findAndCountAll({
      where,
      order: [['date_creation', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    }) || { count: 0, rows: [] };

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pages = Math.ceil(result.count / parsedLimit);

    return {
      items: result.rows,
      pagination: {
        total: result.count, page: parsedPage, pages, limit: parsedLimit,
        hasNext: parsedPage < pages, hasPrev: parsedPage > 1
      }
    };
  }

  /**
   * Envoie une notification broadcast à un groupe d'utilisateurs (dashboard admin)
   * Batch par 100, filtre les préférences, crée un audit log
   * @param {Object} data - { title, message, target, type }
   * @param {number} adminId - ID de l'admin émetteur
   * @returns {Object} { total_users, notified, skipped, target, type, timestamp }
   */
  async broadcastNotification(data, adminId) {
    const { title, message, target, type = 'info' } = data;

    if (!title || !message) {
      throw new Error('MISSING_TITLE_OR_MESSAGE');
    }

    // Construire le filtre cible
    let whereClause = {};
    const TYPE_USER_IDS = require('../constants/typeUserIds').TYPE_USER_IDS;
    switch (target) {
      case 'professionals': whereClause = { id_type_user: { [Op.ne]: TYPE_USER_IDS.VISITEUR } }; break;
      case 'visitors': whereClause = { id_type_user: TYPE_USER_IDS.VISITEUR }; break;
      default: whereClause = {};
    }

    const targetWhere = { ...whereClause, statut: 'actif' };
    const totalTargetUsers = await this.models.User.count({ where: targetWhere });
    if (totalTargetUsers === 0) {
      throw new Error('NO_TARGET_USERS');
    }

    // Envoi par batch de 100
    const batchSize = 100;
    let offset = 0;
    let totalNotified = 0;
    let totalSkipped = 0;
    const destinatairesEmail = [];

    while (true) {
      const users = await this.models.User.findAll({
        where: targetWhere,
        // « preferences_notification » n'existe pas dans la table users : la requête échouait
        // et l'envoi à un groupe s'arrêtait en silence (ni notification, ni e-mail)
        attributes: ['id_user', 'email', 'notifications_email', 'notifications_evenements'],
        limit: batchSize, offset, raw: true
      });
      if (users.length === 0) break;

      // Notification sur le site pour tous ; l'e-mail respecte les choix (voir plus bas)
      const usersToNotify = users;

      if (usersToNotify.length > 0 && this.models.Notification) {
        const notifications = usersToNotify.map(user => ({
          id_user: user.id_user,
          type_notification: 'message_admin',
          titre: title,
          message,
          lu: false
        }));
        await this.models.Notification.bulkCreate(notifications, { validate: true, individualHooks: false });
        totalNotified += usersToNotify.length;
      }

      // E-mail si demandé : sauf à ceux qui ont refusé les e-mails ou les annonces (préférences,
      // ou lien « Ne plus recevoir ces annonces »)
      if (data.sendEmail !== false) {
        // Requête « raw » : MySQL renvoie 0 / 1 (et non false / true) pour un booléen
        const refuse = (v) => v === false || v === 0 || v === '0';
        for (const user of usersToNotify) {
          if (user.email && !refuse(user.notifications_email) && !refuse(user.notifications_evenements)) {
            destinatairesEmail.push({ id_user: user.id_user, email: user.email });
          }
        }
      }

      offset += batchSize;
      if (users.length < batchSize) break;
    }

    // Audit log
    if (this.models.AuditLog) {
      await this.models.AuditLog.create({
        id_admin: adminId, action: 'BROADCAST_NOTIFICATION', type_entite: 'notification',
        details: JSON.stringify({ title, target, recipients_count: totalNotified }),
        date_action: new Date()
      });
    }

    // Les e-mails partent un par un, en arrière-plan : envoyés tous en même temps, une partie
    // était refusée par la messagerie sans que personne ne le voie
    if (destinatairesEmail.length > 0) {
      this._envoyerAnnonceParEmail(destinatairesEmail, { title, message })
        .catch(err => logger.error('Envoi des e-mails d’annonce interrompu:', err.message));
    }

    return {
      total_users: totalTargetUsers, notified: totalNotified,
      skipped: totalSkipped, emails: destinatairesEmail.length,
      // L'administration voit si les e-mails partent vraiment (en pause, ils sont seulement simulés)
      email_etat: typeof this.emailService.etatEnvoi === 'function' ? this.emailService.etatEnvoi() : 'actif',
      target, type, timestamp: new Date()
    };
  }

  /**
   * E-mail d'une annonce (titre + message en texte) : texte échappé, liens cliquables,
   * lien « Ne plus recevoir ces annonces ». Envoi un par un avec une courte pause.
   * @returns {Promise<{ envoyes: number, echecs: number }>}
   */
  async _envoyerAnnonceParEmail(destinataires, { title, message }, { pauseMs = 300 } = {}) {
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const avecLiens = (texte) => esc(texte).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}" style="color:#6b6b2e">${url}</a>`);
    const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#1a1a1a">${esc(title)}</h2>
            <p style="color:#444;line-height:1.6;white-space:pre-wrap">${avecLiens(message)}</p>
            <p style="color:#999;font-size:12px;margin-top:24px">Tala DZ — taladz.com</p>
          </div>`;
    let envoyes = 0;
    let echecs = 0;
    let derniereErreur = null;
    for (const [index, user] of destinataires.entries()) {
      const url = buildUnsubscribeUrl(user.id_user, 'annonces');
      try {
        const res = await this.emailService.sendEmail(
          user.email, title, withUnsubscribeFooter(html, url, 'annonces'), null,
          `${title}\n\n${message}\n\n--\nTala DZ — taladz.com\nNe plus recevoir ces annonces : ${url}`,
          { headers: unsubscribeHeaders(url) }
        );
        if (res && res.success === false) {
          echecs++;
          derniereErreur = res.error || null;
          logger.warn(`E-mail d’annonce non envoyé à ${maskEmail(user.email)}: ${res.error}`);
        } else {
          envoyes++;
        }
      } catch (err) {
        echecs++;
        derniereErreur = err.message;
        logger.warn(`E-mail d’annonce non envoyé à ${maskEmail(user.email)}:`, err.message);
      }
      if (pauseMs && index < destinataires.length - 1) await new Promise(resolve => setTimeout(resolve, pauseMs));
    }
    logger.info(`Annonce « ${title} » : ${envoyes} e-mail(s) envoyé(s), ${echecs} échec(s)`);
    return { envoyes, echecs, erreur: derniereErreur };
  }

  /**
   * Message de l'administration à une seule personne : l'e-mail est envoyé tout de suite et le
   * résultat est renvoyé (envoyé, refusé avec la raison, en pause…) — c'est aussi le moyen de
   * vérifier que l'envoi d'e-mails fonctionne. Respecte le refus des e-mails.
   * @returns {Promise<{ etat: string, envoye: boolean, erreur?: string|null, raison?: string }>}
   */
  async envoyerEmailDirect(userId, { title, message }) {
    const etat = typeof this.emailService.etatEnvoi === 'function' ? this.emailService.etatEnvoi() : 'actif';
    const user = await this.models.User.findByPk(userId, { attributes: ['id_user', 'email', 'notifications_email'], raw: true });
    if (!user?.email) return { etat, envoye: false, raison: 'sans_email' };
    if (user.notifications_email === false || user.notifications_email === 0) return { etat, envoye: false, raison: 'refuse' };
    if (etat !== 'actif') return { etat, envoye: false, raison: etat };
    const res = await this._envoyerAnnonceParEmail([user], { title, message }, { pauseMs: 0 });
    return { etat, envoye: res.envoyes === 1, erreur: res.erreur };
  }
  // ========================================================================
  // MÉTHODES USER-FACING (appelées par NotificationController)
  // Délèguent au NotificationRepository — zéro Sequelize ici
  // ========================================================================

  /**
   * Notifications paginées d'un utilisateur avec relations
   */
  async getUserNotificationsPaginated(userId, { page, limit, unreadOnly, type } = {}) {
    return this.notificationRepo.findByUser(userId, { page, limit, unreadOnly, type });
  }

  /**
   * Nombre de notifications non lues
   */
  async getUnreadCount(userId) {
    return this.notificationRepo.countUnread(userId);
  }

  /**
   * Résumé des notifications (total, non lues, par type, dernières)
   */
  async getNotificationsSummary(userId) {
    return this.notificationRepo.getSummary(userId);
  }

  /**
   * Marquer une notification comme lue
   */
  async markOneAsRead(notificationId, userId) {
    const notification = await this.notificationRepo.findUserNotification(notificationId, userId);
    if (!notification) return null;
    await notification.marquerCommeLue();
    return notification;
  }

  /**
   * Marquer toutes les notifications comme lues (utilise méthode statique du model)
   */
  async markAllAsReadForUser(userId) {
    return this.models.Notification.marquerToutesLues(userId);
  }

  /**
   * Marquer plusieurs notifications comme lues
   */
  async markMultipleAsReadForUser(notificationIds, userId) {
    return this.notificationRepo.markMultipleAsRead(notificationIds, userId);
  }

  /**
   * Supprimer une notification
   */
  async deleteUserNotification(notificationId, userId) {
    const deleted = await this.notificationRepo.deleteUserNotification(notificationId, userId);
    return deleted;
  }

  /**
   * Supprimer toutes les notifications lues
   */
  async deleteReadNotificationsForUser(userId) {
    return this.notificationRepo.deleteReadByUser(userId);
  }

  /**
   * Récupérer les préférences de notification (via UserRepository)
   */
  async getUserPreferences(userId) {
    const user = await this.userRepo.findById(userId, {
      attributes: [
        'notifications_email', 'notifications_push', 'accepte_newsletter',
        'notifications_commentaires', 'notifications_favoris', 'notifications_evenements'
      ]
    });
    if (!user) return null;
    return {
      global: {
        email: user.notifications_email ?? true,
        push: user.notifications_push ?? true,
        // Consentement newsletter : même champ que celui utilisé pour l'envoi (défaut : non)
        newsletter: user.accepte_newsletter === true
      },
      types: {
        commentaires: user.notifications_commentaires ?? true,
        favoris: user.notifications_favoris ?? true,
        evenements: user.notifications_evenements ?? true
      }
    };
  }

  /**
   * Mettre à jour les préférences de notification
   */
  async updateUserPreferences(userId, { global, types } = {}) {
    const updates = {};
    if (global) {
      if (typeof global.email === 'boolean') updates.notifications_email = global.email;
      if (typeof global.push === 'boolean') updates.notifications_push = global.push;
      if (typeof global.newsletter === 'boolean') updates.accepte_newsletter = global.newsletter;
    }
    if (types) {
      if (typeof types.commentaires === 'boolean') updates.notifications_commentaires = types.commentaires;
      if (typeof types.favoris === 'boolean') updates.notifications_favoris = types.favoris;
      if (typeof types.evenements === 'boolean') updates.notifications_evenements = types.evenements;
    }
    return this.userRepo.updateMany({ id_user: userId }, updates);
  }

  /**
   * Envoyer une notification ciblée (admin → utilisateur)
   */
  async sendToUser(destinataireId, { titre, message, type_notification, url_action, priorite, metadata } = {}) {
    const destinataire = await this.userRepo.findById(destinataireId);
    if (!destinataire) return null;

    const notification = await this.notificationRepo.create({
      id_user: destinataireId,
      type_notification: type_notification || 'message_admin',
      titre,
      message,
      url_action: url_action || null,
      priorite: priorite || 'normale',
      metadata: metadata || null,
      lu: false,
      email_envoye: false
    });
    return notification;
  }

  /**
   * Broadcast — envoie une notification à tous les utilisateurs actifs par lots
   */
  async broadcastToAllActive({ titre, message, type_notification, priorite, metadata } = {}) {
    const batchSize = 100;
    let offset = 0;
    let totalSent = 0;

    while (true) {
      const users = await this.models.User.findAll({
        where: { statut: 'actif' },
        attributes: ['id_user'],
        limit: batchSize,
        offset,
        raw: true
      });

      if (users.length === 0) break;

      const notifications = users.map(user => ({
        id_user: user.id_user,
        type_notification: type_notification || 'message_admin',
        titre,
        message,
        priorite: priorite || 'normale',
        metadata: metadata || null,
        lu: false,
        email_envoye: false
      }));

      await this.notificationRepo.bulkCreate(notifications);
      totalSent += users.length;
      offset += batchSize;

      if (users.length < batchSize) break;
    }

    return totalSent;
  }
}

module.exports = NotificationService;