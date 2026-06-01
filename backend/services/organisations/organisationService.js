const BaseService = require('../core/baseService');

class OrganisationService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
  }

  async findByUser(userId) {
    return this.repository.findByUser(userId);
  }

  async findById(id) {
    const org = await this.repository.findById(id);
    if (!org) throw this._notFoundError(id);
    return org;
  }

  async getTypes() {
    return this.repository.findTypes();
  }

  /**
   * Crée une organisation.
   * - Si une organisation avec le même nom existe déjà, lie l'utilisateur dessus.
   * - Sinon, crée et lie comme responsable.
   */
  async create(data, userId) {
    const { nom, id_type_organisation, description, site_web } = data;

    const nomI18n = typeof nom === 'string' ? { fr: nom } : nom;
    const descI18n = typeof description === 'string' ? { fr: description } : (description || {});
    const searchStr = (typeof nom === 'string' ? nom : (nom?.fr || '')).trim();

    if (searchStr) {
      const existing = await this.repository.findByName(searchStr);
      if (existing) {
        await this.repository.linkUser(userId, existing.id_organisation, 'membre');
        return { organisation: existing, created: false };
      }
    }

    const organisation = await this.repository.create({
      nom: nomI18n,
      id_type_organisation,
      description: descI18n,
      site_web: site_web || null
    });

    await this.repository.linkUser(userId, organisation.id_organisation, 'responsable');
    return { organisation, created: true };
  }
}

module.exports = OrganisationService;
