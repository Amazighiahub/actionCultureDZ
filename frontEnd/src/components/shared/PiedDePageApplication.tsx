/**
 * Pied de page, visible de tous, sans compte : installer Tala DZ et s'abonner à la newsletter
 * avec son e-mail seul. Le bouton d'installation n'apparaît que si le navigateur le permet.
 */
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { ConfirmDialog } from '@/components/shared';
import { estInstallee, estIphone, installationProposee, lancerInstallation, suivreInstallation, surTelephone } from '@/utils/applicationMobile';

/**
 * @param rond - bouton rond vert, en haut de chaque page (avant : seulement en bas de page et après la
 *               connexion, et beaucoup ne le voyaient pas)
 */
export function InstallerTalaDz({ rond = false }: { rond?: boolean } = {}) {
  const { t } = useTranslation();
  const [proposee, setProposee] = useState(installationProposee());
  const [consignes, setConsignes] = useState(false);
  useEffect(() => suivreInstallation(() => setProposee(installationProposee())), []);

  // Sur téléphone, le bouton reste visible même si le navigateur ne propose rien
  // (Facebook, première visite sur Chrome, proposition déjà refusée) : il donne alors les gestes à faire.
  if (estInstallee() || (!proposee && !surTelephone() && !estIphone())) return null;
  const etapes = estIphone()
    ? [
      t('applicationMobile.iphone1', 'Ouvrez taladz.com dans Safari.'),
      t('applicationMobile.iphone2', 'Touchez le bouton Partager, en bas de l’écran.'),
      t('applicationMobile.iphone3', 'Choisissez « Sur l’écran d’accueil », puis « Ajouter ».'),
    ]
    : [
      t('applicationMobile.android1', 'Ouvrez taladz.com dans Chrome (si vous êtes dans Facebook, ouvrez d’abord le lien dans Chrome).'),
      t('applicationMobile.android2', 'Touchez les trois points, en haut à droite.'),
      t('applicationMobile.android3', 'Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».'),
    ];
  const ouvrir = () => (proposee ? lancerInstallation() : setConsignes(true));
  return (
    <>
      {rond ? (
        <button type="button" onClick={ouvrir}
          aria-label={t('applicationMobile.installer', 'Installer Tala DZ')} title={t('applicationMobile.installer', 'Installer Tala DZ')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-md ring-2 ring-green-600/30 transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-500/50 motion-safe:animate-[pulse_2.5s_ease-in-out_3]">
          <Download className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={ouvrir}>
          <Download className="h-4 w-4 me-2" aria-hidden="true" />
          {t('applicationMobile.installer', 'Installer Tala DZ')}
        </Button>
      )}
      <ConfirmDialog
        open={consignes}
        onOpenChange={setConsignes}
        title={t('applicationMobile.installer', 'Installer Tala DZ')}
        description={etapes.join(' ')}
        confirmLabel={t('common.ok', 'OK')}
        onConfirm={() => setConsignes(false)}
      />
    </>
  );
}

export function InscriptionNewsletter() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [robot, setRobot] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnCours(true);
    try {
      const res = await httpClient.post<unknown>('/newsletter/inscription', { email, site_web: robot });
      if (!res.success) throw new Error(res.error);
      setEnvoye(true);
    } catch (err) {
      toast({
        title: t('common.error', 'Erreur'),
        description: (err instanceof Error && err.message) || t('newsletter.echec', 'L’inscription n’a pas abouti. Réessayez.'),
        variant: 'destructive',
      });
    } finally {
      setEnCours(false);
    }
  };

  if (envoye) {
    return <p className="text-sm" role="status">{t('newsletter.verifiez', 'Regardez vos e-mails, y compris les indésirables : cliquez sur le lien reçu pour confirmer votre inscription.')}</p>;
  }
  return (
    <form onSubmit={envoyer} className="space-y-2">
      <Label htmlFor="newsletter-email" className="font-medium">{t('newsletter.titre', 'Recevoir la newsletter')}</Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          placeholder={t('newsletter.adresse', 'Votre adresse e-mail')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={enCours}>
          {enCours
            ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />
            : <Mail className="h-4 w-4 me-2" aria-hidden="true" />}
          {t('newsletter.sinscrire', 'S’inscrire')}
        </Button>
      </div>
      {/* Invisible pour les personnes : seuls les robots le remplissent */}
      <input type="text" name="site_web" value={robot} onChange={(e) => setRobot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <p className="text-xs text-muted-foreground">
        {t('newsletter.mention', 'Votre e-mail seul suffit. Désinscription possible dans chaque message.')}{' '}
        <Link to="/a-propos#confidentialite" className="underline">{t('newsletter.confidentialite', 'Confidentialité')}</Link>
      </p>
    </form>
  );
}
