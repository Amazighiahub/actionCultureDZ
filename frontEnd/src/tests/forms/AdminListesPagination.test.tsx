/**
 * Onglets d'administration branchés sur le vrai hook : recherche, filtre et page demandés au serveur,
 * total réel affiché, filtres gardés après une action.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

const { admin, toast } = vi.hoisted(() => ({
  admin: {
    getOeuvres: vi.fn(),
    getPendingOeuvres: vi.fn(),
    deleteOeuvre: vi.fn(),
  },
  toast: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  withTranslation: () => (C: unknown) => C,
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (k: string, d?: unknown, o?: Record<string, unknown>) => {
      const modele = typeof d === 'string' ? d : k;
      const valeurs = (typeof d === 'object' ? d : o) as Record<string, unknown> | undefined;
      return modele.replace(/\{\{(\w+)\}\}/g, (_, n) => String(valeurs?.[n] ?? ''));
    },
  }),
}));
vi.mock('@/services/admin.service', () => ({ adminService: admin }));
vi.mock('@/services/evenement.service', () => ({ evenementService: {} }));
vi.mock('@/services/httpClient', () => ({ httpClient: {} }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (v: unknown) => v }));
vi.mock('@/hooks/useFormatDate', () => ({ getDateLocale: () => 'fr-FR', useFormatDate: () => ({ formatDate: (d: string) => d }) }));
vi.mock('@/helpers/assetUrl', () => ({ getAssetUrl: (u: string) => u }));
vi.mock('@/components/admin/MotifRefusDialog', () => ({ default: () => null }));

import AdminOeuvresTab from '@/pages/admin/AdminOeuvresTab';

const page = (numero: number, total = 45) => ({
  success: true,
  data: [{ id_oeuvre: numero * 100, titre: `Œuvre page ${numero}`, statut: 'publie', description: '' }],
  pagination: { total, page: numero, limit: 20, totalPages: Math.ceil(total / 20) },
});

describe('onglet Œuvres', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    admin.getOeuvres.mockImplementation(async (p: { page?: number; statut?: string }) => (p.statut === 'en_attente' ? page(1, 3) : page(p.page || 1)));
    admin.getPendingOeuvres.mockResolvedValue({ success: true, data: { items: [{ id_oeuvre: 1 }], pagination: { total: 3, page: 1, limit: 5, pages: 1 } } });
  });

  const afficher = () => render(<MemoryRouter><AdminOeuvresTab /></MemoryRouter>);

  test('premier affichage : un seul chargement, total réel et bandeau « à valider »', async () => {
    afficher();
    expect(await screen.findByText('Œuvre page 1')).toBeInTheDocument();
    expect(admin.getOeuvres).toHaveBeenCalledTimes(1);
    expect(admin.getOeuvres).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(screen.getByText('45 œuvre(s)')).toBeInTheDocument();
    expect(screen.getByText('3 œuvre(s) à valider')).toBeInTheDocument();
  });

  test('page suivante : demandée au serveur', async () => {
    const u = userEvent.setup();
    afficher();
    await screen.findByText('Œuvre page 1');
    await u.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Œuvre page 2')).toBeInTheDocument();
    expect(admin.getOeuvres).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
  });

  test('recherche : envoyée au serveur, retour en page 1, dès 2 caractères', async () => {
    const u = userEvent.setup();
    afficher();
    await screen.findByText('Œuvre page 1');
    await u.click(screen.getByRole('button', { name: '2' }));
    await screen.findByText('Œuvre page 2');
    admin.getOeuvres.mockClear();
    await u.type(screen.getByRole('textbox'), 'ne');
    await waitFor(() => expect(admin.getOeuvres).toHaveBeenLastCalledWith({ q: 'ne', page: 1, limit: 20 }));
  });

  test('bandeau : affiche les œuvres à valider, par le serveur', async () => {
    const u = userEvent.setup();
    afficher();
    await u.click(await screen.findByText('3 œuvre(s) à valider'));
    await waitFor(() => expect(admin.getOeuvres).toHaveBeenLastCalledWith({ statut: 'en_attente', page: 1, limit: 20 }));
    expect(screen.queryByText('3 œuvre(s) à valider')).toBeNull();
  });

  test('réponse lente dépassée par une plus récente : la plus récente reste à l’écran', async () => {
    const u = userEvent.setup();
    afficher();
    await screen.findByText('Œuvre page 1');
    let finirPageDeux: (v: unknown) => void = () => {};
    admin.getOeuvres.mockImplementationOnce(() => new Promise((r) => { finirPageDeux = r; }));
    await u.click(screen.getByRole('button', { name: '2' }));
    await u.click(await screen.findByRole('button', { name: '3' }));
    expect(await screen.findByText('Œuvre page 3')).toBeInTheDocument();
    finirPageDeux(page(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText('Œuvre page 3')).toBeInTheDocument();
    expect(screen.queryByText('Œuvre page 2')).toBeNull();
  });
});
