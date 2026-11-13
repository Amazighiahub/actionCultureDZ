import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AffichetteQR from '../AffichetteQR';

const get = vi.fn();
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));
vi.mock('@/services/httpClient', () => ({ httpClient: { get: (...a: unknown[]) => get(...a) } }));

describe('affichette QR d’un site', () => {
  it('lit le nom dans toutes les langues, imprime chaque écriture une fois, consigne bilingue', async () => {
    get.mockResolvedValue({ success: true, data: { nom: { fr: 'Kalâa', ar: 'القلعة', 'tz-ltn': 'Kalâa', 'tz-tfng': 'ⵇⴰⵍⵄⴰ' } } });
    const imprimer = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<AffichetteQR idLieu={4} nom="Kalâa" qrDataUrl="data:image/png;base64,AAAA" lieu="Maadid, Msila" avecAudio />);
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer l’affichette' }));
    await waitFor(() => expect(document.querySelector('.affichette-qr')).not.toBeNull());
    expect(get).toHaveBeenCalledWith('/patrimoine/4', { i18n: 'all' });
    const textes = [...document.querySelectorAll('.affichette-qr p')].map((p) => p.textContent);
    expect(textes.filter((x) => x === 'Kalâa')).toHaveLength(1);
    expect(textes).toEqual(expect.arrayContaining(['القلعة', 'ⵇⴰⵍⵄⴰ', 'Scannez pour découvrir ce lieu et écouter son histoire', 'Maadid, Msila', 'taladz.com']));
    await waitFor(() => expect(imprimer).toHaveBeenCalled());
    imprimer.mockRestore();
  });

  it('sans QR chargé : bouton inactif', () => {
    render(<AffichetteQR idLieu={4} nom="Kalâa" qrDataUrl={null} />);
    expect(screen.getByRole('button', { name: 'Imprimer l’affichette' })).toBeDisabled();
  });
});
