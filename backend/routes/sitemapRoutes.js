// routes/sitemapRoutes.js
// Génère un sitemap.xml dynamique avec toutes les pages publiques + détails

const express = require('express');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Une rubrique lente ou en erreur ne doit jamais bloquer tout le sitemap (sinon 504)
const QUERY_TIMEOUT_MS = 8000;
function safeQuery(label, promiseFactory) {
  const start = Date.now();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      logger.warn(`Sitemap: ${label} > ${QUERY_TIMEOUT_MS} ms, rubrique omise`);
      resolve([]);
    }, QUERY_TIMEOUT_MS);
  });
  const query = Promise.resolve()
    .then(promiseFactory)
    .then((rows) => {
      const ms = Date.now() - start;
      if (ms > 1000) logger.warn(`Sitemap: ${label} lent (${ms} ms)`);
      return rows;
    })
    .catch((err) => { logger.warn(`Sitemap: erreur ${label}: ${err.message}`); return []; });
  return Promise.race([query, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Génère le sitemap XML dynamique
 * Inclut : pages statiques + toutes les pages détail (oeuvres, événements, patrimoine, artisanat)
 */
const initSitemapRoutes = (models) => {
  // Un routeur par initialisation (pas un singleton de module)
  const router = express.Router();
  const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/$/, '');

  // Helper : échappe les caractères spéciaux XML
  const escapeXml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // Helper : génère un bloc <url>
  const urlBlock = (loc, changefreq = 'weekly', priority = '0.5', lastmod = null) => {
    let xml = `  <url>\n    <loc>${escapeXml(FRONTEND_URL + loc)}</loc>\n`;
    if (lastmod) {
      xml += `    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>\n`;
    }
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
    return xml;
  };

  router.get('/', async (req, res) => {
    const started = Date.now();
    try {
      let urls = '';

      // ══════════════════════════════════════════
      // 1. Pages statiques
      // ══════════════════════════════════════════
      urls += urlBlock('/', 'daily', '1.0');
      urls += urlBlock('/patrimoine', 'weekly', '0.9');
      urls += urlBlock('/evenements', 'daily', '0.9');
      urls += urlBlock('/oeuvres', 'weekly', '0.9');
      urls += urlBlock('/artisanat', 'weekly', '0.9');
      urls += urlBlock('/a-propos', 'monthly', '0.6');

      // ══════════════════════════════════════════
      // 2-6. Toutes les entités en parallèle
      // ══════════════════════════════════════════
      const SITEMAP_LIMIT = 50000;
      const [oeuvres, evenements, lieux, artisanats, articles] = await Promise.all([
        // Articles (types 4 et 5) exclus : ils ont leur propre adresse /articles/:id
        models.Oeuvre ? safeQuery('oeuvres', () => models.Oeuvre.findAll({
          where: { statut: 'publie', id_type_oeuvre: { [Op.notIn]: [4, 5] } },
          attributes: ['id_oeuvre', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        models.Evenement ? safeQuery('evenements', () => models.Evenement.findAll({
          // Statuts visibles publiquement (memes regles que la liste et la fiche)
          where: { statut: ['publie', 'planifie', 'en_cours', 'termine'] },
          attributes: ['id_evenement', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        models.Lieu ? safeQuery('patrimoine', () => models.Lieu.findAll({
          where: { statut: 'publie' },
          attributes: ['id_lieu', 'updatedAt'],
          order: [['updatedAt', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        // Seulement les creations dont l'oeuvre est publiee (comme la fiche publique)
        models.Artisanat ? safeQuery('artisanat', () => models.Artisanat.findAll({
          include: [{ model: models.Oeuvre, attributes: [], where: { statut: 'publie' }, required: true }],
          attributes: ['id_artisanat', 'updated_at'],
          order: [['updated_at', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        models.Oeuvre ? safeQuery('articles', () => models.Oeuvre.findAll({
          where: { statut: 'publie', id_type_oeuvre: [4, 5] },
          attributes: ['id_oeuvre', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : []
      ]);

      oeuvres.forEach(o => { urls += urlBlock(`/oeuvres/${o.id_oeuvre}`, 'weekly', '0.7', o.date_modification); });
      evenements.forEach(e => { urls += urlBlock(`/evenements/${e.id_evenement}`, 'daily', '0.8', e.date_modification); });
      lieux.forEach(l => { urls += urlBlock(`/patrimoine/${l.id_lieu}`, 'monthly', '0.7', l.updatedAt); });
      artisanats.forEach(a => { urls += urlBlock(`/artisanat/${a.id_artisanat}`, 'weekly', '0.7', a.updated_at); });
      articles.forEach(a => { urls += urlBlock(`/articles/${a.id_oeuvre}`, 'weekly', '0.7', a.date_modification); });

      // ══════════════════════════════════════════
      // Assembler le XML final
      // ══════════════════════════════════════════
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}</urlset>
`;

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache 1h
      res.send(xml);
      logger.info(`Sitemap: ${(xml.match(/<loc>/g) || []).length} URL en ${Date.now() - started} ms`);

    } catch (error) {
      console.error('❌ Erreur génération sitemap:', error);
      res.status(500).set('Content-Type', 'text/plain').send('Erreur génération sitemap');
    }
  });

  return router;
};

module.exports = initSitemapRoutes;
