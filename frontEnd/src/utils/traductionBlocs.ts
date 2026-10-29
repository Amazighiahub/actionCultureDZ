/**
 * Traduction du contenu d'un article, bloc par bloc.
 *
 * Le texte d'origine reste dans le bloc (contenu, contenu_json, légende…) ; chaque traduction est
 * rangée dans metadata.traductions[langue] avec les mêmes champs. Les images, vidéos et la mise en
 * page sont communes à toutes les langues : seul le texte est traduit.
 * À l'affichage, un bloc sans traduction dans la langue demandée garde son texte d'origine.
 */
import type { ArticleBlock } from '@/types/models/articles.types';

export const LANGUES_ARTICLE = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'] as const;

/** Traduction d'un bloc dans une langue (mêmes champs que le bloc) */
export interface TraductionBloc {
  contenu?: string;
  contenu_json?: string[] | { headers: string[]; rows: string[][] };
  caption?: string;
  author?: string;
}

/**
 * Langue du texte d'origine : celle enregistrée avec les blocs (metadata.langue_origine), sinon
 * devinée d'après l'écriture (articles écrits avant la traduction), sinon la langue proposée.
 */
export function langueOrigine(blocks: ArticleBlock[], parDefaut = 'fr'): string {
  const enregistree = blocks.map(b => b.metadata?.langue_origine).find(Boolean);
  if (enregistree && (LANGUES_ARTICLE as readonly string[]).includes(enregistree)) return enregistree;
  const texte = blocks.map(b => b.contenu || '').join(' ');
  if (!texte.trim()) return parDefaut;
  const compte = (re: RegExp) => (texte.match(re) || []).length;
  const arabe = compte(/[؀-ۿ]/g);
  const tifinagh = compte(/[ⴰ-⵿]/g);
  const latin = compte(/[A-Za-zÀ-ɏ]/g);
  if (tifinagh > latin && tifinagh > arabe) return 'tz-tfng';
  if (arabe > latin) return 'ar';
  if (compte(/[ɣεḍṭẓṛḥṣčǧ]/gi) > 3) return 'tz-ltn';
  return parDefaut === 'ar' || parDefaut === 'tz-tfng' ? 'fr' : parDefaut;
}

const rempli = (v?: string) => !!v && !!v.trim();

export function traductionDe(block: ArticleBlock, langue: string): TraductionBloc | undefined {
  return (block.metadata as any)?.traductions?.[langue];
}

/** Le bloc contient-il du texte à traduire ? (image : seulement si elle a une légende) */
export function aTraduire(block: ArticleBlock): boolean {
  switch (block.type_block) {
    case 'text': case 'heading': case 'citation': return rempli(block.contenu);
    case 'list': return Array.isArray(block.contenu_json) && block.contenu_json.length > 0;
    case 'table': return !!(block.contenu_json as any)?.headers;
    case 'image': case 'video': return rempli(block.metadata?.caption);
    default: return false;
  }
}

/** Le bloc est-il traduit dans cette langue ? */
export function estTraduit(block: ArticleBlock, langue: string): boolean {
  const tr = traductionDe(block, langue);
  if (!tr) return false;
  switch (block.type_block) {
    case 'text': case 'heading': case 'citation': return rempli(tr.contenu);
    case 'list': return Array.isArray(tr.contenu_json) && tr.contenu_json.length > 0;
    case 'table': return !!(tr.contenu_json as any)?.headers?.some((h: string) => rempli(h));
    case 'image': case 'video': return rempli(tr.caption);
    default: return false;
  }
}

/** Nombre de blocs traduits / à traduire dans une langue */
export function avancement(blocks: ArticleBlock[], langue: string): { faits: number; total: number } {
  const aFaire = blocks.filter(aTraduire);
  return { faits: aFaire.filter(b => estTraduit(b, langue)).length, total: aFaire.length };
}

/** Le bloc tel qu'il s'affiche dans cette langue (texte d'origine là où la traduction manque) */
export function blocDansLaLangue(block: ArticleBlock, langue: string): ArticleBlock {
  const tr = traductionDe(block, langue);
  if (!tr) return block;
  const bloc: any = { ...block, metadata: { ...block.metadata } };
  if (rempli(tr.contenu)) bloc.contenu = tr.contenu;
  if (block.type_block === 'list' && Array.isArray(tr.contenu_json) && tr.contenu_json.length) bloc.contenu_json = tr.contenu_json;
  if (block.type_block === 'table' && estTraduit(block, langue)) {
    // Lignes pas encore traduites : celles d'origine
    const t = tr.contenu_json as { headers: string[]; rows: string[][] };
    const o = block.contenu_json as { headers: string[]; rows: string[][] };
    bloc.contenu_json = { headers: t.headers, rows: t.rows?.length ? t.rows : o.rows };
  }
  if (rempli(tr.caption)) bloc.metadata.caption = tr.caption;
  if (rempli(tr.author)) bloc.metadata.author = tr.author;
  return bloc as ArticleBlock;
}

/** Langues dans lesquelles au moins un bloc est traduit */
export function languesTraduites(blocks: ArticleBlock[]): string[] {
  return LANGUES_ARTICLE.filter(l => blocks.some(b => estTraduit(b, l)));
}
