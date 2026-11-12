/**
 * ArtisanatRepository - Accès données pour l'artisanat
 * Artisanat est lié à Oeuvre (relation 1:1) avec Materiau et Technique
 */

const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');
const { conditionAuteurOeuvre, colonnesNom } = require('./rechercheNom');
const { aColonne } = require('../utils/colonnesCalculees');
const { SUPPORTED_LANGUAGES, cheminJson } = require('../constants/langues');

class ArtisanatRepository extends BaseRepository {
  constructor(models) {
    super(models.Artisanat);
    this.models = models;
  }

  /**
   * Inclusions standard
   */
  _defaultIncludes() {
    const includes = [];

    if (this.models.Oeuvre) {
      const oeuvreInclude = {
        model: this.models.Oeuvre,
        required: true,
        include: []
      };
      if (this.models.User) {
        oeuvreInclude.include.push({
          model: this.models.User,
          as: 'Saiseur',
          attributes: ['id_user', 'nom', 'prenom', 'photo_url'],
          required: false
        });
      }
      if (this.models.Media) {
        oeuvreInclude.include.push({
          model: this.models.Media,
          attributes: ['id_media', 'url', 'type_media', 'thumbnail_url', 'id_oeuvre'],
          required: false,
          // Requête à part : jointes, les photos comptaient dans la limite par page et des produits disparaissaient
          separate: true
        });
      }
      includes.push(oeuvreInclude);
    }

    if (this.models.Materiau) {
      includes.push({
        model: this.models.Materiau,
        attributes: ['id_materiau', 'nom', 'description'],
        required: false
      });
    }

    if (this.models.Technique) {
      includes.push({
        model: this.models.Technique,
        attributes: ['id_technique', 'nom', 'description'],
        required: false
      });
    }

    return includes;
  }

