/**
 * Anti-retour (2026-11-17) : import des lieux GeoAlgeria. Les vrais lieux sont pré-cochés, ceux déjà sur le
 * site sont grisés et jamais envoyés ; l'import n'envoie que les lieux cochés ; le bilan reste affiché.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, d?: string | Record<string, unknown>) => {
      if (typeof d === 'string') return d;
      let texte = String(d?.defaultValue ?? _k);
      for (const [k, v] of Object.entries(d || {})) texte = texte.replace(`{{${k}}}`, String(v));
      return texte;
    },
    i18n: { language: 'fr' }
  })
}));
// Liste déroulante simplifiée : un <select> natif
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) =>
    <select aria-label="wilaya" value={value} onChange={(e) => onValueChange(e.target.value)}><option value="" />{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImportGeoAlgeriaDialog from '../ImportGeoAlgeriaDialog';

const rendre = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const point = (id: string, nom: string, preCoche: boolean, deja = false, site: { id_lieu: number; nom: unknown } | null = null) => ({
  id, categorie: 'historique', type: 'castle', typePatrimoine: 'palais_forteresse', nom: { fr: nom }, lat: 31.9, lng: 5.3,
  preCoche, commune: { id_commune: 1, nom: 'Ouargla' }, deja: deja ? { id_lieu: 9, nom: { fr: nom }, statut: 'publie' } : null, source: 'osm', site
});

describe('Importer des lieux GeoAlgeria', () => {
  beforeEach(() => {
    get.mockReset(); post.mockReset();
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/wilayas')) return { success: true, data: [{ id_wilaya: 30, codeW: 30, nom: 'ورقلة', wilaya_name_ascii: 'Ouargla', points: 3 }] };
      if (url.endsWith('/brouillons')) return { success: true, data: [] };
      return { success: true, data: { points: [point('h1', 'Bordj Chandez', true), point('h2', 'pk 178/49', false), point('h3', 'Bab Azi', true, true), point('h4', 'Arc de Trajan', true, false, { id_lieu: 24, nom: { fr: 'Timgad' } })] } };
    });
  });

  it('pré-coche les vrais lieux, grise ceux déjà présents, n’envoie que les cochés et garde le bilan', async () => {
    post.mockResolvedValue({ success: true, data: { crees: 2, points: 1, deja: 0, ignores: 0 } });
    rendre(<ImportGeoAlgeriaDialog open onOpenChange={() => {}} onImported={() => {}} />);
    await waitFor(() => expect(screen.getByRole('option', { name: /30 · Ouargla \(3\)/ })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('wilaya'), { target: { value: '30' } });
    await screen.findByText('Bordj Chandez');
    expect(screen.getByRole('checkbox', { name: 'Bordj Chandez' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'pk 178/49' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('checkbox', { name: 'Bab Azi' }).hasAttribute('disabled')).toBe(true);
    // Partie d'un site déjà présent : proposée comme point de visite de Timgad
    expect(screen.getByText('Point de visite de « Timgad »')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Importer en brouillon/ }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/patrimoine/import-geoalgeria', { ids: ['h1', 'h4'], commePoints: ['h4'] }));
    expect(await screen.findByText(/2 lieu\(x\) créé\(s\) en brouillon, dont 1 point\(s\) de visite/)).toBeTruthy();
  });

  it('anti-retour 2026-11-19 : la réponse lente d’une wilaya quittée ne remplace pas la liste', async () => {
    let lente: (v: unknown) => void = () => {};
    get.mockImplementation(async (url: string, params?: { wilaya: string }) => {
      if (url.endsWith('/wilayas')) return { success: true, data: [
        { id_wilaya: 30, codeW: 30, nom: 'ورقلة', wilaya_name_ascii: 'Ouargla', points: 1 },
        { id_wilaya: 5, codeW: 5, nom: 'باتنة', wilaya_name_ascii: 'Batna', points: 1 }] };
      if (url.endsWith('/brouillons')) return { success: true, data: [] };
      if (params?.wilaya === '30') return new Promise((ok) => { lente = ok; });
      return { success: true, data: { points: [point('b1', 'Timgad', true)] } };
    });
    rendre(<ImportGeoAlgeriaDialog open onOpenChange={() => {}} onImported={() => {}} />);
    await waitFor(() => expect(screen.getByRole('option', { name: /05 · Batna|5 · Batna/ })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('wilaya'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('wilaya'), { target: { value: '5' } });
    await screen.findByText('Timgad');
    lente({ success: true, data: { points: [point('o1', 'Bordj Chandez', true)] } });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('Bordj Chandez')).toBeNull();
    expect(screen.getByText('Timgad')).toBeTruthy();
  });

  it('anti-retour 2026-11-19 : une erreur de chargement est affichée', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/wilayas')) return { success: false, error: 'Service indisponible' };
      return { success: true, data: [] };
    });
    rendre(<ImportGeoAlgeriaDialog open onOpenChange={() => {}} onImported={() => {}} />);
    expect(await screen.findByText('Service indisponible')).toBeTruthy();
  });
});
