const { Op } = require('sequelize');
const QRCode = require('qrcode');

class ParcoursIntelligentController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // Générer un parcours intelligent autour d'un événement
  async generateParcoursForEvenement(req, res) {
    try {
      const { evenementId } = req.params;
      const { 
        rayon = 10, // km par défaut
        maxSites = 5,
        types = ['monument', 'musee', 'site_historique'],
        dureeMaxParcours = 480, // minutes (8 heures)
        includeRestaurants = true,
        includeHotels = false
      } = req.query;

      // Récupérer l'événement avec son lieu
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

      // Point de départ : lieu de l'événement
      const pointDepart = {
        id: evenement.Lieu.id_lieu,
        nom: evenement.Lieu.nom,
        latitude: evenement.Lieu.latitude,
        longitude: evenement.Lieu.longitude,
        type: 'evenement',
        evenement: evenement.nom_evenement
      };

      // Rechercher les sites patrimoniaux à proximité
      const sitesProximite = await this.rechercherSitesProximite(
        pointDepart.latitude,
        pointDepart.longitude,
        parseFloat(rayon),
        types
      );

      // Filtrer et classer les sites par intérêt et distance
      const sitesClasses = await this.classerSitesParInteret(sitesProximite, pointDepart);

      // Générer le parcours optimal
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

      // Ajouter les QR codes pour chaque étape
      const parcoursAvecQR = await this.ajouterQRCodes(parcours);

      // Sauvegarder le parcours si l'utilisateur est connecté
      if (req.user) {
        await this.sauvegarderParcours(req.user.id_user, evenementId, parcoursAvecQR);
      }

      res.json({
        success: true,
        data: {
          evenement: {
            id: evenement.id_evenement,
            nom: evenement.nom_evenement,
            date_debut: evenement.date_debut,
            lieu: evenement.Lieu.nom
          },
          parcours: parcoursAvecQR,
          statistiques: {
            distanceTotale: parcoursAvecQR.distanceTotale,
            dureeEstimee: parcoursAvecQR.dureeEstimee,
            nombreEtapes: parcoursAvecQR.etapes.length,
            typesInclus: [...new Set(parcoursAvecQR.etapes.map(e => e.type))]
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors de la génération du parcours:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la génération du parcours' 
      });
    }
  }

  // Générer un parcours personnalisé à partir d'un point
  async generateParcoursPersonnalise(req, res) {
    try {
      const {
        latitude,
        longitude,
        interests = [], // ['histoire', 'art', 'architecture', 'nature']
        duration = 240, // minutes
        transport = 'voiture', // 'voiture', 'marche', 'velo'
        accessibility = false,
        familyFriendly = false
      } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Coordonnées de départ requises'
        });
      }

      // Déterminer le rayon de recherche selon le mode de transport
      const rayonRecherche = this.getSearchRadius(transport, duration);

      // Rechercher les sites selon les intérêts
      const sites = await this.rechercherSitesParInterets(
        parseFloat(latitude),
        parseFloat(longitude),
        rayonRecherche,
        interests,
        {
          accessibility,
          familyFriendly
        }
      );

      // Générer le parcours optimal
      const parcours = await this.genererParcoursPersonnalise(
        { latitude, longitude },
        sites,
        {
          dureeMax: parseInt(duration),
          transport,
          preferences: { accessibility, familyFriendly }
        }
      );

      // Ajouter les informations pratiques
      const parcoursComplet = await this.enrichirParcours(parcours, transport);

      res.json({
        success: true,
        data: parcoursComplet
      });

    } catch (error) {
      console.error('Erreur lors de la génération du parcours personnalisé:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Récupérer les parcours populaires d'une wilaya
  async getParcoursPopulaires(req, res) {
    try {
      const { wilayaId } = req.params;
      const { limit = 5 } = req.query;

      // Parcours prédéfinis populaires
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

      // Enrichir avec les statistiques d'utilisation
      const parcoursEnrichis = await Promise.all(
        parcoursPredefinis.map(async (parcours) => {
          const stats = await this.getParcoursStats(parcours.id_parcours);
          return {
            ...parcours.toJSON(),
            statistiques: stats,
            qrCode: await this.genererQRCode(`parcours:${parcours.id_parcours}`)
          };
        })
      );

      res.json({
        success: true,
        data: parcoursEnrichis
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des parcours populaires:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Méthodes utilitaires privées

  async rechercherSitesProximite(lat, lng, rayon, types) {
    try {
      // Utiliser la formule de Haversine pour calculer la distance
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
        having: this.sequelize.literal(`distance <= ${rayon}`),
        order: [[this.sequelize.literal('distance'), 'ASC']]
      });

      return sites;
    } catch (error) {
      console.error('Erreur recherche sites proximité:', error);
      return [];
    }
  }

  async classerSitesParInteret(sites, pointDepart) {
    // Calculer un score d'intérêt pour chaque site
    return sites.map(site => {
      let score = 100;
      
      // Bonus selon le type de site
      if (site.DetailLieu?.Monument) score += 30;
      if (site.DetailLieu?.Vestige) score += 25;
      
      // Bonus si services disponibles
      score += (site.Services?.length || 0) * 5;
      
      // Bonus si médias disponibles (site documenté)
      score += (site.LieuMedias?.length || 0) * 10;
      
      // Pénalité selon la distance
      const distance = parseFloat(site.dataValues.distance);
      score -= distance * 2;

      return {
        ...site.toJSON(),
        distance,
        score,
        tempsVisite: this.estimerTempsVisite(site)
      };
    }).sort((a, b) => b.score - a.score);
  }

  async genererParcoursOptimal(depart, sites, options) {
    const { maxSites, dureeMax, includeRestaurants, includeHotels } = options;
    
    const parcours = {
      depart,
      etapes: [],
      distanceTotale: 0,
      dureeEstimee: 0,
      services: []
    };

    let tempsRestant = dureeMax;
    let positionActuelle = depart;
    const sitesVisites = new Set();

    // Algorithme glouton pour construire le parcours
    while (parcours.etapes.length < maxSites && tempsRestant > 60) {
      let meilleurSite = null;
      let meilleurRatio = 0;

      for (const site of sites) {
        if (sitesVisites.has(site.id_lieu)) continue;

        const tempsTrajet = this.calculerTempsTrajet(
          positionActuelle.latitude,
          positionActuelle.longitude,
          site.latitude,
          site.longitude
        );
        
        const tempsTotalSite = tempsTrajet + site.tempsVisite;
        
        if (tempsTotalSite <= tempsRestant) {
          const ratio = site.score / tempsTotalSite;
          if (ratio > meilleurRatio) {
            meilleurRatio = ratio;
            meilleurSite = {
              ...site,
              tempsTrajet,
              tempsTotalSite
            };
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

    // Ajouter les services si demandés
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
    
    // QR code pour le parcours complet
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

    // QR codes pour chaque étape
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
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
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
      },
      url: `${process.env.BASE_URL}/patrimoine/sites/${lieu.id_lieu}`
    };

    return await this.genererQRCode(JSON.stringify(data));
  }

  estimerTempsVisite(site) {
    // Estimation basée sur le type de site
    let temps = 30; // minutes de base

    if (site.DetailLieu?.Monument) {
      temps += 30;
    }
    if (site.DetailLieu?.Vestige) {
      temps += 45;
    }
    if (site.DetailLieu?.histoire?.length > 500) {
      temps += 15;
    }
    if (site.Services?.some(s => s.nom.includes('guide'))) {
      temps += 30;
    }

    return temps;
  }

  calculerTempsTrajet(lat1, lon1, lat2, lon2, vitesseMoyenne = 50) {
    // Distance en km
    const distance = this.calculerDistance(lat1, lon1, lat2, lon2);
    // Temps en minutes (vitesse en km/h)
    return Math.round((distance / vitesseMoyenne) * 60);
  }

  calculerDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
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
    // Estimation du rayon de recherche selon le mode de transport
    const vitesses = {
      marche: 5,    // km/h
      velo: 15,     // km/h
      voiture: 50   // km/h moyenne en ville
    };

    const vitesse = vitesses[transport] || vitesses.voiture;
    // Considérer 70% du temps pour les déplacements
    return (vitesse * (duration / 60) * 0.7) / 2;
  }

  async sauvegarderParcours(userId, evenementId, parcours) {
    try {
      // Créer le parcours en base
      const nouveauParcours = await this.models.Parcours.create({
        nom: `Parcours événement ${evenementId}`,
        description: `Parcours généré automatiquement`,
        createdBy: userId
      });

      // Ajouter les étapes
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
    // Simuler des statistiques d'utilisation
    return {
      vues: Math.floor(Math.random() * 1000),
      utilisations: Math.floor(Math.random() * 100),
      notesMoyenne: (Math.random() * 2 + 3).toFixed(1),
      dernièreUtilisation: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    };
  }

  async trouverRestaurantsProches(etapes) {
    // Simuler la recherche de restaurants
    return etapes.slice(0, 3).map(etape => ({
      nom: `Restaurant près de ${etape.nom}`,
      distance: Math.random() * 0.5,
      type: 'restaurant',
      cuisine: ['traditionnelle', 'moderne', 'fast-food'][Math.floor(Math.random() * 3)]
    }));
  }

  async trouverHotelsProches(depart) {
    // Simuler la recherche d'hôtels
    return [
      {
        nom: 'Hôtel Central',
        distance: Math.random() * 2,
        etoiles: Math.floor(Math.random() * 3) + 3,
        prix: 'moyen'
      }
    ];
  }

  async rechercherSitesParInterets(lat, lng, rayon, interests, filters) {
    // Implémenter la recherche basée sur les intérêts
    const sites = await this.rechercherSitesProximite(lat, lng, rayon, []);
    
    // Filtrer selon les intérêts et critères
    return sites.filter(site => {
      // Logique de filtrage selon interests et filters
      return true;
    });
  }

  async genererParcoursPersonnalise(depart, sites, options) {
    // Version personnalisée de la génération de parcours
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
      conseils: this.genererConseils(parcours, transport),
      meteo: await this.getMeteoPrevisionnelle(parcours.depart),
      accessibilite: this.evaluerAccessibilite(parcours)
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
    if (parcours.etapes.some(e => e.DetailLieu?.Monument)) {
      conseils.push('Certains monuments peuvent avoir des horaires d\'ouverture spécifiques');
    }

    return conseils;
  }

  async getMeteoPrevisionnelle(position) {
    // Simuler des données météo
    return {
      temperature: Math.floor(Math.random() * 15) + 20,
      conditions: ['ensoleillé', 'nuageux', 'partiellement nuageux'][Math.floor(Math.random() * 3)],
      precipitation: Math.random() < 0.3
    };
  }

  evaluerAccessibilite(parcours) {
    // Évaluer l'accessibilité du parcours
    const score = parcours.etapes.reduce((acc, etape) => {
      return acc + (etape.Services?.some(s => s.nom.includes('accessible')) ? 1 : 0);
    }, 0);

    return {
      score: score / parcours.etapes.length,
      niveau: score > 0.7 ? 'excellent' : score > 0.4 ? 'bon' : 'limité'
    };
  }
}

module.exports = ParcoursIntelligentController;