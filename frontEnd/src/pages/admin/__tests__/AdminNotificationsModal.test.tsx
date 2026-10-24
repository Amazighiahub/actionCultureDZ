/**
 * AdminNotificationsModal — message à une seule personne : l'administration voit le résultat
 * réel de l'e-mail (envoyé, refusé par le serveur d'envoi avec la raison, ou envoi en pause).
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockBroadcast, mockToast } = vi.hoisted(() => ({ mockBroadcast: vi.fn(), mockToast: vi.fn() }));

vi.mock('@/services/admin.service', () => ({ adminService: { broadcastNotification: mockBroadcast } }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const texte = typeof fallback === 'string' ? fallback : (fallback?.defaultValue as string) ?? key;
      const valeurs = typeof fallback === 'object' ? fallback : opts;
      return texte.replace(/\{\{(\w+)\}\}/g, (_, k) => String(valeurs?.[k] ?? ''));
    },
    i18n: { language: 'fr' },
  }),
}));

import AdminNotificationsModal from '../AdminNotificationsModal';

const envoyer = async () => {
  render(<AdminNotificationsModal isOpen onClose={vi.fn()} targetType="user" targetId={7} targetName="Smail" />);
  fireEvent.change(screen.getByLabelText(/admin.notifications.form.title/), { target: { value: 'Test' } });
  fireEvent.change(screen.getByLabelText(/admin.notifications.form.message/), { target: { value: 'Bonjour' } });
  fireEvent.submit(document.querySelector('form')!);
};

describe('AdminNotificationsModal — une seule personne', () => {
  beforeEach(() => { mockBroadcast.mockReset(); mockToast.mockReset(); });

  test('envoyé à cette personne seulement ; « E-mail envoyé » quand le serveur d’envoi accepte', async () => {
    mockBroadcast.mockResolvedValue({ success: true, data: { notified: 1, email: { etat: 'actif', envoye: true, erreur: null } } });
    await envoyer();
    await waitFor(() => expect(mockBroadcast).toHaveBeenCalledWith(expect.objectContaining({ target: 'user', targetUserId: 7, sendEmail: true })));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'E-mail envoyé' }));
  });

  test('refus du serveur d’envoi : message rouge avec la raison', async () => {
    mockBroadcast.mockResolvedValue({ success: true, data: { notified: 1, email: { etat: 'actif', envoye: false, erreur: '535 Authentication failed' } } });
    await envoyer();
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'E-mail non envoyé', variant: 'destructive',
      description: 'Refusé par le serveur d’envoi : 535 Authentication failed'
    })));
  });

  test('envoi en pause sur le serveur : « Aucun e-mail n’est parti »', async () => {
    mockBroadcast.mockResolvedValue({ success: true, data: { notified: 1, email: { etat: 'pause', envoye: false, raison: 'pause' } } });
    await envoyer();
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Aucun e-mail n’est parti', variant: 'destructive' })));
  });
});
