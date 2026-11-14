/**
 * « À la une » de l'accueil (idée de la responsable, 2026-11-14) : les photos des contributeurs
 * remplacent une partie des paysages fixes. Jusqu'à 5 images : 3 lieux, 2 œuvres d'art, objets
 * d'artisanat ou articles, prises parmi les contenus publiés récents qui ont une photo.
 *  - Pas d'affiche d'événement ni de couverture (livre, film, disque) : leur propre texte se
 *    mélangeait au titre de l'accueil et devenait illisible. Seulement de vraies photos.
 *  - L'équipe écarte une photo qui ne convient pas : « Ne pas mettre à l'accueil » (exclu_accueil).
 *  - Seulement des images stockées par le site (Cloudinary du site), jamais un lien externe.
 *  - Recadrées par Cloudinary au format de l'accueil (g_auto : le sujet reste dans le cadre).
 *  - Le choix change chaque jour (même choix pour tous pendant la journée : cache cohérent).
 * Le site garde ses paysages si moins de 3 images sont disponibles.
 */
const { Op } = require('sequelize');
const { estImageDuSite } = require('./evenement/messagesParticipants');
const { texteLisible } = require('../helpers/i18n');

const LARGEURS = [768, 1280, 1920];
const RESERVE = 20; // contenus récents parmi lesquels on choisit
// Œuvres dont l'image est une photo (et non une couverture avec du texte) : articles (4, 5),
// œuvre d'art (6), artisanat (7)
const TYPES_PHOTO = [4, 5, 6, 7];

/** Adresse Cloudinary recadrée pour l'accueil (paysage 16/10), à la largeur demandée */
function recadrer(url, largeur) {
  const transformation = `c_fill,g_auto,w_${largeur},h_${Math.round(largeur * 0.625)},q_auto,f_auto`;
  return url.replace('/image/upload/', `/image/upload/${transformation}/`);
}

/** Choix stable pour la journée : mélange déterministe d'après la date */
function melangerDuJour(liste, jour = new Date()) {
  const graine = Number(jour.toISOString().slice(0, 10).replace(/-/g, ''));
  return liste
    .map((e, i) => ({ e, k: ((graine + i * 9301 + 49297) * 233280) % 1000003 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.e);
}

const vitrine = (type, id, titre, url, credit) => ({
  type, id, titre, credit: credit || null,
  image: recadrer(url, 1280),
  srcSet: LARGEURS.map((l) => `${recadrer(url, l)} ${l}w`).join(', ')
});

async function lieux(models, lang) {
  if (!models.Lieu || !models.LieuMedia) return [];
  const lignes = await models.Lieu.findAll({
    where: { statut: 'publie', exclu_accueil: false },
    attributes: ['id_lieu', 'nom'],
    include: [{ model: models.LieuMedia, attributes: ['id', 'url', 'credit'], where: { type: 'image' }, required: true }],
    order: [['id_lieu', 'DESC']],
    limit: RESERVE
  });
  return lignes.map((l) => {
    // Photo principale du lieu : la première ajoutée, comme sur sa page (PatrimoineDetail)
    const photo = (l.LieuMedia || l.LieuMedias || []).filter((m) => estImageDuSite(m.url))
      .sort((a, b) => (a.id || 0) - (b.id || 0))[0];
    return photo ? vitrine('lieu', l.id_lieu, texteLisible(l.nom, lang), photo.url, photo.credit) : null;
  }).filter(Boolean);
}

async function oeuvres(models, lang) {
  if (!models.Oeuvre || !models.Media) return [];
  const lignes = await models.Oeuvre.findAll({
    where: { statut: 'publie', id_type_oeuvre: { [Op.in]: TYPES_PHOTO }, exclu_accueil: false },
    attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre'],
    include: [{ model: models.Media, attributes: ['id_media', 'url', 'credit', 'is_Principale'], where: { type_media: 'image', visible_public: true }, required: true }],
    order: [['id_oeuvre', 'DESC']],
    limit: RESERVE
  });
  return lignes.map((o) => {
    // Photo principale de l'œuvre (même règle que sa page, oeuvreDTO), sinon la plus récente :
    // une photo remplacée par l'auteur ne doit pas réapparaître à l'accueil
    const images = (o.Media || o.Medias || []).filter((m) => estImageDuSite(m.url))
      .sort((a, b) => Number(!!b.is_Principale) - Number(!!a.is_Principale) || (b.id_media || 0) - (a.id_media || 0));
    const photo = images[0];
    const type = [4, 5].includes(Number(o.id_type_oeuvre)) ? 'article' : 'oeuvre';
    return photo ? vitrine(type, o.id_oeuvre, texteLisible(o.titre, lang), photo.url, photo.credit) : null;
  }).filter(Boolean);
}

/** Jusqu'à 5 images : 3 lieux, 2 œuvres d'art, objets d'artisanat ou articles (alternés) */
async function aLaUne(models, lang = 'fr', jour = new Date()) {
  const [l, o] = await Promise.all([lieux(models, lang), oeuvres(models, lang)]);
  const choix = [
    ...melangerDuJour(l, jour).slice(0, 3),
    ...melangerDuJour(o, jour).slice(0, 2)
  ];
  return entrelacer(choix);
}

/** Alternance des genres : lieu, œuvre, événement, lieu, œuvre… */
function entrelacer(choix) {
  const groupes = [choix.filter((c) => c.type === 'lieu'), choix.filter((c) => c.type === 'oeuvre' || c.type === 'article'), choix.filter((c) => c.type === 'evenement')];
  const resultat = [];
  for (let i = 0; resultat.length < choix.length; i++) for (const g of groupes) if (g[i]) resultat.push(g[i]);
  return resultat;
}

/** Modèle et clé d'un contenu de l'accueil ; null si le genre est inconnu */
function cible(models, type) {
  if (type === 'lieu') return models.Lieu ? { modele: models.Lieu, cle: 'id_lieu', champ: 'nom' } : null;
  if (type === 'oeuvre' || type === 'article') return models.Oeuvre ? { modele: models.Oeuvre, cle: 'id_oeuvre', champ: 'titre' } : null;
  return null;
}

/** « Ne pas mettre à l'accueil » (exclu = true) ou l'y remettre (false). Faux si le contenu n'existe pas. */
async function exclure(models, type, id, exclu) {
  const c = cible(models, type);
  if (!c || !Number.isInteger(id) || id < 1) return false;
  const [n] = await c.modele.update({ exclu_accueil: !!exclu }, { where: { [c.cle]: id } });
  return n > 0;
}

/** Contenus écartés de l'accueil (pour les y remettre) */
async function exclusions(models, lang = 'fr') {
  const liste = [];
  for (const type of ['lieu', 'oeuvre']) {
    const c = cible(models, type);
    if (!c) continue;
    const lignes = await c.modele.findAll({ where: { exclu_accueil: true }, attributes: [c.cle, c.champ], order: [[c.cle, 'DESC']], limit: 200 });
    liste.push(...lignes.map((l) => ({ type, id: l[c.cle], titre: texteLisible(l[c.champ], lang) })));
  }
  return liste;
}

module.exports = { aLaUne, recadrer, melangerDuJour, entrelacer, exclure, exclusions };
