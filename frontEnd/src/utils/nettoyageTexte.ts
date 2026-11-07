/**
 * « Nettoyer la mise en page » d'un article : petites fautes de frappe corrigées sans toucher aux mots.
 * - espaces en double, espaces en début et fin de ligne, lignes vides en trop ;
 * - arabe : pas d'espace avant la ponctuation (، ؛ ؟ . ! :), une espace après, et pas d'espace
 *   à l'intérieur des guillemets « » ;
 * - français et anglais : pas d'espace avant la virgule et le point, une espace après la virgule.
 *   Les règles françaises (espace avant ; : ! ? et dans « ») sont respectées : on n'y touche pas.
 * Les nombres (1.5, 2,5), les adresses web et les points de suspension ne sont pas modifiés.
 */
import { directionTexte } from './directionTexte';

const PONCTUATION_ARABE = '،؛؟.!:';

export function nettoyerTexte(texte: string): string {
  if (!texte) return texte;
  const arabe = directionTexte([texte]) === 'rtl';
  const lignes = texte.replace(/\r\n?/g, '\n').split('\n').map((ligne) => {
    let l = ligne.replace(/[ \t\u00a0]{2,}/g, ' ').trim();
    if (!l || /https?:\/\//i.test(l)) return l;
    if (arabe) {
      // Espace avant la ponctuation arabe : retirée
      l = l.replace(new RegExp(` +([${PONCTUATION_ARABE}])`, 'g'), '$1');
      // Ponctuation arabe collée au mot suivant : une espace (pas entre deux chiffres ni dans « ... »)
      l = l.replace(/([،؛؟])(?=[^\s\d»)\]])/g, '$1 ');
      // Guillemets : «  texte  » → «texte»
      l = l.replace(/« +/g, '«').replace(/ +»/g, '»');
    } else {
      l = l.replace(/ +([,.])(?!\d)/g, '$1');
      l = l.replace(/,(?=[A-Za-zÀ-ÿ])/g, ', ');
    }
    return l;
  });
  return lignes.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Nombre de blocs modifiés et nouveaux contenus (les autres blocs ne changent pas) */
export function nettoyerBlocs<T extends { type_block?: string; contenu?: string | null }>(blocs: T[]): { blocs: T[]; modifies: number } {
  let modifies = 0;
  const resultat = blocs.map((b) => {
    if (!['text', 'heading', 'citation'].includes(String(b.type_block)) || typeof b.contenu !== 'string') return b;
    const propre = nettoyerTexte(b.contenu);
    if (propre === b.contenu) return b;
    modifies++;
    return { ...b, contenu: propre };
  });
  return { blocs: resultat, modifies };
}
