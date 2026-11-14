/**
 * Photos retirées de l'accueil (« Ne pas mettre à l'accueil », bouton de l'équipe sur l'accueil) :
 * la liste, avec « Remettre » pour annuler. Rien n'est affiché quand aucune photo n'est retirée.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageOff, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { lieuPath, oeuvrePath } from '@/utils/slug';
import { messageErreurServeur } from '@/utils/erreurServeur';

interface Retiree { type: 'lieu' | 'oeuvre'; id: number; titre: string }

const RetireesDeLAccueil: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['admin-accueil-retirees'];
  const { data: liste = [] } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await httpClient.get<Retiree[]>('/stats/a-la-une/exclusions');
      return res.success && Array.isArray(res.data) ? res.data : [];
    }
  });
  if (liste.length === 0) return null;

  const remettre = async (r: Retiree) => {
    try {
      const res = await httpClient.patch('/stats/a-la-une/exclusion', { type: r.type, id: r.id, exclu: false });
      if (!res.success) throw res;
      toast({ title: t('admin.accueil.remise', 'La photo peut de nouveau paraître à l’accueil') });
      await queryClient.invalidateQueries({ queryKey: cle });
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(e, t('admin.accueil.echec', 'Le changement n’a pas pu être enregistré.')), variant: 'destructive' });
    }
  };

  return (
    <Card data-testid="retirees-de-l-accueil">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageOff className="h-5 w-5" aria-hidden="true" />
          {t('admin.accueil.titre', 'Retirées de l’accueil')} ({liste.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('admin.accueil.aide', 'Ces contenus restent publiés sur leur page ; seule leur photo ne paraît plus à l’accueil.')}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {liste.map((r) => (
            <li key={`${r.type}:${r.id}`} className="flex items-center justify-between gap-3 py-2">
              <Link to={r.type === 'lieu' ? lieuPath(r.id, r.titre) : oeuvrePath(r.id, r.titre)} className="min-w-0 truncate text-primary underline" dir="auto">
                {r.titre || `#${r.id}`}
              </Link>
              <Button size="sm" variant="outline" onClick={() => remettre(r)}>
                <Undo2 className="me-1 h-4 w-4" aria-hidden="true" />{t('admin.accueil.remettre', 'Remettre')}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RetireesDeLAccueil;
