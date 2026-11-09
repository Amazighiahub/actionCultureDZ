/**
 * Texte des blocs d'articles : les caractères de l'auteur gardés (« & », « < », « > », guillemets « << >> »),
 * les balises HTML retirées (le site affiche ce texte comme du texte, jamais comme du HTML).
 */
const { sanitizeBlockContent } = require('../../utils/sanitizeArticle');
const { _reparer } = require('../../migrations/20261209-texte-blocs-caracteres');

describe('texte des blocs : caractères gardés', () => {
  it.each([
    ['Arts & Culture', 'Arts & Culture'],
    ['x < y et y > z', 'x < y et y > z'],
    ['<<Guillemets>>', '<<Guillemets>>'],
    ['prix < 500 DA', 'prix < 500 DA'],
    ['<3 merci', '<3 merci'],
    ['سطر أول\nسطر ثان\n\nمقطع', 'سطر أول\nسطر ثان\n\nمقطع'],
    ['« guillemets » et "doubles" l\'apostrophe', '« guillemets » et "doubles" l\'apostrophe'],
  ])('%s', (entree, attendu) => {
    for (const type of ['text', 'heading', 'citation']) expect(sanitizeBlockContent(type, entree)).toBe(attendu);
  });
});

describe('texte des blocs : balises retirées', () => {
  it.each([
    ['avant<script>alert(1)</script>après', 'avantalert(1)après'],
    ['<img src=x onerror=alert(1)>texte', 'texte'],
    ['<scr<script>ipt>alert(1)</script>', 'alert(1)'],
    ['<!-- note -->ok', 'ok'],
    ['<a href="javascript:x">lien</a>', 'lien'],
    ['< b >gras</ b >', 'gras'],
    ['<IMG\nSRC=x>maj', 'maj'],
    ['<svg onload=alert(1)>x</svg>', 'x'],
    ['<iframe src="https://exemple.invalid"></iframe>fin', 'fin'],
  ])('%s', (entree, attendu) => {
    expect(sanitizeBlockContent('text', entree)).toBe(attendu);
  });
});

describe('réparation des textes déjà enregistrés', () => {
  it('« &amp; », « &lt; », « &gt; » redeviennent « & », « < », « > »', () => {
    expect(_reparer('Arts &amp; Culture, x &lt; y &gt; z')).toBe('Arts & Culture, x < y > z');
    expect(_reparer('écrit : &amp;lt;')).toBe('écrit : &lt;');
    expect(_reparer('rien à réparer')).toBe('rien à réparer');
  });
});
