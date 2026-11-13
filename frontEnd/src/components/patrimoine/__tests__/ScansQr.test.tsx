import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const post = vi.fn();
const get = vi.fn();
vi.mock('@/services/httpClient', () => ({ httpClient: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string, o?: Record<string, unknown>) => d.replace(/\{\{(\w+)\}\}/g, (_m, n) => String(o?.[n] ?? '')) }),
}));

import CompteurScansQr, { useSignalerScanQr } from '../ScansQr';

function Fiche({ id }: { id: number }) {
  useSignalerScanQr(id);
  const l = useLocation();
  return <p data-testid="adresse">{l.pathname + l.search}</p>;
}

describe('scans du QR code', () => {
  beforeEach(() => { post.mockReset().mockResolvedValue({ success: true }); get.mockReset(); });

  it('signale un seul scan et retire « src=qr » de l’adresse', async () => {
    render(
      <MemoryRouter initialEntries={['/patrimoine/5?src=qr&x=1']}>
        <Routes><Route path="/patrimoine/:id" element={<Fiche id={5} />} /></Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('adresse').textContent).toBe('/patrimoine/5?x=1'));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/patrimoine/5/scan-qr', {});
  });

  it('ne signale rien sans le marqueur', () => {
    render(<MemoryRouter initialEntries={['/patrimoine/5']}><Fiche id={5} /></MemoryRouter>);
    expect(post).not.toHaveBeenCalled();
  });

  it('affiche le nombre de scans', async () => {
    get.mockResolvedValue({ success: true, data: { total: 9, trente_jours: 2 } });
    render(<CompteurScansQr idLieu={5} />);
    expect(await screen.findByText('Scanné 9 fois (30 derniers jours : 2)')).toBeTruthy();
  });
});
