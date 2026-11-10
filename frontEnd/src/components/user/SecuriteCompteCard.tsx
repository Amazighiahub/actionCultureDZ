/**
 * « Sécurité du compte » (profil) : changer son mot de passe et son adresse e-mail une fois connecté.
 * Avant, le profil disait « L'email ne peut pas être modifié » et rien ne permettait de changer le mot
 * de passe, alors que le serveur sait faire les deux (audit V11 FRM-12).
 *
 * Mot de passe changé : le serveur ferme toutes les sessions (sécurité) ; la carte le dit et propose
 * de se reconnecter. Adresse : un lien part vers la nouvelle adresse, qui ne change qu'après le clic.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/user.service';
import { detailsDesChamps, messageErreurServeur } from '@/utils/erreurServeur';
import { erreurMotDePasse } from '@/utils/motDePasse';
import { emailValide } from '@/utils/validationChamps';

type Erreurs = Record<string, string | undefined>;

const Erreur = ({ id, texte }: { id: string; texte?: string }) =>
  texte ? <p id={id} role="alert" className="text-sm text-destructive">{texte}</p> : null;

// Après l'affichage des messages (un appel trop tôt, juste après la réponse du serveur, ne trouvait rien)
const allerAuPremier = (conteneur: string) => setTimeout(() => {
  const el = document.querySelector<HTMLElement>(`#${conteneur} [aria-invalid="true"]`);
  el?.focus();
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}, 0);

export default function SecuriteCompteCard({ emailActuel }: { emailActuel?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [ouvert, setOuvert] = useState<'mdp' | 'email' | null>(null);

  // --- Mot de passe ---
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [voir, setVoir] = useState(false);
  const [erreursMdp, setErreursMdp] = useState<Erreurs>({});
  const [envoiMdp, setEnvoiMdp] = useState(false);
  const [mdpChange, setMdpChange] = useState(false);

  const changerMotDePasse = async (e: React.FormEvent) => {
    e.preventDefault();
    const erreurs: Erreurs = {};
    if (!actuel) erreurs.actuel = t('profil.securite.actuelRequis', 'Indiquez votre mot de passe actuel.');
    const probleme = erreurMotDePasse(nouveau, t);
    if (probleme) erreurs.nouveau = probleme;
    else if (nouveau === actuel) erreurs.nouveau = t('profil.securite.identique', 'Le nouveau mot de passe doit être différent de l’actuel.');
    if (!erreurs.nouveau && confirmation !== nouveau) erreurs.confirmation = t('auth.errors.passwordMismatch', 'Les mots de passe ne correspondent pas');
    setErreursMdp(erreurs);
    if (Object.values(erreurs).some(Boolean)) { allerAuPremier('securite-mdp'); return; }

    setEnvoiMdp(true);
    try {
      const r = await userService.changePassword({ ancien_mot_de_passe: actuel, nouveau_mot_de_passe: nouveau, confirmation_mot_de_passe: confirmation });
      if (!r.success) throw r;
      setMdpChange(true);
      setActuel(''); setNouveau(''); setConfirmation('');
    } catch (err) {
      // « Mot de passe actuel incorrect » (refus du serveur) : sous le champ du mot de passe actuel
      const champs = detailsDesChamps(err);
      const surNouveau = champs.find((d) => d.field === 'nouveau_mot_de_passe')?.message;
      const surActuel = champs.find((d) => d.field === 'ancien_mot_de_passe')?.message;
      const message = messageErreurServeur(err, t('profil.securite.echec', 'Le changement n’a pas abouti. Réessayez dans quelques minutes.'));
      setErreursMdp(surNouveau ? { nouveau: surNouveau } : { actuel: surActuel || message });
      allerAuPremier('securite-mdp');
    } finally {
      setEnvoiMdp(false);
    }
  };

  // --- Adresse e-mail ---
  const [nouvelEmail, setNouvelEmail] = useState('');
  const [mdpEmail, setMdpEmail] = useState('');
  const [erreursEmail, setErreursEmail] = useState<Erreurs>({});
  const [envoiEmail, setEnvoiEmail] = useState(false);
  const [lienEnvoyeA, setLienEnvoyeA] = useState<string | null>(null);

  const changerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const erreurs: Erreurs = {};
    if (!nouvelEmail.trim()) erreurs.email = t('auth.errors.emailRequired', 'L’email est requis');
    else if (!emailValide(nouvelEmail)) erreurs.email = t('auth.errors.emailInvalid', 'Email invalide');
    else if (nouvelEmail.trim().toLowerCase() === (emailActuel || '').toLowerCase()) erreurs.email = t('profil.securite.memeAdresse', 'C’est déjà votre adresse actuelle.');
    if (!mdpEmail) erreurs.mdp = t('profil.securite.actuelRequis', 'Indiquez votre mot de passe actuel.');
    setErreursEmail(erreurs);
    if (Object.values(erreurs).some(Boolean)) { allerAuPremier('securite-email'); return; }

    setEnvoiEmail(true);
    try {
      const adresse = nouvelEmail.trim().toLowerCase();
      const r = await userService.requestEmailChange(adresse, mdpEmail);
      if (!r.success) throw r;
      setLienEnvoyeA(adresse);
      setNouvelEmail(''); setMdpEmail('');
    } catch (err) {
      // Le serveur répond par des codes (WRONG_PASSWORD, EMAIL_CONFLICT…) : message clair, sous le bon champ
      const code = (err as { code?: string } | null)?.code;
      if (code === 'WRONG_PASSWORD') setErreursEmail({ mdp: t('profil.securite.motDePasseFaux', 'Mot de passe incorrect.') });
      else if (code === 'EMAIL_CONFLICT') setErreursEmail({ email: t('profil.securite.adressePrise', 'Cette adresse est déjà utilisée par un autre compte.') });
      else if (code === 'INVALID_EMAIL') setErreursEmail({ email: t('auth.errors.emailInvalid', 'Email invalide') });
      else setErreursEmail({ email: messageErreurServeur(err, t('profil.securite.echec', 'Le changement n’a pas abouti. Réessayez dans quelques minutes.')) });
      allerAuPremier('securite-email');
    } finally {
      setEnvoiEmail(false);
    }
  };

  const seReconnecter = async () => {
    try { await logout(); } finally { navigate('/auth'); }
  };

  const decrit = (id: string, erreur?: string, aide?: string) =>
    [erreur ? `${id}-erreur` : '', aide || ''].filter(Boolean).join(' ') || undefined;

  return (
    <Card id="securite" className="p-6 sm:p-8 scroll-mt-24">
      <h2 className="text-xl font-semibold font-serif mb-1 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        {t('profil.securite.titre', 'Sécurité du compte')}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">{t('profil.securite.intro', 'Changez votre mot de passe ou votre adresse e-mail.')}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button type="button" variant={ouvert === 'mdp' ? 'default' : 'outline'} aria-expanded={ouvert === 'mdp'} aria-controls="securite-mdp"
          onClick={() => setOuvert(ouvert === 'mdp' ? null : 'mdp')}>
          <KeyRound className="h-4 w-4 me-2" aria-hidden="true" />
          {t('profil.securite.changerMdp', 'Changer mon mot de passe')}
        </Button>
        <Button type="button" variant={ouvert === 'email' ? 'default' : 'outline'} aria-expanded={ouvert === 'email'} aria-controls="securite-email"
          onClick={() => setOuvert(ouvert === 'email' ? null : 'email')}>
          <Mail className="h-4 w-4 me-2" aria-hidden="true" />
          {t('profil.securite.changerEmail', 'Changer mon adresse e-mail')}
        </Button>
      </div>

      {ouvert === 'mdp' && (
        mdpChange ? (
          <div id="securite-mdp" role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="font-medium flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />{t('profil.securite.mdpChange', 'Mot de passe changé.')}</p>
            <p className="text-sm text-muted-foreground">{t('profil.securite.mdpChangeSuite', 'Pour votre sécurité, vous êtes déconnecté(e) de tous vos appareils. Reconnectez-vous avec le nouveau mot de passe.')}</p>
            <Button type="button" onClick={seReconnecter}>{t('profil.securite.seReconnecter', 'Se reconnecter')}</Button>
          </div>
        ) : (
          <form id="securite-mdp" onSubmit={changerMotDePasse} noValidate className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="secu-actuel">{t('profil.securite.actuel', 'Mot de passe actuel')}</Label>
              <Input id="secu-actuel" type={voir ? 'text' : 'password'} autoComplete="current-password" value={actuel}
                onChange={(e) => { setActuel(e.target.value); setErreursMdp((x) => ({ ...x, actuel: undefined })); }}
                aria-invalid={!!erreursMdp.actuel || undefined} aria-describedby={decrit('secu-actuel', erreursMdp.actuel)} />
              <Erreur id="secu-actuel-erreur" texte={erreursMdp.actuel} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secu-nouveau">{t('profil.securite.nouveau', 'Nouveau mot de passe')}</Label>
              <p id="secu-nouveau-aide" className="text-xs text-muted-foreground">{t('auth.register.passwordHint', '12 caractères min., 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial')}</p>
              <div className="relative">
                <Input id="secu-nouveau" type={voir ? 'text' : 'password'} autoComplete="new-password" value={nouveau} className="pe-11"
                  onChange={(e) => { setNouveau(e.target.value); setErreursMdp((x) => ({ ...x, nouveau: undefined })); }}
                  aria-invalid={!!erreursMdp.nouveau || undefined} aria-describedby={decrit('secu-nouveau', erreursMdp.nouveau, 'secu-nouveau-aide')} />
                <button type="button" onClick={() => setVoir((v) => !v)} aria-pressed={voir}
                  className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={voir ? t('auth.hidePassword', 'Masquer') : t('auth.showPassword', 'Afficher')}>
                  {voir ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={nouveau} />
              <Erreur id="secu-nouveau-erreur" texte={erreursMdp.nouveau} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secu-confirmation">{t('auth.register.confirmPassword', 'Confirmer le mot de passe')}</Label>
              <Input id="secu-confirmation" type={voir ? 'text' : 'password'} autoComplete="new-password" value={confirmation}
                onChange={(e) => { setConfirmation(e.target.value); setErreursMdp((x) => ({ ...x, confirmation: undefined })); }}
                aria-invalid={!!erreursMdp.confirmation || undefined} aria-describedby={decrit('secu-confirmation', erreursMdp.confirmation)} />
              <Erreur id="secu-confirmation-erreur" texte={erreursMdp.confirmation} />
            </div>
            <Button type="submit" disabled={envoiMdp}>
              {envoiMdp && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {t('profil.securite.validerMdp', 'Changer le mot de passe')}
            </Button>
          </form>
        )
      )}

      {ouvert === 'email' && (
        lienEnvoyeA ? (
          <div id="securite-email" role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
            <p className="font-medium flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />{t('profil.securite.lienEnvoye', 'Lien de confirmation envoyé.')}</p>
            <p className="text-sm text-muted-foreground">
              {t('profil.securite.lienEnvoyeSuite', 'Ouvrez l’e-mail reçu à l’adresse {{email}} et appuyez sur le lien (valable 24 heures). Votre adresse ne change qu’après ce clic. Votre adresse actuelle a aussi été prévenue.', { email: `⁦${lienEnvoyeA}⁩` })}
            </p>
          </div>
        ) : (
          <form id="securite-email" onSubmit={changerEmail} noValidate className="space-y-4 max-w-md">
            {emailActuel && (
              <p className="text-sm text-muted-foreground">
                {t('profil.securite.adresseActuelle', 'Adresse actuelle :')} <span dir="ltr" className="font-medium text-foreground">{emailActuel}</span>
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="secu-email">{t('profil.securite.nouvelleAdresse', 'Nouvelle adresse e-mail')}</Label>
              <Input id="secu-email" type="email" dir="ltr" autoComplete="email" value={nouvelEmail}
                onChange={(e) => { setNouvelEmail(e.target.value); setErreursEmail((x) => ({ ...x, email: undefined })); }}
                aria-invalid={!!erreursEmail.email || undefined} aria-describedby={decrit('secu-email', erreursEmail.email)} />
              <Erreur id="secu-email-erreur" texte={erreursEmail.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secu-email-mdp">{t('profil.securite.actuel', 'Mot de passe actuel')}</Label>
              <Input id="secu-email-mdp" type="password" autoComplete="current-password" value={mdpEmail}
                onChange={(e) => { setMdpEmail(e.target.value); setErreursEmail((x) => ({ ...x, mdp: undefined })); }}
                aria-invalid={!!erreursEmail.mdp || undefined} aria-describedby={decrit('secu-email-mdp', erreursEmail.mdp)} />
              <Erreur id="secu-email-mdp-erreur" texte={erreursEmail.mdp} />
            </div>
            <Button type="submit" disabled={envoiEmail}>
              {envoiEmail && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {t('profil.securite.envoyerLien', 'Recevoir le lien de confirmation')}
            </Button>
          </form>
        )
      )}
    </Card>
  );
}
