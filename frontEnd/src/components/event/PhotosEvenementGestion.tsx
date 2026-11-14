/**
 * PhotosEvenementGestion — l'organisateur ajoute les photos de son événement (audit V11 OUT-23) :
 * elles s'affichent dans la galerie de la page de l'événement. Plusieurs photos d'un coup, avec une
 * légende et un photographe facultatifs (communs aux photos envoyées ensemble). 30 au plus.
 * Même fonctionnement que les documents (DocumentsEvenementGestion) : l'image est mise en ligne,
 * puis rattachée à l'événement.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { evenementService } from '@/services/evenement.service';
import { uploadService } from '@/services/upload.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { ConfirmDialog } from '@/components/shared';
import { messageErreurServeur } from '@/utils/erreurServeur';

const MAX_PHOTOS = 30;

const PhotosEvenementGestion: React.FC<{ evenementId: number }> = ({ evenementId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['event-photos', evenementId];
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [legende, setLegende] = useState('');
  const [credit, setCredit] = useState('');
  const [envoi, setEnvoi] = useState<{ fait: number; total: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cleChamp, setCleChamp] = useState(0);
  const [aRetirer, setARetirer] = useState<number | null>(null);
  const [retraitEnCours, setRetraitEnCours] = useState(false);

  const { data: photos = [] } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await evenementService.getMedias(evenementId);
      return res.success && Array.isArray(res.data) ? res.data.filter((m) => m.type_media === 'image') : [];
    }
  });
  const place = MAX_PHOTOS - photos.length;

  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErreur(null);
    const choisis = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (choisis.length > place) {
      setErreur(t('event.photos.tropNombreuses', '{{n}} photos au plus peuvent encore être ajoutées.', { n: place }));
    }
    setFichiers(choisis.slice(0, place));
  };

  const ajouter = async () => {
    if (fichiers.length === 0) return;
    setErreur(null);
    let ajoutees = 0;
    try {
      for (const [i, f] of fichiers.entries()) {
        setEnvoi({ fait: i, total: fichiers.length });
        const envoye = await uploadService.uploadImage(f);
        if (!envoye.success || !envoye.data?.url) throw envoye;
        const res = await evenementService.ajouterPhoto(evenementId, { url: envoye.data.url, legende: legende.trim(), credit: credit.trim() });
        if (!res.success) throw res;
        ajoutees += 1;
      }
      toast({ title: t('event.photos.ajoutees', '{{count}} photo(s) ajoutée(s) à la page de l’événement', { count: ajoutees }) });
      setFichiers([]); setLegende(''); setCleChamp((c) => c + 1);
    } catch (e) {
      setErreur(messageErreurServeur(e, t('event.photos.echec', 'Une photo n’a pas pu être ajoutée. Réessayez.')));
    } finally {
      setEnvoi(null);
      if (ajoutees) {
        queryClient.invalidateQueries({ queryKey: cle });
        queryClient.invalidateQueries({ queryKey: ['event-medias', evenementId] });
      }
    }
  };

  const retirer = async () => {
    if (aRetirer === null) return;
    setRetraitEnCours(true);
    try {
      const res = await evenementService.retirerPhoto(evenementId, aRetirer);
      if (!res.success) throw res;
      queryClient.invalidateQueries({ queryKey: cle });
    } catch (err) {
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(err, t('common.deleteError', 'Impossible de supprimer')), variant: 'destructive' });
    } finally {
      setRetraitEnCours(false);
      setARetirer(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" aria-hidden="true" />
          {t('event.photos.titre', 'Photos de l’événement')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('event.photos.aide', 'Montrez comment ça s’est passé : elles s’affichent dans la galerie de la page de l’événement. Seulement des photos que vous avez le droit de publier.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="photos-evenement">
            {photos.map((p) => (
              <li key={p.id_media} className="relative">
                <img src={getAssetUrl(p.url)} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                <Button type="button" size="icon" variant="secondary" className="absolute end-1 top-1 h-8 w-8"
                  onClick={() => setARetirer(p.id_media)} aria-label={t('event.photos.retirer', 'Retirer la photo')}>
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {place > 0 ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div>
              <Label htmlFor="photos-evenement">{t('event.photos.fichiers', 'Photos (une ou plusieurs)')}</Label>
              <Input key={cleChamp} id="photos-evenement" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choisir} disabled={!!envoi} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="photos-legende">{t('event.photos.legende', 'Légende (facultatif)')}</Label>
              <Input id="photos-legende" value={legende} onChange={(e) => setLegende(e.target.value)} maxLength={200} disabled={!!envoi} className="mt-1"
                placeholder={t('event.photos.legendeExemple', 'ex. Le concert de clôture')} />
            </div>
            <div>
              <Label htmlFor="photos-credit">{t('event.photos.credit', 'Photographe (facultatif)')}</Label>
              <Input id="photos-credit" value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={150} disabled={!!envoi} className="mt-1" />
            </div>
            {erreur && <p className="text-sm text-destructive" role="alert">{erreur}</p>}
            {/* type="button" : la section peut être dans un formulaire, qu'elle ne doit pas envoyer */}
            <Button type="button" onClick={ajouter} disabled={fichiers.length === 0 || !!envoi}>
              <Upload className="h-4 w-4 me-2" aria-hidden="true" />
              {envoi
                ? t('event.photos.envoi', 'Envoi {{fait}} / {{total}}…', { fait: envoi.fait + 1, total: envoi.total })
                : t('event.photos.ajouter', 'Ajouter les photos')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('event.photos.max', '30 photos au plus : retirez-en une pour en ajouter une autre.')}
          </p>
        )}
      </CardContent>
      <ConfirmDialog
        open={aRetirer !== null}
        onOpenChange={(o) => { if (!o && !retraitEnCours) setARetirer(null); }}
        title={t('event.photos.retirerTitre', 'Retirer cette photo ?')}
        description={t('event.photos.retirerAide', 'Elle disparaît de la galerie de l’événement.')}
        confirmLabel={t('event.photos.retirer', 'Retirer la photo')}
        cancelLabel={t('common.cancel', 'Annuler')}
        variant="destructive"
        loading={retraitEnCours}
        onConfirm={retirer}
      />
    </Card>
  );
};

export default PhotosEvenementGestion;
