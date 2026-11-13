import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MotifRefusDialog from '../MotifRefusDialog';
import { ajouterMotif } from '@/utils/motifsRefus';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

describe('fenêtre de refus avec motifs prêts', () => {
  it('ajouterMotif : à la ligne, sans doublon, sans effacer le texte', () => {
    expect(ajouterMotif('', 'A.')).toBe('A.');
    expect(ajouterMotif('Merci.  ', 'A.')).toBe('Merci.\nA.');
    expect(ajouterMotif('A.', 'A.')).toBe('A.');
  });

  it('un clic ajoute le motif ; le texte reste modifiable ; envoi du motif complet', async () => {
    const onConfirm = vi.fn();
    render(<MotifRefusDialog open onClose={vi.fn()} onConfirm={onConfirm} libelleBouton="Refuser l’événement" />);
    const bouton = screen.getByRole('button', { name: 'Refuser l’événement' });
    expect(bouton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Il manque des informations essentielles/ }));
    const zone = screen.getByLabelText('Motif') as HTMLTextAreaElement;
    expect(zone.value).toMatch(/^Il manque des informations essentielles/);
    fireEvent.change(zone, { target: { value: `${zone.value}\nAjoutez l’heure de début.` } });
    fireEvent.click(bouton);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.stringMatching(/essentielles.*\nAjoutez l’heure de début\.$/s)));
  });
});
