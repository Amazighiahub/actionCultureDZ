import { describe, it, expect } from 'vitest';
import { estBlocPoeme, ressembleAPoeme } from '@/utils/poeme';
import { lireArticleImporte } from '@/utils/importArticle';

const vers = ['سطر أول قصير', 'سطر ثان', 'سطر ثالث هنا', 'سطر رابع', 'سطر خامس', 'سطر سادس', '', 'خاتمة'].join('\n');

describe('poèmes dans les articles', () => {
  it('reconnaît un bloc marqué « poème »', () => {
    expect(estBlocPoeme({ forme: 'poeme' })).toBe(true);
    expect(estBlocPoeme({ layout: 'centered' })).toBe(false);
    expect(estBlocPoeme(undefined)).toBe(false);
  });

  it('un texte en vers courts ressemble à un poème, pas un paragraphe', () => {
    expect(ressembleAPoeme(vers)).toBe(true);
    expect(ressembleAPoeme('Un seul long paragraphe de prose qui continue sans retour à la ligne.')).toBe(false);
    expect(ressembleAPoeme(Array(6).fill('Une ligne bien plus longue que quarante-cinq signes, comme de la prose.').join('\n'))).toBe(false);
    expect(ressembleAPoeme('')).toBe(false);
  });

  it('import : « forme: poeme » gardé, retours à la ligne conservés', () => {
    const a = lireArticleImporte(JSON.stringify({
      format: 'taladz-article', version: 1, langue: 'ar', titre: { ar: 'قصيدة' },
      blocs: [{ type: 'text', forme: 'poeme', texte: { ar: vers } }, { type: 'text', texte: { ar: 'نص' } }],
    }));
    expect(a.blocks[0].metadata?.forme).toBe('poeme');
    expect(String(a.blocks[0].contenu).split('\n')).toHaveLength(8);
    expect(a.blocks[1].metadata?.forme).toBeUndefined();
  });
});
