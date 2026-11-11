import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
vi.mock('@/components/SEOHead', () => ({ default: () => null }));

import ContenuIntrouvable, { estIntrouvable } from '../ContenuIntrouvable';

const afficher = (erreur: unknown, onReessayer = vi.fn()) => {
  render(
    <MemoryRouter>
      <ContenuIntrouvable erreur={erreur} titre="Site non trouvé" lienListe={{ to: '/patrimoine', libelle: 'Retour à la liste' }} onReessayer={onReessayer} />
    </MemoryRouter>,
  );
  return onReessayer;
};

describe('page « introuvable » commune (audit V11 UX-7)', () => {
  it('distingue « pas là » de « pas pu répondre »', () => {
    expect(estIntrouvable({ status: 404 })).toBe(true);
    expect(estIntrouvable({ status: 403 })).toBe(true);
    expect(estIntrouvable({ success: false, error: 'Données invalides' })).toBe(true);
    expect(estIntrouvable(null)).toBe(true);
    expect(estIntrouvable({ status: 500 })).toBe(false);
    expect(estIntrouvable({ status: 429 })).toBe(false);
    expect(estIntrouvable({ code: 'ERR_NETWORK' })).toBe(false);
    expect(estIntrouvable({ code: 'ECONNABORTED' })).toBe(false);
  });

  it('lieu retiré (404) : titre principal « introuvable », lien vers la liste, pas de « Réessayer »', () => {
    afficher({ status: 404 });
    expect(screen.getByRole('heading', { level: 1, name: 'Site non trouvé' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retour à la liste/ })).toHaveAttribute('href', '/patrimoine');
    expect(screen.queryByRole('button', { name: /Réessayer/ })).not.toBeInTheDocument();
    // Avant : « Erreur de connexion au serveur » pour un simple lieu retiré
    expect(screen.queryByText(/connexion/i)).not.toBeInTheDocument();
  });

  it('réseau coupé : « Chargement impossible » et « Réessayer »', () => {
    const onReessayer = afficher({ code: 'ERR_NETWORK' });
    expect(screen.getByRole('heading', { level: 1, name: 'Chargement impossible' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(onReessayer).toHaveBeenCalled();
  });
});
