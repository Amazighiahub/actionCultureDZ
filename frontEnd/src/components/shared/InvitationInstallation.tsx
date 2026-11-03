/**
 * Après la connexion, sur téléphone : propose d'installer Tala DZ. « Plus tard » la fait taire 30 jours,
 * et elle ne s'affiche pas si le site est déjà installé ou si le navigateur ne le permet pas.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import { estInstallee, estIphone, installationProposee, lancerInstallation, suivreInstallation } from '@/utils/applicationMobile';

const CLE = 'taladz-installation-plus-tard';
const SILENCE_MS = 30 * 24 * 3600 * 1000;

const enSilence = () => {
  try {
    return Date.now() - Number(localStorage.getItem(CLE) || 0) < SILENCE_MS;
  } catch {
    return false;
  }
};
const faireTaire = () => {
  try {
    localStorage.setItem(CLE, String(Date.now()));
  } catch {
    // Stockage indisponible : l'invitation pourra revenir à la prochaine visite
  }
};
const surTelephone = () => window.matchMedia?.('(pointer: coarse)').matches === true;

export default function InvitationInstallation() {
  const { t } = useTranslation();
  const { isAuthenticated } = usePermissionsContext();
  const [proposee, setProposee] = useState(installationProposee());
  const [fermee, setFermee] = useState(enSilence());
  useEffect(() => suivreInstallation(() => setProposee(installationProposee())), []);

  const iphone = estIphone();
  if (!isAuthenticated || fermee || estInstallee() || !surTelephone() || (!proposee && !iphone)) return null;

  const fermer = () => {
    faireTaire();
    setFermee(true);
  };
  const installer = async () => {
    await lancerInstallation();
    fermer();
  };

  return (
    <aside
      aria-label={t('applicationMobile.titre', 'Tala DZ sur votre téléphone')}
      className="fixed inset-x-3 bottom-3 z-40 rounded-lg border bg-card p-4 shadow-lg print:hidden"
    >
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
        <Button variant="ghost" size="sm" onClick={fermer}>{t('applicationMobile.plusTard', 'Plus tard')}</Button>
        {!iphone && (
          <Button size="sm" onClick={installer}>
            <Download className="h-4 w-4 me-2" aria-hidden="true" />
            {t('applicationMobile.installer', 'Installer Tala DZ')}
          </Button>
        )}
      </div>
    </aside>
  );
}
