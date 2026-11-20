/**
 * « Écouter le texte » sur la page d'un article (2026-11-20, section Tamazight) : les enregistrements audio de
 * l'œuvre, et pour son auteur un bouton pour ajouter la lecture à voix haute du texte. Un texte en tamazight avec
 * son enregistrement est la donnée la plus utile à la reconnaissance de la parole (données ouvertes).
 */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/services/httpClient';
import { getAssetUrl } from '@/helpers/assetUrl';
import { messageErreurServeur } from '@/utils/erreurServeur';

interface MediaAudio { id_media?: number; url?: string; type_media?: string; titre?: unknown }

interface Props {
  idOeuvre: number;
  medias: MediaAudio[];
  peutModifier: boolean;
  /** Après l'ajout : relire l'article */
  onAjoute: () => void;
}

const FORMATS = 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,audio/m4a,.mp3,.m4a,.wav,.ogg,.aac';

const LectureAudio: React.FC<Props> = ({ idOeuvre, medias, peutModifier, onAjoute }) => {
  const { t } = useTranslation();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const audios = medias.filter((m) => m.type_media === 'audio' && m.url);
  if (!audios.length && !peutModifier) return null;

  const envoyer = async (fichier?: File) => {
    if (!fichier) return;
    setEnvoi(true); setErreur(null);
    try {
      const fd = new FormData();
      fd.append('medias', fichier);
      const r = await httpClient.postFormData(`/oeuvres/${idOeuvre}/medias/upload`, fd);
      if (!r.success) throw r;
      onAjoute();
    } catch (e) {
      setErreur(messageErreurServeur(e, t('article.audio.echec', 'L’enregistrement n’a pas pu être ajouté.')));
    } finally {
      setEnvoi(false);
      if (champ.current) champ.current.value = '';
    }
  };

  return (
    <section className="mag-audio my-6 space-y-3 rounded-lg border p-4" aria-label={t('article.audio.titre', 'Écouter le texte')}>
      <h2 className="flex items-center gap-2 text-base font-semibold"><Headphones className="h-5 w-5 text-primary" aria-hidden="true" />{t('article.audio.titre', 'Écouter le texte')}</h2>
      {audios.map((m) => (
        <audio key={m.id_media || m.url} controls preload="none" src={getAssetUrl(m.url)} className="w-full" />
      ))}
      {peutModifier && (
        <div className="space-y-1">
          <input ref={champ} type="file" accept={FORMATS} className="hidden" onChange={(e) => envoyer(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="outline" disabled={envoi} onClick={() => champ.current?.click()}>
            {envoi ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Upload className="me-2 h-4 w-4" aria-hidden="true" />}
            {t('article.audio.ajouter', 'Ajouter la lecture à voix haute')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('article.audio.aide', 'Lisez votre texte et envoyez l’enregistrement (MP3, M4A, WAV ou OGG). Si vous avez accepté le partage ouvert, il accompagnera le texte dans les données ouvertes.')}</p>
        </div>
      )}
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
    </section>
  );
};

export default LectureAudio;
