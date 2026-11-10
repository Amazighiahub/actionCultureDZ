import { useEffect, useRef } from 'react';
/**
 * Message à montrer quand le serveur refuse un formulaire.
 *
 * Le serveur renvoie souvent un message général (« Données invalides ») et, champ par champ, la
 * vraie raison (« Capacité invalide », « Message requis (10-2000 caractères) »…). Avant, les
 * formulaires montraient un texte fixe (« Erreur lors de la création ») : la personne devait deviner.
 */
type DetailChamp = { field?: string; message?: string };

/** Erreurs champ par champ renvoyées par le serveur (liste vide s'il n'y en a pas) */
export function detailsDesChamps(source: unknown): DetailChamp[] {
  const details = (source as { details?: unknown } | null)?.details;
  return Array.isArray(details)
    ? details.filter((d): d is DetailChamp => !!d && typeof (d as DetailChamp).message === 'string')
    : [];
}

/** Texte technique sans intérêt pour la personne (page HTML, message d'Axios ou du serveur). Une seule
 *  liste, reprise par services/httpClient.ts pour ne jamais afficher ces textes. */
export const TECHNIQUE = /^\s*<|Request failed with status code|Network Error|timeout of \d+ms|Internal server error|Request timeout|CSRF token|ECONN|ETIMEDOUT/i;

export function messageErreurServeur(source: unknown, defaut: string): string {
  const champs = [...new Set(detailsDesChamps(source).map((d) => String(d.message)))];
  if (champs.length) return champs.slice(0, 3).join(' · ');
  const s = source as { error?: unknown; message?: unknown } | null;
  const base = typeof s?.error === 'string' ? s.error : typeof s?.message === 'string' ? s.message : '';
  return base && !TECHNIQUE.test(base) ? base : defaut;
}

/** Résultat d'un envoi (inscription, commentaire…) : le message d'échec est montré là où la personne a appuyé */
export interface ResultatEnvoi {
  ok: boolean;
  erreur?: string;
}

/**
 * Échec d'un envoi, avec la bonne phrase selon la cause :
 * - pas de réponse (réseau coupé) : la demande n'est pas partie, on peut réessayer ;
 * - délai dépassé : elle est peut-être arrivée (réessayer tout de suite risquerait un doublon) ;
 * - refus du serveur : sa raison précise (détail des champs compris).
 */
export function echecEnvoi(
  err: unknown,
  messages: { defaut: string; nonParti: string; reponseTarde?: string },
): ResultatEnvoi {
  const e = err as { code?: string; status?: number } | null;
  if (!e?.status && e?.code === 'ERR_NETWORK') return { ok: false, erreur: messages.nonParti };
  if (!e?.status && e?.code === 'ECONNABORTED') return { ok: false, erreur: messages.reponseTarde || messages.nonParti };
  return { ok: false, erreur: messageErreurServeur(err, messages.defaut) };
}

/**
 * Fait défiler la page jusqu'au message d'erreur quand il apparaît (sur téléphone, le message en haut
 * d'un long formulaire restait hors de vue : rien ne semblait se passer après « Envoyer »).
 */
export function useDefilerVersErreur<T extends HTMLElement = HTMLDivElement>(erreur: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (erreur) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [erreur]);
  return ref;
}
