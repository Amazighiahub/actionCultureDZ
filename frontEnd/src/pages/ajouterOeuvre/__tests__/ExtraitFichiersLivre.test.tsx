import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExtraitFichiersLivre, { TAILLE_MAX_EXTRAIT } from '../ExtraitFichiersLivre';
import { extraitsFichiers } from '@/components/oeuvre/HeroLivre';

const toast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : _k) }),
}));
vi.mock('@/services/httpClient', () => ({ httpClient: { delete: vi.fn(async () => ({ success: true })) } }));

const fichier = (nom: string, type: string, taille: number) => {
  const f = new File(['x'], nom, { type });
  Object.defineProperty(f, 'size', { value: taille });
  return f;
};

describe('extrait du livre en PDF et en audio', () => {
  it('un PDF de taille correcte est choisi ; trop gros ou mauvais type : refusé', async () => {
    const onChoisir = vi.fn();
    render(<ExtraitFichiersLivre enregistres={{}} choisis={{}} onChoisir={onChoisir} onRetire={vi.fn()} />);
    const champ = document.getElementById('extrait-pdf') as HTMLInputElement;
    fireEvent.change(champ, { target: { files: [fichier('e.pdf', 'application/pdf', 1000)] } });
    await waitFor(() => expect(onChoisir).toHaveBeenCalledWith('pdf', expect.any(File)));
    onChoisir.mockClear();
    fireEvent.change(champ, { target: { files: [fichier('g.pdf', 'application/pdf', TAILLE_MAX_EXTRAIT.pdf + 1)] } });
    fireEvent.change(document.getElementById('extrait-audio') as HTMLInputElement, { target: { files: [fichier('e.pdf', 'application/pdf', 1000)] } });
    expect(onChoisir).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('audio : plus de 8 minutes refusé, moins accepté', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:essai');
    URL.revokeObjectURL = vi.fn();
    let duree = 9 * 60;
    const creer = document.createElement.bind(document);
    const espion = vi.spyOn(document, 'createElement').mockImplementation(((nom: string) => {
      if (nom !== 'audio') return creer(nom);
      const son: Record<string, unknown> = { duration: duree };
      Object.defineProperty(son, 'src', { set() { setTimeout(() => (son.onloadedmetadata as () => void)()); } });
      return son as unknown as HTMLElement;
    }) as typeof document.createElement);
    const onChoisir = vi.fn();
    toast.mockClear();
    render(<ExtraitFichiersLivre enregistres={{}} choisis={{}} onChoisir={onChoisir} onRetire={vi.fn()} />);
    const champ = document.getElementById('extrait-audio') as HTMLInputElement;
    fireEvent.change(champ, { target: { files: [fichier('long.mp3', 'audio/mpeg', 1000)] } });
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(onChoisir).not.toHaveBeenCalled();
    duree = 7 * 60;
    fireEvent.change(champ, { target: { files: [fichier('court.mp3', 'audio/mpeg', 1000)] } });
    await waitFor(() => expect(onChoisir).toHaveBeenCalledWith('audio', expect.any(File)));
    espion.mockRestore();
  });

  it('un extrait déjà en ligne peut être retiré', () => {
    render(<ExtraitFichiersLivre oeuvreId={5} enregistres={{ pdf: { id_media: 3, url: 'https://example.com/e.pdf', type_media: 'document' } }}
      choisis={{}} onChoisir={vi.fn()} onRetire={vi.fn()} />);
    expect(screen.getByText('Voir l’extrait en ligne')).toBeTruthy();
    expect(screen.getByText('Retirer')).toBeTruthy();
  });

  it('la page du livre retrouve le PDF et l’audio désignés par la fiche', () => {
    const medias = [{ id_media: 1, url: 'https://example.com/c.jpg' }, { id_media: 2, url: 'https://example.com/e.pdf' }, { id_media: 3, url: 'https://example.com/l.mp3' }];
    expect(extraitsFichiers({ Livre: { id_media_extrait_pdf: 2, id_media_extrait_audio: 3 } }, medias)).toEqual({ pdf: medias[1], audio: medias[2] });
    expect(extraitsFichiers({ Livre: null }, medias)).toEqual({ pdf: null, audio: null });
    expect(extraitsFichiers(undefined, medias)).toEqual({ pdf: null, audio: null });
  });
});
