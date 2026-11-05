/**
 * Liste d'administration : filtres et page sont envoyés au serveur. Filtrer seulement ce qui était
 * déjà chargé (20 ou 100 lignes) cachait tout le reste et faussait les compteurs.
 * Le premier affichage est chargé par useDashboardAdmin ; ici, seulement les changements.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const TAILLE_PAGE_ADMIN = 20;

type Filtres = Record<string, string | undefined>;

export function useListeServeur(filtres: Filtres, charger: ((p: { page: number; limit: number; [cle: string]: string | number | undefined }) => unknown) | undefined, totalPages = 1) {
  const cle = JSON.stringify(filtres);
  const [etat, setEtat] = useState({ cle, page: 1 });
  // Un autre filtre repart de la première page
  const page = etat.cle === cle ? etat.page : 1;
  const setPage = useCallback((p: number) => setEtat({ cle, page: p }), [cle]);

  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    charger?.({ ...filtres, page, limit: TAILLE_PAGE_ADMIN });
    // filtres est décrit par cle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, page]);

  // Dernier élément de la dernière page supprimé : revenir à une page qui existe
  useEffect(() => {
    if (totalPages >= 1 && page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  return { page, setPage };
}

/** Recherche : à partir de 2 caractères, comme le serveur */
export const termeRecherche = (texte: string): string | undefined => {
  const t = texte.trim();
  return t.length >= 2 ? t : undefined;
};

/** Valeur d'un filtre, ou rien pour « tous » */
export const filtreChoisi = (valeur: string): string | undefined => (valeur && valeur !== 'tous' ? valeur : undefined);
