/** Types de patrimoine, alignés sur le serveur (lieu.typePatrimoine) */
export const TYPES_PATRIMOINE = [
  'monument', 'musee', 'ville_village', 'site_archeologique',
  'site_naturel', 'edifice_religieux', 'palais_forteresse', 'autre'
] as const;

/** Un type de patrimoine (seule déclaration du site, audit V11 COD-9) */
export type TypePatrimoine = typeof TYPES_PATRIMOINE[number];
