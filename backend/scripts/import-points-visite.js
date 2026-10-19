#!/usr/bin/env node
/**
 * import-points-visite.js — Importe les points de visite d'un site depuis un classeur Excel
 *
 * Classeur attendu (feuille 1, ligne 1 = en-têtes) :
 *   A ID · B Nom du point · C Catégorie · D Description · E Latitude · F Longitude
 *   G Source · H Remarque · … · N Type Taladz (monument, site_archeologique, musee…)
 *
 * Relançable : chaque point est retrouvé parmi ceux du site par ses coordonnées GPS.
 *   - point absent  → créé (ordre de visite = ID du relevé)
 *   - point présent → nom, type, description, source et statut mis à jour ;
 *                     l'ordre de visite choisi sur le site est conservé
 * Un point sans nom est importé en brouillon (« Point 12 – à identifier ») : invisible
 * du public, il est publié dès qu'on lui donne un nom dans le classeur et qu'on relance.
 * Une cellule vide ne remplace jamais une valeur déjà en base.
 *
 * --nom-site "Timgad" : corrige aussi le nom français du site (les autres langues sont gardées).
 *
 * Usage :
 *   node scripts/import-points-visite.js --parent 4 --fichier Timgad_points.xlsx            # aperçu
 *   node scripts/import-points-visite.js --parent 4 --fichier Timgad_points.xlsx --execute  # import
 *   node scripts/import-points-visite.js --parent 4 --fichier Timgad_points.xlsx --nom-site "Timgad" --execute
 */

require('dotenv').config();
const path = require('path');
const ExcelJS = require('exceljs');
const db = require('../models');
const container = require('../services/serviceContainer');

const arg = (nom) => {
  const i = process.argv.indexOf(nom);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const EXECUTE = process.argv.includes('--execute');
const PARENT_ID = parseInt(arg('--parent'), 10);
const FICHIER = arg('--fichier');
const NOM_SITE = (arg('--nom-site') || '').trim();
const TYPES = ['monument', 'musee', 'ville_village', 'site_archeologique', 'site_naturel', 'edifice_religieux', 'palais_forteresse', 'autre'];
// Précision du relevé (6 décimales ≈ 10 cm) : les points 18 et 19 de Timgad,
// à 1 m l'un de l'autre, restent deux points distincts
const TOLERANCE = 0.0000005;

/** Valeur lisible d'une cellule exceljs (texte riche, lien, formule) */
const texte = (cell) => {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(r => r.text).join('').trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
};

async function lireClasseur(fichier) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(fichier);
  const ws = wb.worksheets[0];
  const lignes = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const id = parseInt(texte(row.getCell(1)), 10);
    const latitude = parseFloat(texte(row.getCell(5)));
    const longitude = parseFloat(texte(row.getCell(6)));
    if (!Number.isInteger(id) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    lignes.push({
      id, latitude, longitude,
      nom: texte(row.getCell(2)),
      description: texte(row.getCell(4)),
      source: texte(row.getCell(7)),
      type: texte(row.getCell(14))
    });
  });
  // Noms en double dans le classeur (plusieurs points sur le forum…) : le n° du relevé les distingue
  const compte = {};
  for (const l of lignes) if (l.nom) compte[l.nom] = (compte[l.nom] || 0) + 1;
  for (const l of lignes) {
    if (!l.nom) l.nomFinal = `Point ${l.id} – à identifier`;
    else l.nomFinal = compte[l.nom] > 1 ? `${l.nom} (point ${l.id})` : l.nom;
    l.statut = l.nom ? 'publie' : 'brouillon';
    l.typeFinal = TYPES.includes(l.type) ? l.type : 'site_archeologique';
  }
  return lignes;
}

