/**
 * Le professionnel gère la galerie (10 photos au plus) et les menus (3 au plus, PDF ou image) de son
 * service, sur la page de modification. Même fonctionnement que les photos et documents d'un
 * événement : le fichier est mis en ligne, puis rattaché au service.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, FileText, Trash2, Upload, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { httpClient } from '@/services/httpClient';
import { uploadService } from '@/services/upload.service';
import { serviceService, type MediaService } from '@/services/service.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { messageErreurServeur } from '@/utils/erreurServeur';

const MAX_PHOTOS = 10;
const MAX_MENUS = 3;
const PDF_MAX = 20 * 1024 * 1024;

const ServiceMediasGestion: React.FC<{ serviceId: number }> = ({ serviceId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cle = ['service-medias', serviceId];
  const [photos, setPhotos] = useState<File[]>([]);
  const [menu, setMenu] = useState<File | null>(null);
  const [nomMenu, setNomMenu] = useState('');
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cleChamp, setCleChamp] = useState(0);
  const [aRetirer, setARetirer] = useState<MediaService | null>(null);
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  // Photos choisies au-delà des places libres : écartées, et le professionnel est prévenu
  const [ecartees, setEcartees] = useState(0);

  const { data } = useQuery({
    queryKey: cle,
    queryFn: async () => {
      const res = await httpClient.get<{ galerie?: MediaService[]; menus?: MediaService[] }>(`/services/${serviceId}`);
      return { galerie: res.data?.galerie || [], menus: res.data?.menus || [] };
    }
  });
  const galerie = data?.galerie || [];
  const menus = data?.menus || [];
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: cle });

  const ajouterPhotos = async () => {
    setErreur(null);
    // Chaque photo rattachée sort de la liste : après un échec, « Ajouter » ne renvoie que les restantes
    // (avant : les premières étaient envoyées deux fois et prenaient des places sur les 10)
    let restantes = [...photos];
    try {
      for (const [i, f] of photos.entries()) {
        setEnvoi(t('service.medias.envoiPhotos', 'Envoi {{fait}} / {{total}}…', { fait: i + 1, total: photos.length }));
        const envoye = await uploadService.uploadImage(f);
        if (!envoye.success || !envoye.data?.url) throw envoye;
        const res = await serviceService.ajouterMedia(serviceId, { type: 'photo', url: envoye.data.url });
        if (!res.success) throw res;
        restantes = restantes.filter((r) => r !== f);
      }
      setPhotos([]); setEcartees(0); setCleChamp((c) => c + 1);
      toast({ title: t('service.medias.photosAjoutees', 'Photos ajoutées à votre service') });
    } catch (e) {
      setPhotos(restantes);
      setErreur(messageErreurServeur(e, t('service.medias.echec', 'Le fichier n’a pas pu être ajouté. Réessayez.')));
    } finally {
      setEnvoi(null); rafraichir();
    }
  };

  const ajouterMenu = async () => {
    if (!menu) return;
    setErreur(null);
    if (menu.type === 'application/pdf' && menu.size > PDF_MAX) {
      setErreur(t('service.medias.pdfTropGros', 'Le PDF est trop lourd (20 Mo au plus).'));
      return;
    }
    setEnvoi(t('service.medias.envoi', 'Envoi…'));
    try {
      const envoye = menu.type === 'application/pdf' ? await uploadService.uploadDocument(menu) : await uploadService.uploadImage(menu);
      if (!envoye.success || !envoye.data?.url) throw envoye;
      const res = await serviceService.ajouterMedia(serviceId, { type: 'menu', url: envoye.data.url, nom: nomMenu.trim() || undefined });
      if (!res.success) throw res;
      setMenu(null); setNomMenu(''); setCleChamp((c) => c + 1);
      toast({ title: t('service.medias.menuAjoute', 'Menu ajouté à votre service') });
    } catch (e) {
      setErreur(messageErreurServeur(e, t('service.medias.echec', 'Le fichier n’a pas pu être ajouté. Réessayez.')));
    } finally {
      setEnvoi(null); rafraichir();
    }
  };

  const retirer = async () => {
    if (!aRetirer || retraitEnCours) return;
    setRetraitEnCours(true);
    try {
      const res = await serviceService.retirerMedia(serviceId, aRetirer.id);
      if (!res.success) throw res;
      rafraichir();
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: messageErreurServeur(e, t('common.deleteError', 'Impossible de supprimer')), variant: 'destructive' });
    } finally {
      setRetraitEnCours(false);
      setARetirer(null);
    }
  };

  return (
    <Card data-testid="service-medias">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" aria-hidden="true" />
          {t('service.medias.titre', 'Photos et menu')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('service.medias.aide', 'Montrez votre salle, vos plats, vos chambres, la vue… et, pour un restaurant, votre carte. La photo principale ci-dessus reste la première.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Galerie */}
        <div className="space-y-3">
          <h3 className="font-medium">{t('service.medias.galerie', 'Galerie')} ({galerie.length}/{MAX_PHOTOS})</h3>
          {galerie.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {galerie.map((g) => (
                <li key={g.id} className="relative">
                  <img src={getAssetUrl(g.url || '', { width: 240 })} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
                  <Button type="button" size="icon" variant="secondary" className="absolute end-1 top-1 h-8 w-8" onClick={() => setARetirer(g)} aria-label={t('service.medias.retirerPhoto', 'Retirer la photo')}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {galerie.length < MAX_PHOTOS && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Label htmlFor="service-photos" className="text-sm">{t('service.medias.choisirPhotos', 'Ajouter des photos (une ou plusieurs)')}</Label>
                <Input key={`p${cleChamp}`} id="service-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!!envoi} className="mt-1"
                  onChange={(e) => {
                    const choisies = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
                    const place = MAX_PHOTOS - galerie.length;
                    setEcartees(Math.max(0, choisies.length - place));
                    setPhotos(choisies.slice(0, place));
                  }} />
                {ecartees > 0 && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400" role="status">
                    {t('service.medias.ecartees', 'Il reste {{place}} place(s) : seules les {{place}} premières photos seront ajoutées.', { place: MAX_PHOTOS - galerie.length })}
                  </p>
                )}
              </div>
              <Button type="button" onClick={ajouterPhotos} disabled={photos.length === 0 || !!envoi}>
                <Upload className="me-2 h-4 w-4" aria-hidden="true" />{t('service.medias.ajouterPhotos', 'Ajouter les photos')}
              </Button>
            </div>
          )}
        </div>

        {/* Menus */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-medium">
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
            {t('service.medias.menus', 'Menu, carte ou tarifs')} ({menus.length}/{MAX_MENUS})
          </h3>
          {menus.length > 0 && (
            <ul className="space-y-2">
              {menus.map((m, i) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="flex min-w-0 items-center gap-2" dir="auto">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{m.nom || t('servicesVisiteurs.menus.sansNom', 'Menu {{n}}', { n: i + 1 })}</span>
                    <span className="text-xs text-muted-foreground">{m.pdf ? 'PDF' : t('service.medias.image', 'image')}</span>
                  </span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => setARetirer(m)} aria-label={t('service.medias.retirerMenu', 'Retirer le menu')}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {menus.length < MAX_MENUS && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <div>
                <Label htmlFor="service-menu" className="text-sm">{t('service.medias.choisirMenu', 'Fichier du menu (PDF ou photo)')}</Label>
                <Input key={`m${cleChamp}`} id="service-menu" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" disabled={!!envoi} className="mt-1"
                  onChange={(e) => setMenu(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label htmlFor="service-menu-nom" className="text-sm">{t('service.medias.nomMenu', 'Titre (facultatif)')}</Label>
                <Input id="service-menu-nom" value={nomMenu} onChange={(e) => setNomMenu(e.target.value)} maxLength={100} disabled={!!envoi} className="mt-1"
                  placeholder={t('service.medias.nomMenuExemple', 'ex. Carte d’été, Menu du jour, Tarifs des chambres')} />
              </div>
              <Button type="button" onClick={ajouterMenu} disabled={!menu || !!envoi}>
                <Upload className="me-2 h-4 w-4" aria-hidden="true" />{t('service.medias.ajouterMenu', 'Ajouter le menu')}
              </Button>
            </div>
          )}
        </div>

        {envoi && <p role="status" className="text-sm text-muted-foreground">{envoi}</p>}
        {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      </CardContent>
      <ConfirmDialog
        open={!!aRetirer}
        onOpenChange={(o) => { if (!o) setARetirer(null); }}
        title={t('service.medias.retirerTitre', 'Retirer ce fichier ?')}
        description={t('service.medias.retirerAide', 'Il disparaît de la page de votre service.')}
        confirmLabel={t('common.delete', 'Supprimer')}
        cancelLabel={t('common.cancel', 'Annuler')}
        variant="destructive"
        loading={retraitEnCours}
        onConfirm={retirer}
      />
    </Card>
  );
};

export default ServiceMediasGestion;
