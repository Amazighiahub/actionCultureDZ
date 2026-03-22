/**
 * IntervenantService - Service pour les intervenants culturels
 * Gère : CRUD intervenants, recherche, traductions, statistiques
 *
 * Architecture: Controller → Service → Repository → Database
 */
const BaseService = require('./core/baseService');
const { Op, Sequelize } = require('sequelize');
const { mergeTranslations, createMultiLang, SUPPORTED_LANGUAGES } = require('../helpers/i18n');
const { buildMultiLangSearch, buildMultiLangOrder } = require('../utils/multiLangSearchBuilder');
const { sanitizeLike } = require('../utils/sanitize');

class IntervenantService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
  }

  /** @returns {import('sequelize').Sequelize} */
  get sequelize() {
    return this.repository.model.sequelize;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  async getIntervenants(params) {
    return this.repository.findFiltered(params);
  }

  async getIntervenantById(id) {
    const intervenant = await this.repository.findWithProgrammes(id);

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
    // Cache en mémoire (change rarement, évite de charger toute la table)
    if (this._typesIntervenantsCache && this._typesIntervenantsCacheExpiry > Date.now()) {
      return this._typesIntervenantsCache;
    }

    const intervenants = await this.models.Intervenant.findAll({
      attributes: ['specialites'],
      where: { specialites: { [Op.ne]: null }, actif: true },
      limit: 5000,
      raw: true
    });

    const specialitesSet = new Set();
    for (const i of intervenants) {
      const specs = typeof i.specialites === 'string' ? JSON.parse(i.specialites) : i.specialites;
      if (Array.isArray(specs)) {
        for (const spec of specs) specialitesSet.add(spec);
      }
    }

    const typesSuggeres = [
      'Animation culturelle', 'Arts plastiques', 'Cinéma', 'Conférence',
      'Danse', 'Formation', 'Littérature', 'Musique',
      'Patrimoine', 'Photographie', 'Théâtre'
    ];
    typesSuggeres.forEach(type => specialitesSet.add(type));

    const result = Array.from(specialitesSet).sort();
    this._typesIntervenantsCache = result;
    this._typesIntervenantsCacheExpiry = Date.now() + 10 * 60 * 1000; // 10min
    return result;
  }

  // ========================================================================
  // CRÉATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  async createIntervenant(lang, data) {
    const { nom, prenom, biographie, email, ...rest } = data;
    const normalizedEmail = this._normalizeEmail(email);

    // 1. Vérifier par email (si fourni) — comparaison insensible à la casse
    if (normalizedEmail) {
      const existing = await this.models.Intervenant.findOne({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          normalizedEmail
        )
      });
      if (existing) return existing;
    }

    // 2. Vérifier par nom + prénom (protection contre doublons sans email)
    const existingByName = await this._findByNameMatch(nom, prenom, lang);
    if (existingByName) return existingByName;

    let idUserToSet = rest.id_user !== undefined && rest.id_user !== null ? rest.id_user : null;
    if (idUserToSet !== null) {
      const conflict = await this._intervenantAlreadyLinkedToUser(idUserToSet, null);
      if (conflict) {
        const err = new Error('This user account is already linked to another intervenant');
        err.code = 'USER_ALREADY_LINKED';
        err.statusCode = 400;
        throw err;
      }
    } else if (normalizedEmail) {
      const link = await this._tryLinkUserIdFromEmail(normalizedEmail, null);
      if (link.id_user) idUserToSet = link.id_user;
    }

    const transaction = await this.sequelize.transaction();
    try {
      const intervenant = await this.models.Intervenant.create({
        nom: this._prepareMultiLang(nom, lang),
        prenom: this._prepareMultiLang(prenom, lang),
        biographie: this._prepareMultiLang(biographie, lang),
        email: normalizedEmail || null,
        id_user: idUserToSet,
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

  /**
   * Cherche un intervenant par correspondance exacte nom + prénom (insensible à la casse)
   * dans toutes les langues du champ JSON multilingue.
   */
  async _findByNameMatch(nom, prenom, lang = 'fr') {
    const nomStr = typeof nom === 'string' ? nom.trim() : (nom?.[lang] || nom?.fr || '');
    const prenomStr = typeof prenom === 'string' ? prenom.trim() : (prenom?.[lang] || prenom?.fr || '');

    if (!nomStr || !prenomStr) return null;

    const normalizedNom = nomStr.toLowerCase();
    const normalizedPrenom = prenomStr.toLowerCase();

    // Construire les conditions pour chaque langue
    const nomConditions = SUPPORTED_LANGUAGES.map(l => {
      const jsonPath = l.includes('-') ? `$."${l}"` : `$.${l}`;
      return Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.fn('JSON_UNQUOTE',
          Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom'), Sequelize.literal(`'${jsonPath}'`))
        )),
        normalizedNom
      );
    });

    const prenomConditions = SUPPORTED_LANGUAGES.map(l => {
      const jsonPath = l.includes('-') ? `$."${l}"` : `$.${l}`;
      return Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.fn('JSON_UNQUOTE',
          Sequelize.fn('JSON_EXTRACT', Sequelize.col('prenom'), Sequelize.literal(`'${jsonPath}'`))
        )),
        normalizedPrenom
      );
    });

    return this.models.Intervenant.findOne({
      where: {
        [Op.and]: [
          { [Op.or]: nomConditions },
          { [Op.or]: prenomConditions }
        ]
      }
    });
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

      if (updates.id_user !== undefined && updates.id_user !== null) {
        const conflict = await this._intervenantAlreadyLinkedToUser(updates.id_user, id);
        if (conflict) {
          await transaction.rollback();
          const err = new Error('This user account is already linked to another intervenant');
          err.code = 'USER_ALREADY_LINKED';
          err.statusCode = 400;
          throw err;
        }
      }

      // Email : normalisation + unicité (insensible à la casse)
      if (updates.email !== undefined) {
        const normalizedNew = this._normalizeEmail(updates.email);
        updates.email = normalizedNew || null;

        if (normalizedNew && normalizedNew !== this._normalizeEmail(intervenant.email)) {
          const existing = await this.models.Intervenant.findOne({
            where: {
              [Op.and]: [
                { id_intervenant: { [Op.ne]: id } },
                Sequelize.where(
                  Sequelize.fn('LOWER', Sequelize.col('email')),
                  normalizedNew
                )
              ]
            }
          });
          if (existing) {
            await transaction.rollback();
            const error = new Error('Email already used');
            error.code = 'EMAIL_EXISTS';
            error.statusCode = 400;
            throw error;
          }
        }

        // Liaison automatique si id_user non imposé dans la requête
        if (rest.id_user === undefined && normalizedNew) {
          const link = await this._tryLinkUserIdFromEmail(normalizedNew, id);
          if (link.id_user) {
            updates.id_user = link.id_user;
          }
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

  /**
   * Email normalisé pour comparaisons et stockage (trim + lowercase).
   */
  _normalizeEmail(email) {
    if (email === undefined || email === null) return null;
    const s = String(email).trim().toLowerCase();
    if (!s) return null;
    return s;
  }

  /**
   * Utilisateur plateforme dont l'email correspond (comparaison insensible à la casse).
   */
  async _findUserByEmailNormalized(normalizedEmail) {
    if (!normalizedEmail) return null;
    return this.models.User.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('email')),
        normalizedEmail
      ),
      attributes: ['id_user', 'email']
    });
  }

  /**
   * Un autre intervenant utilise déjà cet id_user.
   */
  async _intervenantAlreadyLinkedToUser(idUser, excludeIntervenantId) {
    if (!idUser) return false;
    const where = { id_user: idUser };
    if (excludeIntervenantId != null) {
      where.id_intervenant = { [Op.ne]: excludeIntervenantId };
    }
    const row = await this.models.Intervenant.findOne({ where, attributes: ['id_intervenant'] });
    return !!row;
  }

  /**
   * Résout id_user depuis l'email d'un compte existant.
   * Si un autre intervenant est déjà lié à ce compte, ne lie pas (pas d'erreur).
   */
  async _tryLinkUserIdFromEmail(normalizedEmail, excludeIntervenantId) {
    const user = await this._findUserByEmailNormalized(normalizedEmail);
    if (!user) {
      return { id_user: null };
    }
    const taken = await this._intervenantAlreadyLinkedToUser(user.id_user, excludeIntervenantId);
    if (taken) {
      return { id_user: null, linkConflict: true };
    }
    return { id_user: user.id_user };
  }
}

module.exports = IntervenantService;
