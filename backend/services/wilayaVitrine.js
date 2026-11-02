/**
 * Page d'une wilaya : les personnes qui y vivent, leurs œuvres, et ce qui s'y passe.
 * Une œuvre apparaît dans la wilaya de son auteur, quel que soit son sujet (un livre sur Timgad écrit
 * par un auteur de Tizi Ouzou apparaît à Tizi Ouzou). Seuls les profils publics et actifs sont montrés.
 */
const { Op, literal } = require('sequelize');
const { PROFESSIONAL_TYPE_IDS } = require('../constants/publicAttributes');
const { includeOeuvreCarte, versCarte, ajouterCouvertures } = require('../utils/carteArticle');

const LIMITE = 24;
const LIMITE_PERSONNES = 100;
const TYPES_ARTICLE = [4, 5];
const TYPE_ARTISANAT = 7;
const STATUTS_EVENEMENT = ['publie', 'planifie', 'en_cours'];

/** Professionnels publics de la wilaya : par la wilaya indiquée, ou par leur commune */
async function wherePersonnes(models, idWilaya) {
  const communes = await models.Commune.findAll({
    attributes: ['id_commune'],
    include: [{ model: models.Daira, attributes: [], required: true, where: { wilayaId: idWilaya } }],
    raw: true
  });
  return {
    id_type_user: { [Op.in]: PROFESSIONAL_TYPE_IDS },
    statut: 'actif',
    profil_public: true,
    accepte_conditions: true,
    [Op.or]: [
      { wilaya_residence: idWilaya },
      { id_commune: { [Op.in]: communes.map(c => c.id_commune) } }
    ]
  };
}

async function listerPersonnes(models, where) {
  const lignes = await models.User.findAll({
    where,
    attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'id_type_user', 'entreprise'],
    include: [{ model: models.TypeUser, as: 'TypeUser', attributes: ['id_type_user', 'nom_type'], required: false }],
    order: [['id_user', 'ASC']],
    limit: LIMITE_PERSONNES
  });
  return lignes.map(u => u.get({ plain: true }));
}

/** Œuvres publiées des personnes : leurs contributions, ou celles qu'elles ont saisies sans préciser d'auteur */
function whereOeuvres(models, idsPersonnes, idsContributions) {
  const contributions = models.OeuvreUser.getTableName();
  return {
    statut: 'publie',
    [Op.or]: [
      { id_oeuvre: { [Op.in]: idsContributions } },
      {
        saisi_par: { [Op.in]: idsPersonnes },
        [Op.and]: [literal(`NOT EXISTS (SELECT 1 FROM \`${contributions}\` c WHERE c.id_oeuvre = \`Oeuvre\`.\`id_oeuvre\`)`)]
      }
    ]
  };
}

async function listerOeuvres(models, where) {
  const carte = includeOeuvreCarte(models);
  const [lignes, total] = await Promise.all([
    models.Oeuvre.findAll({
      where,
      attributes: carte.attributes,
      include: [...carte.include, { model: models.Artisanat, attributes: ['id_artisanat'], required: false }],
      order: [['id_oeuvre', 'DESC']],
      limit: LIMITE,
      subQuery: true
    }),
    models.Oeuvre.count({ where })
  ]);
  const plates = lignes.map(o => o.get({ plain: true }));
  const cartes = await ajouterCouvertures(models, plates.map(o => ({
    ...versCarte(null, o, false),
    id_artisanat: o.Artisanat?.id_artisanat || null
  })));
  for (const c of cartes) { delete c.id_lien; delete c.peut_retirer; delete c.statut; }
  return { liste: cartes, total };
}

