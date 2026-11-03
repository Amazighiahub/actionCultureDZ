/**
 * ApplicationMobileCard — installer Tala DZ sur le téléphone et activer les notifications,
 * dans le profil et les préférences. Chaque personne choisit ; les e-mails continuent de partir.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Download, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  abonnementActuel, activerNotifications, desactiverNotifications, estInstallee, estIphone,
  installationProposee, lancerInstallation, notificationsPossibles, rattacherAppareil, suivreInstallation,
} from '@/utils/applicationMobile';

export default function ApplicationMobileCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [proposee, setProposee] = useState(installationProposee());
  const [active, setActive] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => suivreInstallation(() => setProposee(installationProposee())), []);
  useEffect(() => {
    abonnementActuel().then((a) => setActive(!!a)).catch(() => setActive(false));
    rattacherAppareil().catch(() => undefined);
  }, []);

  const installee = estInstallee();
  const iphone = estIphone();
  // Sur iPhone, les notifications n'existent qu'une fois le site ajouté à l'écran d'accueil
  const iphoneAInstaller = iphone && !installee;

  const basculer = async () => {
    setEnCours(true);
    try {
      if (active) {
        await desactiverNotifications();
        setActive(false);
        toast({ title: t('applicationMobile.desactivees', 'Notifications désactivées sur cet appareil') });
        return;
      }
      const resultat = await activerNotifications();
      if (resultat === 'active') {
        setActive(true);
        toast({ title: t('applicationMobile.activees', 'Notifications activées sur cet appareil') });
      } else if (resultat === 'refusee') {
        toast({
          title: t('applicationMobile.refusees', 'Notifications bloquées'),
          description: t('applicationMobile.refuseesAide', 'Autorisez-les dans les réglages de votre navigateur pour ce site, puis réessayez.'),
          variant: 'destructive',
        });
      } else {
        toast({ title: t('applicationMobile.indisponibles', 'Les notifications ne sont pas disponibles pour le moment.'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('applicationMobile.indisponibles', 'Les notifications ne sont pas disponibles pour le moment.'), variant: 'destructive' });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          {t('applicationMobile.titre', 'Tala DZ sur votre téléphone')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('applicationMobile.intro', 'Ouvrez le site comme une application et recevez vos notifications : inscription validée, changement d’événement, rappel. Les e-mails continuent de partir.')}
        </p>

        {!installee && proposee && (
          <Button variant="outline" onClick={() => lancerInstallation()} className="w-full sm:w-auto">
            <Download className="h-4 w-4 me-2" aria-hidden="true" />
            {t('applicationMobile.installer', 'Installer Tala DZ')}
          </Button>
        )}

        {iphoneAInstaller && (
          <ol className="list-decimal ps-5 text-sm space-y-1">
            <li>{t('applicationMobile.iphone1', 'Ouvrez taladz.com dans Safari.')}</li>
            <li>{t('applicationMobile.iphone2', 'Touchez le bouton Partager, en bas de l’écran.')}</li>
            <li>{t('applicationMobile.iphone3', 'Choisissez « Sur l’écran d’accueil », puis « Ajouter ».')}</li>
            <li>{t('applicationMobile.iphone4', 'Ouvrez Tala DZ depuis son icône, puis revenez ici pour activer les notifications.')}</li>
          </ol>
        )}

        {!iphoneAInstaller && notificationsPossibles() && (
          <Button variant={active ? 'outline' : 'default'} onClick={basculer} disabled={enCours} className="w-full sm:w-auto h-auto min-h-10 whitespace-normal">
            {enCours
              ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />
              : active
                ? <BellOff className="h-4 w-4 me-2" aria-hidden="true" />
                : <Bell className="h-4 w-4 me-2" aria-hidden="true" />}
            {active
              ? t('applicationMobile.desactiver', 'Désactiver les notifications sur cet appareil')
              : t('applicationMobile.activer', 'Activer les notifications sur cet appareil')}
          </Button>
        )}

        {!iphoneAInstaller && !notificationsPossibles() && (
          <p className="text-sm text-muted-foreground">
            {t('applicationMobile.nonPrisEnCharge', 'Ce navigateur ne permet pas les notifications. Essayez avec Chrome sur Android, ou mettez-le à jour.')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
