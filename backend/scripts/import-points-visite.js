#!/usr/bin/env node
/**
 * import-points-visite.js — Importe les points de visite d'un site depuis un classeur Excel
 *
 * Classeur : feuille « Points » (sinon la première), ligne 1 = en-têtes, lus par leur titre :
 *   ID · Nom du point · Nom en arabe · Nom en tamazight · Type (ou Type Taladz) · Description
 *   · Latitude · Longitude · Repère (point intérieur) · Source
 * Accepte le modèle « Modele_points_GPS_Taladz.xlsx » comme l'ancien relevé de Timgad.
 * Une ligne dont l'ID n'est pas un nombre (ex. la ligne « Exemple ») est ignorée.
 * Point intérieur (salle d'un musée…) : latitude et longitude vides + repère ; il prend la
 * position du site et il est retrouvé par son nom lors d'une relance.
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

const sansAccent = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Colonnes reconnues par leur titre (variantes acceptées, sans accent ni casse)
const COLONNES = {
  id: ['id', 'n°', 'no', 'numero'],
  nom: ['nom du point', 'nom du point (francais)', 'nom (francais)', 'nom'],
  nomAr: ['nom en arabe', 'nom (arabe)'],
  nomTz: ['nom en tamazight', 'nom (tamazight)'],
  type: ['type taladz', 'type'],
  description: ['description'],
  latitude: ['latitude'],
  longitude: ['longitude'],
  repere: ['repere (point interieur)', 'repere'],
  source: ['source']
};

// Libellés du modèle → types Taladz (les valeurs Taladz brutes sont aussi acceptées)
const TYPES_LIBELLES = {
  'monument': 'monument', 'site archeologique': 'site_archeologique', 'musee': 'musee',
  'edifice religieux': 'edifice_religieux', 'palais / forteresse': 'palais_forteresse', 'palais/forteresse': 'palais_forteresse',
  'site naturel': 'site_naturel', 'ville / village': 'ville_village', 'ville/village': 'ville_village', 'autre': 'autre'
};
const typeTaladz = (t) => {
  const v = sansAccent(t || '');
  if (TYPES.includes(v)) return v;
  return TYPES_LIBELLES[v] || null;
};

async function lireClasseur(fichier) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(fichier);
  const ws = wb.getWorksheet('Points') || wb.worksheets[0];

  // Position de chaque colonne d'après la ligne d'en-têtes
  const pos = {};
  ws.getRow(1).eachCell((cell, col) => {
    const titre = sansAccent(texte(cell));
    for (const [cle, variantes] of Object.entries(COLONNES)) {
      if (pos[cle] === undefined && variantes.includes(titre)) pos[cle] = col;
    }
  });
  for (const requis of ['id', 'latitude', 'longitude']) {
    if (pos[requis] === undefined) throw new Error(`Colonne « ${COLONNES[requis][0]} » introuvable dans la feuille « ${ws.name} »`);
  }
  const lire = (row, cle) => (pos[cle] ? texte(row.getCell(pos[cle])) : '');

  const lignes = [];
  const ignorees = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const id = parseInt(lire(row, 'id'), 10);
    if (!Number.isInteger(id)) return;                       // ligne « Exemple », vide…
    const lat = lire(row, 'latitude').replace(',', '.');
    const lon = lire(row, 'longitude').replace(',', '.');
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const repere = lire(row, 'repere');
    const nom = lire(row, 'nom'); const nomAr = lire(row, 'nomAr'); const nomTz = lire(row, 'nomTz');
    const interieur = !lat && !lon && !!repere;
    if (!interieur && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
      // Ligne de modèle encore vide : rien à signaler ; sinon on dit pourquoi elle est ignorée
      if (nom || nomAr || lat || lon) ignorees.push(`#${id} ${nom || nomAr} : position GPS manquante ou illisible`);
      return;
    }
    lignes.push({
      id, interieur, repere,
      latitude: interieur ? null : latitude,
      longitude: interieur ? null : longitude,
      nom, nomAr, nomTz,
      description: lire(row, 'description'),
      source: lire(row, 'source'),
      type: lire(row, 'type')
    });
  });

  // Noms en double dans le classeur (plusieurs points sur le forum…) : le n° du relevé les distingue
  const cleNom = (l) => l.nom || l.nomAr;
  const compte = {};
  for (const l of lignes) if (cleNom(l)) compte[cleNom(l)] = (compte[cleNom(l)] || 0) + 1;
  for (const l of lignes) {
    const suffixe = compte[cleNom(l)] > 1 ? ` (point ${l.id})` : '';
    l.nomObjet = {};
    if (l.nom) l.nomObjet.fr = l.nom + suffixe;
    if (l.nomAr) l.nomObjet.ar = l.nomAr + suffixe;
    if (l.nomTz) l.nomObjet['tz-ltn'] = l.nomTz;
    if (!l.nom && !l.nomAr) l.nomObjet.fr = `Point ${l.id} – à identifier`;
    l.nomFinal = l.nomObjet.fr || l.nomObjet.ar;
    l.statut = (l.nom || l.nomAr) ? 'publie' : 'brouillon';
    l.typeFinal = typeTaladz(l.type) || 'site_archeologique';
  }
  return { lignes, ignorees };
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
  const { lignes, ignorees } = await lireClasseur(path.resolve(FICHIER));
  for (const raison of ignorees) console.log(`  ? ignorée    ${raison}`);
  const existants = await Lieu.findAll({ where: { id_lieu_parent: PARENT_ID } });
  // Un point en base ne correspond qu'à une seule ligne du classeur
  const utilises = new Set();
  const retrouver = (l) => {
    // Point intérieur : même position que le site pour tous, on le retrouve par son nom
    const e = l.interieur
      ? existants.find(x => !utilises.has(x.id_lieu) && ((x.nom?.fr && x.nom.fr === l.nomObjet.fr) || (x.nom?.ar && x.nom.ar === l.nomObjet.ar)))
      : existants.find(x => !utilises.has(x.id_lieu)
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
            nom: l.nomObjet,
            id_lieu_parent: PARENT_ID,
            // Point intérieur : sans coordonnées, le service reprend celles du site
            latitude: l.interieur ? undefined : l.latitude,
            longitude: l.interieur ? undefined : l.longitude,
            repere: l.repere ? { fr: l.repere } : undefined,
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
      // Noms : chaque langue remplie dans le classeur remplace la valeur en base, les autres sont gardées
      const nomFusionne = { ...(point.nom || {}), ...(l.nom || l.nomAr ? l.nomObjet : {}) };
      if (JSON.stringify(nomFusionne) !== JSON.stringify(point.nom || {})) majLieu.nom = nomFusionne;
      if (l.repere && point.repere?.fr !== l.repere) majLieu.repere = { ...(point.repere || {}), fr: l.repere };
      if (l.type && point.typePatrimoine !== l.typeFinal) majLieu.typePatrimoine = l.typeFinal;
      if ((l.nom || l.nomAr) && point.statut === 'brouillon') majLieu.statut = 'publie';
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
