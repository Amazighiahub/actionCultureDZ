/**
 * Anti-retour (2026-11-27) : en modification, une langue qui avait un texte et que la personne a vidée
 * est envoyée à null (le serveur l'efface) ; une langue jamais remplie n'est pas envoyée.
 */
import { describe, test, expect } from 'vitest';
import { avecEffacements } from '../effacementLangues';

describe('avecEffacements', () => {
  test('langue vidée → null ; remplie → gardée ; jamais remplie → absente', () => {
    expect(avecEffacements({ fr: 'Ouvert', ar: '', en: '  ' }, { fr: 'Ancien', ar: 'قديم', en: '' }))
      .toEqual({ fr: 'Ouvert', ar: null });
  });
  test('sans texte chargé (création) : seulement les langues remplies', () => {
    expect(avecEffacements({ fr: 'Titre', ar: '' }, undefined)).toEqual({ fr: 'Titre' });
  });
});
