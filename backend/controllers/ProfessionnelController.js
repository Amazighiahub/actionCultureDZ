// controllers/ProfessionnelController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class ProfessionnelController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue - utilise l'utilitaire centralisé
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search);
  }

  // Récupérer tous les professionnels
  async getAllProfessionnels(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, specialite, wilaya, search, verifie } = req.query;
      const offset = (page - 1) * limit;

      const where = {
        id_type_user: { [Op.in]: [2, 3, 4] }  // Types professionnels
      };

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('prenom', search),
          ...this.buildMultiLangSearchLocal('biographie', search),
          { entreprise: { [Op.like]: `%${search}%` } }
        ];
      }

      if (verifie !== undefined) {
        where.verifie = verifie === 'true';
      }

      const include = [
        { model: this.models.TypeUser, attributes: ['nom_type'] }
      ];

      if (wilaya) {
        include.push({
          model: this.models.Wilaya,
          where: { id_wilaya: wilaya }
        });
      }

      const professionnels = await this.models.User.findAndCountAll({
        where,
        include,
        attributes: { exclude: ['mot_de_passe', 'reset_token'] },
        limit: parseInt(limit),
        offset,
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('User.nom'), `$.${lang}`), 'ASC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          professionnels: translateDeep(professionnels.rows, lang),
          pagination: {
            total: professionnels.count,
            page: parseInt(page),
            pages: Math.ceil(professionnels.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Récupérer un professionnel par ID
  async getProfessionnelById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const professionnel = await this.models.User.findByPk(id, {
        include: [
          { model: this.models.TypeUser },
          { model: this.models.Wilaya },
          {
            model: this.models.Oeuvre,
            as: 'OeuvresSaisies',
            where: { statut: 'publie' },
            required: false,
            limit: 10
          },
          {
            model: this.models.Evenement,
            as: 'EvenementsOrganises',
            required: false,
            limit: 5
          }
        ],
        attributes: { exclude: ['mot_de_passe', 'reset_token'] }
      });

      if (!professionnel) {
        return res.status(404).json({ success: false, error: 'Professionnel non trouvé' });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(professionnel, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Profil du professionnel connecté
  async getMyProfile(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡

      const professionnel = await this.models.User.findByPk(req.user.id_user, {
        include: [
          { model: this.models.TypeUser },
          { model: this.models.Wilaya }
        ],
        attributes: { exclude: ['mot_de_passe', 'reset_token'] }
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(professionnel, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Mettre à jour le profil
  async updateMyProfile(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { nom, prenom, biographie, ...otherFields } = req.body;

      const user = await this.models.User.findByPk(req.user.id_user);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const updates = { ...otherFields };

      // ⚡ Gérer les champs multilingues
      if (nom !== undefined) {
        if (typeof nom === 'object') {
          updates.nom = mergeTranslations(user.nom, nom);
        } else {
          updates.nom = mergeTranslations(user.nom, { [lang]: nom });
        }
      }

      if (prenom !== undefined) {
        if (typeof prenom === 'object') {
          updates.prenom = mergeTranslations(user.prenom, prenom);
        } else {
          updates.prenom = mergeTranslations(user.prenom, { [lang]: prenom });
        }
      }

      if (biographie !== undefined) {
        if (typeof biographie === 'object') {
          updates.biographie = mergeTranslations(user.biographie, biographie);
        } else {
          updates.biographie = mergeTranslations(user.biographie, { [lang]: biographie });
        }
      }

      await user.update(updates);

      const userUpdated = await this.models.User.findByPk(req.user.id_user, {
        include: [{ model: this.models.TypeUser }],
        attributes: { exclude: ['mot_de_passe', 'reset_token'] }
      });

      // ⚡ Traduire
      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: translateDeep(userUpdated, lang)
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Œuvres du professionnel
  async getMesOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, statut } = req.query;
      const offset = (page - 1) * limit;

      const where = { saisi_par: req.user.id_user };
      if (statut) where.statut = statut;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Media, limit: 1 }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_creation', 'DESC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          oeuvres: translateDeep(oeuvres.rows, lang),
          pagination: {
            total: oeuvres.count,
            page: parseInt(page),
            pages: Math.ceil(oeuvres.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Événements du professionnel
  async getMesEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, statut } = req.query;
      const offset = (page - 1) * limit;

      const where = { id_organisateur: req.user.id_user };
      if (statut) where.statut = statut;

      const evenements = await this.models.Evenement.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeEvenement },
          { model: this.models.Lieu }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_debut', 'DESC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          evenements: translateDeep(evenements.rows, lang),
          pagination: {
            total: evenements.count,
            page: parseInt(page),
            pages: Math.ceil(evenements.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Statistiques du professionnel
  async getMesStatistiques(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const userId = req.user.id_user;

      const [
        totalOeuvres,
        totalEvenements,
        oeuvresPubliees,
        evenementsActifs
      ] = await Promise.all([
        this.models.Oeuvre.count({ where: { saisi_par: userId } }),
        this.models.Evenement.count({ where: { id_organisateur: userId } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'publie' } }),
        this.models.Evenement.count({ 
          where: { 
            id_organisateur: userId,
            date_fin: { [Op.gte]: new Date() }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalOeuvres,
          totalEvenements,
          oeuvresPubliees,
          evenementsActifs,
          tauxPublication: totalOeuvres > 0 ? Math.round((oeuvresPubliees / totalOeuvres) * 100) : 0
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Recherche de professionnels
  async searchProfessionnels(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const where = {
        id_type_user: { [Op.in]: [2, 3, 4] },
        [Op.or]: [
          ...this.buildMultiLangSearchLocal('nom', q),
          ...this.buildMultiLangSearchLocal('prenom', q),
          { entreprise: { [Op.like]: `%${q}%` } }
        ]
      };

      const professionnels = await this.models.User.findAll({
        where,
        attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'entreprise'],
        include: [{ model: this.models.TypeUser, attributes: ['nom_type'] }],
        limit: parseInt(limit)
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(professionnels, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // ========================================
  // MÉTHODES POUR LES ROUTES DU DASHBOARD
  // ========================================

  // Dashboard du professionnel
  async getDashboard(req, res) {
    try {
      const lang = req.lang || 'fr';
      const userId = req.user.id_user;

      // Récupérer les statistiques en parallèle
      const [
        totalOeuvres,
        oeuvresPubliees,
        oeuvresEnAttente,
        totalEvenements,
        evenementsAvenir,
        totalArtisanats = 0,
        artisanatsEnVente = 0,
        recentOeuvres,
        recentEvenements
      ] = await Promise.all([
        this.models.Oeuvre.count({ where: { saisi_par: userId } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'publie' } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'en_attente' } }),
        this.models.Evenement.count({ where: { id_user: userId } }),
        this.models.Evenement.count({
          where: {
            id_user: userId,
            date_debut: { [Op.gte]: new Date() }
          }
        }),
        // Artisanats via les œuvres de l'utilisateur
        this.models.Artisanat ? this.models.Artisanat.count({
          include: [{ model: this.models.Oeuvre, where: { saisi_par: userId }, required: true }]
        }) : 0,
        0, // artisanatsEnVente - pas de statut direct sur Artisanat
        this.models.Oeuvre.findAll({
          where: { saisi_par: userId },
          include: [{ model: this.models.TypeOeuvre, attributes: ['nom'] }],
          limit: 5,
          order: [['date_creation', 'DESC']]
        }),
        this.models.Evenement.findAll({
          where: { id_user: userId },
          include: [{ model: this.models.TypeEvenement, attributes: ['nom'] }],
          limit: 5,
          order: [['date_creation', 'DESC']]
        })
      ]);

      res.json({
        success: true,
        data: {
          statistiques: {
            oeuvres: {
              total: totalOeuvres,
              publiees: oeuvresPubliees,
              en_attente: oeuvresEnAttente
            },
            evenements: {
              total: totalEvenements,
              a_venir: evenementsAvenir
            },
            artisanats: {
              total: totalArtisanats,
              en_vente: artisanatsEnVente
            }
          },
          recent: {
            oeuvres: translateDeep(recentOeuvres, lang),
            evenements: translateDeep(recentEvenements, lang)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getDashboard:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Liste des œuvres du professionnel (alias pour getMesOeuvres)
  async getMyOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page = 1, limit = 20, statut, type } = req.query;
      const offset = (page - 1) * parseInt(limit);
      const userId = req.user.id_user;

      const where = { saisi_par: userId };
      if (statut) where.statut = statut;
      if (type) where.id_type_oeuvre = type;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeOeuvre, attributes: ['id_type_oeuvre', 'nom'] },
          { model: this.models.Media, limit: 1, required: false }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          oeuvres: translateDeep(oeuvres.rows, lang),
          pagination: {
            total: oeuvres.count,
            page: parseInt(page),
            pages: Math.ceil(oeuvres.count / parseInt(limit)),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getMyOeuvres:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Liste des artisanats du professionnel (via les œuvres)
  async getMyArtisanats(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page = 1, limit = 20, statut } = req.query;
      const offset = (page - 1) * parseInt(limit);
      const userId = req.user.id_user;

      // Vérifier si le modèle Artisanat existe
      if (!this.models.Artisanat) {
        return res.json({
          success: true,
          data: {
            artisanats: [],
            pagination: { total: 0, page: 1, pages: 0, limit: parseInt(limit) }
          },
          lang
        });
      }

      // Les artisanats sont liés aux œuvres, on récupère via la jointure
      const oeuvreWhere = { saisi_par: userId };
      if (statut) oeuvreWhere.statut = statut;

      const artisanats = await this.models.Artisanat.findAndCountAll({
        include: [
          {
            model: this.models.Oeuvre,
            where: oeuvreWhere,
            attributes: ['id_oeuvre', 'titre', 'statut', 'date_creation'],
            include: [
              { model: this.models.Media, limit: 1, required: false }
            ]
          },
          { model: this.models.Materiau, attributes: ['id_materiau', 'nom'], required: false },
          { model: this.models.Technique, attributes: ['id_technique', 'nom'], required: false }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          artisanats: translateDeep(artisanats.rows, lang),
          pagination: {
            total: artisanats.count,
            page: parseInt(page),
            pages: Math.ceil(artisanats.count / parseInt(limit)),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getMyArtisanats:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Liste des événements du professionnel
  async getMyEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { page = 1, limit = 20, statut } = req.query;
      const offset = (page - 1) * parseInt(limit);
      const userId = req.user.id_user;

      const where = { id_user: userId };

      // Filtre par statut temporel
      if (statut === 'avenir') {
        where.date_debut = { [Op.gte]: new Date() };
      } else if (statut === 'passe') {
        where.date_fin = { [Op.lt]: new Date() };
      } else if (statut === 'en_cours') {
        where.date_debut = { [Op.lte]: new Date() };
        where.date_fin = { [Op.gte]: new Date() };
      }

      const evenements = await this.models.Evenement.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeEvenement, attributes: ['id_type_evenement', 'nom'], required: false },
          { model: this.models.Lieu, attributes: ['id_lieu', 'nom', 'adresse'], required: false }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_debut', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          evenements: translateDeep(evenements.rows, lang),
          pagination: {
            total: evenements.count,
            page: parseInt(page),
            pages: Math.ceil(evenements.count / parseInt(limit)),
            limit: parseInt(limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getMyEvenements:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Statistiques d'une œuvre
  async getOeuvreStats(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id_user;

      const oeuvre = await this.models.Oeuvre.findOne({
        where: { id_oeuvre: id, saisi_par: userId }
      });

      if (!oeuvre) {
        return res.status(404).json({ success: false, error: 'Œuvre non trouvée' });
      }

      // Compter les vues, favoris, commentaires
      const [vues, favoris, commentaires] = await Promise.all([
        oeuvre.nb_vues || 0,
        this.models.Favori ? this.models.Favori.count({ where: { id_oeuvre: id } }) : 0,
        this.models.Commentaire ? this.models.Commentaire.count({ where: { id_oeuvre: id } }) : 0
      ]);

      res.json({
        success: true,
        data: {
          vues,
          favoris,
          commentaires
        }
      });

    } catch (error) {
      console.error('Erreur getOeuvreStats:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Statistiques d'un événement
  async getEvenementStats(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id_user;

      const evenement = await this.models.Evenement.findOne({
        where: { id_evenement: id, id_user: userId }
      });

      if (!evenement) {
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      // Compter les participants
      const [inscrits, confirmes, presents] = await Promise.all([
        this.models.Participation ? this.models.Participation.count({ where: { id_evenement: id } }) : 0,
        this.models.Participation ? this.models.Participation.count({ where: { id_evenement: id, statut: 'confirme' } }) : 0,
        this.models.Participation ? this.models.Participation.count({ where: { id_evenement: id, present: true } }) : 0
      ]);

      res.json({
        success: true,
        data: {
          inscrits,
          confirmes,
          presents,
          places_restantes: evenement.capacite ? evenement.capacite - inscrits : null
        }
      });

    } catch (error) {
      console.error('Erreur getEvenementStats:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Gestion des participants
  async manageParticipants(req, res) {
    try {
      const { id } = req.params;
      const { userId, action, notes } = req.body;
      const organisateurId = req.user.id_user;

      // Vérifier que l'événement appartient à l'utilisateur
      const evenement = await this.models.Evenement.findOne({
        where: { id_evenement: id, id_user: organisateurId }
      });

      if (!evenement) {
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      // Trouver la participation
      const participation = await this.models.Participation.findOne({
        where: { id_evenement: id, id_user: userId }
      });

      if (!participation) {
        return res.status(404).json({ success: false, error: 'Participant non trouvé' });
      }

      // Appliquer l'action
      const updates = {};
      switch (action) {
        case 'confirmer':
          updates.statut = 'confirme';
          break;
        case 'rejeter':
          updates.statut = 'rejete';
          break;
        case 'marquer_present':
          updates.present = true;
          break;
        case 'marquer_absent':
          updates.present = false;
          break;
      }

      if (notes) updates.notes_organisateur = notes;

      await participation.update(updates);

      res.json({
        success: true,
        message: 'Participant mis à jour',
        data: participation
      });

    } catch (error) {
      console.error('Erreur manageParticipants:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Calendrier des événements
  async getEventCalendar(req, res) {
    try {
      const lang = req.lang || 'fr';
      const userId = req.user.id_user;
      const { year, month } = req.query;

      const currentYear = year || new Date().getFullYear();
      const currentMonth = month || new Date().getMonth() + 1;

      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);

      const evenements = await this.models.Evenement.findAll({
        where: {
          id_user: userId,
          [Op.or]: [
            { date_debut: { [Op.between]: [startDate, endDate] } },
            { date_fin: { [Op.between]: [startDate, endDate] } }
          ]
        },
        attributes: ['id_evenement', 'titre', 'date_debut', 'date_fin', 'statut'],
        order: [['date_debut', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          year: parseInt(currentYear),
          month: parseInt(currentMonth),
          evenements: translateDeep(evenements, lang)
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getEventCalendar:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Mise à jour du profil professionnel
  async updateProfessionalProfile(req, res) {
    try {
      const lang = req.lang || 'fr';
      const userId = req.user.id_user;
      const updates = req.body;

      const user = await this.models.User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      await user.update(updates);

      res.json({
        success: true,
        message: 'Profil professionnel mis à jour',
        data: translateDeep(user, lang)
      });

    } catch (error) {
      console.error('Erreur updateProfessionalProfile:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Upload portfolio
  async uploadPortfolio(req, res) {
    try {
      // Cette méthode nécessite un middleware d'upload
      res.status(501).json({
        success: false,
        error: 'Upload de portfolio nécessite configuration du middleware multer'
      });

    } catch (error) {
      console.error('Erreur uploadPortfolio:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Export de données
  async exportData(req, res) {
    try {
      const { type, format = 'csv' } = req.query;
      const userId = req.user.id_user;

      let data = [];
      let filename = '';

      switch (type) {
        case 'oeuvres':
          data = await this.models.Oeuvre.findAll({
            where: { saisi_par: userId },
            raw: true
          });
          filename = 'mes_oeuvres';
          break;
        case 'evenements':
          data = await this.models.Evenement.findAll({
            where: { id_user: userId },
            raw: true
          });
          filename = 'mes_evenements';
          break;
        case 'artisanats':
          if (this.models.Artisanat) {
            data = await this.models.Artisanat.findAll({
              where: { id_user: userId },
              raw: true
            });
          }
          filename = 'mes_artisanats';
          break;
        default:
          return res.status(400).json({ success: false, error: 'Type d\'export invalide' });
      }

      if (format === 'csv') {
        if (data.length === 0) {
          return res.status(404).json({ success: false, error: 'Aucune donnée à exporter' });
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csv);
      } else {
        // Pour Excel, on retourne JSON (nécessiterait une lib comme xlsx)
        res.json({
          success: true,
          data,
          message: 'Format Excel nécessite une configuration supplémentaire'
        });
      }

    } catch (error) {
      console.error('Erreur exportData:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Notifications du professionnel
  async getNotifications(req, res) {
    try {
      const userId = req.user.id_user;
      const { limit = 20, offset = 0, marque } = req.query;

      // Si le modèle Notification existe
      if (this.models.Notification) {
        const where = { id_user: userId };
        if (marque !== undefined) {
          where.lu = marque === 'true';
        }

        const notifications = await this.models.Notification.findAndCountAll({
          where,
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['date_creation', 'DESC']]
        });

        return res.json({
          success: true,
          data: {
            notifications: notifications.rows,
            total: notifications.count,
            non_lues: await this.models.Notification.count({ where: { id_user: userId, lu: false } })
          }
        });
      }

      // Sinon retourner un tableau vide
      res.json({
        success: true,
        data: {
          notifications: [],
          total: 0,
          non_lues: 0
        }
      });

    } catch (error) {
      console.error('Erreur getNotifications:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Analytics overview
  async getAnalyticsOverview(req, res) {
    try {
      const userId = req.user.id_user;
      const { period = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Statistiques de base
      const [
        totalOeuvres,
        totalEvenements,
        oeuvresRecentes,
        evenementsRecents
      ] = await Promise.all([
        this.models.Oeuvre.count({ where: { saisi_par: userId } }),
        this.models.Evenement.count({ where: { id_user: userId } }),
        this.models.Oeuvre.count({
          where: {
            saisi_par: userId,
            date_creation: { [Op.gte]: startDate }
          }
        }),
        this.models.Evenement.count({
          where: {
            id_user: userId,
            date_creation: { [Op.gte]: startDate }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          period: parseInt(period),
          totaux: {
            oeuvres: totalOeuvres,
            evenements: totalEvenements
          },
          periode: {
            nouvelles_oeuvres: oeuvresRecentes,
            nouveaux_evenements: evenementsRecents
          }
        }
      });

    } catch (error) {
      console.error('Erreur getAnalyticsOverview:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
}

module.exports = ProfessionnelController;
