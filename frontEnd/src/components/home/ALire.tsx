/**
 * ALire — page d'accueil : les derniers articles publiés, en style magazine. Le plus récent en
 * grand (photo, fil « Lieu › Section » ou personnalité, titre, chapeau, auteur), les suivants à
 * côté avec une vignette. Aucun article publié : la section n'apparaît pas.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { httpClient } from '@/services/httpClient';
import { cleSectionPatrimoine, type CarteArticle } from '@/services/patrimoineArticles.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { texteLangue } from '@/utils/programmeIntervenants';
import EnTeteSection from './EnTeteSection';

type TexteMulti = string | Record<string, string | undefined> | null;
interface ArticleALire extends Omit<CarteArticle, 'id_lien' | 'peut_retirer'> {
  auteur: string | null;
  lieu: { id_lieu: number; nom: TexteMulti; section_patrimoine: string } | null;
  personnalite: { id_intervenant: number; nom: TexteMulti; prenom: TexteMulti } | null;
}

/** Image de couverture d'un article, ou une icône s'il n'en a pas */
const Vignette: React.FC<{ image: string | null; grand?: boolean }> = ({ image, grand }) => (
  image ? (
    <img src={getAssetUrl(image, { width: grand ? 1200 : 320 })} alt="" loading="lazy" decoding="async"
      className="h-full w-full object-cover object-[50%_25%] transition-transform duration-500 group-hover:scale-[1.03]" />
  ) : (
    <div className="h-full w-full bg-muted flex items-center justify-center" aria-hidden="true"><BookOpen className={grand ? 'h-12 w-12 text-muted-foreground' : 'h-6 w-6 text-muted-foreground'} /></div>
  )
);

const ALire: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['home', 'a-lire'],
    queryFn: async (): Promise<ArticleALire[]> => {
      const res = await httpClient.get<ArticleALire[]>('/patrimoine/a-lire', { limit: 4 });
      return res.success && Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && articles.length === 0) return null;

  // Fil de l'article : « Casbah d'Alger › Gastronomie locale » ou le nom de la personnalité
  const fil = (a: ArticleALire) => {
    if (a.lieu) return `${texteLangue(a.lieu.nom, lang)} › ${t(`patrimoine.sections.${cleSectionPatrimoine(a.lieu.section_patrimoine)}`)}`;
    if (a.personnalite) return `${texteLangue(a.personnalite.prenom, lang)} ${texteLangue(a.personnalite.nom, lang)}`.trim();
    return t('article.article', 'Article');
  };
  const [une, ...autres] = articles;

  return (
    <section className="py-14 lg:py-20 bg-muted/40" aria-labelledby="titre-a-lire">
      <div className="container">
        <EnTeteSection
          id="titre-a-lire"
          surtitre={t('home.aLire.surtitre', 'À lire')}
          titre={t('home.aLire.titre', 'Histoires du patrimoine')}
          accroche={t('home.aLire.accroche', 'Des monuments, des plats et des personnalités racontés en détail par celles et ceux qui les connaissent.')}
        />

        {isLoading || !une ? (
          <div className="grid gap-8 lg:grid-cols-2"><Skeleton className="aspect-[16/10] rounded-2xl" /><div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <article className="group">
              <Link to={`/articles/${une.id_oeuvre}`} className="block">
                <div className="overflow-hidden rounded-2xl aspect-[16/10]"><Vignette image={une.image} grand /></div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{fil(une)}</p>
                <h3 className="mt-2 font-serif text-2xl md:text-3xl font-bold leading-tight group-hover:text-primary transition-colors">{texteLangue(une.titre, lang)}</h3>
                {texteLangue(une.resume, lang) && <p className="mt-3 text-lg text-muted-foreground line-clamp-3">{texteLangue(une.resume, lang)}</p>}
                {une.auteur && <p className="mt-3 text-sm font-medium">{une.auteur}</p>}
              </Link>
            </article>

            {autres.length > 0 && (
              <ul className="space-y-6 self-start">
                {autres.map(a => (
                  <li key={a.id_oeuvre}>
                    <Link to={`/articles/${a.id_oeuvre}`} className="group grid grid-cols-[112px_1fr] sm:grid-cols-[150px_1fr] gap-4 items-start">
                      <div className="overflow-hidden rounded-xl aspect-[4/3]"><Vignette image={a.image} /></div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary truncate">{fil(a)}</p>
                        <p className="mt-1 font-serif text-lg font-bold leading-snug line-clamp-3 group-hover:text-primary transition-colors">{texteLangue(a.titre, lang)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ALire;
