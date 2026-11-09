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

describe('styles de texte et colonnes', () => {
  it('classes de la page publiée selon la forme et les colonnes', async () => {
    const { classesBlocTexte, formeDuBloc } = await import('@/utils/poeme');
    expect(classesBlocTexte({ forme: 'proverbe' })).toBe('mag-proverbe');
    expect(classesBlocTexte({ forme: 'encadre', colonnes: 2 })).toBe('mag-encadre mag-deux-colonnes');
    expect(classesBlocTexte({ colonnes: '2' })).toBe('mag-deux-colonnes');
    expect(classesBlocTexte({ forme: 'inconnue' })).toBe('');
    expect(formeDuBloc({ forme: '<script>' })).toBeNull();
  });

  it('import : proverbe, encadré et deux colonnes gardés ; forme inconnue ignorée', () => {
    const a = lireArticleImporte(JSON.stringify({
      format: 'taladz-article', version: 1, langue: 'fr', titre: { fr: 'Titre' },
      blocs: [
        { type: 'text', forme: 'proverbe', texte: { fr: 'Qui sème le vent…' } },
        { type: 'text', forme: 'encadre', colonnes: 2, texte: { fr: 'Note' } },
        { type: 'text', forme: 'n-importe-quoi', texte: { fr: 'Texte' } },
      ],
    }));
    expect(a.blocks[0].metadata?.forme).toBe('proverbe');
    expect(a.blocks[1].metadata?.forme).toBe('encadre');
    expect(a.blocks[1].metadata?.colonnes).toBe(2);
    expect(a.blocks[2].metadata?.forme).toBeUndefined();
  });
});
