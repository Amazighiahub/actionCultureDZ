/**
 * NotificationBell — cloche de l'en-tête pour un compte connecté : nombre de notifications non lues,
 * lien vers la page Notifications, et petite alerte quand une nouvelle arrive.
 * Le serveur n'a pas de connexion temps réel : le résumé est relu toutes les minutes, seulement
 * quand la page est affichée (React Query ne relit pas un onglet en arrière-plan).
 */
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { notificationService } from '@/services/notification.service';

const UNE_MINUTE = 60 * 1000;

interface Derniere { id_notification: number; titre: string }

export function NotificationBell() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dejaVues = useRef<Set<number> | null>(null);

  const { data } = useQuery({
    queryKey: ['notifications', 'cloche'],
    queryFn: () => notificationService.getSummary(),
    refetchInterval: UNE_MINUTE,
    staleTime: 30 * 1000,
  });
  const nonLues = data?.nonLues ?? 0;

  // Nouvelle notification depuis la dernière lecture : petite alerte (pas au premier affichage)
  useEffect(() => {
    const dernieres = (Array.isArray(data?.dernieres) ? data.dernieres : []) as Derniere[];
    if (!data) return;
    if (dejaVues.current === null) {
      dejaVues.current = new Set(dernieres.map(n => n.id_notification));
      return;
    }
    const nouvelles = dernieres.filter(n => !dejaVues.current!.has(n.id_notification));
    nouvelles.forEach(n => dejaVues.current!.add(n.id_notification));
    if (!nouvelles.length) return;
    toast({
      title: nouvelles.length === 1 ? nouvelles[0].titre : t('header.notifications.nouvelles', '{{n}} nouvelles notifications', { n: nouvelles.length }),
      description: nouvelles.length === 1 ? t('header.notifications.nouvelle', 'Nouvelle notification') : nouvelles.map(n => n.titre).join(' · '),
      action: (
        <ToastAction altText={t('header.notifications.voir', 'Voir')} onClick={() => navigate('/notifications')}>
          {t('header.notifications.voir', 'Voir')}
        </ToastAction>
      ),
    });
  }, [data, toast, t, navigate]);

  const libelle = nonLues > 0
    ? t('header.notifications.nonLues', '{{n}} notification(s) non lue(s)', { n: nonLues })
    : t('header.notifications.titre', 'Notifications');

  return (
    <Button asChild variant="ghost" size="sm" className="relative min-w-[40px] min-h-[40px] p-0 hover:bg-stone-100 dark:hover:bg-stone-800">
      <Link to="/notifications" aria-label={libelle} title={libelle}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {nonLues > 0 && (
          <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold leading-[18px] text-center" aria-hidden="true">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </Link>
    </Button>
  );
}

export default NotificationBell;
