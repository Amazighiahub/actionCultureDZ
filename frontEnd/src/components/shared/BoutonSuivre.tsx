/**
 * BoutonSuivre — sur la page d'un professionnel. Une personne non connectée est envoyée vers la connexion,
 * puis revient sur cette page. Le nombre d'abonnés reste public, jamais leurs noms.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import { httpClient } from '@/services/httpClient';

export default function BoutonSuivre({ idProfessionnel }: { idProfessionnel: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = usePermissionsContext();
  const [suit, setSuit] = useState(false);
  const [total, setTotal] = useState(0);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let actif = true;
    httpClient.get<{ total: number; suit: boolean }>(`/users/professionals/${idProfessionnel}/suivi`)
      .then((res) => {
        if (actif && res.data) {
          setTotal(res.data.total);
          setSuit(res.data.suit);
        }
      })
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [idProfessionnel, isAuthenticated]);

  const basculer = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setEnCours(true);
    try {
      const adresse = `/users/professionals/${idProfessionnel}/suivi`;
      const res = suit ? await httpClient.delete<unknown>(adresse) : await httpClient.post<unknown>(adresse, {});
      if (!res.success) throw new Error(res.error);
      setTotal((n) => Math.max(0, n + (suit ? -1 : 1)));
      setSuit(!suit);
      toast({
        title: suit
          ? t('suivi.arrete', 'Vous ne suivez plus ce professionnel')
          : t('suivi.confirme', 'Vous serez prévenu(e) de ses nouvelles publications'),
      });
    } catch (e) {
      toast({
        title: t('common.error', 'Erreur'),
        description: (e instanceof Error && e.message) || t('suivi.echec', 'Cette action n’a pas abouti. Réessayez.'),
        variant: 'destructive',
      });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant={suit ? 'outline' : 'default'} onClick={basculer} disabled={enCours} aria-pressed={suit}>
        {enCours
          ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />
          : suit
            ? <Check className="h-4 w-4 me-2" aria-hidden="true" />
            : <BellPlus className="h-4 w-4 me-2" aria-hidden="true" />}
        {suit ? t('suivi.suivi', 'Suivi') : t('suivi.suivre', 'Suivre')}
      </Button>
      {total > 0 && (
        <span className="text-sm text-muted-foreground">
          {t('suivi.total', { count: total, defaultValue: '{{count}} abonné(s)' })}
        </span>
      )}
    </div>
  );
}
