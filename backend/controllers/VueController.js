// controllers/VueController.js

const { Op } = require('sequelize');

class VueController {
  constructor(models) {
    this.models = models;
  }

  /**
   * Enregistrer une vue
   * POST /api/tracking/view
   */
  async trackView(req, res) {
    try {
      const { type_entite, id_entite, duree_secondes, source, page_source } = req.body;
      const userId = req.user?.id_user || null;
      
      // Validation
      const validTypes = ['oeuvre', 'evenement', 'lieu', 'artisanat', 'article'];
      if (!validTypes.includes(type_entite)) {
        return res.status(400).json({
          success: false,
          error: 'Type d\'entité invalide'
        });
      }

      if (!id_entite) {
        return res.status(400).json({
          success: false,
          error: 'ID de l\'entité requis'
        });
      }

      // Récupérer les infos de la requête
      const sessionId = req.session?.id || req.cookies?.sessionId || 
                       req.headers['x-session-id'] || 
                       `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip || 
                       req.connection?.remoteAddress || 
                       req.headers['x-forwarded-for']?.split(',')[0] || 
                       '0.0.0.0';

      // Vérifier si c'est une vue unique pour cette session
      const existingView = await this.models.Vue.findOne({
        where: {
          type_entite,
          id_entite,
          session_id: sessionId
        }
      });

      // Créer la vue
      const viewData = {
        type_entite,
        id_entite,
        id_user: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        referer: req.get('Referer'),
        source: source || this.detectSource(req.get('Referer')),
        page_source,
        session_id: sessionId,
        device_type: this.detectDeviceType(userAgent),
        is_unique: !existingView,
        duree_secondes: duree_secondes || null,
        date_vue: new Date()
      };

      const vue = await this.models.Vue.create(viewData);

      // Optionnel : Mettre à jour le compteur de vues sur l'entité
      await this.updateEntityViewCount(type_entite, id_entite);

      return res.json({
        success: true,
        data: {
          id_vue: vue.id_vue,
          is_unique: vue.is_unique
        }
      });

    } catch (error) {
      console.error('Erreur tracking vue:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement de la vue'
      });
    }
  }

  /**
   * Mettre à jour la durée d'une vue
   * PUT /api/tracking/view/:id
   */
  async updateViewDuration(req, res) {
    try {
      const { id } = req.params;
      const { duration } = req.body;

      const vue = await this.models.Vue.findByPk(id);
      if (!vue) {
        return res.status(404).json({
          success: false,
          error: 'Vue non trouvée'
        });
      }

      // Vérifier les permissions
      const canUpdate = vue.id_user ? 
        vue.id_user === req.user?.id_user : 
        vue.session_id === req.sessionID;

      if (!canUpdate && !req.user?.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à modifier cette vue'
        });
      }

      await vue.update({ 
        duree_secondes: parseInt(duration),
        date_fin: new Date()
      });

      return res.json({
        success: true,
        data: vue
      });

    } catch (error) {
      console.error('Erreur mise à jour durée:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour'
      });
    }
  }

  /**
   * Obtenir les statistiques de vues
   * GET /api/tracking/stats/:type/:id
   */
  async getViewStats(req, res) {
    try {
      const { type, id } = req.params;
      const { periode = '30j' } = req.query;

      // Calculer la date de début selon la période
      const dateDebut = new Date();
      switch (periode) {
        case '24h':
          dateDebut.setHours(dateDebut.getHours() - 24);
          break;
        case '7j':
          dateDebut.setDate(dateDebut.getDate() - 7);
          break;
        case '30j':
          dateDebut.setDate(dateDebut.getDate() - 30);
          break;
        case '90j':
          dateDebut.setDate(dateDebut.getDate() - 90);
          break;
        case 'all':
          dateDebut.setFullYear(2000);
          break;
      }

      // Statistiques globales
      const totalStats = await this.models.Vue.findOne({
        where: {
          type_entite: type,
          id_entite: parseInt(id)
        },
        attributes: [
          [this.models.sequelize.fn('COUNT', '*'), 'total_vues'],
          [this.models.sequelize.fn('COUNT', this.models.sequelize.literal('DISTINCT session_id')), 'vues_uniques'],
          [this.models.sequelize.fn('COUNT', this.models.sequelize.literal('DISTINCT id_user')), 'utilisateurs_uniques'],
          [this.models.sequelize.fn('AVG', this.models.sequelize.col('duree_secondes')), 'duree_moyenne']
        ]
      });

      // Évolution par jour
      const dailyStats = await this.models.Vue.findAll({
        where: {
          type_entite: type,
          id_entite: parseInt(id),
          date_vue: { [Op.gte]: dateDebut }
        },
        attributes: [
          [this.models.sequelize.fn('DATE', this.models.sequelize.col('date_vue')), 'date'],
          [this.models.sequelize.fn('COUNT', '*'), 'vues']
        ],
        group: [this.models.sequelize.fn('DATE', this.models.sequelize.col('date_vue'))],
        order: [[this.models.sequelize.fn('DATE', this.models.sequelize.col('date_vue')), 'ASC']]
      });

      // Répartition par device
      const deviceStats = await this.models.Vue.findAll({
        where: {
          type_entite: type,
          id_entite: parseInt(id),
          date_vue: { [Op.gte]: dateDebut }
        },
        attributes: [
          'device_type',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['device_type']
      });

      // Sources de trafic
      const sourceStats = await this.models.Vue.findAll({
        where: {
          type_entite: type,
          id_entite: parseInt(id),
          date_vue: { [Op.gte]: dateDebut },
          source: { [Op.ne]: null }
        },
        attributes: [
          'source',
          [this.models.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['source'],
        order: [[this.models.sequelize.literal('count'), 'DESC']],
        limit: 10
      });

      return res.json({
        success: true,
        data: {
          periode,
          total: totalStats?.dataValues || {},
          evolution: dailyStats.map(d => ({
            date: d.dataValues.date,
            vues: parseInt(d.dataValues.vues)
          })),
          devices: deviceStats.map(d => ({
            type: d.device_type,
            count: parseInt(d.dataValues.count)
          })),
          sources: sourceStats.map(s => ({
            source: s.source,
            count: parseInt(s.dataValues.count)
          }))
        }
      });

    } catch (error) {
      console.error('Erreur stats vues:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Helper : Détecter le type d'appareil
   */
  detectDeviceType(userAgent) {
    if (/bot|crawler|spider/i.test(userAgent)) return 'bot';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  /**
   * Helper : Détecter la source du trafic
   */
  detectSource(referer) {
    if (!referer) return 'direct';
    
    if (referer.includes('google')) return 'google';
    if (referer.includes('facebook')) return 'facebook';
    if (referer.includes('twitter') || referer.includes('x.com')) return 'twitter';
    if (referer.includes('linkedin')) return 'linkedin';
    if (referer.includes('instagram')) return 'instagram';
    
    return 'other';
  }

  /**
   * Helper : Mettre à jour le compteur sur l'entité
   */
  async updateEntityViewCount(type, id) {
    try {
      let model;
      let field = 'nombre_vues';
      let idField;

      switch (type) {
        case 'oeuvre':
          model = this.models.Oeuvre;
          idField = 'id_oeuvre';
          break;
        case 'evenement':
          model = this.models.Evenement;
          idField = 'id_evenement';
          break;
        case 'lieu':
          model = this.models.Lieu;
          idField = 'id_lieu';
          break;
        case 'artisanat':
          model = this.models.Artisanat;
          idField = 'id_artisanat';
          break;
        case 'article':
          model = this.models.Article;
          idField = 'id_article';
          break;
        default:
          return;
      }

      if (model) {
        // Vérifier si le champ existe dans le modèle
        const attributes = await model.describe();
        if (attributes[field]) {
          // Incrémenter le compteur
          await model.increment(field, { 
            where: { [idField]: id } 
          });
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour compteur:', error);
      // Ne pas faire échouer la requête principale
    }
  }
}

module.exports = VueController;