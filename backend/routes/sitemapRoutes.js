// routes/sitemapRoutes.js
// Génère un sitemap.xml dynamique avec toutes les pages publiques + détails

const express = require('express');
const router = express.Router();

/**
 * Génère le sitemap XML dynamique
 * Inclut : pages statiques + toutes les pages détail (oeuvres, événements, patrimoine, artisanat)
 */
const initSitemapRoutes = (models) => {
  const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

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
      urls += urlBlock('/auth', 'monthly', '0.4');

      // ══════════════════════════════════════════
      // 2-6. Toutes les entités en parallèle
      // ══════════════════════════════════════════
      const SITEMAP_LIMIT = 50000;
      const [oeuvres, evenements, lieux, artisanats, articles] = await Promise.all([
        models.Oeuvre ? models.Oeuvre.findAll({
          where: { statut: 'publie' },
          attributes: ['id_oeuvre', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        }).catch(err => { console.warn('⚠️ Sitemap: erreur oeuvres:', err.message); return []; }) : [],

        models.Evenement ? models.Evenement.findAll({
          where: { statut: ['planifie', 'en_cours', 'a_venir'] },
          attributes: ['id_evenement', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        }).catch(err => { console.warn('⚠️ Sitemap: erreur evenements:', err.message); return []; }) : [],

        models.Lieu ? models.Lieu.findAll({
          attributes: ['id_lieu', 'updatedAt'],
          order: [['updatedAt', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        }).catch(err => { console.warn('⚠️ Sitemap: erreur patrimoine:', err.message); return []; }) : [],

        models.Artisanat ? models.Artisanat.findAll({
          attributes: ['id_artisanat', 'updated_at'],
          order: [['updated_at', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        }).catch(err => { console.warn('⚠️ Sitemap: erreur artisanat:', err.message); return []; }) : [],

        models.Oeuvre ? models.Oeuvre.findAll({
          where: { statut: 'publie', id_type_oeuvre: [4, 5] },
          attributes: ['id_oeuvre', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        }).catch(err => { console.warn('⚠️ Sitemap: erreur articles:', err.message); return []; }) : []
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

    } catch (error) {
      console.error('❌ Erreur génération sitemap:', error);
      res.status(500).set('Content-Type', 'text/plain').send('Erreur génération sitemap');
    }
  });

  return router;
};

module.exports = initSitemapRoutes;
