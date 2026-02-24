// controllers/IntervenantController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/MultiLangSearchBuilder');

class IntervenantController {
  constructor(models) {
    if (!models) {
      throw new Error('IntervenantController: Les modèles sont requis');
    }

    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;

    console.log('✅ IntervenantController initialisé avec i18n');
  }

  // ⚡ Recherche multilingue - utilise l'utilitaire centralisé
  buildMultiLangSearchLocal(field, search) {
    return buildMultiLangSearch(this.sequelize, field, search);
  }

  /**
   * GET /api/intervenants
   */
  async getIntervenants(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
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

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearchLocal('nom', search),
          ...this.buildMultiLangSearchLocal('prenom', search),
          ...this.buildMultiLangSearchLocal('biographie', search),
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

      // Tri multilingue
      let orderClause;
      if (['nom', 'prenom', 'biographie'].includes(order)) {
        orderClause = [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(order), `$.${lang}`), direction]];
      } else {
        orderClause = [[order, direction]];
      }

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
        order: orderClause,
        limit: parseInt(limit),
        offset
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(intervenants, lang),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        },
        lang
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des intervenants:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des intervenants'
      });
    }
  }

  /**
   * GET /api/intervenants/:id
   */
  async getIntervenantById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
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

      const stats = await intervenant.getStatistiques();

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          ...translateDeep(intervenant, lang),
          statistiques: stats
        },
        lang
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'intervenant:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération de l\'intervenant'
      });
    }
  }

  // ⚡ Préparer un champ multilingue
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  /**
   * POST /api/intervenants
   */
  async createIntervenant(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const lang = req.lang || 'fr';  // ⚡
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

      if (!nom || !prenom) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Les champs nom et prénom sont obligatoires'
        });
      }

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

      // ⚡ Préparer les champs multilingues
      const nomMultiLang = this.prepareMultiLangField(nom, lang);
      const prenomMultiLang = this.prepareMultiLangField(prenom, lang);
      const biographieMultiLang = this.prepareMultiLangField(biographie, lang);

      const intervenant = await this.models.Intervenant.create({
        nom: nomMultiLang,
        prenom: prenomMultiLang,
        biographie: biographieMultiLang,
        date_naissance,
        lieu_naissance,
        titre_professionnel,
        organisation,
        email,
        telephone,
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
        data: translate(intervenant, lang)
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
        error: 'Erreur serveur lors de la création de l\'intervenant'
      });
    }
  }

  /**
   * PUT /api/intervenants/:id
   */
  async updateIntervenant(req, res) {
    const transaction = await this.sequelize.transaction();
    
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const { nom, prenom, biographie, ...otherUpdates } = req.body;

      const intervenant = await this.models.Intervenant.findByPk(id);

      if (!intervenant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Intervenant non trouvé'
        });
      }

      if (otherUpdates.email && otherUpdates.email !== intervenant.email) {
        const existingIntervenant = await this.models.Intervenant.findOne({
          where: { 
            email: otherUpdates.email,
            id_intervenant: { [Op.ne]: id }
          }
        });

        if (existingIntervenant) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Cet email est déjà utilisé'
          });
        }
      }

      const updates = { ...otherUpdates };

      // ⚡ Gérer les champs multilingues
      if (nom !== undefined) {
        if (typeof nom === 'object') {
          updates.nom = mergeTranslations(intervenant.nom, nom);
        } else {
          updates.nom = mergeTranslations(intervenant.nom, { [lang]: nom });
        }
      }

      if (prenom !== undefined) {
        if (typeof prenom === 'object') {
          updates.prenom = mergeTranslations(intervenant.prenom, prenom);
        } else {
          updates.prenom = mergeTranslations(intervenant.prenom, { [lang]: prenom });
        }
      }

      if (biographie !== undefined) {
        if (typeof biographie === 'object') {
          updates.biographie = mergeTranslations(intervenant.biographie, biographie);
        } else {
          updates.biographie = mergeTranslations(intervenant.biographie, { [lang]: biographie });
        }
      }

      await intervenant.update(updates, { transaction });

      const intervenantMisAJour = await this.models.Intervenant.findByPk(id, {
        include: [
          {
            model: this.models.User,
            as: 'UserAccount',
            attributes: ['id_user', 'prenom', 'nom', 'email'],
            required: false
          }
        ],
        transaction
      });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Intervenant mis à jour avec succès',
        data: translateDeep(intervenantMisAJour, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour de l\'intervenant:', error);
      
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour de l\'intervenant'
      });
    }
  }

  /**
   * DELETE /api/intervenants/:id
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
        error: 'Erreur serveur lors de la suppression de l\'intervenant'
      });
    }
  }

  /**
   * GET /api/intervenants/search
   */
  async searchIntervenants(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      // ⚡ Recherche multilingue
      const where = {
        [Op.or]: [
          ...this.buildMultiLangSearchLocal('nom', q),
          ...this.buildMultiLangSearchLocal('prenom', q),
          ...this.buildMultiLangSearchLocal('biographie', q),
          { organisation: { [Op.like]: `%${q}%` } },
          { titre_professionnel: { [Op.like]: `%${q}%` } }
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
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('nom'), `$.${lang}`), 'ASC']]
      });

      // ⚡ Traduire et formater
      const translated = translateDeep(intervenants, lang);
      
      res.json({
        success: true,
        data: translated.map(intervenant => ({
          id: intervenant.id_intervenant,
          label: `${intervenant.titre_professionnel ? intervenant.titre_professionnel + ' ' : ''}${intervenant.prenom} ${intervenant.nom}`,
          value: intervenant.id_intervenant,
          titre: intervenant.titre_professionnel,
          organisation: intervenant.organisation,
          specialites: intervenant.specialites || [],
          photo_url: intervenant.photo_url
        })),
        lang
      });

    } catch (error) {
      console.error('❌ Erreur dans searchIntervenants:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche'
      });
    }
  }

  /**
   * GET /api/intervenants/types
   */
  async getTypesIntervenants(req, res) {
    try {
      const intervenants = await this.models.Intervenant.findAll({
        attributes: ['specialites'],
        where: {
          specialites: { [Op.ne]: null },
          actif: true
        }
      });

      const specialitesSet = new Set();
      intervenants.forEach(intervenant => {
        if (intervenant.specialites && Array.isArray(intervenant.specialites)) {
          intervenant.specialites.forEach(spec => specialitesSet.add(spec));
        }
      });

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

      typesSuggeres.forEach(type => specialitesSet.add(type));

      res.json({
        success: true,
        data: Array.from(specialitesSet).sort()
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des types:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * ⚡ GET /api/intervenants/:id/translations
   */
  async getIntervenantTranslations(req, res) {
    try {
      const { id } = req.params;

      const intervenant = await this.models.Intervenant.findByPk(id, {
        attributes: ['id_intervenant', 'nom', 'prenom', 'biographie']
      });

      if (!intervenant) {
        return res.status(404).json({
          success: false,
          error: 'Intervenant non trouvé'
        });
      }

      res.json({
        success: true,
        data: intervenant
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  /**
   * ⚡ PATCH /api/intervenants/:id/translation/:lang
   */
  async updateIntervenantTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { nom, prenom, biographie } = req.body;

      const intervenant = await this.models.Intervenant.findByPk(id);
      if (!intervenant) {
        return res.status(404).json({ success: false, error: 'Intervenant non trouvé' });
      }

      const updates = {};
      if (nom) updates.nom = mergeTranslations(intervenant.nom, { [lang]: nom });
      if (prenom) updates.prenom = mergeTranslations(intervenant.prenom, { [lang]: prenom });
      if (biographie) updates.biographie = mergeTranslations(intervenant.biographie, { [lang]: biographie });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'Aucune donnée à mettre à jour' });
      }

      await intervenant.update(updates);
      res.json({ success: true, message: `Traduction ${lang} mise à jour`, data: intervenant });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  /**
   * GET /api/intervenants/stats/overview
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
        this.models.Intervenant.count(),
        this.models.Intervenant.count({ where: { actif: true } }),
        this.models.Intervenant.count({ where: { verifie: true } }),
        this.models.Intervenant.findAll({
          attributes: [
            'pays_origine',
            [this.sequelize.fn('COUNT', this.sequelize.col('id_intervenant')), 'count']
          ],
          where: { pays_origine: { [Op.ne]: null } },
          group: ['pays_origine'],
          order: [[this.sequelize.literal('count'), 'DESC']],
          limit: 5,
          raw: true
        }),
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
        error: 'Erreur serveur lors du calcul des statistiques'
      });
    }
  }
}

module.exports = IntervenantController;
