/**
 * Cartes « En savoir plus » : articles de l'éditeur avancé reliés à un lieu (section) ou à une
 * personnalité. Règles communes de visibilité et de présentation (image, résumé).
 */

const { peutGerer } = require('./droits');

const STATUTS_EN_COURS = ['brouillon', 'en_attente'];

/** Œuvre de l'article, avec son résumé et ses images (pour l'include du lien) */
const includeOeuvreCarte = (models) => ({
  model: models.Oeuvre,
  as: 'Oeuvre',
  required: true,
  attributes: ['id_oeuvre', 'titre', 'description', 'id_type_oeuvre', 'statut', 'saisi_par'],
  include: [
    { model: models.Article, attributes: ['id_article', 'resume'], required: false },
    { model: models.Media, attributes: ['url', 'thumbnail_url', 'ordre'], where: { type_media: 'image' }, required: false }
  ]
});

/**
 * Un visiteur ne voit que les articles publiés ; l'auteur et la personne qui a relié l'article
 * voient aussi le leur en attente de validation ; la modération voit tout.
 */
const estVisible = (oeuvre, idContributeur, { userId = null, isModerator = false } = {}) => {
  if (oeuvre.statut === 'publie') return true;
  if (!STATUTS_EN_COURS.includes(oeuvre.statut)) return isModerator;
  return peutGerer([oeuvre.saisi_par, idContributeur], { userId, isModerator });
};

/** Carte affichée : titre, résumé, première image, état de validation */
const versCarte = (idLien, oeuvre, peutRetirer) => {
  const image = (oeuvre.Media || []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))[0];
  return {
    id_lien: idLien,
    id_oeuvre: oeuvre.id_oeuvre,
    id_type_oeuvre: oeuvre.id_type_oeuvre,
    id_article: oeuvre.Article?.id_article || null,
    titre: oeuvre.titre,
    resume: oeuvre.Article?.resume || oeuvre.description || null,
    image: image ? (image.thumbnail_url || image.url) : null,
    statut: oeuvre.statut,
    peut_retirer: peutRetirer
  };
};

/**
 * Image de couverture des cartes : la première image de l'article (celle que l'auteur a mise
 * en tête), à défaut une image de l'œuvre. Une seule requête pour toutes les cartes.
 * @param {Array} cartes résultats de versCarte, avec id_article (retiré ici)
 */
const ajouterCouvertures = async (models, cartes) => {
  const ids = cartes.map(c => c.id_article).filter(Boolean);
  if (ids.length && models.ArticleBlock) {
    const blocs = await models.ArticleBlock.findAll({
      where: { article_type: 'article', id_article: ids, type_block: 'image' },
      attributes: ['id_article', 'ordre'],
      include: [{ model: models.Media, as: 'media', attributes: ['url', 'thumbnail_url'], required: true }],
      order: [['ordre', 'ASC'], ['id_block', 'ASC']]
    });
    const premiere = new Map();
    for (const b of blocs) if (!premiere.has(b.id_article)) premiere.set(b.id_article, b.media.thumbnail_url || b.media.url);
    for (const c of cartes) if (premiere.has(c.id_article)) c.image = premiere.get(c.id_article);
  }
  for (const c of cartes) delete c.id_article;
  return cartes;
};

/**
 * Contrôles avant de relier un article : c'est bien un article, encore disponible, et
 * un article non publié ne peut être relié que par son auteur ou la modération.
 * @returns {{code: number, message: string}|null} le refus, ou null si l'article peut être relié
 */
const refusLien = (oeuvre, { userId, isModerator = false } = {}) => {
  if (!oeuvre) return { code: 400, message: 'Article introuvable' };
  if (![4, 5].includes(oeuvre.id_type_oeuvre)) return { code: 400, message: 'Seul un article peut être relié comme page détaillée' };
  if (oeuvre.statut !== 'publie' && !STATUTS_EN_COURS.includes(oeuvre.statut)) return { code: 400, message: 'Cet article n’est plus disponible' };
  if (oeuvre.statut !== 'publie' && !peutGerer(oeuvre.saisi_par, { userId, isModerator })) {
    return { code: 403, message: 'Seul l’auteur peut relier un article qui n’est pas encore publié' };
  }
  return null;
};

module.exports = { includeOeuvreCarte, estVisible, versCarte, ajouterCouvertures, refusLien };
