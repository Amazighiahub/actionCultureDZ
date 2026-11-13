import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TouchesTamazight, { insererAuCurseur } from '../TouchesTamazight';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string, o?: Record<string, string>) => String(d ?? _k).replace(/\{\{(\w+)\}\}/g, (_m, c) => o?.[c] ?? '') })
}));

function Champ({ ecriture, depart = '' }: { ecriture: 'tz-ltn' | 'tz-tfng'; depart?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [v, setV] = useState(depart);
  return (
    <>
      <input aria-label="nom" ref={ref} value={v} onChange={(e) => setV(e.target.value)} />
      <TouchesTamazight ecriture={ecriture} cible={ref} valeur={v} onChange={setV} />
    </>
  );
}

describe('barre de lettres tamazight', () => {
  it('insère à la place de la sélection', () => {
    expect(insererAuCurseur('Tiziri', 2, 2, 'ɣ')).toEqual({ valeur: 'Tiɣziri', curseur: 3 });
    expect(insererAuCurseur('abc', 1, 2, 'ɛ')).toEqual({ valeur: 'aɛc', curseur: 2 });
    expect(insererAuCurseur('abc', 99, 99, 'ḍ')).toEqual({ valeur: 'abcḍ', curseur: 4 });
  });

  it('latin : ɛ latin (U+025B, pas ε grec), insertion au curseur, majuscules', async () => {
    render(<Champ ecriture="tz-ltn" depart="Agrw" />);
    const champ = screen.getByLabelText('nom') as HTMLInputElement;
    champ.setSelectionRange(1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Insérer ɛ' }));
    expect(champ.value).toBe('Aɛgrw');
    expect('ɛ'.codePointAt(0)).toBe(0x025b);
    fireEvent.click(screen.getByRole('button', { name: 'Maj.' }));
    expect(screen.getByRole('button', { name: 'Insérer Ɣ' })).toBeInTheDocument();
  });

  it('tifinagh : alphabet IRCAM avec labiovélaires ; repli mémorisé', async () => {
    render(<Champ ecriture="tz-tfng" />);
    expect(screen.getAllByRole('button', { name: /^Insérer / })).toHaveLength(33);
    fireEvent.click(screen.getByRole('button', { name: 'Insérer ⴳⵯ' }));
    expect((screen.getByLabelText('nom') as HTMLInputElement).value).toBe('ⴳⵯ');
    fireEvent.click(screen.getByRole('button', { name: /Lettres tifinagh/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Insérer ⴰ' })).not.toBeInTheDocument());
    // (le choix est aussi gardé dans le navigateur ; le stockage est simulé dans les tests)
  });
});
