/**
 * Recherche d'adresse (OpenStreetMap Nominatim) par le serveur.
 *
 * Avant, le navigateur appelait Nominatim directement : sans identification de l'application, ses
 * appels sont maintenant refusés (« Erreur de recherche » dans les formulaires de lieu et de site).
 * Règles d'usage de Nominatim respectées ici : application identifiée (User-Agent et Referer),
 * une requête par seconde au plus pour tout le site, résultats gardés en mémoire.
 * Nominatim refuse aussi par moments (« Too many requests ») : Photon (komoot, mêmes données
 * OpenStreetMap, gratuit, sans clé) prend alors le relais, et seul pendant 10 minutes.
 */
const logger = require('../utils/logger');

const BASE = 'https://nominatim.openstreetmap.org';
const PHOTON = 'https://photon.komoot.io';
// Algérie (ouest, sud, est, nord) : Photon n'a pas de filtre par pays
const CADRE_DZ = '-8.7,18.9,12.0,37.2';
const PAUSE_NOMINATIM = 10 * 60 * 1000;
const SITE = (process.env.FRONTEND_URL || 'https://taladz.com').replace(/\/+$/, '');
const AGENT = `TalaDZ/1.0 (+${SITE})`;
const DUREE_CACHE = 24 * 60 * 60 * 1000;
const TAILLE_CACHE = 1000;
const INTERVALLE = 1100;

const cache = new Map();
let prochainEnvoi = 0;
let nominatimEnPauseJusqua = 0;

const lireCache = (cle) => {
  const e = cache.get(cle);
  if (!e) return undefined;
  if (Date.now() - e.t > DUREE_CACHE) { cache.delete(cle); return undefined; }
  return e.v;
};
const ecrireCache = (cle, v) => {
  if (cache.size >= TAILLE_CACHE) cache.delete(cache.keys().next().value);
  cache.set(cle, { v, t: Date.now() });
};

/** Une requête par seconde au plus : chaque appel réserve son créneau, puis attend son tour */
const attendreSonTour = async () => {
  const maintenant = Date.now();
  const creneau = Math.max(maintenant, prochainEnvoi);
  prochainEnvoi = creneau + INTERVALLE;
  if (creneau > maintenant) await new Promise((r) => setTimeout(r, creneau - maintenant));
};

const erreurService = () => {
  const err = new Error('La recherche d’adresse est momentanément indisponible. Réessayez dans un instant ou placez le point sur la carte.');
  err.statusCode = 503;
  return err;
};

async function lireJson(url, envoyer, attendre) {
  const enCache = lireCache(url);
  if (enCache !== undefined) return enCache;
  if (attendre) await attendreSonTour();
  let reponse;
  try {
    reponse = await envoyer(url, {
      headers: { 'User-Agent': AGENT, Referer: `${SITE}/`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
  } catch (e) {
    logger.warn(`Géocodage indisponible : ${e.message}`);
    throw erreurService();
  }
  if (!reponse.ok) {
    logger.warn(`Géocodage refusé : ${reponse.status}`);
    throw erreurService();
  }
  const donnees = await reponse.json();
  ecrireCache(url, donnees);
  return donnees;
}

/** Résultat Photon (GeoJSON) mis au format Nominatim attendu par les formulaires */
const depuisPhoton = (f) => {
  const p = f?.properties || {};
  const [lon, lat] = f?.geometry?.coordinates || [];
  if (p.countrycode && p.countrycode !== 'DZ') return null;
  // Le résultat peut être la ville ou la wilaya elle-même (type city, state…) : son nom en tient lieu
  const ville = p.city || (['city', 'town', 'village', 'locality', 'district'].includes(p.type) ? p.name : undefined) || p.locality || p.district;
  const wilaya = p.state || (p.type === 'state' ? p.name : undefined);
  const daira = p.county || (p.type === 'county' ? p.name : undefined);
  const morceaux = [p.name, p.street && p.housenumber ? `${p.housenumber} ${p.street}` : p.street, ville, daira, wilaya, p.country]
    .filter((m, i, l) => m && l.indexOf(m) === i);
  return {
    lat: String(lat), lon: String(lon), display_name: morceaux.join(', '),
    address: { road: p.street, city: ville, county: daira, state: wilaya, postcode: p.postcode, country: p.country }
  };
};

/** Nominatim, puis Photon s'il refuse ; Nominatim est laissé de côté 10 minutes après un refus */
async function appeler(chemin, params, photon, { envoyer = fetch } = {}) {
  if (Date.now() >= nominatimEnPauseJusqua) {
    try {
      return { source: 'nominatim', donnees: await lireJson(`${BASE}/${chemin}?${new URLSearchParams(params)}`, envoyer, true) };
    } catch (e) {
      nominatimEnPauseJusqua = Date.now() + PAUSE_NOMINATIM;
    }
  }
  return { source: 'photon', donnees: await lireJson(`${PHOTON}/${photon.chemin}?${new URLSearchParams(photon.params)}`, envoyer, false) };
}

/** Résultats utiles au formulaire seulement (pas de licence, identifiants OSM…) */
const resume = (r) => r && ({
  lat: r.lat,
  lon: r.lon,
  display_name: r.display_name,
  address: r.address || undefined
});

const langueValide = (l) => (['fr', 'ar', 'en'].includes(l) ? l : 'fr');

async function rechercher(texte, { langue = 'fr', limite = 5, envoyer } = {}) {
  const q = String(texte || '').trim().slice(0, 200);
  if (q.length < 3) return [];
  const nombre = String(Math.min(Math.max(Number(limite) || 5, 1), 10));
  const { source, donnees } = await appeler('search', {
    q, format: 'json', addressdetails: '1', limit: nombre, countrycodes: 'dz', 'accept-language': langueValide(langue)
  }, { chemin: 'api/', params: { q, limit: nombre, lang: langue === 'en' ? 'en' : 'fr', bbox: CADRE_DZ } }, { envoyer });
  if (source === 'photon') return (donnees?.features || []).map(depuisPhoton).filter(Boolean);
  return Array.isArray(donnees) ? donnees.map(resume) : [];
}

async function inverser(lat, lon, { langue = 'fr', envoyer } = {}) {
  const la = Number(lat); const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  // Arrondi à environ 10 m : même adresse, cache plus utile
  const { source, donnees } = await appeler('reverse', {
    lat: la.toFixed(4), lon: lo.toFixed(4), format: 'json', addressdetails: '1', 'accept-language': langueValide(langue)
  }, { chemin: 'reverse', params: { lat: la.toFixed(4), lon: lo.toFixed(4), lang: langue === 'en' ? 'en' : 'fr' } }, { envoyer });
  if (source === 'photon') return depuisPhoton(donnees?.features?.[0]) || null;
  return donnees && !donnees.error ? resume(donnees) : null;
}

const _viderCache = () => { cache.clear(); prochainEnvoi = 0; nominatimEnPauseJusqua = 0; };

module.exports = { rechercher, inverser, AGENT, _viderCache };
