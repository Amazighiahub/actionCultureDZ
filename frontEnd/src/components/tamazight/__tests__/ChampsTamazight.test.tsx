/**
 * Anti-retour (2026-11-20) : encadré « Texte en tamazight ». Le partage ouvert n'est possible que pour un texte
 * écrit par une personne ; décocher « écrit par une personne » retire le partage ; rien n'est coché d'office.
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChampsTamazight from '../ChampsTamazight';
import { champsTamazightEnvoi, type ChampsTamazight as Champs } from '@/utils/tamazight';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

function Essai({ suivi }: { suivi: (v: Champs) => void }) {
  const [v, setV] = useState<Champs>({});
  return <ChampsTamazight valeurs={v} onChange={(x) => { setV(x); suivi(x); }} />;
}

describe('Texte en tamazight', () => {
  it('partage impossible tant que le texte n’est pas déclaré écrit par une personne ; retiré si on décoche', () => {
    const suivi = vi.fn();
    render(<Essai suivi={suivi} />);
    const humain = screen.getByRole('checkbox', { name: /écrits par des personnes/ });
    const partage = screen.getByRole('checkbox', { name: /partagés librement/ });
    expect(partage).toBeDisabled();
    expect(humain).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(humain);
    fireEvent.click(partage);
    expect(suivi).toHaveBeenLastCalledWith(expect.objectContaining({ ecrit_par_humain: true, partage_ouvert: true }));
    fireEvent.click(humain);
    expect(suivi).toHaveBeenLastCalledWith(expect.objectContaining({ ecrit_par_humain: false, partage_ouvert: false }));
  });

  it('envoi au serveur : seulement les champs remplis ; jamais de partage sans texte écrit par une personne', () => {
    expect(champsTamazightEnvoi({})).toEqual({});
    expect(champsTamazightEnvoi({ variante_amazighe: 'chaoui', ecrit_par_humain: true, partage_ouvert: true }))
      .toEqual({ variante_amazighe: 'chaoui', ecrit_par_humain: true, partage_ouvert: true });
    expect(champsTamazightEnvoi({ ecrit_par_humain: false, partage_ouvert: true })).toEqual({ ecrit_par_humain: false, partage_ouvert: false });
  });
});
