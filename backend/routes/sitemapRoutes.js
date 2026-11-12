// routes/sitemapRoutes.js
// Génère un sitemap.xml dynamique avec toutes les pages publiques + détails

const express = require('express');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { professionnelPath, evenementPath, organisationPath, oeuvrePath, artisanatPath, lieuPath, personnalitePath, wilayaPath, servicePath } = require('../utils/slug');
const { PROFESSIONAL_TYPE_IDS } = require('../constants/publicAttributes');
const { EVENEMENT_VISIBLE } = require('../constants/statuts');

// Une rubrique lente ou en erreur ne doit jamais bloquer tout le sitemap (sinon 504)
const QUERY_TIMEOUT_MS = 8000;
function safeQuery(label, promiseFactory) {
  const start = Date.now();
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      safeQuery.echecs += 1;
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
    .catch((err) => { safeQuery.echecs += 1; logger.warn(`Sitemap: erreur ${label}: ${err.message}`); return []; });
  return Promise.race([query, timeout]).finally(() => clearTimeout(timer));
}
safeQuery.echecs = 0;

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
    let xml = `  <url>\n    <loc>${escapeXml(FRONTEND_URL + encodeURI(loc))}</loc>\n`;
    if (lastmod) {
      xml += `    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>\n`;
    }
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
    return xml;
  };

  // Plan du site gardé une heure en mémoire (avant : 6 lectures de la base à chaque visite, sans limite
  // de fréquence, de quoi charger le serveur). Pendant qu'une visite le recalcule, les autres reçoivent
  // l'ancien plan.
  let enCache = null;
  let enCalcul = false;
  const DUREE_CACHE_MS = 60 * 60 * 1000;
  router.get('/', (req, res, next) => {
    const frais = enCache && Date.now() - enCache.le < DUREE_CACHE_MS;
    if (enCache && (frais || enCalcul)) {
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(enCache.xml);
    }
    enCalcul = true;
    const echecsAvant = safeQuery.echecs;
    const envoyer = res.send.bind(res);
    res.send = (corps) => {
      enCalcul = false;
      // Rubrique en erreur ou trop lente : plan incomplet, pas gardé (recalculé à la visite suivante)
      if (res.statusCode === 200 && typeof corps === 'string' && safeQuery.echecs === echecsAvant) enCache = { xml: corps, le: Date.now() };
      return envoyer(corps);
    };
    res.once('close', () => { enCalcul = false; });
    return next();
  });

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
      // Rubriques absentes jusqu'ici du plan du site
      urls += urlBlock('/organisations', 'weekly', '0.8');
      urls += urlBlock('/professionnels', 'weekly', '0.8');
      urls += urlBlock('/patrimoine/services', 'weekly', '0.7');
      urls += urlBlock('/artisanat/gastronomie', 'weekly', '0.7');
      // Pages de wilaya : seulement celles qui ont au moins un site publié (pas de pages vides)
      if (models.Lieu) {
        const wilayasAvecSites = await safeQuery('wilayas', () => models.Lieu.sequelize.query(
          `SELECT DISTINCT d.wilayaId AS id, w.wilaya_name_ascii AS nom FROM lieu l
            JOIN communes c ON c.id_commune = l.communeId
            JOIN dairas d ON d.id_daira = c.dairaId
            JOIN wilayas w ON w.id_wilaya = d.wilayaId
            WHERE l.statut = 'publie'`,
          { type: models.Lieu.sequelize.QueryTypes.SELECT }
        ));
        wilayasAvecSites.forEach(w => { urls += urlBlock(wilayaPath(w.id, w.nom), 'weekly', '0.6'); });
      }

      // ══════════════════════════════════════════
      // 2-6. Toutes les entités en parallèle
      // ══════════════════════════════════════════
      const SITEMAP_LIMIT = 50000;
      const [oeuvres, evenements, lieux, artisanats, articles, professionnels] = await Promise.all([
        // Articles (types 4 et 5) et artisanat (type 7) exclus : ils ont leur propre adresse
        // (/articles/:id, /artisanat/:id)
        models.Oeuvre ? safeQuery('oeuvres', () => models.Oeuvre.findAll({
          where: { statut: 'publie', id_type_oeuvre: { [Op.notIn]: [4, 5, 7] } },
          attributes: ['id_oeuvre', 'titre', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        models.Evenement ? safeQuery('evenements', () => models.Evenement.findAll({
          // Statuts visibles publiquement (memes regles que la liste et la fiche)
          where: { statut: EVENEMENT_VISIBLE },
          attributes: ['id_evenement', 'nom_evenement', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        models.Lieu ? safeQuery('patrimoine', () => models.Lieu.findAll({
          where: { statut: 'publie' },
          attributes: ['id_lieu', 'nom', 'updatedAt'],
          order: [['updatedAt', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        // Seulement les creations dont l'oeuvre est publiee (comme la fiche publique)
        models.Artisanat ? safeQuery('artisanat', () => models.Artisanat.findAll({
          // (artisanat n'a pas de colonne de mise a jour : date de modification de l'oeuvre liee)
          include: [{ model: models.Oeuvre, attributes: ['titre', 'date_modification'], where: { statut: 'publie' }, required: true }],
          attributes: ['id_artisanat'],
          order: [[models.Oeuvre, 'date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        models.Oeuvre ? safeQuery('articles', () => models.Oeuvre.findAll({
          where: { statut: 'publie', id_type_oeuvre: [4, 5] },
          attributes: ['id_oeuvre', 'titre', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : [],

        // Portfolios publics : professionnels validés (compte actif) au profil public ; un profil rendu
        // privé n'est plus signalé aux moteurs de recherche (son nom est dans l'adresse)
        models.User ? safeQuery('professionnels', () => models.User.findAll({
          where: { statut: 'actif', id_type_user: { [Op.in]: PROFESSIONAL_TYPE_IDS }, profil_public: true },
          attributes: ['id_user', 'nom', 'prenom', 'date_modification'],
          order: [['date_modification', 'DESC']],
          limit: SITEMAP_LIMIT, raw: true
        })) : []
      ]);

      oeuvres.forEach(o => { urls += urlBlock(oeuvrePath(o.id_oeuvre, o.titre), 'weekly', '0.7', o.date_modification); });
      evenements.forEach(e => { urls += urlBlock(evenementPath(e.id_evenement, e.nom_evenement), 'daily', '0.8', e.date_modification); });
      lieux.forEach(l => { urls += urlBlock(lieuPath(l.id_lieu, l.nom), 'monthly', '0.7', l.updatedAt); });
      artisanats.forEach(a => { urls += urlBlock(artisanatPath(a.id_artisanat, a['Oeuvre.titre']), 'weekly', '0.7', a['Oeuvre.date_modification']); });
      articles.forEach(a => { urls += urlBlock(oeuvrePath(a.id_oeuvre, a.titre, 4), 'weekly', '0.7', a.date_modification); });
      professionnels.forEach(u => { urls += urlBlock(professionnelPath(u.id_user, u.prenom, u.nom), 'weekly', '0.6', u.date_modification); });

      // Organisations publiées, services visibles, personnalités : pages publiques jamais signalées avant
      const [organisations, services, personnalites] = await Promise.all([
        models.Organisation ? safeQuery('organisations', () => models.Organisation.findAll({
          where: { statut: 'valide' }, attributes: ['id_organisation', 'nom'], limit: SITEMAP_LIMIT, raw: true
        })) : [],
        models.Service ? safeQuery('services', () => models.Service.findAll({
          where: { [Op.or]: [{ statut: 'valide' }, { id_user: null }] }, attributes: ['id', 'nom'], limit: SITEMAP_LIMIT, raw: true
        })) : [],
        models.Intervenant ? safeQuery('personnalites', () => models.Intervenant.findAll({
          where: { actif: true }, attributes: ['id_intervenant', 'nom', 'prenom'], limit: SITEMAP_LIMIT, raw: true
        })) : []
      ]);
      organisations.forEach(o => { urls += urlBlock(organisationPath(o.id_organisation, o.nom), 'weekly', '0.6'); });
      services.forEach(s => { urls += urlBlock(servicePath(s.id, s.nom), 'monthly', '0.5'); });
      personnalites.forEach(p => { urls += urlBlock(personnalitePath(p.id_intervenant, p.prenom, p.nom), 'monthly', '0.5'); });

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
