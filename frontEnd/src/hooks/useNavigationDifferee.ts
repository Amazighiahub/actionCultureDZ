/**
 * Redirection après un court délai (le temps de lire « Enregistré ! »), annulée si la personne
 * quitte la page avant : sinon elle était ramenée de force à l'ancienne destination.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useNavigationDifferee() {
  const navigate = useNavigate();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  }, []);

  return useCallback((chemin: string, delaiMs = 2000) => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => navigate(chemin), delaiMs);
  }, [navigate]);
}
