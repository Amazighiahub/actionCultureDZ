// routes/ogRoutes.js
// Aperçus pour les réseaux sociaux (Facebook, WhatsApp, LinkedIn, X, Telegram...).
// Ces robots n'exécutent pas le JavaScript : sans cette route, tout lien partagé
// affichait le titre et l'image génériques du site. nginx leur envoie les pages de
// détail ici (voir nginx/prod.conf) ; les visiteurs et Google reçoivent le site normal.

const express = require('express');
const logger = require('../utils/logger');

const SITE_URL = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/$/, '');
const SITE_NAME = 'Tala DZ';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESCRIPTION = "Explorez, préservez et partagez la richesse culturelle de l'Algérie : événements, patrimoine, œuvres, artisanat traditionnel.";

const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Texte d'un champ multilingue ({ fr, ar, ... }) : français, langue de référence du site */
function text(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return text(parsed);
    } catch { /* texte simple */ }
    return value;
  }
  if (typeof value === 'object') return value.fr || value.ar || value.en || Object.values(value).find(Boolean) || '';
  return String(value);
}

/** Résumé d'une description (balises retirées, ~200 caractères, coupé sur un mot) */
function summary(value, max = 200) {
  const plain = text(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** Image absolue au format attendu par les réseaux sociaux (1200x630, JPEG) */
function socialImage(url) {
  if (!url) return DEFAULT_IMAGE;
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(url);
  if (m) {
    if (/\.(pdf|svg)(\?|$)/i.test(m[2])) return DEFAULT_IMAGE;
    // Pas de transformation existante : recadrage 1200x630 centré sur le sujet
    return /^[a-z]{1,3}_[^/]*\//.test(m[2]) ? url : `${m[1]}c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/${m[2]}`;
  }
  if (/^https?:\/\//.test(url)) return url;
  if (/\.svg(\?|$)/i.test(url)) return DEFAULT_IMAGE;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Page HTML minimale lue par les robots des réseaux sociaux */
function buildOgHtml({ title, description, image, path, type = 'article', notFound = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path}`;
  const img = socialImage(image);
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${e(fullTitle)}</title>
<meta name="description" content="${e(desc)}">
${notFound ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${e(url)}">`}
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${e(type)}">
<meta property="og:title" content="${e(fullTitle)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${e(url)}">
<meta property="og:image" content="${e(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="fr_DZ">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(fullTitle)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(img)}">
</head>
<body>
<h1>${e(title || SITE_NAME)}</h1>
<p>${e(desc)}</p>
<p><a href="${e(url)}">Voir sur ${SITE_NAME}</a></p>
</body>
</html>
`;
}

const firstImage = (medias = []) => (medias.find((m) => (m.type_media || m.type) === 'image' && m.url) || {}).url;

const initOgRoutes = (models) => {
  const router = express.Router();

  // Chargement de chaque type de contenu (uniquement s'il est public)
  const loaders = {
    async evenements(id) {
      const ev = await models.Evenement.findByPk(id, {
        include: [{ model: models.Media, as: 'Medias', attributes: ['url', 'type_media'], required: false }],
      });
      if (!ev || ev.statut === 'brouillon') return null;
      const date = ev.date_debut ? new Date(ev.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const desc = summary(ev.description);
      return {
        title: text(ev.nom_evenement),
        description: [date, desc].filter(Boolean).join(' — ') || undefined,
        image: ev.image_url || firstImage(ev.Medias),
        type: 'article',
      };
    },
    async oeuvres(id) {
      const o = await models.Oeuvre.findByPk(id, {
        include: [{ model: models.Media, attributes: ['url', 'type_media'], required: false }],
      });
      if (!o || o.statut !== 'publie') return null;
      return { title: text(o.titre), description: summary(o.description) || undefined, image: firstImage(o.Media), type: 'article' };
    },
    async patrimoine(id) {
      const l = await models.Lieu.findByPk(id, {
        include: [
          { model: models.DetailLieu, attributes: ['description'], required: false },
          { model: models.LieuMedia, attributes: ['url', 'type'], required: false },
        ],
      });
      if (!l || l.statut !== 'publie') return null;
      return {
        title: text(l.nom),
        description: summary(l.DetailLieu && l.DetailLieu.description) || undefined,
        image: firstImage(l.LieuMedia || l.LieuMedias),
        type: 'place',
      };
    },
    async artisanat(id) {
      const a = await models.Artisanat.findByPk(id, {
        include: [{
          model: models.Oeuvre,
          include: [{ model: models.Media, attributes: ['url', 'type_media'], required: false }],
        }],
      });
      if (!a || !a.Oeuvre || a.Oeuvre.statut !== 'publie') return null;
      return { title: text(a.Oeuvre.titre), description: summary(a.Oeuvre.description) || undefined, image: firstImage(a.Oeuvre.Media), type: 'product' };
    },
  };
  loaders.articles = loaders.oeuvres;

  router.get('/:type/:id(\\d+)', async (req, res) => {
    const { type, id } = req.params;
    const path = `/${type}/${id}`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    const load = loaders[type];
    if (!load) return res.status(404).send(buildOgHtml({ path: '/', notFound: true }));
    try {
      const data = await load(Number(id));
      if (!data) {
        return res.status(404).send(buildOgHtml({ title: 'Page introuvable', path, notFound: true }));
      }
      // Les aperçus sont mis en cache par les réseaux sociaux eux-mêmes ; 10 min ici
      res.set('Cache-Control', 'public, max-age=600');
      return res.send(buildOgHtml({ ...data, path }));
    } catch (err) {
      logger.warn(`Aperçu social ${path} : ${err.message}`);
      // En cas d'erreur, aperçu générique plutôt qu'une page d'erreur
      return res.status(200).send(buildOgHtml({ path }));
    }
  });

  return router;
};

module.exports = initOgRoutes;
module.exports._internal = { buildOgHtml, socialImage, summary, text };
