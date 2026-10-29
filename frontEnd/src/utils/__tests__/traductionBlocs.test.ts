import { describe, test, expect } from 'vitest';
import type { ArticleBlock } from '@/types/models/articles.types';
import { avancement, blocDansLaLangue, langueOrigine, languesTraduites } from '../traductionBlocs';

const bloc = (b: Partial<ArticleBlock> & { type_block: string }) => ({ ordre: 0, metadata: {}, ...b }) as unknown as ArticleBlock;

const paragraphe = bloc({ type_block: 'text', contenu: 'Les greniers des Aurès', metadata: { traductions: { ar: { contenu: 'مخازن الأوراس' } } } });
const liste = bloc({ type_block: 'list', contenu_json: ['Blé', 'Orge'], metadata: { traductions: { en: { contenu_json: ['Wheat', 'Barley'] } } } });
const tableau = bloc({ type_block: 'table', contenu_json: { headers: ['Lieu', 'Année'], rows: [['Ménaâ', '1930']] }, metadata: { traductions: { en: { contenu_json: { headers: ['Place', 'Year'], rows: [] } } } } });
const image = bloc({ type_block: 'image', metadata: { caption: 'Grenier collectif', traductions: { ar: { caption: 'مخزن جماعي' } } } });
const separateur = bloc({ type_block: 'separator' });

describe('Traduction des blocs d’un article', () => {
  test('un bloc s’affiche traduit ; sans traduction il garde son texte d’origine', () => {
    expect(blocDansLaLangue(paragraphe, 'ar').contenu).toBe('مخازن الأوراس');
    expect(blocDansLaLangue(paragraphe, 'en').contenu).toBe('Les greniers des Aurès');
    expect(blocDansLaLangue(liste, 'en').contenu_json).toEqual(['Wheat', 'Barley']);
    expect(blocDansLaLangue(image, 'ar').metadata?.caption).toBe('مخزن جماعي');
  });

  test('tableau : en-têtes traduits, lignes pas encore traduites → celles d’origine', () => {
    expect(blocDansLaLangue(tableau, 'en').contenu_json).toEqual({ headers: ['Place', 'Year'], rows: [['Ménaâ', '1930']] });
  });

  test('avancement : seuls les blocs avec du texte comptent', () => {
    const blocs = [paragraphe, liste, image, separateur];
    expect(avancement(blocs, 'ar')).toEqual({ faits: 2, total: 3 });
    expect(avancement(blocs, 'en')).toEqual({ faits: 1, total: 3 });
    expect(languesTraduites(blocs)).toEqual(['ar', 'en']);
  });

  test('langue d’origine : celle enregistrée, sinon devinée d’après l’écriture', () => {
    expect(langueOrigine([bloc({ type_block: 'text', contenu: 'Texte', metadata: { langue_origine: 'en' } })])).toBe('en');
    expect(langueOrigine([bloc({ type_block: 'text', contenu: 'مخازن الأوراس في الجزائر' })])).toBe('ar');
    expect(langueOrigine([bloc({ type_block: 'text', contenu: 'ⵜⵉⵇⵍⵉⵄⵉⵏ ⵏ ⵡⴰⵡⵔⴰⵙ' })])).toBe('tz-tfng');
    expect(langueOrigine([paragraphe], 'ar')).toBe('fr');
    expect(langueOrigine([], 'en')).toBe('en');
  });
});
