// controllers/IntervenantController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');

const ALLOWED_LANGS = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

class IntervenantController {
  constructor(models) {
    if (!models) {
      throw new Error('IntervenantController: Les modèles sont requis');
    }

    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
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
      const lang = ALLOWED_LANGS.includes(req.lang) ? req.lang : 'fr';
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

      // Tri multilingue - qualifier avec le nom de table pour éviter l'ambiguïté
      let orderClause;
      if (['nom', 'prenom', 'biographie'].includes(order)) {
        orderClause = [[this.sequelize.literal(`JSON_EXTRACT(\`Intervenant\`.\`${order.replace(/[^a-z_]/gi, '')}\`, '$.${lang.replace(/[^a-z-]/gi, '')}')`), direction]];
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
        error: req.t('common.serverError')
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
            through: { attributes: ['role_intervenant', 'ordre_intervention', 'duree_intervention'] },
            attributes: ['id_programme', 'titre', 'description'],
            required: false
          }
        ]
      });

      if (!intervenant) {
        return res.status(404).json({
          success: false,
          error: req.t('intervenant.notFound')
        });
      }

      let stats = { nombreProgrammes: 0, nombreEvenements: 0, prochaineProgramme: null };
      try { stats = await intervenant.getStatistiques(); } catch (e) { console.warn('Stats intervenant non dispo:', e.message); }

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
        error: req.t('common.serverError')
      });
    }
  }

  /**
   * GET /api/intervenants/:id/oeuvres
   */
  async getOeuvresByIntervenant(req, res) {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const intervenant = await this.models.Intervenant.findByPk(id);
      if (!intervenant) {
        return res.status(404).json({
          success: false,
          error: req.t('intervenant.notFound')
        });
      }

      const { count, rows } = await this.models.Oeuvre.findAndCountAll({
        include: [{
          model: this.models.Intervenant,
          as: 'Intervenants',
          where: { id_intervenant: id },
          through: { attributes: ['role_principal'] },
          required: true
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          oeuvres: rows.map(o => translateDeep(o, lang)),
          pagination: {
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Erreur getOeuvresByIntervenant:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
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
          error: req.t('common.badRequest')
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
            error: req.t('intervenant.emailExists')
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
        message: req.t('intervenant.created'),
        data: translate(intervenant, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création de l\'intervenant:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: req.t('common.badRequest'),
          details: error.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
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
      const { nom, prenom, biographie } = req.body;

      // Whitelist des champs modifiables
      const allowedFields = ['email', 'telephone', 'specialite', 'organisation', 'photo_url', 'site_web', 'id_user'];
      const filteredFields = {};
      allowedFields.forEach(f => { if (req.body[f] !== undefined) filteredFields[f] = req.body[f]; });

      const intervenant = await this.models.Intervenant.findByPk(id);

      if (!intervenant) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: req.t('intervenant.notFound')
        });
      }

      if (filteredFields.email && filteredFields.email !== intervenant.email) {
        const existingIntervenant = await this.models.Intervenant.findOne({
          where: {
            email: filteredFields.email,
            id_intervenant: { [Op.ne]: id }
          }
        });

        if (existingIntervenant) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: req.t('auth.emailAlreadyUsed')
          });
        }
      }

      const updates = { ...filteredFields };

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
        message: req.t('intervenant.updated'),
        data: translateDeep(intervenantMisAJour, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour de l\'intervenant:', error);
      
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
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
          error: req.t('intervenant.notFound')
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
            error: req.t('intervenant.hasPrograms', { count: programmesCount })
          });
        }
      }

      await intervenant.update({ actif: false }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: req.t('intervenant.deactivated')
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la suppression de l\'intervenant:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  /**
   * GET /api/intervenants/search
   */
  async searchIntervenants(req, res) {
    try {
      const lang = ALLOWED_LANGS.includes(req.lang) ? req.lang : 'fr';
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
        order: [[this.sequelize.literal(`JSON_EXTRACT(\`nom\`, '$${(() => { const safeLang = lang.replace(/[^a-z-]/gi, ''); return safeLang.includes('-') ? '."' + safeLang + '"' : '.' + safeLang; })()}')`), 'ASC']]
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
        error: req.t('common.serverError')
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
        error: req.t('common.serverError')
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
          error: req.t('intervenant.notFound')
        });
      }

      res.json({
        success: true,
        data: intervenant
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
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
        return res.status(404).json({ success: false, error: req.t('intervenant.notFound') });
      }

      const updates = {};
      if (nom) updates.nom = mergeTranslations(intervenant.nom, { [lang]: nom });
      if (prenom) updates.prenom = mergeTranslations(intervenant.prenom, { [lang]: prenom });
      if (biographie) updates.biographie = mergeTranslations(intervenant.biographie, { [lang]: biographie });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      await intervenant.update(updates);
      res.json({ success: true, message: req.t('translation.updated', { lang }), data: intervenant });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
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
        error: req.t('common.serverError')
      });
    }
  }
}

module.exports = IntervenantController;
