#!/usr/bin/env node
/**
 * Prépare data/geoalgeria/lieux.json : sites historiques, parcs et attractions de GeoAlgeria
 * (@geoalgeria/tourisme), rattachés à la commune la plus proche (paquet geoalgeria), pour l'import de
 * l'administration (Admin → Patrimoine → « Importer des lieux »). Demande de la responsable, 2026-11-17.
 *
 * Usage (paquets npm décompressés à part, jamais exécutés) :
 *   node scripts/geoalgeria/preparerLieux.js <dossier tourisme/package> <dossier geoalgeria/package>
 *
 * Données : OpenStreetMap (ODbL 1.0, © contributeurs OpenStreetMap) et Wikidata (CC0), selon le point ;
 * communes : compilation MIT (positions des centres en partie ODbL). Voir data/geoalgeria/LISEZMOI.md.
 */
const fs = require('fs');
const path = require('path');

const [dossierTourisme, dossierCommunes] = process.argv.slice(2);
if (!dossierTourisme || !dossierCommunes) {
  console.error('Usage : node scripts/geoalgeria/preparerLieux.js <tourisme/package> <geoalgeria/package>');
  process.exit(1);
}
const lire = (dossier, fichier) => JSON.parse(fs.readFileSync(path.join(dossier, 'data', fichier), 'utf8'));

// Type OSM → type de patrimoine du site (constants/patrimoineTypes.js)
const TYPE_PATRIMOINE = {
  archaeological_site: 'site_archeologique', ruins: 'site_archeologique', battlefield: 'site_archeologique', wreck: 'site_archeologique',
  castle: 'palais_forteresse', fort: 'palais_forteresse', citywalls: 'palais_forteresse', palace: 'palais_forteresse', manor: 'palais_forteresse',
  mosque: 'edifice_religieux', church_building: 'edifice_religieux', tomb: 'edifice_religieux',
  museum: 'musee',
  cave: 'site_naturel', waterfall: 'site_naturel', viewpoint: 'site_naturel',
  national_park: 'site_naturel', nature_reserve: 'site_naturel', protected_area: 'site_naturel',
  theme_park: 'autre', zoo: 'autre', attraction: 'autre', artwork: 'monument'
};
// Pré-cochés : les vrais lieux ; décochés : types souvent faux (manèges, quartiers, bornes…)
const ATTRACTIONS_COCHEES = new Set(['museum', 'cave', 'waterfall', 'zoo', 'tourist_attraction']);
const HISTORIQUES_DECOCHES = new Set(['boundary_stone', 'water_tap', 'aircraft', 'school', 'district', 'building', 'wreck']);

const ARABE = /[؀-ۿ]/;
/** « Aïn El Fouara; عين الفوارة » → { fr: 'Aïn El Fouara', ar: 'عين الفوارة' } */
function nomMultilingue(e) {
  if (e.name_fr || e.name_ar) return { ...(e.name_fr ? { fr: e.name_fr.trim() } : {}), ...(e.name_ar ? { ar: e.name_ar.trim() } : {}) };
  const nom = {};
  const entier = String(e.name || '').trim();
  // Coupé seulement en deux morceaux d'écritures différentes (« Aïn El Fouara; عين الفوارة ») :
  // « pk 178/49 » ou « Masjid Al Aqsa / The State of Palestine » restent entiers
  const morceaux = entier.split(/\s*[;/]\s*/).map((m) => m.trim()).filter(Boolean);
  if (morceaux.length === 2 && ARABE.test(morceaux[0]) !== ARABE.test(morceaux[1])) {
    for (const m of morceaux) nom[ARABE.test(m) ? 'ar' : 'fr'] = m;
    return nom;
  }
  // Sinon le nom entier, dans la langue de son début (« Musée … المتحف … » reste en français)
  if (entier) nom[ARABE.test(entier[0]) ? 'ar' : 'fr'] = entier;
  return nom;
}
/** Nom qui n'est qu'un code (« HBNEP3 », « pk 178/49 », « 12 - Caroussel Jet 4 ») ou trop court */
const estUnCode = (texte) => !texte || texte.trim().length < 3 || /^(pk\s|p_)/i.test(texte) || /^[A-Z0-9 _./-]{2,10}$/.test(texte.trim()) || /^\d+\s*-\s/.test(texte);

const distance = (a, b, c, d) => {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  const y = (c - a) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

const communes = ['communes_w1_w23.json', 'communes_w24_w48.json', 'communes_w49_w69.json'].flatMap((f) => lire(dossierCommunes, f))
  .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
const parWilaya = new Map();
for (const c of communes) {
  const w = Number(c.wilaya_code);
  if (!parWilaya.has(w)) parWilaya.set(w, []);
  parWilaya.get(w).push(c);
}
/** Commune la plus proche, d'abord dans la wilaya du point ; ancienne wilaya (découpage à 48) tirée du code de commune */
function communeProche(lat, lng, wilaya) {
  const candidats = parWilaya.get(Number(wilaya)) || communes;
  let meilleure = null;
  let d = Infinity;
  for (const c of candidats) {
    const km = distance(lat, lng, c.latitude, c.longitude);
    if (km < d) { d = km; meilleure = c; }
  }
  return meilleure && {
    fr: meilleure.name_fr, ar: meilleure.name_ar,
    wilaya69: Number(meilleure.wilaya_code),
    wilaya48: meilleure.code_commune ? Math.floor(Number(meilleure.code_commune) / 100) : null,
    km: Math.round(d * 10) / 10
  };
}

const CATEGORIES = [['historic.json', 'historique'], ['parks.json', 'parc'], ['attractions.json', 'attraction']];
const lieux = [];
for (const [fichier, categorie] of CATEGORIES) {
  for (const e of lire(dossierTourisme, fichier)) {
    const type = e.type || e.category || '';
    const nom = nomMultilingue(e);
    const texte = nom.fr || nom.ar || '';
    let preCoche = categorie === 'parc'
      || (categorie === 'historique' && !HISTORIQUES_DECOCHES.has(type))
      || (categorie === 'attraction' && ATTRACTIONS_COCHEES.has(type));
    if (estUnCode(texte)) preCoche = false;
    lieux.push({
      id: e.id, categorie, type, nom,
      lat: e.lat, lng: e.lng, precision: e.geo_precision,
      source: e.source, refs: e.refs || {},
      typePatrimoine: TYPE_PATRIMOINE[type] || 'monument',
      preCoche,
      commune: communeProche(e.lat, e.lng, e.wilaya_code)
    });
  }
}

const sortie = path.join(__dirname, '..', '..', 'data', 'geoalgeria', 'lieux.json');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
const version = JSON.parse(fs.readFileSync(path.join(dossierTourisme, 'package.json'), 'utf8')).version;
fs.writeFileSync(sortie, JSON.stringify({ source: `@geoalgeria/tourisme ${version}`, prepare_le: new Date().toISOString().slice(0, 10), lieux }));
const n = (f) => lieux.filter(f).length;
console.log(`${lieux.length} lieux, ${n((l) => l.preCoche)} pré-cochés, sans commune : ${n((l) => !l.commune)}, commune à plus de 30 km : ${n((l) => l.commune && l.commune.km > 30)}`);
