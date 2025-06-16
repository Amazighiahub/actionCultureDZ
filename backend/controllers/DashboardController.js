// controllers/DashboardController.js

const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');
const TYPE_USER_IDS = {
  VISITEUR: 1,
  ECRIVAIN: 2,
  JOURNALISTE: 3,
  SCIENTIFIQUE: 4,
  ACTEUR: 5,
  ARTISTE: 6,
  ARTISAN: 7,
  REALISATEUR: 8,
  MUSICIEN: 9,
  PHOTOGRAPHE: 10,
  DANSEUR: 11,
  SCULPTEUR: 12,
  AUTRE: 13
};
class DashboardController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.cache = new Map(); // Cache en mémoire simple
    this.adminPermissions = this.setupPermissions();
  }

  setupPermissions() {
    return {
      'Admin': [
        'view_dashboard', 'validate_user', 'validate_oeuvre',
        'moderate_comment', 'moderate_signalement', 'view_reports',
        'manage_events', 'manage_patrimoine'
      ],
      'Super Admin': ['*'], // Tous les droits
      'Moderateur': [
        'view_dashboard', 'moderate_comment', 'moderate_signalement',
        'view_reports'
      ]
    };
  }

  // ========================================
  // MÉTHODES DE CACHE SIMPLIFIÉES
  // ========================================

  async getCachedData(key, generator, ttl = 300) {
    try {
      // Vérifier le cache en mémoire
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }

      // Générer les nouvelles données
      const data = await generator();
      
      // Mettre en cache
      this.cache.set(key, {
        data,
        expires: Date.now() + (ttl * 1000)
      });
      
      return data;
    } catch (error) {
      console.error('Erreur cache:', error);
      return await generator();
    }
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ========================================
  // VÉRIFICATION DES PERMISSIONS
  // ========================================

  async checkAdminPermission(userId, action) {
    try {
      const user = await this.models.User.findByPk(userId, {
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] },
          attributes: ['nom_role']
        }]
      });

      if (!user || !user.Roles) return false;

      // Vérifier les rôles
      for (const role of user.Roles) {
        const permissions = this.adminPermissions[role.nom_role];
        if (permissions) {
          if (permissions.includes('*') || permissions.includes(action)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return false;
    }
  }

  // ========================================
  // MÉTHODES PRINCIPALES
  // ========================================

  /**
   * Vue d'ensemble du dashboard
   */
  async getOverview(req, res) {
    try {
      console.log('📊 Dashboard overview demandé par:', req.user.email);

      const stats = await this.getCachedData(
        'dashboard:overview',
        () => this.generateOverviewStats(),
        300 // 5 minutes
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur getOverview:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
        message: error.message
      });
    }
  }

  async generateOverviewStats() {
    console.log('📈 Génération des statistiques overview...');
    
    const [
      totalUsers,
      totalOeuvres,
      totalEvenements,
      totalArtisanats,
      newUsersToday,
      oeuvresEnAttente,
      professionnelsEnAttente,
      signalementsEnAttente,
      sitesPatrimoniaux,
      vuesAujourdhui
    ] = await Promise.all([
      this.models.User.count(),
      this.models.Oeuvre.count({ where: { statut: 'publie' } }),
      this.models.Evenement.count(),
      this.models.Artisanat?.count() || 0,
      this.models.User.count({
        where: {
          date_creation: {
            [Op.gte]: moment().startOf('day').toDate()
          }
        }
      }),
      this.models.Oeuvre.count({ where: { statut: 'en_attente' } }),
      this.models.User.count({
        where: {
          id_type_user: { [Op.ne]: TYPE_USER_IDS.VISITEUR },
          statut_validation: 'en_attente'
        }
      }),
      this.models.Signalement?.count({ where: { statut: 'en_attente' } }) || 0,
      this.models.Lieu?.count() || 0,
      this.models.Vue?.count({
        where: {
          date_vue: {
            [Op.gte]: moment().startOf('day').toDate()
          }
        }
      }) || 0
    ]);

    return {
      stats: {
        totalUsers,
        totalOeuvres,
        totalEvenements,
        totalArtisanats,
        newUsersToday,
        sitesPatrimoniaux,
        vuesAujourdhui
      },
      pending: {
        oeuvresEnAttente,
        professionnelsEnAttente,
        signalementsEnAttente
      }
    };
  }

  /**
   * Statistiques détaillées
   */
  // Dans votre fichier backend/controllers/DashboardController.js
// Autour de la ligne 208 dans getDetailedStats

// SOLUTION : Nettoyer les données avant de les envoyer
// Dans DashboardController.js, remplacez la méthode getDetailedStats (lignes ~195-270) par :

