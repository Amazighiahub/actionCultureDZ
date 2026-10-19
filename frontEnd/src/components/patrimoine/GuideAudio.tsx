/**
 * GuideAudio - Enregistrements audio d'un lieu (guide, conte, prononciation), par langue.
 * Le visiteur choisit sa langue ; un professionnel validé peut ajouter un enregistrement.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getAssetUrl } from '@/helpers/assetUrl';
import { patrimoineService } from '@/services/patrimoine.service';

export interface MediaAudio {
  id: number;
  url: string;
  type: string;
  langue?: string | null;
}

interface GuideAudioProps {
  lieuId: number;
  medias: MediaAudio[];
  lang: string;
  canUpload: boolean;
  onUploaded: (medias: MediaAudio[]) => void;
}

// Noms des langues dans leur propre écriture : chacun reconnaît la sienne
const LANGUES: Array<{ code: string; label: string; dir: 'ltr' | 'rtl'; htmlLang: string }> = [
  { code: 'tz-tfng', label: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', dir: 'ltr', htmlLang: 'ber' },
  { code: 'tz-ltn', label: 'Tamaziɣt', dir: 'ltr', htmlLang: 'ber-Latn' },
  { code: 'ar', label: 'العربية', dir: 'rtl', htmlLang: 'ar' },
  { code: 'fr', label: 'Français', dir: 'ltr', htmlLang: 'fr' },
  { code: 'en', label: 'English', dir: 'ltr', htmlLang: 'en' }
];
const SANS_LANGUE = 'autre';

// Formats acceptés par le serveur (mp3, wav, ogg, aac, m4a des téléphones)
const ACCEPT_AUDIO = 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,.m4a,.mp3,.wav,.ogg,.aac';
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const GuideAudio: React.FC<GuideAudioProps> = ({ lieuId, medias, lang, canUpload, onUploaded }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [langueEnvoi, setLangueEnvoi] = useState(LANGUES.some(l => l.code === lang) ? lang : 'tz-ltn');
  const [uploading, setUploading] = useState(false);

  const parLangue = useMemo(() => {
    const groupes = new Map<string, MediaAudio[]>();
    for (const m of medias) {
      const code = m.langue && LANGUES.some(l => l.code === m.langue) ? m.langue : SANS_LANGUE;
      groupes.set(code, [...(groupes.get(code) || []), m]);
    }
    return groupes;
  }, [medias]);

  const languesDispo = [...LANGUES.filter(l => parLangue.has(l.code)).map(l => l.code), ...(parLangue.has(SANS_LANGUE) ? [SANS_LANGUE] : [])];
  // Par défaut : la langue de l'interface si un enregistrement existe, sinon le premier
  const [choix, setChoix] = useState<string | null>(null);
  const langueActive = choix && languesDispo.includes(choix) ? choix : (languesDispo.includes(lang) ? lang : languesDispo[0]);
  const infoActive = LANGUES.find(l => l.code === langueActive);

  const envoyer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      toast({ title: t('common.error', 'Erreur'), description: t('patrimoine.audio.tooLarge', 'Fichier trop lourd (50 Mo maximum)'), variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const res = await patrimoineService.uploadMedias(lieuId, [file], langueEnvoi);
      if (!res.success || !res.data) throw new Error(res.error);
      const ajoutes = (res.data as unknown as MediaAudio[]).filter(m => m.type === 'audio');
      if (ajoutes.length === 0) throw new Error(t('patrimoine.audio.notAudio', "Ce fichier n'a pas été reconnu comme un enregistrement audio"));
      onUploaded(ajoutes);
      setChoix(langueEnvoi);
      toast({ title: t('patrimoine.audio.added', 'Enregistrement ajouté') });
    } catch (err) {
      toast({
        title: t('common.error', 'Erreur'),
        description: err instanceof Error && err.message ? err.message : t('patrimoine.audio.uploadError', "L'enregistrement n'a pas pu être envoyé"),
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {languesDispo.length > 0 ? (
        <>
          <div role="group" aria-label={t('patrimoine.audio.chooseLanguage', 'Langue de l\'écoute')} className="flex flex-wrap gap-2">
            {languesDispo.map(code => {
              const info = LANGUES.find(l => l.code === code);
              return (
                <Button key={code} type="button" size="sm" variant={code === langueActive ? 'default' : 'outline'}
                  aria-pressed={code === langueActive} onClick={() => setChoix(code)}
                  lang={info?.htmlLang} dir={info?.dir}>
                  {info?.label || t('patrimoine.audio.otherLanguage', 'Autre')}
                  <span className="ms-1 text-xs opacity-70">({parLangue.get(code)?.length})</span>
                </Button>
              );
            })}
          </div>
          <ul className="space-y-2">
            {(parLangue.get(langueActive) || []).map((m, i) => (
              <li key={m.id}>
                {/* preload none : rien n'est téléchargé avant que le visiteur appuie sur lecture */}
                <audio controls preload="none" src={getAssetUrl(m.url)} className="w-full"
                  aria-label={t('patrimoine.audio.recording', 'Enregistrement {{n}} ({{langue}})', { n: i + 1, langue: infoActive?.label || '' })} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('patrimoine.audio.empty', 'Aucun enregistrement pour l\'instant. Les voix des anciens, les contes et la prononciation des noms de lieux sont précieux : ajoutez-les.')}
        </p>
      )}

      {canUpload && (
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
          <div className="space-y-1">
            <Label htmlFor={`audio-langue-${lieuId}`} className="text-xs">{t('patrimoine.audio.languageOfRecording', 'Langue de l\'enregistrement')}</Label>
            <Select value={langueEnvoi} onValueChange={setLangueEnvoi}>
              <SelectTrigger id={`audio-langue-${lieuId}`} className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUES.map(l => <SelectItem key={l.code} value={l.code}><span lang={l.htmlLang} dir={l.dir}>{l.label}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <input ref={inputRef} type="file" accept={ACCEPT_AUDIO} className="hidden" onChange={envoyer} />
          <Button type="button" variant="outline" size="sm" className="h-9" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Upload className="h-4 w-4 me-1" />}
            {uploading ? t('patrimoine.audio.uploading', 'Envoi…') : t('patrimoine.audio.add', 'Ajouter un enregistrement')}
          </Button>
          <p className="w-full text-xs text-muted-foreground flex items-center gap-1">
            <Headphones className="h-3 w-3" aria-hidden="true" />
            {t('patrimoine.audio.formats', 'MP3, M4A (téléphone), WAV, OGG — 50 Mo maximum. Demandez l\'accord des personnes enregistrées.')}
          </p>
        </div>
      )}
    </div>
  );
};

export default GuideAudio;
