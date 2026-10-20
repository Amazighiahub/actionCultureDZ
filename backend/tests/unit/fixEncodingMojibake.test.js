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

  // Noms arabes des wilayas en production : « أدرار » stocké en « Ø£Ø¯Ø±Ø§Ø± »
  // (octets UTF-8 relus en CP1252). Les octets 0x80–0x9F prennent leur caractère CP1252.
  const CP1252 = { 128: 8364, 130: 8218, 131: 402, 132: 8222, 133: 8230, 134: 8224, 135: 8225, 136: 710, 137: 8240, 138: 352, 139: 8249, 140: 338, 142: 381, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 149: 8226, 150: 8211, 151: 8212, 152: 732, 153: 8482, 154: 353, 155: 8250, 156: 339, 158: 382, 159: 376 };
  const corrompre = (t) => Array.from(Buffer.from(t, 'utf8'))
    .map((octet) => String.fromCharCode(CP1252[octet] || octet))
    .join('');

  it("répare l'arabe corrompu (noms de wilaya en production)", () => {
    for (const nom of ['أدرار', 'الشلف', 'الأغواط', 'باتنة', 'تيمقاد']) {
      const abime = corrompre(nom);
      expect(looksDoubleEncoded(abime)).toBe(true);
      expect(fixMojibake(abime)).toBe(nom);
    }
    // Exemple réel relevé sur taladz.com
    expect(fixMojibake('Ø£Ø¯Ø±Ø§Ø±')).toBe('أدرار');
  });

  it('répare le tifinagh corrompu', () => {
    const t = 'ⵜⴰⵎⴰⵣⵉⵖⵜ';
    expect(fixMojibake(corrompre(t))).toBe(t);
  });

  it('ne touche jamais un texte arabe ou tifinagh correct', () => {
    for (const ok of ['أدرار', 'تيمقاد', 'ⵜⴰⵎⴰⵣⵉⵖⵜ', 'Tamaziɣt']) {
      expect(looksDoubleEncoded(ok)).toBe(false);
      expect(fixMojibake(ok)).toBe(ok);
    }
  });
});
