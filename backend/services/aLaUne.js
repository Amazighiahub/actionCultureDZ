/**
 * « À la une » de l'accueil (idée de la responsable, 2026-11-14) : les photos des contributeurs
 * remplacent une partie des paysages fixes. Jusqu'à 5 images : 3 lieux, 2 œuvres d'art, objets
 * d'artisanat ou articles, prises parmi les contenus publiés récents qui ont une photo.
 *  - Pas d'affiche d'événement ni de couverture (livre, film, disque) : leur propre texte se
 *    mélangeait au titre de l'accueil et devenait illisible. Seulement de vraies photos.
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
    where: { statut: 'publie' },
    attributes: ['id_lieu', 'nom'],
    include: [{ model: models.LieuMedia, attributes: ['url', 'credit'], where: { type: 'image' }, required: true }],
    order: [['id_lieu', 'DESC']],
    limit: RESERVE
  });
  return lignes.map((l) => {
    const photo = (l.LieuMedia || l.LieuMedias || []).find((m) => estImageDuSite(m.url));
    return photo ? vitrine('lieu', l.id_lieu, texteLisible(l.nom, lang), photo.url, photo.credit) : null;
  }).filter(Boolean);
}

async function oeuvres(models, lang) {
  if (!models.Oeuvre || !models.Media) return [];
  const lignes = await models.Oeuvre.findAll({
    where: { statut: 'publie', id_type_oeuvre: { [Op.in]: TYPES_PHOTO } },
    attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre'],
    include: [{ model: models.Media, attributes: ['url', 'credit'], where: { type_media: 'image', visible_public: true }, required: true }],
    order: [['id_oeuvre', 'DESC']],
    limit: RESERVE
  });
  return lignes.map((o) => {
    const photo = (o.Media || o.Medias || []).find((m) => estImageDuSite(m.url));
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

module.exports = { aLaUne, recadrer, melangerDuJour, entrelacer };
