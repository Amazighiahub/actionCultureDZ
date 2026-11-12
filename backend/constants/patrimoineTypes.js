const { SUPPORTED_LANGUAGES } = require('./langues');

/**
 * Types de patrimoine d'un lieu (colonne lieu.typePatrimoine) — source unique pour le modèle,
 * les routes et l'import. L'ordre suit l'ENUM en base : le changer créerait une différence de schéma.
 * Toute modification exige une migration de l'ENUM.
 */
const TYPES_PATRIMOINE = Object.freeze([
  'ville_village',       // Contient monuments, vestiges, musées → parcours intelligent
  'monument',            // Mosquée, Palais, Fort, etc. → programmes, services
  'musee',               // Collections, expositions → programmes, billetterie
  'site_archeologique',  // Ruines, vestiges → programmes, visites guidées
  'site_naturel',        // Parcs, réserves → randonnées, parcours
  'edifice_religieux',   // Mosquées, zaouïas, églises
  'palais_forteresse',   // Palais, forts, citadelles
  'autre'
]);

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
const LANGUES_AUDIO = SUPPORTED_LANGUAGES;

/** Profondeur maximale de l'arbre des lieux : site › point › sous-point › détail */
const MAX_NIVEAUX_LIEU = 4;

module.exports = { TYPES_PATRIMOINE, MONUMENT_TYPES, VESTIGE_TYPES, LANGUES_AUDIO, MAX_NIVEAUX_LIEU };
