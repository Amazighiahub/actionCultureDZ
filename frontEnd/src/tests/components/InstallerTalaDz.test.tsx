/**
 * Bouton « Installer Tala DZ » du pied de page : toujours visible sur téléphone, même si le navigateur
 * ne propose rien (Facebook, première visite) ; il donne alors les gestes à faire.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const etat = vi.hoisted(() => ({ proposee: false, iphone: false, installee: false, telephone: true }));
const lancer = vi.hoisted(() => vi.fn(async () => true));

vi.mock('@/utils/applicationMobile', () => ({
  estInstallee: () => etat.installee,
  estIphone: () => etat.iphone,
  installationProposee: () => etat.proposee,
  lancerInstallation: lancer,
  suivreInstallation: () => () => undefined,
  surTelephone: () => etat.telephone,
}));
vi.mock('@/components/shared', () => ({
  ConfirmDialog: ({ open, description }: { open: boolean; description: string }) => (open ? <p>{description}</p> : null),
}));
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (_: string, d?: string) => d || _, i18n: { language: 'fr' } }),
}));

import { InstallerTalaDz } from '@/components/shared/PiedDePageApplication';

const BOUTON = { name: 'Installer Tala DZ' };

beforeEach(() => {
  lancer.mockClear();
  Object.assign(etat, { proposee: false, iphone: false, installee: false, telephone: true });
});

describe('bouton Installer Tala DZ', () => {
  test('Android sans proposition du navigateur : bouton visible, il donne les gestes', async () => {
    render(<InstallerTalaDz />);
    await userEvent.click(screen.getByRole('button', BOUTON));
    expect(lancer).not.toHaveBeenCalled();
    expect(screen.getByText(/trois points/)).toBeInTheDocument();
  });

  test('iPhone : donne les gestes de Safari', async () => {
    etat.iphone = true;
    render(<InstallerTalaDz />);
    await userEvent.click(screen.getByRole('button', BOUTON));
    expect(screen.getByText(/Partager/)).toBeInTheDocument();
  });

  test('le navigateur propose : le bouton lance l’installation', async () => {
    etat.proposee = true;
    render(<InstallerTalaDz />);
    await userEvent.click(screen.getByRole('button', BOUTON));
    expect(lancer).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['déjà installé', () => { etat.installee = true; }],
    ['ordinateur sans proposition', () => { etat.telephone = false; }],
  ])('caché : %s', (_, preparer) => {
    preparer();
    render(<InstallerTalaDz />);
    expect(screen.queryByRole('button', BOUTON)).not.toBeInTheDocument();
  });
});