  /**
   * Tous les artisanats publiés avec filtres
   */
  async findPublished(options = {}) {
    const { page = 1, limit = 12, materiau, technique, prixMin, prixMax, sort = 'recent' } = options;
    const where = {};

    if (materiau) where.id_materiau = materiau;
    if (technique) where.id_technique = technique;
    if (prixMin || prixMax) {
      where.prix = {};
      if (prixMin) where.prix[Op.gte] = parseFloat(prixMin);
      if (prixMax) where.prix[Op.lte] = parseFloat(prixMax);
    }

    const includes = this._defaultIncludes();
    // Force statut publie on Oeuvre include
    const oeuvreInc = includes.find(i => i.model === this.models.Oeuvre);
    if (oeuvreInc) {
      oeuvreInc.where = { ...(oeuvreInc.where || {}), statut: 'publie' };
    }

    let order;
    switch (sort) {
      case 'prix_asc': order = [['prix', 'ASC']]; break;
      case 'prix_desc': order = [['prix', 'DESC']]; break;
      case 'recent':
      default:
        order = this.models.Oeuvre
          ? [[this.models.Oeuvre, 'date_creation', 'DESC']]
          : [['date_creation', 'DESC']];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include: includes,
      limit: parseInt(limit),
      offset,
      order,
      distinct: true,
      subQuery: false
    });

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < count,
        hasPrev: parseInt(page) > 1
      }
    };
  }

  /**
   * Détail complet
   */
  async findWithFullDetails(id) {
    const includes = this._defaultIncludes();
    const saiseur = includes.find(i => i.model === this.models.Oeuvre)?.include?.find(i => i.as === 'Saiseur');
    if (saiseur) saiseur.attributes = [...saiseur.attributes, 'biographie', 'profil_public'];
    const artisanat = await this.model.findByPk(id, { include: includes });
    // La présentation de l'artisan suit le choix de son profil, public ou non
    const artisan = artisanat?.Oeuvre?.Saiseur;
    if (artisan) {
      if (!artisan.profil_public) artisan.setDataValue('biographie', null);
      artisan.setDataValue('profil_public', undefined);
    }
    return artisanat;
  }

  /**
   * Recherche multilingue (via Oeuvre.titre, Oeuvre.description)
   */
  async searchArtisanats(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const pattern = this.model.sequelize.escape(`%${this._sanitizeSearchQuery(query)}%`);

    // Titre et description dans les 5 langues, sans accents ni majuscules (le JSON brut se
    // comparait à l'identique : « tapis » ne trouvait pas « Tapis »). Colonne texte_recherche de l'œuvre
    // (migration 20261120, mêmes champs) quand elle existe, comme la recherche des œuvres ; sinon une
    // extraction JSON par champ et par langue.
    const includes = this._defaultIncludes();
    const oeuvreInc = includes.find(i => i.model === this.models.Oeuvre);
    if (oeuvreInc) {
      const texte = (await aColonne(this.models.Oeuvre, 'texte_recherche'))
        ? [this.model.sequelize.literal(`\`Oeuvre\`.\`texte_recherche\` LIKE ${pattern}`)]
        : ['titre', 'description'].flatMap(champ => SUPPORTED_LANGUAGES.map(langue => this.model.sequelize.literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`Oeuvre\`.\`${champ}\`, '$.${cheminJson(langue)}')) COLLATE utf8mb4_0900_ai_ci LIKE ${pattern}`)));
      // Ou le nom de l'artisan
      const auteur = conditionAuteurOeuvre(this.model.sequelize, query, 'Oeuvre', await colonnesNom(this.models));
      oeuvreInc.where = {
        statut: 'publie',
        [Op.or]: [...texte, ...(auteur ? [this.model.sequelize.literal(auteur)] : [])]
      };
    }

    const { rows, count } = await this.model.findAndCountAll({
      include: includes,
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < count,
        hasPrev: parseInt(page) > 1
      }
    };
  }

  /**
   * Par artisan (id_user sur Oeuvre)
   */
  async findByArtisan(userId, options = {}) {
    const includes = this._defaultIncludes();
    const oeuvreInc = includes.find(i => i.model === this.models.Oeuvre);
    if (oeuvreInc) {
      oeuvreInc.where = { saisi_par: userId };
    }

    return this.findAll({
      ...options,
      include: includes
    });
  }

  /**
   * Statistiques
   */
  async getStats() {
    // Publié seulement : le chiffre doit correspondre à la liste publique (« 4 produits » pour 1 visible)
    const total = await this.model.count({
      include: [{ model: this.models.Oeuvre, required: true, attributes: [], where: { statut: 'publie' } }]
    });

    let byMateriau = [];
    if (this.models.Materiau) {
      byMateriau = await this.model.findAll({
        attributes: [
          'id_materiau',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_artisanat')), 'count']
        ],
        include: [{
          model: this.models.Materiau,
          attributes: ['nom'],
          required: false
        }],
        group: ['id_materiau', 'Materiau.id_materiau'],
        raw: false,
        limit: 50
      });
    }

    let byTechnique = [];
    if (this.models.Technique) {
      byTechnique = await this.model.findAll({
        attributes: [
          'id_technique',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_artisanat')), 'count']
        ],
        include: [{
          model: this.models.Technique,
          attributes: ['nom'],
          required: false
        }],
        group: ['id_technique', 'Technique.id_technique'],
        raw: false,
        limit: 50
      });
    }

    // Artisans distincts : auteurs des produits publiés (l'auteur est porté par l'œuvre liée)
    const [artisans] = await this.model.sequelize.query(
      `SELECT COUNT(DISTINCT o.saisi_par) AS n
         FROM artisanat a JOIN oeuvre o ON o.id_oeuvre = a.id_oeuvre
        WHERE o.statut = 'publie' AND o.saisi_par IS NOT NULL`,
      { type: this.model.sequelize.QueryTypes.SELECT }
    );
    const total_artisans = Number(artisans?.n) || 0;

    return { total, total_artisans, byMateriau, byTechnique };
  }
}

module.exports = ArtisanatRepository;
