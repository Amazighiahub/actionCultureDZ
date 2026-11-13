import { describe, it, expect } from 'vitest';
import { lienGuidePour } from '../lienGuide';

describe('lienGuidePour', () => {
  it('page du sujet, en arabe si le site est en arabe, en français sinon (pas de guide en/tz)', () => {
    expect(lienGuidePour('evenement', 'fr')).toBe('/guide/evenement');
    expect(lienGuidePour('evenement', 'ar')).toBe('/guide/ar/evenement');
    expect(lienGuidePour('oeuvre', 'tz-ltn')).toBe('/guide/oeuvre');
    expect(lienGuidePour('service', 'en')).toBe('/guide/service');
  });

  it('« lieu » = accueil du guide ; ancre facultative', () => {
    expect(lienGuidePour('lieu', 'fr')).toBe('/guide');
    expect(lienGuidePour('lieu', 'ar', 'enrichir')).toBe('/guide/ar#enrichir');
  });
});
