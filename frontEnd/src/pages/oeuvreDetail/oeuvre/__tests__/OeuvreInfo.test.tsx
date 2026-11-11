/**
 * Fiche œuvre : pas d'information répétée (audit V11 UX-18).
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Oeuvre } from '@/types/models/oeuvre.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => {
      if (typeof d === 'string') return d;
      const o = d as { count?: number; defaultValue?: string; defaultValue_one?: string; defaultValue_other?: string } | undefined;
      const modele = o?.count === 1 ? (o.defaultValue_one ?? o.defaultValue) : (o?.defaultValue_other ?? o?.defaultValue);
      return (modele ?? k).replace('{{count}}', String(o?.count ?? ''));
    },
    i18n: { language: 'fr' },
  }),
}));

import OeuvreInfo from '../OeuvreInfo';

const livre = (champs: Record<string, unknown> = {}) => ({
  id_oeuvre: 1,
  titre: { fr: 'Le Fils du pauvre' },
  description: { fr: 'Roman de Mouloud Feraoun.', ar: 'رواية لمولود فرعون.' },
  Livre: { isbn: '978-9961-0-1234-5', nb_pages: 1 },
  ...champs,
}) as unknown as Oeuvre;

const afficher = (oeuvre: Oeuvre, descriptionDansEnTete = false) =>
  render(<MemoryRouter><OeuvreInfo oeuvre={oeuvre} descriptionDansEnTete={descriptionDansEnTete} /></MemoryRouter>);

describe('OeuvreInfo : rien de répété', () => {
  test('résumé identique à la description (autre objet, même texte) : affiché une seule fois', () => {
    // Deux objets distincts de même contenu : l'ancienne comparaison par référence les jugeait « différents »
    afficher(livre({ resume: { fr: 'Roman de Mouloud Feraoun.', ar: 'رواية لمولود فرعون.' } }));
    expect(screen.getAllByText('Roman de Mouloud Feraoun.')).toHaveLength(1);
    expect(screen.queryByText('Résumé')).not.toBeInTheDocument();
  });

  test('résumé différent de la description : les deux sont affichés', () => {
    afficher(livre({ resume: { fr: 'Un instituteur kabyle raconte son enfance.' } }));
    expect(screen.getByText('Roman de Mouloud Feraoun.')).toBeInTheDocument();
    expect(screen.getByText('Un instituteur kabyle raconte son enfance.')).toBeInTheDocument();
  });

  test('l’ISBN n’apparaît qu’une fois', () => {
    afficher(livre());
    expect(screen.getAllByText('978-9961-0-1234-5')).toHaveLength(1);
    expect(screen.getAllByText('ISBN')).toHaveLength(1);
  });

  test('description déjà dans l’en-tête : pas de carte « Description » répétée', () => {
    afficher(livre(), true);
    expect(screen.queryByText('Roman de Mouloud Feraoun.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Description' })).not.toBeInTheDocument();
  });

  test('nombre de pages accordé (1 page, pas « 1 pages »)', () => {
    afficher(livre());
    expect(screen.getByText('1 page')).toBeInTheDocument();
  });
});
