// controllers/IntervenantController.js - Version adaptée au modèle existant
const { Op } = require('sequelize');

class IntervenantController {
  constructor(models) {
    if (!models) {
      throw new Error('IntervenantController: Les modèles sont requis');
    }
    
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    
    console.log('✅ IntervenantController initialisé');
    console.log('📦 Modèles disponibles:', Object.keys(models).filter(k => k !== 'sequelize' && k !== 'Sequelize'));
  }

  /**
   * GET /api/intervenants
   * Récupérer tous les intervenants avec pagination et filtres
   */
  async getIntervenants(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        organisation,
        pays_origine,
        actif,
        verifie,
        order = 'nom',
        direction = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtres
      if (search) {
        where[Op.or] = [
          { nom: { [Op.like]: `%${search}%` } },
          { prenom: { [Op.like]: `%${search}%` } },
          { biographie: { [Op.like]: `%${search}%` } },
          { organisation: { [Op.like]: `%${search}%` } },
          { titre_professionnel: { [Op.like]: `%${search}%` } }
        ];
      }

      if (organisation) {
        where.organisation = { [Op.like]: `%${organisation}%` };
      }

      if (pays_origine) {
        where.pays_origine = pays_origine;
      }

      if (actif !== undefined) {
        where.actif = actif === 'true';
      }

      if (verifie !== undefined) {
        where.verifie = verifie === 'true';
      }

      // Requête avec pagination
      const { count, rows: intervenants } = await this.models.Intervenant.findAndCountAll({
        where,
        include: [
          {
            model: this.models.User,
            as: 'UserAccount',
            attributes: ['id_user', 'prenom', 'nom', 'email'],
            required: false
          }
        ],
        order: [[order, direction]],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: intervenants,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des intervenants:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des intervenants',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/intervenants/:id
   * Récupérer un intervenant par son ID
   */
  async getIntervenantById(req, res) {
    try {
      const { id } = req.params;

      const intervenant = await this.models.Intervenant.findByPk(id, {
        include: [
          {
            model: this.models.User,
            as: 'UserAccount',
            attributes: ['id_user', 'prenom', 'nom', 'email'],
            required: false
          },
          {
            model: this.models.Programme,
            as: 'Programmes',
            through: { attributes: ['role', 'ordre_passage', 'duree_minutes'] },
            attributes: ['id_programme', 'titre', 'description'],
            required: false
          }
        ]
      });

      if (!intervenant) {
        return res.status(404).json({
          success: false,
          error: 'Intervenant non trouvé'
        });
      }

      // Ajouter des statistiques
      const stats = await intervenant.getStatistiques();

      res.json({
        success: true,
        data: {
          ...intervenant.toJSON(),
          statistiques: stats
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'intervenant:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération de l\'intervenant',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/intervenants
   * Créer un nouvel intervenant
   */
  async createIntervenant(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const {
        nom,
        prenom,
        date_naissance,
        lieu_naissance,
        titre_professionnel,
        organisation,
        email,
        telephone,
        biographie,
        photo_url,
        specialites,
        site_web,
        pays_origine,
        langues_parlees,
        wikipedia_url,
        reseaux_sociaux,
        prix_distinctions
      } = req.body;

      // Validation des champs obligatoires
      if (!nom || !prenom) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs nom et prénom sont obligatoires'
        });
      }

      // Vérifier l'unicité de l'email si fourni
      if (email) {
        const existingIntervenant = await this.models.Intervenant.findOne({
          where: { email }
        });

        if (existingIntervenant) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Un intervenant avec cet email existe déjà'
          });
        }
      }

      // Créer l'intervenant
      const intervenant = await this.models.Intervenant.create({
        nom,
        prenom,
        date_naissance,
        lieu_naissance,
        titre_professionnel,
        organisation,
        email,
        telephone,
        biographie,
        photo_url,
        specialites: specialites || [],
        site_web,
        pays_origine,
        langues_parlees: langues_parlees || ['ar'],
        wikipedia_url,
        reseaux_sociaux: reseaux_sociaux || {},
        prix_distinctions: prix_distinctions || [],
        actif: true,
        verifie: false
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Intervenant créé avec succès',
        data: intervenant
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création de l\'intervenant:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création de l\'intervenant',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * PUT /api/intervenants/:id
   * Mettre à jour un intervenant
   */
  async updateIntervenant(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { id } = req.params;
      const updates = req.body;

      const intervenant = await this.models.Intervenant.findByPk(id);

      if (!intervenant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Intervenant non trouvé'
        });
      }

      // Vérifier l'unicité de l'email si modifié
      if (updates.email && updates.email !== intervenant.email) {
        const existingIntervenant = await this.models.Intervenant.findOne({
          where: { 
            email: updates.email,
            id_intervenant: { [Op.ne]: id }
          }
        });

        if (existingIntervenant) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Un autre intervenant utilise déjà cet email'
          });
        }
      }

      // Mettre à jour l'intervenant
      await intervenant.update(updates, { transaction });

      // Récupérer l'intervenant mis à jour avec ses relations
      const intervenantMisAJour = await this.models.Intervenant.findByPk(
        id,
        {
          include: [
            {
              model: this.models.User,
              as: 'UserAccount',
              attributes: ['id_user', 'prenom', 'nom', 'email'],
              required: false
            }
          ],
          transaction
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: 'Intervenant mis à jour avec succès',
        data: intervenantMisAJour
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour de l\'intervenant:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour de l\'intervenant',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * DELETE /api/intervenants/:id
   * Supprimer un intervenant (Admin uniquement)
   */
  async deleteIntervenant(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const { id } = req.params;

      const intervenant = await this.models.Intervenant.findByPk(id);

      if (!intervenant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Intervenant non trouvé'
        });
      }

      // Vérifier si l'intervenant est associé à des programmes
      if (this.models.ProgrammeIntervenant) {
        const programmesCount = await this.models.ProgrammeIntervenant.count({
          where: { id_intervenant: id }
        });

        if (programmesCount > 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: `Cet intervenant est associé à ${programmesCount} programme(s) et ne peut pas être supprimé`
          });
        }
      }

