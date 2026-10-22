import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MotsClesInput from '../MotsClesInput';

const rendu = (value: string[], onChange = vi.fn()) => {
  render(<MotsClesInput id="mc" value={value} onChange={onChange} placeholder="Ajouter un mot-clé" addLabel="Ajouter" removeLabel={(t) => `Retirer ${t}`} />);
  return onChange;
};

describe('MotsClesInput', () => {
  test('Entrée ajoute, plusieurs mots séparés par des virgules, sans doublon (casse ignorée)', () => {
    const onChange = rendu(['Poterie']);
    const champ = screen.getByPlaceholderText('Ajouter un mot-clé');
    fireEvent.change(champ, { target: { value: 'conte, poterie, Béjaïa' } });
    fireEvent.keyDown(champ, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Poterie', 'conte', 'Béjaïa']);
  });

  test('le bouton « Ajouter » et la croix d’un mot-clé', () => {
    const onChange = rendu(['Poterie', 'Conte']);
    fireEvent.click(screen.getByLabelText('Retirer Conte'));
    expect(onChange).toHaveBeenCalledWith(['Poterie']);
    fireEvent.change(screen.getByPlaceholderText('Ajouter un mot-clé'), { target: { value: '  ' } });
    fireEvent.click(screen.getByLabelText('Ajouter'));
    expect(onChange).toHaveBeenCalledTimes(1); // rien à ajouter
  });
});