async function main() {
  if (!Number.isInteger(PARENT_ID) || !FICHIER) {
    console.error('Usage : node scripts/import-points-visite.js --parent <id du site> --fichier <classeur.xlsx> [--execute]');
    process.exit(1);
  }
  container.initialize(db);
  const svc = container.patrimoineService;
  const { Lieu, DetailLieu } = db;

  const site = await Lieu.findByPk(PARENT_ID);
  if (!site) {
    console.error(`Site ${PARENT_ID} introuvable`);
    process.exit(1);
  }
  if (NOM_SITE && site.nom?.fr !== NOM_SITE) {
    console.log(`Nom du site : « ${site.nom?.fr || ''} » → « ${NOM_SITE} »`);
    if (EXECUTE) await site.update({ nom: { ...(site.nom || {}), fr: NOM_SITE } });
  }
  const lignes = await lireClasseur(path.resolve(FICHIER));
  const existants = await Lieu.findAll({ where: { id_lieu_parent: PARENT_ID } });
  // Un point en base ne correspond qu'à une seule ligne du classeur
  const utilises = new Set();
  const retrouver = (l) => {
    const e = existants.find(x => !utilises.has(x.id_lieu)
      && Math.abs(Number(x.latitude) - l.latitude) < TOLERANCE && Math.abs(Number(x.longitude) - l.longitude) < TOLERANCE);
    if (e) utilises.add(e.id_lieu);
    return e;
  };

  console.log(`Site : ${site.nom?.fr || site.nom?.ar} (${PARENT_ID}) — ${lignes.length} lignes, ${existants.length} points déjà en base`);
  console.log(EXECUTE ? 'Mode : IMPORT' : 'Mode : aperçu (ajouter --execute pour importer)');

  const bilan = { crees: 0, maj: 0, inchanges: 0, erreurs: 0 };
  for (const l of lignes) {
    const point = retrouver(l);
    const etiquette = `#${String(l.id).padStart(2)} ${l.nomFinal} [${l.statut}]`;
    try {
      if (!point) {
        console.log(`  + créer      ${etiquette}`);
        if (EXECUTE) {
          const cree = await svc.create({
            nom: { fr: l.nomFinal },
            id_lieu_parent: PARENT_ID,
            latitude: l.latitude,
            longitude: l.longitude,
            typePatrimoine: l.typeFinal,
            ordre_visite: l.id,
            description: l.description ? { fr: l.description } : {},
            referencesHistoriques: l.source ? { fr: l.source } : {},
            id_createur: site.id_createur || null,
            statut: l.statut
          }, { isModerator: true });
          const nouveau = await Lieu.findByPk(cree.id_lieu);
          existants.push(nouveau);
          utilises.add(nouveau.id_lieu);
        }
        bilan.crees++;
        continue;
      }

      // Point déjà importé : ne compléter / remplacer qu'avec des cellules remplies
      const majLieu = {};
      if (l.nom && point.nom?.fr !== l.nomFinal) majLieu.nom = { ...(point.nom || {}), fr: l.nomFinal };
      if (l.type && point.typePatrimoine !== l.typeFinal) majLieu.typePatrimoine = l.typeFinal;
      if (l.nom && point.statut === 'brouillon') majLieu.statut = 'publie';
      const detail = await DetailLieu.findOne({ where: { id_lieu: point.id_lieu } });
      const majDetail = {};
      if (l.description && detail?.description?.fr !== l.description) majDetail.description = { ...(detail?.description || {}), fr: l.description };
      if (l.source && detail?.referencesHistoriques?.fr !== l.source) majDetail.referencesHistoriques = { ...(detail?.referencesHistoriques || {}), fr: l.source };

      if (!Object.keys(majLieu).length && !Object.keys(majDetail).length) {
        bilan.inchanges++;
        continue;
      }
      console.log(`  ~ mettre à jour ${etiquette} (${[...Object.keys(majLieu), ...Object.keys(majDetail)].join(', ')})`);
      if (EXECUTE) {
        await db.sequelize.transaction(async (transaction) => {
          if (Object.keys(majLieu).length) await point.update(majLieu, { transaction });
          if (Object.keys(majDetail).length) {
            if (detail) await detail.update(majDetail, { transaction });
            else await DetailLieu.create({ id_lieu: point.id_lieu, ...majDetail }, { transaction });
          }
        });
      }
      bilan.maj++;
    } catch (error) {
      bilan.erreurs++;
      console.error(`  ! erreur    ${etiquette} : ${error.message}`);
    }
  }

  console.log(`Bilan : ${bilan.crees} à créer, ${bilan.maj} à mettre à jour, ${bilan.inchanges} inchangés, ${bilan.erreurs} erreurs${EXECUTE ? '' : ' (aperçu, rien n\'a été écrit)'}`);
  await db.sequelize.close();
  process.exit(bilan.erreurs ? 1 : 0);
}

main().catch((error) => {
  console.error('Échec :', error.message);
  process.exit(1);
});
