/**
 * « Importer un article » : un fichier .json préparé à l'avance (format taladz-article, version 1)
 * remplit l'éditeur d'un coup, texte d'origine et traductions. Les images ne sont pas dans le
 * fichier : leurs cases (avec légendes) sont créées, l'auteur y ajoute ses photos.
 *
 * Format :
 * {
 *   "format": "taladz-article", "version": 1, "langue": "fr",
 *   "titre": { "fr": "…", "ar": "…" }, "description": { "fr": "…", "ar": "…" },
 *   "tags": ["…"],
 *   "blocs": [
 *     { "type": "heading", "niveau": 2, "texte": { "fr": "…", "ar": "…" } },
 *     { "type": "text", "texte": { … } },            (+ "forme": "poeme" : vers centrés)
 *     { "type": "citation", "texte": { … }, "auteur": { … } },
 *     { "type": "image", "legende": { … }, "mise_en_page": "full-width" },
 *     { "type": "list", "elements": { "fr": ["…"], "ar": ["…"] } },
 *     { "type": "separator" }
 *   ]
 * }
 */
import type { ArticleBlock } from '@/types/models/articles.types';
import { LANGUES_ARTICLE } from '@/utils/traductionBlocs';

export interface ArticleImporte {
  langue: string;
  titre: Record<string, string>;
  description: Record<string, string>;
  tags: string[];
  blocks: ArticleBlock[];
  images: number;
}

const MAX_OCTETS = 300 * 1024;
const MAX_BLOCS = 150;
const MAX_TEXTE = 20000;
const MISES_EN_PAGE = ['full-width', 'centered', 'float-left', 'float-right'];

const erreur = (message: string) => new Error(message);

/** Texte par langue : seulement les langues connues, des chaînes de longueur raisonnable */
function parLangue(valeur: unknown, champ: string, max = MAX_TEXTE): Record<string, string> {
  if (valeur === undefined || valeur === null) return {};
  if (typeof valeur !== 'object' || Array.isArray(valeur)) throw erreur(`« ${champ} » doit donner un texte par langue`);
  const sortie: Record<string, string> = {};
  for (const [langue, texte] of Object.entries(valeur as Record<string, unknown>)) {
    if (!(LANGUES_ARTICLE as readonly string[]).includes(langue)) continue;
    if (typeof texte !== 'string') throw erreur(`« ${champ} » (${langue}) doit être un texte`);
    if (texte.length > max) throw erreur(`« ${champ} » (${langue}) est trop long`);
    if (texte.trim()) sortie[langue] = texte.trim();
  }
  return sortie;
}

function listeParLangue(valeur: unknown): Record<string, string[]> {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) throw erreur('« elements » doit donner une liste par langue');
  const sortie: Record<string, string[]> = {};
  for (const [langue, liste] of Object.entries(valeur as Record<string, unknown>)) {
    if (!(LANGUES_ARTICLE as readonly string[]).includes(langue)) continue;
    if (!Array.isArray(liste) || liste.length > 100 || liste.some(e => typeof e !== 'string' || e.length > 2000)) {
      throw erreur(`« elements » (${langue}) doit être une liste de textes`);
    }
    const propre = (liste as string[]).map(e => e.trim()).filter(Boolean);
    if (propre.length) sortie[langue] = propre;
  }
  return sortie;
}

