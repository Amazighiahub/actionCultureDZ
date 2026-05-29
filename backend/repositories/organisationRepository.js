const BaseRepository = require('./baseRepository');
const { Op, Sequelize } = require('sequelize');
const { SUPPORTED_LANGUAGES } = require('../helpers/i18n');

class OrganisationRepository extends BaseRepository {
  constructor(models) {
    super(models.Organisation);
    this.models = models;
  }

  _defaultIncludes() {
    const includes = [];
    if (this.models.TypeOrganisation) {
      includes.push({
        model: this.models.TypeOrganisation,
        attributes: ['id_type_organisation', 'nom']
      });
    }
    return includes;
  }

  async findByUser(userId) {
    const { UserOrganisation, Organisation, TypeOrganisation } = this.models;

    const userOrgs = await UserOrganisation.findAll({
      where: { id_user: userId, actif: true },
      include: [{
        model: Organisation,
        as: 'Organisation',
        include: TypeOrganisation ? [{ model: TypeOrganisation, attributes: ['id_type_organisation', 'nom'] }] : []
      }]
    });

    return userOrgs.map(uo => ({
      ...uo.Organisation.toJSON(),
      role: uo.role
    }));
  }

  async findById(id) {
    return this.model.findByPk(id, {
      include: this._defaultIncludes()
    });
  }

  async findTypes() {
    return this.models.TypeOrganisation
      ? this.models.TypeOrganisation.findAll({ order: [['id_type_organisation', 'ASC']] })
      : [];
  }

  /**
   * Recherche une organisation par nom (multilingue) — pour détecter les doublons.
   * Retourne null si aucun doublon.
   */
  async findByName(searchStr) {
    if (!searchStr) return null;

    const normalized = searchStr.trim().toLowerCase();
    const conditions = SUPPORTED_LANGUAGES.map(l => {
      const jsonPath = l.includes('-') ? `$."${l}"` : `$.${l}`;
      return Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.fn('JSON_UNQUOTE',
          Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom'), Sequelize.literal(`'${jsonPath}'`))
        )),
        normalized
      );
    });

    return this.model.findOne({ where: { [Op.or]: conditions } });
  }

  async create(data) {
    return this.model.create(data);
  }

  /**
   * Lie un utilisateur à une organisation (findOrCreate pour éviter les doublons).
   */
  async linkUser(userId, orgId, role = 'membre') {
    const { UserOrganisation } = this.models;
    const [record] = await UserOrganisation.findOrCreate({
      where: { id_user: userId, id_organisation: orgId },
      defaults: { role, actif: true }
    });
    return record;
  }
}

module.exports = OrganisationRepository;
