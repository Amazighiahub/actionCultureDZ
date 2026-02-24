// controllers/SignalementController.js

const { Signalement, User, Oeuvre, Evenement, Commentaire } = require('../models');
const { Op } = require('sequelize');
const uploadService = require('../services/uploadService');

class SignalementController {
  /**
   * Créer un signalement
   * POST /api/signalements
   */
  static async create(req, res) {
    try {
      const { type_entite, id_entite, motif, description } = req.body;
      const id_user_signalant = req.user.id_user;
      
      // Validation
      const validTypes = ['commentaire', 'oeuvre', 'evenement', 'user', 'artisanat'];
      const validMotifs = [
        'spam', 'contenu_inapproprie', 'faux_contenu', 'violation_droits',
        'harcelement', 'incitation_haine', 'contenu_illegal', 'autre'
      ];

      if (!validTypes.includes(type_entite)) {
        return res.status(400).json({
          success: false,
          error: 'Type d\'entité invalide'
        });
      }

      if (!validMotifs.includes(motif)) {
        return res.status(400).json({
          success: false,
          error: 'Motif invalide'
        });
      }

      // Vérifier que l'entité existe
      const entityExists = await SignalementController.checkEntityExists(type_entite, id_entite);
      if (!entityExists) {
        return res.status(404).json({
          success: false,
          error: 'Entité non trouvée'
        });
      }

      // Vérifier si l'utilisateur a déjà signalé cette entité
      const existingSignalement = await Signalement.findOne({
        where: {
          type_entite,
          id_entite,
          id_user_signalant
        }
      });

      if (existingSignalement) {
        return res.status(400).json({
          success: false,
          error: 'Vous avez déjà signalé cette entité'
        });
      }

      // Gérer l'upload de screenshot si fourni
      let url_screenshot = null;
      if (req.files?.screenshot) {
        const uploadResult = await uploadService.uploadImage(req.files.screenshot);
        if (uploadResult.success) {
          url_screenshot = uploadResult.data.url;
        }
      }

      // Créer le signalement
      const signalement = await Signalement.create({
        type_entite,
        id_entite,
        id_user_signalant,
        motif,
        description,
        url_screenshot,
        statut: 'en_attente',
        date_signalement: new Date()
      });

      // Charger les relations pour la réponse
      const signalementComplet = await Signalement.findByPk(signalement.id_signalement, {
        include: [
          {
            model: User,
            as: 'Signalant',
            attributes: ['id_user', 'nom', 'prenom']
          }
        ]
      });

      return res.status(201).json({
        success: true,
        data: signalementComplet
      });

    } catch (error) {
      console.error('Erreur création signalement:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la création du signalement'
      });
    }
  }

  /**
   * Obtenir mes signalements
   * GET /api/signalements/mes-signalements
   */
  static async getMesSignalements(req, res) {
    try {
      const userId = req.user.id_user;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await Signalement.findAndCountAll({
        where: { id_user_signalant: userId },
        include: [
          {
            model: User,
            as: 'Moderateur',
            attributes: ['nom', 'prenom']
          }
        ],
        order: [['date_signalement', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      return res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Erreur récupération signalements:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des signalements'
      });
    }
  }

  /**
   * [ADMIN] Obtenir la file de modération
   * GET /api/signalements/moderation
   */
  static async getModerationQueue(req, res) {
    try {
      const { statut = 'en_attente', priorite, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (statut) where.statut = statut;
      if (priorite) where.priorite = priorite;

      const { count, rows } = await Signalement.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'Signalant',
            attributes: ['id_user', 'nom', 'prenom', 'email']
          }
        ],
        order: [
          ['priorite', 'DESC'],
          ['date_signalement', 'ASC']
        ],
        limit: parseInt(limit),
        offset: offset
      });

      // Enrichir avec les entités signalées
      const enrichedRows = await Promise.all(
        rows.map(async (signalement) => {
          const entity = await SignalementController.getSignaledEntity(
            signalement.type_entite,
            signalement.id_entite
          );
          return {
            ...signalement.toJSON(),
            entite_signalee: entity
          };
        })
      );

      return res.json({
        success: true,
        data: enrichedRows,
        pagination: {
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Erreur file modération:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de la file'
      });
    }
  }

  /**
   * [ADMIN] Traiter un signalement
   * PUT /api/signalements/:id/traiter
   */
  static async traiterSignalement(req, res) {
    try {
      const { id } = req.params;
      const { action_prise, notes_moderation } = req.body;
      const id_moderateur = req.user.id_user;

      const validActions = [
        'aucune', 'avertissement', 'suppression_contenu',
        'suspension_temporaire', 'suspension_permanente', 'signalement_autorites'
      ];

      if (!validActions.includes(action_prise)) {
        return res.status(400).json({
          success: false,
          error: 'Action invalide'
        });
      }

      const signalement = await Signalement.findByPk(id);
      if (!signalement) {
        return res.status(404).json({
          success: false,
          error: 'Signalement non trouvé'
        });
      }

      // Mettre à jour le signalement
      await signalement.update({
        statut: 'traite',
        id_moderateur,
        date_traitement: new Date(),
        action_prise,
        notes_moderation
      });

      // Appliquer l'action
      await SignalementController.applyAction(signalement, action_prise);

      return res.json({
        success: true,
        data: signalement
      });

    } catch (error) {
      console.error('Erreur traitement signalement:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors du traitement'
      });
    }
  }

  /**
   * Helper : Vérifier l'existence d'une entité
   */
  static async checkEntityExists(type, id) {
    try {
      let model;
      let primaryKey;

      switch (type) {
        case 'oeuvre':
          model = Oeuvre;
          primaryKey = 'id_oeuvre';
          break;
        case 'evenement':
          model = Evenement;
          primaryKey = 'id_evenement';
          break;
        case 'user':
          model = User;
          primaryKey = 'id_user';
          break;
        case 'commentaire':
          model = Commentaire;
          primaryKey = 'id_commentaire';
          break;
        default:
          return false;
      }

      const entity = await model.findByPk(id);
      return !!entity;
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper : Récupérer l'entité signalée
   */
  static async getSignaledEntity(type, id) {
    try {
      let entity;

      switch (type) {
        case 'oeuvre':
          entity = await Oeuvre.findByPk(id, {
            attributes: ['id_oeuvre', 'titre', 'statut']
          });
          break;
        case 'evenement':
          entity = await Evenement.findByPk(id, {
            attributes: ['id_evenement', 'nom_evenement', 'statut']
          });
          break;
        case 'user':
          entity = await User.findByPk(id, {
            attributes: ['id_user', 'nom', 'prenom', 'email', 'statut']
          });
          break;
        case 'commentaire':
          entity = await Commentaire.findByPk(id, {
            attributes: ['id_commentaire', 'contenu', 'statut'],
            include: [{
              model: User,
              attributes: ['nom', 'prenom']
            }]
          });
          break;
      }

      return entity;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper : Appliquer l'action de modération
   */
  static async applyAction(signalement, action) {
    try {
      switch (action) {
        case 'suppression_contenu':
          // Supprimer ou masquer le contenu
          if (signalement.type_entite === 'commentaire') {
            await Commentaire.update(
              { statut: 'supprime' },
              { where: { id_commentaire: signalement.id_entite } }
            );
          }
          // Ajouter d'autres types selon vos besoins
          break;

        case 'suspension_temporaire':
        case 'suspension_permanente':
          if (signalement.type_entite === 'user') {
            const newStatut = action === 'suspension_temporaire' ? 'suspendu' : 'banni';
            await User.update(
              { statut: newStatut },
              { where: { id_user: signalement.id_entite } }
            );
          }
          break;

        case 'avertissement':
          // Envoyer un email d'avertissement
          // await emailService.sendWarning(...)
          break;
      }
    } catch (error) {
      console.error('Erreur application action:', error);
    }
  }
}

module.exports = SignalementController;