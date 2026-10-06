/**
 * Validation des URL venant de l'utilisateur ou de l'URL courante.
 */

/**
 * Chemin interne sûr pour une redirection (ex. ?redirect= après connexion).
 * Refuse tout ce qui pourrait sortir du site : "//evil.com", "/\evil.com",
 * caractères de contrôle (un "/\t/evil.com" devient "//evil.com" pour le navigateur),
 * autre origine, et les pages d'authentification (boucle).
 * @returns le chemin normalisé (pathname + search + hash) ou null
 */
export function getSafeRedirectPath(target: unknown): string | null {
  if (typeof target !== 'string' || !target.startsWith('/')) return null;
  // eslint-disable-next-line no-control-regex
  if (target.startsWith('//') || /[\\\u0000-\u001F\u007F]/.test(target)) return null;
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === '/auth' || url.pathname.startsWith('/auth/')) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/**
 * Lien externe sûr pour un href / window.open : uniquement http(s).
 * Bloque javascript:, data:, vbscript:… (React 18 ne les bloque pas, il avertit seulement).
 * Une adresse sans protocole ("exemple.dz") est complétée en https.
 * @returns l'URL normalisée ou undefined
 */
export function safeExternalUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  let value = raw.trim();
  if (!value) return undefined;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = 'https://' + value.replace(/^\/+/, '');
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
