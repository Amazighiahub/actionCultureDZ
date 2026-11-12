const BaseRepository = require('./baseRepository');
const { Op, Sequelize } = require('sequelize');
const { buildMultiLangExactMatch } = require('../helpers/i18n');

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

  async findTypeParCode(code) {
    return this.models.TypeOrganisation
      ? this.models.TypeOrganisation.findOne({ where: { code } })
      : null;
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

    // Même nom (sans casse) dans une des langues ; un nom vide ne cherche rien
    const where = buildMultiLangExactMatch('nom', searchStr);
    if (!where[Op.or]) return null;
    return this.model.findOne({ where });
  }

  /** @param {Object} [options] - { transaction } */
  async create(data, options = {}) {
    return this.model.create(data, { transaction: options.transaction });
  }

  // ==========================================================================
  // PAGE PUBLIQUE (annuaire et vitrine)
  // ==========================================================================

  _vitrineIncludes() {
    const { TypeOrganisation, Wilaya } = this.models;
    return [
      ...(TypeOrganisation ? [{ model: TypeOrganisation, attributes: ['id_type_organisation', 'nom', 'code'] }] : []),
      ...(Wilaya ? [{ model: Wilaya, attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii'] }] : [])
    ];
  }

  /**
   * Organisations vérifiées, pour l'annuaire. Wilaya et types filtrés par MySQL (avant : toutes lues,
   * avec leur description, puis filtrées en JavaScript ; audit V11 BDD-7).
   * @param {{ idWilaya?: number|null, idsTypes?: number[]|null, avecSansType?: boolean }} filtres
   */
  async findAnnuaire({ idWilaya = null, idsTypes = null, avecSansType = false } = {}) {
    const where = { statut: 'valide' };
    if (idWilaya) where.id_wilaya = idWilaya;
    if (idsTypes) {
      where[Op.or] = [{ id_type_organisation: idsTypes }, ...(avecSansType ? [{ id_type_organisation: null }] : [])];
    }
    return this.model.findAll({
      where,
      attributes: ['id_organisation', 'nom', 'description', 'logo_url', 'id_type_organisation', 'id_wilaya', 'site_web'],
      include: this._vitrineIncludes(),
      order: [['id_organisation', 'DESC']]
    });
  }

  /**
   * Filtres de l'annuaire : nombre d'organisations vérifiées par type, et wilayas présentes. Un seul
   * comptage groupé, sans lire les fiches.
   */
  async facettesAnnuaire() {
    const lignes = await this.model.sequelize.query(
      `SELECT t.code AS code, o.id_wilaya AS id_wilaya, w.nom AS nom, w.wilaya_name_ascii AS wilaya_name_ascii, COUNT(*) AS n
         FROM organisation o
         LEFT JOIN typeorganisation t ON t.id_type_organisation = o.id_type_organisation
         LEFT JOIN wilayas w ON w.id_wilaya = o.id_wilaya
        WHERE o.statut = 'valide'
        GROUP BY t.code, o.id_wilaya, w.nom, w.wilaya_name_ascii`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    return lignes.map(l => ({ ...l, n: Number(l.n) }));
  }

  /** Types d'organisation (petite table) : pour traduire une famille de l'annuaire en types */
  async typesOrganisation() {
    if (!this.models.TypeOrganisation) return [];
    return this.models.TypeOrganisation.findAll({ attributes: ['id_type_organisation', 'code'], raw: true });
  }

  /** Toutes les organisations, pour la modération */
  async findPourModeration() {
    return this.model.findAll({
      include: this._vitrineIncludes(),
      order: [['id_organisation', 'DESC']]
    });
  }

  async findVitrine(id) {
    return this.model.findByPk(id, { include: this._vitrineIncludes() });
  }

  /** Membres actifs (rôle, et ce qu'on peut montrer publiquement d'eux) */
  async membres(idOrganisation) {
    const { UserOrganisation, User } = this.models;
    const lignes = await UserOrganisation.findAll({
      where: { id_organisation: idOrganisation, actif: true },
      attributes: ['id_user', 'role'],
      include: [{ model: User, as: 'User', attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'id_type_user'], required: true }],
      order: [['id', 'ASC']]
    });
    return lignes.map(l => ({ role: l.role, ...l.User.get({ plain: true }) }));
  }

  /** Rôle d'un membre actif (null s'il n'en fait pas partie) */
  async roleMembre(idOrganisation, userId) {
    const ligne = await this.models.UserOrganisation.findOne({
      where: { id_organisation: idOrganisation, id_user: userId, actif: true },
      attributes: ['role']
    });
    return ligne ? ligne.role : null;
  }

  /** Événements publics organisés, co-organisés ou soutenus, les plus récents d'abord */
  async evenements(idOrganisation, limit = 24) {
    const { Evenement, EvenementOrganisation } = this.models;
    if (!Evenement || !EvenementOrganisation) return [];
    const liens = await EvenementOrganisation.findAll({
      where: { id_organisation: idOrganisation },
      attributes: ['id_evenement', 'role']
    });
    if (!liens.length) return [];
    const roles = new Map(liens.map(l => [l.id_evenement, l.role]));
    const evenements = await Evenement.findAll({
      where: { id_evenement: { [Op.in]: [...roles.keys()] }, statut: { [Op.notIn]: ['brouillon', 'en_attente'] } },
      attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'image_url', 'statut'],
      order: [['date_debut', 'DESC']],
      limit
    });
    return evenements.map(e => ({ ...e.get({ plain: true }), role_organisation: roles.get(e.id_evenement) }));
  }

  /** Œuvres publiées par la maison d'édition (via ses fiches « éditeur ») */
  async oeuvres(idOrganisation, limit = 24) {
    const { Editeur, Oeuvre, Media } = this.models;
    if (!Editeur || !Oeuvre) return [];
    const editeurs = await Editeur.findAll({ where: { id_organisation: idOrganisation }, attributes: ['id_editeur'] });
    if (!editeurs.length) return [];
    const oeuvres = await Oeuvre.findAll({
      where: { statut: 'publie' },
      attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre', 'annee_creation'],
      include: [
        { model: Editeur, attributes: [], where: { id_editeur: { [Op.in]: editeurs.map(e => e.id_editeur) } }, through: { attributes: [] }, required: true },
        ...(Media ? [{ model: Media, attributes: ['url', 'thumbnail_url', 'type_media', 'ordre'], required: false, where: { visible_public: true }, separate: true, order: [['ordre', 'ASC']], limit: 1 }] : [])
      ],
      order: [['annee_creation', 'DESC'], ['id_oeuvre', 'DESC']],
      limit
    });
    return oeuvres.map(o => o.get({ plain: true }));
  }

  /** Nombre d'événements publics et d'œuvres publiées de chaque organisation (annuaire) */
  async compteurs(ids) {
    const resultat = new Map(ids.map(id => [id, { evenements: 0, oeuvres: 0 }]));
    if (!ids.length) return resultat;
    const q = (sql) => this.model.sequelize.query(sql, { replacements: { ids }, type: Sequelize.QueryTypes.SELECT });
    if (this.models.EvenementOrganisation && this.models.Evenement) {
      const lignes = await q(`SELECT eo.id_organisation AS id, COUNT(DISTINCT e.id_evenement) AS n
        FROM evenementorganisation eo JOIN evenement e ON e.id_evenement = eo.id_evenement
        WHERE eo.id_organisation IN (:ids) AND e.statut NOT IN ('brouillon', 'en_attente')
        GROUP BY eo.id_organisation`);
      for (const l of lignes) resultat.get(Number(l.id)).evenements = Number(l.n);
    }
    if (this.models.Editeur && this.models.OeuvreEditeur) {
      const lignes = await q(`SELECT ed.id_organisation AS id, COUNT(DISTINCT o.id_oeuvre) AS n
        FROM editeur ed JOIN oeuvre_editeur oe ON oe.id_editeur = ed.id_editeur
        JOIN oeuvre o ON o.id_oeuvre = oe.id_oeuvre
        WHERE ed.id_organisation IN (:ids) AND o.statut = 'publie'
        GROUP BY ed.id_organisation`);
      for (const l of lignes) resultat.get(Number(l.id)).oeuvres = Number(l.n);
    }
    return resultat;
  }

  /** Responsables actifs (destinataires des décisions de la modération) */
  async responsables(idOrganisation) {
    const lignes = await this.models.UserOrganisation.findAll({
      where: { id_organisation: idOrganisation, actif: true, role: ['responsable', 'directeur'] },
      attributes: ['id_user']
    });
    return lignes.map(l => l.id_user);
  }

  /**
   * Lie un utilisateur à une organisation (findOrCreate pour éviter les doublons).
   * @param {Object} [options] - { transaction } : celle de la création de l'organisation
   */
  async linkUser(userId, orgId, role = 'membre', options = {}) {
    const { UserOrganisation } = this.models;
    const [record] = await UserOrganisation.findOrCreate({
      where: { id_user: userId, id_organisation: orgId },
      defaults: { role, actif: true },
      transaction: options.transaction
    });
    return record;
  }
}

module.exports = OrganisationRepository;
