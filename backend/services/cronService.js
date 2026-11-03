// services/cronService.js - Service de tâches planifiées
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/maskPII');
const cron = require('node-cron');
const { Op } = require('sequelize');

// Événements publiés : « publie », ou « planifie » que le modèle pose à la publication d'un
// événement à venir (hook beforeValidate de models/events/evenement.js)
const STATUTS_PUBLIES = ['publie', 'planifie'];
const CronLock = require('../utils/cronLock');
const { pasTermine, termine } = require('../helpers/finEvenement');
const { translate, lireMultiLang } = require('../helpers/i18n');

const FUSEAU = 'Africa/Algiers';

/**
 * Début et fin de la journée de demain en Algérie (UTC+1, sans heure d'été), quel que soit
 * le fuseau du serveur (UTC dans Docker)
 */
function journeeDeDemain(maintenant = new Date()) {
  const [a, m, j] = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(maintenant).split('-').map(Number);
  const UNE_HEURE = 60 * 60 * 1000;
  const demain = new Date(Date.UTC(a, m - 1, j + 1) - UNE_HEURE);
  const apresdemain = new Date(Date.UTC(a, m - 1, j + 2) - UNE_HEURE);
  return { demain, apresdemain };
}

class CronService {
  constructor() {
    this.jobs = new Map();
    this.models = null;
    this.services = null;
    this.isRunning = false;
    this.cronLock = null;
  }

  /**
   * Initialiser le service avec les modèles et services
   */
  initialize(models, services) {
    this.models = models;
    this.services = services;

    // Verrou distribué pour multi-instance (PM2 cluster, Docker)
    const sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    if (sequelize) {
      this.cronLock = new CronLock(sequelize);
    }

    // Planifier toutes les tâches
    this.scheduleJobs();

    this.isRunning = true;
    logger.info('⏰ Service de tâches planifiées initialisé');
  }

  /**
   * Planifier toutes les tâches
   */
  scheduleJobs() {
    // 1. Rappels « c'est demain » - Tous les jours à 9 h, heure d'Algérie
    // Toutes les heures de 9 h à 20 h : un serveur redémarré ou une panne d'envoi à 9 h ne fait plus
    // manquer le rappel. Déjà envoyé : rappel_envoye et la clé par personne évitent tout doublon.
    this.scheduleJob('event-reminders', '0 9-20 * * *', () => this.sendEventReminders(), { timezone: FUSEAU });

    // 2. Nettoyage des tokens expirés - Tous les jours à 3h
    this.scheduleJob('clean-expired-tokens', '0 3 * * *', () => this.cleanExpiredTokens());

    // 3. Nettoyage des vieilles notifications - Tous les dimanches à 2h
    this.scheduleJob('clean-old-notifications', '0 2 * * 0', () => this.cleanOldNotifications());

    // 4. (Plus de calcul de statistiques quotidiennes : il comptait depuis minuit UTC et n'enregistrait
    // rien, la table DailyStats n'existant pas.)

    // 5. Newsletter hebdomadaire - Tous les lundis à 9h
    if (process.env.ENABLE_NEWSLETTER === 'true') {
      this.scheduleJob('weekly-newsletter', '0 9 * * 1', () => this.sendWeeklyNewsletter());
    }

    // 6. Vérification des événements à venir - Toutes les 30 minutes
    this.scheduleJob('upcoming-events-check', '*/30 * * * *', () => this.checkUpcomingEvents());

    // 7. Nettoyage des fichiers temporaires - Tous les jours à 4h
    this.scheduleJob('clean-temp-files', '0 4 * * *', () => this.cleanTempFiles());

    // 8. Mise à jour du statut des événements - Toutes les heures
    this.scheduleJob('update-event-status', '0 * * * *', () => this.updateEventStatuses());

    // 9. Rappel de vérification email - Tous les jours à 10h
    this.scheduleJob('email-verification-reminder', '0 10 * * *', () => this.sendEmailVerificationReminders());

    // 10. Archivage des anciens événements - Tous les mois le 1er à 2h
    // (Plus d'archivage des événements terminés depuis 6 mois : il écrivait un statut « archive »
    // absent des statuts d'événement et échouait chaque mois. Les événements passés restent
    // consultables dans « événements passés ».)

    // 11. RGPD : Purge des vues anciennes (>90 jours) - Tous les dimanches à 3h
    this.scheduleJob('clean-old-views', '0 3 * * 0', () => this.cleanOldViews());

    // 12. RGPD : adresses IP et navigateurs des journaux de sécurité et des scans de QR codes
    // effacés après 12 mois - Tous les dimanches à 4h
    this.scheduleJob('anonymize-old-logs', '0 4 * * 0', () => this.anonymizeOldLogs());

    logger.info(`📅 ${this.jobs.size} tâches planifiées activées`);
  }

