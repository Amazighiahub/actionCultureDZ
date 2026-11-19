/**
 * Une couleur par type de patrimoine (carte d'exploration, légende, liste), 2026-11-19.
 * Couleurs foncées : lisibles sur le fond de carte clair, et assez distinctes entre elles.
 */
export const COULEUR_TYPE: Readonly<Record<string, string>> = Object.freeze({
  site_archeologique: '#c2410c', // ocre
  palais_forteresse: '#7c2d12',  // brun : ksour, forts, casbahs
  edifice_religieux: '#15803d',  // vert : mosquées, zaouïas, mausolées
  monument: '#1d4ed8',           // bleu
  musee: '#7e22ce',              // violet
  site_naturel: '#0f766e',       // vert d'eau : parcs, réserves
  ville_village: '#be185d',      // rose foncé
  autre: '#4b5563'               // gris
});

/** Couleur d'un type (gris pour un type inconnu) */
export const couleurType = (type: string | null | undefined): string => COULEUR_TYPE[type || ''] || COULEUR_TYPE.autre;
