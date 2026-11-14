/**
 * Encadré fermé « pour de bon » sur cet appareil (bouton « Plus tard ») : souvenir gardé dans le
 * navigateur, par compte. En navigation privée, le stockage peut manquer : l'encadré est alors fermé
 * pour la visite seulement.
 */
export function estFerme(cle: string): boolean {
  try { return localStorage.getItem(cle) === '1'; } catch { return false; }
}

export function fermer(cle: string): void {
  try { localStorage.setItem(cle, '1'); } catch { /* navigation privée : fermé pour cette visite */ }
}
