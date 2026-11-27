/**
 * Section Tamazight (2026-11-20) : règles communes au site (le serveur a les mêmes, backend/constants/tamazight.js).
 * Langues de la base : 1 = tamazight en lettres latines, 2 = tamazight en tifinagh.
 */
export const LANGUES_TAMAZIGHT = [1, 2] as const;
export const LANGUES_SITE_TAMAZIGHT = ['tz-ltn', 'tz-tfng'] as const;
export const VARIANTES = ['kabyle', 'chaoui', 'mozabite', 'chenoui', 'touareg', 'zenete', 'ouargli', 'autre'] as const;
export type Variante = typeof VARIANTES[number];

/** Libellés français par défaut (traduits par tamazight.variantes.*) */
export const LIBELLE_VARIANTE: Record<Variante, string> = {
  kabyle: 'Kabyle (taqbaylit)', chaoui: 'Chaoui (tacawit)', mozabite: 'Mozabite (tumẓabt)', chenoui: 'Chenoui (tacenwit)',
  touareg: 'Touareg (tamahaq)', zenete: 'Zénète du Gourara (taznatit)', ouargli: 'Ouargli (tagergrent)', autre: 'Autre parler',
};

export const LICENCE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr';
/** Page de la licence dans la langue du site (2026-11-27 : toujours en français) */
export const licenceUrl = (langue?: string) =>
  `https://creativecommons.org/licenses/by-sa/4.0/deed.${String(langue || '').startsWith('ar') ? 'ar' : String(langue || '').startsWith('en') ? 'en' : 'fr'}`;

export interface ChampsTamazight {
  variante_amazighe?: Variante | '' | null;
  ecrit_par_humain?: boolean | null;
  partage_ouvert?: boolean;
}

/** Œuvre en tamazight d'après sa langue (base) */
export const estTamazight = (idLangue?: number | null) => (LANGUES_TAMAZIGHT as readonly number[]).includes(Number(idLangue));
/** Article écrit en tamazight d'après la langue de son texte (codes du site) */
export const texteEnTamazight = (langue?: string | null) => (LANGUES_SITE_TAMAZIGHT as readonly string[]).includes(String(langue));

/** Champs à envoyer au serveur (seulement ceux qui ont une valeur) ; le partage exige un texte écrit par une personne */
export function champsTamazightEnvoi(f: ChampsTamazight): ChampsTamazight {
  const sortie: ChampsTamazight = {};
  if (f.variante_amazighe !== undefined) sortie.variante_amazighe = f.variante_amazighe || null;
  if (f.ecrit_par_humain !== undefined && f.ecrit_par_humain !== null) sortie.ecrit_par_humain = !!f.ecrit_par_humain;
  if (f.partage_ouvert !== undefined) sortie.partage_ouvert = !!f.partage_ouvert && f.ecrit_par_humain === true;
  return sortie;
}

/** Champs d'une œuvre chargée pour modification */
export function lireChampsTamazight(oeuvre: Record<string, unknown>): ChampsTamazight {
  return {
    variante_amazighe: (VARIANTES as readonly string[]).includes(String(oeuvre.variante_amazighe)) ? oeuvre.variante_amazighe as Variante : '',
    ecrit_par_humain: oeuvre.ecrit_par_humain === true || oeuvre.ecrit_par_humain === 1 ? true : oeuvre.ecrit_par_humain === false || oeuvre.ecrit_par_humain === 0 ? false : null,
    partage_ouvert: oeuvre.partage_ouvert === true || oeuvre.partage_ouvert === 1,
  };
}
