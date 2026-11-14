/**
 * BaseRepository - Classe de base pour le pattern Repository
 * Fournit les opérations CRUD de base et la gestion des requêtes
 */
const { Op, fn, col, literal, where: seqWhere, Utils } = require('sequelize');
const { bornerPagination, decalage, construirePagination } = require('../utils/pagination');
const { aColonne, motifLike } = require('../utils/colonnesCalculees');
const { SUPPORTED_LANGUAGES, cheminJson } = require('../constants/langues');

const estObjetSimple = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

/**
 * Le filtre principal peut-il viser une table jointe ? Oui s'il contient une clé « $Alias.col$ » ou un
 * fragment SQL (literal, fn, col, where) qui nomme l'un des alias joints.
 */
const filtreViseJointure = (filtre, alias) => {
  const textes = [];
  const parcourir = (v) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) { v.forEach(parcourir); return; }
    if (v instanceof Utils.SequelizeMethod) {
      // Literal (val), Col (col), Fn (fn, args), Where (attribute, logic), Json (conditions, path, value)
      for (const champ of ['val', 'col', 'fn', 'args', 'attribute', 'logic', 'conditions', 'path', 'value']) {
        if (typeof v[champ] === 'string') textes.push(v[champ]);
        else parcourir(v[champ]);
      }
      return;
    }
    if (estObjetSimple(v)) {
      for (const cle of Object.keys(v)) {
        if (cle.startsWith('$')) textes.push(cle);
        parcourir(v[cle]);
      }
      for (const sym of Object.getOwnPropertySymbols(v)) parcourir(v[sym]);
    }
  };
  parcourir(filtre);
  if (textes.some((t) => t.startsWith('$'))) return true;
  const motifs = alias.map((a) => new RegExp(`(^|[^A-Za-z0-9_])${a.replace(/[^A-Za-z0-9_]/g, '')}([^A-Za-z0-9_]|$)`));
  return textes.some((t) => motifs.some((m) => m.test(t)));
};

/**
 * Jointures utiles au COMPTE d'une liste (audit V11 BDD-12). Une jointure facultative (LEFT JOIN sans
 * condition) ne change pas le nombre de lignes distinctes : ne restent que celles qui filtrent
 * (required, where, through.where) et leurs parentes. Renvoie null quand on ne peut pas trancher
 * (include non standard, filtre principal qui vise une jointure) : le compte garde alors toutes les
 * jointures, comme avant.
 */
