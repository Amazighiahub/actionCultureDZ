/**
 * Éléments rattachés à la fiche d'un lieu : monuments, vestiges, blocs d'article et personnalités liées.
 * Les monuments et vestiges sont accrochés au DetailLieu du site (créé au premier ajout).
 */
const AppError = require('../../utils/appError');
const { sanitizeBlockContent } = require('../../utils/sanitizeArticle');

const MODELES = { monument: 'Monument', vestige: 'Vestige' };
const LIBELLES = { monument: 'Monument', vestige: 'Vestige' };

/** Personnalités liées au lieu, dans l'ordre choisi */
function personnalites(models, idLieu) {
  return models.LieuIntervenant.findAll({
    where: { id_lieu: idLieu },
    order: [['ordre', 'ASC'], ['date_creation', 'ASC']],
    include: [{
      model: models.Intervenant,
      as: 'Intervenant',
      attributes: ['id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'photo_url', 'specialites', 'biographie', 'wikipedia_url',
        'date_naissance', 'lieu_naissance', 'date_deces', 'lieu_deces', 'id_user']
    }]
  });
}

/** Rattacher une personnalité existante au lieu (ordre : à la fin par défaut) */
async function rattacherPersonnalite(models, idLieu, { id_intervenant, role_sur_site, periode, contexte, ordre }, idUser) {
  const lieu = await models.Lieu.findByPk(idLieu, { attributes: ['id_lieu'] });
  if (!lieu) throw AppError.notFound('Site patrimoine');
  const intervenant = await models.Intervenant.findByPk(id_intervenant, { attributes: ['id_intervenant'] });
  if (!intervenant) throw AppError.notFound('Intervenant');

  const ordreFinal = ordre !== undefined
    ? ordre
    : ((await models.LieuIntervenant.max('ordre', { where: { id_lieu: idLieu } })) || 0) + 1;
  let lien;
  try {
    lien = await models.LieuIntervenant.create({
      id_lieu: idLieu,
      id_intervenant,
      role_sur_site: role_sur_site || null,
      periode: periode || null,
      contexte: contexte || null,
      ordre: ordreFinal,
      id_contributeur: idUser || null
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw AppError.conflict('Cet intervenant est déjà associé à ce site');
    throw error;
  }
  return models.LieuIntervenant.findByPk(lien.id_lieu_intervenant, {
    include: [{ model: models.Intervenant, as: 'Intervenant', attributes: ['id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'photo_url', 'specialites'] }]
  });
}

async function detailDuLieu(models, idLieu, idUser) {
  const lieu = await models.Lieu.findByPk(idLieu, { attributes: ['id_lieu'] });
  if (!lieu) throw AppError.notFound('Site');
  const detail = await models.DetailLieu.findOne({ where: { id_lieu: idLieu } });
  if (detail) return detail;
  return models.DetailLieu.create({
    id_lieu: idLieu,
    id_dernier_contributeur: idUser || null,
    date_derniere_contribution: new Date(),
    nb_contributions: 1
  });
}

/** Monument ou vestige du lieu (vérifie qu'il appartient bien à ce lieu) */
async function trouverElement(models, genre, idLieu, idElement) {
  if (!Number.isInteger(idElement)) throw AppError.badRequest('Identifiant invalide');
  const element = await models[MODELES[genre]].findOne({
    where: { id: idElement },
    include: [{ model: models.DetailLieu, where: { id_lieu: idLieu }, required: true, attributes: [] }]
  });
  if (!element) throw AppError.notFound(LIBELLES[genre]);
  return element;
}

async function ajouterElement(models, genre, idLieu, { nom, type, description }, idUser) {
  const detail = await detailDuLieu(models, idLieu, idUser);
  return models[MODELES[genre]].create({
    id_detail_lieu: detail.id_detailLieu,
    nom,
    description: description || {},
    type
  });
}

async function modifierElement(models, genre, idLieu, idElement, { nom, type, description }) {
  const element = await trouverElement(models, genre, idLieu, idElement);
  if (nom !== undefined) element.nom = nom;
  if (type !== undefined) element.type = type;
  if (description !== undefined) element.description = description;
  await element.save();
  return element;
}

async function supprimerElement(models, genre, idLieu, idElement) {
  const element = await trouverElement(models, genre, idLieu, idElement);
  await element.destroy();
}

/** Blocs d'article visibles du lieu, éventuellement d'une seule section */
function blocs(models, idLieu, section) {
  const where = { id_article: idLieu, article_type: 'patrimoine', visible: true };
  if (section) where.section_patrimoine = section;
  return models.ArticleBlock.findAll({
    where,
    order: [['section_patrimoine', 'ASC'], ['ordre', 'ASC']],
    include: [{ model: models.Media, as: 'media', required: false }]
  });
}

async function ajouterBloc(models, idLieu, { type_block, section_patrimoine, contenu, contenu_json, metadata }, idUser) {
  const lieu = await models.Lieu.findByPk(idLieu, { attributes: ['id_lieu'] });
  if (!lieu) throw AppError.notFound('Site patrimoine');

  const maxOrdre = await models.ArticleBlock.max('ordre', {
    where: { id_article: idLieu, article_type: 'patrimoine', section_patrimoine }
  });
  const bloc = await models.ArticleBlock.create({
    id_article: idLieu,
    article_type: 'patrimoine',
    section_patrimoine,
    type_block,
    contenu: contenu ? sanitizeBlockContent(type_block, contenu) : null,
    contenu_json: contenu_json || {},
    metadata: metadata || {},
    ordre: (maxOrdre || 0) + 1,
    visible: true
  });

  const detail = await models.DetailLieu.findOne({ where: { id_lieu: idLieu } });
  if (detail) {
    await detail.update({
      id_dernier_contributeur: idUser,
      date_derniere_contribution: new Date(),
      nb_contributions: (detail.nb_contributions || 0) + 1
    });
  }
  return bloc;
}

async function supprimerBloc(models, idLieu, idBloc) {
  const bloc = await models.ArticleBlock.findOne({
    where: { id_block: idBloc, id_article: idLieu, article_type: 'patrimoine' }
  });
  if (!bloc) throw AppError.notFound('Bloc');
  await bloc.destroy();
}

module.exports = {
  personnalites, rattacherPersonnalite, ajouterElement, modifierElement, supprimerElement, blocs, ajouterBloc, supprimerBloc
};
