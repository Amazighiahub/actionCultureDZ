/**
 * Anti-retour (2026-11-17) : l'article rattaché à une activité (compte rendu) s'affiche sous elle,
 * dans le programme, sans avoir à déplier l'activité.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventProgram from '../EventProgram';
import type { Programme } from '@/types/models/programme.types';

vi.mock('@/hooks/useFormatDate', () => ({ useFormatDate: () => ({ formatDate: (d: unknown) => String(d).slice(0, 10) }) }));
vi.mock('@/hooks/useTranslateData', () => ({ useTranslateData: () => ({ td: (v: unknown) => (typeof v === 'string' ? v : (v as { fr?: string })?.fr || '') }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k), i18n: { language: 'ar' } }),
  withTranslation: () => (C: unknown) => C,
}));

const activite = (id: number, titre: string, oeuvres?: Programme['oeuvres_liees']) =>
  ({ id_programme: id, date_programme: '2026-11-12', titre: { fr: titre }, description: { fr: '' }, ordre: id, statut: 'planifie', oeuvres_liees: oeuvres }) as unknown as Programme;

describe('programme : articles d’une activité', () => {
  it('lien vers l’article sous son activité, dans la langue du site', () => {
    render(<MemoryRouter><EventProgram programs={[
      activite(1, 'Atelier aquarelle', [{ id_oeuvre: 900, titre: { ar: 'آفاق الواحة', fr: 'Horizons de l’oasis' }, id_type_oeuvre: 4 }]),
      activite(2, 'Visite', [])
    ]} /></MemoryRouter>);
    const lien = screen.getByRole('link', { name: 'آفاق الواحة' });
    expect(lien.getAttribute('href')).toMatch(/^\/articles\/900/);
    expect(screen.getAllByTestId('oeuvres-activite')).toHaveLength(1);
  });
});
