/**
 * Enrichir un lieu (textes, monuments, personnalités, photos) : équipe ou professionnel validé.
 * Les autres membres écrivent à l'équipe Tala DZ (bouton « Proposer une information »).
 */
import { usePermissions } from '@/hooks/usePermissions';

export function usePeutEnrichirLieu(): boolean {
  const { isAdmin, isValidatedProfessional, hasRole } = usePermissions();
  return !!isAdmin || hasRole('Moderateur') || hasRole('Modérateur') || isValidatedProfessional();
}

/** Page Contact, sujet déjà rempli avec le nom du lieu */
export const lienPropositionLieu = (nomLieu: string) =>
  `/a-propos?sujet=${encodeURIComponent(`Proposition pour le lieu : ${nomLieu}`.slice(0, 200))}#contact`;
