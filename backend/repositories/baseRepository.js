/**
 * BaseRepository - Classe de base pour le pattern Repository
 * Fournit les opérations CRUD de base et la gestion des requêtes
 */
const { Op, fn, col, literal, where: seqWhere } = require('sequelize');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Includes par défaut — détecte automatiquement les méthodes des sous-classes :
   *   _defaultIncludes() ou getDefaultIncludes()
   * Les sous-classes peuvent aussi surcharger ce getter directement.
   * @returns {Array}
   */
  get defaultIncludes() {
    if (typeof this._defaultIncludes === 'function') return this._defaultIncludes();
    if (typeof this.getDefaultIncludes === 'function') return this.getDefaultIncludes();
    return [];
  }

  /**
   * Fusionne les includes passés en paramètre avec les includes par défaut.
   * Les includes explicites priment sur les défauts (par alias).
   * @private
   */
  _mergeIncludes(explicit = []) {
    if (explicit.length > 0) return explicit; // includes explicites = override complet
    return this.defaultIncludes;
  }

  /**
   * Trouve tous les enregistrements avec pagination et filtres
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      where = {},
      include,
      order = [['date_creation', 'DESC']],
      attributes
    } = options;

    const offset = (page - 1) * limit;

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include: this._mergeIncludes(include),
      order,
      limit,
      offset,
      attributes,
      distinct: true
    });

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Trouve un enregistrement par ID
   */
  async findById(id, options = {}) {
    const { include, attributes } = options;

    return this.model.findByPk(id, {
      include: this._mergeIncludes(include),
      attributes
    });
  }

  /**
   * Trouve un enregistrement par critères
   */
  async findOne(where, options = {}) {
    const { include, attributes } = options;

    return this.model.findOne({
      where,
      include: this._mergeIncludes(include),
      attributes
    });
  }

  /**
   * Crée un nouvel enregistrement
   */
  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  /**
   * Crée plusieurs enregistrements
   */
  async bulkCreate(data, options = {}) {
    return this.model.bulkCreate(data, {
      ...options,
      validate: true
    });
  }

  /**
   * Met à jour un enregistrement
   */
  async update(id, data, options = {}) {
    const instance = await this.findById(id);
    if (!instance) {
      return null;
    }

    return instance.update(data, options);
  }

  /**
   * Met à jour plusieurs enregistrements
   */
  async updateMany(where, data, options = {}) {
    return this.model.update(data, {
      where,
      ...options
    });
  }

  /**
   * Supprime un enregistrement
   */
  async delete(id, options = {}) {
    const instance = await this.findById(id);
    if (!instance) {
      return false;
    }

    await instance.destroy(options);
    return true;
  }

  /**
   * Supprime plusieurs enregistrements
   */
  async deleteMany(where, options = {}) {
    return this.model.destroy({
      where,
      ...options
    });
  }

  /**
   * Compte les enregistrements
   */
  async count(where = {}) {
    return this.model.count({ where });
  }

  /**
   * Vérifie si un enregistrement existe
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Recherche avec texte libre (multilingue)
   * Utilise des paramètres préparés pour éviter les injections SQL
   */
  async search(query, fields = ['nom', 'titre', 'description'], options = {}) {
    const { page = 1, limit = 20, additionalWhere = {} } = options;

    // Sanitize la requête - échapper les caractères spéciaux SQL
    const sanitizedQuery = this._sanitizeSearchQuery(query);
    const searchPattern = `%${sanitizedQuery}%`;

    const tableName = this.model.getTableName();
    const langs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
    const searchConditions = fields.map(field => {
      const qualifiedCol = col(`${tableName}.${field}`);
      return {
        [Op.or]: [
          seqWhere(qualifiedCol, { [Op.like]: searchPattern }),
          ...langs.map(lang =>
            seqWhere(fn('JSON_EXTRACT', qualifiedCol, literal(`'$.${lang}'`)), { [Op.like]: searchPattern })
          )
        ]
      };
    });

    return this.findAll({
      page,
      limit,
      where: {
        [Op.and]: [
          { [Op.or]: searchConditions },
          additionalWhere
        ]
      },
      ...options
    });
  }

  /**
   * Sanitize une requête de recherche pour éviter les injections SQL
   * @private
   */
  _sanitizeSearchQuery(query) {
    if (!query || typeof query !== 'string') return '';
    // Échapper les caractères spéciaux SQL LIKE
    return query
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .substring(0, 200);
  }

  /**
   * Obtient les statistiques de base
   */
  async getStats(dateField = 'date_creation') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, todayCount, weekCount, monthCount] = await Promise.all([
      this.count(),
      this.count({ [dateField]: { [Op.gte]: today } }),
      this.count({ [dateField]: { [Op.gte]: thisWeek } }),
      this.count({ [dateField]: { [Op.gte]: thisMonth } })
    ]);

    return {
      total,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount
    };
  }

  /**
   * Transaction helper
   */
  async withTransaction(callback) {
    const transaction = await this.model.sequelize.transaction();
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = BaseRepository;
