/**
 * Photos jointes aux avis sur les services, en attente de validation (audit V11, accord de la
 * responsable). Publier : la photo paraît avec l'avis. Refuser : motif obligatoire (motifs prêts),
 * envoyé à l'auteur ; le fichier est effacé. Rien n'est affiché quand la file est vide.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MotifRefusDialog from '@/components/admin/MotifRefusDialog';
import { commentaireService, type PhotoAvisEnAttente } from '@/services/commentaire.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { messageErreurServeur } from '@/utils/erreurServeur';

const PhotosAvisEnAttente: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['admin-photos-avis'];
  const [aRefuser, setARefuser] = useState<PhotoAvisEnAttente | null>(null);
  const [enCours, setEnCours] = useState<number | null>(null);

  const { data: photos = [] } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await commentaireService.photosEnAttente();
      return res.success && Array.isArray(res.data) ? res.data : [];
    }
  });
  if (photos.length === 0) return null;

  const decider = async (photo: PhotoAvisEnAttente, decision: 'publie' | 'rejete', motif?: string) => {
    setEnCours(photo.id_photo);
    try {
      const res = await commentaireService.deciderPhoto(photo.id_photo, decision, motif);
      if (!res.success) throw res;
      toast({ title: decision === 'publie' ? t('admin.photosAvis.publiee', 'Photo publiée avec l’avis') : t('admin.photosAvis.refusee', 'Photo refusée : l’auteur a reçu le motif') });
      await queryClient.invalidateQueries({ queryKey: cle });
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(e, t('admin.photosAvis.echec', 'La décision n’a pas pu être enregistrée.')), variant: 'destructive' });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <Card data-testid="photos-avis-en-attente">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" aria-hidden="true" />
          {t('admin.photosAvis.titre', 'Photos d’avis à valider')} ({photos.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('admin.photosAvis.aide', 'Vérifiez que la photo montre bien le service, qu’elle n’est pas reprise d’ailleurs et qu’aucune personne n’est reconnaissable sans son accord.')}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {photos.map((p) => (
            <li key={p.id_photo} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row">
              <a href={getAssetUrl(p.url)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src={getAssetUrl(p.url)} alt="" className="h-32 w-32 rounded object-cover" />
              </a>
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="font-medium">
                  {p.id_service
                    ? <Link to={`/services/${p.id_service}`} className="text-primary underline" target="_blank">{getLocalizedText(p.service_nom as never) || t('admin.photosAvis.service', 'Service')}</Link>
                    : t('admin.photosAvis.service', 'Service')}
                </p>
                {p.auteur && <p className="text-muted-foreground">{`${getLocalizedText(p.auteur.prenom as never)} ${getLocalizedText(p.auteur.nom as never)}`.trim()}</p>}
                <p className="line-clamp-3 whitespace-pre-line" dir="auto">{p.contenu}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={() => decider(p, 'publie')} disabled={enCours === p.id_photo}>
                    <CheckCircle className="me-1 h-4 w-4" aria-hidden="true" />{t('admin.photosAvis.publier', 'Publier')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setARefuser(p)} disabled={enCours === p.id_photo}>
                    <XCircle className="me-1 h-4 w-4" aria-hidden="true" />{t('admin.photosAvis.refuser', 'Refuser')}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <MotifRefusDialog
        open={!!aRefuser}
        onClose={() => setARefuser(null)}
        titre={t('admin.photosAvis.refuserTitre', 'Refuser cette photo ?')}
        description={t('admin.photosAvis.refuserAide', 'L’avis reste publié sans la photo. L’auteur reçoit votre motif ; le fichier est effacé.')}
        libelleBouton={t('admin.photosAvis.refuser', 'Refuser')}
        onConfirm={async (motif) => { if (aRefuser) await decider(aRefuser, 'rejete', motif); setARefuser(null); }}
      />
    </Card>
  );
};

export default PhotosAvisEnAttente;
