import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { lireArticleImporte } from '../importArticle';
import { blocDansLaLangue } from '../traductionBlocs';

const minimal = (blocs: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({
  format: 'taladz-article', version: 1, langue: 'fr', titre: { fr: 'Titre', ar: 'عنوان' }, description: { fr: 'Chapeau' }, blocs, ...extra,
});

describe('importer un article', () => {
  it('texte d’origine + traduction arabe rangée dans le bloc', () => {
    const a = lireArticleImporte(minimal([
      { type: 'heading', niveau: 3, texte: { fr: 'Intertitre', ar: 'عنوان فرعي' } },
      { type: 'citation', texte: { fr: 'Citation', ar: 'اقتباس' }, auteur: { fr: 'Bozo', ar: 'بوزو' } },
      { type: 'image', legende: { fr: 'Légende', ar: 'تعليق' }, mise_en_page: 'full-width' },
      { type: 'list', elements: { fr: ['a', 'b'], ar: ['أ', 'ب'] } },
      { type: 'separator' },
    ], { tags: ['Aurès', 'Aurès', ' Bozo '] }));
    expect(a.blocks).toHaveLength(5);
    expect(a.images).toBe(1);
    expect(a.tags).toEqual(['Aurès', 'Bozo']);
    expect(a.blocks[0]).toMatchObject({ type_block: 'heading', contenu: 'Intertitre', metadata: { level: 3, langue_origine: 'fr' } });
    expect(blocDansLaLangue(a.blocks[0], 'ar').contenu).toBe('عنوان فرعي');
    expect(blocDansLaLangue(a.blocks[1], 'ar')).toMatchObject({ contenu: 'اقتباس' });
    expect(blocDansLaLangue(a.blocks[2], 'ar').metadata?.caption).toBe('تعليق');
    expect(blocDansLaLangue(a.blocks[3], 'ar').contenu_json).toEqual(['أ', 'ب']);
    expect(a.blocks.map(b => b.ordre)).toEqual([0, 1, 2, 3, 4]);
  });

  it('fichiers refusés avec un message clair', () => {
    expect(() => lireArticleImporte('pas du json')).toThrow(/illisible/);
    expect(() => lireArticleImporte(JSON.stringify({ format: 'autre' }))).toThrow(/taladz-article/);
    expect(() => lireArticleImporte(minimal([]))).toThrow(/aucun bloc/);
    expect(() => lireArticleImporte(minimal([{ type: 'embed', texte: { fr: '<iframe>' } }]))).toThrow(/non pris en charge/);
    expect(() => lireArticleImporte(minimal([{ type: 'text', texte: { ar: 'نص' } }]))).toThrow(/langue de l’article/);
    expect(() => lireArticleImporte(minimal([{ type: 'text', texte: { fr: 'x'.repeat(20001) } }]))).toThrow(/trop long/);
    expect(() => lireArticleImporte(minimal(Array.from({ length: 151 }, () => ({ type: 'separator' }))))).toThrow(/Trop de blocs/);
  });

  it('langues inconnues ignorées, pas d’attribut inattendu repris', () => {
    const a = lireArticleImporte(minimal([{ type: 'text', texte: { fr: 'Bonjour', xx: 'pirate' }, id_media: 99, onclick: 'x' }]));
    expect(a.blocks[0]).toEqual({ type_block: 'text', contenu: 'Bonjour', metadata: { langue_origine: 'fr' }, ordre: 0, visible: true });
  });

  const vrai = 'C:/Users/sabab/Downloads/article-hacene-makhlouf.taladz.json';
  it.runIf(existsSync(vrai))('l’article de Bozo se lit : 38 blocs, 4 images, arabe complet', () => {
    const a = lireArticleImporte(readFileSync(vrai, 'utf-8'));
    expect(a.blocks).toHaveLength(38);
    expect(a.images).toBe(4);
    expect(a.titre.ar).toContain('بوزو');
    const nonTraduits = a.blocks.filter(b => b.type_block !== 'separator' && !(b.metadata as any)?.traductions?.ar);
    expect(nonTraduits).toEqual([]);
  });
});
