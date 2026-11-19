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
// Points de visite : une partie d'un site déjà sur Tala DZ (forum, arc, thermes de Timgad…), demande du 2026-11-17
const TYPES_POINT = new Set(['archaeological_site', 'ruins', 'temple', 'library', 'city_gate', 'citywalls', 'heritage', 'building', 'theatre']);
const TYPES_SITE_PARENT = ['site_archeologique', 'palais_forteresse'];
const RAYON_SITE_KM = 1.5;
const TOLERANCE_POINT_KM = 0.03; // points d'un même site très proches : 30 m, ou même nom

const km = (a, b, c, d) => {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  const y = (c - a) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};

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
/** Communes de Tala DZ, avec le code de leur wilaya, indexées par nom sans accents (découpage à 69 wilayas, migration 20261232) */
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

/** Points d'une wilaya (code de la base, 1 à 69), avec leur commune et le lieu déjà présent au même endroit */
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
  const voisins = await lieuxVoisins(models, points.map(({ p }) => p));
  return {
    source: lieuxPrepares().source,
    points: points.map(({ p, c }) => {
      const site = siteParent(voisins, p);
      const proche = dejaPresent(voisins, p, site);
      return {
        id: p.id, categorie: p.categorie, type: p.type, nom: p.nom, lat: p.lat, lng: p.lng,
        precision: p.precision, source: p.source, typePatrimoine: p.typePatrimoine,
        preCoche: p.preCoche && !proche,
        commune: { id_commune: c.id_commune, nom: c.ascii },
        site: site ? { id_lieu: site.id_lieu, nom: site.nom } : null,
        deja: proche ? { id_lieu: proche.id_lieu, nom: proche.nom, statut: proche.statut } : null
      };
    })
  };
}

/** Lieux du site autour des points (une requête, colonnes indexées), sites et points de visite */
async function lieuxVoisins(models, points) {
  const marge = RAYON_SITE_KM / 100; // ~1,5 km en degrés, large
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return models.Lieu.findAll({
    where: {
      latitude: { [Op.between]: [Math.min(...lats) - marge, Math.max(...lats) + marge] },
      longitude: { [Op.between]: [Math.min(...lngs) - marge, Math.max(...lngs) + marge] },
      statut: { [Op.ne]: 'archive' }
    },
    attributes: ['id_lieu', 'nom', 'latitude', 'longitude', 'statut', 'typePatrimoine', 'id_lieu_parent'], raw: true
  });
}

const nomsDe = (nom) => {
  let objet = nom || {};
  if (typeof nom === 'string') {
    try { objet = JSON.parse(nom); } catch { objet = { fr: nom }; }
  }
  return Object.values(objet).filter((v) => typeof v === 'string' && v.trim()).map(cle);
};
const memeNom = (a, b) => { const x = nomsDe(a); return nomsDe(b).some((n) => n && x.includes(n)); };
/**
 * Même lieu nommé autrement : le nom du point contient celui du site (« Ruines romaines de Timgad » pour
 * Timgad), ou l'inverse (« Medracen » pour « Imedghassen (Medracen), mausolée royal numide »)
 */
const contientNom = (site, point) => {
  const s = nomsDe(site).filter((n) => n.length >= 4);
  return nomsDe(point).filter((n) => n.length >= 4).some((n) => s.some((x) => n.includes(x) || x.includes(n)));
};

/** Le point désigne un site déjà présent tout proche (« Ruines romaines de Timgad » = Timgad) */
function estUnSiteExistant(voisins, p) {
  return voisins.find((l) => !l.id_lieu_parent && contientNom(l.nom, p.nom)
    && km(p.lat, p.lng, Number(l.latitude), Number(l.longitude)) < RAYON_SITE_KM) || null;
}

/** Site déjà sur Tala DZ dont ce point est une partie (le plus proche, à moins de 1,5 km) */
function siteParent(voisins, p) {
  if (p.categorie !== 'historique' || !TYPES_POINT.has(p.type)) return null;
  let meilleur = null;
  let d = Infinity;
  for (const l of voisins) {
    if (l.id_lieu_parent || !TYPES_SITE_PARENT.includes(l.typePatrimoine)) continue;
    const e = km(p.lat, p.lng, Number(l.latitude), Number(l.longitude));
    // Le site lui-même (« Timgad », « Ruines romaines de Timgad ») n'est pas un de ses points
    if (e < RAYON_SITE_KM && e < d && !contientNom(l.nom, p.nom)) { d = e; meilleur = l; }
  }
  return meilleur;
}

/** Lieu déjà présent : pour un point de visite, même nom ou à 30 m parmi les points du site ; sinon à 100 m */
function dejaPresent(voisins, p, site) {
  const lui = estUnSiteExistant(voisins, p);
  if (lui) return lui;
  if (site) {
    return voisins.find((l) => l.id_lieu_parent === site.id_lieu
      && (memeNom(l.nom, p.nom) || km(p.lat, p.lng, Number(l.latitude), Number(l.longitude)) <= TOLERANCE_POINT_KM)) || null;
  }
  return voisins.find((l) => Math.abs(Number(l.latitude) - p.lat) <= TOLERANCE && Math.abs(Number(l.longitude) - p.lng) <= TOLERANCE) || null;
}