/** Événements à venir ou en cours dans la wilaya */
async function listerEvenements(models, idWilaya) {
  const debutDuJour = new Date(new Date().setHours(0, 0, 0, 0));
  const where = {
    statut: { [Op.in]: STATUTS_EVENEMENT },
    [Op.or]: [{ date_fin: { [Op.gte]: debutDuJour } }, { date_fin: null, date_debut: { [Op.gte]: debutDuJour } }]
  };
  const dansLaWilaya = {
    model: models.Lieu,
    as: 'Lieu',
    attributes: [],
    required: true,
    include: [{
      model: models.Commune, attributes: [], required: true,
      include: [{ model: models.Daira, attributes: [], required: true, where: { wilayaId: idWilaya } }]
    }]
  };
  const { rows, count } = await models.Evenement.findAndCountAll({
    where,
    attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'image_url'],
    include: [dansLaWilaya],
    order: [['date_debut', 'ASC']],
    limit: LIMITE,
    subQuery: false
  });
  return { liste: rows.map(e => e.get({ plain: true })), total: count };
}

/** Sites publiés de la wilaya (les points de visite restent sur la fiche de leur site) */
async function listerLieux(models, idWilaya) {
  const { rows, count } = await models.Lieu.findAndCountAll({
    where: { statut: 'publie', id_lieu_parent: null },
    attributes: ['id_lieu', 'nom'],
    include: [
      {
        model: models.Commune, attributes: ['id_commune', 'nom', 'commune_name_ascii'], required: true,
        include: [{ model: models.Daira, attributes: [], required: true, where: { wilayaId: idWilaya } }]
      },
      { model: models.LieuMedia, attributes: ['url', 'type'], required: false, separate: true }
    ],
    order: [['id_lieu', 'DESC']],
    limit: LIMITE,
    distinct: true
  });
  return {
    liste: rows.map(l => {
      const { LieuMedia, LieuMedias, ...lieu } = l.get({ plain: true });
      const medias = LieuMedias || LieuMedia || [];
      return { ...lieu, image: (medias.find(m => m.type === 'image') || medias[0])?.url || null };
    }),
    total: count
  };
}

/**
 * @param {object} models
 * @param {number} idWilaya
 * @param {{annuaire: Function}} organisations service des organisations (même règle de visibilité que l'annuaire)
 * @returns {Promise<object|null>} null si la wilaya n'existe pas
 */
async function vitrineWilaya(models, idWilaya, organisations) {
  const wilaya = await models.Wilaya.findByPk(idWilaya, { attributes: ['id_wilaya', 'nom', 'wilaya_name_ascii', 'codeW'] });
  if (!wilaya) return null;

  const where = await wherePersonnes(models, idWilaya);
  const idsPersonnes = (await models.User.findAll({ where, attributes: ['id_user'], raw: true })).map(u => u.id_user);
  const idsContributions = idsPersonnes.length
    ? [...new Set((await models.OeuvreUser.findAll({
      where: { id_user: { [Op.in]: idsPersonnes } }, attributes: ['id_oeuvre'], raw: true
    })).map(c => c.id_oeuvre))]
    : [];
  const baseOeuvres = whereOeuvres(models, idsPersonnes, idsContributions);
  const avecTypes = (types, exclure = false) => ({ ...baseOeuvres, id_type_oeuvre: { [exclure ? Op.notIn : Op.in]: types } });

  const [personnes, oeuvres, articles, artisanat, evenements, lieux, annuaire] = await Promise.all([
    idsPersonnes.length ? listerPersonnes(models, where) : [],
    idsPersonnes.length ? listerOeuvres(models, avecTypes([...TYPES_ARTICLE, TYPE_ARTISANAT], true)) : { liste: [], total: 0 },
    idsPersonnes.length ? listerOeuvres(models, avecTypes(TYPES_ARTICLE)) : { liste: [], total: 0 },
    idsPersonnes.length ? listerOeuvres(models, avecTypes([TYPE_ARTISANAT])) : { liste: [], total: 0 },
    listerEvenements(models, idWilaya),
    listerLieux(models, idWilaya),
    organisations.annuaire({ wilaya: idWilaya })
  ]);

  return {
    wilaya: wilaya.get({ plain: true }),
    professionnels: { liste: personnes, total: idsPersonnes.length },
    oeuvres,
    articles,
    artisanat,
    evenements,
    lieux,
    organisations: { liste: annuaire.organisations.slice(0, LIMITE), total: annuaire.organisations.length }
  };
}

module.exports = { vitrineWilaya };
