/**
 * « Complétez votre profil » : après une inscription rapide (prénom, nom, e-mail, mot de passe),
 * le visiteur ajoute ensuite sa wilaya, son genre, sa date de naissance et son téléphone.
 * L'encadré disparaît quand tout est rempli, ou pour de bon avec « Plus tard » (sur cet appareil).
 *
 * Tant que l'adresse e-mail n'est pas confirmée, le serveur refuse toute modification (sécurité) :
 * l'encadré le dit d'abord, avec un bouton pour recevoir un nouveau lien.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailCheck, UserCheck, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { userService } from '@/services/user.service';
import { messageErreurServeur } from '@/utils/erreurServeur';

export interface ProfilACompleter {
  id_user?: number;
  email?: string;
  email_verifie?: boolean;
  wilaya_residence?: number | null;
  sexe?: string | null;
  date_naissance?: string | null;
  telephone?: string | null;
}

type Champ = 'wilaya' | 'genre' | 'naissance' | 'telephone';

/** Informations encore vides, dans l'ordre où elles s'affichent */
export function champsManquants(user: ProfilACompleter | null | undefined): Champ[] {
  if (!user) return [];
  const manque: Champ[] = [];
  if (!user.wilaya_residence) manque.push('wilaya');
  if (!user.sexe) manque.push('genre');
  if (!user.date_naissance) manque.push('naissance');
  if (!user.telephone) manque.push('telephone');
  return manque;
}

/** « a, b et c » dans la langue de la page (virgule arabe en arabe) */
function enListe(elements: string[], langue: string): string {
  // Intl.ListFormat : absent des types du projet (cible TS antérieure à ES2021) et des très vieux navigateurs
  const ListFormat = (Intl as unknown as {
    ListFormat?: new (l: string, o: { style: string; type: string }) => { format: (e: string[]) => string };
  }).ListFormat;
  try {
    if (!ListFormat) return elements.join(', ');
    return new ListFormat(langue, { style: 'long', type: 'conjunction' }).format(elements);
  } catch {
    return elements.join(', ');
  }
}

const cleFermeture = (id?: number) => `tala-completer-profil-ferme-${id ?? 'anonyme'}`;

const lireFerme = (id?: number) => {
  try { return localStorage.getItem(cleFermeture(id)) === '1'; } catch { return false; }
};

interface Props {
  user: ProfilACompleter | null | undefined;
  onCompleter: () => void;
}

const CompleterProfilCard = ({ user, onCompleter }: Props) => {
  const { t, i18n } = useTranslation();
  const [ferme, setFerme] = useState(() => lireFerme(user?.id_user));
  const [envoi, setEnvoi] = useState<{ etat: 'repos' | 'envoi' | 'envoye' | 'erreur'; message?: string }>({ etat: 'repos' });
  const manque = champsManquants(user);
  if (!user || ferme || manque.length === 0) return null;

  const plusTard = () => {
    try { localStorage.setItem(cleFermeture(user.id_user), '1'); } catch { /* navigation privée : fermé pour cette visite */ }
    setFerme(true);
  };

  const fermer = (
    <button
      type="button"
      onClick={plusTard}
      className="absolute end-2 top-2 rounded p-2 text-muted-foreground hover:text-foreground"
      aria-label={t('common.close', 'Fermer')}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  // Adresse pas encore confirmée : c'est la première chose à faire
  if (user.email_verifie === false) {
    const renvoyer = async () => {
      setEnvoi({ etat: 'envoi' });
      try {
        const res = await userService.sendVerificationEmail();
        if (!res.success) throw res;
        setEnvoi({ etat: 'envoye' });
      } catch (err) {
        // Un lien vient de partir (à l'inscription) : le serveur répond 429 (lien déjà envoyé)
        if ((err as { status?: number } | null)?.status === 429) {
          setEnvoi({ etat: 'erreur', message: t('dashboarduser.completer.dejaEnvoye', 'Un lien vient déjà de vous être envoyé. Attendez quelques minutes avant d’en demander un autre.') });
          return;
        }
        setEnvoi({ etat: 'erreur', message: messageErreurServeur(err, t('dashboarduser.completer.envoiEchec', 'Le lien n’a pas pu être envoyé. Réessayez dans quelques minutes.')) });
      }
    };
    return (
      <Alert className="relative mt-4 border-primary/30 bg-primary/5 pe-12">
        <MailCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <AlertTitle>{t('dashboarduser.completer.confirmerTitre', 'Confirmez votre adresse e-mail')}</AlertTitle>
        <AlertDescription>
          <p>
            {t('dashboarduser.completer.confirmerTexte', 'Ouvrez le lien que nous avons envoyé à {{email}}. Ensuite, vous pourrez compléter votre profil.', {
              // Adresse isolée de gauche à droite : dans une phrase en arabe, elle se retrouvait coupée et inversée
              email: user.email ? `⁦${user.email}⁩` : '',
            })}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={renvoyer} disabled={envoi.etat === 'envoi' || envoi.etat === 'envoye'}>
              {t('dashboarduser.completer.nouveauLien', 'Recevoir un nouveau lien')}
            </Button>
          </div>
          <p className="mt-2 text-sm">
            {envoi.etat === 'envoye' && t('dashboarduser.completer.lienEnvoye', 'Nouveau lien envoyé. Pensez à regarder dans les courriers indésirables.')}
          </p>
          {envoi.etat === 'erreur' && <p className="mt-1 text-sm text-destructive">{envoi.message}</p>}
        </AlertDescription>
        {fermer}
      </Alert>
    );
  }

  const libelles: Record<Champ, string> = {
    wilaya: t('dashboarduser.completer.wilaya', 'votre wilaya'),
    genre: t('dashboarduser.completer.genre', 'votre genre'),
    naissance: t('dashboarduser.completer.naissance', 'votre date de naissance'),
    telephone: t('dashboarduser.completer.telephone', 'votre téléphone'),
  };

  return (
    <Alert className="relative mt-4 border-primary/30 bg-primary/5 pe-12">
      <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
      <AlertTitle>{t('dashboarduser.completer.titre', 'Complétez votre profil')}</AlertTitle>
      <AlertDescription>
        <p>
          {t('dashboarduser.completer.texte', 'Il vous reste à ajouter : {{liste}}. Cela prend une minute, et tout est facultatif.', {
            liste: enListe(manque.map((m) => libelles[m]), i18n?.language || 'fr'),
          })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={onCompleter}>{t('dashboarduser.completer.bouton', 'Compléter mon profil')}</Button>
          <Button size="sm" variant="ghost" onClick={plusTard}>{t('dashboarduser.completer.plusTard', 'Plus tard')}</Button>
        </div>
      </AlertDescription>
      {fermer}
    </Alert>
  );
};

export default CompleterProfilCard;
