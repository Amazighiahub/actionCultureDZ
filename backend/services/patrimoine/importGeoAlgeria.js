/**
 * Import de lieux GeoAlgeria (sites historiques, parcs, attractions) par l'administration, wilaya par
 * wilaya (demande de la responsable, 2026-11-17). Données préparées par scripts/geoalgeria/preparerLieux.js
 * dans data/geoalgeria/lieux.json (OpenStreetMap ODbL 1.0 © contributeurs OpenStreetMap, Wikidata CC0).
 *
 * 1. aperçu : les points d'une wilaya, leur commune sur Tala DZ, ceux déjà présents (à moins de 100 m) ;
 * 2. import : les points cochés deviennent des sites en BROUILLON (invisibles), par la création habituelle
 *    (patrimoineService.create : mêmes contrôles de doublon) ;
 * 3. publication : l'équipe relit les brouillons puis les publie ou les écarte (archive).
 */
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sansAccent } = require('../../utils/texte');

const FICHIER = path.join(__dirname, '..', '..', 'data', 'geoalgeria', 'lieux.json');
const MAX_IMPORT = 500;
const TOLERANCE = 0.001; // ~100 m, comme la création d'un site

let donnees = null;
/** Lieux préparés (lus une fois) */
function lieuxPrepares() {
  if (!donnees) donnees = JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  return donnees;
}

const cle = (t) => sansAccent(t).replace(/[^a-z0-9؀-ۿ]/g, '');

/** Distance d'édition (petits noms de communes) */
function distanceEdition(a, b) {
  const ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let precedent = ligne[0];
    ligne[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const sauve = ligne[j];
      ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, precedent + (a[i - 1] === b[j - 1] ? 0 : 1));
      precedent = sauve;
    }
  }
  return ligne[b.length];
}

let communesCache = null;
/** Communes de Tala DZ, avec le code de leur wilaya (découpage à 58), indexées par nom sans accents */
async function communesDuSite(models) {
  if (communesCache) return communesCache;
  const lignes = await models.sequelize.query(`SELECT c.id_commune, c.commune_name_ascii AS ascii, c.nom, w.codeW
      FROM communes c JOIN dairas d ON d.id_daira = c.dairaId JOIN wilayas w ON w.id_wilaya = d.wilayaId`,
  { type: models.sequelize.QueryTypes.SELECT });
  const index = new Map();
  const ajouter = (k, c) => { if (k) index.set(k, [...(index.get(k) || []), c]); };
  for (const c of lignes) {
    c.codeW = Number(c.codeW);
    c.cle = cle(c.ascii);
    ajouter(c.cle, c);
    const ar = typeof c.nom === 'string' ? c.nom : (c.nom?.ar || '');
    ajouter(cle(ar), c);
  }
  communesCache = { lignes, index };
  return communesCache;
}

/**
 * Commune de Tala DZ d'un point : même nom (français, sinon arabe) ; plusieurs homonymes → celle de la bonne
 * wilaya (ancien code à 48, ou nouveau code s'il existe sur le site) ; sinon le nom le plus proche dans la wilaya.
 */
function communeDuPoint(communes, point) {
  const c = point.commune;
  if (!c) return null;
  const wilayas = [c.wilaya48, c.wilaya69].filter((w) => Number.isInteger(w));
  const choisir = (liste) => (liste.length === 1 ? liste[0] : (liste.find((x) => wilayas.includes(x.codeW)) || null));
  for (const nom of [c.fr, c.ar]) {
    const trouves = communes.index.get(cle(nom)) || [];
    const choix = trouves.length && choisir(trouves);
    if (choix) return choix;
  }
  // Orthographe voisine (« Béni Fedhala El Hakania » / « Beni Foudhala El Hakania »), dans la même wilaya
  const k = cle(c.fr);
  let meilleure = null;
  let score = Infinity;
  for (const x of communes.lignes) {
    if (!wilayas.includes(x.codeW)) continue;
    const d = distanceEdition(k, x.cle);
    if (d < score) { score = d; meilleure = x; }
  }
  return meilleure && score <= Math.max(2, Math.floor(k.length / 4)) ? meilleure : null;
}

/** Wilayas du site, avec le nombre de points GeoAlgeria rattachés (pour le choix de la wilaya) */
async function wilayas(models) {
  const communes = await communesDuSite(models);
  const compte = new Map();
  for (const p of lieuxPrepares().lieux) {
    const c = communeDuPoint(communes, p);
    if (c) compte.set(c.codeW, (compte.get(c.codeW) || 0) + 1);
  }
  const liste = await models.Wilaya.findAll({ attributes: ['id_wilaya', 'codeW', 'nom', 'wilaya_name_ascii'], order: [['codeW', 'ASC']], raw: true });
  return liste.map((w) => ({ ...w, points: compte.get(Number(w.codeW)) || 0 }));
}

