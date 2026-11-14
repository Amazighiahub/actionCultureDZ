/**
 * « Vos premiers pas » (audit V11 OUT-13) : quelques étapes pour bien démarrer, qui se cochent toutes
 * seules à partir des données déjà chargées par le tableau de bord (aucune requête de plus, sauf l'état
 * des notifications de cet appareil). L'encadré disparaît quand tout est fait, ou pour de bon avec
 * « Plus tard » (sur cet appareil).
 *
 * Une étape renvoie soit vers une page du site (lien interne), soit vers un guide (page statique).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { estFerme, fermer } from '@/utils/fermetureLocale';
import { abonnementActuel } from '@/utils/applicationMobile';

export interface EtapePremiersPas {
  cle: string;
  titre: string;
  /** Vrai quand l'étape est faite ; 'notifications' : lu sur cet appareil */
  fait: boolean | 'notifications';
  lien: string;
  /** Page statique (guide) : lien classique, pas le routeur */
  statique?: boolean;
}

interface Props {
  idUser?: number;
  etapes: EtapePremiersPas[];
}

export default function PremiersPas({ idUser, etapes }: Props) {
  const { t } = useTranslation();
  const cle = `tala-premiers-pas-ferme-${idUser ?? 'anonyme'}`;
  const [ferme, setFerme] = useState(() => estFerme(cle));
  const [notificationsActives, setNotificationsActives] = useState<boolean | null>(null);
  const besoinNotifications = etapes.some((e) => e.fait === 'notifications');

  useEffect(() => {
    if (!besoinNotifications) return;
    let actif = true;
    abonnementActuel().then((a) => { if (actif) setNotificationsActives(!!a); }).catch(() => { if (actif) setNotificationsActives(false); });
    return () => { actif = false; };
  }, [besoinNotifications]);

  if (!idUser || ferme) return null;
  const faite = (e: EtapePremiersPas) => (e.fait === 'notifications' ? notificationsActives === true : e.fait);
  const nbFaites = etapes.filter(faite).length;
  if (nbFaites === etapes.length) return null;

  const plusTard = () => { fermer(cle); setFerme(true); };

  return (
    <Card className="relative mt-4 border-primary/30" data-testid="premiers-pas">
      <button type="button" onClick={plusTard}
        className="absolute end-2 top-2 rounded p-2 text-muted-foreground hover:text-foreground"
        aria-label={t('premiersPas.plusTard', 'Masquer, plus tard')}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <CardHeader className="pb-2 pe-12">
        <CardTitle as="h2" className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          {t('premiersPas.titre', 'Vos premiers pas')}
          <span className="text-sm font-normal text-muted-foreground">
            {t('premiersPas.avancement', '{{faites}} sur {{total}}', { faites: nbFaites, total: etapes.length })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {etapes.map((e) => {
            const ok = faite(e);
            const Icone = ok ? CheckCircle2 : Circle;
            const contenu = (
              <>
                <Icone className={`h-5 w-5 shrink-0 ${ok ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className={ok ? 'text-muted-foreground line-through' : 'underline-offset-4 group-hover:underline'}>{e.titre}</span>
                <span className="sr-only">{ok ? t('premiersPas.fait', '(fait)') : t('premiersPas.aFaire', '(à faire)')}</span>
              </>
            );
            const classe = 'group flex min-h-[44px] items-center gap-3 text-sm';
            return (
              <li key={e.cle}>
                {ok ? <span className={classe}>{contenu}</span>
                  : e.statique ? <a href={e.lien} className={classe}>{contenu}</a>
                    : <Link to={e.lien} className={classe}>{contenu}</Link>}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
