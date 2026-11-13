import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const uploadVoix = vi.fn();
vi.mock('@/services/patrimoine.service', () => ({ patrimoineService: { uploadVoix: (...a: unknown[]) => uploadVoix(...a) } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string, o?: Record<string, unknown>) => d.replace(/\{\{(\w+)\}\}/g, (_m, n) => String(o?.[n] ?? '')) }),
}));

import EnregistreurVoix from '../EnregistreurVoix';

// Faux micro et faux enregistreur : stop() renvoie un petit morceau de son
const arretPiste = vi.fn();
class FauxEnregistreur {
  static isTypeSupported = (t: string) => t.startsWith('audio/webm');
  state = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_s: unknown, o?: { mimeType?: string }) { this.mimeType = o?.mimeType || ''; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['son'], { type: 'audio/webm' }) }); this.onstop?.(); }
}

describe('enregistrer une voix depuis le téléphone', () => {
  beforeEach(() => {
    uploadVoix.mockReset().mockResolvedValue({ success: true, data: [{ id: 9, type: 'audio', url: 'u', langue: 'tz-ltn' }] });
    vi.stubGlobal('MediaRecorder', FauxEnregistreur);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: arretPiste }] }) },
    });
    URL.createObjectURL = vi.fn(() => 'blob:ecoute');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('enregistre, libère le micro, puis n’envoie qu’avec l’accord coché', async () => {
    const onEnvoye = vi.fn();
    render(<EnregistreurVoix lieuId={4} langue="tz-ltn" onEnvoye={onEnvoye} />);
    fireEvent.click(screen.getByText('Enregistrer'));
    await screen.findByText('Arrêter');
    fireEvent.click(screen.getByText('Arrêter'));
    expect(arretPiste).toHaveBeenCalled();

    const envoyer = await screen.findByRole('button', { name: /Envoyer la voix/ });
    expect((envoyer as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Variante parlée (facultatif)'), { target: { value: 'chaoui de Ghoufi' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect((envoyer as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { fireEvent.click(envoyer); });

    await waitFor(() => expect(uploadVoix).toHaveBeenCalledTimes(1));
    const [lieu, fichier, voix] = uploadVoix.mock.calls[0];
    expect(lieu).toBe(4);
    expect((fichier as File).type).toBe('audio/webm');
    expect(voix).toMatchObject({ langue: 'tz-ltn', parler: 'chaoui de Ghoufi' });
    expect(onEnvoye).toHaveBeenCalledWith([expect.objectContaining({ id: 9 })]);
  });

  it('micro refusé : message clair', async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(new DOMException('non', 'NotAllowedError'));
    render(<EnregistreurVoix lieuId={4} langue="fr" onEnvoye={vi.fn()} />);
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/micro n’est pas autorisé/);
  });

  it('navigateur sans enregistrement : rien n’est affiché', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const { container } = render(<EnregistreurVoix lieuId={4} langue="fr" onEnvoye={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
