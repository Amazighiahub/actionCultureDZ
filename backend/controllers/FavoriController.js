const { Op } = require('sequelize');

class FavoriController {
 constructor(models) {
    this.models = models;
    // Récupérer l'instance sequelize depuis les modèles
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // Récupérer tous les favoris d'un utilisateur avec pagination
  async getUserFavoris(req, res) {
    try {
      const { page = 1, limit = 12, type } = req.query;
      const offset = (page - 1) * limit;
      const where = { id_user: req.user.id_user };

      // Filtrer par type si spécifié
      if (type) {
        where.type_entite = type;
      }

      const favoris = await this.models.Favori.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_ajout', 'DESC']],
        include: await this.getIncludesForFavoris()
      });

      // Enrichir les données avec les entités liées
      const favorisEnrichis = await this.enrichirFavoris(favoris.rows);

      res.json({
        success: true,
        data: {
          favoris: favorisEnrichis,
          pagination: {
            total: favoris.count,
            page: parseInt(page),
            pages: Math.ceil(favoris.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des favoris' 
      });
    }
  }

  // Ajouter un favori
  async addFavori(req, res) {
    try {
      const { type_entite, id_entite } = req.body;
      const id_user = req.user.id_user;

      // Validation
      const typesValides = ['oeuvre', 'evenement', 'lieu', 'artisanat'];
      if (!typesValides.includes(type_entite)) {
        return res.status(400).json({
          success: false,
          error: 'Type d\'entité invalide'
        });
      }

      // Vérifier que l'entité existe
      const entiteExiste = await this.verifierEntiteExiste(type_entite, id_entite);
      if (!entiteExiste) {
        return res.status(404).json({
          success: false,
          error: `${type_entite} non trouvé(e)`
        });
      }

      // Vérifier si le favori existe déjà
      const favoriExistant = await this.models.Favori.findOne({
        where: { id_user, type_entite, id_entite }
      });

      if (favoriExistant) {
        return res.status(409).json({
          success: false,
          error: 'Cet élément est déjà dans vos favoris'
        });
      }

      // Créer le favori
      const favori = await this.models.Favori.create({
        id_user,
        type_entite,
        id_entite,
        date_ajout: new Date()
      });

      // Récupérer les détails de l'entité
      const entiteDetails = await this.getEntiteDetails(type_entite, id_entite);

      res.status(201).json({
        success: true,
        message: 'Ajouté aux favoris avec succès',
        data: {
          favori,
          entite: entiteDetails
        }
      });

    } catch (error) {
      console.error('Erreur lors de l\'ajout du favori:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de l\'ajout du favori' 
      });
    }
  }

  // Supprimer un favori
  async removeFavori(req, res) {
    try {
      const { id } = req.params;
      const id_user = req.user.id_user;

      const favori = await this.models.Favori.findOne({
        where: { id_favori: id, id_user }
      });

      if (!favori) {
        return res.status(404).json({
          success: false,
          error: 'Favori non trouvé'
        });
      }

      await favori.destroy();

      res.json({
        success: true,
        message: 'Retiré des favoris avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la suppression du favori' 
      });
    }
  }

  // Supprimer un favori par type et ID d'entité
  async removeFavoriByEntity(req, res) {
    try {
      const { type, id } = req.params;
      const id_user = req.user.id_user;

      const favori = await this.models.Favori.findOne({
        where: { 
          id_user, 
          type_entite: type, 
          id_entite: id 
        }
      });

      if (!favori) {
        return res.status(404).json({
          success: false,
          error: 'Favori non trouvé'
        });
      }

      await favori.destroy();

      res.json({
        success: true,
        message: 'Retiré des favoris avec succès'
      });

    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Vérifier si une entité est dans les favoris
  async checkFavori(req, res) {
    try {
      const { type, id } = req.params;
      const id_user = req.user.id_user;

      const favori = await this.models.Favori.findOne({
        where: { 
          id_user, 
          type_entite: type, 
          id_entite: id 
        }
      });

      res.json({
        success: true,
        isFavorite: !!favori,
        data: favori
      });

    } catch (error) {
      console.error('Erreur lors de la vérification du favori:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Obtenir les statistiques des favoris d'un utilisateur
  async getUserFavorisStats(req, res) {
    try {
      const id_user = req.user.id_user;

      const stats = await this.models.Favori.findAll({
        where: { id_user },
        attributes: [
          'type_entite',
          [this.sequelize.fn('COUNT', this.sequelize.col('id_favori')), 'count']
        ],
        group: ['type_entite']
      });

      const total = await this.models.Favori.count({
        where: { id_user }
      });

      const statsFormatted = {};
      stats.forEach(stat => {
        statsFormatted[stat.type_entite] = parseInt(stat.dataValues.count);
      });

      res.json({
        success: true,
        data: {
          total,
          byType: statsFormatted
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Méthodes utilitaires

  async verifierEntiteExiste(type, id) {
    try {
      let entite;
      switch (type) {
        case 'oeuvre':
          entite = await this.models.Oeuvre.findByPk(id);
          break;
        case 'evenement':
          entite = await this.models.Evenement.findByPk(id);
          break;
        case 'lieu':
          entite = await this.models.Lieu.findByPk(id);
          break;
        case 'artisanat':
          entite = await this.models.Artisanat.findByPk(id);
          break;
      }
      return !!entite;
    } catch (error) {
      console.error('Erreur vérification entité:', error);
      return false;
    }
  }

  async getEntiteDetails(type, id) {
    try {
      let entite;
      switch (type) {
        case 'oeuvre':
          entite = await this.models.Oeuvre.findByPk(id, {
            include: [
              { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
              { model: this.models.Media, attributes: ['url'], limit: 1 }
            ]
          });
          break;
        case 'evenement':
          entite = await this.models.Evenement.findByPk(id, {
            include: [
              { model: this.models.TypeEvenement, attributes: ['nom_type'] },
              { model: this.models.Lieu, attributes: ['nom'] }
            ]
          });
          break;
        case 'lieu':
          entite = await this.models.Lieu.findByPk(id, {
            include: [
              { model: this.models.Wilaya, attributes: ['nom'] },
              { model: this.models.LieuMedia, attributes: ['url'], limit: 1 }
            ]
          });
          break;
        case 'artisanat':
          entite = await this.models.Artisanat.findByPk(id, {
            include: [
              {
                model: this.models.Oeuvre,
                include: [
                  { model: this.models.Media, attributes: ['url'], limit: 1 }
                ]
              },
              { model: this.models.Materiau, attributes: ['nom'] },
              { model: this.models.Technique, attributes: ['nom'] }
            ]
          });
          break;
      }
      return entite;
    } catch (error) {
      console.error('Erreur récupération détails entité:', error);
      return null;
    }
  }

  async enrichirFavoris(favoris) {
    const favorisEnrichis = [];

    for (const favori of favoris) {
      const entiteDetails = await this.getEntiteDetails(favori.type_entite, favori.id_entite);
      favorisEnrichis.push({
        ...favori.toJSON(),
        entite: entiteDetails
      });
    }

    return favorisEnrichis;
  }

  async getIncludesForFavoris() {
    return [];
  }

  // Obtenir les entités populaires (les plus mises en favoris)
  async getPopularFavorites(req, res) {
    try {
      const { type, limit = 10 } = req.query;
      const where = {};

      if (type) {
        where.type_entite = type;
      }

      const populaires = await this.models.Favori.findAll({
        where,
        attributes: [
          'type_entite',
          'id_entite',
          [this.sequelize.fn('COUNT', this.sequelize.col('id_favori')), 'count']
        ],
        group: ['type_entite', 'id_entite'],
        order: [[this.sequelize.literal('count'), 'DESC']],
        limit: parseInt(limit)
      });

      // Enrichir avec les détails des entités
      const populairesEnrichis = [];
      for (const item of populaires) {
        const entiteDetails = await this.getEntiteDetails(item.type_entite, item.id_entite);
        if (entiteDetails) {
          populairesEnrichis.push({
            type: item.type_entite,
            count: parseInt(item.dataValues.count),
            entite: entiteDetails
          });
        }
      }

      res.json({
        success: true,
        data: populairesEnrichis
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des favoris populaires:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }
}

module.exports = FavoriController;