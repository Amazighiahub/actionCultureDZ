/**
 * Après la connexion, sur téléphone : propose d'abord d'installer Tala DZ, puis d'activer les notifications.
 * Un site ne peut pas les activer seul : la personne doit accepter. Ce premier clic garde la question du
 * téléphone pour celles qui la veulent, car un refus peut ne plus être reposé par le navigateur.
 * « Plus tard » fait taire chaque proposition 30 jours.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Download, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import {
  abonnementActuel, activerNotifications, estInstallee, estIphone, installationProposee,
  lancerInstallation, notificationsPossibles, suivreInstallation, surTelephone,
} from '@/utils/applicationMobile';

const CLE_INSTALLATION = 'taladz-installation-plus-tard';
const CLE_NOTIFICATIONS = 'taladz-notifications-plus-tard';
const SILENCE_MS = 30 * 24 * 3600 * 1000;

const enSilence = (cle: string) => {
  try {
    return Date.now() - Number(localStorage.getItem(cle) || 0) < SILENCE_MS;
  } catch {
    return false;
  }
};
const faireTaire = (cle: string) => {
  try {
    localStorage.setItem(cle, String(Date.now()));
  } catch {
    // Stockage indisponible : la proposition pourra revenir à la prochaine visite
  }
};

export default function InvitationInstallation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated } = usePermissionsContext();
  const [proposee, setProposee] = useState(installationProposee());
  const [installationFermee, setInstallationFermee] = useState(enSilence(CLE_INSTALLATION));
  const [notificationsFermees, setNotificationsFermees] = useState(enSilence(CLE_NOTIFICATIONS));
  const [abonne, setAbonne] = useState(true);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => suivreInstallation(() => setProposee(installationProposee())), []);
  useEffect(() => {
    if (!isAuthenticated) return;
    abonnementActuel().then((a) => setAbonne(!!a)).catch(() => setAbonne(true));
  }, [isAuthenticated]);

  if (!isAuthenticated || !surTelephone()) return null;

  const iphone = estIphone();
  const installee = estInstallee();
  const montrerInstallation = !installationFermee && !installee && (proposee || iphone);
  // Sur iPhone, les notifications n'existent qu'une fois le site sur l'écran d'accueil.
  // Permission déjà refusée : seul le réglage du navigateur peut la rendre, inutile de la redemander
  const montrerNotifications = !montrerInstallation && !notificationsFermees && !abonne
    && (!iphone || installee) && notificationsPossibles() && Notification.permission !== 'denied';

  if (!montrerInstallation && !montrerNotifications) return null;

  const fermerInstallation = () => {
    faireTaire(CLE_INSTALLATION);
    setInstallationFermee(true);
  };
  const fermerNotifications = () => {
    faireTaire(CLE_NOTIFICATIONS);
    setNotificationsFermees(true);
  };
  const installer = async () => {
    await lancerInstallation();
    fermerInstallation();
  };
  const activer = async () => {
    setEnCours(true);
    try {
      const resultat = await activerNotifications();
      if (resultat === 'active') {
        setAbonne(true);
        toast({ title: t('applicationMobile.activees', 'Notifications activées sur cet appareil') });
      } else {
        fermerNotifications();
        if (resultat === 'indisponible') {
          toast({ title: t('applicationMobile.indisponibles', 'Les notifications ne sont pas disponibles pour le moment.'), variant: 'destructive' });
        }
      }
    } catch {
      fermerNotifications();
      toast({ title: t('applicationMobile.indisponibles', 'Les notifications ne sont pas disponibles pour le moment.'), variant: 'destructive' });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <aside
      aria-label={t('applicationMobile.titre', 'Tala DZ sur votre téléphone')}
      className="fixed inset-x-3 bottom-3 z-40 rounded-lg border bg-card p-4 shadow-lg print:hidden"
    >
      {montrerInstallation ? (
        <>
          <p className="flex items-center gap-2 font-medium">
            <Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('applicationMobile.invitationTitre', 'Installez Tala DZ sur votre téléphone')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {iphone
              ? t('applicationMobile.invitationIphone', 'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ». Vous pourrez ensuite activer les notifications.')
              : t('applicationMobile.invitationTexte', 'Ouvrez le site d’un geste et recevez vos notifications : inscription validée, rappel, changement d’événement.')}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={fermerInstallation}>{t('applicationMobile.plusTard', 'Plus tard')}</Button>
            {!iphone && (
              <Button size="sm" onClick={installer}>
                <Download className="h-4 w-4 me-2" aria-hidden="true" />
                {t('applicationMobile.installer', 'Installer Tala DZ')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 font-medium">
            <Bell className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('applicationMobile.propositionTitre', 'Recevoir vos notifications sur ce téléphone ?')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('applicationMobile.propositionTexte', 'Inscription validée, rappel, nouveautés des professionnels que vous suivez, réponses à vos commentaires.')}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={fermerNotifications}>{t('applicationMobile.plusTard', 'Plus tard')}</Button>
            <Button size="sm" onClick={activer} disabled={enCours}>
              {enCours ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" /> : <Bell className="h-4 w-4 me-2" aria-hidden="true" />}
              {t('applicationMobile.propositionActiver', 'Activer')}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
