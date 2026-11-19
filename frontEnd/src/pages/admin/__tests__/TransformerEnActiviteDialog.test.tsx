/**
 * Anti-retour (2026-11-19) : la fenêtre « Transformer en activité » ne montre et ne confirme que le
 * résumé de l'événement coché. Une réponse lente, arrivée après un autre choix, est ignorée.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { mockGet, mockPost } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPost: vi.fn() }));

vi.mock('@/services/httpClient', () => ({ httpClient: { get: mockGet, post: mockPost } }));
vi.mock('@/hooks/useFormatDate', () => ({ useFormatDate: () => ({ formatDate: (d: string) => d }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      const texte = typeof fallback === 'string' ? fallback : (fallback?.defaultValue as string) ?? key;
      return texte.replace(/\{\{(\w+)\}\}/g, (_, k) => String((fallback as Record<string, unknown>)?.[k] ?? ''));
    },
    i18n: { language: 'fr' },
  }),
}));

import TransformerEnActiviteDialog from '../TransformerEnActiviteDialog';

const cibles = [
  { id_evenement: 20, nom_evenement: { fr: 'Festival' } },
  { id_evenement: 30, nom_evenement: { fr: 'Salon' } },
];
const resume = (n: number) => ({ success: true, data: { activites: 1, photos: n, inscrits: 0, dejaInscrits: 0 } });

describe('Transformer en activité : résumé de l’événement coché seulement', () => {
  beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

  test('une réponse lente pour l’ancien choix n’est ni affichée ni confirmée', async () => {
    let repondreLent: (v: unknown) => void = () => {};
    mockGet.mockImplementation((url: string, params?: { cible: number }) => {
      if (!url.endsWith('/apercu')) return Promise.resolve({ success: true, data: cibles });
      if (params?.cible === 20) return new Promise((ok) => { repondreLent = ok; });
      return Promise.resolve(resume(7));
    });
    mockPost.mockResolvedValue({ success: true });

    render(<TransformerEnActiviteDialog source={{ id_evenement: 10, nom_evenement: { fr: 'Atelier' } }} onClose={vi.fn()} onTransforme={vi.fn()} />);
    const radios = await screen.findAllByRole('radio');

    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByText('Voir le résumé')); // résumé de « Festival », lent
    fireEvent.click(radios[1]);
    fireEvent.click(screen.getByText('Voir le résumé')); // résumé de « Salon »
    await screen.findByText(/« Salon » : 1 activité\(s\), 7 photo/);

    await act(async () => { repondreLent(resume(99)); });
    expect(screen.queryByText(/99 photo/)).toBeNull();

    fireEvent.click(screen.getByText('Transformer'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/evenements/10/transformer', { cible: 30 }));
  });
});
