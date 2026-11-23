/**
 * Anti-retour (2026-11-23) : une écrivaine ajoute son livre et, au même endroit, les articles de presse
 * qui en parlent.
 * - à l'ajout, les articles restent dans le formulaire (rien n'est envoyé avant la création de l'œuvre) ;
 * - Entrée dans le champ du lien ajoute l'article sans envoyer tout le formulaire de l'œuvre ;
 * - en modification, l'article est rattaché aussitôt à cette œuvre.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const get = vi.fn();
const post = vi.fn();
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (_: string, d?: string | Record<string, unknown>) => (typeof d === 'string' ? d : _), i18n: { language: 'fr' } }),
}));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), delete: vi.fn() } }));

import PresseOeuvre, { corpsLien, type ArticlePresse } from '../PresseOeuvre';

const rendre = (el: React.ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{el}</MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  get.mockReset().mockResolvedValue({ success: true, data: [] });
  post.mockReset().mockResolvedValue({ success: true, data: { id_lien: 1 } });
});

describe('Articles de presse dans le formulaire d’une œuvre', () => {
  test('ajout : l’article est gardé dans le formulaire, rien n’est envoyé', () => {
    const change = vi.fn();
    const soumis = vi.fn((e: React.FormEvent) => e.preventDefault());
    rendre(<form onSubmit={soumis}><PresseOeuvre enAttente={[]} onEnAttenteChange={change} /></form>);
    fireEvent.change(screen.getByLabelText('Collez le lien'), { target: { value: 'https://www.elwatan.dz/livre' } });
    fireEvent.change(screen.getByLabelText('Journal ou média (facultatif)'), { target: { value: 'El Watan' } });
    fireEvent.keyDown(screen.getByLabelText('Collez le lien'), { key: 'Enter' });
    expect(change).toHaveBeenCalledWith([expect.objectContaining({ url: 'https://www.elwatan.dz/livre', source: 'El Watan' })]);
    expect(post).not.toHaveBeenCalled();
    expect(soumis).not.toHaveBeenCalled();
  });

  test('lien invalide : explication, rien d’ajouté', () => {
    const change = vi.fn();
    rendre(<PresseOeuvre enAttente={[]} onEnAttenteChange={change} />);
    fireEvent.change(screen.getByLabelText('Collez le lien'), { target: { value: 'pas un lien' } });
    fireEvent.click(screen.getByRole('button', { name: /Ajouter cet article/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Lien invalide');
    expect(change).not.toHaveBeenCalled();
  });

  test('modification : rattaché aussitôt à cette œuvre', async () => {
    rendre(<PresseOeuvre idOeuvre={42} enAttente={[]} onEnAttenteChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Collez le lien'), { target: { value: 'https://aps.dz/article' } });
    fireEvent.click(screen.getByRole('button', { name: /Ajouter cet article/ }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/liens', expect.objectContaining({ url: 'https://aps.dz/article', id_oeuvre: 42, id_evenement: null })));
  });

  test('corps envoyé après la création : date vide = null', () => {
    const a: ArticlePresse = { url: ' https://a.dz/x ', titre: 'T', source: '', date_publication: '' };
    expect(corpsLien(a, 7)).toEqual({ url: 'https://a.dz/x', titre: 'T', source: '', date_publication: null, id_oeuvre: 7, id_evenement: null });
  });
});
