/**
 * Réparation des textes doublement encodés (UTF-8 relu en latin1/cp1252)
 */
const { looksDoubleEncoded, fixMojibake } = require('../../scripts/fix-encoding-mojibake');

// Reproduit l'abîmage : octets UTF-8 relus en Windows-1252
const garble = (s) => new TextDecoder('windows-1252').decode(Buffer.from(s, 'utf8'));

describe('fix-encoding-mojibake', () => {
  it.each([
    'Écologie',
    'Épouvante et terreur',
    'À la une',
    'Ça commence',
    'Être et paraître',
    'Œuvre',
    'Sciences écologiques',
    'Enquêtes et mystères',
    'L’histoire — « suite »…',
  ])('répare %s', (original) => {
    const broken = garble(original);
    expect(broken).not.toBe(original);
    expect(looksDoubleEncoded(broken)).toBe(true);
    expect(fixMojibake(broken)).toBe(original);
  });

  it('répare le cas signalé : Ã‰cologie', () => {
    expect(fixMojibake('Ã‰cologie')).toBe('Écologie');
  });

  it.each([
    'Écologie',
    'Tlemcen',
    'Béjaïa',
    'تلمسان',
    'ⵜⴰⵍⴰ',
    'Prix : 100 €',
  ])('laisse intact un texte correct : %s', (texte) => {
    expect(looksDoubleEncoded(texte)).toBe(false);
    expect(fixMojibake(texte)).toBe(texte);
  });

  it('laisse intact un texte qui ressemble à du mojibake sans en être (UTF-8 invalide)', () => {
    // "Ã©" est bien un motif suspect, mais "ÃÃ©" ne se décode pas en UTF-8 valide
    expect(fixMojibake('ÃÃ©t')).toBe('ÃÃ©t');
  });

  it('ignore les valeurs non textuelles', () => {
    expect(fixMojibake(null)).toBe(null);
    expect(fixMojibake(42)).toBe(42);
  });
});
