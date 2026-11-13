import { describe, it, expect } from 'vitest';
import { citationApa, citationBibtex, citationChicago } from '../citation';

const jour = new Date('2026-11-13T10:00:00Z');
const source = { cle: 'oeuvre_51', titre: 'Patrimoine de Constantine', annee: 2019, url: 'https://taladz.com/oeuvres/51-patrimoine-de-constantine' };

describe('Citer cette page', () => {
  it('APA : année, titre, site, date de consultation, adresse ; « s. d. » sans année', () => {
    expect(citationApa(source, 'fr', jour)).toBe('(2019). Patrimoine de Constantine. Tala DZ. Consulté le 13 novembre 2026, https://taladz.com/oeuvres/51-patrimoine-de-constantine');
    expect(citationApa({ ...source, annee: null, auteur: 'Radia Gouga' }, 'fr', jour)).toMatch(/^Radia Gouga\. \(s\. d\.\)\. /);
    expect(citationApa({ ...source, annee: null }, 'en', jour)).toMatch(/^\(n\.d\.\)\. .* Accessed 13 November 2026/);
  });

  it('Chicago : guillemets selon la langue', () => {
    expect(citationChicago(source, 'fr', jour)).toBe('« Patrimoine de Constantine. » Tala DZ. 2019. Consulté le 13 novembre 2026. https://taladz.com/oeuvres/51-patrimoine-de-constantine.');
    expect(citationChicago(source, 'en', jour)).toMatch(/^“Patrimoine de Constantine\.” Tala DZ\. 2019\. Accessed/);
  });

  it('BibTeX : clé propre, caractères LaTeX neutralisés, date de consultation ISO', () => {
    const b = citationBibtex({ ...source, titre: 'Arts & métiers {2} 50%' }, jour);
    expect(b).toContain('@misc{taladz_oeuvre_51,');
    const bs = String.fromCharCode(92);
    expect(b).toContain(`title = {Arts ${bs}& métiers 2 50${bs}%},`);
    expect(b).toContain('urldate = {2026-11-13}');
    expect(b).not.toContain('author');
  });
});
