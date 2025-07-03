// controllers/commentaireController.js - Nouveau contrôleur pour les commentaires
const { Op } = require('sequelize');

class CommentaireController {
  constructor(models) {
    this.models = models;
  }

  // Récupérer les commentaires d'une œuvre
  async getCommentairesOeuvre(req, res) {
    try {
      const { oeuvreId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const commentaires = await this.models.Commentaire.findAndCountAll({
        where: { 
          id_oeuvre: oeuvreId,
          statut: 'publie',
          commentaire_parent_id: null // Seulement les commentaires principaux
        },
        include: [
          {
            model: this.models.User,
            attributes: ['nom', 'prenom', 'id_type_user']  // Changé type_user en id_type_user
          },
          {
            model: this.models.Commentaire,
            as: 'Reponses',
            where: { statut: 'publie' },
            required: false,
            include: [
              {
                model: this.models.User,
                attributes: ['nom', 'prenom', 'id_type_user']  // Changé type_user en id_type_user
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          commentaires: commentaires.rows,
          pagination: {
            total: commentaires.count,
            page: parseInt(page),
            pages: Math.ceil(commentaires.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des commentaires:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Créer un commentaire sur une œuvre
  async createCommentaireOeuvre(req, res) {
    try {
      const { oeuvreId } = req.params;
      const { contenu, note_qualite, commentaire_parent_id } = req.body;

      // Vérifier que l'œuvre existe
      const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      const commentaire = await this.models.Commentaire.create({
        contenu,
        note_qualite,
        commentaire_parent_id,
        id_user: req.user.id_user,
        id_oeuvre: oeuvreId,
        statut: 'publie'
      });

      // Récupérer le commentaire complet pour la réponse
      const commentaireComplet = await this.models.Commentaire.findByPk(commentaire.id_commentaire, {
        include: [
          {
            model: this.models.User,
            attributes: ['nom', 'prenom', 'id_type_user']  // Changé type_user en id_type_user
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Commentaire ajouté avec succès',
        data: commentaireComplet
      });

    } catch (error) {
      console.error('Erreur lors de la création du commentaire:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Créer un commentaire sur un événement
  async createCommentaireEvenement(req, res) {
    try {
      const { evenementId } = req.params;
      const { contenu, note_qualite, commentaire_parent_id } = req.body;

      // Vérifier que l'événement existe
      const evenement = await this.models.Evenement.findByPk(evenementId);
      if (!evenement) {
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé'
        });
      }

      const commentaire = await this.models.Commentaire.create({
        contenu,
        note_qualite,
        commentaire_parent_id,
        id_user: req.user.id_user,
        id_evenement: evenementId,
        statut: 'publie'
      });

      const commentaireComplet = await this.models.Commentaire.findByPk(commentaire.id_commentaire, {
        include: [
          {
            model: this.models.User,
            attributes: ['nom', 'prenom', 'id_type_user']  // Changé type_user en id_type_user
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Commentaire ajouté avec succès',
        data: commentaireComplet
      });

    } catch (error) {
      console.error('Erreur lors de la création du commentaire:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Récupérer les commentaires d'un événement
  async getCommentairesEvenement(req, res) {
    try {
      const { evenementId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const commentaires = await this.models.Commentaire.findAndCountAll({
        where: { 
          id_evenement: evenementId,
          statut: 'publie',
          commentaire_parent_id: null
        },
        include: [
          {
            model: this.models.User,
            attributes: ['nom', 'prenom', 'id_type_user']  // Changé type_user en id_type_user
          },
          {
            model: this.models.Commentaire,
            as: 'Reponses',
            where: { statut: 'publie' },
            required: false,
            include: [
              {
                model: this.models.User,
                attributes: ['nom', 'prenom', 'id_type_user']  // Changé type_user en id_type_user
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          commentaires: commentaires.rows,
          pagination: {
            total: commentaires.count,
            page: parseInt(page),
            pages: Math.ceil(commentaires.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des commentaires:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Modifier un commentaire
  async updateCommentaire(req, res) {
    try {
      const { id } = req.params;
      const { contenu, note_qualite } = req.body;

      const commentaire = req.resource; // Récupéré par le middleware requireOwnership

      await commentaire.update({
        contenu,
        note_qualite,
        date_modification: new Date()
      });

      res.json({
        success: true,
        message: 'Commentaire modifié avec succès',
        data: commentaire
      });

    } catch (error) {
      console.error('Erreur lors de la modification du commentaire:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Supprimer un commentaire
  async deleteCommentaire(req, res) {
    try {
      const commentaire = req.resource; // Récupéré par le middleware requireOwnership

      await commentaire.update({ statut: 'supprime' });

      res.json({
        success: true,
        message: 'Commentaire supprimé avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du commentaire:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Modérer un commentaire (admin)
  async moderateCommentaire(req, res) {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      const commentaire = await this.models.Commentaire.findByPk(id);
      if (!commentaire) {
        return res.status(404).json({
          success: false,
          error: 'Commentaire non trouvé'
        });
      }

      await commentaire.update({ statut });

      res.json({
        success: true,
        message: `Commentaire ${statut} avec succès`
      });

    } catch (error) {
      console.error('Erreur lors de la modération du commentaire:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }
}

module.exports = CommentaireController;
