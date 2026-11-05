/**
 * Modifier un article : toutes les langues chargées, rien d'écrit si une étape échoue,
 * et une erreur n'est jamais annoncée comme un succès.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { oeuvre, blocs, http, toast, auth, editeur } = vi.hoisted(() => ({
  oeuvre: { getForEdit: vi.fn(), updateOeuvre: vi.fn() },
  blocs: { createMultipleBlocks: vi.fn() },
  http: { postFormData: vi.fn() },
  toast: vi.fn(),
  auth: { value: { user: { id_user: 7 }, isAdmin: false } as Record<string, unknown> },
  editeur: { props: null as null | { initialData: Record<string, unknown>; onSave: (r: unknown) => Promise<void> } },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k) }) }));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/article/ArticleEditor', () => ({
  default: (p: never) => { editeur.props = p; return <div>éditeur ouvert</div>; },
}));
vi.mock('@/services/oeuvre.service', () => ({ oeuvreService: oeuvre }));
vi.mock('@/services/articleBlock.service', () => ({ articleBlockService: blocs }));
vi.mock('@/services/httpClient', () => ({ httpClient: http }));
vi.mock('@/utils/prepareImageForUpload', () => ({ prepareImageForUpload: async (f: File) => f }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.value }));
vi.mock('@/lib/queryClient', () => ({ rafraichirTableauDeBord: vi.fn() }));
vi.mock('@/hooks/useNavigationDifferee', () => ({ useNavigationDifferee: () => vi.fn() }));

import EditArticle from '@/pages/articles/edit/EditArticle';

const ARTICLE = {
  id_oeuvre: 40, id_type_oeuvre: 4, saisi_par: 7, statut: 'publie', id_langue: 1,
  titre: { fr: 'Titre', ar: 'عنوان' }, description: { fr: 'Chapeau' },
  Categories: [{ id_categorie: 3 }], Tags: [{ nom: { fr: 'patrimoine', ar: 'تراث' } }],
  Article: { id_article: 11 },
};

const envoi = (blocks: unknown[]) => ({
  article: {
    formData: { type: 'article', titre: { fr: 'Nouveau', ar: 'عنوان' }, description: { fr: 'Chapeau' }, categories: [3], tags: ['patrimoine'], auteur: 'Lina', source: '' },
    blocks,
    contributeurs: { existants: [], nouveaux: [], contributeurs: [] },
    editeurs: [],
  },
});

const afficher = () => render(
  <MemoryRouter initialEntries={['/editer-article/40']}>
    <Routes>
      <Route path="/editer-article/:id" element={<EditArticle />} />
      <Route path="/articles/:id/proposer" element={<div>page de proposition</div>} />
    </Routes>
  </MemoryRouter>
);

describe('EditArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.value = { user: { id_user: 7 }, isAdmin: false };
    oeuvre.getForEdit.mockResolvedValue({ success: true, data: ARTICLE });
    oeuvre.updateOeuvre.mockResolvedValue({ success: true });
    blocs.createMultipleBlocks.mockResolvedValue({ success: true });
  });

  test('chargement : toutes les langues, mots-clés en texte', async () => {
    afficher();
    await screen.findByText('éditeur ouvert');
    expect(oeuvre.getForEdit).toHaveBeenCalledWith(40);
    expect(editeur.props!.initialData.titre).toEqual({ fr: 'Titre', ar: 'عنوان' });
    expect(editeur.props!.initialData.tags).toEqual(['patrimoine']);
  });

  test('article de quelqu’un d’autre : vers la proposition de modification', async () => {
    auth.value = { user: { id_user: 8 }, isAdmin: false };
    afficher();
    expect(await screen.findByText('page de proposition')).toBeInTheDocument();
  });

  test('administration : peut modifier l’article d’un autre', async () => {
    auth.value = { user: { id_user: 1 }, isAdmin: true };
    afficher();
    expect(await screen.findByText('éditeur ouvert')).toBeInTheDocument();
  });

  test('autre type d’œuvre : refusé', async () => {
    oeuvre.getForEdit.mockResolvedValue({ success: true, data: { ...ARTICLE, id_type_oeuvre: 1 } });
    afficher();
    expect(await screen.findByText(/pas un article/)).toBeInTheDocument();
  });

  test('enregistrement : texte, champs de l’article et blocs envoyés', async () => {
    afficher();
    await screen.findByText('éditeur ouvert');
    await editeur.props!.onSave(envoi([{ type_block: 'text', contenu: 'Texte', metadata: { langue_origine: 'fr' }, id_media: null }]));
    const donnees = oeuvre.updateOeuvre.mock.calls[0][1];
    expect(donnees.titre).toEqual({ fr: 'Nouveau', ar: 'عنوان' });
    expect(donnees.details_specifiques.article).toMatchObject({ auteur: 'Lina', source: null });
    const envoiBlocs = blocs.createMultipleBlocks.mock.calls[0][0];
    expect(envoiBlocs).toMatchObject({ id_article: 11, article_type: 'article' });
    expect(envoiBlocs.blocks[0]).toMatchObject({ contenu: 'Texte', id_article: 11, ordre: 0, visible: true });
    expect(toast.mock.calls.at(-1)?.[0].variant).toBeUndefined();
  });

  test('sans aucun bloc : refusé, rien n’est écrit', async () => {
    afficher();
    await screen.findByText('éditeur ouvert');
    await expect(editeur.props!.onSave(envoi([]))).rejects.toThrow();
    expect(oeuvre.updateOeuvre).not.toHaveBeenCalled();
    expect(blocs.createMultipleBlocks).not.toHaveBeenCalled();
  });

  test('image non envoyée : rien n’est écrit, l’erreur remonte à l’éditeur', async () => {
    http.postFormData.mockResolvedValue({ success: false });
    afficher();
    await screen.findByText('éditeur ouvert');
    const fichier = new File(['x'], 'a.png', { type: 'image/png' });
    await expect(editeur.props!.onSave(envoi([{ type_block: 'image', contenu: '', metadata: { tempFile: fichier } }]))).rejects.toThrow();
    expect(oeuvre.updateOeuvre).not.toHaveBeenCalled();
    expect(blocs.createMultipleBlocks).not.toHaveBeenCalled();
  });

  test('titre refusé par le serveur : les blocs ne sont pas remplacés', async () => {
    oeuvre.updateOeuvre.mockResolvedValue({ success: false, error: 'Refusé' });
    afficher();
    await screen.findByText('éditeur ouvert');
    await expect(editeur.props!.onSave(envoi([{ type_block: 'text', contenu: 'x' }]))).rejects.toThrow('Refusé');
    expect(blocs.createMultipleBlocks).not.toHaveBeenCalled();
  });

  test('blocs refusés : pas de message de succès', async () => {
    blocs.createMultipleBlocks.mockResolvedValue({ success: false, error: 'Blocs refusés' });
    afficher();
    await screen.findByText('éditeur ouvert');
    await expect(editeur.props!.onSave(envoi([{ type_block: 'text', contenu: 'x' }]))).rejects.toThrow('Blocs refusés');
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast.mock.calls.every(([m]) => m.variant === 'destructive')).toBe(true);
  });
});
