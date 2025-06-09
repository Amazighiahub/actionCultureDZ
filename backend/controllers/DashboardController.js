const { Op } = require('sequelize');
const redis = require('redis');

class DashboardController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.redis = redis.createClient();
    this.adminPermissions = this.setupPermissions();
  }

  setupPermissions() {
    return {
      'super_admin': ['*'],
      'content_admin': ['validate_oeuvre', 'moderate_comment', 'manage_patrimoine'],
      'user_admin': ['validate_user', 'suspend_user', 'view_users'],
      'event_admin': ['manage_events', 'export_participants'],
      'moderator': ['moderate_comment', 'moderate_signalement'],
      'patrimoine_admin': ['manage_patrimoine', 'manage_parcours', 'view_qr_stats']
    };
  }

  // Cache helper
  async getCachedStats(key, generator, ttl = 3600) {
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached);
      
      const data = await generator();
      await this.redis.setex(key, ttl, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Erreur cache:', error);
      return await generator(); // Fallback sans cache
    }
  }

  // Vérification des permissions
  async checkAdminPermission(userId, action) {
    try {
      const user = await this.models.User.findByPk(userId, {
        include: [{ 
          model: this.models.Role,
          through: { model: this.models.UserRole },
          attributes: ['nom_role']
        }]
      });

      const userRole = user.Roles?.find(r => r.nom_role.includes('admin') || r.nom_role.includes('moderator'));
      if (!userRole) return false;

      const permissions = this.adminPermissions[userRole.nom_role] || [];
      return permissions.includes('*') || permissions.includes(action);
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return false;
    }
  }

  // Vue d'ensemble du dashboard
  async getOverview(req, res) {
    try {
      const stats = await this.getCachedStats(
        'dashboard:overview',
        () => this.generateOverviewStats(),
        300 // 5 minutes
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du dashboard:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async generateOverviewStats() {
    const [
      totalUsers,
      totalOeuvres,
      totalEvenements,
      totalLieux,
      totalCommentaires,
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
      this.models.Lieu.count(),
      this.models.Commentaire.count({ where: { statut: 'publie' } }),
      this.models.Artisanat.count(),
      this.models.User.count({
        where: {
          date_creation: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      this.models.Oeuvre.count({ where: { statut: 'en_attente' } }),
      this.models.User.count({
        where: {
          type_user: { [Op.ne]: 'visiteur' },
          professionnel_valide: false,
          statut_compte: 'en_attente_validation'
        }
      }),
      this.models.Signalement.count({
        where: { statut: 'en_attente' }
      }),
      this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      }),
      this.models.Vue.count({
        where: {
          date_vue: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    return {
      stats: {
        totalUsers,
        totalOeuvres,
        totalEvenements,
        totalLieux,
        totalCommentaires,
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

  // Statistiques détaillées
  async getDetailedStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      const dateLimit = this.getDateLimit(period);

      const stats = await this.getCachedStats(
        `dashboard:detailed:${period}`,
        async () => ({
          // Évolution des inscriptions
          userGrowth: await this.getUserGrowth(dateLimit),
          
          // Contenu par type
          contentByType: await this.getContentByType(),
          
          // Activité récente
          recentActivity: await this.getRecentActivity(),
          
          // Top contributeurs
          topContributors: await this.getTopContributors(),
          
          // Événements à venir
          upcomingEvents: await this.getUpcomingEvents(),
          
          // Répartition géographique
          geographicDistribution: await this.getGeographicDistribution(),
          
          // Analytics des vues
          viewsAnalytics: await this.getViewsAnalytics(dateLimit),
          
          // Statistiques modération
          moderationStats: await this.getModerationStats(dateLimit)
        }),
        1800 // 30 minutes
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Dashboard patrimoine
  async getPatrimoineDashboard(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'manage_patrimoine')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const stats = await this.getCachedStats(
        'dashboard:patrimoine',
        () => this.generatePatrimoineStats(),
        600 // 10 minutes
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du dashboard patrimoine:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async generatePatrimoineStats() {
    const [
      totalSites,
      sitesParType,
      sitesParWilaya,
      parcoursActifs,
      qrCodesGeneres,
      qrCodesScannnes,
      visitesRecentes,
      sitesPopulaires,
      nouveauxSites
    ] = await Promise.all([
      // Total sites patrimoniaux
      this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      }),

      // Sites par type
      this.models.Lieu.findAll({
        attributes: [
          'typeLieu',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        include: [{
          model: this.models.DetailLieu,
          required: true
        }],
        group: ['typeLieu'],
        order: [[this.sequelize.literal('count'), 'DESC']]
      }),

      // Sites par wilaya
      this.models.Lieu.findAll({
        attributes: [
          'wilaya',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        include: [{
          model: this.models.DetailLieu,
          required: true
        }],
        group: ['wilaya'],
        order: [[this.sequelize.literal('count'), 'DESC']]
      }),

      // Parcours actifs
      this.models.Parcours?.count({
        where: { statut: 'actif' }
      }) || 0,

      // QR codes générés
      this.models.QRCode?.count() || 0,

      // QR codes scannés (last 30 days)
      this.models.QRScan?.count({
        where: {
          date_scan: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }) || 0,

      // Visites récentes des sites
      this.models.Vue.count({
        where: {
          type_entite: 'lieu',
          date_vue: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Sites les plus populaires
      this.models.Lieu.findAll({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }],
        attributes: [
          'id_lieu',
          'nom',
          'typeLieu',
          [
            this.sequelize.literal(`(
              SELECT COUNT(*) FROM vue 
              WHERE vue.type_entite = 'lieu' 
              AND vue.id_entite = Lieu.id_lieu
            )`),
            'vues_count'
          ]
        ],
        order: [[this.sequelize.literal('vues_count'), 'DESC']],
        limit: 10
      }),

      // Nouveaux sites ce mois
      this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }],
        where: {
          date_creation: {
            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    return {
      overview: {
        totalSites,
        parcoursActifs,
        qrCodesGeneres,
        qrCodesScannnes,
        visitesRecentes,
        nouveauxSites
      },
      distribution: {
        parType: sitesParType,
        parWilaya: sitesParWilaya
      },
      populaires: sitesPopulaires
    };
  }

  // Gestion des utilisateurs en attente
  async getPendingUsers(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'validate_user')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const users = await this.models.User.findAndCountAll({
        where: {
          type_user: { [Op.ne]: 'visiteur' },
          professionnel_valide: false,
          statut_compte: 'en_attente_validation'
        },
        attributes: { exclude: ['password'] },
        include: [
          {
            model: this.models.Role,
            through: { model: this.models.UserRole },
            attributes: ['nom_role']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          users: users.rows,
          pagination: {
            total: users.count,
            page: parseInt(page),
            pages: Math.ceil(users.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Gestion des œuvres en attente
  async getPendingOeuvres(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'validate_oeuvre')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where: { statut: 'en_attente' },
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Langue },
          { 
            model: this.models.User, 
            as: 'Saiseur', 
            attributes: ['nom', 'prenom', 'email'] 
          },
          {
            model: this.models.Media,
            limit: 3,
            attributes: ['url', 'type_media']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          oeuvres: oeuvres.rows,
          pagination: {
            total: oeuvres.count,
            page: parseInt(page),
            pages: Math.ceil(oeuvres.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des œuvres en attente:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Gestion des signalements
  async getReportedContent(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'moderate_signalement')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { page = 1, limit = 10, type, priorite, statut = 'en_attente' } = req.query;
      const offset = (page - 1) * limit;

      const where = { statut };
      if (type) where.type_entite = type;
      if (priorite) where.priorite = priorite;

      const signalements = await this.models.Signalement.findAndCountAll({
        where,
        include: [
          { 
            model: this.models.User, 
            as: 'Signalant',
            attributes: ['nom', 'prenom', 'email'] 
          },
          { 
            model: this.models.User, 
            as: 'Moderateur',
            attributes: ['nom', 'prenom'] 
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [
          ['priorite', 'DESC'],
          ['date_signalement', 'ASC']
        ]
      });

      // Enrichir avec les détails du contenu signalé
      for (const signalement of signalements.rows) {
        try {
          switch (signalement.type_entite) {
            case 'commentaire':
              const commentaire = await this.models.Commentaire.findByPk(signalement.id_entite, {
                include: [
                  { model: this.models.User, attributes: ['nom', 'prenom'] },
                  { model: this.models.Oeuvre, attributes: ['titre'] }
                ]
              });
              signalement.dataValues.contenu = commentaire;
              break;
            
            case 'oeuvre':
              const oeuvre = await this.models.Oeuvre.findByPk(signalement.id_entite, {
                attributes: ['titre', 'description'],
                include: [{ model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom'] }]
              });
              signalement.dataValues.contenu = oeuvre;
              break;
              
            case 'user':
              const user = await this.models.User.findByPk(signalement.id_entite, {
                attributes: ['nom', 'prenom', 'email', 'type_user']
              });
              signalement.dataValues.contenu = user;
              break;
          }
        } catch (error) {
          console.error('Erreur enrichissement signalement:', error);
        }
      }

      res.json({
        success: true,
        data: {
          signalements: signalements.rows,
          pagination: {
            total: signalements.count,
            page: parseInt(page),
            pages: Math.ceil(signalements.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des signalements:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // File d'attente de modération
  async getModerationQueue(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'moderate_signalement')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const moderatorId = req.user.id_user;
      
      const [
        assignedToMe,
        highPriority,
        unassigned,
        recentActions
      ] = await Promise.all([
        // Signalements assignés à moi
        this.models.Signalement.findAll({
          where: {
            id_moderateur: moderatorId,
            statut: 'en_cours'
          },
          include: [
            { model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }
          ],
          order: [['date_signalement', 'ASC']],
          limit: 10
        }),

        // Haute priorité non assignés
        this.models.Signalement.findAll({
          where: {
            priorite: 'haute',
            statut: 'en_attente',
            id_moderateur: null
          },
          include: [
            { model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }
          ],
          order: [['date_signalement', 'ASC']],
          limit: 5
        }),

        // Non assignés
        this.models.Signalement.findAll({
          where: {
            statut: 'en_attente',
            id_moderateur: null
          },
          include: [
            { model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }
          ],
          order: [
            ['priorite', 'DESC'],
            ['date_signalement', 'ASC']
          ],
          limit: 15
        }),

        // Actions récentes du modérateur
        this.models.Signalement.findAll({
          where: {
            id_moderateur: moderatorId,
            statut: 'traite',
            date_traitement: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          order: [['date_traitement', 'DESC']],
          limit: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          assignedToMe,
          highPriority,
          unassigned,
          recentActions,
          stats: {
            assignedCount: assignedToMe.length,
            highPriorityCount: highPriority.length,
            unassignedCount: unassigned.length
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de la file de modération:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Actions administratives
  async performAdminAction(req, res) {
    try {
      const { action, entityType, entityId, data = {} } = req.body;

      // Vérifier les permissions selon l'action
      if (!await this.checkAdminPermission(req.user.id_user, action)) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      let result;
      switch (action) {
        case 'validate_user':
          result = await this.validateUser(entityId, data);
          break;
        case 'validate_oeuvre':
          result = await this.validateOeuvre(entityId, data);
          break;
        case 'moderate_comment':
          result = await this.moderateComment(entityId, data);
          break;
        case 'moderate_signalement':
          result = await this.moderateSignalement(entityId, data, req.user.id_user);
          break;
        case 'suspend_user':
          result = await this.suspendUser(entityId, data);
          break;
        case 'bulk_moderate':
          result = await this.bulkModerate(data, req.user.id_user);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Action non reconnue'
          });
      }

      // Log de l'action
      await this.logAdminAction(req.user.id_user, action, entityType, entityId, data);

      res.json({
        success: true,
        message: `Action "${action}" effectuée avec succès`,
        data: result
      });

    } catch (error) {
      console.error('Erreur lors de l\'action administrative:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Modération en lot
  async bulkModerate(data, moderatorId) {
    const { signalements, action, notes } = data;
    const results = [];

    for (const signalementId of signalements) {
      try {
        const result = await this.moderateSignalement(signalementId, { action, notes }, moderatorId);
        results.push({ id: signalementId, success: true, result });
      } catch (error) {
        results.push({ id: signalementId, success: false, error: error.message });
      }
    }

    return results;
  }

  // Analytics avancées
  async getAdvancedAnalytics(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'view_analytics')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { period = 30 } = req.query;
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      const analytics = await this.getCachedStats(
        `dashboard:analytics:${period}`,
        async () => ({
          retention: await this.getRetentionMetrics(startDate),
          funnel: await this.getConversionFunnel(startDate),
          engagement: await this.getEngagementMetrics(startDate),
          devices: await this.getDeviceStats(startDate),
          geographic: await this.getGeoAnalytics(startDate),
          content: await this.getContentPerformance(startDate)
        }),
        3600 // 1 heure
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des analytics:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Logs d'audit
  async getAuditLogs(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'view_audit')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (action) where.action = action;
      if (userId) where.id_admin = userId;
      if (startDate && endDate) {
        where.date_action = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const logs = await this.models.AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: this.models.User,
            as: 'Admin',
            attributes: ['nom', 'prenom', 'email']
          }
        ],
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
      console.error('Erreur lors de la récupération des logs:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // QR Code Statistics
  async getQRStats(req, res) {
    try {
      if (!await this.checkAdminPermission(req.user.id_user, 'view_qr_stats')) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }

      const { period = 30 } = req.query;
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      const [
        totalScans,
        uniqueScans,
        scansByDay,
        topScannedSites,
        scansByDevice,
        scansByLocation
      ] = await Promise.all([
        this.models.QRScan?.count({
          where: { date_scan: { [Op.gte]: startDate } }
        }) || 0,

        this.models.QRScan?.count({
          where: { 
            date_scan: { [Op.gte]: startDate },
            is_unique: true 
          }
        }) || 0,

        this.models.QRScan?.findAll({
          where: { date_scan: { [Op.gte]: startDate } },
          attributes: [
            [this.sequelize.fn('DATE', this.sequelize.col('date_scan')), 'date'],
            [this.sequelize.fn('COUNT', '*'), 'scans']
          ],
          group: [this.sequelize.fn('DATE', this.sequelize.col('date_scan'))],
          order: [[this.sequelize.fn('DATE', this.sequelize.col('date_scan')), 'ASC']]
        }) || [],

        this.models.QRScan?.findAll({
          where: { date_scan: { [Op.gte]: startDate } },
          include: [{
            model: this.models.QRCode,
            include: [{ model: this.models.Lieu, attributes: ['nom'] }]
          }],
          attributes: [
            'id_qr_code',
            [this.sequelize.fn('COUNT', '*'), 'scan_count']
          ],
          group: ['id_qr_code'],
          order: [[this.sequelize.literal('scan_count'), 'DESC']],
          limit: 10
        }) || [],

        this.models.QRScan?.findAll({
          where: { date_scan: { [Op.gte]: startDate } },
          attributes: [
            'device_type',
            [this.sequelize.fn('COUNT', '*'), 'count']
          ],
          group: ['device_type'],
          order: [[this.sequelize.literal('count'), 'DESC']]
        }) || [],

        this.models.QRScan?.findAll({
          where: { 
            date_scan: { [Op.gte]: startDate },
            ville: { [Op.ne]: null }
          },
          attributes: [
            'ville',
            [this.sequelize.fn('COUNT', '*'), 'count']
          ],
          group: ['ville'],
          order: [[this.sequelize.literal('count'), 'DESC']],
          limit: 15
        }) || []
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalScans,
            uniqueScans,
            uniqueRate: totalScans > 0 ? ((uniqueScans / totalScans) * 100).toFixed(2) : 0
          },
          evolution: scansByDay,
          topSites: topScannedSites,
          devices: scansByDevice,
          locations: scansByLocation,
          period: {
            days: period,
            startDate,
            endDate: new Date()
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des stats QR:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Rapport d'activité
  async generateActivityReport(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const start = startDate ? new Date(startDate) : this.getDateLimit('month');
      const end = endDate ? new Date(endDate) : new Date();

      const report = {
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        users: {
          nouveaux: await this.models.User.count({
            where: {
              date_creation: { [Op.between]: [start, end] }
            }
          }),
          parType: await this.models.User.findAll({
            attributes: [
              'type_user',
              [this.sequelize.fn('COUNT', '*'), 'count']
            ],
            where: {
              date_creation: { [Op.between]: [start, end] }
            },
            group: ['type_user']
          }),
          actifs: await this.models.User.count({
            where: {
              derniere_connexion: { [Op.between]: [start, end] }
            }
          })
        },
        content: {
          oeuvres: await this.models.Oeuvre.count({
            where: {
              date_creation: { [Op.between]: [start, end] },
              statut: 'publie'
            }
          }),
          evenements: await this.models.Evenement.count({
            where: {
              date_creation: { [Op.between]: [start, end] }
            }
          }),
          commentaires: await this.models.Commentaire.count({
            where: {
              date_creation: { [Op.between]: [start, end] },
              statut: 'publie'
            }
          }),
          artisanats: await this.models.Artisanat.count({
            where: {
              date_creation: { [Op.between]: [start, end] }
            }
          })
        },
        engagement: {
          favoris: await this.models.Favori.count({
            where: {
              date_ajout: { [Op.between]: [start, end] }
            }
          }),
          participations: await this.models.EvenementUser.count({
            where: {
              date_inscription: { [Op.between]: [start, end] }
            }
          }),
          vues: await this.models.Vue.count({
            where: {
              date_vue: { [Op.between]: [start, end] }
            }
          })
        },
        moderation: {
          signalements: await this.models.Signalement.count({
            where: {
              date_signalement: { [Op.between]: [start, end] }
            }
          }),
          signalementsTraites: await this.models.Signalement.count({
            where: {
              date_traitement: { [Op.between]: [start, end] },
              statut: 'traite'
            }
          }),
          oeuvresValidees: await this.models.Oeuvre.count({
            where: {
              date_validation: { [Op.between]: [start, end] },
              statut: 'publie'
            }
          })
        }
      };

      if (format === 'excel') {
        // Export Excel du rapport
        await this.exportReportToExcel(report, res);
      } else {
        res.json({
          success: true,
          data: report
        });
      }

    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Méthodes utilitaires

  getDateLimit(period) {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  async getUserGrowth(dateLimit) {
    return await this.models.User.findAll({
      where: {
        date_creation: { [Op.gte]: dateLimit }
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_creation')), 'date'],
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: [this.sequelize.fn('DATE', this.sequelize.col('date_creation'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_creation')), 'ASC']]
    });
  }

  async getContentByType() {
    const [oeuvres, evenements, lieux, artisanats] = await Promise.all([
      this.models.Oeuvre.count({
        where: { statut: 'publie' },
        group: ['id_type_oeuvre'],
        include: [{ model: this.models.TypeOeuvre, attributes: ['nom_type'] }]
      }),
      this.models.Evenement.count({
        group: ['id_type_evenement'],
        include: [{ model: this.models.TypeEvenement, attributes: ['nom_type'] }]
      }),
      this.models.Lieu.count({
        group: ['typeLieu']
      }),
      this.models.Artisanat.count()
    ]);

    return {
      oeuvres,
      evenements,
      lieux,
      artisanats
    };
  }

  async getRecentActivity() {
    const [recentOeuvres, recentEvenements, recentCommentaires, recentSignalements] = await Promise.all([
      this.models.Oeuvre.findAll({
        limit: 5,
        order: [['date_creation', 'DESC']],
        include: [
          { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
          { model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom'] }
        ]
      }),
      this.models.Evenement.findAll({
        limit: 5,
        order: [['date_creation', 'DESC']],
        include: [
          { model: this.models.TypeEvenement, attributes: ['nom_type'] },
          { model: this.models.User, attributes: ['nom', 'prenom'] }
        ]
      }),
      this.models.Commentaire.findAll({
        limit: 5,
        order: [['date_creation', 'DESC']],
        include: [
          { model: this.models.User, attributes: ['nom', 'prenom'] }
        ]
      }),
      this.models.Signalement.findAll({
        limit: 5,
        order: [['date_signalement', 'DESC']],
        include: [
          { model: this.models.User, as: 'Signalant', attributes: ['nom', 'prenom'] }
        ]
      })
    ]);

    return {
      oeuvres: recentOeuvres,
      evenements: recentEvenements,
      commentaires: recentCommentaires,
      signalements: recentSignalements
    };
  }

  async getTopContributors() {
    return await this.models.User.findAll({
      attributes: [
        'id_user',
        'nom',
        'prenom',
        'type_user',
        [
          this.sequelize.literal(`(
            SELECT COUNT(*) FROM oeuvre 
            WHERE oeuvre.saisi_par = User.id_user 
            AND oeuvre.statut = 'publie'
          )`),
          'oeuvres_count'
        ],
        [
          this.sequelize.literal(`(
            SELECT COUNT(*) FROM evenement 
            WHERE evenement.id_user = User.id_user
          )`),
          'evenements_count'
        ]
      ],
      order: [[this.sequelize.literal('oeuvres_count + evenements_count'), 'DESC']],
      limit: 10
    });
  }

  async getUpcomingEvents() {
    return await this.models.Evenement.findAll({
      where: {
        date_debut: { [Op.gte]: new Date() }
      },
      include: [
        { model: this.models.TypeEvenement, attributes: ['nom_type'] },
        { model: this.models.Lieu, attributes: ['nom'] }
      ],
      order: [['date_debut', 'ASC']],
      limit: 10
    });
  }

  async getGeographicDistribution() {
    return await this.models.User.findAll({
      attributes: [
        'wilaya_residence',
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['wilaya_residence'],
      order: [[this.sequelize.literal('count'), 'DESC']]
    });
  }

  async getViewsAnalytics(dateLimit) {
    return await this.models.Vue.findAll({
      where: {
        date_vue: { [Op.gte]: dateLimit }
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'date'],
        'type_entite',
        [this.sequelize.fn('COUNT', '*'), 'vues'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN is_unique = true THEN 1 END')), 'vues_uniques']
      ],
      group: [
        this.sequelize.fn('DATE', this.sequelize.col('date_vue')),
        'type_entite'
      ],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'ASC']]
    });
  }

  async getModerationStats(dateLimit) {
    const [
      signalementsParJour,
      signalementsParType,
      tempsTraitement
    ] = await Promise.all([
      this.models.Signalement.findAll({
        where: {
          date_signalement: { [Op.gte]: dateLimit }
        },
        attributes: [
          [this.sequelize.fn('DATE', this.sequelize.col('date_signalement')), 'date'],
          'statut',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: [
          this.sequelize.fn('DATE', this.sequelize.col('date_signalement')),
          'statut'
        ],
        order: [[this.sequelize.fn('DATE', this.sequelize.col('date_signalement')), 'ASC']]
      }),

      this.models.Signalement.findAll({
        where: {
          date_signalement: { [Op.gte]: dateLimit }
        },
        attributes: [
          'type_entite',
          'motif',
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: ['type_entite', 'motif'],
        order: [[this.sequelize.literal('count'), 'DESC']]
      }),

      this.models.Signalement.aggregate('duree_traitement_heures', 'AVG', {
        where: {
          statut: 'traite',
          date_traitement: { [Op.gte]: dateLimit }
        }
      })
    ]);

    return {
      evolution: signalementsParJour,
      parType: signalementsParType,
      tempsTraitementMoyen: tempsTraitement ? parseFloat(tempsTraitement).toFixed(2) : null
    };
  }

  // Analytics helpers
  async getRetentionMetrics(startDate) {
    // Calcul des métriques de rétention
    const newUsers = await this.models.User.findAll({
      where: {
        date_creation: { [Op.gte]: startDate }
      },
      attributes: ['id_user', 'date_creation']
    });

    const retentionData = [];
    for (const user of newUsers) {
      const hasReturned = await this.models.Vue.findOne({
        where: {
          id_user: user.id_user,
          date_vue: {
            [Op.between]: [
              new Date(user.date_creation.getTime() + 24 * 60 * 60 * 1000),
              new Date(user.date_creation.getTime() + 7 * 24 * 60 * 60 * 1000)
            ]
          }
        }
      });
      
      retentionData.push({
        userId: user.id_user,
        creationDate: user.date_creation,
        returned: !!hasReturned
      });
    }

    const totalNew = newUsers.length;
    const returned = retentionData.filter(u => u.returned).length;
    
    return {
      totalNewUsers: totalNew,
      returnedUsers: returned,
      retentionRate: totalNew > 0 ? ((returned / totalNew) * 100).toFixed(2) : 0,
      details: retentionData
    };
  }

  async getConversionFunnel(startDate) {
    const [
      visitors,
      registered,
      activeUsers,
      contributors
    ] = await Promise.all([
      this.models.Vue.count({
        where: { date_vue: { [Op.gte]: startDate } },
        distinct: ['session_id']
      }),
      
      this.models.User.count({
        where: { date_creation: { [Op.gte]: startDate } }
      }),
      
      this.models.User.count({
        where: {
          date_creation: { [Op.gte]: startDate },
          derniere_connexion: { [Op.gte]: startDate }
        }
      }),
      
      this.models.User.count({
        where: {
          date_creation: { [Op.gte]: startDate },
          [Op.or]: [
            {
              id_user: {
                [Op.in]: this.sequelize.literal(`(
                  SELECT DISTINCT saisi_par FROM oeuvre 
                  WHERE date_creation >= '${startDate.toISOString()}'
                )`)
              }
            },
            {
              id_user: {
                [Op.in]: this.sequelize.literal(`(
                  SELECT DISTINCT id_user FROM evenement 
                  WHERE date_creation >= '${startDate.toISOString()}'
                )`)
              }
            }
          ]
        }
      })
    ]);

    return {
      visitors,
      registered,
      activeUsers,
      contributors,
      conversionRates: {
        visitorToRegistered: visitors > 0 ? ((registered / visitors) * 100).toFixed(2) : 0,
        registeredToActive: registered > 0 ? ((activeUsers / registered) * 100).toFixed(2) : 0,
        activeToContributor: activeUsers > 0 ? ((contributors / activeUsers) * 100).toFixed(2) : 0
      }
    };
  }

  async getEngagementMetrics(startDate) {
    const [
      avgSessionDuration,
      pagesPerSession,
      bounceRate,
      topPages
    ] = await Promise.all([
      this.models.Vue.aggregate('duree_secondes', 'AVG', {
        where: {
          date_vue: { [Op.gte]: startDate },
          duree_secondes: { [Op.ne]: null }
        }
      }),

      this.models.Vue.findAll({
        where: { date_vue: { [Op.gte]: startDate } },
        attributes: [
          'session_id',
          [this.sequelize.fn('COUNT', '*'), 'pages']
        ],
        group: ['session_id']
      }),

      this.models.Vue.count({
        where: {
          date_vue: { [Op.gte]: startDate },
          duree_secondes: { [Op.lt]: 30 }
        }
      }),

      this.models.Vue.findAll({
        where: { date_vue: { [Op.gte]: startDate } },
        attributes: [
          'type_entite',
          'id_entite',
          [this.sequelize.fn('COUNT', '*'), 'vues']
        ],
        group: ['type_entite', 'id_entite'],
        order: [[this.sequelize.literal('vues'), 'DESC']],
        limit: 10
      })
    ]);

    const avgPages = pagesPerSession.length > 0 
      ? pagesPerSession.reduce((sum, session) => sum + parseInt(session.dataValues.pages), 0) / pagesPerSession.length
      : 0;

    const totalSessions = pagesPerSession.length;
    
    return {
      avgSessionDuration: avgSessionDuration ? parseFloat(avgSessionDuration).toFixed(2) : null,
      avgPagesPerSession: avgPages.toFixed(2),
      bounceRate: totalSessions > 0 ? ((bounceRate / totalSessions) * 100).toFixed(2) : 0,
      topPages
    };
  }

  async getDeviceStats(startDate) {
    return await this.models.Vue.findAll({
      where: { date_vue: { [Op.gte]: startDate } },
      attributes: [
        'device_type',
        [this.sequelize.fn('COUNT', '*'), 'count'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT session_id')), 'unique_sessions']
      ],
      group: ['device_type'],
      order: [[this.sequelize.literal('count'), 'DESC']]
    });
  }

  async getGeoAnalytics(startDate) {
    return await this.models.Vue.findAll({
      where: {
        date_vue: { [Op.gte]: startDate },
        pays: { [Op.ne]: null }
      },
      attributes: [
        'pays',
        'ville',
        [this.sequelize.fn('COUNT', '*'), 'vues'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT session_id')), 'sessions']
      ],
      group: ['pays', 'ville'],
      order: [[this.sequelize.literal('vues'), 'DESC']],
      limit: 20
    });
  }

  async getContentPerformance(startDate) {
    const [topOeuvres, topEvenements] = await Promise.all([
      this.models.Vue.findAll({
        where: {
          type_entite: 'oeuvre',
          date_vue: { [Op.gte]: startDate }
        },
        include: [{
          model: this.models.Oeuvre,
          attributes: ['titre'],
          include: [{ model: this.models.User, as: 'Saiseur', attributes: ['nom', 'prenom'] }]
        }],
        attributes: [
          'id_entite',
          [this.sequelize.fn('COUNT', '*'), 'vues'],
          [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT session_id')), 'sessions'],
          [this.sequelize.fn('AVG', this.sequelize.col('duree_secondes')), 'avg_duration']
        ],
        group: ['id_entite'],
        order: [[this.sequelize.literal('vues'), 'DESC']],
        limit: 10
      }),

      this.models.Vue.findAll({
        where: {
          type_entite: 'evenement',
          date_vue: { [Op.gte]: startDate }
        },
        include: [{
          model: this.models.Evenement,
          attributes: ['nom_evenement'],
          include: [{ model: this.models.User, attributes: ['nom', 'prenom'] }]
        }],
        attributes: [
          'id_entite',
          [this.sequelize.fn('COUNT', '*'), 'vues'],
          [this.sequelize.fn('COUNT', this.sequelize.literal('DISTINCT session_id')), 'sessions']
        ],
        group: ['id_entite'],
        order: [[this.sequelize.literal('vues'), 'DESC']],
        limit: 10
      })
    ]);

    return { topOeuvres, topEvenements };
  }

  // Actions de modération
  async validateUser(userId, data) {
    const user = await this.models.User.findByPk(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    await user.update({
      professionnel_valide: data.valide,
      statut_compte: data.valide ? 'actif' : 'suspendu',
      date_validation_professionnel: new Date(),
      validateur_professionnel_id: data.validateur_id
    });

    return user;
  }

  async validateOeuvre(oeuvreId, data) {
    const oeuvre = await this.models.Oeuvre.findByPk(oeuvreId);
    if (!oeuvre) throw new Error('Œuvre non trouvée');

    await oeuvre.update({
      statut: data.valide ? 'publie' : 'rejete',
      date_validation: new Date(),
      validateur_id: data.validateur_id,
      raison_rejet: data.raison_rejet
    });

    return oeuvre;
  }

  async moderateComment(commentId, data) {
    const comment = await this.models.Commentaire.findByPk(commentId);
    if (!comment) throw new Error('Commentaire non trouvé');

    await comment.update({
      statut: data.statut,
      date_modification: new Date()
    });

    return comment;
  }

  async moderateSignalement(signalementId, data, moderatorId) {
    const signalement = await this.models.Signalement.findByPk(signalementId);
    if (!signalement) throw new Error('Signalement non trouvé');

    const dureeTraitement = signalement.date_signalement 
      ? (new Date() - signalement.date_signalement) / (1000 * 60 * 60)
      : null;

    await signalement.update({
      statut: 'traite',
      id_moderateur: moderatorId,
      date_traitement: new Date(),
      action_prise: data.action,
      notes_moderation: data.notes,
      duree_traitement_heures: dureeTraitement
    });

    // Appliquer l'action selon le type
    await this.applyModerationAction(signalement, data.action, data.notes);

    return signalement;
  }

  async applyModerationAction(signalement, action, notes) {
    switch (action) {
      case 'suppression_contenu':
        await this.deleteReportedContent(signalement);
        break;
      case 'suspension_temporaire':
      case 'suspension_permanente':
        await this.suspendReportedUser(signalement, action, notes);
        break;
      case 'avertissement':
        await this.warnUser(signalement, notes);
        break;
      case 'signalement_autorites':
        await this.notifyAuthorities(signalement);
        break;
    }
  }

  async deleteReportedContent(signalement) {
    switch (signalement.type_entite) {
      case 'commentaire':
        await this.models.Commentaire.update(
          { statut: 'supprime', date_suppression: new Date() },
          { where: { id_commentaire: signalement.id_entite } }
        );
        break;
      case 'oeuvre':
        await this.models.Oeuvre.update(
          { statut: 'supprime', date_suppression: new Date() },
          { where: { id_oeuvre: signalement.id_entite } }
        );
        break;
    }
  }

  async suspendUser(userId, data) {
    const user = await this.models.User.findByPk(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    await user.update({
      statut_compte: 'suspendu',
      date_suspension: new Date(),
      raison_suspension: data.raison,
      duree_suspension: data.duree
    });

    return user;
  }

  async logAdminAction(adminId, action, entityType, entityId, data) {
    try {
      await this.models.AuditLog.create({
        id_admin: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: JSON.stringify(data),
        ip_address: data.ip || null,
        user_agent: data.userAgent || null,
        date_action: new Date()
      });
    } catch (error) {
      console.error('Erreur lors du log audit:', error);
    }
  }
}

module.exports = DashboardController;