      // Soft delete : désactiver plutôt que supprimer
      await intervenant.update({ actif: false }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Intervenant désactivé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la suppression de l\'intervenant:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la suppression de l\'intervenant',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/intervenants/search
   * Rechercher des intervenants pour l'autocomplétion
   */
  async searchIntervenants(req, res) {
    try {
      console.log('🔍 searchIntervenants - Début');
      console.log('Query params:', req.query);

      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const where = {
        [Op.or]: [
          { nom: { [Op.like]: `%${q}%` } },
          { prenom: { [Op.like]: `%${q}%` } },
          { organisation: { [Op.like]: `%${q}%` } },
          { titre_professionnel: { [Op.like]: `%${q}%` } },
          { biographie: { [Op.like]: `%${q}%` } }
        ],
        actif: true
      };

      const intervenants = await this.models.Intervenant.findAll({
        where,
        attributes: [
          'id_intervenant', 
          'nom', 
          'prenom', 
          'titre_professionnel',
          'organisation',
          'specialites',
          'photo_url'
        ],
        limit: parseInt(limit),
        order: [['nom', 'ASC'], ['prenom', 'ASC']]
      });

      res.json({
        success: true,
        data: intervenants.map(intervenant => ({
          id: intervenant.id_intervenant,
          label: intervenant.getNomComplet ? intervenant.getNomComplet() : 
                 `${intervenant.titre_professionnel ? intervenant.titre_professionnel + ' ' : ''}${intervenant.prenom} ${intervenant.nom}`,
          value: intervenant.id_intervenant,
          titre: intervenant.titre_professionnel,
          organisation: intervenant.organisation,
          specialites: intervenant.specialites || [],
          photo_url: intervenant.photo_url
        }))
      });

    } catch (error) {
      console.error('❌ Erreur dans searchIntervenants:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/intervenants/types
   * Récupérer les types de spécialités disponibles
   */
  async getTypesIntervenants(req, res) {
    try {
      // Récupérer toutes les spécialités uniques depuis la base
      const intervenants = await this.models.Intervenant.findAll({
        attributes: ['specialites'],
        where: {
          specialites: { [Op.ne]: null },
          actif: true
        }
      });

      // Extraire et dédupliquer les spécialités
      const specialitesSet = new Set();
      intervenants.forEach(intervenant => {
        if (intervenant.specialites && Array.isArray(intervenant.specialites)) {
          intervenant.specialites.forEach(spec => specialitesSet.add(spec));
        }
      });

      // Types suggérés par défaut
      const typesSuggeres = [
        'Animation culturelle',
        'Arts plastiques',
        'Cinéma',
        'Conférence',
        'Danse',
        'Formation',
        'Littérature',
        'Musique',
        'Patrimoine',
        'Photographie',
        'Théâtre'
      ];

      // Combiner les types existants et suggérés
      typesSuggeres.forEach(type => specialitesSet.add(type));

      res.json({
        success: true,
        data: Array.from(specialitesSet).sort()
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des types:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/intervenants/stats/overview
   * Statistiques sur les intervenants
   */
  async getStatistiques(req, res) {
    try {
      const [
        totalIntervenants,
        intervenantsActifs,
        intervenantsVerifies,
        parPaysOrigine,
        derniersAjouts
      ] = await Promise.all([
        // Total des intervenants
        this.models.Intervenant.count(),

        // Intervenants actifs
        this.models.Intervenant.count({
          where: { actif: true }
        }),

        // Intervenants vérifiés
        this.models.Intervenant.count({
          where: { verifie: true }
        }),

        // Top 5 pays d'origine
        this.models.Intervenant.findAll({
          attributes: [
            'pays_origine',
            [this.sequelize.fn('COUNT', this.sequelize.col('id_intervenant')), 'count']
          ],
          where: {
            pays_origine: { [Op.ne]: null }
          },
          group: ['pays_origine'],
          order: [[this.sequelize.literal('count'), 'DESC']],
          limit: 5,
          raw: true
        }),

        // 5 derniers intervenants ajoutés
        this.models.Intervenant.findAll({
          attributes: ['id_intervenant', 'nom', 'prenom', 'organisation', 'date_creation'],
          order: [['date_creation', 'DESC']],
          limit: 5
        })
      ]);

      res.json({
        success: true,
        data: {
          total: totalIntervenants,
          actifs: intervenantsActifs,
          verifies: intervenantsVerifies,
          tauxVerification: totalIntervenants > 0 ? 
            Math.round((intervenantsVerifies / totalIntervenants) * 100) : 0,
          parPaysOrigine,
          derniersAjouts
        }
      });

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors du calcul des statistiques',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = IntervenantController;