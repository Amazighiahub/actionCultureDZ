/**
 * Textes multilingues : le tamazight compte comme les autres langues (affichage et « rempli »).
 */
import { describe, it, expect } from 'vitest';
import { getLocalizedText, aDuTexte, ordreLangues } from '../getLocalizedText';

describe('getLocalizedText', () => {
  it('la langue demandée d’abord, puis français, arabe, anglais', () => {
    const v = { fr: 'Les origines', ar: 'الأصول', en: 'Origins' };
    expect(getLocalizedText(v, 'ar')).toBe('الأصول');
    expect(getLocalizedText(v, 'tz-ltn')).toBe('Les origines');
  });

  it('un texte écrit seulement en tamazight s’affiche pour tous', () => {
    expect(getLocalizedText({ fr: '', 'tz-ltn': 'Tiẓuri n Tkukt' }, 'fr')).toBe('Tiẓuri n Tkukt');
    expect(getLocalizedText({ 'tz-tfng': 'ⵜⴽⵓⴽⵜ' }, 'ar')).toBe('ⵜⴽⵓⴽⵜ');
  });

  it('lecteur en tifinagh : le tamazight latin passe avant le français, et inversement', () => {
    const v = { fr: 'Tkout', 'tz-ltn': 'Tkukt' };
    expect(getLocalizedText(v, 'tz-tfng')).toBe('Tkukt');
    expect(ordreLangues('tz-ltn').slice(0, 2)).toEqual(['tz-ltn', 'tz-tfng']);
  });

  it('texte simple, vide ou absent', () => {
    expect(getLocalizedText('Tkout', 'ar')).toBe('Tkout');
    expect(getLocalizedText({ fr: '  ', ar: '' }, 'fr', '—')).toBe('—');
    expect(getLocalizedText(null, 'fr', '—')).toBe('—');
  });
});

describe('aDuTexte', () => {
  it('rempli dans au moins une langue, tamazight compris', () => {
    expect(aDuTexte({ fr: '', ar: '', 'tz-tfng': 'ⵜⴰⵎⵓⵔⵜ' })).toBe(true);
    expect(aDuTexte({ fr: ' ', ar: '' })).toBe(false);
    expect(aDuTexte('texte')).toBe(true);
    expect(aDuTexte(undefined)).toBe(false);
  });
});
