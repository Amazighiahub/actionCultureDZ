/**
 * Listes d'administration (filtres et page envoyés au serveur) et données d'un article modifié.
 */
import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListeServeur, termeRecherche, filtreChoisi, TAILLE_PAGE_ADMIN } from '@/hooks/useListeServeur';
import { detailsArticle, liensArticle, nomDuTag } from '@/utils/donneesArticle';

describe('useListeServeur', () => {
  const rendre = (charger: (p: Record<string, unknown>) => unknown, totalPages = 5) => renderHook(
    ({ filtres, total }) => useListeServeur(filtres, charger, total),
    { initialProps: { filtres: { q: undefined as string | undefined }, total: totalPages } }
  );

  test('premier affichage : pas de second chargement', () => {
    const charger = vi.fn();
    rendre(charger);
    expect(charger).not.toHaveBeenCalled();
  });

  test('changer de page : demandée au serveur, avec les filtres', () => {
    const charger = vi.fn();
    const { result, rerender } = rendre(charger);
    rerender({ filtres: { q: 'tapis' }, total: 5 });
    act(() => result.current.setPage(3));
    expect(charger).toHaveBeenLastCalledWith({ q: 'tapis', page: 3, limit: TAILLE_PAGE_ADMIN });
  });

  test('changer de filtre : retour à la première page', () => {
    const charger = vi.fn();
    const { result, rerender } = rendre(charger);
    act(() => result.current.setPage(4));
    rerender({ filtres: { q: 'tapis' }, total: 5 });
    expect(result.current.page).toBe(1);
    expect(charger).toHaveBeenLastCalledWith({ q: 'tapis', page: 1, limit: TAILLE_PAGE_ADMIN });
  });

  test('dernière page vidée par une suppression : retour à une page qui existe', () => {
    const charger = vi.fn();
    const { result, rerender } = rendre(charger);
    act(() => result.current.setPage(5));
    rerender({ filtres: { q: undefined }, total: 4 });
    expect(result.current.page).toBe(4);
  });

  test('recherche à partir de 2 caractères, « tous » sans filtre', () => {
    expect(termeRecherche(' a ')).toBeUndefined();
    expect(termeRecherche(' ab ')).toBe('ab');
    expect(filtreChoisi('tous')).toBeUndefined();
    expect(filtreChoisi('publie')).toBe('publie');
  });
});

describe('données d’un article', () => {
  test('modification : un champ vidé est effacé (null)', () => {
    const d = detailsArticle({ type: 'article', auteur: 'Lina', source: '' }, { modification: true });
    expect(d.article).toMatchObject({ auteur: 'Lina', source: null, resume: null, url_source: null });
  });

  test('création : un champ vide reste absent', () => {
    const d = detailsArticle({ type: 'article', auteur: '' });
    expect(d.article.auteur).toBeUndefined();
  });

  test('article scientifique modifié : le lien source va dans url_hal', () => {
    const d = detailsArticle({ type: 'article_scientifique', journal: 'Revue', url_source: 'https://example.com/a', peer_reviewed: false }, { modification: true });
    expect(d.article_scientifique).toMatchObject({ journal: 'Revue', url_hal: 'https://example.com/a', peer_reviewed: false, doi: null });
  });

  test('mot-clé chargé avec toutes ses langues : un seul texte', () => {
    expect(nomDuTag({ nom: { ar: 'تراث', fr: 'patrimoine' } })).toBe('patrimoine');
    expect(nomDuTag({ nom: { ar: 'تراث' } })).toBe('تراث');
    expect(nomDuTag({ nom: 'danse' })).toBe('danse');
    expect(nomDuTag('musique')).toBe('musique');
  });

  test('intervenants et éditeurs : format du serveur', () => {
    const l = liensArticle({ nouveaux: [{ nom: 'A', prenom: 'B', id_type_user: 2 } as never] }, [4]);
    expect(l.nouveaux_intervenants[0]).toMatchObject({ nom: 'A', role: 'Contributeur' });
    expect(l.editeurs).toEqual([{ id_editeur: 4 }]);
    expect(l.utilisateurs_inscrits).toEqual([]);
  });
});
