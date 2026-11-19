/**
 * Anti-retour (2026-11-19, lot 3) : confirmation dans une fenêtre du site au lieu de window.confirm.
 * « Confirmer » répond oui, « Annuler » ou fermer répond non.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useConfirmation } from '../useConfirmation';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

function Essai({ onReponse }: { onReponse: (ok: boolean) => void }) {
  const { confirmer, fenetreConfirmation } = useConfirmation();
  return (
    <div>
      {fenetreConfirmation}
      <button onClick={async () => onReponse(await confirmer({ titre: 'Supprimer ce bloc ?', variante: 'destructive' }))}>agir</button>
    </div>
  );
}

describe('useConfirmation', () => {
  it('Confirmer répond oui, Annuler répond non', async () => {
    const reponses: boolean[] = [];
    render(<Essai onReponse={(ok) => reponses.push(ok)} />);
    fireEvent.click(screen.getByText('agir'));
    expect(await screen.findByText('Supprimer ce bloc ?')).toBeTruthy();
    fireEvent.click(screen.getByText('Confirmer'));
    await waitFor(() => expect(reponses).toEqual([true]));
    fireEvent.click(screen.getByText('agir'));
    await screen.findByText('Supprimer ce bloc ?');
    fireEvent.click(screen.getByText('Annuler'));
    await waitFor(() => expect(reponses).toEqual([true, false]));
  });
});
