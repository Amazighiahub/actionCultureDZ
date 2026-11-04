/**
 * Invitation à installer après la connexion : seulement connecté, sur téléphone, si l'installation est
 * possible ; « Plus tard » la fait taire et elle ne s'affiche pas si le site est déjà installé.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const etat = vi.hoisted(() => ({ connecte: true, proposee: true, iphone: false, installee: false, possible: false, abonnement: null as unknown }));
const activation = vi.hoisted(() => vi.fn(async () => 'active'));
const lancer = vi.hoisted(() => vi.fn(async () => true));

vi.mock('@/providers/PermissionsProvider', () => ({
  usePermissionsContext: () => ({ isAuthenticated: etat.connecte }),
}));
vi.mock('@/utils/applicationMobile', () => ({
  estInstallee: () => etat.installee,
  estIphone: () => etat.iphone,
  installationProposee: () => etat.proposee,
  lancerInstallation: lancer,
  abonnementActuel: async () => etat.abonnement,
  activerNotifications: activation,
  notificationsPossibles: () => etat.possible,
  suivreInstallation: () => () => undefined,
  surTelephone: () => window.matchMedia('(pointer: coarse)').matches,
}));
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (_: string, d?: string) => d || _, i18n: { language: 'fr' } }),
}));

import InvitationInstallation from '@/components/shared/InvitationInstallation';

const telephone = (oui: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: oui }) as unknown as typeof window.matchMedia;
};
const TITRE = 'Installez Tala DZ sur votre téléphone';

// Vraie mémoire du navigateur : le silence de « Plus tard » doit survivre à la visite suivante
const memoire = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (c: string) => memoire.get(c) ?? null,
  setItem: (c: string, v: string) => { memoire.set(c, v); },
});

beforeEach(() => {
  memoire.clear();
  lancer.mockClear();
  Object.assign(etat, { connecte: true, proposee: true, iphone: false, installee: false, possible: false, abonnement: null });
  activation.mockClear();
  vi.stubGlobal('Notification', { permission: 'default' });
  telephone(true);
});

describe('invitation à installer', () => {
  test('apparaît pour une personne connectée sur téléphone', () => {
    render(<InvitationInstallation />);
    expect(screen.getByText(TITRE)).toBeInTheDocument();
  });

  test.each([
    ['sans connexion', () => { etat.connecte = false; }],
    ['déjà installé', () => { etat.installee = true; }],
    ['sur ordinateur', () => telephone(false)],
    ['si le navigateur ne le permet pas', () => { etat.proposee = false; }],
  ])('n’apparaît pas %s', (_, preparer) => {
    preparer();
    render(<InvitationInstallation />);
    expect(screen.queryByText(TITRE)).not.toBeInTheDocument();
  });

  test('sur iPhone, donne les consignes sans bouton d’installation', () => {
    Object.assign(etat, { iphone: true, proposee: false });
    render(<InvitationInstallation />);
    expect(screen.getByText(/touchez Partager/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Installer/ })).not.toBeInTheDocument();
  });

  test('« Plus tard » la fait taire, même à la visite suivante', async () => {
    const { unmount } = render(<InvitationInstallation />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByText(TITRE)).not.toBeInTheDocument();
    unmount();
    render(<InvitationInstallation />);
    expect(screen.queryByText(TITRE)).not.toBeInTheDocument();
  });

  test('le bouton lance l’installation', async () => {
    render(<InvitationInstallation />);
    await userEvent.setup().click(screen.getByRole('button', { name: /Installer/ }));
    expect(lancer).toHaveBeenCalledTimes(1);
  });
  describe('proposition de notifications', () => {
    const PROPOSITION = 'Recevoir vos notifications sur ce téléphone ?';

    test('apparaît une fois le site installé, et s’active en un clic', async () => {
      Object.assign(etat, { installee: true, possible: true });
      render(<InvitationInstallation />);
      await screen.findByText(PROPOSITION);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Activer' }));
      expect(activation).toHaveBeenCalledTimes(1);
    });

    test('jamais si la personne est déjà abonnée', async () => {
      Object.assign(etat, { installee: true, possible: true, abonnement: {} });
      render(<InvitationInstallation />);
      await new Promise((r) => { setTimeout(r, 20); });
      expect(screen.queryByText(PROPOSITION)).not.toBeInTheDocument();
    });

    test('aussi pour une personne qui avait autorisé sans abonnement', async () => {
      vi.stubGlobal('Notification', { permission: 'granted' });
      Object.assign(etat, { installee: true, possible: true });
      render(<InvitationInstallation />);
      expect(await screen.findByText(PROPOSITION)).toBeInTheDocument();
    });

    test('jamais si la permission a déjà été refusée', async () => {
      vi.stubGlobal('Notification', { permission: 'denied' });
      Object.assign(etat, { installee: true, possible: true });
      render(<InvitationInstallation />);
      await new Promise((r) => { setTimeout(r, 20); });
      expect(screen.queryByText(PROPOSITION)).not.toBeInTheDocument();
    });

    test('sur iPhone, seulement une fois sur l’écran d’accueil', async () => {
      Object.assign(etat, { iphone: true, proposee: false, possible: true });
      render(<InvitationInstallation />);
      await new Promise((r) => { setTimeout(r, 20); });
      expect(screen.queryByText(PROPOSITION)).not.toBeInTheDocument();
    });
  });
});