  /**
   * Planifier une tâche
   */
  scheduleJob(name, cronExpression, taskFunction, options = {}) {
    if (this.jobs.has(name)) {
      logger.warn(`⚠️ Tâche "${name}" déjà planifiée`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      // Verrou distribué : une seule instance exécute le job
      const runTask = async () => {
        logger.info(`🔄 Exécution de la tâche: ${name}`);
        try {
          await taskFunction();
          logger.info(`✅ Tâche "${name}" complétée`);
        } catch (error) {
          logger.error(`❌ Erreur dans la tâche "${name}":`, error);
          // entity_id est un nombre : le nom de la tâche va dans details
          await this.models?.AuditLog?.create({
            action: 'cron_error',
            entity_type: 'cron_job',
            details: { tache: name, error: error.message, stack: error.stack }
          }).catch(err => logger.error(`Journal d'audit de la tâche "${name}" :`, err.message));
        }
      };

      if (this.cronLock) {
        await this.cronLock.withLock(name, runTask);
      } else {
        await runTask();
      }
    }, {
      scheduled: false, // Ne pas démarrer automatiquement
      // Heures d'Algérie pour toutes les tâches (avant : UTC, sauf les rappels — une heure de décalage)
      timezone: FUSEAU,
      ...options
    });

    this.jobs.set(name, job);
    job.start(); // Démarrer manuellement
  }

  // ========================================================================
  // TÂCHES SPÉCIFIQUES
  // ========================================================================

  /**
   * 1. Envoyer les rappels d'événements (24h avant)
   */
  async sendEventReminders() {
    if (!this.models || !this.services?.notificationService) return;

    const { demain, apresdemain } = journeeDeDemain();

    // Trouver les événements de demain
    const evenements = await this.models.Evenement.findAll({
      where: {
        date_debut: {
          [Op.gte]: demain,
          [Op.lt]: apresdemain
        },
        statut: STATUTS_PUBLIES,
        rappel_envoye: { [Op.not]: true } // Éviter les doublons
      },
      attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'id_lieu'],
      include: [
        { model: this.models.Lieu, as: 'Lieu', attributes: ['id_lieu', 'nom', 'adresse'] },
        { model: this.models.TypeEvenement, as: 'TypeEvenement', attributes: ['id_type_evenement', 'nom_type'] }
      ]
    });

    logger.info(`📧 ${evenements.length} événements à rappeler`);

