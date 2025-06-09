const { Op } = require('sequelize');
const QRCode = require('qrcode'); // ✅ AJOUT DE L'IMPORT MANQUANT

class PatrimoineController {
  constructor(models) {
    this.models = models;
    // Récupérer l'instance sequelize depuis les modèles
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // MÉTHODES DE BASE
  // ========================================================================

  // Sites patrimoniaux populaires
  async getSitesPopulaires(req, res) {
    try {
      const { limit = 6 } = req.query;

      const sites = await this.models.Lieu.findAll({
        include: [
          {
            model: this.models.DetailLieu,
            required: true
          },
          {
            model: this.models.Wilaya,
            attributes: ['nom']
          },
          {
            model: this.models.LieuMedia,
            where: { type: 'image' },
            required: false,
            limit: 1
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      // Ajouter les QR codes à chaque site
      const sitesAvecQR = await Promise.all(
        sites.map(async (site) => {
          const siteData = site.toJSON();
          const qrCodeData = this.createQRCodeData(siteData);
          siteData.qrCode = await this.genererQRCode(qrCodeData);
          return siteData;
        })
      );

      res.json({
        success: true,
        data: sitesAvecQR
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des sites populaires:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Statistiques du patrimoine
  async getStatistiquesPatrimoine(req, res) {
    try {
      const totalSites = await this.models.Lieu.count({
        include: [{
          model: this.models.DetailLieu,
          required: true
        }]
      });

      const totalMonuments = await this.models.Monument?.count() || 0;
      const totalVestiges = await this.models.Vestige?.count() || 0;

      const sitesParWilaya = await this.models.Lieu.findAll({
        attributes: [
          'wilayaId',
          [this.sequelize.fn('COUNT', this.sequelize.col('Lieu.id_lieu')), 'total']
        ],
        include: [
          {
            model: this.models.Wilaya,
            attributes: ['nom']
          },
          {
            model: this.models.DetailLieu,
            required: true,
            attributes: []
          }
        ],
        group: ['wilayaId', 'Wilaya.id_wilaya'],
        order: [[this.sequelize.literal('total'), 'DESC']]
      });

      // Sites les plus populaires (simulation)
      const topSites = await this.models.Lieu.findAll({
        include: [
          { model: this.models.DetailLieu, required: true },
          { model: this.models.Wilaya }
        ],
        limit: 5,
        order: [['createdAt', 'DESC']]
      });

      // Ajouter les QR codes aux top sites
      const topSitesAvecQR = await Promise.all(
        topSites.map(async (site) => {
          const siteData = site.toJSON();
          siteData.qrCode = await this.genererQRCode(this.createQRCodeData(siteData));
          siteData.visites = Math.floor(Math.random() * 10000) + 1000; // Simulation
          return siteData;
        })
      );

      res.json({
        success: true,
        data: {
          totaux: {
            sites: totalSites,
            monuments: totalMonuments,
            vestiges: totalVestiges,
            wilayas: sitesParWilaya.length
          },
          sitesParWilaya: sitesParWilaya,
          topSites: topSitesAvecQR,
          derniereMiseAJour: new Date()
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des statistiques' 
      });
    }
  }

  // Récupérer tous les sites patrimoniaux
  async getAllSitesPatrimoniaux(req, res) {
    try {
      const { page = 1, limit = 12, wilaya, search, includeQR = false } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      if (wilaya) {
        where.wilayaId = wilaya;
      }

      if (search) {
        where[Op.or] = [
          { nom: { [Op.like]: '%' + search + '%' } },
          { adresse: { [Op.like]: '%' + search + '%' } }
        ];
      }

      const sites = await this.models.Lieu.findAndCountAll({
        where: where,
        include: [
          { 
            model: this.models.Wilaya,
            attributes: ['nom']
          },
          { 
            model: this.models.DetailLieu,
            required: true,
            include: [
              { 
                model: this.models.Monument,
                required: false
              },
              { 
                model: this.models.Vestige,
                required: false
              }
            ]
          },
          { 
            model: this.models.LieuMedia,
            where: { type: 'image' },
            required: false,
            limit: 3
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['nom', 'ASC']],
        distinct: true
      });

      // Ajouter les QR codes si demandé
      let sitesData = sites.rows;
      if (includeQR === 'true') {
        sitesData = await Promise.all(
          sites.rows.map(async (site) => {
            const siteData = site.toJSON();
            siteData.qrCode = await this.genererQRCode(this.createQRCodeData(siteData));
            return siteData;
          })
        );
      }

      res.json({
        success: true,
        data: {
          sites: sitesData,
          pagination: {
            total: sites.count,
            page: parseInt(page),
            pages: Math.ceil(sites.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des sites patrimoniaux:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des sites patrimoniaux' 
      });
    }
  }

  // Récupérer les détails complets d'un site patrimonial
  async getSitePatrimonialById(req, res) {
    try {
      const { id } = req.params;

      const site = await this.models.Lieu.findByPk(id, {
        include: [
          { 
            model: this.models.Wilaya,
            attributes: ['nom']
          },
          { 
            model: this.models.Daira,
            attributes: ['nom']
          },
          { 
            model: this.models.Commune,
            attributes: ['nom']
          },
          { 
            model: this.models.DetailLieu,
            include: [
              { 
                model: this.models.Monument,
                attributes: ['nom', 'description', 'type']
              },
              { 
                model: this.models.Vestige,
                attributes: ['nom', 'description', 'type']
              }
            ]
          },
          { 
            model: this.models.LieuMedia
          },
          { 
            model: this.models.Service,
            attributes: ['nom']
          }
        ]
      });

      if (!site) {
        return res.status(404).json({ 
          success: false, 
          error: 'Site patrimonial non trouvé' 
        });
      }

      // Générer le QR code pour ce site
      const siteData = site.toJSON();
      const qrCodeData = this.createQRCodeData(siteData);
      siteData.qrCode = await this.genererQRCode(qrCodeData);

      // Ajouter des informations supplémentaires
      siteData.visitInfo = {
        bestTimeToVisit: this.getBestTimeToVisit(site),
        estimatedDuration: this.getEstimatedVisitDuration(site),
        accessibility: this.getAccessibilityInfo(site),
        nearbyAttractions: await this.getNearbyAttractions(site)
      };

      res.json({
        success: true,
        data: siteData
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du site patrimonial:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération du site patrimonial' 
      });
    }
  }

  // Récupérer les monuments par type
  async getMonumentsByType(req, res) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 12 } = req.query;
      const offset = (page - 1) * limit;

      if (!this.models.Monument) {
        return res.status(501).json({
          success: false,
          error: 'Modèle Monument non disponible'
        });
      }

      const monuments = await this.models.Monument.findAndCountAll({
        where: { type: type },
        include: [
          {
            model: this.models.DetailLieu,
            include: [
              {
                model: this.models.Lieu,
                include: [
                  { model: this.models.Wilaya, attributes: ['nom'] }
                ]
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          monuments: monuments.rows,
          type: type,
          pagination: {
            total: monuments.count,
            page: parseInt(page),
            pages: Math.ceil(monuments.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des monuments:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des monuments' 
      });
    }
  }

  // Récupérer les vestiges par type
  async getVestigesByType(req, res) {
    try {
      const { type } = req.params;
      const { page = 1, limit = 12 } = req.query;
      const offset = (page - 1) * limit;

      if (!this.models.Vestige) {
        return res.status(501).json({
          success: false,
          error: 'Modèle Vestige non disponible'
        });
      }

      const vestiges = await this.models.Vestige.findAndCountAll({
        where: { type: type },
        include: [
          {
            model: this.models.DetailLieu,
            include: [
              {
                model: this.models.Lieu,
                include: [
                  { model: this.models.Wilaya, attributes: ['nom'] }
                ]
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          vestiges: vestiges.rows,
          type: type,
          pagination: {
            total: vestiges.count,
            page: parseInt(page),
            pages: Math.ceil(vestiges.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des vestiges:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des vestiges' 
      });
    }
  }

  // Recherche patrimoine
  async recherchePatrimoine(req, res) {
    try {
      const { q, wilaya, limit = 20 } = req.query;
      const where = {};

      if (wilaya) {
        where.wilayaId = wilaya;
      }

      if (q) {
        where[Op.or] = [
          { nom: { [Op.like]: '%' + q + '%' } },
          { adresse: { [Op.like]: '%' + q + '%' } }
        ];
      }

      const resultats = await this.models.Lieu.findAll({
        where: where,
        include: [
          { model: this.models.Wilaya, attributes: ['nom'] },
          { 
            model: this.models.DetailLieu,
            include: [
              { model: this.models.Monument, required: false },
              { model: this.models.Vestige, required: false }
            ]
          }
        ],
        limit: parseInt(limit),
        order: [['nom', 'ASC']]
      });

      res.json({
        success: true,
        data: {
          resultats: resultats,
          count: resultats.length
        }
      });

    } catch (error) {
      console.error('Erreur lors de la recherche patrimoine:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la recherche' 
      });
    }
  }

  // Galerie d'un site
  async getGalerieSite(req, res) {
    try {
      const { id } = req.params;
      const { type = 'all', page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const where = { id_lieu: id };
      if (type !== 'all') {
        where.type = type;
      }

      const medias = await this.models.LieuMedia.findAndCountAll({
        where: where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          medias: medias.rows,
          pagination: {
            total: medias.count,
            page: parseInt(page),
            pages: Math.ceil(medias.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération de la galerie:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération de la galerie' 
      });
    }
  }

  // Parcours patrimoniaux
  async getParcoursPatrimoniaux(req, res) {
    try {
      const { wilaya, limit = 10, page = 1 } = req.query;
      const offset = (page - 1) * limit;
      
      if (!this.models.Parcours) {
        return res.json({
          success: true,
          data: {
            parcours: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              pages: 0,
              limit: parseInt(limit)
            }
          },
          message: 'Module parcours en développement'
        });
      }

      const where = {};
      const lieuWhere = wilaya ? { wilayaId: wilaya } : {};
      
      const parcours = await this.models.Parcours.findAndCountAll({
        include: [{
          model: this.models.Lieu,
          through: {
            model: this.models.ParcoursLieu,
            attributes: ['ordre', 'duree_estimee', 'distance_precedent']
          },
          where: lieuWhere,
          include: [
            { model: this.models.Wilaya, attributes: ['nom'] },
            { 
              model: this.models.DetailLieu,
              attributes: ['description', 'histoire'],
              include: [
                { model: this.models.Monument },
                { model: this.models.Vestige }
              ]
            },
            { 
              model: this.models.LieuMedia,
              where: { type: 'image' },
              required: false,
              limit: 1
            }
          ]
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        distinct: true
      });

      // Enrichir avec QR codes et statistiques
      const parcoursEnrichis = await Promise.all(
        parcours.rows.map(async (p) => {
          const parcoursData = p.toJSON();
          
          // Calculer la distance totale et durée
          let distanceTotale = 0;
          let dureeTotale = 0;
          
          parcoursData.Lieux.forEach((lieu) => {
            if (lieu.ParcoursLieu.distance_precedent) {
              distanceTotale += lieu.ParcoursLieu.distance_precedent;
            }
            if (lieu.ParcoursLieu.duree_estimee) {
              dureeTotale += lieu.ParcoursLieu.duree_estimee;
            }
          });
          
          parcoursData.distanceTotale = distanceTotale;
          parcoursData.dureeTotale = dureeTotale;
          parcoursData.qrCode = await this.genererQRCode(
            JSON.stringify({
              type: 'parcours_patrimonial',
              id: p.id_parcours,
              nom: p.nom
            })
          );
          
          return parcoursData;
        })
      );

      res.json({
        success: true,
        data: {
          parcours: parcoursEnrichis,
          pagination: {
            total: parcours.count,
            page: parseInt(page),
            pages: Math.ceil(parcours.count / limit),
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Erreur récupération parcours patrimoniaux:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // GESTION QR CODES
  // ========================================================================

  // Générer une carte de visite numérique pour un site
  async genererCarteVisite(req, res) {
    try {
      const { id } = req.params;
      const { format = 'vcard' } = req.query;

      const site = await this.models.Lieu.findByPk(id, {
        include: [
          { model: this.models.Wilaya },
          { model: this.models.DetailLieu },
          { model: this.models.Service }
        ]
      });

      if (!site) {
        return res.status(404).json({ 
          success: false, 
          error: 'Site non trouvé' 
        });
      }

      if (format === 'vcard') {
        const vcard = this.genererVCard(site);
        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', `attachment; filename="${site.nom}.vcf"`);
        res.send(vcard);
      } else {
        // Format JSON avec QR code
        const carteVisite = {
          site: {
            nom: site.nom,
            adresse: site.adresse,
            wilaya: site.Wilaya?.nom,
            coordinates: {
              latitude: site.latitude,
              longitude: site.longitude
            },
            description: site.DetailLieu?.description,
            horaires: site.DetailLieu?.horaires,
            services: site.Services?.map(s => s.nom)
          },
          qrCode: await this.genererQRCode(this.createQRCodeData(site.toJSON())),
          googleMapsUrl: `https://www.google.com/maps?q=${site.latitude},${site.longitude}`,
          generatedAt: new Date().toISOString()
        };

        res.json({
          success: true,
          data: carteVisite
        });
      }

    } catch (error) {
      console.error('Erreur lors de la génération de la carte de visite:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Télécharger le QR code d'un site
  async downloadQRCode(req, res) {
    try {
      const { id } = req.params;
      const { size = 300, format = 'png' } = req.query;

      const site = await this.models.Lieu.findByPk(id, {
        include: [{ model: this.models.Wilaya }]
      });

      if (!site) {
        return res.status(404).json({ 
          success: false, 
          error: 'Site non trouvé' 
        });
      }

      const qrCodeData = this.createQRCodeData(site.toJSON());
      
      if (format === 'svg') {
        const qrSvg = await QRCode.toString(qrCodeData, {
          type: 'svg',
          width: parseInt(size),
          errorCorrectionLevel: 'H'
        });
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="${site.nom}-qrcode.svg"`);
        res.send(qrSvg);
      } else {
        const qrBuffer = await QRCode.toBuffer(qrCodeData, {
          type: 'png',
          width: parseInt(size),
          errorCorrectionLevel: 'H',
          margin: 1
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${site.nom}-qrcode.png"`);
        res.send(qrBuffer);
      }

    } catch (error) {
      console.error('Erreur lors du téléchargement du QR code:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // CRUD SITES PATRIMONIAUX
  // ========================================================================

  async createSitePatrimonial(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { lieu, details, monument, vestige, services = [], medias = [] } = req.body;

      // Validation : monument OU vestige, pas les deux
      if (monument && vestige) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Un site ne peut être à la fois monument et vestige'
        });
      }

      // 1. Créer le lieu
      const nouveauLieu = await this.models.Lieu.create({
        ...lieu,
        typeLieu: lieu.typeLieu || 'Commune'
      }, { transaction });

      // 2. Créer les détails
      const nouveauxDetails = await this.models.DetailLieu.create({
        ...details,
        id_lieu: nouveauLieu.id_lieu,
        noteMoyenne: 0
      }, { transaction });

      // 3. Créer monument OU vestige
      let siteType = null;
      if (monument && this.models.Monument) {
        siteType = await this.models.Monument.create({
          ...monument,
          detailLieuId: nouveauxDetails.id_detailLieu
        }, { transaction });
      } else if (vestige && this.models.Vestige) {
        siteType = await this.models.Vestige.create({
          ...vestige,
          detailLieuId: nouveauxDetails.id_detailLieu
        }, { transaction });
      }

      // 4. Ajouter les services
      for (const service of services) {
        await this.models.Service.create({
          nom: service,
          id_lieu: nouveauLieu.id_lieu
        }, { transaction });
      }

      // 5. Ajouter les médias
      for (const media of medias) {
        await this.models.LieuMedia.create({
          ...media,
          id_lieu: nouveauLieu.id_lieu
        }, { transaction });
      }

      await transaction.commit();

      // Récupérer le site complet
      const siteComplet = await this.getSiteComplet(nouveauLieu.id_lieu);

      res.status(201).json({
        success: true,
        message: 'Site patrimonial créé avec succès',
        data: siteComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur création site patrimonial:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création' 
      });
    }
  }

  async updateSitePatrimonial(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      // Vérifier l'existence
      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Site non trouvé'
        });
      }

      // Mettre à jour le lieu
      if (updates.lieu) {
        await lieu.update(updates.lieu, { transaction });
      }

      // Mettre à jour les détails
      if (updates.details) {
        await this.models.DetailLieu.update(
          updates.details,
          { where: { id_lieu: id }, transaction }
        );
      }

      // Gérer les services
      if (updates.services) {
        // Supprimer les anciens
        await this.models.Service.destroy({
          where: { id_lieu: id },
          transaction
        });
        
        // Créer les nouveaux
        for (const service of updates.services) {
          await this.models.Service.create({
            nom: service,
            id_lieu: id
          }, { transaction });
        }
      }

      await transaction.commit();

      const siteComplet = await this.getSiteComplet(id);
      
      res.json({
        success: true,
        message: 'Site mis à jour avec succès',
        data: siteComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur mise à jour site:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  async deleteSitePatrimonial(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;

      const lieu = await this.models.Lieu.findByPk(id);
      if (!lieu) {
        return res.status(404).json({
          success: false,
          error: 'Site non trouvé'
        });
      }

      // La suppression en cascade devrait gérer les relations
      await lieu.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Site supprimé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur suppression site:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  async genererQRCode(data) {
    try {
      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#1a1a1a',
          light: '#FFFFFF'
        },
        width: 300
      };

      return await QRCode.toDataURL(data, options);
    } catch (error) {
      console.error('Erreur génération QR code:', error);
      return null;
    }
  }

  // Créer les données du QR code pour un site
  createQRCodeData(site) {
    return JSON.stringify({
      type: 'patrimoine_site',
      id: site.id_lieu,
      nom: site.nom,
      wilaya: site.Wilaya?.nom,
      coordinates: {
        lat: site.latitude,
        lng: site.longitude
      },
      url: `${process.env.BASE_URL || 'https://actionculture.dz'}/patrimoine/sites/${site.id_lieu}`,
      description: site.DetailLieu?.description?.substring(0, 100),
      timestamp: new Date().toISOString()
    });
  }

  genererVCard(site) {
    return `BEGIN:VCARD
VERSION:3.0
FN:${site.nom}
ORG:Patrimoine Culturel Algérien
ADR:;;${site.adresse};${site.Commune?.nom || ''};${site.Wilaya?.nom || ''};;Algérie
GEO:${site.latitude};${site.longitude}
NOTE:${site.DetailLieu?.description || ''}
URL:${process.env.BASE_URL}/patrimoine/sites/${site.id_lieu}
END:VCARD`;
  }

  getBestTimeToVisit(site) {
    // Logique pour déterminer le meilleur moment pour visiter
    const saisons = {
      'monument': 'Printemps et Automne',
      'vestige': 'Automne et Hiver',
      'musee': 'Toute l\'année'
    };
    
    return {
      saison: saisons[site.typeLieu] || 'Printemps et Automne',
      horaires: site.DetailLieu?.horaires || 'Non spécifié',
      conseil: 'Évitez les heures de forte chaleur en été'
    };
  }

  getEstimatedVisitDuration(site) {
    let duration = 30; // minutes de base
    
    if (site.DetailLieu?.Monument) duration += 30;
    if (site.DetailLieu?.Vestige) duration += 45;
    if (site.Services?.length > 3) duration += 30;
    
    return {
      minimum: duration,
      recommande: duration * 1.5,
      avecGuide: duration * 2
    };
  }

  getAccessibilityInfo(site) {
    const hasAccessibility = site.Services?.some(s => 
      s.nom.toLowerCase().includes('accessible') || 
      s.nom.toLowerCase().includes('handicap')
    );
    
    return {
      wheelchairAccessible: hasAccessibility,
      parkingAvailable: site.Services?.some(s => s.nom.toLowerCase().includes('parking')),
      publicTransport: site.Services?.some(s => s.nom.toLowerCase().includes('transport')),
      guidedTours: site.Services?.some(s => s.nom.toLowerCase().includes('guide'))
    };
  }

  async getNearbyAttractions(site) {
    try {
      const nearby = await this.models.Lieu.findAll({
        attributes: [
          '*',
          [
            this.sequelize.literal(`
              (6371 * acos(
                cos(radians(${site.latitude})) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(${site.longitude})) + 
                sin(radians(${site.latitude})) * 
                sin(radians(latitude))
              ))
            `),
            'distance'
          ]
        ],
        include: [
          { model: this.models.DetailLieu, required: true }
        ],
        where: {
          id_lieu: { [Op.ne]: site.id_lieu }
        },
        having: this.sequelize.literal('distance <= 5'), // 5km
        order: [[this.sequelize.literal('distance'), 'ASC']],
        limit: 3
      });
      
      return nearby.map(n => ({
        id: n.id_lieu,
        nom: n.nom,
        distance: parseFloat(n.dataValues.distance).toFixed(2),
        type: n.typeLieu
      }));
    } catch (error) {
      console.error('Erreur recherche attractions proches:', error);
      return [];
    }
  }

  async getSiteComplet(id) {
    return await this.models.Lieu.findByPk(id, {
      include: [
        { model: this.models.Wilaya },
        { model: this.models.Daira },
        { model: this.models.Commune },
        { 
          model: this.models.DetailLieu,
          include: [
            { model: this.models.Monument },
            { model: this.models.Vestige }
          ]
        },
        { model: this.models.Service },
        { model: this.models.LieuMedia }
      ]
    });
  }

  // ========================================================================
  // MÉTHODES SUPPLÉMENTAIRES POUR COMPATIBILITÉ
  // ========================================================================

  async noterSite(req, res) {
    res.status(501).json({
      success: false,
      error: 'Notation des sites non implémentée'
    });
  }

  async ajouterAuxFavoris(req, res) {
    res.status(501).json({
      success: false,
      error: 'Système de favoris non implémenté'
    });
  }

  async retirerDesFavoris(req, res) {
    res.status(501).json({
      success: false,
      error: 'Système de favoris non implémenté'
    });
  }

  async updateHoraires(req, res) {
    res.status(501).json({
      success: false,
      error: 'Mise à jour horaires non implémentée'
    });
  }

  // ========================================================================
  // MÉTHODES MANQUANTES POUR LES ROUTES
  // ========================================================================

  async uploadMedias(req, res) {
    res.status(501).json({
      success: false,
      error: 'Upload médias non implémenté'
    });
  }

  async deleteMedia(req, res) {
    res.status(501).json({
      success: false,
      error: 'Suppression média non implémentée'
    });
  }

  async getNearbyMobile(req, res) {
    try {
      const { lat, lng, radius = 5 } = req.query;
      
      const sites = await this.models.Lieu.findAll({
        attributes: [
          '*',
          [
            this.sequelize.literal(`
              (6371 * acos(
                cos(radians(${lat})) * 
                cos(radians(latitude)) * 
                cos(radians(longitude) - radians(${lng})) + 
                sin(radians(${lat})) * 
                sin(radians(latitude))
              ))
            `),
            'distance'
          ]
        ],
        include: [
          { model: this.models.DetailLieu, required: true },
          { model: this.models.Wilaya, attributes: ['nom'] },
          { 
            model: this.models.LieuMedia,
            where: { type: 'image' },
            required: false,
            limit: 1
          }
        ],
        having: this.sequelize.literal(`distance <= ${radius}`),
        order: [[this.sequelize.literal('distance'), 'ASC']],
        limit: 10
      });

      // Version optimisée pour mobile
      const sitesOptimized = sites.map(site => ({
        id: site.id_lieu,
        nom: site.nom,
        distance: parseFloat(site.dataValues.distance).toFixed(2),
        image: site.LieuMedias?.[0]?.url || null,
        type: site.typeLieu,
        description: site.DetailLieu?.description?.substring(0, 100) + '...',
        coordinates: {
          lat: site.latitude,
          lng: site.longitude
        }
      }));

      res.json({
        success: true,
        data: sitesOptimized
      });

    } catch (error) {
      console.error('Erreur getNearbyMobile:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  async handleQRScan(req, res) {
    try {
      const { qrData } = req.body;
      
      // Parser les données du QR code
      let data;
      try {
        data = JSON.parse(qrData);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Format QR code invalide'
        });
      }

      if (data.type === 'patrimoine_site' && data.id) {
        const site = await this.models.Lieu.findByPk(data.id, {
          include: [
            { model: this.models.DetailLieu },
            { model: this.models.Wilaya }
          ]
        });

        if (site) {
          // Log de la visite (optionnel)
          // await this.logQRScan(req.user?.id_user, site.id_lieu);
          
          res.json({
            success: true,
            data: {
              type: 'site_patrimonial',
              site: {
                id: site.id_lieu,
                nom: site.nom,
                description: site.DetailLieu?.description,
                wilaya: site.Wilaya?.nom
              }
            }
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'Site non trouvé'
          });
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Type de QR code non supporté'
        });
      }

    } catch (error) {
      console.error('Erreur handleQRScan:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  async getOfflineDataPack(req, res) {
    try {
      const { wilaya } = req.params;
      
      const sites = await this.models.Lieu.findAll({
        where: { wilayaId: wilaya },
        include: [
          { model: this.models.DetailLieu },
          { model: this.models.Wilaya },
          { 
            model: this.models.LieuMedia,
            where: { type: 'image' },
            required: false,
            limit: 3
          }
        ],
        limit: 50 // Limiter pour la taille du pack
      });

      const offlinePack = {
        version: Date.now(),
        wilaya: wilaya,
        sites: sites.map(site => ({
          id: site.id_lieu,
          nom: site.nom,
          description: site.DetailLieu?.description,
          latitude: site.latitude,
          longitude: site.longitude,
          images: site.LieuMedias?.map(m => m.url) || [],
          qrCode: this.createQRCodeData(site.toJSON())
        })),
        metadata: {
          count: sites.length,
          generated: new Date().toISOString()
        }
      };

      res.json({
        success: true,
        data: offlinePack
      });

    } catch (error) {
      console.error('Erreur getOfflineDataPack:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  async importSitesPatrimoniaux(req, res) {
    res.status(501).json({
      success: false,
      error: 'Import sites patrimoniaux non implémenté'
    });
  }

  async exportSitesPatrimoniaux(req, res) {
    try {
      const { format = 'json' } = req.query;
      
      const sites = await this.models.Lieu.findAll({
        include: [
          { model: this.models.DetailLieu },
          { model: this.models.Wilaya },
          { model: this.models.Service }
        ]
      });

      if (format === 'csv') {
        const csv = this.convertSitesToCSV(sites);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="sites-patrimoniaux.csv"');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: {
            sites,
            count: sites.length,
            exported: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      console.error('Erreur exportSitesPatrimoniaux:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  // Méthode utilitaire pour convertir en CSV
  convertSitesToCSV(sites) {
    const headers = ['ID', 'Nom', 'Type', 'Adresse', 'Wilaya', 'Latitude', 'Longitude', 'Description'];
    const rows = sites.map(site => [
      site.id_lieu,
      `"${site.nom}"`,
      site.typeLieu,
      `"${site.adresse}"`,
      `"${site.Wilaya?.nom || ''}"`,
      site.latitude,
      site.longitude,
      `"${site.DetailLieu?.description || ''}"`
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

module.exports = PatrimoineController;