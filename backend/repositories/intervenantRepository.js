/**
 * IntervenantRepository - Repository pour les intervenants culturels
 * Encapsule tous les accès Sequelize pour le modèle Intervenant
 */
const BaseRepository = require('./baseRepository');
const { PUBLIC_USER_ATTRIBUTES, PUBLIC_INTERVENANT_ATTRIBUTES } = require('../constants/publicAttributes');
const { Op } = require('sequelize');
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');
const { triParNom } = require('../utils/triParNom');
const { bornerPagination } = require('../utils/pagination');
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
    // Plafonds communs des listes : 100 par page, page 500 au plus (audit V11 BDD-12)
    const borne = bornerPagination(page, limit);
    const safeLimit = borne.limit;
    page = borne.page;
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
    // Par défaut, seuls les intervenants actifs sont listés
    where.actif = actif === undefined ? true : actif === 'true';
    if (verifie !== undefined) where.verifie = verifie === 'true';

    const safeDirection = direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    let orderClause;
    if (['nom', 'prenom', 'biographie'].includes(order)) {
      // Nom : colonne nom_tri indexée en français ; sinon texte dans la langue, sans accents ni
      // majuscules (avant : JSON brut, ordre binaire faux) (audit V11 BDD-15)
      orderClause = (await triParNom(this.model, { lang, champ: order, colonne: order === 'nom' ? 'nom_tri' : null, direction: safeDirection })).order;
    } else if (order && (!this.model.rawAttributes || this.model.rawAttributes[order])) {
      orderClause = [[order, safeDirection]];
    } else {
      // Colonne inconnue (avant : erreur 500) : tri par nom
      orderClause = (await triParNom(this.model, { lang, direction: safeDirection })).order;
    }

    const include = [];
    if (this.models.User) {
      include.push({
        model: this.models.User,
        as: 'UserAccount',
        attributes: PUBLIC_USER_ATTRIBUTES,
        required: false
      });
    }

    // Total sans la jointure du compte (facultative : elle ne change pas le nombre), puis la page
    // (audit V11 BDD-12). Route publique : fiche publique uniquement (ni email, ni téléphone, ni
    // date de naissance)
    const count = await this.model.count({ where });
    const rows = count === 0 ? [] : await this.model.findAll({
      where,
      attributes: PUBLIC_INTERVENANT_ATTRIBUTES,
      include,
      limit: safeLimit,
      offset,
      order: orderClause
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
        attributes: PUBLIC_USER_ATTRIBUTES,
        required: false
      });
    }
    if (this.models.Programme) {
      includes.push({
        model: this.models.Programme,
        as: 'Programmes',
        through: { attributes: ['role_intervenant', 'ordre_intervention', 'duree_intervention'] },
        attributes: ['id_programme', 'titre', 'description'],
        required: false,
        // Programmes d'événements visibles seulement : la fiche est publique
        include: this.models.Evenement ? [{
          model: this.models.Evenement,
          as: 'Evenement',
          attributes: [],
          required: true,
          where: { statut: { [Op.notIn]: ['brouillon', 'en_attente'] } }
        }] : []
      });
    }

    return this.model.findByPk(id, { attributes: PUBLIC_INTERVENANT_ATTRIBUTES, include: includes });
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
