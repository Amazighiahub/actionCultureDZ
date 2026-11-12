/**
 * Petits outils de texte partagés (audit V11 COD-B17 à B19) : utils/texte.js et escapeHtml.
 */
const { sansAccent, nomComplet, sansInvisibles, texte } = require('../../utils/texte');
const { escapeHtml } = require('../../utils/sanitize');

describe('sansAccent', () => {
  it('retire les accents, met en minuscules et retire les espaces de bord', () => {
    expect(sansAccent('  Éditions Çà ÊTRE  ')).toBe('editions ca etre');
    expect(sansAccent('Bejaïa')).toBe('bejaia');
  });
  it('valeurs vides et non textuelles', () => {
    expect(sansAccent(null)).toBe('');
    expect(sansAccent(undefined)).toBe('');
    expect(sansAccent(0)).toBe('0');
  });
  it('garde les espaces intérieurs sauf avec { espaces: true }', () => {
    expect(sansAccent('a   b')).toBe('a   b');
    expect(sansAccent(' a \t  b\n', { espaces: true })).toBe('a b');
  });
  it('laisse l’arabe et les apostrophes tels quels', () => {
    expect(sansAccent('دار ثالا')).toBe('دار ثالا');
    expect(sansAccent('L’Île d\'Été')).toBe('l’ile d\'ete');
  });
});

describe('nomComplet', () => {
  it('prénom et nom, multilingues ou non', () => {
    expect(nomComplet({ prenom: 'Lina', nom: 'Exemple' })).toBe('Lina Exemple');
    expect(nomComplet({ prenom: { fr: 'Amina', ar: 'أمينة' }, nom: '{"fr":"Haddad"}' })).toBe('Amina Haddad');
  });
  it('parties vides omises ; rien → chaîne vide', () => {
    expect(nomComplet({ prenom: '', nom: 'Seul' })).toBe('Seul');
    expect(nomComplet({ prenom: 'Seule' })).toBe('Seule');
    expect(nomComplet(null)).toBe('');
    expect(nomComplet(undefined)).toBe('');
  });
});

describe('sansInvisibles et texte', () => {
  it('retire contrôles, sens forcé, largeur nulle et U+034F', () => {
    expect(sansInvisibles('a\u0007b\u202Ec\u200Bd\uFEFFe\u034Ff\u00ADg')).toBe('abcdefg');
  });
  it('garde les accents composés (seul U+034F est retiré parmi les marques)', () => {
    const e = 'e\u0301';
    expect(sansInvisibles(e)).toBe(e);
  });
  it('texte : vide → null, fins de ligne unifiées, espaces de bord retirés', () => {
    expect(texte(undefined, 10, 'X')).toBeNull();
    expect(texte(null, 10, 'X')).toBeNull();
    expect(texte('', 10, 'X')).toBeNull();
    expect(texte('  \u200B ', 10, 'X')).toBeNull();
    expect(texte(' a\r\nb\rc ', 10, 'X')).toBe('a\nb\nc');
    expect(texte('Mer\u034Fci', 10, 'X')).toBe('Merci');
  });
  it('texte : type ou longueur refusés avec le nom du champ (400)', () => {
    expect(() => texte(12, 10, 'Adresse')).toThrow('Adresse invalide');
    expect(() => texte('abcdef', 5, 'Adresse')).toThrow('Adresse : 5 caractères au plus');
    try { texte(12, 10, 'Adresse'); } catch (e) { expect(e.statusCode).toBe(400); }
  });
});

describe('escapeHtml', () => {
  it('échappe & < > " et l’apostrophe', () => {
    expect(escapeHtml('<a href="x">Tom & Jerry\'s</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#x27;s&lt;/a&gt;');
  });
  it('null / undefined → vide ; nombres convertis (0 compris)', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(42)).toBe('42');
  });
  it('n’échappe pas deux fois ce qu’on lui donne une fois', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});
