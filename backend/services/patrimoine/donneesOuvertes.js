/**
 * Données ouvertes (audit V11 OUT-18, accord de la responsable : licence CC BY-SA 4.0).
 * La liste publique des lieux du patrimoine publiés : nom dans chaque langue, type, commune, wilaya,
 * coordonnées, site parent (point de visite), adresse de la fiche, date de mise à jour.
 * Ni photos, ni voix, ni textes, ni rien sur les personnes (créateur, contributeurs).
 * Deux formats : GeoJSON (cartes, OpenStreetMap, SIG) et CSV (tableur).
 */
const LICENCE = {
  nom: 'CC BY-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  attribution: 'Tala DZ (taladz.com), contributeurs de Tala DZ'
};
const LANGUES = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
const PLAFOND = 20000;

const nomDans = (nom, langue) => (nom && typeof nom === 'object' ? String(nom[langue] || '').trim() : '');
const nombre = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/** Lieux publiés, lus sur des colonnes indexées (statut), avec commune et wilaya */
async function lireLieux(models) {
  const { Lieu, Commune, Daira, Wilaya } = models;
  const lieux = await Lieu.findAll({
    where: { statut: 'publie' },
    attributes: ['id_lieu', 'nom', 'typePatrimoine', 'latitude', 'longitude', 'id_lieu_parent', 'updatedAt'],
    include: Commune ? [{
      model: Commune, attributes: ['nom', 'commune_name_ascii'], required: false,
      include: Daira ? [{
        model: Daira, attributes: ['id_daira'], required: false,
        include: Wilaya ? [{ model: Wilaya, attributes: ['codeW', 'nom', 'wilaya_name_ascii'], required: false }] : []
      }] : []
    }] : [],
    order: [['id_lieu', 'ASC']],
    limit: PLAFOND
  });
  return lieux.map((l) => {
    const d = l.get({ plain: true });
    const commune = d.Commune || {};
    const wilaya = commune.Daira?.Wilaya || {};
    return {
      id: d.id_lieu,
      noms: Object.fromEntries(LANGUES.map((lg) => [lg, nomDans(d.nom, lg)])),
      type: d.typePatrimoine || null,
      commune: commune.commune_name_ascii || commune.nom || null,
      wilaya: wilaya.wilaya_name_ascii || wilaya.nom || null,
      code_wilaya: wilaya.codeW ?? null,
      latitude: nombre(d.latitude),
      longitude: nombre(d.longitude),
      site_parent: d.id_lieu_parent || null,
      url: `https://taladz.com/patrimoine/${d.id_lieu}`,
      mis_a_jour: d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : null
    };
  });
}

/** GeoJSON : seulement les lieux qui ont des coordonnées */
function versGeoJSON(lieux) {
  return {
    type: 'FeatureCollection',
    licence: LICENCE,
    features: lieux.filter((l) => l.latitude != null && l.longitude != null).map(({ latitude, longitude, noms, ...autres }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties: { ...autres, ...Object.fromEntries(LANGUES.map((lg) => [`nom_${lg.replace('-', '_')}`, noms[lg] || null])) }
    }))
  };
}

/** Cellule CSV : guillemets doublés ; une valeur qui commence par = + - @ est neutralisée (tableurs) */
function cellule(v) {
  if (v == null) return '';
  let s = String(v);
  // Un nombre (longitude négative…) reste un nombre ; seul un TEXTE qui ressemble à une formule est neutralisé
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function versCSV(lieux) {
  const entetes = ['id', ...LANGUES.map((lg) => `nom_${lg.replace('-', '_')}`), 'type', 'commune', 'wilaya', 'code_wilaya', 'latitude', 'longitude', 'site_parent', 'url', 'mis_a_jour'];
  const lignes = lieux.map((l) => [l.id, ...LANGUES.map((lg) => l.noms[lg]), l.type, l.commune, l.wilaya, l.code_wilaya, l.latitude, l.longitude, l.site_parent, l.url, l.mis_a_jour].map(cellule).join(','));
  // BOM : les accents et l'arabe s'ouvrent correctement dans Excel
  return String.fromCharCode(0xFEFF) + [entetes.join(','), ...lignes].join('\r\n') + '\r\n';
}

module.exports = { lireLieux, versGeoJSON, versCSV, cellule, LICENCE };
