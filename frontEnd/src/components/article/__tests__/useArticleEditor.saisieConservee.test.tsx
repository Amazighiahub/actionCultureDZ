/**
 * useArticleEditor — rédaction conservée quand la session expire (audit V11 FRM-23)
 *
 * Couverture :
 *   - Article existant : rien n'est remis avant le chargement du contenu ; ensuite le brouillon l'emporte
 *   - La photo pas encore envoyée (fichier, aperçu blob:) n'est jamais gardée
 *   - Une clé par usage : la proposition de modification ne reprend pas le brouillon de l'auteur
 *   - Une autre personne : rien n'est remis
 *   - Envoi réussi : brouillon oublié
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const { emplacement, utilisateur, mockGetForEdit, mockGetBlocks, mockToast } = vi.hoisted(() => ({
  emplacement: { pathname: '/editer-article/42' },
  utilisateur: { valeur: { id_user: 7 } as { id_user: number } | null },
  mockGetForEdit: vi.fn(),
  mockGetBlocks: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useLocation: () => emplacement }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, f?: unknown) => (typeof f === 'string' ? f : k), i18n: { language: 'fr' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/providers/PermissionsProvider', () => ({ useUtilisateurOptionnel: () => utilisateur.valeur }));
vi.mock('@/services/metadata.service', () => ({
  metadataService: { getAllCached: vi.fn().mockResolvedValue({ success: true, data: {} }), checkIfTypeHasCategories: vi.fn().mockResolvedValue(false) },
}));
vi.mock('@/services/oeuvre.service', () => ({ oeuvreService: { getForEdit: (...a: unknown[]) => mockGetForEdit(...a) } }));
vi.mock('@/services/articleBlock.service', () => ({ articleBlockService: { getBlocksByArticle: (...a: unknown[]) => mockGetBlocks(...a) } }));

import { useArticleEditor } from '../useArticleEditor';

const expirer = () => act(() => { window.dispatchEvent(new Event('auth:expired')); });
const monter = (onSave?: () => Promise<void>) => renderHook(() => useArticleEditor({ articleId: 42, onSave }));

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  emplacement.pathname = '/editer-article/42';
  utilisateur.valeur = { id_user: 7 };
  mockGetForEdit.mockResolvedValue({ success: true, data: { titre: { fr: 'Titre enregistré' }, description: { fr: 'Chapeau' }, id_langue: 1, Article: { id_article: 9 } } });
  mockGetBlocks.mockResolvedValue({ success: true, data: [{ type_block: 'text', contenu: 'Texte enregistré', ordre: 0, visible: true }] });
});

/** Article chargé, puis une phrase ajoutée et une photo choisie (pas encore envoyée) */
const rediger = async () => {
  const vue = monter();
  await waitFor(() => expect(vue.result.current.blocks[0]?.contenu).toBe('Texte enregistré'));
  await new Promise((r) => setTimeout(r, 350)); // référence « non modifié » prise après le chargement
  act(() => { vue.result.current.updateBlock(0, { contenu: 'Texte enrichi par l’auteur' }); });
  act(() => { vue.result.current.addBlock('image'); });
  const fichier = new File(['x'], 'patio.jpg', { type: 'image/jpeg' });
  act(() => { vue.result.current.updateBlock(1, { media: { url: 'blob:http://localhost/abc' }, metadata: { caption: 'Patio', tempFile: fichier } as never }); });
  return vue;
};

describe('useArticleEditor — session expirée pendant la rédaction', () => {
  test('gardé sans la photo, remis après le chargement du contenu (le brouillon l’emporte)', async () => {
    const premier = await rediger();
    expirer();
    premier.unmount();

    const brut = sessionStorage.getItem('saisie:7:article:42:modification');
    expect(brut).not.toBeNull();
    const garde = JSON.parse(brut!).valeur;
    expect(garde.blocks[0].contenu).toBe('Texte enrichi par l’auteur');
    expect(garde.blocks[1].metadata).toEqual({ caption: 'Patio' });
    expect(garde.blocks[1].media).toBeUndefined();
    expect(garde.avaitFichiers).toBe(true);

    let resoudre: (v: unknown) => void = () => {};
    mockGetBlocks.mockReturnValueOnce(new Promise((r) => { resoudre = r; }));
    const retour = monter();
    // Contenu pas encore chargé : rien n'est repris
    expect(sessionStorage.getItem('saisie:7:article:42:modification')).not.toBeNull();
    await act(async () => { resoudre({ success: true, data: [{ type_block: 'text', contenu: 'Texte enregistré', ordre: 0, visible: true }] }); });
    await waitFor(() => expect(retour.result.current.saisieRestauree).toBe(true));
    expect(retour.result.current.blocks).toHaveLength(2);
    expect(retour.result.current.blocks[0].contenu).toBe('Texte enrichi par l’auteur');
    expect(retour.result.current.blocks[1].type_block).toBe('image');
    expect(retour.result.current.fichiersARajouter).toBe(true);
    expect(retour.result.current.modifie).toBe(true);
    expect(sessionStorage.getItem('saisie:7:article:42:modification')).toBeNull();
  });

  test('proposition de modification : clé à part, le brouillon de l’auteur n’est pas repris', async () => {
    const premier = await rediger();
    expirer();
    premier.unmount();

    emplacement.pathname = '/articles/42/proposer';
    const autre = monter();
    await waitFor(() => expect(autre.result.current.blocks[0]?.contenu).toBe('Texte enregistré'));
    expect(autre.result.current.saisieRestauree).toBe(false);
    expect(sessionStorage.getItem('saisie:7:article:42:modification')).not.toBeNull();
  });

  test('une autre personne ne retrouve pas la rédaction', async () => {
    const premier = await rediger();
    expirer();
    premier.unmount();

    utilisateur.valeur = { id_user: 8 };
    const autre = monter();
    await waitFor(() => expect(autre.result.current.blocks[0]?.contenu).toBe('Texte enregistré'));
    expect(autre.result.current.saisieRestauree).toBe(false);
  });

  test('envoi réussi : brouillon oublié', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const vue = renderHook(() => useArticleEditor({ articleId: 42, onSave }));
    await waitFor(() => expect(vue.result.current.blocks[0]?.contenu).toBe('Texte enregistré'));
    await new Promise((r) => setTimeout(r, 350));
    act(() => { vue.result.current.updateBlock(0, { contenu: 'Texte corrigé' }); });
    expirer();
    expect(sessionStorage.getItem('saisie:7:article:42:modification')).not.toBeNull();
    await act(async () => { await vue.result.current.handleSave(); });
    expect(onSave).toHaveBeenCalled();
    expect(sessionStorage.getItem('saisie:7:article:42:modification')).toBeNull();
  });
});