const jointuresDuCompte = (includes, filtre) => {
  if (!Array.isArray(includes) || includes.length === 0) return [];
  const alias = [];
  const standard = (liste) => liste.every((inc) => {
    if (!estObjetSimple(inc) || inc.all || (!inc.model && !inc.association)) return false;
    const nom = inc.as || (typeof inc.association === 'string' ? inc.association : inc.association?.as) || inc.model?.name;
    if (nom) alias.push(nom);
    return !inc.include || (Array.isArray(inc.include) && standard(inc.include));
  });
  if (!standard(includes)) return null;
  if (filtreViseJointure(filtre, alias)) return null;

  const filtrante = (inc) => !inc.separate && (
    inc.required === true
    || (inc.required !== false && Boolean(inc.where || inc.through?.where))
    || (inc.include || []).some(filtrante)
  );
  const elaguer = (liste) => liste.filter(filtrante).map((inc) => {
    const copie = { ...inc, attributes: [] };
    if (inc.include) copie.include = elaguer(inc.include);
    return copie;
  });
  return elaguer(includes);
};

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
      where = {},
      include,
      order = [['date_creation', 'DESC']],
      attributes
    } = options;
    const { page, limit } = bornerPagination(options.page, options.limit);

    const offset = decalage(page, limit);
    const includes = this._mergeIncludes(include);

    // Le total ne garde que les jointures qui filtrent (avant : toutes, photos, auteur, lieu..., à
    // chaque page de chaque liste), puis vient la page. L'un après l'autre : une seule connexion du
    // pool par liste (audit V11 BDD-12, BDD-18).
    const { rows, count } = await compterPuisLister(this.model, { where, include: includes, order, limit, offset, attributes });

    return {
      data: rows,
      pagination: construirePagination(count, page, limit)
    };
  }

  /**
   * Trouve un enregistrement par ID
   */
  async findById(id, options = {}) {
    const { include, attributes, transaction, lock } = options;

    return this.model.findByPk(id, {
      // Lecture verrouillée (FOR UPDATE) : la seule ligne demandée, sans les jointures par défaut. Avec
      // elles, MySQL verrouillait aussi chaque ligne jointe : le type d'événement (toutes les inscriptions
      // aux concerts passaient une par une), le lieu et le compte de l'organisateur (audit V11 BDD-2).
      // Les appels verrouillés ne lisent que des colonnes de la ligne (statut, dates, propriétaire).
      include: lock && !include ? [] : this._mergeIncludes(include),
      attributes,
      ...(transaction ? { transaction } : {}),
      ...(lock ? { lock } : {})
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
    const instance = await this.findById(id, options);
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
    const instance = await this.findById(id, options);
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

    // Alias de la table dans la requête = nom du modèle (« Evenement »), pas le nom de table
    // (« evenement ») : MySQL sous Linux distingue la casse, la recherche échouait en 500
    const alias = this.model.name;

    let condition;
    // Colonne calculée texte_recherche (migrations 20261120 et 20261216 : œuvre, lieu, événement) quand
    // la table l'a : nom ou titre et description (adresse pour un lieu), 5 langues, sans accents ni
    // majuscules, une comparaison au lieu de 5 extractions JSON par champ et par ligne. Elle couvre les
    // champs que les appelants passent ; `colonneRecherche: null` force la lecture champ par champ.
    // Sinon (parcours, service, base des essais) : le JSON, langue par langue (audit V11 COD-B5).
    const { colonneRecherche = 'texte_recherche' } = options;
    if (colonneRecherche && await aColonne(this.model, colonneRecherche)) {
      const motif = motifLike(this.model.sequelize, String(query || '').substring(0, 200));
      condition = literal(`\`${alias}\`.\`${colonneRecherche}\` LIKE ${motif}`);
    } else {
      // Sanitize la requête - échapper les caractères spéciaux SQL
      const searchPattern = `%${this._sanitizeSearchQuery(query)}%`;
      const searchConditions = fields.map(field => {
        const qualifiedCol = col(`${alias}.${field}`);
        return {
          [Op.or]: [
            seqWhere(qualifiedCol, { [Op.like]: searchPattern }),
            ...SUPPORTED_LANGUAGES.map(lang =>
              // JSON_UNQUOTE + LOWER : recherche insensible à la casse
              seqWhere(fn('LOWER', fn('JSON_UNQUOTE', fn('JSON_EXTRACT', qualifiedCol, literal(`'$.${cheminJson(lang)}'`)))), { [Op.like]: searchPattern.toLowerCase() })
            )
          ]
        };
      });
      condition = { [Op.or]: searchConditions };
    }

    return this.findAll({
      page,
      limit,
      where: {
        [Op.and]: [
          condition,
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

/**
 * Remplace Model.findAndCountAll (même résultat { rows, count }) : le total ne garde que les jointures
 * qui filtrent (jointuresDuCompte), puis vient la page, l'un après l'autre (une seule connexion du pool).
 * Les options de page (limit, offset, order, attributes, subQuery, distinct…) ne servent qu'à la lecture.
 */
async function compterPuisLister(model, options = {}) {
  const { where, include, distinct: _distinct, col: _col, ...lecture } = options;
  const includes = Array.isArray(include) ? include : (include ? [include] : []);
  const jointures = jointuresDuCompte(includes, where);
  const count = await model.count({
    where,
    include: jointures === null ? includes : jointures,
    distinct: true,
    col: model.primaryKeyAttribute
  });
  const rows = count === 0 ? [] : await model.findAll({ where, include: includes, ...lecture });
  return { rows, count };
}

module.exports = BaseRepository;
module.exports.jointuresDuCompte = jointuresDuCompte;
module.exports.compterPuisLister = compterPuisLister;