/** Lit et vérifie le contenu d'un fichier d'article ; lève une erreur lisible sinon */
export function lireArticleImporte(texte: string): ArticleImporte {
  if (typeof texte !== 'string' || !texte.trim()) throw erreur('Le fichier est vide');
  if (new Blob([texte]).size > MAX_OCTETS) throw erreur('Le fichier est trop gros (300 Ko au plus)');
  let donnees: Record<string, unknown>;
  try { donnees = JSON.parse(texte); } catch { throw erreur('Ce fichier n’est pas un article Tala DZ (format illisible)'); }
  if (!donnees || donnees.format !== 'taladz-article' || donnees.version !== 1) {
    throw erreur('Ce fichier n’est pas un article Tala DZ (format taladz-article, version 1)');
  }
  const langue = typeof donnees.langue === 'string' && (LANGUES_ARTICLE as readonly string[]).includes(donnees.langue) ? donnees.langue : 'fr';
  const titre = parLangue(donnees.titre, 'titre', 500);
  const description = parLangue(donnees.description, 'description', 5000);
  if (!titre[langue]) throw erreur(`Le titre dans la langue de l’article (${langue}) est obligatoire`);
  const tags = Array.isArray(donnees.tags)
    ? [...new Set((donnees.tags as unknown[]).filter((t): t is string => typeof t === 'string').map(t => t.trim()).filter(t => t && t.length <= 60))].slice(0, 40)
    : [];
  if (!Array.isArray(donnees.blocs) || !donnees.blocs.length) throw erreur('L’article ne contient aucun bloc');
  if (donnees.blocs.length > MAX_BLOCS) throw erreur(`Trop de blocs (${MAX_BLOCS} au plus)`);

  let images = 0;
  const blocks: ArticleBlock[] = (donnees.blocs as unknown[]).map((brut, i) => {
    if (!brut || typeof brut !== 'object') throw erreur(`Bloc ${i + 1} illisible`);
    const b = brut as Record<string, unknown>;
    const traductions: Record<string, Record<string, unknown>> = {};
    const traduire = (champ: string, valeurs: Record<string, unknown>) => {
      for (const [l, v] of Object.entries(valeurs)) {
        if (l === langue) continue;
        traductions[l] = { ...(traductions[l] || {}), [champ]: v };
      }
    };
    const avecTraductions = (metadata: Record<string, unknown>) =>
      (Object.keys(traductions).length ? { ...metadata, traductions } : metadata);

    switch (b.type) {
      case 'heading':
      case 'text':
      case 'citation': {
        const t = parLangue(b.texte, `bloc ${i + 1}`);
        if (!t[langue]) throw erreur(`Bloc ${i + 1} : texte manquant dans la langue de l’article (${langue})`);
        traduire('contenu', t);
        const metadata: Record<string, unknown> = {};
        if (b.type === 'heading') metadata.level = [2, 3, 4].includes(Number(b.niveau)) ? Number(b.niveau) : 2;
        if (b.type === 'text' && b.forme === 'poeme') metadata.forme = 'poeme';
        if (b.type === 'citation') {
          const auteur = parLangue(b.auteur, `bloc ${i + 1} (auteur)`, 300);
          if (auteur[langue]) metadata.author = auteur[langue];
          traduire('author', auteur);
        }
        return { type_block: b.type, contenu: t[langue], metadata: avecTraductions(metadata) } as ArticleBlock;
      }
      case 'image': {
        images++;
        const legende = parLangue(b.legende, `bloc ${i + 1} (légende)`, 1000);
        traduire('caption', legende);
        const layout = typeof b.mise_en_page === 'string' && MISES_EN_PAGE.includes(b.mise_en_page) ? b.mise_en_page : 'centered';
        return { type_block: 'image', contenu: '', metadata: avecTraductions({ layout, ...(legende[langue] ? { caption: legende[langue] } : {}) }) } as ArticleBlock;
      }
      case 'list': {
        const elements = listeParLangue(b.elements);
        if (!elements[langue]) throw erreur(`Bloc ${i + 1} : liste manquante dans la langue de l’article (${langue})`);
        traduire('contenu_json', elements);
        return { type_block: 'list', contenu: '', contenu_json: elements[langue], metadata: avecTraductions({ listType: 'unordered' }) } as ArticleBlock;
      }
      case 'separator':
        return { type_block: 'separator', contenu: '', metadata: {} } as ArticleBlock;
      default:
        throw erreur(`Bloc ${i + 1} : type « ${String(b.type)} » non pris en charge`);
    }
  }).map((b, ordre) => ({ ...b, ordre, visible: true, metadata: { ...b.metadata, langue_origine: langue } }));

  return { langue, titre, description, tags, blocks, images };
}
