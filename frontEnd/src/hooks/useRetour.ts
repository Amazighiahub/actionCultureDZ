/**
 * Bouton « Retour » sûr (2026-11-27, analyse V12) : revient à la page précédente du site s'il y en a une,
 * sinon ouvre la rubrique donnée. Avant, navigate(-1) faisait quitter Tala DZ à la personne arrivée par
 * Google ou par un lien WhatsApp (ou ne faisait rien).
 * React Router note la position dans l'historique du site (history.state.idx) : 0 = première page ouverte.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function aPagePrecedenteSurLeSite(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

export function useRetour(repli: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    if (aPagePrecedenteSurLeSite()) navigate(-1);
    else navigate(repli);
  }, [navigate, repli]);
}
