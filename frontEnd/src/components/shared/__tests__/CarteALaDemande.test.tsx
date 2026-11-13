import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CarteALaDemande, { economieDonneesActive } from '../CarteALaDemande';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

const connexion = (valeur: object | undefined) => Object.defineProperty(navigator, 'connection', { value: valeur, configurable: true });

describe('carte à la demande (économie de données)', () => {
  afterEach(() => connexion(undefined));

  it('signaux : mode économie ou 2G ; sinon la carte s’affiche comme avant', () => {
    connexion(undefined); expect(economieDonneesActive()).toBe(false);
    connexion({ effectiveType: '4g' }); expect(economieDonneesActive()).toBe(false);
    connexion({ saveData: true }); expect(economieDonneesActive()).toBe(true);
    connexion({ effectiveType: 'slow-2g' }); expect(economieDonneesActive()).toBe(true);
  });

  it('économie : bouton à la place de la carte, carte affichée au toucher', () => {
    connexion({ saveData: true });
    render(<CarteALaDemande><div>carte</div></CarteALaDemande>);
    expect(screen.queryByText('carte')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Afficher la carte' }));
    expect(screen.getByText('carte')).toBeInTheDocument();
  });

  it('connexion normale : carte directement', () => {
    connexion({ effectiveType: '4g' });
    render(<CarteALaDemande><div>carte</div></CarteALaDemande>);
    expect(screen.getByText('carte')).toBeInTheDocument();
  });
});
