/**
 * Contrôle anti-robots Cloudflare Turnstile (inscription, mot de passe oublié, contact, newsletter).
 * Le serveur vérifie le jeton (backend/middlewares/turnstile.js) ; un jeton ne sert qu'une fois :
 * après chaque envoi, le formulaire appelle reinitialiser().
 *
 * Clé publique (Site Key) : elle est visible dans le site par nature. VITE_TURNSTILE_SITE_KEY la remplace
 * (vide = contrôle désactivé) ; dans les tests automatiques, le contrôle est désactivé.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

const CLE_PUBLIQUE = '0x4AAAAAAF5D0z5lk5MJfYfY';
// Clé de test publique de Cloudflare (toujours acceptée) : en développement, le serveur local n'a pas de clé secrète
const CLE_DE_TEST = '1x00000000000000000000AA';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const cleEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
export const CLE_TURNSTILE = import.meta.env.MODE === 'test' ? '' : (cleEnv ?? (import.meta.env.PROD ? CLE_PUBLIQUE : CLE_DE_TEST));
export const antiRobotActif = !!CLE_TURNSTILE;

/** Refus du serveur dû au contrôle anti-robots (jeton absent, expiré ou faux) */
export const estRefusAntiRobot = (err: unknown): boolean =>
  typeof (err as { code?: unknown } | null)?.code === 'string' && String((err as { code: string }).code).startsWith('CAPTCHA_');

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window { turnstile?: Turnstile }
}

let chargement: Promise<void> | null = null;
function chargerScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!chargement) {
    chargement = new Promise<void>((ok, ko) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.defer = true;
      s.onload = () => ok();
      s.onerror = () => { chargement = null; s.remove(); ko(new Error('turnstile')); };
      document.head.appendChild(s);
    });
  }
  return chargement;
}

export interface AntiRobotHandle { reinitialiser: () => void }

interface Props {
  /** Nom du formulaire, identique à celui vérifié par le serveur */
  action: 'inscription' | 'mot_de_passe' | 'contact' | 'newsletter';
  onJeton: (jeton: string | null) => void;
  className?: string;
  /** Envoi demandé avant la fin de la vérification : on explique quoi faire (useAntiRobot().attente) */
  attente?: boolean;
}

const AntiRobot = forwardRef<AntiRobotHandle, Props>(({ action, onJeton, className, attente }, ref) => {
  const { t, i18n } = useTranslation();
  const zone = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const rappel = useRef(onJeton);
  rappel.current = onJeton;
  const [erreur, setErreur] = useState(false);
  // Vrai quand le widget est affiché : avant, la zone restait vide le temps du chargement (audit V11 UX-36)
  const [pret, setPret] = useState(false);
  const [essai, setEssai] = useState(0);
  const langue = i18n?.language?.startsWith('ar') ? 'ar' : i18n?.language?.startsWith('en') ? 'en' : 'fr';

  useImperativeHandle(ref, () => ({
    reinitialiser: () => {
      rappel.current(null);
      if (idWidget.current && window.turnstile) window.turnstile.reset(idWidget.current);
    },
  }), []);

  useEffect(() => {
    if (!antiRobotActif) return;
    let annule = false;
    setErreur(false);
    setPret(false);
    chargerScript()
      .then(() => {
        if (annule || !zone.current) return;
        // Script chargé sans l'objet attendu : message d'erreur plutôt qu'un indicateur sans fin
        if (!window.turnstile) { setErreur(true); return; }
        idWidget.current = window.turnstile.render(zone.current, {
          sitekey: CLE_TURNSTILE,
          action,
          language: langue,
          theme: 'auto',
          size: 'flexible',
          callback: (jeton: string) => { setErreur(false); rappel.current(jeton); },
          'expired-callback': () => rappel.current(null),
          'error-callback': () => { rappel.current(null); setErreur(true); },
        });
        setPret(true);
      })
      .catch(() => { if (!annule) setErreur(true); });
    return () => {
      annule = true;
      if (idWidget.current && window.turnstile) window.turnstile.remove(idWidget.current);
      idWidget.current = null;
      rappel.current(null);
    };
  }, [action, langue, essai]);

  if (!antiRobotActif) return null;
  return (
    <div className={className}>
      {/* Indicateur pendant le chargement de la vérification (contact, inscription, newsletter, mot de passe) */}
      {!pret && !erreur && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('antiRobot.chargement', 'Vérification anti-robots…')}
        </p>
      )}
      <div ref={zone} />
      {attente && !erreur && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {t('antiRobot.attendre', 'Avant d’envoyer, attendez la coche verte ou cochez la case de vérification juste au-dessus.')}
        </p>
      )}
      {erreur && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {t('antiRobot.erreur', 'La vérification anti-robots n’a pas pu se charger.')}{' '}
          {t('antiRobot.secours', 'Si le problème continue, écrivez-nous à contact@taladz.com.')}{' '}
          <button type="button" className="underline" onClick={() => setEssai((n) => n + 1)}>
            {t('antiRobot.reessayer', 'Réessayer')}
          </button>
        </p>
      )}
    </div>
  );
});
AntiRobot.displayName = 'AntiRobot';

/**
 * État partagé par les formulaires : jeton, référence du widget, et s'il manque encore.
 * lireJeton() donne le jeton du moment de l'envoi (après un long envoi de photo, le jeton a pu être renouvelé).
 *
 * Le bouton d'envoi reste actif (avant : grisé sans explication, audit V11 FRM-13). À l'envoi, le
 * formulaire appelle pretAEnvoyer() : s'il manque le jeton, `attente` passe à vrai et <AntiRobot attente>
 * explique quoi faire ; le message disparaît dès que la vérification répond.
 */
export function useAntiRobot() {
  const [jeton, setJetonEtat] = useState<string | null>(null);
  const [attente, setAttente] = useState(false);
  const jetonActuel = useRef<string | null>(null);
  const setJeton = useCallback((j: string | null) => {
    jetonActuel.current = j;
    setJetonEtat(j);
    if (j) setAttente(false);
  }, []);
  const lireJeton = useCallback(() => jetonActuel.current, []);
  const ref = useRef<AntiRobotHandle>(null);
  const reinitialiser = useCallback(() => ref.current?.reinitialiser(), []);
  const pretAEnvoyer = useCallback((): boolean => {
    if (!antiRobotActif || jetonActuel.current) return true;
    setAttente(true);
    return false;
  }, []);
  return { jeton, setJeton, lireJeton, ref, reinitialiser, pretAEnvoyer, attente, manquant: antiRobotActif && !jeton };
}

export default AntiRobot;
