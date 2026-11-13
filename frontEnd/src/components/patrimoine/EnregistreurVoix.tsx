/**
 * Enregistrer une voix depuis le téléphone, dans le guide audio d'un lieu : un ancien qui raconte, un
 * conte, le nom d'un lieu prononcé. Enregistrer, arrêter, réécouter, puis envoyer avec la variante
 * parlée (« chaoui de Ghoufi »), le nom de la personne (facultatif) et son accord (obligatoire).
 * Sans micro ou sans permission, l'envoi d'un fichier déjà enregistré reste possible (GuideAudio).
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, RotateCcw, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEnregistreurVoix, enregistrementPossible } from '@/hooks/useEnregistreurVoix';
import { patrimoineService } from '@/services/patrimoine.service';
import type { MediaAudio } from './GuideAudio';

const DUREE_MAX = 300; // 5 minutes
const minutes = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

interface Props {
  lieuId: number;
  /** Langue choisie dans le guide audio */
  langue: string;
  onEnvoye: (medias: MediaAudio[]) => void;
}

export default function EnregistreurVoix({ lieuId, langue, onEnvoye }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const id = useId();
  const { etat, secondes, fichier, urlEcoute, demarrer, arreter, recommencer } = useEnregistreurVoix(DUREE_MAX);
  const [parler, setParler] = useState('');
  const [nom, setNom] = useState('');
  const [accord, setAccord] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  if (!enregistrementPossible()) return null;

  const envoyer = async () => {
    if (!fichier || !accord) return;
    setEnvoi(true);
    try {
      const res = await patrimoineService.uploadVoix(lieuId, fichier, { langue, parler, nom });
      if (!res.success || !res.data) throw new Error(res.error);
      onEnvoye((res.data as unknown as MediaAudio[]).filter((m) => m.type === 'audio'));
      toast({ title: t('patrimoine.voix.envoyee', 'Voix ajoutée au guide audio. Merci !') });
      recommencer();
      setParler(''); setNom(''); setAccord(false);
    } catch (err) {
      toast({
        title: t('common.error', 'Erreur'),
        description: err instanceof Error && err.message ? err.message : t('patrimoine.audio.uploadError', "L'enregistrement n'a pas pu être envoyé"),
        variant: 'destructive',
      });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="w-full space-y-3 rounded-lg border p-3" data-testid="enregistreur-voix">
      <p className="text-sm font-medium">{t('patrimoine.voix.titre', 'Enregistrer une voix avec le micro')}</p>

      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        {etat === 'enregistrement' ? (
          <>
            <Button type="button" variant="destructive" size="sm" onClick={arreter}>
              <Square className="h-4 w-4 me-1" aria-hidden="true" />{t('patrimoine.voix.arreter', 'Arrêter')}
            </Button>
            <span className="text-sm tabular-nums" role="timer">
              <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse me-2" aria-hidden="true" />
              {t('patrimoine.voix.enCours', 'Enregistrement… {{temps}} / {{max}}', { temps: minutes(secondes), max: minutes(DUREE_MAX) })}
            </span>
          </>
        ) : etat === 'pret' && urlEcoute ? (
          <>
            <audio controls src={urlEcoute} className="w-full min-w-0" aria-label={t('patrimoine.voix.reecouter', 'Réécouter l’enregistrement')} />
            <Button type="button" variant="outline" size="sm" onClick={recommencer} disabled={envoi}>
              <RotateCcw className="h-4 w-4 me-1" aria-hidden="true" />{t('patrimoine.voix.recommencer', 'Recommencer')}
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={demarrer}>
            <Mic className="h-4 w-4 me-1" aria-hidden="true" />{t('patrimoine.voix.enregistrer', 'Enregistrer')}
          </Button>
        )}
      </div>

      {etat === 'refuse' && (
        <p className="text-sm text-destructive" role="alert">
          {t('patrimoine.voix.refuse', 'Le micro n’est pas autorisé. Autorisez-le pour taladz.com dans les réglages du navigateur, ou envoyez un fichier déjà enregistré.')}
        </p>
      )}
      {etat === 'erreur' && (
        <p className="text-sm text-destructive" role="alert">
          {t('patrimoine.voix.erreur', 'L’enregistrement n’a pas fonctionné sur ce téléphone. Vous pouvez envoyer un fichier déjà enregistré.')}
        </p>
      )}

      {etat === 'pret' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor={`${id}-parler`} className="text-xs">{t('patrimoine.voix.parler', 'Variante parlée (facultatif)')}</Label>
            <Input id={`${id}-parler`} value={parler} maxLength={100} onChange={(e) => setParler(e.target.value)}
              placeholder={t('patrimoine.voix.parlerExemple', 'Ex. : chaoui de Ghoufi')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-nom`} className="text-xs">{t('patrimoine.voix.nom', 'Nom de la personne enregistrée (facultatif)')}</Label>
            <Input id={`${id}-nom`} value={nom} maxLength={150} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id={`${id}-accord`} checked={accord} onCheckedChange={(v) => setAccord(v === true)} className="mt-0.5" />
            <Label htmlFor={`${id}-accord`} className="text-sm font-normal leading-snug">
              {t('patrimoine.voix.accord', 'La personne enregistrée est d’accord pour que sa voix soit publiée sur Tala DZ.')}
            </Label>
          </div>
          <Button type="button" size="sm" onClick={envoyer} disabled={!accord || envoi}>
            {envoi ? <Loader2 className="h-4 w-4 me-1 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4 me-1" aria-hidden="true" />}
            {envoi ? t('patrimoine.audio.uploading', 'Envoi…') : t('patrimoine.voix.envoyer', 'Envoyer la voix')}
          </Button>
        </div>
      )}
    </div>
  );
}
