import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompleterProfilCard, { champsManquants } from '../CompleterProfilCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, string>) =>
      (fallback ?? key).replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => opts?.[k] ?? ''),
  }),
}));

describe('Compléter son profil après une inscription rapide', () => {
  // Le fichier de préparation des tests remplace localStorage par des fonctions vides : petite mémoire ici
  let memoire: Record<string, string> = {};
  beforeEach(() => {
    memoire = {};
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => memoire[k] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => { memoire[k] = v; });
  });

  it('liste ce qui manque, dans l’ordre', () => {
    expect(champsManquants({ id_user: 1 })).toEqual(['wilaya', 'genre', 'naissance', 'telephone']);
    expect(champsManquants({ id_user: 1, wilaya_residence: 16, sexe: 'F', date_naissance: '1990-01-01', telephone: '+213555123456' })).toEqual([]);
    expect(champsManquants(null)).toEqual([]);
  });

  it('montre les informations manquantes et ouvre le profil', () => {
    const onCompleter = vi.fn();
    render(<CompleterProfilCard user={{ id_user: 7, wilaya_residence: 16, sexe: 'F' }} onCompleter={onCompleter} />);
    expect(screen.getByText(/votre date de naissance et votre téléphone/)).toBeInTheDocument();
    expect(screen.queryByText(/votre wilaya/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compléter mon profil' }));
    expect(onCompleter).toHaveBeenCalledTimes(1);
  });

  it('adresse pas encore confirmée : le dit d’abord, avec un nouveau lien', async () => {
    const { userService } = await import('@/services/user.service');
    const envoi = vi.spyOn(userService, 'sendVerificationEmail').mockResolvedValue({ success: true } as never);
    render(<CompleterProfilCard user={{ id_user: 8, email: 'lina@example.com', email_verifie: false }} onCompleter={() => {}} />);
    expect(screen.getByText('Confirmez votre adresse e-mail')).toBeInTheDocument();
    expect(screen.getByText(/lina@example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compléter mon profil' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir un nouveau lien' }));
    expect(await screen.findByText(/Nouveau lien envoyé/)).toBeInTheDocument();
    expect(envoi).toHaveBeenCalledTimes(1);
  });

  it('profil complet : rien n’est affiché', () => {
    const { container } = render(
      <CompleterProfilCard user={{ id_user: 7, wilaya_residence: 16, sexe: 'M', date_naissance: '1990-01-01', telephone: '+213555123456' }} onCompleter={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('« Plus tard » le ferme et il ne revient pas', () => {
    const user = { id_user: 7 };
    const { unmount } = render(<CompleterProfilCard user={user} onCompleter={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByText('Complétez votre profil')).not.toBeInTheDocument();
    unmount();
    render(<CompleterProfilCard user={user} onCompleter={() => {}} />);
    expect(screen.queryByText('Complétez votre profil')).not.toBeInTheDocument();
  });
});
