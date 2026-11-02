/**
 * Modification d'une œuvre : médias déjà enregistrés (pochette, extraits, photos…), avec un bouton
 * pour retirer un média envoyé par erreur (avant : impossible, il restait sur la fiche).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, FileText, Music, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { oeuvreService } from '@/services/oeuvre.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';

export interface MediaEnregistre {
  id_media: number;
  url: string;
  type_media: string;
  /** Texte ou objet par langue ; le serveur renvoie {} pour un titre vide */
  titre?: unknown;
  thumbnail_url?: string | null;
}

interface Props {
  oeuvreId: number;
  medias: MediaEnregistre[];
  onRetire: (idMedia: number) => void;
}

const MediasEnregistres: React.FC<Props> = ({ oeuvreId, medias, onRetire }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [aRetirer, setARetirer] = useState<MediaEnregistre | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!medias.length) return null;

  const retirer = async () => {
    if (!aRetirer) return;
    setEnCours(true);
    const res = await oeuvreService.deleteMedia(oeuvreId, aRetirer.id_media);
    setEnCours(false);
    if (res.success) {
      onRetire(aRetirer.id_media);
      toast({ title: t('ajouteroeuvre.mediaRetire', 'Média retiré') });
      setARetirer(null);
    } else {
      toast({ title: t('common.error', 'Erreur'), description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-lg">{t('ajouteroeuvre.mediasEnregistres', 'Médias déjà enregistrés')}</h4>
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
        {medias.map((media) => {
          const titre = getLocalizedText(media.titre, i18n.language, '');
          return (
          <div key={media.id_media} className="border-2 border-border rounded-lg p-3 space-y-2 bg-card">
            {media.type_media === 'image' ? (
              <img src={getAssetUrl(media.thumbnail_url || media.url)} alt={titre} className="w-full h-32 object-cover rounded" loading="lazy" />
            ) : (
              <div className="w-full h-32 bg-muted rounded flex items-center justify-center" aria-hidden="true">
                {media.type_media === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                {media.type_media === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                {!['video', 'audio'].includes(media.type_media) && <FileText className="h-8 w-8 text-muted-foreground" />}
              </div>
            )}
            {titre && <p className="text-sm truncate" dir="auto">{titre}</p>}
            <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setARetirer(media)}
              aria-label={titre ? `${t('ajouteroeuvre.retirerMedia', 'Retirer')} : ${titre}` : undefined}>
              <Trash2 className="h-4 w-4 me-2" aria-hidden="true" />
              {t('ajouteroeuvre.retirerMedia', 'Retirer')}
            </Button>
          </div>
          );
        })}
      </div>

      <Dialog open={!!aRetirer} onOpenChange={(o) => { if (!o) setARetirer(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ajouteroeuvre.retirerMediaTitre', 'Retirer ce média ?')}</DialogTitle>
            <DialogDescription>{t('ajouteroeuvre.retirerMediaAide', 'Il disparaît de la fiche de l’œuvre. Cette action est définitive.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setARetirer(null)}>{t('common.cancel', 'Annuler')}</Button>
            <Button variant="destructive" disabled={enCours} onClick={retirer}>
              {enCours && <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />}
              {t('ajouteroeuvre.retirerMedia', 'Retirer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediasEnregistres;
