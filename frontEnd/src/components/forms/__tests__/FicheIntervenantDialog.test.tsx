/**
 * FicheIntervenantDialog — fiche d'un intervenant ajoutée par l'organisateur
 *
 * Couverture :
 *   - Modifiable : fiche pré-remplie, enregistrement de la présentation (PUT), prénom/nom renvoyés
 *   - Non modifiable (intervenant d'un autre organisateur) : explication, champs en lecture seule
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FicheIntervenantDialog from '../FicheIntervenantDialog';

const { mockGet, mockPut } = vi.hoisted(() => ({ mockGet: vi.fn(), mockPut: vi.fn() }));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: mockGet, put: mockPut } }));
vi.mock('@/services/upload.service', () => ({ uploadService: { uploadImage: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'fr' },
  }),
}));

const fiche = {
  id_intervenant: 13, prenom: { fr: 'Noureddine' }, nom: { fr: 'Hammouche' },
  biographie: { fr: 'Artiste peintre.' }, titre_professionnel: null, organisation: null,
  site_web: null, photo_url: null
};

describe('FicheIntervenantDialog', () => {
  beforeEach(() => { mockGet.mockReset(); mockPut.mockReset(); });

  test('modifiable : pré-remplie, enregistre la présentation et renvoie le nom', async () => {
    mockGet.mockResolvedValue({ success: true, data: { ...fiche, peut_modifier: true, raison: null } });
    mockPut.mockResolvedValue({ success: true });
    const onSaved = vi.fn(); const onClose = vi.fn();
    render(<FicheIntervenantDialog idIntervenant={13} onClose={onClose} onSaved={onSaved} />);

    expect(await screen.findByDisplayValue('Hammouche')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('/intervenants/13/edition');
    fireEvent.change(screen.getByLabelText('Titre ou métier'), { target: { value: 'Artiste peintre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/intervenants/13', expect.objectContaining({
      prenom: { fr: 'Noureddine' }, nom: { fr: 'Hammouche' },
      titre_professionnel: 'Artiste peintre', biographie: expect.objectContaining({ fr: 'Artiste peintre.' })
    })));
    expect(onSaved).toHaveBeenCalledWith({ prenom: 'Noureddine', nom: 'Hammouche' });
    expect(onClose).toHaveBeenCalled();
  });

  test('intervenant d’un autre organisateur : explication, lecture seule, pas de bouton Enregistrer', async () => {
    mockGet.mockResolvedValue({ success: true, data: { ...fiche, peut_modifier: false, raison: 'autre_organisateur' } });
    render(<FicheIntervenantDialog idIntervenant={13} onClose={vi.fn()} />);

    expect(await screen.findByText(/seule l’administration peut modifier sa fiche/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hammouche')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).toBeNull();
  });

  test('nouvelle fiche (personnalité) : nom repris, rien n’est enregistré ici, données rendues', async () => {
    const onCree = vi.fn(); const onClose = vi.fn();
    render(<FicheIntervenantDialog idIntervenant={null} creation={{ prenom: 'Mohand', nom: 'Ouhammou' }} onCree={onCree} onClose={onClose} />);

    expect(screen.getByDisplayValue('Ouhammou')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1902-03-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
    expect(onCree).toHaveBeenCalledWith(expect.objectContaining({ prenom: { fr: 'Mohand' }, nom: { fr: 'Ouhammou' }, date_naissance: '1902-03-01' }));
    expect(onClose).toHaveBeenCalled();
  });
});

