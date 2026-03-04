// services/NotificationService.js - Orchestrateur des notifications
const emailService = require('./emailService');
const smsService = require('./smsService');
const whatsappService = require('./whatsappService');
const { Op } = require('sequelize');

class NotificationService {
  constructor(models) {
    this.models = models;
    this.emailService = emailService;
    this.smsService = smsService;
    this.whatsappService = whatsappService;
  }

  // Helper: extraire une string i18n
  _str(val) {
    if (!val) return '';
    if (typeof val === 'object') return val.fr || val.ar || val.en || '';
    return val;
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
      console.error(`⚠️ Erreur SMS (${type}):`, err.message);
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
      console.error(`⚠️ Erreur WhatsApp (${type}):`, err.message);
    }
  }

  // ========================================================================
  // NOTIFICATIONS ÉVÉNEMENTS
  // ========================================================================

  // Notifier la validation/refus d'un professionnel pour un événement
  async notifierValidationParticipation(evenementId, userId, statut, notes = '') {
    try {
      console.log(`📧 Notification validation participation: Event ${evenementId}, User ${userId}, Statut ${statut}`);

      // Récupérer les informations nécessaires
      const [professionnel, evenement] = await Promise.all([
        this.models.User.findByPk(userId, {
          attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone', 'type_user']
        }),
        this.models.Evenement.findByPk(evenementId, {
          include: [
            { model: this.models.Lieu, attributes: ['nom'] },
            { model: this.models.TypeEvenement, attributes: ['nom_type'] }
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
        message: `Votre participation à "${evenement.nom_evenement}" a été ${statut === 'confirme' ? 'acceptée' : 'refusée'}`,
        id_evenement: evenementId,
        email_envoye: result.success
      });

      return result;

    } catch (error) {
      console.error('❌ Erreur notification validation:', error);
      throw error;
    }
  }
// Notifications manquantes à ajouter dans NotificationService.js

// 1. RAPPEL D'ÉVÉNEMENT (24h avant)
async envoyerRappelEvenement(evenementId) {
  try {
    const evenement = await this.models.Evenement.findByPk(evenementId, {
      include: [
        { model: this.models.Lieu },
        { model: this.models.TypeEvenement }
      ]
    });

    // Vérifier que l'événement est dans 24h
    const maintenant = new Date();
    const dateEvenement = new Date(evenement.date_debut);
    const heuresAvant = (dateEvenement - maintenant) / (1000 * 60 * 60);
    
    if (heuresAvant < 23 || heuresAvant > 25) {
      console.log('Pas le bon moment pour le rappel');
      return;
    }

    // Récupérer les participants confirmés
    const participants = await this.models.EvenementUser.findAll({
      where: {
        id_evenement: evenementId,
        statut_participation: 'confirme'
      },
      include: [{
        model: this.models.User,
        as: 'User',
        where: { notifications_evenements: true }
      }]
    });

    for (const participant of participants) {
      await this.emailService.sendEmail(
        participant.User.email,
        `🔔 Rappel : ${evenement.nom_evenement} demain !`,
        `Rappel : L'événement "${evenement.nom_evenement}" aura lieu demain à ${dateEvenement.toLocaleTimeString()}.`
      );

      // SMS + WhatsApp
      await this._envoyerSmsWhatsapp(participant.User, 'rappel', {
        nomEvenement: this._str(evenement.nom_evenement),
        dateEvenement: dateEvenement.toLocaleDateString('fr-FR'),
        heureDebut: dateEvenement.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      });

      await this.enregistrerNotification({
        id_user: participant.id_user,
        type_notification: 'rappel_evenement',
        titre: 'Rappel d\'événement',
        message: `L'événement "${evenement.nom_evenement}" est demain !`,
        id_evenement: evenementId
      });
    }
  } catch (error) {
    console.error('Erreur rappel événement:', error);
  }
}

// 2. NOTIFICATION NOUVEAU COMMENTAIRE
async notifierNouveauCommentaire(commentaireId) {
  try {
    const commentaire = await this.models.Commentaire.findByPk(commentaireId, {
      include: [
        { model: this.models.User, as: 'Auteur' },
        { model: this.models.Oeuvre, include: [{ model: this.models.User, as: 'Users' }] }
      ]
    });

    // Notifier le créateur de l'œuvre
    for (const createur of (commentaire.Oeuvre.Users || [])) {
      if (createur.id_user !== commentaire.id_user && createur.notifications_commentaires) {
        await this.enregistrerNotification({
          id_user: createur.id_user,
          type_notification: 'nouveau_commentaire',
          titre: 'Nouveau commentaire',
          message: `${commentaire.Auteur.prenom} a commenté votre œuvre "${commentaire.Oeuvre.titre}"`,
          id_oeuvre: commentaire.id_oeuvre
        });

        // Email optionnel
        if (createur.notifications_email) {
          await this.emailService.sendEmail(
            createur.email,
            `💬 Nouveau commentaire sur votre œuvre`,
            `${commentaire.Auteur.prenom} ${commentaire.Auteur.nom} a commenté : "${commentaire.contenu.substring(0, 100)}..."`
          );
        }
      }
    }
  } catch (error) {
    console.error('Erreur notification commentaire:', error);
  }
}

// 3. NOTIFICATION NOUVELLE ŒUVRE D'UN ARTISTE SUIVI
async notifierNouvelleOeuvre(oeuvreId) {
  try {
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId, {
      include: [
        { model: this.models.User, as: 'Users' },
        { model: this.models.TypeOeuvre }
      ]
    });

    if (!oeuvre) return;

    const titreStr = typeof oeuvre.titre === 'object' ? (oeuvre.titre.fr || oeuvre.titre.ar || '') : (oeuvre.titre || '');

    // Notifier les utilisateurs qui ont mis en favori des œuvres de ces créateurs
    for (const createur of (oeuvre.Users || [])) {
      const prenomStr = typeof createur.prenom === 'object' ? (createur.prenom.fr || '') : (createur.prenom || '');
      const nomStr = typeof createur.nom === 'object' ? (createur.nom.fr || '') : (createur.nom || '');

      // Trouver les utilisateurs qui ont des favoris du même créateur
      const favorisUtilisateurs = await this.models.Favori.findAll({
        where: { type_favori: 'oeuvre' },
        include: [{
          model: this.models.Oeuvre,
          where: {},
          include: [{ model: this.models.User, as: 'Users', where: { id_user: createur.id_user } }]
        }],
        attributes: ['id_user'],
        group: ['id_user']
      }).catch(() => []);

      const userIds = [...new Set(favorisUtilisateurs.map(f => f.id_user))];

      for (const userId of userIds) {
        if (userId !== createur.id_user) {
          await this.enregistrerNotification({
            id_user: userId,
            type_notification: 'nouvelle_oeuvre',
            titre: 'Nouvelle œuvre',
            message: `${prenomStr} ${nomStr} a publié "${titreStr}"`,
            id_oeuvre: oeuvreId
          });
        }
      }
    }
  } catch (error) {
    console.error('Erreur notification nouvelle œuvre:', error);
  }
}

// 4. NOTIFICATION DE MODÉRATION
async notifierModeration(userId, type, raison) {
  try {
    const messages = {
      'contenu_supprime': 'Un de vos contenus a été supprimé',
      'compte_suspendu': 'Votre compte a été temporairement suspendu',
      'avertissement': 'Vous avez reçu un avertissement'
    };

    await this.enregistrerNotification({
      id_user: userId,
      type_notification: 'message_admin',
      titre: messages[type] || 'Message de modération',
      message: raison,
      priorite: 'haute'
    });

    // Email obligatoire pour les notifications importantes
    const user = await this.models.User.findByPk(userId);
    await this.emailService.sendEmail(
      user.email,
      `⚠️ ${messages[type]}`,
      `Bonjour,\n\n${raison}\n\nL'équipe de modération`
    );
  } catch (error) {
    console.error('Erreur notification modération:', error);
  }
}

// 5. NOTIFICATION FAVORI AJOUTÉ
async notifierFavoriAjoute(favoriId) {
  try {
    const favori = await this.models.Favori.findByPk(favoriId, {
      include: [
        { model: this.models.User },
        { 
          model: this.models.Oeuvre, 
          include: [{ model: this.models.User, as: 'Users' }] 
        }
      ]
    });

    if (!favori || !favori.Oeuvre) return;

    const titreStr = typeof favori.Oeuvre.titre === 'object' ? (favori.Oeuvre.titre.fr || '') : (favori.Oeuvre.titre || '');

    // Notifier les créateurs
    for (const createur of (favori.Oeuvre.Users || [])) {
      if (createur.notifications_favoris) {
        const prenomFavori = typeof favori.User?.prenom === 'object' ? (favori.User.prenom.fr || '') : (favori.User?.prenom || '');
        await this.enregistrerNotification({
          id_user: createur.id_user,
          type_notification: 'autre',
          titre: 'Œuvre ajoutée aux favoris',
          message: `${prenomFavori} a ajouté "${titreStr}" à ses favoris`,
          id_oeuvre: favori.id_oeuvre
        });
      }
    }
  } catch (error) {
    console.error('Erreur notification favori:', error);
  }
}

// 6. CRON JOB POUR LES RAPPELS
async planifierRappels() {
  // À exécuter toutes les heures
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  
  const evenements = await this.models.Evenement.findAll({
    where: {
      date_debut: {
        [Op.between]: [
          new Date(demain.setHours(0, 0, 0, 0)),
          new Date(demain.setHours(23, 59, 59, 999))
        ]
      },
      statut: 'publie'
    }
  });

  for (const evenement of evenements) {
    await this.envoyerRappelEvenement(evenement.id_evenement);
  }
}

// 7. NOTIFICATION BATCH (Newsletter)
async envoyerNewsletter(contenu, filtres = {}) {
  try {
    const whereClause = {
      accepte_newsletter: true,
      statut: 'actif',
      email_verifie: true
    };

    if (filtres.wilaya) {
      whereClause.wilaya_residence = filtres.wilaya;
    }

    if (filtres.type_user) {
      whereClause.type_user = filtres.type_user;
    }

    const users = await this.models.User.findAll({
      where: whereClause,
      attributes: ['id_user', 'email', 'nom', 'prenom'],
      limit: 1000 // Traiter par batch
    });

    const results = [];
    for (const user of users) {
      const result = await this.emailService.sendEmail(
        user.email,
        contenu.sujet,
        contenu.texte,
        contenu.html
      );
      
      results.push({
        userId: user.id_user,
        success: result.success
      });

      // Pause entre les envois pour éviter le spam
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      total: users.length,
      success: results.filter(r => r.success).length
    };
  } catch (error) {
    console.error('Erreur newsletter:', error);
    throw error;
  }
}
  // Notifier l'annulation d'un événement
  async notifierAnnulationEvenement(evenementId, raison) {
    try {
      console.log(`📧 Notification annulation événement: ${evenementId}`);

      // Récupérer l'événement et ses participants
      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.Lieu },
          { model: this.models.TypeEvenement }
        ]
      });

      if (!evenement) {
        throw new Error('Événement non trouvé');
      }

      // Récupérer tous les participants (confirmés et en attente)
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: evenementId,
          statut_participation: {
            [Op.in]: ['confirme', 'en_attente', 'inscrit']
          }
        },
        include: [
          {
            model: this.models.User,
            as: 'User',
            attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone']
          }
        ]
      });

      if (participants.length === 0) {
        console.log('ℹ️ Aucun participant à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierAnnulationEvenement(
        participants,
        evenement,
        raison
      );

      // SMS + WhatsApp pour chaque participant
      for (const participant of participants) {
        await this._envoyerSmsWhatsapp(participant.User, 'annulation', {
          nomEvenement: this._str(evenement.nom_evenement),
          raison
        });
      }

      // Enregistrer les notifications
      const notifications = [];
      for (const participant of participants) {
        notifications.push({
          id_user: participant.id_user,
          type_notification: 'annulation_evenement',
          titre: 'Événement annulé',
          message: `L'événement "${evenement.nom_evenement}" a été annulé`,
          id_evenement: evenementId,
          email_envoye: results.find(r => r.email === participant.User.email)?.result.success || false
        });
      }

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      console.log(`✅ ${successCount}/${participants.length} participants notifiés`);

      return {
        success: true,
        notified: successCount,
        total: participants.length,
        results
      };

    } catch (error) {
      console.error('❌ Erreur notification annulation:', error);
      throw error;
    }
  }

  // ========================================================================
  // NOTIFICATIONS PROGRAMMES
  // ========================================================================

  // Notifier la modification d'un programme
  async notifierModificationProgramme(programmeId, typeModification = 'general') {
    try {
      console.log(`📧 Notification modification programme: ${programmeId}, Type: ${typeModification}`);

      // Récupérer le programme et l'événement
      const programme = await this.models.Programme.findByPk(programmeId, {
        include: [
          {
            model: this.models.Evenement,
            include: [
              { model: this.models.Lieu },
              { model: this.models.TypeEvenement }
            ]
          }
        ]
      });

      if (!programme || !programme.Evenement) {
        throw new Error('Programme ou événement non trouvé');
      }

      // Récupérer les participants confirmés uniquement
      const participants = await this.models.EvenementUser.findAll({
        where: {
          id_evenement: programme.id_evenement,
          statut_participation: 'confirme'
        },
        include: [
          {
            model: this.models.User,
            as: 'User',
            attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone']
          }
        ]
      });

      if (participants.length === 0) {
        console.log('ℹ️ Aucun participant confirmé à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierModificationProgramme(
        participants,
        programme.Evenement,
        programme,
        typeModification
      );

      // SMS + WhatsApp pour chaque participant
      for (const participant of participants) {
        await this._envoyerSmsWhatsapp(participant.User, 'programme', {
          nomEvenement: this._str(programme.Evenement.nom_evenement),
          titreProgramme: this._str(programme.titre),
          typeModification
        });
      }

      // Enregistrer les notifications
      const notifications = participants.map(participant => ({
        id_user: participant.id_user,
        type_notification: 'modification_programme',
        titre: 'Programme modifié',
        message: `Le programme de "${programme.Evenement.nom_evenement}" a été modifié`,
        id_evenement: programme.id_evenement,
        id_programme: programmeId,
        email_envoye: results.find(r => r.email === participant.User.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      console.log(`✅ ${successCount}/${participants.length} participants notifiés`);

      return {
        success: true,
        notified: successCount,
        total: participants.length,
        results
      };

    } catch (error) {
      console.error('❌ Erreur notification modification programme:', error);
      throw error;
    }
  }

  // Notifier l'ajout d'un nouveau programme
  async notifierNouveauProgramme(programmeId) {
    return this.notifierModificationProgramme(programmeId, 'nouveau');
  }

  // Notifier l'annulation d'un programme
  async notifierAnnulationProgramme(programmeId) {
    return this.notifierModificationProgramme(programmeId, 'annule');
  }

  // ========================================================================
  // NOTIFICATIONS UTILISATEURS
  // ========================================================================

  // Notifier un nouvel événement aux utilisateurs intéressés
  async notifierNouvelEvenement(evenementId, filtres = {}) {
    try {
      console.log(`📧 Notification nouvel événement: ${evenementId}`);

      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.Lieu, include: [{ model: this.models.Wilaya }] },
          { model: this.models.TypeEvenement }
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
        console.log('ℹ️ Aucun utilisateur à notifier');
        return { success: true, notified: 0 };
      }

      // Envoyer les emails
      const results = await this.emailService.notifierNouvelEvenement(users, evenement);

      // SMS + WhatsApp pour chaque utilisateur
      const nomEvt = this._str(evenement.nom_evenement);
      const dateEvt = evenement.date_debut ? new Date(evenement.date_debut).toLocaleDateString('fr-FR') : '';
      const lieuEvt = evenement.Lieu ? this._str(evenement.Lieu.nom) : '';
      for (const user of users) {
        await this._envoyerSmsWhatsapp(user, 'nouvel_evenement', {
          nomEvenement: nomEvt,
          dateEvenement: dateEvt,
          lieu: lieuEvt
        });
      }

      // Enregistrer les notifications
      const notifications = users.map(user => ({
        id_user: user.id_user,
        type_notification: 'nouvel_evenement',
        titre: 'Nouvel événement',
        message: `Découvrez "${evenement.nom_evenement}"`,
        id_evenement: evenementId,
        email_envoye: results.find(r => r.email === user.email)?.result.success || false
      }));

      await this.enregistrerNotificationsMultiples(notifications);

      const successCount = results.filter(r => r.result.success).length;
      console.log(`✅ ${successCount}/${users.length} utilisateurs notifiés`);

      return {
        success: true,
        notified: successCount,
        total: users.length
      };

    } catch (error) {
      console.error('❌ Erreur notification nouvel événement:', error);
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
      console.log(`📝 Notification enregistrée: ${data.type_notification} pour user ${data.id_user}`);
      
    } catch (error) {
      console.error('❌ Erreur enregistrement notification:', error);
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
      
      console.log(`📝 ${notifications.length} notifications enregistrées`);
      
    } catch (error) {
      console.error('❌ Erreur enregistrement notifications:', error);
    }
  }

  // Récupérer les notifications d'un utilisateur
  async getNotificationsUtilisateur(userId, options = {}) {
    try {
      const { limit = 20, offset = 0, nonLues = false } = options;
      
      const where = { id_user: userId };
      if (nonLues) {
        where.lu = false;
      }

      if (!this.models.Notification) {
        return { notifications: [], total: 0 };
      }

      const notifications = await this.models.Notification.findAndCountAll({
        where,
        order: [['date_creation', 'DESC']],
        limit,
        offset,
        include: [
          { 
            model: this.models.Evenement, 
            attributes: ['id_evenement', 'nom_evenement'],
            required: false 
          }
        ]
      });

      return {
        notifications: notifications.rows,
        total: notifications.count,
        nonLues: await this.models.Notification.count({ where: { ...where, lu: false } })
      };

    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  // Marquer les notifications comme lues
  async marquerNotificationsLues(userId, notificationIds = null) {
    try {
      if (!this.models.Notification) return;

      const where = { id_user: userId };
      if (notificationIds) {
        where.id_notification = { [Op.in]: notificationIds };
      }

      await this.models.Notification.update(
        { lu: true, date_lecture: new Date() },
        { where }
      );

      console.log(`✅ Notifications marquées comme lues pour user ${userId}`);

    } catch (error) {
      console.error('❌ Erreur marquage notifications:', error);
    }
  }

  // Obtenir les préférences de notification d'un utilisateur
  async getPreferencesNotification(userId) {
    try {
      const user = await this.models.User.findByPk(userId, {
        attributes: ['notifications_email', 'notifications_push', 'notifications_evenements', 'notifications_commentaires', 'notifications_favoris', 'notifications_newsletter']
      });

      return {
        actives: true,
        email: user?.notifications_email ?? true,
        push: user?.notifications_push ?? true,
        evenements: user?.notifications_evenements ?? true,
        commentaires: user?.notifications_commentaires ?? true,
        favoris: user?.notifications_favoris ?? true,
        newsletter: user?.notifications_newsletter ?? true
      };

    } catch (error) {
      console.error('❌ Erreur récupération préférences:', error);
      return { actives: true, email: true, push: true, evenements: true, commentaires: true, favoris: true, newsletter: true };
    }
  }
}

module.exports = NotificationService;