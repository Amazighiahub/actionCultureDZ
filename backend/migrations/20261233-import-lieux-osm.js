// Attention : la descente supprime les lieux créés par cet import (liste gardée dans import_lieux_osm), même s'ils
// ont été complétés depuis (photos, textes).
'use strict';

/**
 * Import en masse des lieux OpenStreetMap / Wikidata (décision de la responsable, 2026-11-19) : les lieux pré-cochés
 * de data/geoalgeria/lieux.json (sites historiques, monuments, parcs et réserves ; sans attractions), publiés
 * directement, avec leurs noms en arabe et en français (data/geoalgeria/noms.json : noms complétés et corrigés).
 * Mêmes règles que l'import de l'administration (services/patrimoine/importGeoAlgeria.js) : commune du point,
 * point de visite d'un site existant ou créé juste avant, lieu déjà présent sauté, source citée (ODbL).
 * Rejouable : un lieu déjà importé est reconnu (même endroit ou même nom). Les identifiants créés sont gardés
 * dans la table import_lieux_osm pour pouvoir annuler.
 */
const g = require('../services/patrimoine/importGeoAlgeria');

const TYPES_POINT = new Set(['archaeological_site', 'ruins', 'temple', 'library', 'city_gate', 'citywalls', 'heritage', 'building', 'theatre']);
/** Grands ensembles d'abord (Wikidata, zones dessinées), pour que leurs parties s'y rattachent */
const rang = (p) => (p.refs?.wikidata ? 0 : 1) * 10 + (String(p.refs?.osm || '').startsWith('relation') ? 0 : String(p.refs?.osm || '').startsWith('way') ? 1 : 2);

module.exports = {
  async up(queryInterface) {
    const qi = queryInterface;
    const SELECT = { type: qi.sequelize.QueryTypes.SELECT };
    // Lieux préparés, avec leurs noms complétés (mêmes données que l'outil de l'administration)
    const { lieux } = g.lieuxPrepares();

    await qi.sequelize.query(`CREATE TABLE IF NOT EXISTS import_lieux_osm (
      id_lieu INT NOT NULL PRIMARY KEY, source_id VARCHAR(64) NOT NULL, date_import DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);

    const communes = g.indexCommunes(await qi.sequelize.query(g.SQL_COMMUNES, SELECT));
    const voisins = await qi.sequelize.query(`SELECT id_lieu, nom, latitude, longitude, statut, typePatrimoine, id_lieu_parent
      FROM lieu WHERE statut <> 'archive' AND latitude IS NOT NULL`, SELECT);
    const ordres = new Map();

    const candidats = lieux.filter((p) => p.preCoche && (p.nom.fr || p.nom.ar) && !g.pasPatrimoine(p.nom))
      .sort((a, b) => (Number(TYPES_POINT.has(a.type)) - Number(TYPES_POINT.has(b.type))) || (rang(a) - rang(b)));

    let crees = 0; let points = 0; let deja = 0; let sansCommune = 0;
    await qi.sequelize.transaction(async (transaction) => {
      for (const p of candidats) {
        const commune = g.communeDuPoint(communes, p);
        if (!commune) { sansCommune++; continue; }
        const site = g.siteParent(voisins, p);
        if (g.dejaPresent(voisins, p, site)) { deja++; continue; }
        let ordre = null;
        if (site) {
          if (!ordres.has(site.id_lieu)) {
            const [m] = await qi.sequelize.query('SELECT COALESCE(MAX(ordre_visite), 0) AS m FROM lieu WHERE id_lieu_parent = :id', { ...SELECT, replacements: { id: site.id_lieu }, transaction });
            ordres.set(site.id_lieu, Number(m.m));
          }
          ordre = ordres.get(site.id_lieu) + 1;
          ordres.set(site.id_lieu, ordre);
        }
        const nom = JSON.stringify(g.nomAvecCommune(p.nom, commune));
        const [idLieu] = await qi.sequelize.query(`INSERT INTO lieu (typeLieu, typePatrimoine, communeId, nom, adresse, latitude, longitude,
            statut, id_lieu_parent, ordre_visite, createdAt, updatedAt)
          VALUES ('Commune', :type, :commune, :nom, '{}', :lat, :lng, 'publie', :parent, :ordre, NOW(), NOW())`,
        { replacements: { type: p.typePatrimoine, commune: commune.id_commune, nom, lat: p.lat, lng: p.lng, parent: site ? site.id_lieu : null, ordre }, transaction });
        await qi.sequelize.query(`INSERT INTO detail_lieux (id_lieu, description, horaires, histoire, referencesHistoriques, createdAt, updatedAt)
          VALUES (:id, '{}', '{}', '{}', :refs, NOW(), NOW())`, { replacements: { id: idLieu, refs: JSON.stringify(g.mentionSource(p)) }, transaction });
        await qi.sequelize.query('INSERT INTO import_lieux_osm (id_lieu, source_id) VALUES (:id, :source)', { replacements: { id: idLieu, source: p.id }, transaction });
        voisins.push({ id_lieu: idLieu, nom, latitude: p.lat, longitude: p.lng, statut: 'publie', typePatrimoine: p.typePatrimoine, id_lieu_parent: site ? site.id_lieu : null });
        crees++;
        if (site) points++;
      }
    });
    // Bilan dans le journal de la mise en ligne
    console.log(`[import-lieux-osm] ${crees} lieux créés (dont ${points} points de visite), ${deja} déjà présents, ${sansCommune} sans commune`);
  },

  async down(queryInterface) {
    const qi = queryInterface;
    const [table] = await qi.sequelize.query("SHOW TABLES LIKE 'import_lieux_osm'");
    if (!table.length) return;
    await qi.sequelize.transaction(async (transaction) => {
      // Points de visite d'abord, puis les sites ; leurs fiches (detail_lieux) avec eux
      for (const condition of ['l.id_lieu_parent IS NOT NULL', 'l.id_lieu_parent IS NULL']) {
        await qi.sequelize.query(`DELETE d FROM detail_lieux d JOIN import_lieux_osm i ON i.id_lieu = d.id_lieu JOIN lieu l ON l.id_lieu = i.id_lieu WHERE ${condition}`, { transaction });
        await qi.sequelize.query(`DELETE l FROM lieu l JOIN import_lieux_osm i ON i.id_lieu = l.id_lieu WHERE ${condition}`, { transaction });
      }
    });
    await qi.sequelize.query('DROP TABLE import_lieux_osm');
  }
};