    // Un événement après l'autre : chaque rappel envoie déjà ses emails par petits groupes
    for (const evenement of evenements) {
      try {
        const { envoyes, echecs = 0, reprise = false } = await this.services.notificationService.envoyerRappelEvenement(evenement.id_evenement);
        // Des échecs : pas marqué « envoyé », la prochaine heure réessaie ceux qui ne l'ont pas reçu
        if (!reprise) await evenement.update({ rappel_envoye: true });
        logger.info(`📧 Rappel de l'événement ${evenement.id_evenement} : ${envoyes} participant(s) prévenu(s), ${echecs} échec(s)`);
      } catch (error) {
        // Pas marqué « envoyé » : la tâche réessaiera à l'heure suivante
        logger.error(`Erreur rappel événement ${evenement.id_evenement}:`, error);
      }
    }
  }

  /**
   * 2. Nettoyer les tokens expirés
   */
  async cleanExpiredTokens() {
    await require('./newsletterAbonnes').purgerNonConfirmes(this.models);
    if (!this.models?.EmailVerification) return;

    const result = await this.models.EmailVerification.destroy({
      where: {
        [Op.or]: [
          {
            expires_at: {
              [Op.lt]: new Date()
            }
          },
          {
            used_at: {
              [Op.ne]: null
            }
          }
        ]
      }
    });

    logger.info(`🧹 ${result} tokens expirés supprimés`);
  }

  /**
   * 3. Nettoyer les vieilles notifications
   */
  async cleanOldNotifications() {
    if (!this.models?.Notification) return;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - (process.env.NOTIFICATION_RETENTION_DAYS || 90));

    // Lues ou non : la politique de confidentialité annonce 90 jours de conservation
    const result = await this._supprimerParLots(this.models.Notification, { date_creation: { [Op.lt]: dateLimit } });

    logger.info(`🧹 ${result} notifications anciennes supprimées`);
  }

  /**
   * Suppression par lots de 5 000 (comme anonymizeOldLogs) : un seul gros DELETE gardait la
   * table verrouillée longtemps et gonflait le journal d'annulation de MySQL.
   * @returns {Promise<number>} nombre de lignes supprimées
   */
  async _supprimerParLots(Model, where, taille = 5000) {
    let total = 0;
    for (;;) {
      const n = await Model.destroy({ where, limit: taille });
      total += n;
      if (n < taille) return total;
    }
  }

  /**
   * RGPD : Purger les vues de plus de 90 jours
   * Les vues contiennent ip_address, user_agent, referer — données personnelles
   */
  async cleanOldViews() {
    if (!this.models?.Vue) return;

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - (parseInt(process.env.VIEW_RETENTION_DAYS) || 90));

    const result = await this._supprimerParLots(this.models.Vue, { date_vue: { [Op.lt]: dateLimit } });

    logger.info(`🧹 ${result} vues anciennes supprimées (RGPD rétention ${process.env.VIEW_RETENTION_DAYS || 90}j)`);
  }

  /**
   * RGPD : après 12 mois (LOG_IP_RETENTION_MONTHS), l'adresse IP et le navigateur sont effacés des
   * journaux de sécurité (audit_logs) et des scans de QR codes (qr_scans) ; les lignes restent pour
   * l'historique et les statistiques. Par lots de 5 000 : pas de long verrou sur la table.
   */
  async anonymizeOldLogs() {
    const sequelize = this.models?.sequelize;
    if (!sequelize) return;
    const mois = parseInt(process.env.LOG_IP_RETENTION_MONTHS) || 12;
    const tables = [['audit_logs', 'date_action'], ['qr_scans', 'date_scan']];
    for (const [table, colonneDate] of tables) {
      let total = 0;
      for (;;) {
        const [res] = await sequelize.query(
          `UPDATE \`${table}\` SET ip_address = NULL, user_agent = NULL
           WHERE \`${colonneDate}\` < DATE_SUB(NOW(), INTERVAL :mois MONTH)
             AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
           LIMIT 5000`,
          { replacements: { mois } }
        );
        const n = res?.affectedRows ?? 0;
        total += n;
        if (n < 5000) break;
      }
      logger.info(`🧹 ${table} : adresse IP effacée sur ${total} ligne(s) de plus de ${mois} mois`);
    }
  }

  /**
   * 5. Envoyer la newsletter hebdomadaire
   */
  async sendWeeklyNewsletter() {
    if (!this.models || !this.services?.emailQueueService) return;

    // Récupérer le contenu de la semaine (avant la boucle — identique pour tous)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [newEvents, newOeuvres] = await Promise.all([
      this.models.Evenement.findAll({
        where: {
          date_creation: { [Op.gte]: lastWeek },
          statut: STATUTS_PUBLIES
        },
        attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_creation'],
        limit: 5,
        order: [['date_creation', 'DESC']]
      }),
      this.models.Oeuvre?.findAll({
        where: {
          date_creation: { [Op.gte]: lastWeek },
          statut: 'publie'
        },
        attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre', 'date_creation'],
        limit: 5,
        order: [['date_creation', 'DESC']]
      }) || []
    ]);

    if (newEvents.length === 0 && newOeuvres.length === 0) {
      logger.info('📮 Newsletter non envoyée : rien de nouveau cette semaine');
      return;
    }

    const { buildUnsubscribeUrl, unsubscribeHeaders, withUnsubscribeFooter } = require('../utils/newsletterUnsubscribe');
    // {{unsubscribe_url}} est remplacé par le lien signé propre à chaque destinataire
    const template = {
      subject: 'Les nouveautés de la semaine sur Tala DZ',
      text: `Découvrez les nouveautés de la semaine sur Tala DZ : ${process.env.FRONTEND_URL || 'https://taladz.com'}`,
      html: withUnsubscribeFooter(this.generateNewsletterHtml(newEvents, newOeuvres), '{{unsubscribe_url}}'),
      headers: unsubscribeHeaders('{{unsubscribe_url}}')
    };

    // Pagination par batch pour éviter OOM sur grande base d'abonnés
    const BATCH_SIZE = 500;
    let offset = 0;
    let totalSent = 0;
    const newsletterWhere = { accepte_newsletter: true, statut: 'actif', email_verifie: true };
    // Part du quota du jour qui ne sert pas aux e-mails importants
    let budget = await require('./quotaEmail').budgetEnvoiGroupe();

    while (budget > 0) {
      const users = await this.models.User.findAll({
        where: newsletterWhere,
        attributes: ['id_user', 'email', 'nom', 'prenom'],
        order: [['id_user', 'ASC']],
        limit: Math.min(BATCH_SIZE, budget),
        offset
      });

      if (users.length === 0) break;
      budget -= users.length;

      const emails = users.map(user => ({
        to: user.email,
        data: { nom: user.nom, prenom: user.prenom, unsubscribe_url: buildUnsubscribeUrl(user.id_user) }
      }));

      await this.services.emailQueueService.addBulkEmails(emails, template);
      totalSent += users.length;
      offset += BATCH_SIZE;

      if (users.length < BATCH_SIZE) break;
    }

    // Abonnés sans compte, après les comptes : une même adresse ne reçoit qu'un seul message
    const { lienDesabonnement } = require('./newsletterAbonnes');
    const sansCompteWhere = { statut: 'actif' };
    let dernierId = 0;
    while (this.models.NewsletterAbonne && budget > 0) {
      const lot = await this.models.NewsletterAbonne.findAll({
        where: { ...sansCompteWhere, id_abonne: { [Op.gt]: dernierId } },
        attributes: ['id_abonne', 'email'],
        order: [['id_abonne', 'ASC']],
        limit: Math.min(BATCH_SIZE, budget),
        raw: true
      });
      if (lot.length === 0) break;
      dernierId = lot.at(-1).id_abonne;
      const comptes = await this.models.User.findAll({
        where: { ...newsletterWhere, email: lot.map(a => a.email) }, attributes: ['email'], raw: true
      });
      const dejaServis = new Set(comptes.map(c => c.email));
      const emails = lot.filter(a => !dejaServis.has(a.email)).map(a => ({
        to: a.email,
        data: { nom: '', prenom: '', unsubscribe_url: lienDesabonnement(a.id_abonne) }
      }));
      if (emails.length) {
        await this.services.emailQueueService.addBulkEmails(emails, template);
        totalSent += emails.length;
        budget -= emails.length;
      }
      if (lot.length < BATCH_SIZE) break;
    }

    const abonnes = await this.models.User.count({ where: newsletterWhere })
      + (this.models.NewsletterAbonne ? await this.models.NewsletterAbonne.count({ where: sansCompteWhere }) : 0);
    if (abonnes > totalSent) {
      logger.warn(`📮 Newsletter : quota du jour atteint, ${abonnes - totalSent} abonné(s) non servi(s) cette semaine`);
    }
    logger.info(`📮 Newsletter mise en file pour ${totalSent} abonnés`);
  }

  /**
   * 6. Vérifier les événements à venir
   */
  async checkUpcomingEvents() {
    if (!this.models) return;

    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    // Événements qui commencent dans l'heure
    const upcomingEvents = await this.models.Evenement.findAll({
      where: {
        date_debut: {
          [Op.between]: [now, inOneHour]
        },
        statut: STATUTS_PUBLIES,
        rappel_derniere_minute: { [Op.not]: true }
      },
      attributes: ['id_evenement', 'nom_evenement', 'date_debut']
    });

    // Un jour sans heure (minuit UTC) n'a pas d'heure de début : pas de « dans 1 heure » à minuit
    const avecHeure = upcomingEvents.filter(e => {
      const d = new Date(e.date_debut);
      return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0;
    });
    await Promise.all(upcomingEvents.filter(e => !avecHeure.includes(e))
      .map(e => e.update({ rappel_derniere_minute: true })));
    if (avecHeure.length === 0) return;

    const eventIds = avecHeure.map(e => e.id_evenement);

    // 1 seule requête pour TOUS les participants de TOUS les événements
    // (inscrits ou confirmés, qui n'ont pas coupé les notifications d'événements)
    const allParticipants = await this.models.EvenementUser.findAll({
      where: {
        id_evenement: { [Op.in]: eventIds },
        statut_participation: { [Op.in]: ['inscrit', 'confirme'] }
      },
      include: [{
        model: this.models.User, as: 'User', attributes: [],
        where: { notifications_evenements: true, statut: { [Op.notIn]: ['suspendu', 'banni'] } }
      }],
      attributes: ['id_user', 'id_evenement']
    });

    // Grouper par événement
    const participantsByEvent = new Map();
    for (const p of allParticipants) {
      if (!participantsByEvent.has(p.id_evenement)) participantsByEvent.set(p.id_evenement, []);
      participantsByEvent.get(p.id_evenement).push(p.id_user);
    }

    // Créer toutes les notifications + marquer les events en parallèle
    await Promise.all(avecHeure.map(async (event) => {
      const userIds = participantsByEvent.get(event.id_evenement) || [];
      if (userIds.length > 0) {
        const notifications = userIds.map(userId => ({
          id_user: userId,
          type_notification: 'rappel_evenement',
          titre: 'Événement dans 1 heure !',
          message: `L'événement « ${translate(lireMultiLang(event.nom_evenement))} » commence dans 1 heure`,
          id_evenement: event.id_evenement,
          priorite: 'urgente'
        }));
        await this.models.Notification.bulkCreate(notifications);
      }
      await event.update({ rappel_derniere_minute: true });
    }));
  }

  /**
   * 7. Nettoyer les fichiers temporaires
   */
  async cleanTempFiles() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const tempDir = process.env.UPLOAD_TEMP_DIR || 'uploads/temp';
    
    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      
      await Promise.all(files.map(async (file) => {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          logger.info(`🗑️ Fichier temporaire supprimé: ${file}`);
        }
      }));
    } catch (error) {
      logger.error('Erreur nettoyage fichiers temp:', error);
    }
  }

  /**
   * 8. Mettre à jour le statut des événements
   */
  async updateEventStatuses() {
    if (!this.models?.Evenement) return;

    const now = new Date();

    // Passer les événements terminés en "terminé" (fin réelle : jour sans heure = toute la journée,
    // pas de date de fin = soir du premier jour — helpers/finEvenement)
    await this.models.Evenement.update(
      { statut: 'termine' },
      {
        where: {
          [Op.and]: [termine(now)],
          statut: [...STATUTS_PUBLIES, 'en_cours']
        }
      }
    );

    // Passer les événements qui commencent en "en_cours"
    await this.models.Evenement.update(
      { statut: 'en_cours' },
      {
        where: {
          date_debut: { [Op.lte]: now },
          [Op.and]: [pasTermine(now)],
          statut: STATUTS_PUBLIES
        }
      }
    );
  }

  /**
   * 9. Rappel de vérification email
   */
  async sendEmailVerificationReminders() {
    if (!this.models || !this.services?.emailService) return;

    // Utilisateurs non vérifiés depuis plus de 3 jours. Seulement les inscriptions faites sur le
    // site (conditions acceptées) : un compte créé par l'import d'une liste attend son invitation
    // « Choisir mon mot de passe » ; un lien « vérifiez votre email » lui ferait perdre cette invitation
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const unverifiedUsers = await this.models.User.findAll({
      where: {
        email_verifie: false,
        accepte_conditions: true,
        date_creation: { [Op.lte]: threeDaysAgo },
        rappel_verification_envoye: { [Op.not]: true }
      },
      attributes: ['id_user', 'email', 'nom', 'prenom'],
      limit: 100
    });

    let envoyes = 0;
    for (const user of unverifiedUsers) {
      try {
        const token = await this.models.EmailVerification.createVerificationToken(user.id_user);
        const envoi = await this.services.emailService.sendVerificationEmail(user, token.token);
        if (envoi?.success === false) throw new Error(envoi.error || 'envoi refusé');
        await user.update({ rappel_verification_envoye: true });
        envoyes++;
      } catch (error) {
        logger.error(`Erreur rappel vérification pour ${maskEmail(user.email)}:`, error);
      }
    }

    logger.info(`📧 ${envoyes}/${unverifiedUsers.length} rappels de vérification envoyés`);
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  /**
   * Obtenir le nombre d'utilisateurs actifs
   */
  async getActiveUsersCount(date) {
    return await this.models.User.count({
      where: {
        derniere_connexion: {
          [Op.gte]: date
        }
      }
    });
  }

  /**
   * Générer le HTML de la newsletter
   */
  generateNewsletterHtml(events, oeuvres) {
    // Titres saisis par les utilisateurs : multilingues et échappés (pas de HTML injecté dans l'email)
    const label = (v) => {
      const text = v && typeof v === 'object' ? (v.fr || Object.values(v).find(Boolean) || '') : (v || '');
      return String(text).replace(/[&<>"'{}]/g, c => `&#${c.charCodeAt(0)};`);
    };
    const base = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    const lien = (chemin, texte, detail = '') => `<li style="margin:8px 0"><a href="${base}${chemin}" style="color:#3A4224;font-weight:bold">${texte}</a>${detail}</li>`;
    const date = (d) => {
      const jour = d ? new Date(d) : null;
      return jour && !Number.isNaN(jour.getTime())
        ? ` <span style="color:#6b6a63">(${jour.toLocaleDateString('fr-FR', { timeZone: 'Africa/Algiers', day: 'numeric', month: 'long', year: 'numeric' })})</span>`
        : '';
    };
    const section = (titre, lignes) => (lignes.length
      ? `<h3 style="color:#3A4224;margin:24px 0 8px">${titre}</h3><ul style="padding-inline-start:20px;margin:0">${lignes.join('')}</ul>`
      : '');
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2b2a26">
        <h2 style="color:#3A4224">Les nouveautés de la semaine sur Tala DZ</h2>
        <p>Voici ce qui a été ajouté cette semaine sur taladz.com, la plateforme de la culture algérienne.</p>
        ${section('Nouveaux événements', events.map(e => lien(`/evenements/${e.id_evenement}`, label(e.nom_evenement), date(e.date_debut))))}
        ${section('Nouvelles œuvres', oeuvres.map(o => lien(`${[4, 5].includes(o.id_type_oeuvre) ? '/articles' : '/oeuvres'}/${o.id_oeuvre}`, label(o.titre))))}
        <p style="margin:28px 0"><a href="${base}/" style="background-color:#3A4224;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">Découvrir Tala DZ</a></p>
      </div>
    `;
  }

  // ========================================================================
  // GESTION DU SERVICE
  // ========================================================================

  /**
   * Arrêter une tâche spécifique
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      logger.info(`⏹️ Tâche "${name}" arrêtée`);
      return true;
    }
    return false;
  }

  /**
   * Redémarrer une tâche
   */
  startJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      logger.info(`▶️ Tâche "${name}" redémarrée`);
      return true;
    }
    return false;
  }

  /**
   * Exécuter une tâche manuellement
   */
  async runJob(name) {
    const jobName = name.replace(/-/g, '_');
    const methodName = jobName.charAt(0).toLowerCase() + jobName.slice(1);
    
    if (typeof this[methodName] === 'function') {
      logger.info(`🔄 Exécution manuelle de: ${name}`);
      await this[methodName]();
      return true;
    }
    
    logger.error(`❌ Tâche "${name}" non trouvée`);
    return false;
  }

  /**
   * Obtenir le statut des tâches
   */
  getStatus() {
    const status = {
      running: this.isRunning,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running !== false
      };
    });

    return status;
  }

  /**
   * Arrêter toutes les tâches
   */
  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`⏹️ Tâche "${name}" arrêtée`);
    });
    
    this.isRunning = false;
    logger.info('⏹️ Service de tâches planifiées arrêté');
  }

  /**
   * Redémarrer toutes les tâches
   */
  startAll() {
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`▶️ Tâche "${name}" démarrée`);
    });
    
    this.isRunning = true;
    logger.info('▶️ Service de tâches planifiées redémarré');
  }
}

// Singleton
const cronService = new CronService();

module.exports = cronService;
module.exports.journeeDeDemain = journeeDeDemain;
