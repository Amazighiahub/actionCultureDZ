/**
 * Description automatique d'un lieu sans texte (2026-11-19, référencement) : sur ~1 000 fiches importées, 98 %
 * n'avaient ni description ni photo ; toutes partageaient la même description, vue comme du contenu faible par les
 * moteurs de recherche. Phrase faite des faits connus : type, commune, wilaya, points de visite, site parent.
 * Même phrase que le site (frontEnd/src/utils/descriptionLieu.ts), en français pour les pages des robots.
 */
const TYPE_PHRASE_FR = Object.freeze({
  ville_village: 'Ville ou village historique',
  monument: 'Monument',
  musee: 'Musée',
  site_archeologique: 'Site archéologique',
  site_naturel: 'Site naturel',
  edifice_religieux: 'Édifice religieux',
  palais_forteresse: 'Palais ou forteresse',
  autre: 'Lieu de patrimoine'
});

/** « de Batna », « d’Oran » */
const de = (nom) => (/^[aeiouyàâéèêîôûh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);

/**
 * @param {{ type?: string, commune?: string, wilaya?: string, nbPoints?: number, parent?: string }} f
 * @returns {string}
 */
function descriptionAutoLieu({ type, commune, wilaya, nbPoints = 0, parent } = {}) {
  const lieu = [commune ? `à ${commune}` : '', wilaya && wilaya !== commune ? `wilaya ${de(wilaya)}` : ''].filter(Boolean).join(', ');
  const phrases = [`${TYPE_PHRASE_FR[type] || TYPE_PHRASE_FR.autre}${lieu ? ` ${lieu}` : ''}, en Algérie.`];
  if (parent) phrases.push(`Point de visite de « ${parent} ».`);
  if (nbPoints > 0) phrases.push(nbPoints === 1 ? '1 point de visite.' : `${nbPoints} points de visite.`);
  phrases.push('Position sur la carte, itinéraire, photos et histoire sur Tala DZ.');
  return phrases.join(' ');
}

module.exports = { descriptionAutoLieu, TYPE_PHRASE_FR, de };
