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

import ImportGeoAlgeriaDialog from '../ImportGeoAlgeriaDialog';

const point = (id: string, nom: string, preCoche: boolean, deja = false) => ({
  id, categorie: 'historique', type: 'castle', typePatrimoine: 'palais_forteresse', nom: { fr: nom }, lat: 31.9, lng: 5.3,
  preCoche, commune: { id_commune: 1, nom: 'Ouargla' }, deja: deja ? { id_lieu: 9, nom: { fr: nom }, statut: 'publie' } : null, source: 'osm'
});

describe('Importer des lieux GeoAlgeria', () => {
  beforeEach(() => {
    get.mockReset(); post.mockReset();
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/wilayas')) return { success: true, data: [{ id_wilaya: 30, codeW: 30, nom: 'ورقلة', wilaya_name_ascii: 'Ouargla', points: 3 }] };
      if (url.endsWith('/brouillons')) return { success: true, data: [] };
      return { success: true, data: { points: [point('h1', 'Bordj Chandez', true), point('h2', 'pk 178/49', false), point('h3', 'Bab Azi', true, true)] } };
    });
  });

  it('pré-coche les vrais lieux, grise ceux déjà présents, n’envoie que les cochés et garde le bilan', async () => {
    post.mockResolvedValue({ success: true, data: { crees: 1, deja: 0, ignores: 0 } });
    render(<ImportGeoAlgeriaDialog open onOpenChange={() => {}} onImported={() => {}} />);
    await waitFor(() => expect(screen.getByRole('option', { name: /30 · Ouargla \(3\)/ })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('wilaya'), { target: { value: '30' } });
    await screen.findByText('Bordj Chandez');
    expect(screen.getByRole('checkbox', { name: 'Bordj Chandez' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('checkbox', { name: 'pk 178/49' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('checkbox', { name: 'Bab Azi' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Importer en brouillon/ }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/patrimoine/import-geoalgeria', { ids: ['h1'] }));
    expect(await screen.findByText(/1 lieu\(x\) créé\(s\) en brouillon/)).toBeTruthy();
  });
});
