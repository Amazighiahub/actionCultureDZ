/**
 * GeoUtils - Utilitaires géographiques réutilisables
 */

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const KM_PER_DEG_LAT = 111;

/**
 * Calcule la distance en km entre deux points GPS (formule de Haversine)
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcule une bounding box autour d'un point GPS pour un rayon donné
 * @returns {{ deltaLat: number, deltaLng: number, minLat: number, maxLat: number, minLng: number, maxLng: number }}
 */
function boundingBox(lat, lng, rayonKm) {
  const deltaLat = rayonKm / KM_PER_DEG_LAT;
  const deltaLng = rayonKm / (KM_PER_DEG_LAT * Math.cos(lat * DEG_TO_RAD));
  return {
    deltaLat,
    deltaLng,
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLng: lng - deltaLng,
    maxLng: lng + deltaLng
  };
}

/**
 * Rayon de recherche en km selon le mode de transport
 */
function rayonParTransport(transport) {
  if (transport === 'marche') return 5;
  if (transport === 'velo') return 15;
  return 50;
}

/**
 * Vitesse moyenne en km/h selon le mode de transport
 */
function vitesseParTransport(transport) {
  if (transport === 'marche') return 4;
  if (transport === 'velo') return 15;
  return 40;
}

/**
 * Valide une latitude [-90, 90]
 */
function isValidLatitude(lat) {
  const n = parseFloat(lat);
  return !isNaN(n) && n >= -90 && n <= 90;
}

/**
 * Valide une longitude [-180, 180]
 */
function isValidLongitude(lng) {
  const n = parseFloat(lng);
  return !isNaN(n) && n >= -180 && n <= 180;
}

module.exports = {
  haversineKm,
  boundingBox,
  rayonParTransport,
  vitesseParTransport,
  isValidLatitude,
  isValidLongitude
};
