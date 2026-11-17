/**
 * Anti-retour (2026-11-17) : à la création, un événement aux mêmes dates propose d'y ajouter une
 * activité plutôt que de créer un second événement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_cle: string, d?: string | { defaultValue?: string; nom?: string }) =>
      typeof d === 'string' ? d : (d?.defaultValue || '').replace('{{nom}}', d?.nom || ''),
    i18n: { language: 'fr' }
  })
}));

import EvenementDejaAuxDates, { chevauche } from './EvenementDejaAuxDates';

const festival = { id_evenement: 70, nom_evenement: { fr: 'Festival' }, date_debut: '2026-11-20T00:00:00.000Z', date_fin: '2026-11-22T00:00:00.000Z', statut: 'publie' };

describe('Événement déjà aux mêmes dates', () => {
  beforeEach(() => get.mockReset());

  it('chevauchement des jours ; un événement sans fin dure son premier jour', () => {
    expect(chevauche('2026-11-21', '', festival)).toBe(true);
    expect(chevauche('2026-11-18', '2026-11-20', festival)).toBe(true);
    expect(chevauche('2026-11-23', '', festival)).toBe(false);
    expect(chevauche('2026-11-20', '', { ...festival, date_fin: null })).toBe(true);
    expect(chevauche('2026-11-21', '', { ...festival, date_fin: null })).toBe(false);
    expect(chevauche('', '', festival)).toBe(false);
  });

  it('propose d’ajouter une activité à l’événement existant, pas à un événement annulé', async () => {
    get.mockResolvedValue({ success: true, data: { evenements: [festival, { ...festival, id_evenement: 71, nom_evenement: { fr: 'Annulé' }, statut: 'annule' }] } });
    render(<MemoryRouter><EvenementDejaAuxDates dateDebut="2026-11-21" dateFin="" /></MemoryRouter>);
    const lien = await screen.findByRole('link', { name: /Festival/ });
    expect(lien.getAttribute('href')).toBe('/dashboard-pro?gerer=70&onglet=programmes');
    expect(screen.queryByText(/Annulé/)).toBeNull();
  });

  it('rien quand les dates ne se croisent pas', async () => {
    get.mockResolvedValue({ success: true, data: { evenements: [festival] } });
    const { container } = render(<MemoryRouter><EvenementDejaAuxDates dateDebut="2026-12-01" dateFin="" /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toBe('');
  });
});
