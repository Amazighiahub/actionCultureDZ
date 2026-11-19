/**
 * Nettoyage des lieux importés (OpenStreetMap / Wikidata), 2026-11-19, après l'audit des 1 034 lieux en ligne :
 * - noms : majuscule initiale, « Memorial » → « Mémorial », « martyres » → « martyrs », fautes fréquentes ;
 * - types : une mosquée, une zaouïa, un minaret sont des édifices religieux (pas des monuments ni des forteresses) ;
 * - doublons : un même lieu créé deux fois (Ketchaoua, Parc national d'El Kala, Ksar el Kaoua…).
 * Fonctions pures, utilisées par l'import de l'administration et par la migration de nettoyage.
 */
const { estGenerique, motsSimples, km } = require('./importGeoAlgeria');

/** Corrections du nom français (le nom arabe n'est pas touché) */
function nomNettoye(nom) {
  const fr = typeof nom?.fr === 'string' ? nom.fr.trim() : '';
  if (!fr) return nom;
  const propre = fr
    .replace(/\bMemorial\b/g, 'Mémorial').replace(/\bmemorial\b/g, 'mémorial')
    .replace(/\b(des|aux) martyres\b/gi, (_, art) => `${art} martyrs`)
    .replace(/^Mosqué\s/, 'Mosquée ').replace(/^Puis\s/, 'Puits ')
    .replace(/\s{2,}/g, ' ')
    // Majuscule initiale (« le vieux marché », « château fort »)
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  return propre === fr ? nom : { ...nom, fr: propre };
}

// Édifices religieux reconnus à leur nom (début du nom) ; des ruines restent un site archéologique
const RELIGIEUX = /^(grande )?(mosquee|zaouia|zaouiet|djamaa|djama|eldjama|el jamaa|ldjamaa|jamaa|minaret|mihrab|masjid|eglise|basilique|cathedrale|chapelle|synagogue)\b/;
const VESTIGES = /^(ruines?|vestiges?|site|le site)\b/;

// Types clairement faux pour un édifice religieux ; un site archéologique (ruines d'une basilique) reste tel quel
const TYPES_A_CORRIGER = new Set(['monument', 'palais_forteresse']);

/** Type corrigé d'après le nom, ou le type actuel */
function typeCorrige(nom, type) {
  const simple = motsSimples(nom?.fr || '');
  if (TYPES_A_CORRIGER.has(type) && RELIGIEUX.test(simple) && !VESTIGES.test(simple)) return 'edifice_religieux';
  return type;
}

const DISTANCE_POINTS_KM = 0.3; // deux points de visite du même nom à moins de 300 m : le même
const DISTANCE_SITES_KM = 15; // deux sites du même nom (non générique) à moins de 15 km : le même (parcs, ksour mal placés)

const nomCompare = (fr) => motsSimples(fr).replace(/^(la|le|les|l) /, '');

/**
 * Doublons parmi des lieux publiés. Chaque lieu : { id_lieu, fr, lat, lng, parent, importe, commune, nbEnfants }.
 * Un lieu importé est retiré au profit de l'autre (celui d'avant l'import, sinon le plus riche, sinon le plus ancien).
 * Deux sites au nom générique (« Tombe solaire de Djanet » ×11) ne sont jamais fusionnés : ce sont des lieux
 * différents. Deux points de visite à moins de 300 m (« Muraille byzantine » de Tébessa) le sont, même génériques.
 * @returns {Array<{ retire: number, garde: number }>}
 */
function doublons(lieux) {
  const resultat = [];
  const retires = new Set();
  const prefere = (a, b) => (Number(!a.importe) - Number(!b.importe)) || ((a.nbEnfants || 0) - (b.nbEnfants || 0)) || (b.id_lieu - a.id_lieu);
  const tries = [...lieux].filter((l) => l.fr).map((l) => ({ ...l, cle: nomCompare(l.fr), generique: estGenerique(l.fr, l.commune) }));
  for (let i = 0; i < tries.length; i++) {
    for (let j = i + 1; j < tries.length; j++) {
      const a = tries[i];
      const b = tries[j];
      if (retires.has(a.id_lieu) || retires.has(b.id_lieu) || a.cle !== b.cle || a.cle.length < 4) continue;
      if (!a.importe && !b.importe) continue; // lieux saisis à la main : jamais touchés
      const points = !!a.parent && !!b.parent;
      const sites = !a.parent && !b.parent;
      if (!points && !sites) continue;
      if (sites && (a.generique || b.generique)) continue;
      if (km(a.lat, a.lng, b.lat, b.lng) > (points ? DISTANCE_POINTS_KM : DISTANCE_SITES_KM)) continue;
      const [garde, retire] = prefere(a, b) >= 0 ? [a, b] : [b, a];
      if (!retire.importe) continue;
      retires.add(retire.id_lieu);
      resultat.push({ retire: retire.id_lieu, garde: garde.id_lieu });
    }
  }
  return resultat;
}

module.exports = { nomNettoye, typeCorrige, doublons, DISTANCE_POINTS_KM, DISTANCE_SITES_KM };
