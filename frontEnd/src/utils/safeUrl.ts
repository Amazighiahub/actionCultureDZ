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

// Hôtes autorisés dans les blocs vidéo / embed (aligné sur backend utils/sanitizeArticle.js)
const ALLOWED_EMBED_HOSTS = [
  'youtube.com', 'youtube-nocookie.com', 'player.vimeo.com', 'vimeo.com',
  'dailymotion.com', 'w.soundcloud.com', 'soundcloud.com'
];

/**
 * URL d'iframe autorisée pour un bloc vidéo / embed : https et hôte exact (ou sous-domaine)
 * de la liste, ou vidéo Cloudinary. Accepte une URL ou un code <iframe> (analysé dans un
 * document inerte : aucun script ni gestionnaire d'événement n'est exécuté).
 * @returns l'URL de l'iframe ou undefined
 */
export function getAllowedEmbedUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  let src = raw.trim();
  if (src.startsWith('<')) {
    const doc = new DOMParser().parseFromString(src, 'text/html');
    src = doc.querySelector('iframe')?.getAttribute('src') || '';
  }
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return undefined;
    const host = url.hostname.toLowerCase();
    const allowed = host === 'res.cloudinary.com'
      || ALLOWED_EMBED_HOSTS.some(d => host === d || host.endsWith('.' + d));
    return allowed ? url.href : undefined;
  } catch {
    return undefined;
  }
}