/** Points d'une wilaya (code à 58), avec leur commune et le lieu déjà présent au même endroit */
async function apercu(models, codeW) {
  const code = Number(codeW);
  if (!Number.isInteger(code) || code < 1) throw Object.assign(new Error('Wilaya invalide'), { statusCode: 400 });
  const communes = await communesDuSite(models);
  const points = [];
  for (const p of lieuxPrepares().lieux) {
    const c = communeDuPoint(communes, p);
    if (c && c.codeW === code) points.push({ p, c });
  }
  if (!points.length) return { source: lieuxPrepares().source, points: [] };
  // Lieux existants autour des points (une requête, colonnes indexées)
  const lats = points.map(({ p }) => p.lat);
  const lngs = points.map(({ p }) => p.lng);
  const existants = await models.Lieu.findAll({
    where: {
      latitude: { [Op.between]: [Math.min(...lats) - TOLERANCE, Math.max(...lats) + TOLERANCE] },
      longitude: { [Op.between]: [Math.min(...lngs) - TOLERANCE, Math.max(...lngs) + TOLERANCE] },
      statut: { [Op.ne]: 'archive' }
    },
    attributes: ['id_lieu', 'nom', 'latitude', 'longitude', 'statut'], raw: true
  });
  return {
    source: lieuxPrepares().source,
    points: points.map(({ p, c }) => {
      const proche = existants.find((l) => Math.abs(Number(l.latitude) - p.lat) <= TOLERANCE && Math.abs(Number(l.longitude) - p.lng) <= TOLERANCE);
      return {
        id: p.id, categorie: p.categorie, type: p.type, nom: p.nom, lat: p.lat, lng: p.lng,
        precision: p.precision, source: p.source, typePatrimoine: p.typePatrimoine,
        preCoche: p.preCoche && !proche,
        commune: { id_commune: c.id_commune, nom: c.ascii },
        deja: proche ? { id_lieu: proche.id_lieu, nom: proche.nom, statut: proche.statut } : null
      };
    })
  };
}

/** Source citée sur la fiche (obligation de la licence ODbL pour OpenStreetMap) */
function mentionSource(p) {
  if (p.source === 'osm') {
    return { fr: 'Position et nom : © contributeurs OpenStreetMap (openstreetmap.org/copyright), via GeoAlgeria.', ar: 'الموقع والاسم: © مساهمو OpenStreetMap، عبر GeoAlgeria.' };
  }
  if (p.source === 'wikidata') return { fr: 'Position et nom : Wikidata, via GeoAlgeria.', ar: 'الموقع والاسم: ويكي بيانات، عبر GeoAlgeria.' };
  return { fr: 'Position et nom : GeoAlgeria.', ar: 'الموقع والاسم: GeoAlgeria.' };
}

/** Importe les points choisis en brouillon ; un point déjà présent (même endroit ou même nom dans la commune) est sauté */
async function importer(models, patrimoineService, ids, idAdmin) {
  if (!Array.isArray(ids) || !ids.length) throw Object.assign(new Error('Choisissez au moins un lieu'), { statusCode: 400 });
  if (ids.length > MAX_IMPORT) throw Object.assign(new Error(`${MAX_IMPORT} lieux au plus par import`), { statusCode: 400 });
  const communes = await communesDuSite(models);
  const parId = new Map(lieuxPrepares().lieux.map((p) => [p.id, p]));
  const bilan = { crees: 0, deja: 0, ignores: 0, ids: [] };
  for (const id of new Set(ids.map(String))) {
    const p = parId.get(id);
    const c = p && communeDuPoint(communes, p);
    if (!p || !c || (!p.nom.fr && !p.nom.ar)) { bilan.ignores++; continue; }
    try {
      const site = await patrimoineService.create({
        nom: p.nom, latitude: p.lat, longitude: p.lng, typePatrimoine: p.typePatrimoine,
        communeId: c.id_commune, id_createur: idAdmin, referencesHistoriques: mentionSource(p)
      }, { isModerator: true, enAttente: true });
      bilan.crees++;
      bilan.ids.push(site.id_lieu);
    } catch (e) {
      if (e.statusCode === 409) bilan.deja++;
      else throw e;
    }
  }
  return bilan;
}

/**
 * Brouillons à relire : sites principaux en brouillon, sans proposition de membre en attente (celles-là
 * passent par l'écran des propositions). Les plus récents d'abord, 300 au plus.
 */
async function brouillons(models) {
  return models.sequelize.query(`SELECT l.id_lieu, l.nom, l.latitude, l.longitude, l.typePatrimoine, c.commune_name_ascii AS commune,
        w.codeW, w.wilaya_name_ascii AS wilaya
      FROM lieu l
      JOIN communes c ON c.id_commune = l.communeId
      JOIN dairas d ON d.id_daira = c.dairaId
      JOIN wilayas w ON w.id_wilaya = d.wilayaId
      WHERE l.statut = 'brouillon' AND l.id_lieu_parent IS NULL
        AND NOT EXISTS (SELECT 1 FROM proposition_lieu p WHERE p.id_lieu = l.id_lieu AND p.statut = 'en_attente')
      ORDER BY l.id_lieu DESC LIMIT 300`, { type: models.sequelize.QueryTypes.SELECT });
}

/** Publier ou écarter (archive) des brouillons relus */
async function decider(models, ids, decision) {
  if (!Array.isArray(ids) || !ids.length) throw Object.assign(new Error('Choisissez au moins un lieu'), { statusCode: 400 });
  if (!['publier', 'ecarter'].includes(decision)) throw Object.assign(new Error('Décision invalide'), { statusCode: 400 });
  const liste = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_IMPORT);
  const [n] = await models.Lieu.update({ statut: decision === 'publier' ? 'publie' : 'archive' },
    { where: { id_lieu: liste, statut: 'brouillon', id_lieu_parent: null } });
  return { modifies: n };
}

/** Pour les tests : relire le fichier et les communes */
function _vider() { donnees = null; communesCache = null; }

module.exports = { wilayas, apercu, importer, brouillons, decider, communeDuPoint, distanceEdition, mentionSource, _vider };
