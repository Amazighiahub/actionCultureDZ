/**
 * Articles de presse d'un professionnel (titre, journal, lien, date) : saisis dans son profil,
 * affichés sur son portfolio public (« Dans la presse »).
 */
import { useTranslation } from 'react-i18next';
import { ExternalLink, Newspaper } from 'lucide-react';
import { safeExternalUrl } from '@/utils/safeUrl';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';

export interface ArticlePresse {
  titre: string;
  media: string;
  url: string;
  date?: string | null;
}

/** Accepte la liste JSON ou sa forme texte (selon la base) ; ignore les lignes sans lien */
export function lireArticlesPresse(valeur: unknown): ArticlePresse[] {
  let liste = valeur;
  if (typeof liste === 'string') {
    try { liste = JSON.parse(liste); } catch { return []; }
  }
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map(a => ({
      titre: typeof a.titre === 'string' ? a.titre : '',
      media: typeof a.media === 'string' ? a.media : '',
      url: typeof a.url === 'string' ? a.url : '',
      date: typeof a.date === 'string' ? a.date : null,
    }))
    .filter(a => a.url);
}

interface Props {
  articles: ArticlePresse[];
  /** Texte quand la liste est vide (profil) ; rien n'est affiché sans lui (portfolio) */
  siVide?: string;
}

export function ListeArticlesPresse({ articles, siVide }: Props) {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  if (!articles.length) {
    return siVide === undefined
      ? <p className="text-sm text-muted-foreground">{t('common.notProvided', 'Non renseigné')}</p>
      : siVide ? <p className="text-sm text-muted-foreground">{siVide}</p> : null;
  }
  return (
    <ul className="space-y-3">
      {articles.map((a, i) => (
        <li key={`${a.url}-${i}`} className="flex items-start gap-3">
          <Newspaper className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <a href={safeExternalUrl(a.url)} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline break-words" dir="auto">
              {a.titre || a.url}
              <ExternalLink className="inline h-3 w-3 ms-1 align-baseline" aria-hidden="true" />
            </a>
            {(a.media || a.date) && (
              <p className="text-sm text-muted-foreground" dir="auto">
                {[a.media, a.date ? formatDate(a.date, { dateStyle: 'long' }) : ''].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default ListeArticlesPresse;
