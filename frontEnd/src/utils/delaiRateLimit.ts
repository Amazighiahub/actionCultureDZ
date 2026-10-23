/**
 * Délai avant de pouvoir réessayer après une réponse 429 (trop de requêtes / compte bloqué).
 * Le serveur l'indique sous plusieurs formes : en-tête Retry-After (secondes ou date HTTP),
 * ou champ retryAfter du corps (date ISO pour la limite générale, horodatage en millisecondes
 * pour un compte bloqué). Lu comme des secondes, cet horodatage faisait attendre des années.
 */

/** Millisecondes à attendre, ou null si le délai est inconnu */
export function delaiAvantReessai(
  enTete?: string | null,
  corps?: { retryAfter?: unknown } | null,
  maintenant: number = Date.now()
): number | null {
  const depuisValeur = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : (/^\d+(\.\d+)?$/.test(String(v).trim()) ? Number(v) : NaN);
    if (Number.isFinite(n)) {
      if (n > 1e12) return n - maintenant;            // horodatage en millisecondes
      if (n > 1e9) return n * 1000 - maintenant;       // horodatage en secondes
      return n * 1000;                                 // durée en secondes
    }
    const date = Date.parse(String(v));                // date ISO ou HTTP
    return Number.isNaN(date) ? null : date - maintenant;
  };

  const delai = depuisValeur(enTete) ?? depuisValeur(corps?.retryAfter);
  return delai === null ? null : Math.max(0, delai);
}

/** Au-delà de ce délai, on ne réessaie pas automatiquement : l'utilisateur est prévenu */
export const DELAI_MAX_REESSAI_AUTO = 10_000;
