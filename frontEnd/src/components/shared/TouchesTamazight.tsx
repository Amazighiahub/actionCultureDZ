/**
 * Barre de lettres tamazight sous un champ (audit V11 OUT-5) : beaucoup de téléphones n'ont pas de
 * clavier tamazight ; les noms de lieux et de personnes s'écrivaient alors sans leurs lettres propres.
 * - Latin : lettres du tamazight standard, ɛ LATIN (U+025B, et non ε grec), majuscules au choix ;
 * - Tifinagh : alphabet de l'IRCAM (labiovélaires avec ⵯ).
 * La lettre est insérée à la position du curseur ; le champ garde le focus (pas de fermeture du clavier).
 */
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/Utils';

const LATIN = ['č', 'ḍ', 'ɛ', 'ǧ', 'ɣ', 'ḥ', 'ṛ', 'ṣ', 'ṭ', 'ţ', 'ẓ'];
const TIFINAGH = ['ⴰ', 'ⴱ', 'ⴳ', 'ⴳⵯ', 'ⴷ', 'ⴹ', 'ⴻ', 'ⴼ', 'ⴽ', 'ⴽⵯ', 'ⵀ', 'ⵃ', 'ⵄ', 'ⵅ', 'ⵇ', 'ⵉ', 'ⵊ', 'ⵍ', 'ⵎ', 'ⵏ', 'ⵓ', 'ⵔ', 'ⵕ', 'ⵖ', 'ⵙ', 'ⵚ', 'ⵛ', 'ⵜ', 'ⵟ', 'ⵡ', 'ⵢ', 'ⵣ', 'ⵥ'];
const CLE_REPLIEE = 'tala:touches-tamazight-repliees';

const lireReplie = (): boolean => {
  try { return localStorage.getItem(CLE_REPLIEE) === '1'; } catch { return false; }
};

/** Insère `texte` à la place de la sélection ; renvoie la nouvelle valeur et la position du curseur */
export function insererAuCurseur(valeur: string, debut: number, fin: number, texte: string): { valeur: string; curseur: number } {
  const d = Math.max(0, Math.min(debut, valeur.length));
  const f = Math.max(d, Math.min(fin, valeur.length));
  return { valeur: valeur.slice(0, d) + texte + valeur.slice(f), curseur: d + texte.length };
}

interface Props {
  ecriture: 'tz-ltn' | 'tz-tfng';
  cible: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  valeur: string;
  onChange: (valeur: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

export default function TouchesTamazight({ ecriture, cible, valeur, onChange, maxLength, disabled }: Props) {
  const { t } = useTranslation();
  const [replie, setReplie] = useState(lireReplie);
  const [majuscules, setMajuscules] = useState(false);
  const latin = ecriture === 'tz-ltn';
  const lettres = latin ? LATIN.map((l) => (majuscules ? l.toLocaleUpperCase() : l)) : TIFINAGH;

  const basculer = () => {
    setReplie((r) => {
      try { localStorage.setItem(CLE_REPLIEE, r ? '0' : '1'); } catch { /* stockage indisponible */ }
      return !r;
    });
  };

  const inserer = (lettre: string) => {
    const champ = cible.current;
    const debut = champ?.selectionStart ?? valeur.length;
    const fin = champ?.selectionEnd ?? valeur.length;
    const resultat = insererAuCurseur(valeur, debut, fin, lettre);
    if (maxLength && resultat.valeur.length > maxLength) return;
    onChange(resultat.valeur);
    // Curseur après la lettre, une fois la nouvelle valeur affichée
    requestAnimationFrame(() => {
      const c = cible.current;
      if (!c) return;
      c.focus();
      c.setSelectionRange(resultat.curseur, resultat.curseur);
    });
  };

  return (
    <div className="mt-2 rounded-md border bg-muted/40 p-2" dir="ltr">
      <button
        type="button"
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
        aria-expanded={!replie}
        onClick={basculer}
      >
        <span>{latin ? t('multilang.lettresLatin', 'Lettres tamazight') : t('multilang.lettresTifinagh', 'Lettres tifinagh')}</span>
        {replie ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
      </button>
      {!replie && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('multilang.lettresAria', 'Insérer une lettre')}>
          {lettres.map((lettre) => (
            <button
              key={lettre}
              type="button"
              disabled={disabled}
              // Le champ garde le focus (le clavier du téléphone ne se ferme pas)
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inserer(lettre)}
              aria-label={t('multilang.insererLettre', 'Insérer {{lettre}}', { lettre })}
              className="h-11 min-w-[2.75rem] rounded-md border bg-background px-2 text-lg leading-none hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              lang={latin ? 'ber-Latn' : 'ber-Tfng'}
            >
              {lettre}
            </button>
          ))}
          {latin && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMajuscules((m) => !m)}
              aria-pressed={majuscules}
              className={cn('h-11 rounded-md border px-3 text-sm', majuscules ? 'bg-primary text-primary-foreground' : 'bg-background')}
            >
              {t('multilang.majuscules', 'Maj.')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
