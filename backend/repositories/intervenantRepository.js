/**
 * IntervenantRepository - Repository pour les intervenants culturels
 * Encapsule tous les accès Sequelize pour le modèle Intervenant
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');
const { buildMultiLangSearch, buildMultiLangOrder } = require('../utils/multiLangSearchBuilder');
const { sanitizeLike } = require('../utils/sanitize');

class IntervenantRepository extends BaseRepository {
  constructor(models) {
    super(models.Intervenant);
    this.models = models;
    this.sequelize = models.sequelize || models.Intervenant.sequelize;
  }

  /**
   * Recherche paginée avec filtres et tri multilingue
   */
  async findFiltered({ page = 1, limit = 20, search, organisation, pays_origine, actif, verifie, order = 'nom', direction = 'ASC', lang = 'fr' }) {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * safeLimit;
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

    if (organisation) where.organisation = { [Op.like]: `%${sanitizeLike(organisation)}%` };
    if (pays_origine) where.pays_origine = pays_origine;
    if (actif !== undefined) where.actif = actif === 'true';
    if (verifie !== undefined) where.verifie = verifie === 'true';

    const safeDirection = direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    let orderClause;
    if (['nom', 'prenom', 'biographie'].includes(order)) {
      orderClause = [buildMultiLangOrder(this.sequelize, order, lang, safeDirection, 'Intervenant')];
    } else {
      orderClause = [[order, safeDirection]];
    }

    const include = [];
    if (this.models.User) {
      include.push({
        model: this.models.User,
        as: 'UserAccount',
        attributes: ['id_user', 'prenom', 'nom', 'email'],
        required: false
      });
    }

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include,
      limit: safeLimit,
      offset,
      order: orderClause,
      distinct: true
    });

    return {
      data: rows,
      pagination: {
        page,
        limit: safeLimit,
        total: count,
        totalPages: Math.ceil(count / safeLimit),
        hasNext: page * safeLimit < count,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Trouve un intervenant avec ses programmes
   */
  async findWithProgrammes(id) {
    const includes = [];
    if (this.models.User) {
      includes.push({
        model: this.models.User,
        as: 'UserAccount',
        attributes: ['id_user', 'prenom', 'nom', 'email'],
        required: false
      });
    }
    if (this.models.Programme) {
      includes.push({
        model: this.models.Programme,
        as: 'Programmes',
        through: { attributes: ['role_intervenant', 'ordre_intervention', 'duree_intervention'] },
        attributes: ['id_programme', 'titre', 'description'],
        required: false
      });
    }

    return this.model.findByPk(id, { include: includes });
  }

  /**
   * Recherche par événement
   */
  async findByEvenement(evenementId) {
    if (!this.models.ProgrammeIntervenant) return [];

    return this.model.findAll({
      include: [{
        model: this.models.Programme,
        where: { id_evenement: evenementId },
        through: { attributes: ['role_intervenant', 'sujet_intervention', 'statut_confirmation'] },
        required: true
      }]
    });
  }
}

module.exports = IntervenantRepository;
