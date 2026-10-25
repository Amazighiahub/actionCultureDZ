/**
 * PagesDetaillees — cartes « En savoir plus » d'une section du lieu : chaque carte mène à un
 * article complet écrit avec l'éditeur avancé (« La rechta », « La bataille d'Alger »…).
 * Le texte de la section reste le résumé ; l'article est la page détaillée.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getAssetUrl } from '@/helpers/assetUrl';
import { texteLangue } from '@/utils/programmeIntervenants';
import { retirerPagePatrimoine, type PagePatrimoine } from '@/services/patrimoineArticles.service';

interface Props {
  lieuId: number;
  pages: PagePatrimoine[];
  /** Après le retrait d'une page */
  onChange?: () => void;
}

const PagesDetaillees: React.FC<Props> = ({ lieuId, pages, onChange }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [retrait, setRetrait] = useState<number | null>(null);

  if (pages.length === 0) return null;

  const retirer = async (page: PagePatrimoine) => {
    if (!window.confirm(t('patrimoine.pages.confirmRetrait', 'Retirer cet article de la page du lieu ? L’article lui-même n’est pas supprimé.') as string)) return;
    setRetrait(page.id_lieu_oeuvre);
    try {
      const res = await retirerPagePatrimoine(lieuId, page.id_lieu_oeuvre);
      if (res.success) onChange?.();
      else toast({ title: t('common.error', 'Erreur'), description: res.error, variant: 'destructive' });
    } catch {
      toast({ title: t('common.error', 'Erreur'), variant: 'destructive' });
    } finally {
      setRetrait(null);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {t('patrimoine.pages.enSavoirPlus', 'En savoir plus')}
      </h4>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pages.map(page => {
          const titre = texteLangue(page.titre, i18n.language);
          const resume = texteLangue(page.resume, i18n.language);
          return (
            <li key={page.id_lieu_oeuvre} className="relative group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
              <Link to={`/articles/${page.id_oeuvre}`} className="flex gap-3 p-3 h-full">
                {page.image ? (
                  <img src={getAssetUrl(page.image, { width: 240 })} alt="" loading="lazy" decoding="async" className="h-20 w-20 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="h-20 w-20 shrink-0 rounded-md bg-muted flex items-center justify-center" aria-hidden="true">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-medium leading-snug line-clamp-2 group-hover:text-primary">{titre}</span>
                  {resume && <span className="block mt-1 text-sm text-muted-foreground line-clamp-2">{resume}</span>}
                  {page.statut !== 'publie' ? (
                    <Badge variant="outline" className="mt-1 gap-1 text-xs"><Clock className="h-3 w-3" aria-hidden="true" />{t('patrimoine.pages.enAttente', 'En attente de validation')}</Badge>
                  ) : (
                    <span className="mt-1 inline-flex items-center text-xs text-primary">{t('patrimoine.pages.lire', 'Lire l’article')}<ChevronRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" /></span>
                  )}
                </span>
              </Link>
              {page.peut_retirer && (
                <Button
                  type="button" variant="ghost" size="icon"
                  className="absolute top-1 end-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => retirer(page)} disabled={retrait === page.id_lieu_oeuvre}
                  aria-label={t('patrimoine.pages.retirer', 'Retirer de la page du lieu')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PagesDetaillees;