/** Source citée sur la fiche (obligation de la licence ODbL pour OpenStreetMap) */
function mentionSource(p) {
  if (p.source === 'osm') {
    return { fr: 'Position et nom : © contributeurs OpenStreetMap (openstreetmap.org/copyright), via GeoAlgeria.', ar: 'الموقع والاسم: © مساهمو OpenStreetMap، عبر GeoAlgeria.' };
  }
  if (p.source === 'wikidata') return { fr: 'Position et nom : Wikidata, via GeoAlgeria.', ar: 'الموقع والاسم: ويكي بيانات، عبر GeoAlgeria.' };
  return { fr: 'Position et nom : GeoAlgeria.', ar: 'الموقع والاسم: GeoAlgeria.' };
}

/**
 * Importe les points choisis en brouillon ; un point déjà présent (même endroit ou même nom) est sauté.
 * `commePoints` : ids à rattacher comme points de visite du site voisin (recalculé ici, jamais celui du client).
 */
async function importer(models, patrimoineService, ids, idAdmin, { commePoints = [] } = {}) {
  if (!Array.isArray(ids) || !ids.length) throw Object.assign(new Error('Choisissez au moins un lieu'), { statusCode: 400 });
  if (ids.length > MAX_IMPORT) throw Object.assign(new Error(`${MAX_IMPORT} lieux au plus par import`), { statusCode: 400 });
  const communes = await communesDuSite(models);
  const parId = new Map(lieuxPrepares().lieux.map((p) => [p.id, p]));
  const enPoints = new Set((Array.isArray(commePoints) ? commePoints : []).map(String));
  const uniques = [...new Set(ids.map(String))];
  const choisis = uniques.map((id) => parId.get(id)).filter(Boolean);
  const voisins = choisis.length ? await lieuxVoisins(models, choisis) : [];
  const bilan = { crees: 0, points: 0, deja: 0, ignores: uniques.length - choisis.length, ids: [] };
  for (const p of choisis) {
    const c = communeDuPoint(communes, p);
    if (!c || (!p.nom.fr && !p.nom.ar)) { bilan.ignores++; continue; }
    const parent = enPoints.has(p.id) ? siteParent(voisins, p) : null;
    if ((parent || estUnSiteExistant(voisins, p)) && dejaPresent(voisins, p, parent)) { bilan.deja++; continue; }
    try {
      const site = await patrimoineService.create({
        nom: p.nom, latitude: p.lat, longitude: p.lng, typePatrimoine: p.typePatrimoine,
        communeId: c.id_commune, id_createur: idAdmin, referencesHistoriques: mentionSource(p),
        ...(parent ? { id_lieu_parent: parent.id_lieu } : {})
      }, { isModerator: true, enAttente: true });
      bilan.crees++;
      if (parent) bilan.points++;
      bilan.ids.push(site.id_lieu);
    } catch (e) {
      if (e.statusCode === 409) bilan.deja++;
      else throw e;
    }
  }
  return bilan;
}

/**
 * Brouillons à relire : sites et points de visite en brouillon, sans proposition de membre en attente (celles-là
 * passent par l'écran des propositions). Les plus récents d'abord, 300 au plus.
 */
async function brouillons(models) {
  return models.sequelize.query(`SELECT l.id_lieu, l.nom, l.latitude, l.longitude, l.typePatrimoine, c.commune_name_ascii AS commune,
        w.codeW, w.wilaya_name_ascii AS wilaya, l.id_lieu_parent, parent.nom AS site
      FROM lieu l
      JOIN communes c ON c.id_commune = l.communeId
      JOIN dairas d ON d.id_daira = c.dairaId
      JOIN wilayas w ON w.id_wilaya = d.wilayaId
      LEFT JOIN lieu parent ON parent.id_lieu = l.id_lieu_parent
      WHERE l.statut = 'brouillon'
        AND NOT EXISTS (SELECT 1 FROM proposition_lieu p WHERE p.id_lieu IN (l.id_lieu, COALESCE(l.id_lieu_parent, 0)) AND p.statut = 'en_attente')
      ORDER BY l.id_lieu DESC LIMIT 300`, { type: models.sequelize.QueryTypes.SELECT });
}

/** Publier ou écarter (archive) des brouillons relus */
async function decider(models, ids, decision) {
  if (!Array.isArray(ids) || !ids.length) throw Object.assign(new Error('Choisissez au moins un lieu'), { statusCode: 400 });
  if (!['publier', 'ecarter'].includes(decision)) throw Object.assign(new Error('Décision invalide'), { statusCode: 400 });
  const liste = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_IMPORT);
  const [n] = await models.Lieu.update({ statut: decision === 'publier' ? 'publie' : 'archive' },
    { where: { id_lieu: liste, statut: 'brouillon' } });
  return { modifies: n };
}

/** Pour les tests : relire le fichier et les communes */
function _vider() { donnees = null; communesCache = null; }

module.exports = { wilayas, apercu, importer, brouillons, decider, communeDuPoint, distanceEdition, mentionSource, siteParent, dejaPresent, _vider };
