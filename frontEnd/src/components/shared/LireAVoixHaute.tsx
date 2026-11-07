/**
 * Lecture à voix haute d'un texte (histoire d'un lieu, aide, mission d'une page) avec la voix du
 * téléphone ou de l'ordinateur (synthèse vocale du navigateur) : gratuit, immédiat, rien n'est envoyé
 * à un autre service. Français, arabe et anglais ; pas de voix tamazight dans les navigateurs.
 *
 * Le texte est lu phrase par phrase (Chrome coupe les longues lectures) ; la phrase en cours est
 * affichée sous les boutons.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/Utils';

export type LangueLue = 'fr' | 'ar' | 'en';

const CODES: Record<LangueLue, string> = { fr: 'fr', ar: 'ar', en: 'en' };
const LIBELLES: Record<LangueLue, string> = { fr: 'Français', ar: 'العربية', en: 'English' };

/** Texte lisible : sans balises HTML ni signes de mise en forme */
export function texteLisible(brut: string): string {
  return String(brut || '')
    .replace(/<\s*br\s*\/?>/gi, '. ')
    .replace(/<\/(p|div|li|h\d)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’')
    .replace(/[*_#>`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/([.!?])(\s*\.)+/g, '$1')
    .replace(/^[\s.]+/, '')
    .trim();
}

/** Phrases de 300 caractères au plus (une phrase trop longue est coupée aux virgules ou aux espaces) */
export function decouperPhrases(texte: string, max = 300): string[] {
  const phrases = texte.match(/[^.!?؟…]+[.!?؟…]*\s*/g) || [];
  const resultat: string[] = [];
  for (const brute of phrases) {
    let p = brute.trim();
    while (p.length > max) {
      let coupe = Math.max(p.lastIndexOf('،', max), p.lastIndexOf(',', max));
      if (coupe < max / 3) coupe = p.lastIndexOf(' ', max);
      if (coupe < 1) coupe = max;
      resultat.push(p.slice(0, coupe + 1).trim());
      p = p.slice(coupe + 1).trim();
    }
    if (p) resultat.push(p);
  }
  return resultat;
}

/**
 * Textes par langue à partir d'un champ du site (texte simple ou { fr, ar, en, … }). Un texte simple
 * est rangé selon son écriture (arabe ou latine). Le titre éventuel est lu en premier.
 */
export function textesParLangue(
  valeur: unknown,
  titre?: unknown,
): Partial<Record<LangueLue, string>> {
  const versObjet = (v: unknown): Record<string, string> => {
    if (!v) return {};
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return {};
      try { const o = JSON.parse(s); if (o && typeof o === 'object') return o as Record<string, string>; } catch { /* texte simple */ }
      const arabe = Array.from(s).some((ch) => { const code = ch.charCodeAt(0); return code >= 0x0600 && code <= 0x06ff; });
      return { [arabe ? 'ar' : 'fr']: s };
    }
    return typeof v === 'object' ? v as Record<string, string> : {};
  };
  const textes = versObjet(valeur);
  const titres = versObjet(titre);
  const resultat: Partial<Record<LangueLue, string>> = {};
  (['fr', 'ar', 'en'] as LangueLue[]).forEach((l) => {
    const corps = typeof textes[l] === 'string' ? textes[l].trim() : '';
    if (!corps) return;
    const tt = typeof titres[l] === 'string' ? titres[l].trim() : '';
    resultat[l] = tt ? `${tt}. ${corps}` : corps;
  });
  return resultat;
}

const synthese = (): SpeechSynthesis | null =>
  (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') ? window.speechSynthesis : null;

/** Meilleure voix de l'appareil pour une langue (arabe d'Algérie d'abord, puis tout arabe) */
export function choisirVoix(voix: SpeechSynthesisVoice[], langue: LangueLue): SpeechSynthesisVoice | null {
  const code = CODES[langue];
  const candidates = voix.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(code));
  if (!candidates.length) return null;
  const preferes = langue === 'ar' ? ['ar-dz', 'ar-ma', 'ar-tn', 'ar-sa', 'ar-eg'] : langue === 'fr' ? ['fr-fr', 'fr-ca'] : ['en-gb', 'en-us'];
  for (const p of preferes) {
    const v = candidates.find((c) => c.lang.toLowerCase().replace('_', '-') === p);
    if (v) return v;
  }
  return candidates[0];
}

interface Props {
  /** Textes par langue (seules les langues remplies proposent un bouton) */
  textes: Partial<Record<LangueLue, string | null | undefined>>;
  /** Langue proposée en premier */
  langueDePreference?: string;
  /** Texte du bouton (par défaut « Écouter ») */
  libelle?: string;
  className?: string;
  compact?: boolean;
}

const LireAVoixHaute: React.FC<Props> = ({ textes, langueDePreference, libelle, className, compact = false }) => {
  const { t } = useTranslation();
  const [voix, setVoix] = useState<SpeechSynthesisVoice[]>([]);
  const [etat, setEtat] = useState<'arret' | 'lecture' | 'pause'>('arret');
  const [langueEnCours, setLangueEnCours] = useState<LangueLue | null>(null);
  const [phrase, setPhrase] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<{ phrases: string[]; index: number; jeton: number }>({ phrases: [], index: 0, jeton: 0 });

  // Les voix arrivent parfois après le chargement de la page
  useEffect(() => {
    const s = synthese();
    if (!s) return;
    const charger = () => setVoix(s.getVoices());
    charger();
    s.addEventListener?.('voiceschanged', charger);
    return () => { s.removeEventListener?.('voiceschanged', charger); };
  }, []);

  // On quitte la page : la lecture s'arrête
  useEffect(() => () => { fileRef.current.jeton++; synthese()?.cancel(); }, []);

  const langues = (Object.keys(LIBELLES) as LangueLue[])
    .filter((l) => texteLisible(textes[l] || '').length > 0)
    .sort((a, b) => (a === langueDePreference ? -1 : b === langueDePreference ? 1 : 0));

  const arreter = useCallback(() => {
    fileRef.current.jeton++;
    synthese()?.cancel();
    setEtat('arret');
    setPhrase('');
    setLangueEnCours(null);
  }, []);

  const lire = (langue: LangueLue) => {
    const s = synthese();
    setMessage(null);
    if (!s) { setMessage(t('lecture.nonDisponible', 'La lecture à voix haute n’est pas disponible sur ce navigateur.')); return; }
    const v = choisirVoix(voix.length ? voix : s.getVoices(), langue);
    if (!v && (voix.length || s.getVoices().length)) {
      setMessage(t('lecture.pasDeVoix', 'Votre appareil n’a pas de voix en {{langue}}. Vous pouvez en ajouter une dans les réglages de synthèse vocale du téléphone.', { langue: LIBELLES[langue] }));
      return;
    }
    s.cancel();
    const jeton = ++fileRef.current.jeton;
    fileRef.current = { phrases: decouperPhrases(texteLisible(textes[langue] || '')), index: 0, jeton };
    setLangueEnCours(langue);
    setEtat('lecture');
    const suivante = () => {
      const f = fileRef.current;
      if (f.jeton !== jeton) return;
      if (f.index >= f.phrases.length) { arreter(); return; }
      const texte = f.phrases[f.index++];
      setPhrase(texte);
      const u = new SpeechSynthesisUtterance(texte);
      u.lang = v?.lang || CODES[langue];
      if (v) u.voice = v;
      u.rate = langue === 'ar' ? 0.95 : 1;
      u.onend = suivante;
      u.onerror = (e) => { if ((e as SpeechSynthesisErrorEvent).error !== 'interrupted' && (e as SpeechSynthesisErrorEvent).error !== 'canceled') suivante(); };
      s.speak(u);
    };
    suivante();
  };

  const pause = () => { synthese()?.pause(); setEtat('pause'); };
  const reprendre = () => { synthese()?.resume(); setEtat('lecture'); };

  if (!langues.length) return null;

  return (
    <div className={cn('rounded-lg border bg-muted/40 p-3 space-y-2', compact && 'p-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {etat === 'arret' ? (
          langues.map((l) => (
            <Button key={l} type="button" size="sm" variant="outline" onClick={() => lire(l)} className="min-h-[44px]"
              aria-label={`${libelle || t('lecture.ecouter', 'Écouter')} — ${LIBELLES[l]}`}>
              <Volume2 className="h-4 w-4 me-2" aria-hidden="true" />
              {libelle || t('lecture.ecouter', 'Écouter')}{langues.length > 1 && <span className="ms-1 text-muted-foreground">({LIBELLES[l]})</span>}
            </Button>
          ))
        ) : (
          <>
            {etat === 'lecture' ? (
              <Button type="button" size="sm" variant="outline" onClick={pause} className="min-h-[44px]">
                <Pause className="h-4 w-4 me-2" aria-hidden="true" />{t('lecture.pause', 'Pause')}
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={reprendre} className="min-h-[44px]">
                <Play className="h-4 w-4 me-2" aria-hidden="true" />{t('lecture.reprendre', 'Reprendre')}
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={arreter} className="min-h-[44px]">
              <Square className="h-4 w-4 me-2" aria-hidden="true" />{t('lecture.arreter', 'Arrêter')}
            </Button>
          </>
        )}
      </div>
      {etat !== 'arret' && phrase && (
        <p className="text-sm rounded bg-yellow-100/80 dark:bg-yellow-900/40 px-2 py-1" dir={langueEnCours === 'ar' ? 'rtl' : 'ltr'} aria-live="off">
          {phrase}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
    </div>
  );
};

export default LireAVoixHaute;