async getDetailedStats(req, res) {
  try {
    const { period = 'month' } = req.query;
    
    console.log('📊 Génération des statistiques détaillées pour la période:', period);
    
    const stats = await this.getCachedData(
      `dashboard:stats:${period}`,
      () => this.generateDetailedStats(period),
      600 // 10 minutes
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur getDetailedStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Ajouter cette méthode comme méthode de classe (pas avec const) :
cleanSequelizeResponse(data) {
  if (!data) return data;
  
  // Si c'est un tableau
  if (Array.isArray(data)) {
    return data.map(item => this.cleanSequelizeResponse(item));
  }
  
  // Si c'est une instance Sequelize
  if (data.dataValues || data.get) {
    try {
      return data.get({ plain: true });
    } catch (error) {
      console.error('Erreur de sérialisation:', error);
      return {};
    }
  }
  
  // Si c'est un objet simple
  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      // Éviter les références circulaires et les fonctions
      if (typeof value !== 'function' && key !== '_previousDataValues') {
        cleaned[key] = this.cleanSequelizeResponse(value);
      }
    }
    return cleaned;
  }
  
  return data;
}

// Puis modifiez generateDetailedStats pour utiliser les bonnes méthodes :
async generateDetailedStats(period) {
  const dateLimit = this.getDateLimit(period);
  
  const [
    userGrowth,
    contentByType,
    recentActivity,
    topContributors
  ] = await Promise.all([
    this.getUserGrowth(dateLimit),
    this.getContentByType(),
    this.getRecentActivity(),
    this.getTopContributors()
  ]);

  // Nettoyer les données avant de les retourner
  const cleanedData = {
    period,
    dateLimit,
    userGrowth: this.cleanSequelizeResponse(userGrowth),
    contentByType: this.cleanSequelizeResponse(contentByType),
    recentActivity: this.cleanSequelizeResponse(recentActivity),
    topContributors: this.cleanSequelizeResponse(topContributors)
  };

  return cleanedData;
}
  async generateDetailedStats(period) {
    const dateLimit = this.getDateLimit(period);
    
    const [
      userGrowth,
      contentByType,
      recentActivity,
      topContributors
    ] = await Promise.all([
      this.getUserGrowth(dateLimit),
      this.getContentByType(),
      this.getRecentActivity(),
      this.getTopContributors()
    ]);

    return {
      period,
      dateLimit,
      userGrowth,
      contentByType,
      recentActivity,
      topContributors
    };
  }

  /**
   * Dashboard patrimoine
   */
  async getPatrimoineDashboard(req, res) {
    try {
      const stats = await this.getCachedData(
        'dashboard:patrimoine',
        () => this.generatePatrimoineStats(),
        600 // 10 minutes
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur getPatrimoineDashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques patrimoine'
      });
    }
  }

  async generatePatrimoineStats() {
    try {
      const totalSites = await this.models.Lieu?.count() || 0;
      
      let sitesParType = [];
      let sitesParWilaya = [];
      let sitesRecents = [];
      let qrScans = 0;
      
      if (this.models.Lieu) {
        [sitesParType, sitesParWilaya, sitesRecents] = await Promise.all([
          this.models.Lieu.findAll({
            attributes: [
              'typeLieu',
              [this.sequelize.fn('COUNT', '*'), 'count']
            ],
            group: ['typeLieu'],
            raw: true
          }),
          this.models.Lieu.findAll({
            attributes: [
              'wilaya',
              [this.sequelize.fn('COUNT', '*'), 'count']
            ],
            where: { wilaya: { [Op.ne]: null } },
            group: ['wilaya'],
            order: [[literal('count'), 'DESC']],
            limit: 10,
            raw: true
          }),
          this.models.Lieu.findAll({
            attributes: ['id_lieu', 'nom_fr', 'nom_ar', 'typeLieu', 'date_creation'],
            order: [['date_creation', 'DESC']],
            limit: 5
          })
        ]);
      }

      // Statistiques QR si disponible
      if (this.models.QRScan) {
        qrScans = await this.models.QRScan.count({
          where: {
            scan_date: {
              [Op.gte]: moment().subtract(30, 'days').toDate()
            }
          }
        });
      }

      return {
        overview: {
          totalSites,
          parcoursActifs: await this.getActiveParcoursCount(),
          qrCodesGeneres: totalSites, // Chaque site a un QR code
          visitesRecentes: qrScans
        },
        distribution: {
          parType: sitesParType,
          parWilaya: sitesParWilaya
        },
        recentSites: sitesRecents,
        trends: {
          evolution: await this.getPatrimoineEvolution(),
          popularSites: await this.getPopularPatrimoineSites()
        }
      };
    } catch (error) {
      console.error('Erreur generatePatrimoineStats:', error);
      return {
        overview: { totalSites: 0 },
        distribution: { parType: [], parWilaya: [] }
      };
    }
  }

  /**
   * Statistiques QR complètes
   */
  async getQRStats(req, res) {
    try {
      const { period = 30 } = req.query;
      const startDate = moment().subtract(period, 'days').toDate();
      
      const stats = await this.getCachedData(
        `dashboard:qr:${period}`,
        () => this.generateQRStats(startDate),
        900
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erreur getQRStats:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des stats QR'
      });
    }
  }

  async generateQRStats(startDate) {
    try {
      if (!this.models.QRScan) {
        return {
          overview: {
            totalScans: 0,
            uniqueScans: 0,
            uniqueRate: 0
          },
          evolution: [],
          topSites: [],
          devices: [],
          locations: []
        };
      }

      const [totalScans, uniqueScans, evolution, topSites, devices] = await Promise.all([
        this.models.QRScan.count({
          where: { scan_date: { [Op.gte]: startDate } }
        }),
        this.models.QRScan.count({
          where: { scan_date: { [Op.gte]: startDate } },
          distinct: true,
          col: 'user_id'
        }),
        this.models.QRScan.findAll({
          attributes: [
            [fn('DATE', col('scan_date')), 'date'],
            [fn('COUNT', '*'), 'scans']
          ],
          where: { scan_date: { [Op.gte]: startDate } },
          group: [fn('DATE', col('scan_date'))],
          order: [[fn('DATE', col('scan_date')), 'ASC']],
          raw: true
        }),
        this.models.QRScan.findAll({
          attributes: [
            'lieu_id',
            [fn('COUNT', '*'), 'scan_count']
          ],
          where: { scan_date: { [Op.gte]: startDate } },
          group: ['lieu_id'],
          order: [[literal('scan_count'), 'DESC']],
          limit: 10,
          include: [{
            model: this.models.Lieu,
            attributes: ['nom_fr', 'nom_ar', 'typeLieu']
          }]
        }),
        this.models.QRScan.findAll({
          attributes: [
            'device_type',
            [fn('COUNT', '*'), 'count']
          ],
          where: { scan_date: { [Op.gte]: startDate } },
          group: ['device_type'],
          raw: true
        })
      ]);

      return {
        overview: {
          totalScans,
          uniqueScans,
          uniqueRate: totalScans > 0 ? ((uniqueScans / totalScans) * 100).toFixed(2) : 0,
          averageScansPerDay: Math.round(totalScans / moment().diff(startDate, 'days'))
        },
        evolution,
        topSites,
        devices,
        peakHours: await this.getQRScanPeakHours(startDate)
      };
    } catch (error) {
      console.error('Erreur generateQRStats:', error);
      return {
        overview: { totalScans: 0, uniqueScans: 0, uniqueRate: 0 },
        evolution: [],
        topSites: [],
        devices: []
      };
    }
  }

  /**
   * Utilisateurs en attente
   */
  async getPendingUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const users = await this.models.User.findAndCountAll({
        where: {
          id_type_user: { [Op.ne]: TYPE_USER_IDS.VISITEUR },
          statut_validation: 'en_attente'
        },
        attributes: { exclude: ['password'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          items: users.rows,
          pagination: {
            total: users.count,
            page: parseInt(page),
            pages: Math.ceil(users.count / limit),
            limit: parseInt(limit),
            hasNext: page < Math.ceil(users.count / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Erreur getPendingUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs en attente'
      });
    }
  }

  /**
   * Œuvres en attente
   */
  async getPendingOeuvres(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where: { statut: 'en_attente' },
        include: [
          {
            model: this.models.User,
            as: 'Saiseur',
            attributes: ['id_user', 'nom', 'prenom', 'email']
          },
          {
            model: this.models.Media,
            limit: 1,
            attributes: ['url', 'type_media']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      // Formatter les données
      const items = oeuvres.rows.map(oeuvre => ({
        id_oeuvre: oeuvre.id_oeuvre,
        titre: oeuvre.titre,
        description: oeuvre.description,
        type_oeuvre: oeuvre.type_oeuvre,
        date_creation: oeuvre.date_creation,
        auteur: oeuvre.Saiseur ? {
          id: oeuvre.Saiseur.id_user,
          nom: oeuvre.Saiseur.nom,
          prenom: oeuvre.Saiseur.prenom
        } : null,
        medias: oeuvre.Media || []
      }));

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            total: oeuvres.count,
            page: parseInt(page),
            pages: Math.ceil(oeuvres.count / limit),
            limit: parseInt(limit),
            hasNext: page < Math.ceil(oeuvres.count / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Erreur getPendingOeuvres:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des œuvres en attente'
      });
    }
  }

  /**
   * File de modération
   */
  async getModerationQueue(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const signalements = await this.models.Signalement.findAndCountAll({
        where: { statut: 'en_attente' },
        include: [
          {
            model: this.models.User,
            as: 'Signalant',
            attributes: ['nom', 'prenom']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['priorite', 'DESC'], ['date_signalement', 'ASC']]
      });

      // Formatter les données
      const items = signalements.rows.map(s => ({
        id: s.id_signalement,
        type: s.type_entite,
        entity_id: s.id_entite,
        entity_title: s.titre || 'Non disponible',
        reason: s.motif,
        reported_by: s.Signalant ? {
          id: s.Signalant.id_user,
          nom: s.Signalant.nom
        } : null,
        date_signalement: s.date_signalement,
        status: s.statut
      }));

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            total: signalements.count,
            page: parseInt(page),
            pages: Math.ceil(signalements.count / limit),
            limit: parseInt(limit),
            hasNext: page < Math.ceil(signalements.count / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Erreur getModerationQueue:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de la file de modération'
      });
    }
  }

  /**
   * Signalements
   */
  async getReportedContent(req, res) {
    try {
      return this.getModerationQueue(req, res);
    } catch (error) {
      console.error('Erreur getReportedContent:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des signalements'
      });
    }
  }

  /**
   * Actions administratives principales
   */
  async performAdminAction(req, res) {
    try {
      const { action, entityType, entityId, data = {} } = req.body;
      
      console.log('🔧 Action admin demandée:', {
        action,
        entityType,
        entityId,
        userId: req.user.id_user
      });

      let result;
      
      switch (action) {
        case 'validate_user':
          result = await this.validateUserAction(entityId, data);
          break;
          
        case 'validate_oeuvre':
          result = await this.validateOeuvreAction(entityId, data);
          break;
          
        case 'moderate_signalement':
          result = await this.moderateSignalementAction(entityId, data, req.user.id_user);
          break;
          
        case 'suspend_user':
          result = await this.suspendUserAction(entityId, data);
          break;
          
        case 'bulk_moderate':
          result = await this.bulkModerateAction(data, req.user.id_user);
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: `Action non reconnue: ${action}`
          });
      }

      // Vider le cache concerné
      this.clearCache(entityType);

      res.json({
        success: true,
        message: result.message || `Action "${action}" effectuée avec succès`,
        data: result.data || result
      });

    } catch (error) {
      console.error('Erreur performAdminAction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors de l\'action administrative'
      });
    }
  }

  /**
   * Validation d'un utilisateur
   */
  async validateUserAction(userId, data) {
    const { valide, validateur_id, raison } = data;
    
    console.log(`📋 Validation utilisateur ${userId}:`, { valide, validateur_id, raison });
    
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    
    const updateData = {
      statut_validation: valide ? 'valide' : 'rejete',
      date_validation: new Date(),
      validateur_id: validateur_id
    };
    
    if (!valide && raison) {
      updateData.raison_rejet = raison;
    }
    
    if (user.type_user !== 'visiteur') {
      updateData.statut = valide ? 'actif' : 'inactif';
    }
    
    await user.update(updateData);
    await user.reload();
    
    console.log('✅ Utilisateur mis à jour:', {
      id: user.id_user,
      statut_validation: user.statut_validation,
      statut: user.statut
    });
    
    // Notification
    if (this.models.Notification) {
      try {
        await this.models.Notification.create({
          user_id: userId,
          type: valide ? 'validation_acceptee' : 'validation_refusee',
          titre: valide ? 'Votre compte a été validé' : 'Validation refusée',
          message: valide 
            ? 'Félicitations ! Votre compte professionnel a été validé.'
            : `Votre demande a été refusée. ${raison ? `Raison : ${raison}` : ''}`,
          lue: false
        });
      } catch (err) {
        console.error('Erreur notification:', err);
      }
    }
    
    return {
      message: valide ? 'Utilisateur validé avec succès' : 'Utilisateur rejeté',
      data: {
        id_user: user.id_user,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        id_type_user: user.id_type_user,
        statut: user.statut,
        statut_validation: user.statut_validation
      }
    };
  }

  /**
   * Méthode validateUser pour compatibilité
   */
  async validateUser(userId, data) {
    return this.validateUserAction(userId, data);
  }

  /**
   * Validation d'une œuvre
   */
  async validateOeuvreAction(oeuvreId, data) {
    const { valide, validateur_id, raison_rejet } = data;
    
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
    if (!oeuvre) {
      throw new Error('Œuvre non trouvée');
    }
    
    await oeuvre.update({
      statut: valide ? 'publie' : 'rejete',
      date_validation: new Date(),
      validateur_id: validateur_id,
      raison_rejet: !valide ? raison_rejet : null
    });
    
    return {
      message: valide ? 'Œuvre validée avec succès' : 'Œuvre rejetée',
      data: oeuvre
    };
  }

  /**
   * Méthode validateOeuvre pour compatibilité
   */
  async validateOeuvre(oeuvreId, data) {
    return this.validateOeuvreAction(oeuvreId, data);
  }

  /**
   * Modération d'un signalement
   */
  async moderateSignalementAction(signalementId, data, moderatorId) {
    const signalement = await this.models.Signalement.findByPk(signalementId);
    if (!signalement) {
      throw new Error('Signalement non trouvé');
    }
    
    await signalement.update({
      statut: 'traite',
      id_moderateur: moderatorId,
      date_traitement: new Date(),
      action_prise: data.action,
      notes_moderation: data.notes
    });
    
    return {
      message: 'Signalement traité avec succès',
      data: signalement
    };
  }

  /**
   * Suspension d'un utilisateur
   */
  async suspendUserAction(userId, data) {
    const { raison, duree } = data;
    
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    
    await user.update({
      statut: 'suspendu',
      date_suspension: new Date(),
      raison_suspension: raison,
      duree_suspension: duree || null
    });
    
    return {
      message: 'Utilisateur suspendu avec succès',
      data: user
    };
  }

  /**
   * Modération en lot
   */
  async bulkModerateAction(data, moderatorId) {
    const { signalements = [], action, notes } = data;
    const results = [];
    
    for (const signalementId of signalements) {
      try {
        const result = await this.moderateSignalementAction(
          signalementId,
          { action, notes },
          moderatorId
        );
        results.push({ id: signalementId, success: true, result });
      } catch (error) {
        results.push({ id: signalementId, success: false, error: error.message });
      }
    }
    
    return {
      message: `${results.filter(r => r.success).length} signalements traités avec succès`,
      data: results
    };
  }

  /**
   * Analytics avancées
   */
  async getAdvancedAnalytics(req, res) {
    try {
      const { period = 30 } = req.query;
      
      const analytics = await this.getCachedData(
        `dashboard:analytics:${period}`,
        () => this.generateAdvancedAnalytics(period),
        3600 // 1 heure
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Erreur getAdvancedAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des analytics'
      });
    }
  }

  async generateAdvancedAnalytics(period) {
    const startDate = moment().subtract(period, 'days').toDate();
    
    const [userStats, contentStats, engagementStats] = await Promise.all([
      this.getUserAnalytics(startDate),
      this.getContentAnalytics(startDate),
      this.getEngagementAnalytics(startDate)
    ]);

    return {
      period,
      startDate,
      userStats,
      contentStats,
      engagementStats
    };
  }

  /**
   * Logs d'audit
   */
  async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 50, userId, action } = req.query;
      const offset = (page - 1) * limit;
      
      const where = {};
      if (userId) where.id_admin = userId;
      if (action) where.action = action;

      const logs = await this.models.AuditLog.findAndCountAll({
        where,
        include: [{
          model: this.models.User,
          as: 'Admin',
          attributes: ['nom', 'prenom', 'email']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_action', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          logs: logs.rows,
          pagination: {
            total: logs.count,
            page: parseInt(page),
            pages: Math.ceil(logs.count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Erreur getAuditLogs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des logs'
      });
    }
  }

  /**
   * Rapport d'activité
   */
  async generateActivityReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const start = startDate ? new Date(startDate) : moment().subtract(1, 'month').toDate();
      const end = endDate ? new Date(endDate) : new Date();

      const report = await this.generateReport(start, end);

      if (format === 'excel') {
        // TODO: Implémenter l'export Excel
        return res.status(501).json({
          success: false,
          error: 'Export Excel non implémenté'
        });
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Erreur generateActivityReport:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la génération du rapport'
      });
    }
  }

  /**
   * Obtenir les détails d'un utilisateur
   */
  async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      
      const user = await this.models.User.findByPk(id, {
        attributes: { exclude: ['password'] },
        include: [
          {
            model: this.models.Role,
            as: 'Roles',
            through: { attributes: [] },
            attributes: ['id_role', 'nom_role']
          }
        ]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Erreur getUserDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de l\'utilisateur'
      });
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Retirer les champs sensibles
      delete updateData.password;
      delete updateData.id_user;
      delete updateData.date_creation;
      
      const user = await this.models.User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      // Mettre à jour l'utilisateur
      await user.update(updateData);
      
      // Recharger avec les associations
      await user.reload({
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        }]
      });
      
      // Log de l'action
      console.log(`✅ Utilisateur ${id} mis à jour par ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        data: user
      });
    } catch (error) {
      console.error('Erreur updateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de l\'utilisateur'
      });
    }
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  /**
   * Supprimer un utilisateur (soft delete)
   */
  /**
   * Supprimer un utilisateur (hard delete - suppression définitive)
   */
  /**
 * Version simplifiée de deleteUser - suppression directe sans gérer les relations
 * À utiliser si la version complète génère des erreurs
 */
/**
   * Supprimer un utilisateur (hard delete - suppression définitive)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Charger l'utilisateur avec ses rôles
      const user = await this.models.User.findByPk(id, {
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        }]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      // Vérifier qu'on ne supprime pas un admin
      if (user.Roles && user.Roles.some(r => r.nom_role === 'Admin' || r.nom_role === 'Super Admin')) {
        return res.status(403).json({
          success: false,
          error: 'Impossible de supprimer un administrateur'
        });
      }
      
      // Vérifier qu'on ne se supprime pas soi-même
      if (user.id_user === req.user.id_user) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez pas supprimer votre propre compte'
        });
      }
      
      // SUPPRESSION DÉFINITIVE (Hard Delete)
      console.log(`🗑️ Suppression DÉFINITIVE de l'utilisateur ${id} par ${req.user.email}`);
      
      // 1. Gérer les logs d'audit - IMPORTANT: faire ceci EN PREMIER
      if (this.models.AuditLog) {
        try {
          const auditCount = await this.models.AuditLog.count({ where: { id_admin: id } });
          if (auditCount > 0) {
            // Anonymiser les logs au lieu de les supprimer pour garder l'historique
            await this.models.AuditLog.update(
              { id_admin: null },
              { where: { id_admin: id } }
            );
            console.log(`✅ ${auditCount} logs d'audit anonymisés`);
          }
        } catch (e) {
          console.log('⚠️ Erreur avec AuditLog:', e.message);
        }
      }
      
      // 2. Supprimer les relations many-to-many
      
      // Relations UserRole
      if (this.models.UserRole) {
        await this.models.UserRole.destroy({
          where: { id_user: id }
        });
        console.log('✅ Relations UserRole supprimées');
      }
      
      // Relations UserOrganisation
      if (this.models.UserOrganisation) {
        await this.models.UserOrganisation.destroy({
          where: { id_user: id }
        });
        console.log('✅ Relations UserOrganisation supprimées');
      }
      
      // Relations OeuvreUser
      if (this.models.OeuvreUser) {
        await this.models.OeuvreUser.destroy({
          where: { id_user: id }
        });
        console.log('✅ Relations OeuvreUser supprimées');
      }
      
      // Relations EvenementUser
      if (this.models.EvenementUser) {
        await this.models.EvenementUser.destroy({
          where: { id_user: id }
        });
        console.log('✅ Relations EvenementUser supprimées');
      }
      
      // 3. Gérer les contenus associés - ANONYMISER au lieu de supprimer
      const anonymousUserId = null; // Mettre null pour anonymiser
      
      // Œuvres saisies
      if (this.models.Oeuvre) {
        const oeuvresCount = await this.models.Oeuvre.count({ where: { saisi_par: id } });
        if (oeuvresCount > 0) {
          await this.models.Oeuvre.update(
            { saisi_par: anonymousUserId },
            { where: { saisi_par: id } }
          );
          console.log(`✅ ${oeuvresCount} œuvres saisies anonymisées`);
        }
        
        // Œuvres validées
        const validatedCount = await this.models.Oeuvre.count({ where: { validateur_id: id } });
        if (validatedCount > 0) {
          await this.models.Oeuvre.update(
            { validateur_id: anonymousUserId },
            { where: { validateur_id: id } }
          );
          console.log(`✅ ${validatedCount} œuvres validées anonymisées`);
        }
      }
      
      // Événements organisés
      if (this.models.Evenement) {
        const evenementsCount = await this.models.Evenement.count({ where: { id_user: id } });
        if (evenementsCount > 0) {
          await this.models.Evenement.update(
            { id_user: anonymousUserId },
            { where: { id_user: id } }
          );
          console.log(`✅ ${evenementsCount} événements anonymisés`);
        }
      }
      
      // Commentaires
      if (this.models.Commentaire) {
        const commentairesCount = await this.models.Commentaire.count({ where: { id_user: id } });
        if (commentairesCount > 0) {
          await this.models.Commentaire.update(
            { id_user: anonymousUserId },
            { where: { id_user: id } }
          );
          console.log(`✅ ${commentairesCount} commentaires anonymisés`);
        }
      }
      
      // Critiques et évaluations
      if (this.models.CritiqueEvaluation) {
        const critiquesCount = await this.models.CritiqueEvaluation.count({ where: { id_user: id } });
        if (critiquesCount > 0) {
          await this.models.CritiqueEvaluation.update(
            { id_user: anonymousUserId },
            { where: { id_user: id } }
          );
          console.log(`✅ ${critiquesCount} critiques anonymisées`);
        }
      }
      
      // Signalements (si l'utilisateur a fait des signalements)
      if (this.models.Signalement) {
        try {
          const signalementsCount = await this.models.Signalement.count({ where: { id_user: id } });
          if (signalementsCount > 0) {
            await this.models.Signalement.update(
              { id_user: anonymousUserId },
              { where: { id_user: id } }
            );
            console.log(`✅ ${signalementsCount} signalements anonymisés`);
          }
          
          // Signalements modérés par cet utilisateur
          const moderatedCount = await this.models.Signalement.count({ where: { id_moderateur: id } });
          if (moderatedCount > 0) {
            await this.models.Signalement.update(
              { id_moderateur: anonymousUserId },
              { where: { id_moderateur: id } }
            );
            console.log(`✅ ${moderatedCount} signalements modérés anonymisés`);
          }
        } catch (e) {
          console.log('⚠️ Erreur avec Signalement:', e.message);
        }
      }
      
      // 4. Supprimer les favoris
      if (this.models.Favori) {
        const favorisCount = await this.models.Favori.count({ where: { id_user: id } });
        if (favorisCount > 0) {
          await this.models.Favori.destroy({
            where: { id_user: id }
          });
          console.log(`✅ ${favorisCount} favoris supprimés`);
        }
      }
      
      // 5. Supprimer les notifications
      if (this.models.Notification) {
        try {
          const notifCount = await this.models.Notification.count({ where: { id_user: id } });
          if (notifCount > 0) {
            await this.models.Notification.destroy({
              where: { id_user: id }
            });
            console.log(`✅ ${notifCount} notifications supprimées`);
          }
        } catch (e) {
          console.log('⚠️ Table Notification non trouvée ou erreur:', e.message);
        }
      }
      
      // 6. Supprimer les sessions
      if (this.models.Session) {
        try {
          await this.models.Session.destroy({
            where: { id_user: id }
          });
          console.log('✅ Sessions supprimées');
        } catch (e) {
          console.log('⚠️ Table Session non trouvée ou erreur:', e.message);
        }
      }
      
      // 7. Enregistrer la suppression dans les logs AVANT de supprimer l'utilisateur
      if (this.models.AuditLog) {
        try {
          await this.models.AuditLog.create({
            id_admin: req.user.id_user,
            action: 'DELETE_USER',
            type_entite: 'user',
            id_entite: id,
            details: JSON.stringify({
              method: 'hard_delete',
              user_email: user.email,
              user_type: user.type_user,
              user_name: `${user.nom} ${user.prenom}`,
              deleted_at: new Date().toISOString()
            }),
            date_action: new Date()
          });
        } catch (e) {
          console.log('⚠️ Erreur lors de l\'enregistrement du log de suppression:', e.message);
        }
      }
      
      // 8. SUPPRIMER DÉFINITIVEMENT L'UTILISATEUR
      await user.destroy();
      console.log(`✅ Utilisateur ${id} supprimé définitivement de la base de données`);
      
      // 9. Vider le cache
      this.clearCache(`user:${id}`);
      this.clearCache('users');
      
      res.json({
        success: true,
        message: 'Utilisateur supprimé définitivement avec succès',
        data: {
          method: 'hard_delete',
          userId: parseInt(id),
          deletedBy: req.user.id_user,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur deleteUser:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la suppression de l\'utilisateur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  /**
   * Réactiver un utilisateur suspendu
   */
  async reactivateUser(req, res) {
    try {
      const { id } = req.params;
      
      const user = await this.models.User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      await user.update({
        statut: 'actif',
        date_suspension: null,
        date_fin_suspension: null,
        raison_suspension: null,
        suspendu_par: null
      });
      
      console.log(`▶️ Utilisateur ${id} réactivé`);
      
      res.json({
        success: true,
        message: 'Utilisateur réactivé avec succès',
        data: user
      });
    } catch (error) {
      console.error('Erreur reactivateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la réactivation de l\'utilisateur'
      });
    }
  }

  /**
   * Changer le rôle d'un utilisateur
   */
  async changeUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role_id } = req.body;
      
      const [user, role] = await Promise.all([
        this.models.User.findByPk(id),
        this.models.Role.findByPk(role_id)
      ]);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Rôle non trouvé'
        });
      }
      
      // Supprimer les rôles existants
      await this.models.UserRole.destroy({
        where: { id_user: id }
      });
      
      // Ajouter le nouveau rôle
      await this.models.UserRole.create({
        id_user: id,
        id_role: role_id
      });
      
      console.log(`🎭 Rôle de l'utilisateur ${id} changé en ${role.nom_role}`);
      
      res.json({
        success: true,
        message: `Rôle changé en ${role.nom_role}`,
        data: { user_id: id, role: role.nom_role }
      });
    } catch (error) {
      console.error('Erreur changeUserRole:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors du changement de rôle'
      });
    }
  }

  /**
   * Réinitialiser le mot de passe d'un utilisateur
   */
  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const crypto = require('crypto');
      
      const user = await this.models.User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }
      
      // Générer un mot de passe temporaire
      const temporaryPassword = crypto.randomBytes(8).toString('hex');
      
      // Hasher le mot de passe
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      
      await user.update({
        password: hashedPassword,
        doit_changer_mdp: true
      });
      
      // Envoyer un email avec le nouveau mot de passe
      // TODO: Implémenter l'envoi d'email
      
      console.log(`🔑 Mot de passe réinitialisé pour l'utilisateur ${id}`);
      
      res.json({
        success: true,
        message: 'Mot de passe réinitialisé',
        data: {
          temporaryPassword,
          note: 'L\'utilisateur devra changer ce mot de passe à sa prochaine connexion'
        }
      });
    } catch (error) {
      console.error('Erreur resetUserPassword:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la réinitialisation du mot de passe'
      });
    }
  }

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(req, res) {
    try {
      const { q, type = 'nom' } = req.query;
      
      let whereClause = {};
      switch (type) {
        case 'email':
          whereClause = { email: { [Op.like]: `%${q}%` } };
          break;
        case 'telephone':
          whereClause = { telephone: { [Op.like]: `%${q}%` } };
          break;
        default:
          whereClause = {
            [Op.or]: [
              { nom: { [Op.like]: `%${q}%` } },
              { prenom: { [Op.like]: `%${q}%` } }
            ]
          };
      }
      
      const users = await this.models.User.findAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        limit: 20,
        order: [['nom', 'ASC'], ['prenom', 'ASC']]
      });
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Erreur searchUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recherche'
      });
    }
  }

  /**
   * Actions en masse sur les utilisateurs
   */
  async bulkUserAction(req, res) {
    try {
      const { user_ids, action, role_id } = req.body;
      
      let updateData = {};
      let message = '';
      
      switch (action) {
        case 'activate':
          updateData = { statut: 'actif' };
          message = 'Utilisateurs activés';
          break;
        case 'deactivate':
          updateData = { statut: 'inactif' };
          message = 'Utilisateurs désactivés';
          break;
        case 'delete':
          updateData = { 
            statut: 'supprime',
            date_suppression: new Date()
          };
          message = 'Utilisateurs supprimés';
          break;
        case 'change_role':
          if (!role_id) {
            return res.status(400).json({
              success: false,
              error: 'ID de rôle requis pour cette action'
            });
          }
          // Gérer le changement de rôle différemment
          break;
      }
      
      if (action === 'change_role') {
        // Changement de rôle en masse
        await this.models.UserRole.destroy({
          where: { id_user: user_ids }
        });
        
        const roleAssignments = user_ids.map(id => ({
          id_user: id,
          id_role: role_id
        }));
        
        await this.models.UserRole.bulkCreate(roleAssignments);
        message = 'Rôles mis à jour';
      } else {
        // Autres actions
        await this.models.User.update(updateData, {
          where: { id_user: user_ids }
        });
      }
      
      console.log(`📋 Action en masse '${action}' sur ${user_ids.length} utilisateurs`);
      
      res.json({
        success: true,
        message: `${message} pour ${user_ids.length} utilisateurs`
      });
    } catch (error) {
      console.error('Erreur bulkUserAction:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'action en masse'
      });
    }
  }

  /**
   * Export des utilisateurs
   */
  async exportUsers(req, res) {
    try {
      const { format = 'excel', type_user, statut, start_date, end_date } = req.query;
      
      // Construire les conditions
      const where = {};
      if (type_user) where.id_type_user = type_user;
      if (statut) where.statut = statut;
      if (start_date && end_date) {
        where.date_creation = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }
      
      const users = await this.models.User.findAll({
        where,
        attributes: { exclude: ['password'] },
        include: [{
          model: this.models.Role,
          as: 'Roles',
          through: { attributes: [] }
        }],
        order: [['date_creation', 'DESC']]
      });
      
      if (format === 'csv') {
        // Export CSV
        const csv = this.generateCSV(users);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
        res.send(csv);
      } else {
        // Export Excel
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Utilisateurs');
        
        // En-têtes
        worksheet.columns = [
          { header: 'ID', key: 'id_user', width: 10 },
          { header: 'Nom', key: 'nom', width: 20 },
          { header: 'Prénom', key: 'prenom', width: 20 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Type', key: 'id_type_user', width: 15 },
          { header: 'Statut', key: 'statut', width: 15 },
          { header: 'Date inscription', key: 'date_creation', width: 20 },
          { header: 'Rôles', key: 'roles', width: 30 }
        ];
        
        // Données
        users.forEach(user => {
          worksheet.addRow({
            ...user.toJSON(),
            roles: user.Roles ? user.Roles.map(r => r.nom_role).join(', ') : ''
          });
        });
        
        // Style
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users_export.xlsx');
        
        await workbook.xlsx.write(res);
        res.end();
      }
      
      console.log(`📊 Export de ${users.length} utilisateurs en ${format}`);
      
    } catch (error) {
      console.error('Erreur exportUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'export'
      });
    }
  }

  /**
   * Obtenir les alertes système
   */
  async getAlerts(req, res) {
    try {
      const alerts = await this.getCachedData(
        'dashboard:alerts',
        () => this.generateAlerts(),
        300
      );

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Erreur getAlerts:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des alertes'
      });
    }
  }

  async generateAlerts() {
    const alerts = [];
    
    // Vérifier les utilisateurs en attente depuis longtemps
    const pendingUsersCount = await this.models.User.count({
      where: {
        statut_validation: 'en_attente',
        date_creation: {
          [Op.lt]: moment().subtract(7, 'days').toDate()
        }
      }
    });
    
    if (pendingUsersCount > 0) {
      alerts.push({
        type: 'warning',
        category: 'users',
        message: `${pendingUsersCount} utilisateurs en attente depuis plus de 7 jours`,
        priority: 'high',
        timestamp: new Date()
      });
    }
    
    // Vérifier les œuvres en attente
    const pendingOeuvresCount = await this.models.Oeuvre.count({
      where: {
        statut: 'en_attente',
        date_creation: {
          [Op.lt]: moment().subtract(3, 'days').toDate()
        }
      }
    });
    
    if (pendingOeuvresCount > 10) {
      alerts.push({
        type: 'warning',
        category: 'content',
        message: `${pendingOeuvresCount} œuvres en attente de validation`,
        priority: 'medium',
        timestamp: new Date()
      });
    }
    
    // Vérifier les signalements non traités
    const untreatedReports = await this.models.Signalement?.count({
      where: {
        statut: 'en_attente',
        priorite: 'urgente',
        date_signalement: {
          [Op.lt]: moment().subtract(24, 'hours').toDate()
        }
      }
    }) || 0;
    
    if (untreatedReports > 0) {
      alerts.push({
        type: 'error',
        category: 'moderation',
        message: `${untreatedReports} signalements urgents non traités depuis 24h`,
        priority: 'critical',
        timestamp: new Date()
      });
    }
    
    // Vérifier l'espace disque (exemple)
    const diskSpace = await this.checkDiskSpace();
    if (diskSpace && diskSpace.percentUsed > 90) {
      alerts.push({
        type: 'error',
        category: 'system',
        message: `Espace disque critique: ${diskSpace.percentUsed}% utilisé`,
        priority: 'critical',
        timestamp: new Date()
      });
    }
    
    // Vérifier les performances
    const avgResponseTime = await this.getAverageResponseTime();
    if (avgResponseTime > 2000) { // 2 secondes
      alerts.push({
        type: 'warning',
        category: 'performance',
        message: `Temps de réponse moyen élevé: ${avgResponseTime}ms`,
        priority: 'medium',
        timestamp: new Date()
      });
    }
    
    return alerts;
  }

  /**
   * Obtenir les notifications administrateur
   */
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const offset = (page - 1) * limit;
      
      const where = { 
        user_id: req.user.id_user,
        type: { 
          [Op.in]: ['admin_alert', 'system_notification', 'moderation_required'] 
        }
      };
      
      if (unreadOnly === 'true') {
        where.lue = false;
      }
      
      const notifications = await this.models.Notification?.findAndCountAll({
        where,
        order: [['date_creation', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      }) || { count: 0, rows: [] };
      
      res.json({
        success: true,
        data: {
          items: notifications.rows,
          pagination: {
            total: notifications.count,
            page: parseInt(page),
            pages: Math.ceil(notifications.count / limit),
            limit: parseInt(limit),
            hasNext: page < Math.ceil(notifications.count / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Erreur getNotifications:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des notifications'
      });
    }
  }

  /**
   * Envoyer une notification broadcast
   */
  async broadcastNotification(req, res) {
    try {
      const { title, message, target, type = 'info' } = req.body;
      
      console.log('📢 Broadcast notification:', { title, target, type });
      
      // Validation supplémentaire
      if (!title || !message) {
        return res.status(400).json({
          success: false,
          error: 'Titre et message requis'
        });
      }
      
      // Déterminer les destinataires
      let whereClause = {};
      switch (target) {
        case 'professionals':
          whereClause = { id_type_user: { [Op.ne]: TYPE_USER_IDS.VISITEUR } };
          break;
        case 'visitors':
          whereClause = { id_type_user: TYPE_USER_IDS.VISITEUR };
          break;
        case 'all':
        default:
          whereClause = {};
      }
      
      // Récupérer les utilisateurs cibles
      const users = await this.models.User.findAll({
        where: {
          ...whereClause,
          statut: 'actif',
          email_verifie: true // Ne notifier que les emails vérifiés
        },
        attributes: ['id_user', 'email', 'preferences_notification']
      });
      
      if (users.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucun utilisateur correspondant trouvé'
        });
      }
      
      // Filtrer selon les préférences de notification
      const usersToNotify = users.filter(user => {
        if (!user.preferences_notification) return true;
        const prefs = JSON.parse(user.preferences_notification);
        return prefs.admin_notifications !== false;
      });
      
      // Créer les notifications en masse
      const notifications = usersToNotify.map(user => ({
        user_id: user.id_user,
        type: 'broadcast',
        titre: title,
        message: message,
        lue: false,
        date_creation: new Date(),
        metadata: JSON.stringify({
          sender_id: req.user.id_user,
          target_group: target,
          notification_type: type
        })
      }));
      
      if (this.models.Notification) {
        await this.models.Notification.bulkCreate(notifications, {
          validate: true,
          individualHooks: false
        });
      }
      
      // Log dans l'audit
      if (this.models.AuditLog) {
        await this.models.AuditLog.create({
          id_admin: req.user.id_user,
          action: 'BROADCAST_NOTIFICATION',
          type_entite: 'notification',
          details: JSON.stringify({
            title,
            target,
            recipients_count: usersToNotify.length
          }),
          date_action: new Date()
        });
      }
      
      // Statistiques de l'envoi
      const stats = {
        total_users: users.length,
        notified: usersToNotify.length,
        skipped: users.length - usersToNotify.length
      };
      
      console.log(`✅ Notification broadcast envoyée:`, stats);
      
      res.json({
        success: true,
        message: `Notification envoyée à ${usersToNotify.length} utilisateurs`,
        data: {
          ...stats,
          target,
          type,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Erreur broadcastNotification:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'envoi de la notification',
        message: error.message
      });
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  getDateLimit(period) {
    switch (period) {
      case 'day':
        return moment().subtract(1, 'day').toDate();
      case 'week':
        return moment().subtract(1, 'week').toDate();
      case 'month':
        return moment().subtract(1, 'month').toDate();
      case 'year':
        return moment().subtract(1, 'year').toDate();
      default:
        return moment().subtract(1, 'month').toDate();
    }
  }

  async getUserGrowth(dateLimit) {
    try {
      return await this.models.User.findAll({
        where: {
          date_creation: { [Op.gte]: dateLimit }
        },
        attributes: [
          [fn('DATE', col('date_creation')), 'date'],
          [fn('COUNT', '*'), 'count']
        ],
        group: [fn('DATE', col('date_creation'))],
        order: [[fn('DATE', col('date_creation')), 'ASC']],
        raw: true
      });
    } catch (error) {
      console.error('Erreur getUserGrowth:', error);
      return [];
    }
  }

  async getContentByType() {
    try {
      const [oeuvres, evenements, artisanats] = await Promise.all([
        this.models.Oeuvre.count({ group: ['type_oeuvre'] }),
        this.models.Evenement.count(),
        this.models.Artisanat?.count() || 0
      ]);

      return {
        oeuvres,
        evenements,
        artisanats
      };
    } catch (error) {
      console.error('Erreur getContentByType:', error);
      return { oeuvres: [], evenements: 0, artisanats: 0 };
    }
  }

  async getRecentActivity() {
    try {
      const [oeuvres, evenements, commentaires] = await Promise.all([
        this.models.Oeuvre.findAll({
          limit: 5,
          order: [['date_creation', 'DESC']],
          include: [{
            model: this.models.User,
            as: 'Saiseur',
            attributes: ['nom', 'prenom']
          }]
        }),
        this.models.Evenement.findAll({
          limit: 5,
          order: [['date_creation', 'DESC']]
        }),
        this.models.Commentaire?.findAll({
          limit: 5,
          order: [['date_creation', 'DESC']],
          include: [{
            model: this.models.User,
            attributes: ['nom', 'prenom']
          }]
        }) || []
      ]);

      return { oeuvres, evenements, commentaires };
    } catch (error) {
      console.error('Erreur getRecentActivity:', error);
      return { oeuvres: [], evenements: [], commentaires: [] };
    }
  }

  async getTopContributors() {
    try {
      return await this.models.User.findAll({
        attributes: [
          'id_user',
          'nom',
          'prenom',
          'id_type_user',
          [
            literal(`(
              SELECT COUNT(*) FROM oeuvre 
              WHERE oeuvre.saisi_par = User.id_user 
              AND oeuvre.statut = 'publie'
            )`),
            'oeuvres_count'
          ],
          [
            literal(`(
              SELECT COUNT(*) FROM evenement 
              WHERE evenement.id_user = User.id_user
            )`),
            'evenements_count'
          ]
        ],
        order: [[literal('oeuvres_count + evenements_count'), 'DESC']],
        limit: 10,
        raw: true
      });
    } catch (error) {
      console.error('Erreur getTopContributors:', error);
      return [];
    }
  }

  async getUserAnalytics(startDate) {
    const totalUsers = await this.models.User.count();
    const newUsers = await this.models.User.count({
      where: { date_creation: { [Op.gte]: startDate } }
    });
    const activeUsers = await this.models.User.count({
      where: { derniere_connexion: { [Op.gte]: startDate } }
    });

    return {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      retentionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0
    };
  }

  async getContentAnalytics(startDate) {
    const [oeuvres, evenements, commentaires] = await Promise.all([
      this.models.Oeuvre.count({
        where: { date_creation: { [Op.gte]: startDate } }
      }),
      this.models.Evenement.count({
        where: { date_creation: { [Op.gte]: startDate } }
      }),
      this.models.Commentaire?.count({
        where: { date_creation: { [Op.gte]: startDate } }
      }) || 0
    ]);

    return {
      oeuvres,
      evenements,
      commentaires,
      total: oeuvres + evenements + commentaires
    };
  }

  async getEngagementAnalytics(startDate) {
    const [vues, favoris, participations] = await Promise.all([
      this.models.Vue?.count({
        where: { date_vue: { [Op.gte]: startDate } }
      }) || 0,
      this.models.Favori?.count({
        where: { date_ajout: { [Op.gte]: startDate } }
      }) || 0,
      this.models.EvenementUser?.count({
        where: { date_inscription: { [Op.gte]: startDate } }
      }) || 0
    ]);

    return { vues, favoris, participations };
  }

  async generateReport(startDate, endDate) {
    const [users, content, engagement] = await Promise.all([
      this.getUserReportData(startDate, endDate),
      this.getContentReportData(startDate, endDate),
      this.getEngagementReportData(startDate, endDate)
    ]);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      users,
      content,
      engagement
    };
  }

  async getUserReportData(startDate, endDate) {
    const where = {
      date_creation: { [Op.between]: [startDate, endDate] }
    };

    const [total, byType, active] = await Promise.all([
      this.models.User.count({ where }),
      this.models.User.findAll({
        where,
        attributes: [
          'id_type_user',
          [fn('COUNT', '*'), 'count']
        ],
        group: ['id_type_user'],
        raw: true
      }),
      this.models.User.count({
        where: {
          derniere_connexion: { [Op.between]: [startDate, endDate] }
        }
      })
    ]);

    return { total, byType, active };
  }

  async getContentReportData(startDate, endDate) {
    const where = {
      date_creation: { [Op.between]: [startDate, endDate] }
    };

    const [oeuvres, evenements, commentaires] = await Promise.all([
      this.models.Oeuvre.count({ where: { ...where, statut: 'publie' } }),
      this.models.Evenement.count({ where }),
      this.models.Commentaire?.count({ where: { ...where, statut: 'publie' } }) || 0
    ]);

    return { oeuvres, evenements, commentaires };
  }

  async getEngagementReportData(startDate, endDate) {
    const [favoris, participations, vues] = await Promise.all([
      this.models.Favori?.count({
        where: { date_ajout: { [Op.between]: [startDate, endDate] } }
      }) || 0,
      this.models.EvenementUser?.count({
        where: { date_inscription: { [Op.between]: [startDate, endDate] } }
      }) || 0,
      this.models.Vue?.count({
        where: { date_vue: { [Op.between]: [startDate, endDate] } }
      }) || 0
    ]);

    return { favoris, participations, vues };
  }

  // Méthode helper pour générer le CSV
  generateCSV(users) {
    const headers = ['ID', 'Nom', 'Prénom', 'Email', 'Type', 'Statut', 'Date inscription', 'Rôles'];
    const rows = users.map(user => [
      user.id_user,
      user.nom,
      user.prenom,
      user.email,
      user.id_type_user,
      user.statut,
      user.date_creation,
      user.Roles ? user.Roles.map(r => r.nom_role).join(';') : ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');
    
    return csv;
  }

  // Méthodes helper supplémentaires
  async checkDiskSpace() {
    try {
      // Implémentation basique - à adapter selon votre système
      // const diskUsage = require('diskusage');
      // const path = require('os').platform() === 'win32' ? 'c:' : '/';
      // const info = await diskUsage.check(path);
      
      // return {
      //   total: info.total,
      //   used: info.total - info.free,
      //   free: info.free,
      //   percentUsed: Math.round((info.total - info.free) / info.total * 100)
      // };
      
      // Version simplifiée pour éviter les erreurs
      return {
        total: 100000000000, // 100GB
        used: 50000000000,   // 50GB
        free: 50000000000,   // 50GB
        percentUsed: 50
      };
    } catch (error) {
      console.error('Erreur checkDiskSpace:', error);
      return null;
    }
  }

  async getAverageResponseTime() {
    try {
      // Récupérer les logs de performance des dernières 24h
      if (!this.models.PerformanceLog) return 0;
      
      const result = await this.models.PerformanceLog.findOne({
        attributes: [
          [this.sequelize.fn('AVG', this.sequelize.col('response_time')), 'avg_time']
        ],
        where: {
          created_at: {
            [Op.gte]: moment().subtract(24, 'hours').toDate()
          }
        },
        raw: true
      });
      
      return result?.avg_time || 0;
    } catch (error) {
      console.error('Erreur getAverageResponseTime:', error);
      return 0;
    }
  }

  async getActiveParcoursCount() {
    try {
      if (!this.models.Parcours) return 0;
      return await this.models.Parcours.count({
        where: { statut: 'actif' }
      });
    } catch (error) {
      return 0;
    }
  }

  async getPatrimoineEvolution() {
    try {
      if (!this.models.Lieu) return [];
      
      return await this.models.Lieu.findAll({
        attributes: [
          [fn('DATE_FORMAT', col('date_creation'), '%Y-%m'), 'month'],
          [fn('COUNT', '*'), 'count']
        ],
        where: {
          date_creation: {
            [Op.gte]: moment().subtract(12, 'months').toDate()
          }
        },
        group: [fn('DATE_FORMAT', col('date_creation'), '%Y-%m')],
        order: [[literal('month'), 'ASC']],
        raw: true
      });
    } catch (error) {
      return [];
    }
  }

  async getPopularPatrimoineSites() {
    try {
      if (!this.models.Lieu || !this.models.Favori) return [];
      
      return await this.models.Lieu.findAll({
        attributes: [
          'id_lieu',
          'nom_fr',
          'nom_ar',
          'typeLieu',
          [
            literal(`(
              SELECT COUNT(*) FROM favori 
              WHERE favori.entity_type = 'lieu' 
              AND favori.entity_id = Lieu.id_lieu
            )`),
            'favorites_count'
          ]
        ],
        order: [[literal('favorites_count'), 'DESC']],
        limit: 10,
        raw: true
      });
    } catch (error) {
      return [];
    }
  }

  async getQRScanPeakHours(startDate) {
    try {
      if (!this.models.QRScan) return [];
      
      return await this.models.QRScan.findAll({
        attributes: [
          [fn('HOUR', col('scan_date')), 'hour'],
          [fn('COUNT', '*'), 'scans']
        ],
        where: { scan_date: { [Op.gte]: startDate } },
        group: [fn('HOUR', col('scan_date'))],
        order: [[literal('hour'), 'ASC']],
        raw: true
      });
    } catch (error) {
      return [];
    }
  }
}

module.exports = DashboardController;