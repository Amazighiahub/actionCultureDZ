/**
 * IntervenantService - Service pour les intervenants culturels
 * Gère : CRUD intervenants, recherche, traductions, statistiques
 */
const { Op } = require('sequelize');
const { mergeTranslations, createMultiLang } = require('../helpers/i18n');
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');
const { sanitizeLike } = require('../utils/sanitize');

class IntervenantService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  async getIntervenants({ page = 1, limit = 20, search, organisation, pays_origine, actif, verifie, order = 'nom', direction = 'ASC', lang = 'fr' }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      const safeSearch = `%${sanitizeLike(search)}%`;
      where[Op.or] = [
        ...buildMultiLangSearch(this.sequelize, 'nom', search),
        ...buildMultiLangSearch(this.sequelize, 'prenom', search),
        ...buildMultiLangSearch(this.sequelize, 'biographie', search),
        { organisation: { [Op.like]: safeSearch } },
        { titre_professionnel: { [Op.like]: safeSearch } }
      ];
    }

    if (organisation) {
      where.organisation = { [Op.like]: `%${sanitizeLike(organisation)}%` };
    }
    if (pays_origine) where.pays_origine = pays_origine;
    if (actif !== undefined) where.actif = actif === 'true';
    if (verifie !== undefined) where.verifie = verifie === 'true';

    const safeLang = lang.replace(/[^a-z-]/gi, '');
    let orderClause;
    if (['nom', 'prenom', 'biographie'].includes(order)) {
      const safeOrder = order.replace(/[^a-z_]/gi, '');
      orderClause = [[this.sequelize.literal(`JSON_EXTRACT(\`Intervenant\`.\`${safeOrder}\`, '$.${safeLang}')`), direction]];
    } else {
      orderClause = [[order, direction]];
    }

    const { count, rows } = await this.models.Intervenant.findAndCountAll({
      where,
      include: [{
        model: this.models.User,
        as: 'UserAccount',
        attributes: ['id_user', 'prenom', 'nom', 'email'],
        required: false
      }],
      order: orderClause,
      limit: parseInt(limit),
      offset
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    };
  }

  async getIntervenantById(id) {
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

    if (!intervenant) return null;

    let stats = { nombreProgrammes: 0, nombreEvenements: 0, prochaineProgramme: null };
    try { stats = await intervenant.getStatistiques(); } catch (e) { /* stats non dispo */ }

    return { intervenant, stats };
  }

  async getOeuvresByIntervenant(intervenantId, { page = 1, limit = 20 }) {
    const intervenant = await this.models.Intervenant.findByPk(intervenantId);
    if (!intervenant) return null;

    const offset = (page - 1) * limit;
    const { count, rows } = await this.models.Oeuvre.findAndCountAll({
      include: [{
        model: this.models.Intervenant,
        as: 'Intervenants',
        where: { id_intervenant: intervenantId },
        through: { attributes: ['role_principal'] },
        required: true
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_creation', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit), limit: parseInt(limit) }
    };
  }

  async searchIntervenants(q, limit = 10, lang = 'fr') {
    const safeLang = lang.replace(/[^a-z-]/gi, '');
    const where = {
      [Op.or]: [
        ...buildMultiLangSearch(this.sequelize, 'nom', q),
        ...buildMultiLangSearch(this.sequelize, 'prenom', q),
        ...buildMultiLangSearch(this.sequelize, 'biographie', q),
        { organisation: { [Op.like]: `%${sanitizeLike(q)}%` } },
        { titre_professionnel: { [Op.like]: `%${sanitizeLike(q)}%` } }
      ],
      actif: true
    };

    return this.models.Intervenant.findAll({
      where,
      attributes: ['id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'organisation', 'specialites', 'photo_url'],
      limit: parseInt(limit),
      order: [[this.sequelize.literal(`JSON_EXTRACT(\`nom\`, '$${(() => { return safeLang.includes('-') ? '."' + safeLang + '"' : '.' + safeLang; })()}')`), 'ASC']]
    });
  }

  async getTypesIntervenants() {
    const intervenants = await this.models.Intervenant.findAll({
      attributes: ['specialites'],
      where: { specialites: { [Op.ne]: null }, actif: true }
    });

    const specialitesSet = new Set();
    intervenants.forEach(i => {
      if (i.specialites && Array.isArray(i.specialites)) {
        i.specialites.forEach(spec => specialitesSet.add(spec));
      }
    });

    const typesSuggeres = [
      'Animation culturelle', 'Arts plastiques', 'Cinéma', 'Conférence',
      'Danse', 'Formation', 'Littérature', 'Musique',
      'Patrimoine', 'Photographie', 'Théâtre'
    ];
    typesSuggeres.forEach(type => specialitesSet.add(type));

    return Array.from(specialitesSet).sort();
  }

  // ========================================================================
  // CRÉATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  async createIntervenant(lang, data) {
    const { nom, prenom, biographie, email, ...rest } = data;

    if (email) {
      const existing = await this.models.Intervenant.findOne({ where: { email } });
      if (existing) {
        const error = new Error('Email already exists');
        error.code = 'EMAIL_EXISTS';
        error.statusCode = 400;
        throw error;
      }
    }

    const transaction = await this.sequelize.transaction();
    try {
      const intervenant = await this.models.Intervenant.create({
        nom: this._prepareMultiLang(nom, lang),
        prenom: this._prepareMultiLang(prenom, lang),
        biographie: this._prepareMultiLang(biographie, lang),
        email,
        specialites: rest.specialites || [],
        langues_parlees: rest.langues_parlees || ['ar'],
        reseaux_sociaux: rest.reseaux_sociaux || {},
        prix_distinctions: rest.prix_distinctions || [],
        actif: true,
        verifie: false,
        ...this._pickFields(rest, ['date_naissance', 'lieu_naissance', 'titre_professionnel', 'organisation', 'telephone', 'photo_url', 'site_web', 'pays_origine', 'wikipedia_url'])
      }, { transaction });

      await transaction.commit();
      return intervenant;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateIntervenant(id, lang, data) {
    const { nom, prenom, biographie, ...rest } = data;

    const transaction = await this.sequelize.transaction();
    try {
      const intervenant = await this.models.Intervenant.findByPk(id);
      if (!intervenant) {
        await transaction.rollback();
        return null;
      }

      // Whitelist
      const allowedFields = ['email', 'telephone', 'specialite', 'organisation', 'photo_url', 'site_web', 'id_user'];
      const updates = {};
      allowedFields.forEach(f => { if (rest[f] !== undefined) updates[f] = rest[f]; });

      // Check email uniqueness
      if (updates.email && updates.email !== intervenant.email) {
        const existing = await this.models.Intervenant.findOne({
          where: { email: updates.email, id_intervenant: { [Op.ne]: id } }
        });
        if (existing) {
          await transaction.rollback();
          const error = new Error('Email already used');
          error.code = 'EMAIL_EXISTS';
          error.statusCode = 400;
          throw error;
        }
      }

      // Multilingual fields
      if (nom !== undefined) {
        updates.nom = typeof nom === 'object'
          ? mergeTranslations(intervenant.nom, nom)
          : mergeTranslations(intervenant.nom, { [lang]: nom });
      }
      if (prenom !== undefined) {
        updates.prenom = typeof prenom === 'object'
          ? mergeTranslations(intervenant.prenom, prenom)
          : mergeTranslations(intervenant.prenom, { [lang]: prenom });
      }
      if (biographie !== undefined) {
        updates.biographie = typeof biographie === 'object'
          ? mergeTranslations(intervenant.biographie, biographie)
          : mergeTranslations(intervenant.biographie, { [lang]: biographie });
      }

      await intervenant.update(updates, { transaction });

      const updated = await this.models.Intervenant.findByPk(id, {
        include: [{
          model: this.models.User,
          as: 'UserAccount',
          attributes: ['id_user', 'prenom', 'nom', 'email'],
          required: false
        }],
        transaction
      });

      await transaction.commit();
      return updated;
    } catch (error) {
      // Only rollback if transaction is still active
      try { await transaction.rollback(); } catch (e) { /* already rolled back */ }
      throw error;
    }
  }

  async deleteIntervenant(id) {
    const transaction = await this.sequelize.transaction();
    try {
      const intervenant = await this.models.Intervenant.findByPk(id);
      if (!intervenant) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (this.models.ProgrammeIntervenant) {
        const programmesCount = await this.models.ProgrammeIntervenant.count({
          where: { id_intervenant: id }
        });
        if (programmesCount > 0) {
          await transaction.rollback();
          return { error: 'hasPrograms', count: programmesCount };
        }
      }

      await intervenant.update({ actif: false }, { transaction });
      await transaction.commit();
      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ========================================================================
  // TRADUCTIONS
  // ========================================================================

  async getIntervenantTranslations(id) {
    return this.models.Intervenant.findByPk(id, {
      attributes: ['id_intervenant', 'nom', 'prenom', 'biographie']
    });
  }

  async updateIntervenantTranslation(id, targetLang, { nom, prenom, biographie }) {
    const intervenant = await this.models.Intervenant.findByPk(id);
    if (!intervenant) return null;

    const updates = {};
    if (nom) updates.nom = mergeTranslations(intervenant.nom, { [targetLang]: nom });
    if (prenom) updates.prenom = mergeTranslations(intervenant.prenom, { [targetLang]: prenom });
    if (biographie) updates.biographie = mergeTranslations(intervenant.biographie, { [targetLang]: biographie });

    if (Object.keys(updates).length === 0) return { empty: true };

    await intervenant.update(updates);
    return intervenant;
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getStatistiques() {
    const [total, actifs, verifies, parPaysOrigine, derniersAjouts] = await Promise.all([
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

    return {
      total,
      actifs,
      verifies,
      tauxVerification: total > 0 ? Math.round((verifies / total) * 100) : 0,
      parPaysOrigine,
      derniersAjouts
    };
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  _prepareMultiLang(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  _pickFields(obj, fields) {
    const result = {};
    fields.forEach(f => { if (obj[f] !== undefined) result[f] = obj[f]; });
    return result;
  }
}

module.exports = IntervenantService;
