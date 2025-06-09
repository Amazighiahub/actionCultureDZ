const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');

class ProfessionnelController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.uploadConfig = this.setupUploadConfig();
  }

  setupUploadConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/portfolio/');
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
    return multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
  }

  // Dashboard professionnel
  async getDashboard(req, res) {
    try {
      const userId = req.user.id_user;

      const [
        totalOeuvres,
        oeuvresPubliees,
        oeuvresEnAttente,
        oeuvresRejetees,
        totalEvenements,
        evenementsAVenir,
        totalCommentaires,
        totalVues,
        totalFavoris,
        totalArtisanats,
        artisanatsEnVente
      ] = await Promise.all([
        // Œuvres
        this.models.Oeuvre.count({ where: { saisi_par: userId } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'publie' } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'en_attente' } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'rejete' } }),
        
        // Événements
        this.models.Evenement.count({ where: { id_user: userId } }),
        this.models.Evenement.count({
          where: {
            id_user: userId,
            date_debut: { [Op.gte]: new Date() }
          }
        }),
        
        // Engagement
        this.models.Commentaire.count({ where: { id_user: userId, statut: 'publie' } }),
        
        // Vues (tracking)
        this.getViewsCount(userId),
        
        // Favoris sur les œuvres du professionnel
        this.models.Favori.count({
          where: {
            type_entite: 'oeuvre',
            id_entite: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_oeuvre FROM oeuvre 
                WHERE saisi_par = ${userId}
              )`)
            }
          }
        }),

        // Artisanats
        this.models.Artisanat.count({
          include: [{
            model: this.models.Oeuvre,
            where: { saisi_par: userId },
            required: true
          }]
        }),

        this.models.Artisanat.count({
          where: { disponible_vente: true },
          include: [{
            model: this.models.Oeuvre,
            where: { saisi_par: userId },
            required: true
          }]
        })
      ]);

      res.json({
        success: true,
        data: {
          stats: {
            oeuvres: {
              total: totalOeuvres,
              publiees: oeuvresPubliees,
              enAttente: oeuvresEnAttente,
              rejetees: oeuvresRejetees
            },
            evenements: {
              total: totalEvenements,
              aVenir: evenementsAVenir
            },
            artisanats: {
              total: totalArtisanats,
              enVente: artisanatsEnVente
            },
            engagement: {
              commentaires: totalCommentaires,
              vues: totalVues,
              favoris: totalFavoris
            }
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du dashboard professionnel:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Helper pour compter les vues
  async getViewsCount(userId) {
    try {
      const result = await this.models.Vue.count({
        where: {
          [Op.or]: [
            {
              type_entite: 'oeuvre',
              id_entite: {
                [Op.in]: this.sequelize.literal(`(
                  SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ${userId}
                )`)
              }
            },
            {
              type_entite: 'evenement',
              id_entite: {
                [Op.in]: this.sequelize.literal(`(
                  SELECT id_evenement FROM evenement WHERE id_user = ${userId}
                )`)
              }
            }
          ]
        }
      });
      return result;
    } catch (error) {
      console.error('Erreur comptage vues:', error);
      return 0;
    }
  }

  // Gestion des œuvres du professionnel
  async getMyOeuvres(req, res) {
    try {
      const { page = 1, limit = 10, statut, type } = req.query;
      const offset = (page - 1) * limit;
      const where = { saisi_par: req.user.id_user };

      if (statut) where.statut = statut;
      if (type) where.id_type_oeuvre = type;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
          { model: this.models.Langue, attributes: ['nom'] },
          { 
            model: this.models.Categorie,
            through: { model: this.models.OeuvreCategorie },
            attributes: ['nom']
          },
          { 
            model: this.models.Media,
            attributes: ['url', 'type_media'],
            limit: 1
          },
          {
            model: this.models.User,
            as: 'Validateur',
            attributes: ['nom', 'prenom']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']],
        distinct: true
      });

      // Ajouter stats pour chaque œuvre
      for (const oeuvre of oeuvres.rows) {
        const [vues, favoris, commentaires] = await Promise.all([
          this.models.Vue.count({
            where: { type_entite: 'oeuvre', id_entite: oeuvre.id_oeuvre }
          }),
          this.models.Favori.count({
            where: { type_entite: 'oeuvre', id_entite: oeuvre.id_oeuvre }
          }),
          this.models.Commentaire.count({
            where: { id_oeuvre: oeuvre.id_oeuvre, statut: 'publie' }
          })
        ]);
        
        oeuvre.dataValues.stats = { vues, favoris, commentaires };
      }

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
      console.error('Erreur lors de la récupération des œuvres:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Gestion des artisanats du professionnel
  async getMyArtisanats(req, res) {
    try {
      const { page = 1, limit = 10, statut } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.id_user;

      const where = {
        saisi_par: userId
      };

      if (statut === 'en_vente') {
        where['$Artisanat.disponible_vente$'] = true;
      } else if (statut === 'vendu') {
        where['$Artisanat.disponible_vente$'] = false;
        where['$Artisanat.date_vente$'] = { [Op.ne]: null };
      }

      const artisanats = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          {
            model: this.models.Artisanat,
            required: true,
            include: [
              { model: this.models.Materiau, attributes: ['nom'] },
              { model: this.models.Technique, attributes: ['nom'] }
            ]
          },
          { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
          { 
            model: this.models.Media,
            attributes: ['url', 'type_media'],
            limit: 3
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']],
        distinct: true
      });

      // Ajouter statistiques pour chaque artisanat
      for (const artisanat of artisanats.rows) {
        const [vues, favoris] = await Promise.all([
          this.models.Vue.count({
            where: { type_entite: 'oeuvre', id_entite: artisanat.id_oeuvre }
          }),
          this.models.Favori.count({
            where: { type_entite: 'oeuvre', id_entite: artisanat.id_oeuvre }
          })
        ]);
        
        artisanat.dataValues.stats = { vues, favoris };
      }

      res.json({
        success: true,
        data: {
          artisanats: artisanats.rows,
          pagination: {
            total: artisanats.count,
            page: parseInt(page),
            pages: Math.ceil(artisanats.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des artisanats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Gestion des événements du professionnel
  async getMyEvenements(req, res) {
    try {
      const { page = 1, limit = 10, statut } = req.query;
      const offset = (page - 1) * limit;
      const where = { id_user: req.user.id_user };

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
          { model: this.models.TypeEvenement, attributes: ['nom_type'] },
          { model: this.models.Lieu, attributes: ['nom', 'adresse'] },
          {
            model: this.models.User,
            through: { 
              model: this.models.EvenementUser,
              attributes: ['statut_participation']
            },
            attributes: ['nom', 'prenom']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_debut', 'DESC']],
        distinct: true
      });

      // Ajouter le nombre de participants pour chaque événement
      for (const evenement of evenements.rows) {
        const [participantsCount, confirmes, presents, vues] = await Promise.all([
          this.models.EvenementUser.count({
            where: { id_evenement: evenement.id_evenement }
          }),
          this.models.EvenementUser.count({
            where: { 
              id_evenement: evenement.id_evenement,
              statut_participation: 'confirme'
            }
          }),
          this.models.EvenementUser.count({
            where: { 
              id_evenement: evenement.id_evenement,
              statut_participation: 'present'
            }
          }),
          this.models.Vue.count({
            where: { type_entite: 'evenement', id_entite: evenement.id_evenement }
          })
        ]);
        
        evenement.dataValues.stats = {
          participantsCount,
          confirmes,
          presents,
          vues,
          tauxPresence: participantsCount > 0 ? ((presents / participantsCount) * 100).toFixed(2) : 0
        };
      }

      res.json({
        success: true,
        data: {
          evenements: evenements.rows,
          pagination: {
            total: evenements.count,
            page: parseInt(page),
            pages: Math.ceil(evenements.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Calendrier des événements
  async getEventCalendar(req, res) {
    try {
      const { year, month } = req.query;
      const startDate = new Date(year || new Date().getFullYear(), month ? month - 1 : 0, 1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const evenements = await this.models.Evenement.findAll({
        where: {
          id_user: req.user.id_user,
          [Op.or]: [
            {
              date_debut: {
                [Op.between]: [startDate, endDate]
              }
            },
            {
              date_fin: {
                [Op.between]: [startDate, endDate]
              }
            }
          ]
        },
        include: [
          { model: this.models.TypeEvenement, attributes: ['nom_type'] },
          { model: this.models.Lieu, attributes: ['nom'] }
        ],
        order: [['date_debut', 'ASC']]
      });

      // Formatter pour calendrier
      const calendar = evenements.map(event => ({
        id: event.id_evenement,
        title: event.nom_evenement,
        start: event.date_debut,
        end: event.date_fin,
        type: event.TypeEvenement?.nom_type,
        lieu: event.Lieu?.nom,
        allDay: !event.heure_debut
      }));

      res.json({
        success: true,
        data: {
          events: calendar,
          period: {
            start: startDate,
            end: endDate
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du calendrier:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Statistiques détaillées pour une œuvre
  async getOeuvreStats(req, res) {
    try {
      const { id } = req.params;

      // Vérifier que l'œuvre appartient au professionnel
      const oeuvre = await this.models.Oeuvre.findOne({
        where: { 
          id_oeuvre: id,
          saisi_par: req.user.id_user
        }
      });

      if (!oeuvre) {
        return res.status(404).json({
          success: false,
          error: 'Œuvre non trouvée'
        });
      }

      const [
        favorisCount,
        commentairesCount,
        notesMoyenne,
        vuesData,
        vuesUniques
      ] = await Promise.all([
        // Nombre de favoris
        this.models.Favori.count({
          where: {
            type_entite: 'oeuvre',
            id_entite: id
          }
        }),
        
        // Nombre de commentaires
        this.models.Commentaire.count({
          where: {
            id_oeuvre: id,
            statut: 'publie'
          }
        }),
        
        // Note moyenne
        this.models.Commentaire.aggregate('note_qualite', 'AVG', {
          where: {
            id_oeuvre: id,
            note_qualite: { [Op.ne]: null }
          }
        }),
        
        // Vues totales avec évolution
        this.models.Vue.findAll({
          where: {
            type_entite: 'oeuvre',
            id_entite: id
          },
          attributes: [
            [this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'date'],
            [this.sequelize.fn('COUNT', '*'), 'vues']
          ],
          group: [this.sequelize.fn('DATE', this.sequelize.col('date_vue'))],
          order: [[this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'ASC']]
        }),

        // Vues uniques
        this.models.Vue.count({
          where: {
            type_entite: 'oeuvre',
            id_entite: id,
            is_unique: true
          }
        })
      ]);

      // Évolution des favoris
      const favorisEvolution = await this.models.Favori.findAll({
        where: {
          type_entite: 'oeuvre',
          id_entite: id
        },
        attributes: [
          [this.sequelize.fn('DATE', this.sequelize.col('date_ajout')), 'date'],
          [this.sequelize.fn('COUNT', '*'), 'count']
        ],
        group: [this.sequelize.fn('DATE', this.sequelize.col('date_ajout'))],
        order: [[this.sequelize.fn('DATE', this.sequelize.col('date_ajout')), 'ASC']]
      });

      res.json({
        success: true,
        data: {
          stats: {
            favoris: favorisCount,
            commentaires: commentairesCount,
            noteMoyenne: notesMoyenne ? parseFloat(notesMoyenne).toFixed(2) : null,
            vues: vuesData.reduce((total, day) => total + parseInt(day.dataValues.vues), 0),
            vuesUniques: vuesUniques
          },
          evolution: {
            vues: vuesData,
            favoris: favorisEvolution
          }
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

  // Statistiques détaillées pour un événement
  async getEvenementStats(req, res) {
    try {
      const { id } = req.params;

      // Vérifier que l'événement appartient au professionnel
      const evenement = await this.models.Evenement.findOne({
        where: { 
          id_evenement: id,
          id_user: req.user.id_user
        }
      });

      if (!evenement) {
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé'
        });
      }

      const [
        inscriptions,
        confirmations,
        presents,
        favorisCount,
        commentairesCount,
        vuesCount
      ] = await Promise.all([
        // Inscriptions
        this.models.EvenementUser.count({
          where: { id_evenement: id }
        }),
        
        // Confirmations
        this.models.EvenementUser.count({
          where: { 
            id_evenement: id,
            statut_participation: 'confirme'
          }
        }),
        
        // Présents
        this.models.EvenementUser.count({
          where: { 
            id_evenement: id,
            statut_participation: 'present'
          }
        }),
        
        // Favoris
        this.models.Favori.count({
          where: {
            type_entite: 'evenement',
            id_entite: id
          }
        }),
        
        // Commentaires
        this.models.Commentaire.count({
          where: {
            id_evenement: id,
            statut: 'publie'
          }
        }),

        // Vues
        this.models.Vue.count({
          where: {
            type_entite: 'evenement',
            id_entite: id
          }
        })
      ]);

      // Liste des participants avec détails
      const participants = await this.models.EvenementUser.findAll({
        where: { id_evenement: id },
        include: [
          {
            model: this.models.User,
            attributes: ['nom', 'prenom', 'email', 'type_user']
          }
        ],
        order: [['date_inscription', 'DESC']]
      });

      // Évolution des inscriptions
      const evolutionInscriptions = await this.models.EvenementUser.findAll({
        where: { id_evenement: id },
        attributes: [
          [this.sequelize.fn('DATE', this.sequelize.col('date_inscription')), 'date'],
          [this.sequelize.fn('COUNT', '*'), 'inscriptions']
        ],
        group: [this.sequelize.fn('DATE', this.sequelize.col('date_inscription'))],
        order: [[this.sequelize.fn('DATE', this.sequelize.col('date_inscription')), 'ASC']]
      });

      res.json({
        success: true,
        data: {
          stats: {
            inscriptions,
            confirmations,
            presents,
            tauxPresence: inscriptions > 0 ? ((presents / inscriptions) * 100).toFixed(2) : 0,
            tauxConfirmation: inscriptions > 0 ? ((confirmations / inscriptions) * 100).toFixed(2) : 0,
            favoris: favorisCount,
            commentaires: commentairesCount,
            vues: vuesCount
          },
          participants,
          evolution: evolutionInscriptions
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

  // Gestion des participants d'un événement
  async manageParticipants(req, res) {
    try {
      const { id } = req.params;
      const { userId, action, notes } = req.body;

      // Vérifier que l'événement appartient au professionnel
      const evenement = await this.models.Evenement.findOne({
        where: { 
          id_evenement: id,
          id_user: req.user.id_user
        }
      });

      if (!evenement) {
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé'
        });
      }

      const participation = await this.models.EvenementUser.findOne({
        where: {
          id_evenement: id,
          id_user: userId
        }
      });

      if (!participation) {
        return res.status(404).json({
          success: false,
          error: 'Participant non trouvé'
        });
      }

      // Actions possibles
      switch (action) {
        case 'confirmer':
          await participation.update({ 
            statut_participation: 'confirme',
            notes,
            date_validation: new Date()
          });
          break;
        case 'rejeter':
          await participation.update({ 
            statut_participation: 'rejete',
            notes,
            date_validation: new Date()
          });
          break;
        case 'marquer_present':
          await participation.update({ 
            statut_participation: 'present',
            notes
          });
          break;
        case 'marquer_absent':
          await participation.update({ 
            statut_participation: 'absent',
            notes
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Action non reconnue'
          });
      }

      res.json({
        success: true,
        message: 'Statut du participant mis à jour'
      });

    } catch (error) {
      console.error('Erreur lors de la gestion des participants:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Gestion du profil professionnel
  async updateProfessionalProfile(req, res) {
    try {
      const userId = req.user.id_user;
      const {
        specialites,
        certifications,
        experience,
        description_activite,
        site_web,
        horaires_atelier,
        accepte_commandes,
        prix_minimum,
        delai_livraison
      } = req.body;

      // Mettre à jour le profil utilisateur
      await this.models.User.update({
        description_activite,
        site_web,
        horaires_atelier,
        accepte_commandes,
        prix_minimum,
        delai_livraison
      }, {
        where: { id_user: userId }
      });

      // Gérer les spécialités (relation many-to-many)
      if (specialites && Array.isArray(specialites)) {
        // Supprimer les anciennes spécialités
        await this.models.UserSpecialite.destroy({
          where: { id_user: userId }
        });
        
        // Ajouter les nouvelles
        const specialitePromises = specialites.map(specId =>
          this.models.UserSpecialite.create({
            id_user: userId,
            id_specialite: specId
          })
        );
        await Promise.all(specialitePromises);
      }

      // Gérer les certifications
      if (certifications && Array.isArray(certifications)) {
        await this.models.UserCertification.destroy({
          where: { id_user: userId }
        });
        
        const certificationPromises = certifications.map(cert =>
          this.models.UserCertification.create({
            id_user: userId,
            nom_certification: cert.nom,
            organisme: cert.organisme,
            date_obtention: cert.date,
            numero_certification: cert.numero
          })
        );
        await Promise.all(certificationPromises);
      }

      res.json({
        success: true,
        message: 'Profil professionnel mis à jour'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Upload portfolio
  async uploadPortfolio(req, res) {
    try {
      const upload = this.uploadConfig.array('portfolio', 10);
      
      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            error: 'Erreur upload: ' + err.message
          });
        }

        const userId = req.user.id_user;
        const files = req.files;
        
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Aucun fichier uploadé'
          });
        }

        // Sauvegarder les médias en base
        const mediaPromises = files.map(file =>
          this.models.Media.create({
            nom_fichier: file.filename,
            nom_original: file.originalname,
            url: `/uploads/portfolio/${file.filename}`,
            type_media: file.mimetype.startsWith('image/') ? 'image' : 'document',
            taille: file.size,
            id_user: userId,
            type_utilisation: 'portfolio'
          })
        );

        const medias = await Promise.all(mediaPromises);

        res.json({
          success: true,
          message: 'Portfolio uploadé avec succès',
          data: {
            medias: medias.map(m => ({
              id: m.id_media,
              url: m.url,
              nom: m.nom_original
            }))
          }
        });
      });

    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Export des données (Excel amélioré)
  async exportData(req, res) {
    try {
      const { type, format = 'excel' } = req.query;
      const userId = req.user.id_user;

      let data;
      let filename;
      let columns;

      switch (type) {
        case 'oeuvres':
          data = await this.models.Oeuvre.findAll({
            where: { saisi_par: userId },
            include: [
              { model: this.models.TypeOeuvre, attributes: ['nom_type'] },
              { model: this.models.Langue, attributes: ['nom'] }
            ],
            raw: true,
            nest: true
          });
          filename = 'mes-oeuvres';
          columns = [
            { header: 'Titre', key: 'titre', width: 30 },
            { header: 'Type', key: 'TypeOeuvre.nom_type', width: 20 },
            { header: 'Statut', key: 'statut', width: 15 },
            { header: 'Date création', key: 'date_creation', width: 20 },
            { header: 'Langue', key: 'Langue.nom', width: 15 }
          ];
          break;
          
        case 'evenements':
          data = await this.models.Evenement.findAll({
            where: { id_user: userId },
            include: [
              { model: this.models.TypeEvenement, attributes: ['nom_type'] },
              { model: this.models.Lieu, attributes: ['nom'] }
            ],
            raw: true,
            nest: true
          });
          filename = 'mes-evenements';
          columns = [
            { header: 'Nom', key: 'nom_evenement', width: 30 },
            { header: 'Type', key: 'TypeEvenement.nom_type', width: 20 },
            { header: 'Date début', key: 'date_debut', width: 20 },
            { header: 'Date fin', key: 'date_fin', width: 20 },
            { header: 'Lieu', key: 'Lieu.nom', width: 25 }
          ];
          break;
          
        case 'participants':
          const { evenementId } = req.query;
          if (!evenementId) {
            return res.status(400).json({
              success: false,
              error: 'ID d\'événement requis'
            });
          }
          
          data = await this.models.EvenementUser.findAll({
            where: { id_evenement: evenementId },
            include: [
              {
                model: this.models.User,
                attributes: ['nom', 'prenom', 'email', 'telephone']
              }
            ],
            raw: true,
            nest: true
          });
          filename = `participants-evenement-${evenementId}`;
          columns = [
            { header: 'Nom', key: 'User.nom', width: 20 },
            { header: 'Prénom', key: 'User.prenom', width: 20 },
            { header: 'Email', key: 'User.email', width: 30 },
            { header: 'Téléphone', key: 'User.telephone', width: 15 },
            { header: 'Statut', key: 'statut_participation', width: 15 },
            { header: 'Date inscription', key: 'date_inscription', width: 20 }
          ];
          break;

        case 'artisanats':
          data = await this.models.Oeuvre.findAll({
            where: { saisi_par: userId },
            include: [
              {
                model: this.models.Artisanat,
                required: true,
                include: [
                  { model: this.models.Materiau, attributes: ['nom'] },
                  { model: this.models.Technique, attributes: ['nom'] }
                ]
              }
            ],
            raw: true,
            nest: true
          });
          filename = 'mes-artisanats';
          columns = [
            { header: 'Titre', key: 'titre', width: 30 },
            { header: 'Prix', key: 'Artisanat.prix', width: 15 },
            { header: 'Disponible', key: 'Artisanat.disponible_vente', width: 15 },
            { header: 'Matériau', key: 'Artisanat.Materiau.nom', width: 20 },
            { header: 'Technique', key: 'Artisanat.Technique.nom', width: 20 }
          ];
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: 'Type d\'export non reconnu'
          });
      }

      if (format === 'excel') {
        await this.exportToExcel(data, columns, filename, res);
      } else {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send('\uFEFF' + csv); // BOM pour Excel
      }

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Export Excel amélioré
  async exportToExcel(data, columns, filename, res) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    worksheet.columns = columns;

    // Ajouter les données
    data.forEach(item => {
      const row = {};
      columns.forEach(col => {
        row[col.key] = this.getNestedValue(item, col.key);
      });
      worksheet.addRow(row);
    });

    // Styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(64 + columns.length)}1`
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  }

  // Méthode utilitaire pour convertir en CSV
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(this.flattenObject(data[0]));
    const csv = [
      headers.join(','),
      ...data.map(row => {
        const flatRow = this.flattenObject(row);
        return headers.map(header => {
          const value = flatRow[header];
          return `"${(value || '').toString().replace(/"/g, '""')}"`;
        }).join(',');
      })
    ].join('\n');
    
    return csv;
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Notifications et alertes
  async getNotifications(req, res) {
    try {
      const userId = req.user.id_user;
      const { limit = 50, offset = 0, marque = false } = req.query;

      // Récupérer différents types de notifications
      const [
        oeuvresValidees,
        oeuvresRejetees,
        nouveauxCommentaires,
        nouveauxFavoris,
        participantsRecents
      ] = await Promise.all([
        // Œuvres récemment validées
        this.models.Oeuvre.findAll({
          where: {
            saisi_par: userId,
            statut: 'publie',
            date_validation: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
            }
          },
          attributes: ['id_oeuvre', 'titre', 'date_validation'],
          limit: 10,
          order: [['date_validation', 'DESC']]
        }),
        
        // Œuvres récemment rejetées
        this.models.Oeuvre.findAll({
          where: {
            saisi_par: userId,
            statut: 'rejete',
            date_validation: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          attributes: ['id_oeuvre', 'titre', 'date_validation', 'raison_rejet'],
          limit: 10,
          order: [['date_validation', 'DESC']]
        }),
        
        // Nouveaux commentaires sur les œuvres
        this.models.Commentaire.findAll({
          where: {
            id_oeuvre: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ${userId}
              )`)
            },
            date_creation: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: [
            { model: this.models.User, attributes: ['nom', 'prenom'] },
            { model: this.models.Oeuvre, attributes: ['titre'] }
          ],
          limit: 15,
          order: [['date_creation', 'DESC']]
        }),
        
        // Nouveaux favoris (comptage)
        this.models.Favori.count({
          where: {
            type_entite: 'oeuvre',
            id_entite: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ${userId}
              )`)
            },
            date_ajout: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Nouvelles inscriptions aux événements
        this.models.EvenementUser.findAll({
          where: {
            id_evenement: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_evenement FROM evenement WHERE id_user = ${userId}
              )`)
            },
            date_inscription: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: [
            { model: this.models.User, attributes: ['nom', 'prenom'] },
            { model: this.models.Evenement, attributes: ['nom_evenement'] }
          ],
          limit: 15,
          order: [['date_inscription', 'DESC']]
        })
      ]);

      // Formater toutes les notifications
      const notifications = [];

      // Œuvres validées
      oeuvresValidees.forEach(oeuvre => {
        notifications.push({
          type: 'oeuvre_validee',
          titre: 'Œuvre validée',
          message: `Votre œuvre "${oeuvre.titre}" a été validée`,
          date: oeuvre.date_validation,
          url: `/professionnel/oeuvres/${oeuvre.id_oeuvre}`,
          importance: 'info'
        });
      });

      // Œuvres rejetées
      oeuvresRejetees.forEach(oeuvre => {
        notifications.push({
          type: 'oeuvre_rejetee',
          titre: 'Œuvre rejetée',
          message: `Votre œuvre "${oeuvre.titre}" a été rejetée: ${oeuvre.raison_rejet}`,
          date: oeuvre.date_validation,
          url: `/professionnel/oeuvres/${oeuvre.id_oeuvre}`,
          importance: 'warning'
        });
      });

      // Nouveaux commentaires
      nouveauxCommentaires.forEach(commentaire => {
        notifications.push({
          type: 'nouveau_commentaire',
          titre: 'Nouveau commentaire',
          message: `${commentaire.User.nom} ${commentaire.User.prenom} a commenté "${commentaire.Oeuvre.titre}"`,
          date: commentaire.date_creation,
          url: `/professionnel/oeuvres/${commentaire.id_oeuvre}#commentaires`,
          importance: 'info'
        });
      });

      // Nouvelles inscriptions
      participantsRecents.forEach(participation => {
        notifications.push({
          type: 'nouvelle_inscription',
          titre: 'Nouvelle inscription',
          message: `${participation.User.nom} ${participation.User.prenom} s'est inscrit à "${participation.Evenement.nom_evenement}"`,
          date: participation.date_inscription,
          url: `/professionnel/evenements/${participation.id_evenement}/participants`,
          importance: 'info'
        });
      });

      // Trier par date
      notifications.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Pagination
      const total = notifications.length;
      const paginatedNotifications = notifications.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          notifications: paginatedNotifications,
          summary: {
            nouveauxFavoris,
            oeuvresValidees: oeuvresValidees.length,
            oeuvresRejetees: oeuvresRejetees.length,
            nouveauxCommentaires: nouveauxCommentaires.length,
            participantsRecents: participantsRecents.length
          },
          pagination: {
            total,
            offset: parseInt(offset),
            limit: parseInt(limit),
            hasMore: offset + limit < total
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Analytics avancées
  async getAnalyticsOverview(req, res) {
    try {
      const userId = req.user.id_user;
      const { period = 30 } = req.query;
      const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

      const [
        vuesEvolution,
        favorisEvolution,
        participationsEvolution,
        topOeuvres,
        topEvenements,
        demographicsData
      ] = await Promise.all([
        // Évolution des vues
        this.getViewsEvolution(userId, startDate),
        
        // Évolution des favoris
        this.getFavorisEvolution(userId, startDate),
        
        // Évolution des participations
        this.getParticipationsEvolution(userId, startDate),
        
        // Top œuvres
        this.getTopOeuvres(userId, 5),
        
        // Top événements
        this.getTopEvenements(userId, 5),
        
        // Données démographiques des visiteurs
        this.getDemographicsData(userId, startDate)
      ]);

      res.json({
        success: true,
        data: {
          period: {
            days: period,
            startDate,
            endDate: new Date()
          },
          evolution: {
            vues: vuesEvolution,
            favoris: favorisEvolution,
            participations: participationsEvolution
          },
          top: {
            oeuvres: topOeuvres,
            evenements: topEvenements
          },
          demographics: demographicsData
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des analytics:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Helpers pour analytics
  async getViewsEvolution(userId, startDate) {
    return await this.models.Vue.findAll({
      where: {
        date_vue: { [Op.gte]: startDate },
        [Op.or]: [
          {
            type_entite: 'oeuvre',
            id_entite: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ${userId}
              )`)
            }
          },
          {
            type_entite: 'evenement',
            id_entite: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_evenement FROM evenement WHERE id_user = ${userId}
              )`)
            }
          }
        ]
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'date'],
        [this.sequelize.fn('COUNT', '*'), 'vues'],
        [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN is_unique = true THEN 1 END')), 'vues_uniques']
      ],
      group: [this.sequelize.fn('DATE', this.sequelize.col('date_vue'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_vue')), 'ASC']]
    });
  }

  async getFavorisEvolution(userId, startDate) {
    return await this.models.Favori.findAll({
      where: {
        date_ajout: { [Op.gte]: startDate },
        type_entite: 'oeuvre',
        id_entite: {
          [Op.in]: this.sequelize.literal(`(
            SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ${userId}
          )`)
        }
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_ajout')), 'date'],
        [this.sequelize.fn('COUNT', '*'), 'favoris']
      ],
      group: [this.sequelize.fn('DATE', this.sequelize.col('date_ajout'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_ajout')), 'ASC']]
    });
  }

  async getParticipationsEvolution(userId, startDate) {
    return await this.models.EvenementUser.findAll({
      where: {
        date_inscription: { [Op.gte]: startDate },
        id_evenement: {
          [Op.in]: this.sequelize.literal(`(
            SELECT id_evenement FROM evenement WHERE id_user = ${userId}
          )`)
        }
      },
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('date_inscription')), 'date'],
        [this.sequelize.fn('COUNT', '*'), 'inscriptions']
      ],
      group: [this.sequelize.fn('DATE', this.sequelize.col('date_inscription'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('date_inscription')), 'ASC']]
    });
  }

  async getTopOeuvres(userId, limit) {
    return await this.models.Oeuvre.findAll({
      where: { saisi_par: userId, statut: 'publie' },
      attributes: [
        'id_oeuvre',
        'titre',
        [
          this.sequelize.literal(`(
            SELECT COUNT(*) FROM vue 
            WHERE vue.type_entite = 'oeuvre' 
            AND vue.id_entite = Oeuvre.id_oeuvre
          )`),
          'vues_count'
        ],
        [
          this.sequelize.literal(`(
            SELECT COUNT(*) FROM favori 
            WHERE favori.type_entite = 'oeuvre' 
            AND favori.id_entite = Oeuvre.id_oeuvre
          )`),
          'favoris_count'
        ]
      ],
      order: [[this.sequelize.literal('vues_count'), 'DESC']],
      limit
    });
  }

  async getTopEvenements(userId, limit) {
    return await this.models.Evenement.findAll({
      where: { id_user: userId },
      attributes: [
        'id_evenement',
        'nom_evenement',
        [
          this.sequelize.literal(`(
            SELECT COUNT(*) FROM evenement_user 
            WHERE evenement_user.id_evenement = Evenement.id_evenement
          )`),
          'participants_count'
        ],
        [
          this.sequelize.literal(`(
            SELECT COUNT(*) FROM vue 
            WHERE vue.type_entite = 'evenement' 
            AND vue.id_entite = Evenement.id_evenement
          )`),
          'vues_count'
        ]
      ],
      order: [[this.sequelize.literal('participants_count'), 'DESC']],
      limit
    });
  }

  async getDemographicsData(userId, startDate) {
    return await this.models.Vue.findAll({
      where: {
        date_vue: { [Op.gte]: startDate },
        [Op.or]: [
          {
            type_entite: 'oeuvre',
            id_entite: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_oeuvre FROM oeuvre WHERE saisi_par = ${userId}
              )`)
            }
          },
          {
            type_entite: 'evenement',
            id_entite: {
              [Op.in]: this.sequelize.literal(`(
                SELECT id_evenement FROM evenement WHERE id_user = ${userId}
              )`)
            }
          }
        ]
      },
      attributes: [
        'device_type',
        'pays',
        [this.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['device_type', 'pays'],
      order: [[this.sequelize.literal('count'), 'DESC']]
    });
  }
}

module.exports = ProfessionnelController;