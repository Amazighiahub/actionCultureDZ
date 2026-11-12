/**
 * LieuRepository - Repository pour les lieux
 * Encapsule tous les accès Sequelize pour le modèle Lieu
 */
const BaseRepository = require('./baseRepository');
const { Op } = require('sequelize');
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');
const { decalage, construirePagination } = require('../utils/pagination');
const { sansAccent } = require('../utils/texte');

class LieuRepository extends BaseRepository {
  constructor(models) {
    super(models.Lieu);
    this.models = models;
    this.sequelize = models.sequelize || models.Lieu.sequelize;
  }

  /**
   * Includes par défaut pour un lieu
   */
  _defaultIncludes() {
    const includes = [];
    if (this.models.Commune) {
      includes.push({
        model: this.models.Commune,
        attributes: ['nom'],
        include: this.models.Daira ? [{
          model: this.models.Daira,
          attributes: ['nom'],
          // (colonne codeW : « code » n'existe pas)
          include: this.models.Wilaya ? [{ model: this.models.Wilaya, attributes: ['nom', 'codeW'] }] : []
        }] : []
      });
    }
    // (plus d'include Wilaya direct : Lieu n'est relié à la wilaya que par Commune -> Daira)
    return includes;
  }

  /**
   * Recherche paginée avec filtres
   */
  async findFiltered({ page = 1, limit = 20, search, typeLieu, typeLieuCulturel, communeId, wilayaId, statut, lang = 'fr' }) {
    const where = {};

    if (search) {
      where[Op.or] = buildMultiLangSearch(this.sequelize, 'nom', search, 'Lieu');
    }
    if (typeLieu) where.type_lieu = typeLieu;
    if (typeLieuCulturel) where.type_lieu_culturel = typeLieuCulturel;
    if (communeId) where.commune_id = communeId;
    if (wilayaId) where.wilaya_id = wilayaId;
    if (statut) where.statut = statut;

    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = decalage(page, safeLimit);

    const { rows, count } = await this.model.findAndCountAll({
      where,
      include: this._defaultIncludes(),
      limit: safeLimit,
      offset,
      order: [['date_creation', 'DESC']],
      distinct: true
    });

    return {
      data: rows,
      pagination: construirePagination(count, page, safeLimit)
    };
  }

  /**
   * Trouve un lieu avec tous ses détails (médias, détails, etc.)
   */
  async findWithFullDetails(id) {
    const includes = [...this._defaultIncludes()];
    if (this.models.DetailLieu) {
      includes.push({ model: this.models.DetailLieu });
    }
    if (this.models.LieuMedia) {
      includes.push({ model: this.models.LieuMedia });
    }
    if (this.models.Localite) {
      includes.push({ model: this.models.Localite, attributes: ['nom'] });
    }

    return this.model.findByPk(id, { include: includes });
  }

  /**
   * Lieux pour la carte (attributs minimaux + coordonnées)
   */
  async findForMap({ typeLieu, wilayaId } = {}) {
    const where = {};
    if (typeLieu) where.type_lieu = typeLieu;
    if (wilayaId) where.wilaya_id = wilayaId;

    return this.model.findAll({
      where,
      attributes: ['id_lieu', 'nom', 'type_lieu', 'latitude', 'longitude', 'statut'],
      include: this.models.Wilaya
        ? [{ model: this.models.Wilaya, attributes: ['nom', 'code'] }]
        : []
    });
  }

  /**
   * Trouve une commune par ID
   */
  async findCommuneById(communeId) {
    if (!this.models.Commune) return null;
    return this.models.Commune.findByPk(communeId);
  }

  /**
   * Commune d'un nouveau lieu. Le formulaire envoie la wilaya choisie et, depuis la carte
   * (OpenStreetMap), le nom de la commune et de la wilaya du point. Ordre : la commune de ce nom dans
   * la wilaya, sinon la première commune de la wilaya ; sans wilaya, la seule commune de ce nom.
   * Avant : colonne Daira.id_wilaya inexistante (c'est wilayaId), chaque création de lieu échouait.
   */
  async findCommuneByWilaya(wilayaId, { communeNom, wilayaNom } = {}) {
    const { Commune, Daira, Wilaya } = this.models;
    if (!Commune || !Daira) return null;
    const cle = (v) => sansAccent(String(v || ''))
      .replace(/^(commune|wilaya|daira|province)( de| d'| du)?\s+/, '')
      .replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
    const nomCherche = cle(communeNom);

    let idWilaya = Number(wilayaId) || null;
    if (!idWilaya && wilayaNom && Wilaya) {
      const cleWilaya = cle(wilayaNom);
      const wilayas = await Wilaya.findAll({ attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii'], raw: true });
      const trouvee = cleWilaya && wilayas.find((w) => [w.wilaya_name_ascii, w.nom].some((n) => cle(n) === cleWilaya));
      if (trouvee) idWilaya = trouvee.id_wilaya;
    }

    const attributs = ['id_commune', 'nom', 'commune_name_ascii'];
    if (idWilaya) {
      const communes = await Commune.findAll({
        attributes: attributs,
        include: [{ model: Daira, where: { wilayaId: idWilaya }, attributes: [] }],
        order: [['id_commune', 'ASC']]
      });
      if (!communes.length) return null;
      const memeNom = nomCherche && communes.find((c) => [c.commune_name_ascii, c.nom].some((n) => cle(n) === nomCherche));
      return memeNom || communes[0];
    }
    if (!nomCherche) return null;
    const candidates = await Commune.findAll({
      attributes: attributs,
      // nomCherche ne garde que lettres, chiffres et espaces : ni % ni _ à échapper
      where: { commune_name_ascii: { [Op.like]: `%${nomCherche.split(' ')[0]}%` } },
      limit: 50
    });
    const memeNom = candidates.filter((c) => [c.commune_name_ascii, c.nom].some((n) => cle(n) === nomCherche));
    return memeNom.length === 1 ? memeNom[0] : null;
  }

  /**
   * Trouve une localité par ID
   */
  async findLocaliteById(localiteId) {
    if (!this.models.Localite) return null;
    return this.models.Localite.findByPk(localiteId);
  }
}

module.exports = LieuRepository;
