/**
 * Types de monuments et de vestiges — source unique pour les modèles, les routes et le service.
 * Toute modification exige une migration qui élargit l'ENUM en base
 * (voir migrations/20261018-add-lieu-points-visite.js).
 */
const MONUMENT_TYPES = [
  'Mosquée', 'Palais', 'Casbah', 'Ksar', 'Fort', 'Mausolée', 'Zaouia',
  'Hammam', 'Fontaine', 'Statue', 'Tour', 'Minaret', 'Musée', 'Rempart',
  'Borj', 'Pont', 'Théâtre', 'Église', 'Marché',
  'Grenier collectif', 'Ancienne maison', 'Autre'
];

const VESTIGE_TYPES = [
  'Ruines', 'Murailles', 'Vestiges numides', 'Tombeau numide', 'Inscriptions berbères',
  'Gravures rupestres', 'Site archéologique', 'Dolmen', 'Théâtre antique',
  'Thermes romains', 'Mosaïque', 'Aqueduc', 'Tombe', 'Autre'
];

/** Langues possibles d'un enregistrement audio */
const LANGUES_AUDIO = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];

/** Profondeur maximale de l'arbre des lieux : site › point › sous-point › détail */
const MAX_NIVEAUX_LIEU = 4;

module.exports = { MONUMENT_TYPES, VESTIGE_TYPES, LANGUES_AUDIO, MAX_NIVEAUX_LIEU };
