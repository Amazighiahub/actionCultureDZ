/**
 * Service de modération pour le Dashboard
 * Gestion des validations et de la modération du contenu
 */
const { Op } = require('sequelize');
const { texteLisible } = require('../../helpers/i18n');
const { notifier } = require('../../utils/notifierModeration');
const { apercuSignale } = require('../signalement/apercuSignale');

const TYPES_SIGNALEMENT = ['commentaire', 'oeuvre', 'evenement', 'user', 'artisanat'];

// Erreur avec son code HTTP (404, 400, 409…) : sinon une erreur attendue finissait en 500.
// Le texte ne change pas (les contrôleurs le comparent encore).
const AppError = require('../../utils/appError');
// Erreur avec son statut HTTP, comme le reste du serveur (avant : Error + statusCode, sans code)
const erreurHttp = (message, statusCode) => new AppError(message, statusCode, statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR');

class DashboardModerationService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Récupère les utilisateurs en attente de validation
   */
  async getPendingUsers(options = {}) {
    const { page = 1, limit = 20, type_user } = options;
    const offset = (page - 1) * limit;

    const whereClause = { statut: 'en_attente_validation' };
    if (type_user) whereClause.type_user = type_user;

    const { rows: users, count } = await this.models.User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id_user', 'nom', 'prenom', 'email', 'type_user',
        'entreprise', 'date_creation', 'statut'
      ],
      order: [['date_creation', 'DESC']],
      limit,
      offset
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Récupère les œuvres en attente de validation (dashboard)
   * Inclut l'auteur et le premier media. Pas les brouillons : personne ne peut les valider, et ils
   * gonflaient le compteur « à valider ».
   */
  async getPendingOeuvres({ page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const oeuvres = await this.models.Oeuvre.findAndCountAll({
      where: { statut: 'en_attente' },
      include: [
        { model: this.models.User, as: 'Saiseur', attributes: ['id_user', 'nom', 'prenom', 'email'] },
        { model: this.models.Media, limit: 1, attributes: ['url', 'type_media'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_creation', 'DESC']]
    });

    const items = oeuvres.rows.map(oeuvre => ({
      id_oeuvre: oeuvre.id_oeuvre, titre: oeuvre.titre, description: oeuvre.description,
      statut: oeuvre.statut, id_type_oeuvre: oeuvre.id_type_oeuvre, type_oeuvre: oeuvre.id_type_oeuvre,
      date_creation: oeuvre.date_creation,
      auteur: oeuvre.Saiseur ? { id: oeuvre.Saiseur.id_user, nom: oeuvre.Saiseur.nom, prenom: oeuvre.Saiseur.prenom } : null,
      medias: oeuvre.Media || []
    }));

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pages = Math.ceil(oeuvres.count / parsedLimit);

    return {
      items,
      pagination: { total: oeuvres.count, page: parsedPage, pages, limit: parsedLimit, hasNext: parsedPage < pages, hasPrev: parsedPage > 1 }
    };
  }

  /**
   * File d'attente de modération complète (counts agrégés)
   */
  async getModerationQueue() {
    const [pendingUsers, pendingOeuvres, reportedContent] = await Promise.all([
      this.models.User.count({ where: { statut: 'en_attente_validation' } }),
      this.models.Oeuvre?.count({ where: { statut: 'en_attente' } }) || 0,
      this.getReportedContentCount()
    ]);

    return {
      pendingUsers,
      pendingOeuvres,
      reportedContent,
      total: pendingUsers + pendingOeuvres + reportedContent
    };
  }

  /**
   * File de modération des signalements paginée (dashboard)
   */
  async getSignalementsModerationQueue({ page = 1, limit = 10, type } = {}) {
    const offset = (page - 1) * limit;
    const where = { statut: 'en_attente' };
    if (TYPES_SIGNALEMENT.includes(type)) where.type_entite = type;

    const signalements = await this.models.Signalement.findAndCountAll({
      where,
      include: [{ model: this.models.User, as: 'Signalant', attributes: ['id_user', 'nom', 'prenom'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
    });

    const items = await Promise.all(signalements.rows.map(async (s) => {
      const apercu = await apercuSignale(this.models, s.type_entite, s.id_entite);
      return {
        id: s.id_signalement, type: s.type_entite, entity_id: s.id_entite,
        entity_title: apercu?.titre || null, entity_content: apercu?.contenu || null,
        entity_link: apercu?.lien || null, entity_status: apercu?.statut || null,
        entity_author: apercu?.auteur || null, entity_missing: !apercu,
        reason: s.motif, description: s.description || null, priority: s.priorite,
        reported_by: s.Signalant ? {
          id: s.Signalant.id_user,
          nom: [texteLisible(s.Signalant.prenom), texteLisible(s.Signalant.nom)].filter(Boolean).join(' ')
        } : null,
        date_signalement: s.date_signalement, status: s.statut
      };
    }));

    // Compteurs de toute la file (pas seulement de la page affichée)
    const parType = await this.models.Signalement.count({ where: { statut: 'en_attente' }, group: ['type_entite'] });
    const compteurs = { total: 0, commentaire: 0, contenu: 0, compte: 0 };
    for (const { type_entite: t, count: n } of parType || []) {
      compteurs.total += Number(n);
      if (t === 'commentaire') compteurs.commentaire += Number(n);
      else if (t === 'user') compteurs.compte += Number(n);
      else compteurs.contenu += Number(n);
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const pages = Math.ceil(signalements.count / parsedLimit);

    return {
      items,
      compteurs,
      pagination: { total: signalements.count, page: parsedPage, pages, limit: parsedLimit, hasNext: parsedPage < pages, hasPrev: parsedPage > 1 }
    };
  }

  /**
   * Compte le contenu signalé
   */
  async getReportedContentCount() {
    if (!this.models.Signalement) return 0;
    return this.models.Signalement.count({
      where: { statut: 'en_attente' }
    });
  }

  /**
   * Liste complète du contenu signalé en attente (non paginé)
   */
  async getReportedContent() {
    return this.models.Signalement.findAll({
      where: { statut: 'en_attente' },
      include: [{ model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom', 'email'] }],
      order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
    });
  }

  /**
   * Valide un utilisateur
   */
  async validateUser(userId, data, moderatorId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw erreurHttp('Utilisateur non trouvé', 404);
    }

    const { action, motif } = data;

    if (action === 'approve') {
      await user.update({
        statut: 'actif',
        date_validation: new Date(),
        id_user_validate: moderatorId
      });
    } else if (action === 'reject') {
      await user.update({
        statut: 'rejete',
        raison_rejet: motif,
        date_validation: new Date(),
        id_user_validate: moderatorId
      });
    }

    return user;
  }

  /**
   * Valide ou rejette une œuvre (dashboard admin)
   * @param {number} oeuvreId
   * @param {Object} data - { valide, validateur_id, raison_rejet }
   * @returns {Object} { message, data }
   */
  async validateOeuvreAction(oeuvreId, data) {
    const { valide, validateur_id, raison_rejet } = data;
    // Même chemin que les routes /oeuvres/:id/validate|reject : verrou, œuvre « en attente » seulement
    // (pas de brouillon publié, pas d'œuvre publiée repassée en refusée, pas de double envoi sur double clic),
    // motif obligatoire pour un refus. Avant : mise à jour directe, sans aucun contrôle.
    const container = require('../serviceContainer');
    if (valide) await container.oeuvreService.validate(Number(oeuvreId), validateur_id);
    else await container.oeuvreService.reject(Number(oeuvreId), validateur_id, raison_rejet);
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);

    // Envoyer un email de notification au créateur
    try {
      if (oeuvre.saisi_par) {
        // Dans le site aussi : un e-mail perdu ne doit pas laisser l'auteur sans nouvelles
        await notifier(container.notificationService, oeuvre.saisi_par, {
          titre: valide ? 'Votre œuvre a été validée' : 'Votre œuvre n’a pas été validée',
          message: valide
            ? `« ${texteLisible(oeuvre.titre)} » est maintenant publiée.`
            : `« ${texteLisible(oeuvre.titre)} » n’a pas été validée.${raison_rejet ? ` Raison : ${raison_rejet}` : ''} Vous pouvez la corriger et la renvoyer.`,
          url_action: valide ? `/oeuvres/${oeuvreId}` : '/dashboard-pro',
          metadata: { id_oeuvre: Number(oeuvreId) }
        });
        if (valide) {
          const auteur = await this.models.User.findByPk(oeuvre.saisi_par, { attributes: ['nom', 'prenom'] });
          const qui = [texteLisible(auteur?.prenom), texteLisible(auteur?.nom)].filter(Boolean).join(' ') || 'Un professionnel que vous suivez';
          await require('../suivisProfessionnels').prevenirAbonnes(this.models, oeuvre.saisi_par, {
            composer: (personne) => require('../messagesProfessionnels').composer('publication', personne, qui, texteLisible(oeuvre.titre)),
            url_action: [4, 5].includes(oeuvre.id_type_oeuvre) ? `/articles/${oeuvreId}` : `/oeuvres/${oeuvreId}`,
            type_notification: 'nouvelle_oeuvre',
            metadata: { id_oeuvre: Number(oeuvreId) }
          });
        }
        const user = await this.models.User.findByPk(oeuvre.saisi_par);
        if (user?.email) {
          const emailService = require('../emailService');
          const titre = texteLisible(oeuvre.titre);
          const prenom = texteLisible(user.prenom);

          if (valide) {
            await emailService.sendEmail(user.email, 'Votre œuvre a été validée - Tala DZ', `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">Œuvre validée !</h2>
                <p>Bonjour ${emailService._escapeHtml(prenom || '')},</p>
                <p>Votre œuvre <strong>${emailService._escapeHtml(titre || '')}</strong> a été validée et est maintenant publiée sur Tala DZ.</p>
                <p><a href="${process.env.FRONTEND_URL}/oeuvres/${oeuvreId}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Voir mon œuvre</a></p>
                <p>L'équipe Tala DZ</p>
              </div>
            `);
          } else {
            await emailService.sendEmail(user.email, 'Votre œuvre n\'a pas été validée - Tala DZ', `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Œuvre non validée</h2>
                <p>Bonjour ${emailService._escapeHtml(prenom || '')},</p>
                <p>Votre œuvre <strong>${emailService._escapeHtml(titre || '')}</strong> n'a pas été validée.</p>
                ${raison_rejet ? `<p><strong>Raison :</strong> ${emailService._escapeHtml(raison_rejet)}</p>` : ''}
                <p>Vous pouvez modifier votre œuvre et la soumettre à nouveau depuis votre tableau de bord.</p>
                <p>L'équipe Tala DZ</p>
              </div>
            `);
          }
        }
      }
    } catch (emailErr) {
      console.error('Erreur envoi email validation oeuvre:', emailErr.message);
    }

    return { message: valide ? 'Œuvre validée' : 'Œuvre rejetée', data: oeuvre };
  }

  /**
   * Modère un signalement
   */
  async moderateSignalement(signalementId, data, moderatorId) {
    if (!this.models.Signalement) {
      throw new Error('Modèle Signalement non disponible');
    }

    const signalement = await this.models.Signalement.findByPk(signalementId);
    if (!signalement) {
      throw erreurHttp('Signalement non trouvé', 404);
    }

    const { action, motif } = data;

    await signalement.update({
      statut: action === 'approve' ? 'traite' : 'rejete',
      decision: motif,
      traite_par: moderatorId,
      date_traitement: new Date()
    });

    return signalement;
  }

  /**
   * Suspendre un utilisateur
   */
  async suspendUser(userId, data, moderatorId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw erreurHttp('Utilisateur non trouvé', 404);
    }

    const { duree, motif } = data;

    await user.update({
      statut: 'suspendu'
    });

    return user;
  }
}

module.exports = DashboardModerationService;
