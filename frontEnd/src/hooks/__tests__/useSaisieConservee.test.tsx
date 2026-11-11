import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { oublierSaisiesConservees, saisieEnAttente, useSaisieConservee } from '../useSaisieConservee';

const utilisateur = { valeur: { id_user: 7 } as { id_user: number } | null };
vi.mock('@/providers/PermissionsProvider', () => ({ useUtilisateurOptionnel: () => utilisateur.valeur }));

// sessionStorage réel (jsdom) : le fichier de préparation des tests ne remplace que localStorage
beforeEach(() => { sessionStorage.clear(); utilisateur.valeur = { id_user: 7 }; vi.useRealTimers(); });

const monter = (texte: string, restaurer = vi.fn()) =>
  renderHook(({ v }) => useSaisieConservee({ cle: 'avis-oeuvre:42', valeur: { texte: v }, restaurer, actif: !!v }), { initialProps: { v: texte } });

describe('texte conservé quand la session expire (audit V11 FRM-23)', () => {
  it('garde le texte à l’expiration et le remet une seule fois au retour', () => {
    const premier = monter('Très belle œuvre');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    premier.unmount();
    expect(saisieEnAttente('avis-oeuvre:42', 7)).toBe(true);

    const restaurer = vi.fn();
    const retour = monter('', restaurer);
    expect(restaurer).toHaveBeenCalledWith({ texte: 'Très belle œuvre' });
    expect(retour.result.current.restauree).toBe(true);
    // Utilisé une fois : plus rien en attente
    expect(saisieEnAttente('avis-oeuvre:42', 7)).toBe(false);
  });

  it('garder() écrit tout de suite (avant de quitter la page pour y revenir)', () => {
    const premier = monter('Festival de Thala');
    act(() => { premier.result.current.garder(); });
    premier.unmount();
    const restaurer = vi.fn();
    monter('', restaurer);
    expect(restaurer).toHaveBeenCalledWith({ texte: 'Festival de Thala' });
  });

  it('rien d’écrit : rien n’est gardé', () => {
    const { unmount } = monter('');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    unmount();
    expect(saisieEnAttente('avis-oeuvre:42', 7)).toBe(false);
  });

  it('une autre personne ne voit jamais le texte', () => {
    const { unmount } = monter('Texte de la personne 7');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    unmount();
    utilisateur.valeur = { id_user: 8 };
    const restaurer = vi.fn();
    monter('', restaurer);
    expect(restaurer).not.toHaveBeenCalled();
  });

  it('brouillon de plus de 30 minutes : ignoré', () => {
    sessionStorage.setItem('saisie:7:avis-oeuvre:42', JSON.stringify({ v: 1, savedAt: Date.now() - 31 * 60 * 1000, valeur: { texte: 'ancien' } }));
    const restaurer = vi.fn();
    monter('', restaurer);
    expect(restaurer).not.toHaveBeenCalled();
  });

  it('déconnexion : tous les brouillons sont effacés', () => {
    sessionStorage.setItem('saisie:7:avis-oeuvre:42', JSON.stringify({ v: 1, savedAt: Date.now(), valeur: {} }));
    sessionStorage.setItem('autre-cle', 'garde');
    oublierSaisiesConservees();
    expect(sessionStorage.getItem('saisie:7:avis-oeuvre:42')).toBeNull();
    expect(sessionStorage.getItem('autre-cle')).toBe('garde');
  });

  it('oublier() après un envoi réussi', () => {
    const { result, unmount } = monter('Envoyé');
    act(() => { window.dispatchEvent(new Event('auth:expired')); });
    act(() => { result.current.oublier(); });
    unmount();
    expect(saisieEnAttente('avis-oeuvre:42', 7)).toBe(false);
  });
});
