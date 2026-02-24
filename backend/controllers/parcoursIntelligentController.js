// controllers/ParcoursIntelligentController.js - VERSION i18n
const { Op } = require('sequelize');
const QRCode = require('qrcode');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

class ParcoursIntelligentController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // Générer un parcours intelligent autour d'un événement
  async generateParcoursForEvenement(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { evenementId } = req.params;
      const { 
        rayon = 10,
        maxSites = 5,
        types = ['monument', 'musee', 'site_historique'],
        dureeMaxParcours = 480,
        includeRestaurants = true,
        includeHotels = false
      } = req.query;

      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          {
            model: this.models.Lieu,
            include: [
              { model: this.models.Wilaya },
              { model: this.models.DetailLieu }
            ]
          },
          { model: this.models.TypeEvenement }
        ]
      });

      if (!evenement) {
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé'
        });
      }

      // ⚡ Traduire pour le point de départ
      const evenementTraduit = translateDeep(evenement, lang);

      const pointDepart = {
        id: evenement.Lieu.id_lieu,
        nom: evenementTraduit.Lieu.nom,
        latitude: evenement.Lieu.latitude,
        longitude: evenement.Lieu.longitude,
        type: 'evenement',
        evenement: evenementTraduit.nom_evenement
      };

      const sitesProximite = await this.rechercherSitesProximite(
        pointDepart.latitude,
        pointDepart.longitude,
        parseFloat(rayon),
        types
      );

      const sitesClasses = await this.classerSitesParInteret(sitesProximite, pointDepart);

      const parcours = await this.genererParcoursOptimal(
        pointDepart,
        sitesClasses,
        {
          maxSites: parseInt(maxSites),
          dureeMax: parseInt(dureeMaxParcours),
          includeRestaurants,
          includeHotels
        }
      );

      const parcoursAvecQR = await this.ajouterQRCodes(parcours);

      if (req.user) {
        await this.sauvegarderParcours(req.user.id_user, evenementId, parcoursAvecQR);
      }

      // ⚡ Traduire les étapes
      const parcoursTraduites = {
        ...parcoursAvecQR,
        etapes: translateDeep(parcoursAvecQR.etapes, lang)
      };

      res.json({
        success: true,
        data: {
          evenement: {
            id: evenement.id_evenement,
            nom: evenementTraduit.nom_evenement,
            date_debut: evenement.date_debut,
            lieu: evenementTraduit.Lieu.nom
          },
          parcours: parcoursTraduites,
          statistiques: {
            distanceTotale: parcoursAvecQR.distanceTotale,
            dureeEstimee: parcoursAvecQR.dureeEstimee,
            nombreEtapes: parcoursAvecQR.etapes.length,
            typesInclus: [...new Set(parcoursAvecQR.etapes.map(e => e.type))]
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la génération du parcours:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la génération du parcours' 
      });
    }
  }

  // Générer un parcours personnalisé
  async generateParcoursPersonnalise(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const {
        latitude,
        longitude,
        interests = [],
        duration = 240,
        transport = 'voiture',
        accessibility = false,
        familyFriendly = false
      } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Coordonnées de départ requises'
        });
      }

      const rayonRecherche = this.getSearchRadius(transport, duration);

      const sites = await this.rechercherSitesParInterets(
        parseFloat(latitude),
        parseFloat(longitude),
        rayonRecherche,
        interests,
        { accessibility, familyFriendly }
      );

      const parcours = await this.genererParcoursPersonnaliseInterne(
        { latitude, longitude },
        sites,
        {
          dureeMax: parseInt(duration),
          transport,
          preferences: { accessibility, familyFriendly }
        }
      );

      const parcoursComplet = await this.enrichirParcours(parcours, transport);

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(parcoursComplet, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Récupérer les parcours populaires
  async getParcoursPopulaires(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { wilayaId } = req.params;
      const { limit = 5 } = req.query;

      const parcoursPredefinis = await this.models.Parcours.findAll({
        include: [
          {
            model: this.models.Lieu,
            through: { model: this.models.ParcoursLieu },
            include: [
              { model: this.models.Wilaya },
              { model: this.models.LieuMedia, limit: 1 }
            ]
          }
        ],
        where: {
          '$Lieus.wilayaId$': wilayaId
        },
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      const parcoursEnrichis = await Promise.all(
        parcoursPredefinis.map(async (parcours) => {
          const stats = await this.getParcoursStats(parcours.id_parcours);
          return {
            ...translateDeep(parcours, lang),  // ⚡ Traduire
            statistiques: stats,
            qrCode: await this.genererQRCode(`parcours:${parcours.id_parcours}`)
          };
        })
      );

      res.json({
        success: true,
        data: parcoursEnrichis,
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Récupérer un parcours par ID
  async getParcoursById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const parcours = await this.models.Parcours.findByPk(id, {
        include: [
          {
            model: this.models.Lieu,
            through: { 
              model: this.models.ParcoursLieu,
              attributes: ['ordre']
            },
            include: [
              { model: this.models.DetailLieu },
              { model: this.models.LieuMedia }
            ]
          }
        ]
      });

      if (!parcours) {
        return res.status(404).json({
          success: false,
          error: 'Parcours non trouvé'
        });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(parcours, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  async rechercherSitesProximite(lat, lng, rayon, types) {
    try {
      // Sécurité: Convertir explicitement en nombres pour éviter toute injection SQL
      const safeLat = parseFloat(lat);
      const safeLng = parseFloat(lng);
      const safeRayon = parseFloat(rayon);
      
      if (isNaN(safeLat) || isNaN(safeLng) || isNaN(safeRayon)) {
        console.error('Paramètres de géolocalisation invalides');
        return [];
      }

      const sites = await this.models.Lieu.findAll({
        attributes: {
          include: [
            [
              this.sequelize.literal(`
                (6371 * acos(
                  cos(radians(${safeLat})) * 
                  cos(radians(latitude)) * 
                  cos(radians(longitude) - radians(${safeLng})) + 
                  sin(radians(${safeLat})) * 
                  sin(radians(latitude))
                ))
              `),
              'distance'
            ]
          ]
        },
        include: [
          {
            model: this.models.DetailLieu,
            include: [
              { model: this.models.Monument },
              { model: this.models.Vestige }
            ],
            required: true
          },
          { model: this.models.Wilaya },
          { model: this.models.LieuMedia },
          { model: this.models.Service }
        ],
        having: this.sequelize.literal(`distance <= ${safeRayon}`),
        order: [[this.sequelize.literal('distance'), 'ASC']]
      });

      return sites;
    } catch (error) {
      console.error('Erreur recherche sites proximité:', error);
      return [];
    }
  }

  async classerSitesParInteret(sites, depart) {
    return sites.map(site => {
      const score = this.calculerScoreInteret(site);
      return {
        ...site.toJSON(),
        scoreInteret: score,
        tempsVisite: this.estimerTempsVisite(site),
        tempsTrajet: this.calculerTempsTrajet(
          depart.latitude, 
          depart.longitude, 
          site.latitude, 
          site.longitude
        )
      };
    }).sort((a, b) => b.scoreInteret - a.scoreInteret);
  }

  calculerScoreInteret(site) {
    let score = 50;
    
    if (site.DetailLieu?.Monument) score += 20;
    if (site.DetailLieu?.Vestige) score += 25;
    if (site.LieuMedias?.length > 0) score += 10;
    if (site.Services?.length > 0) score += 5;
    
    return score;
  }

  async genererParcoursOptimal(depart, sites, options) {
    const { maxSites, dureeMax, includeRestaurants, includeHotels } = options;

    const parcours = {
      depart,
      etapes: [],
      distanceTotale: 0,
      dureeEstimee: 0,
      services: {}
    };

    let tempsRestant = dureeMax;
    let positionActuelle = depart;
    const sitesVisites = new Set();

    while (parcours.etapes.length < maxSites && tempsRestant > 30) {
      let meilleurSite = null;
      let meilleurScore = 0;

      for (const site of sites) {
        if (sitesVisites.has(site.id_lieu)) continue;

        const tempsTrajet = this.calculerTempsTrajet(
          positionActuelle.latitude,
          positionActuelle.longitude,
          site.latitude,
          site.longitude
        );

        const tempsTotalSite = site.tempsVisite + tempsTrajet;

        if (tempsTotalSite <= tempsRestant) {
          const score = site.scoreInteret / tempsTotalSite;
          if (score > meilleurScore) {
            meilleurScore = score;
            meilleurSite = { ...site, tempsTrajet, tempsTotalSite };
          }
        }
      }

      if (!meilleurSite) break;

      parcours.etapes.push(meilleurSite);
      parcours.distanceTotale += meilleurSite.distance;
      parcours.dureeEstimee += meilleurSite.tempsTotalSite;
      tempsRestant -= meilleurSite.tempsTotalSite;
      positionActuelle = meilleurSite;
      sitesVisites.add(meilleurSite.id_lieu);
    }

    if (includeRestaurants) {
      parcours.services.restaurants = await this.trouverRestaurantsProches(parcours.etapes);
    }
    if (includeHotels) {
      parcours.services.hotels = await this.trouverHotelsProches(depart);
    }

    return parcours;
  }

  async ajouterQRCodes(parcours) {
    const parcoursAvecQR = { ...parcours };
    
    parcoursAvecQR.qrCodeParcours = await this.genererQRCode(
      JSON.stringify({
        type: 'parcours',
        id: `parcours_${Date.now()}`,
        depart: parcours.depart,
        etapes: parcours.etapes.map(e => ({
          id: e.id_lieu,
          nom: e.nom
        }))
      })
    );

    parcoursAvecQR.etapes = await Promise.all(
      parcours.etapes.map(async (etape) => ({
        ...etape,
        qrCode: await this.genererQRCodeLieu(etape)
      }))
    );

    return parcoursAvecQR;
  }

  async genererQRCode(data) {
    try {
      const options = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        width: 256
      };

      return await QRCode.toDataURL(data, options);
    } catch (error) {
      console.error('Erreur génération QR code:', error);
      return null;
    }
  }

  async genererQRCodeLieu(lieu) {
    const data = {
      type: 'lieu_patrimonial',
      id: lieu.id_lieu,
      nom: lieu.nom,
      coordinates: {
        lat: lieu.latitude,
        lng: lieu.longitude
      }
    };

    return await this.genererQRCode(JSON.stringify(data));
  }

  estimerTempsVisite(site) {
    let temps = 30;
    if (site.DetailLieu?.Monument) temps += 30;
    if (site.DetailLieu?.Vestige) temps += 45;
    return temps;
  }

  calculerTempsTrajet(lat1, lon1, lat2, lon2, vitesseMoyenne = 50) {
    const distance = this.calculerDistance(lat1, lon1, lat2, lon2);
    return Math.round((distance / vitesseMoyenne) * 60);
  }

  calculerDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  degToRad(deg) {
    return deg * (Math.PI/180);
  }

  getSearchRadius(transport, duration) {
    const vitesses = { marche: 5, velo: 15, voiture: 50 };
    const vitesse = vitesses[transport] || vitesses.voiture;
    return (vitesse * (duration / 60) * 0.7) / 2;
  }

  async sauvegarderParcours(userId, evenementId, parcours) {
    try {
      const nouveauParcours = await this.models.Parcours.create({
        nom: `Parcours événement ${evenementId}`,
        description: `Parcours généré automatiquement`,
        createdBy: userId
      });

      for (let i = 0; i < parcours.etapes.length; i++) {
        await this.models.ParcoursLieu.create({
          id_parcours: nouveauParcours.id_parcours,
          id_lieu: parcours.etapes[i].id_lieu,
          id_evenement: evenementId,
          ordre: i + 1
        });
      }

      return nouveauParcours;
    } catch (error) {
      console.error('Erreur sauvegarde parcours:', error);
      return null;
    }
  }

  async getParcoursStats(parcoursId) {
    return {
      vues: Math.floor(Math.random() * 1000),
      utilisations: Math.floor(Math.random() * 100),
      notesMoyenne: (Math.random() * 2 + 3).toFixed(1)
    };
  }

  async trouverRestaurantsProches(etapes) {
    return etapes.slice(0, 3).map(etape => ({
      nom: `Restaurant près de ${etape.nom}`,
      distance: Math.random() * 0.5,
      type: 'restaurant'
    }));
  }

  async trouverHotelsProches(depart) {
    return [{ nom: 'Hôtel Central', distance: Math.random() * 2 }];
  }

  async rechercherSitesParInterets(lat, lng, rayon, interests, filters) {
    return await this.rechercherSitesProximite(lat, lng, rayon, []);
  }

  async genererParcoursPersonnaliseInterne(depart, sites, options) {
    return this.genererParcoursOptimal(depart, sites, {
      maxSites: 10,
      dureeMax: options.dureeMax,
      includeRestaurants: true,
      includeHotels: false
    });
  }

  async enrichirParcours(parcours, transport) {
    return {
      ...parcours,
      transport,
      conseils: this.genererConseils(parcours, transport)
    };
  }

  genererConseils(parcours, transport) {
    const conseils = [];
    if (transport === 'marche') {
      conseils.push('Prévoyez de l\'eau et des chaussures confortables');
    }
    if (parcours.dureeEstimee > 240) {
      conseils.push('Parcours long, prévoyez des pauses régulières');
    }
    return conseils;
  }
}

module.exports = ParcoursIntelligentController;
