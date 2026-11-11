/**
 * Livre : extrait en PDF et lecture audio par l'écrivain (en plus de l'extrait en texte).
 * Les fichiers choisis partent après l'enregistrement du livre ; un extrait déjà en ligne
 * peut être retiré tout de suite (modification seulement).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Music, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { httpClient } from '@/services/httpClient';
import { messageErreurServeur } from '@/utils/erreurServeur';
import { getAssetUrl } from '@/helpers/assetUrl';
import type { MediaEnregistre } from './MediasEnregistres';

export type GenreExtrait = 'pdf' | 'audio';

/** Tailles « pas trop grandes », les mêmes que le serveur */
// PDF : le livre entier peut être envoyé (le site garde les 20 premières pages)
export const TAILLE_MAX_EXTRAIT: Record<GenreExtrait, number> = { pdf: 50 * 1024 * 1024, audio: 10 * 1024 * 1024 };
/** Lecture audio : 8 minutes au plus ; PDF : le site garde les 20 premières pages */
export const DUREE_MAX_AUDIO_MIN = 8;

/** Durée d'un son en secondes ; null si le navigateur ne la donne pas (la taille reste contrôlée) */
export function dureeAudio(fichier: File, attente = 4000): Promise<number | null> {
  return new Promise((fin) => {
    let adresse = '';
    try { adresse = URL.createObjectURL(fichier); } catch { fin(null); return; }
    const son = document.createElement('audio');
    const terminer = (d: number | null) => { clearTimeout(minuteur); URL.revokeObjectURL(adresse); fin(d); };
    const minuteur = setTimeout(() => terminer(null), attente);
    son.preload = 'metadata';
    son.onloadedmetadata = () => terminer(Number.isFinite(son.duration) ? son.duration : null);
    son.onerror = () => terminer(null);
    son.src = adresse;
  });
}

interface Props {
  oeuvreId?: number | string | null;
  enregistres: Partial<Record<GenreExtrait, MediaEnregistre | null>>;
  choisis: Partial<Record<GenreExtrait, File | null>>;
  onChoisir: (genre: GenreExtrait, fichier: File | null) => void;
  onRetire: (genre: GenreExtrait) => void;
}

const ExtraitFichiersLivre: React.FC<Props> = ({ oeuvreId, enregistres, choisis, onChoisir, onRetire }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [enCours, setEnCours] = useState<GenreExtrait | null>(null);

  const choisir = async (genre: GenreExtrait, fichier: File | undefined) => {
    if (!fichier) return;
    const bonType = genre === 'pdf' ? fichier.type === 'application/pdf' : fichier.type.startsWith('audio/');
    if (!bonType) {
      toast({ title: t('toasts.warning', 'Attention'), description: genre === 'pdf'
        ? t('ajouteroeuvre.extraitPdfType', 'Choisissez un fichier PDF.')
        : t('ajouteroeuvre.extraitAudioType', 'Choisissez un fichier son (MP3, M4A, WAV, OGG).'), variant: 'destructive' });
      return;
    }
    if (fichier.size > TAILLE_MAX_EXTRAIT[genre]) {
      toast({ title: t('toasts.warning', 'Attention'), description: t('ajouteroeuvre.extraitTropGros', 'Fichier trop gros : {{max}} Mo au plus.', { max: TAILLE_MAX_EXTRAIT[genre] / (1024 * 1024) }), variant: 'destructive' });
      return;
    }
    if (genre === 'audio') {
      const duree = await dureeAudio(fichier);
      if (duree !== null && duree > DUREE_MAX_AUDIO_MIN * 60) {
        toast({ title: t('toasts.warning', 'Attention'), description: t('ajouteroeuvre.extraitTropLong', 'Lecture trop longue : {{max}} minutes au plus.', { max: DUREE_MAX_AUDIO_MIN }), variant: 'destructive' });
        return;
      }
    }
    onChoisir(genre, fichier);
  };

  const retirer = async (genre: GenreExtrait) => {
    if (!oeuvreId) return;
    setEnCours(genre);
    try {
      const r = await httpClient.delete(`/oeuvres/${oeuvreId}/extrait/${genre}`);
      if (r?.success) {
        onRetire(genre);
        toast({ title: t('ajouteroeuvre.extraitRetire', 'Extrait retiré') });
      } else {
        toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(r, t('common.errorOccurred', 'Une erreur est survenue')), variant: 'destructive' });
      }
    } catch (err) {
      // Retrait refusé par le serveur : httpClient.delete rejette, sa raison est ici (avant : « Erreur » seul)
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(err, t('common.errorOccurred', 'Une erreur est survenue')), variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  const bloc = (genre: GenreExtrait) => {
    const Icone = genre === 'pdf' ? FileText : Music;
    const enregistre = enregistres[genre];
    const choisi = choisis[genre];
    const id = `extrait-${genre}`;
    return (
      <div className="space-y-2 rounded-lg border p-3">
        <Label htmlFor={id} className="flex items-center gap-2">
          <Icone className="h-4 w-4 text-primary" aria-hidden="true" />
          {genre === 'pdf' ? t('ajouteroeuvre.extraitPdf', 'Extrait en PDF') : t('ajouteroeuvre.extraitAudio', 'Extrait lu (audio)')}
          <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          {genre === 'pdf'
            ? t('ajouteroeuvre.extraitPdfAide', 'Envoyez votre livre entier en PDF : seules les 20 premières pages seront montrées aux lecteurs.')
            : t('ajouteroeuvre.extraitAudioAide', 'Vous lisez un passage : 8 minutes et 10 Mo au plus (MP3 conseillé).')}
        </p>
        {enregistre && !choisi && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {genre === 'audio'
              ? <audio controls preload="none" src={getAssetUrl(enregistre.url)} className="max-w-full" />
              : <a href={getAssetUrl(enregistre.url)} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t('ajouteroeuvre.extraitVoir', 'Voir l’extrait en ligne')}</a>}
            <Button type="button" variant="outline" size="sm" disabled={enCours === genre} onClick={() => retirer(genre)}>
              {enCours === genre ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              <span className="ms-1">{t('ajouteroeuvre.extraitRetirer', 'Retirer')}</span>
            </Button>
          </div>
        )}
        {choisi ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate">{choisi.name}</span>
            <Button type="button" variant="ghost" size="sm" aria-label={t('common.cancel', 'Annuler')} onClick={() => onChoisir(genre, null)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <input id={id} type="file" className="block w-full text-sm"
            accept={genre === 'pdf' ? 'application/pdf,.pdf' : 'audio/*,.mp3,.m4a,.wav,.ogg'}
            onChange={(e) => { choisir(genre, e.target.files?.[0]); e.target.value = ''; }} />
        )}
        {enregistre && choisi && (
          <p className="text-xs text-muted-foreground">{t('ajouteroeuvre.extraitRemplace', 'Il remplacera l’extrait déjà en ligne.')}</p>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {bloc('pdf')}
      {bloc('audio')}
    </div>
  );
};

export default ExtraitFichiersLivre;
