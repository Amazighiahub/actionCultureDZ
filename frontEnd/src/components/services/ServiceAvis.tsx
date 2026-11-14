/**
 * Avis des visiteurs sur un service : note moyenne (calculée par le serveur), avis publiés,
 * formulaire (un avis par membre, pas sur son propre service) et réponse du professionnel.
 * Un avis peut porter jusqu'à 3 photos (case d'accord obligatoire) : elles paraissent après
 * validation par l'équipe (audit V11, accord de la responsable).
 */
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle, Reply, Send, AlertCircle, Camera, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/shared/StarRating';
import { useAuth } from '@/hooks/useAuth';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { commentaireService, type AvisService } from '@/services/commentaire.service';
import ActionsCommentaire from '@/components/shared/ActionsCommentaire';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { uploadService } from '@/services/upload.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { messageErreurServeur } from '@/utils/erreurServeur';

const MAX_PHOTOS_AVIS = 3;

const auteur = (a: AvisService) => a.User ? `${getLocalizedText(a.User.prenom)} ${getLocalizedText(a.User.nom)}`.trim() : '';

// Saisie d'un avis ou d'une réponse ; renvoie le message d'erreur du serveur s'il refuse
const Saisie: React.FC<{
  id: string; avecNote: boolean; libelle: string; onEnvoyer: (contenu: string, note?: number, photos?: File[]) => Promise<string | null>; onAnnuler?: () => void;
  /** Nom du brouillon gardé si la session expire pendant l'écriture (ex. « avis-service:12 ») */
  cleSaisie?: string;
}> = ({ id, avecNote, libelle, onEnvoyer, onAnnuler, cleSaisie }) => {
  const { t } = useTranslation();
  const [contenu, setContenu] = useState('');
  const [note, setNote] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Photos de l'avis (3 au plus) et accord sur les droits ; message après un envoi avec photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [accord, setAccord] = useState(false);
  const [cleChamp, setCleChamp] = useState(0);
  // Texte et note conservés si la session expire pendant la saisie (audit V11 FRM-23)
  const { restauree, oublier } = useSaisieConservee({
    cle: cleSaisie || null,
    valeur: { texte: contenu, note },
    restaurer: (v) => { setContenu(v.texte || ''); setNote(v.note || 0); },
    actif: !!contenu.trim(),
  });

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contenu.trim().length < 3) {
      setErreur(t('comments.errorTooShort', 'Le commentaire doit contenir au moins 3 caractères'));
      return;
    }
    if (photos.length > 0 && !accord) {
      setErreur(t('servicesVisiteurs.avis.photos.accordRequis', 'Cochez la case pour confirmer que vous avez le droit de publier ces photos.'));
      return;
    }
    setEnvoi(true);
    const refus = await onEnvoyer(contenu.trim(), avecNote && note ? note : undefined, avecNote ? photos : undefined);
    setEnvoi(false);
    setErreur(refus);
    if (!refus) {
      setContenu(''); setNote(0); setPhotos([]); setAccord(false); setCleChamp(c => c + 1); oublier();
    }
  };

  const choisirPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const choisies = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    setErreur(choisies.length > MAX_PHOTOS_AVIS ? t('servicesVisiteurs.avis.photos.max', 'Trois photos au plus : seules les trois premières sont gardées.') : null);
    setPhotos(choisies.slice(0, MAX_PHOTOS_AVIS));
  };

  return (
    <form onSubmit={envoyer} className="space-y-3" noValidate>
      {avecNote && (
        <div>
          <p className="text-sm font-medium mb-1">{t('comments.yourRating', 'Votre note')} ({t('common.optional', 'optionnel')})</p>
          <StarRating value={note} onChange={setNote} size="lg" />
        </div>
      )}
      <Textarea id={id} value={contenu} onChange={(e) => setContenu(e.target.value)} maxLength={2000}
        placeholder={libelle} className="min-h-[90px]" aria-label={libelle}
        aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-erreur` : undefined} />
      <SaisieConserveeAvis visible={restauree} />
      {avecNote && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <Label htmlFor={`${id}-photos`} className="flex items-center gap-2 text-sm">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t('servicesVisiteurs.avis.photos.ajouter', 'Ajouter des photos (3 au plus, facultatif)')}
          </Label>
          <Input key={cleChamp} id={`${id}-photos`} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choisirPhotos} disabled={envoi} />
          {photos.length > 0 && (
            <div className="flex items-start gap-2">
              <Checkbox id={`${id}-accord`} checked={accord} onCheckedChange={(v) => setAccord(v === true)} className="mt-0.5" />
              <Label htmlFor={`${id}-accord`} className="text-sm font-normal leading-snug">
                {t('servicesVisiteurs.avis.photos.accord', 'J’ai le droit de publier ces photos (pas de personne reconnaissable sans son accord).')}
              </Label>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('servicesVisiteurs.avis.photos.validation', 'Votre avis paraît tout de suite ; les photos, après validation par l’équipe.')}</p>
        </div>
      )}

      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{erreur}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onAnnuler && <Button type="button" variant="ghost" onClick={onAnnuler}>{t('common.cancel', 'Annuler')}</Button>}
        <Button type="submit" disabled={envoi || (photos.length > 0 && !accord)}>
          <Send className="h-4 w-4 me-2" aria-hidden="true" />{t('comments.submit', 'Envoyer')}
        </Button>
      </div>
    </form>
  );
};

const ServiceAvis: React.FC<{ serviceId: number; proprietaireId?: number | null }> = ({ serviceId, proprietaireId }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { formatDate } = useFormatDate();
  const { formatNumber } = useLocalizedNumber();
  const queryClient = useQueryClient();
  const [reponseA, setReponseA] = useState<number | null>(null);
  const [agrandie, setAgrandie] = useState<string | null>(null);
  // Avis publié avec des photos : le formulaire disparaît, le message reste ici
  const [photosEnvoyees, setPhotosEnvoyees] = useState(false);

  const cle = ['service-avis', serviceId];
  const { data } = useQuery({ queryKey: cle, queryFn: () => commentaireService.getAvisService(serviceId) });
  const avis = data?.commentaires || [];
  const note = data?.note || { moyenne: 0, nombre: 0 };

  const estProprietaire = !!user && !!proprietaireId && Number(user.id_user) === Number(proprietaireId);
  const dejaDonne = !!user && avis.some(a => Number(a.id_user) === Number(user.id_user));
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: cle });

  const publier = async (contenu: string, noteDonnee?: number, parent?: number, fichiers: File[] = []) => {
    try {
      // Photos mises en ligne une à une, puis rattachées à l'avis (le serveur vérifie leurs adresses)
      const urls: string[] = [];
      for (const f of fichiers) {
        const envoye = await uploadService.uploadImage(f);
        if (!envoye.success || !envoye.data?.url) {
          return messageErreurServeur(envoye, t('servicesVisiteurs.avis.photos.echec', 'Une photo n’a pas pu être envoyée. Réessayez.'));
        }
        urls.push(envoye.data.url);
      }
      await commentaireService.createAvisService(serviceId, {
        contenu, ...(noteDonnee ? { note_qualite: noteDonnee } : {}), ...(parent ? { commentaire_parent_id: parent } : {}),
        ...(urls.length ? { photos: urls, accord_photos: true } : {})
      });
      setReponseA(null);
      if (urls.length) setPhotosEnvoyees(true);
      await queryClient.invalidateQueries({ queryKey: cle });
      return null;
    } catch (e) {
      return e instanceof Error && e.message ? e.message : t('comments.errorSubmit', 'Erreur lors de l\'envoi');
    }
  };

  return (
    <section className="mt-10" aria-labelledby="avis-titre">
      <h2 id="avis-titre" className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
        {t('servicesVisiteurs.avis.titre', 'Avis des visiteurs')}
      </h2>

      {note.nombre > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl font-bold">{formatNumber(note.moyenne, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          <div>
            <StarRating value={Math.round(note.moyenne)} readonly size="md" />
            <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.avis.nombreNotes', { count: note.nombre, defaultValue: '{{count}} note(s)' })}</p>
          </div>
        </div>
      )}

      {/* Formulaire : connecté, pas son propre service, pas encore d'avis */}
      <Card className="mb-6">
        <CardContent className="p-5">
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">
              {t('servicesVisiteurs.avis.connexion', 'Connectez-vous pour donner votre avis.')}{' '}
              <Link to="/auth" className="font-medium text-primary hover:underline underline-offset-4">{t('auth.login.submit', 'Se connecter')}</Link>
            </p>
          ) : estProprietaire ? (
            <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.avis.proprietaire', 'C’est votre service : vous pouvez répondre aux avis, mais pas le noter.')}</p>
          ) : dejaDonne ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.avis.dejaDonne', 'Merci ! Vous avez déjà donné votre avis sur ce service.')}</p>
              {photosEnvoyees && (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" aria-hidden="true" />{t('servicesVisiteurs.avis.photos.enAttente', 'Merci ! Vos photos apparaîtront après validation par l’équipe.')}
                </p>
              )}
            </div>
          ) : (
            <Saisie id="avis-service" cleSaisie={`avis-service:${serviceId}`} avecNote libelle={t('servicesVisiteurs.avis.placeholder', 'Racontez votre visite : accueil, qualité, prix…')}
              onEnvoyer={(contenu, n, fichiers) => publier(contenu, n, undefined, fichiers)} />
          )}
        </CardContent>
      </Card>

      {avis.length === 0 ? (
        <p className="text-muted-foreground">{t('servicesVisiteurs.avis.aucun', 'Aucun avis pour l’instant. Soyez le premier !')}</p>
      ) : (
        <ul className="space-y-5">
          {avis.map(a => (
            <li key={a.id_commentaire} className="border-b pb-5 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{auteur(a) || t('common.anonymous', 'Anonyme')}</span>
                {Number(a.note_qualite) > 0 && <StarRating value={Number(a.note_qualite)} readonly size="sm" />}
                <span className="text-sm text-muted-foreground">{formatDate(a.date_creation, { relative: true })}</span>
                <span className="ms-auto"><ActionsCommentaire commentaire={a} onChange={rafraichir} /></span>
              </div>
              <p className="mt-2 whitespace-pre-line" dir="auto">{a.contenu}</p>
              {(a.Photos || []).length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('servicesVisiteurs.avis.photos.liste', 'Photos du visiteur')}>
                  {(a.Photos || []).map((ph, i) => (
                    <li key={ph.id_photo}>
                      <button type="button" onClick={() => setAgrandie(ph.url)} className="block overflow-hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        aria-label={t('servicesVisiteurs.avis.photos.agrandir', 'Agrandir la photo {{n}}', { n: i + 1 })}>
                        <img src={getAssetUrl(ph.url)} alt="" loading="lazy" className="h-20 w-20 object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {(a.Reponses || []).map(r => (
                <div key={r.id_commentaire} className="mt-3 ms-4 ps-4 border-s-2 border-primary/30">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {Number(r.id_user) === Number(proprietaireId)
                        ? t('servicesVisiteurs.avis.reponsePro', 'Réponse du professionnel')
                        : auteur(r)}
                    </p>
                    <ActionsCommentaire commentaire={r} onChange={rafraichir} />
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-line" dir="auto">{r.contenu}</p>
                </div>
              ))}

              {/* Le professionnel répond une fois à chaque avis */}
              {estProprietaire && !(a.Reponses || []).some(r => Number(r.id_user) === Number(proprietaireId)) && (
                reponseA === a.id_commentaire ? (
                  <div className="mt-3 ms-4">
                    <Saisie id={`reponse-${a.id_commentaire}`} avecNote={false}
                      libelle={t('servicesVisiteurs.avis.placeholderReponse', 'Votre réponse à ce visiteur')}
                      onEnvoyer={(contenu) => publier(contenu, undefined, a.id_commentaire)} onAnnuler={() => setReponseA(null)} />
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="mt-2 -ms-2" onClick={() => setReponseA(a.id_commentaire)}>
                    <Reply className="h-4 w-4 me-1 rtl:-scale-x-100" aria-hidden="true" />{t('common.reply', 'Répondre')}
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!agrandie} onOpenChange={(o) => { if (!o) setAgrandie(null); }}>
        <DialogContent className="max-w-3xl p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t('servicesVisiteurs.avis.photos.liste', 'Photos du visiteur')}</DialogTitle>
          {agrandie && <img src={getAssetUrl(agrandie)} alt="" className="max-h-[80vh] w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ServiceAvis;
