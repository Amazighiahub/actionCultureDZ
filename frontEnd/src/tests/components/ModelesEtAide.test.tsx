import { describe, it, expect } from 'vitest';
import { blocsDuModele, estBlocVide } from '@/components/article/ModelesEtAide';
import type { ArticleBlock } from '@/types/models/articles.types';

const t = (_cle: string, defaut: string) => defaut;

describe('modèles d’article', () => {
  it('chaque modèle donne des blocs vides avec une consigne, dans l’ordre', () => {
    for (const m of ['poeme', 'portrait', 'evenement', 'lieu'] as const) {
      const blocs = blocsDuModele(m, t);
      expect(blocs.length).toBeGreaterThanOrEqual(3);
      blocs.forEach((b, i) => {
        expect(b.ordre).toBe(i);
        expect(String(b.metadata?.indication || '')).not.toBe('');
        expect(estBlocVide(b)).toBe(true);
      });
    }
  });

  it('poème : image à gauche puis texte en style poème', () => {
    const [image, texte] = blocsDuModele('poeme', t);
    expect(image.type_block).toBe('image');
    expect(image.metadata?.layout).toBe('float-left');
    expect(texte.metadata?.forme).toBe('poeme');
  });
});

describe('blocs vides (ignorés à l’enregistrement)', () => {
  const b = (x: Partial<ArticleBlock>) => ({ type_block: 'text', contenu: '', ...x } as ArticleBlock);
  it('texte vide ou fait d’espaces : vide ; texte écrit : gardé', () => {
    expect(estBlocVide(b({ contenu: '   \n ' }))).toBe(true);
    expect(estBlocVide(b({ contenu: 'كمن يبحث' }))).toBe(false);
  });
  it('image : vide sans photo ; gardée avec une photo enregistrée ou en attente d’envoi', () => {
    expect(estBlocVide(b({ type_block: 'image' }))).toBe(true);
    expect(estBlocVide(b({ type_block: 'image', id_media: 5 }))).toBe(false);
    expect(estBlocVide(b({ type_block: 'image', metadata: { tempFile: new File(['x'], 'a.jpg') } }))).toBe(false);
  });
  it('liste vide : vide ; séparateur : gardé', () => {
    expect(estBlocVide(b({ type_block: 'list', contenu_json: ['', ' '] }))).toBe(true);
    expect(estBlocVide(b({ type_block: 'list', contenu_json: ['un'] }))).toBe(false);
    expect(estBlocVide(b({ type_block: 'separator' }))).toBe(false);
  });
});
