/**
 * Après une mise en ligne, un onglet resté ouvert demande des fichiers de l'ancienne version, qui
 * n'existent plus : la page tombait sur l'écran d'erreur. On recharge une fois (au plus une fois
 * par minute, pour ne jamais boucler) afin de prendre la nouvelle version.
 */
const CLE = 'rechargement-nouvelle-version';

/** Erreur de chargement d'un morceau de page (fichier d'une ancienne version) */
export const estErreurDeVersion = (erreur: unknown): boolean =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(String((erreur as { message?: string })?.message ?? erreur ?? ''));

/** true si la page va être rechargée */
export function rechargerPourNouvelleVersion(): boolean {
  try {
    const dernier = Number(sessionStorage.getItem(CLE) || 0);
    if (Date.now() - dernier < 60 * 1000) return false;
    sessionStorage.setItem(CLE, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
