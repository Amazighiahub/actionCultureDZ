/**
 * ModifierPatrimoine — modifier un site patrimonial ou un point de visite existant :
 * nom, type, adresse, position, fiche (description, histoire, horaires, références) en 5 langues,
 * photos et enregistrements audio.
 * Réservé au créateur du site (ou du site d'un point) et à la modération ; le serveur le vérifie.
 * (Le formulaire de création rapide ne sait que créer : ouvert pour « Modifier », il créait un doublon.)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FormPageHeader from '@/components/shared/FormPageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MultiLangInput from '@/components/MultiLangInput';
import GuideAudio, { type MediaAudio } from '@/components/patrimoine/GuideAudio';
import { Loader2, Save, Upload, Trash2, Eye, Lock, Footprints, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { httpClient } from '@/services/httpClient';
import { patrimoineService } from '@/services/patrimoine.service';
import { getAssetUrl } from '@/helpers/assetUrl';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useRTL } from '@/hooks/useRTL';
import { TYPES_PATRIMOINE } from '@/utils/typesPatrimoine';
import { texteLangue } from '@/utils/programmeIntervenants';
import { aDuTexte } from '@/utils/getLocalizedText';
import { rafraichirTableauDeBord } from '@/lib/queryClient';

const GPSPicker = React.lazy(() => import('@/components/shared/GPSPicker'));

type Multilingue = Record<string, string | undefined>;

type Media = MediaAudio;

interface SiteEdition {
  id_lieu: number;
  id_createur?: number | null;
  id_lieu_parent?: number | null;
  nom?: Multilingue | string | null;
  adresse?: Multilingue | string | null;
  repere?: Multilingue | string | null;
  typePatrimoine?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  DetailLieu?: {
    description?: Multilingue | null;
    histoire?: Multilingue | null;
    horaires?: Multilingue | null;
    referencesHistoriques?: Multilingue | null;
  } | null;
  Ancetres?: Array<{ id_lieu: number; id_createur?: number | null; nom?: Multilingue | string | null }>;
  medias?: Media[];
  LieuMedia?: Media[];
}

const enObjet = (v: Multilingue | string | null | undefined): Multilingue =>
  !v ? {} : typeof v === 'string' ? { fr: v } : v;

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const ModifierPatrimoine: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const siteId = Number(id);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { direction } = useRTL();
  const { isAdmin, hasRole, isOwner } = usePermissions();
  const photosRef = useRef<HTMLInputElement>(null);

  const [site, setSite] = useState<SiteEdition | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiPhotos, setEnvoiPhotos] = useState(false);
  const [medias, setMedias] = useState<Media[]>([]);
  const [mediaASupprimer, setMediaASupprimer] = useState<Media | null>(null);
  const [suppression, setSuppression] = useState(false);
  // Rattachement à un site (modération) : le lieu devient un point de visite de ce site
  const [parentChoisi, setParentChoisi] = useState<{ id: number; nom: string } | null>(null);
  const [rechercheSite, setRechercheSite] = useState('');
  const [sitesTrouves, setSitesTrouves] = useState<Array<{ id_lieu: number; nom: string }>>([]);
  const [form, setForm] = useState({
    nom: {} as Multilingue, adresse: {} as Multilingue, repere: {} as Multilingue,
    typePatrimoine: 'monument', latitude: 0, longitude: 0,
    description: {} as Multilingue, histoire: {} as Multilingue,
    horaires: {} as Multilingue, referencesHistoriques: {} as Multilingue
  });

  const charger = useCallback(async () => {
    if (!Number.isInteger(siteId) || siteId <= 0) { setErreurChargement(t('common.notFound', 'Introuvable')); setChargement(false); return; }
    setChargement(true); setErreurChargement(null);
    try {
      // Toutes les langues (sinon une seule serait renvoyée puis réenregistrée)
      const res = await httpClient.get<SiteEdition>(`/patrimoine/${siteId}`, { i18n: 'all' });
      if (!res.success || !res.data) throw new Error(res.error || t('common.notFound', 'Introuvable'));
      const s = res.data;
      setSite(s);
      setMedias(s.medias || s.LieuMedia || []);
      const parentActuel = s.Ancetres?.length ? s.Ancetres[s.Ancetres.length - 1] : null;
      setParentChoisi(parentActuel ? { id: parentActuel.id_lieu, nom: texteLangue(parentActuel.nom) } : null);
      const d = s.DetailLieu || {};
      setForm({
        nom: enObjet(s.nom), adresse: enObjet(s.adresse), repere: enObjet(s.repere),
        typePatrimoine: s.typePatrimoine || 'monument',
        latitude: Number(s.latitude) || 0, longitude: Number(s.longitude) || 0,
        description: enObjet(d.description), histoire: enObjet(d.histoire),
        horaires: enObjet(d.horaires), referencesHistoriques: enObjet(d.referencesHistoriques)
      });
    } catch (e) {
      setErreurChargement(e instanceof Error ? e.message : t('common.error', 'Erreur'));
    } finally {
      setChargement(false);
    }
    // Recharger seulement quand le site change (pas à chaque changement de langue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  useEffect(() => { charger(); }, [charger]);

  // Même règle que le serveur : modération, créateur du site, ou créateur du site d'un point de visite
  const parent = site?.Ancetres?.length ? site.Ancetres[site.Ancetres.length - 1] : null;
  const estModeration = isAdmin || hasRole('Moderateur');
  const peutModifier = !!site && (isAdmin || hasRole('Moderateur')
    || (!!site.id_createur && isOwner(site.id_createur))
    || (!!parent?.id_createur && isOwner(parent.id_createur)));

  const enregistrer = async () => {
    if (!aDuTexte(form.nom)) {
      toast({ title: t('common.error', 'Erreur'), description: t('patrimoine.edit.nameRequired', 'Le nom est requis, dans au moins une langue'), variant: 'destructive' });
      return;
    }
    setEnregistrement(true);
    try {
      const res = await httpClient.put(`/patrimoine/${siteId}`, {
        nom: form.nom, adresse: form.adresse, typePatrimoine: form.typePatrimoine,
        latitude: form.latitude, longitude: form.longitude,
        description: form.description, histoire: form.histoire,
        horaires: form.horaires, referencesHistoriques: form.referencesHistoriques,
        ...(site?.id_lieu_parent ? { repere: form.repere } : {}),
        // Rattachement changé (modération seulement : le serveur l'ignore pour un créateur)
        ...(estModeration && (parentChoisi?.id ?? null) !== (site?.id_lieu_parent ?? null)
          ? { id_lieu_parent: parentChoisi?.id ?? null } : {})
      });
      if (!res.success) throw new Error(res.error);
      rafraichirTableauDeBord();
      toast({ title: t('patrimoine.edit.saved', 'Modifications enregistrées') });
      // Recharger : le rattachement change le titre de la page et la liste des points
      if (estModeration && (parentChoisi?.id ?? null) !== (site?.id_lieu_parent ?? null)) charger();
    } catch (e) {
      toast({ title: t('common.error', 'Erreur'), description: e instanceof Error && e.message ? e.message : t('patrimoine.edit.saveError', 'Les modifications n’ont pas pu être enregistrées'), variant: 'destructive' });
    } finally {
      setEnregistrement(false);
    }
  };

  // Recherche d'un site à qui rattacher ce lieu (2 lettres au moins)
  useEffect(() => {
    const q = rechercheSite.trim();
    if (q.length < 2) { setSitesTrouves([]); return; }
    let actif = true;
    const minuterie = setTimeout(async () => {
      try {
        const res = await httpClient.get<Array<{ id_lieu: number; nom: Multilingue | string }>>('/patrimoine/search', { q, limit: 8 });
        if (actif && res.success && Array.isArray(res.data)) {
          setSitesTrouves(res.data.filter(x => x.id_lieu !== siteId).map(x => ({ id_lieu: x.id_lieu, nom: texteLangue(x.nom) })));
        }
      } catch { if (actif) setSitesTrouves([]); }
    }, 300);
    return () => { actif = false; clearTimeout(minuterie); };
  }, [rechercheSite, siteId]);

  const ajouterPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files || []);
    e.target.value = '';
    if (fichiers.length === 0) return;
    if (fichiers.some(f => f.size > MAX_PHOTO_BYTES)) {
      toast({ title: t('common.error', 'Erreur'), description: t('upload.fileTooLarge10', 'Fichier trop volumineux (max 10 Mo)'), variant: 'destructive' });
      return;
    }
    setEnvoiPhotos(true);
    try {
      const res = await patrimoineService.uploadMedias(siteId, fichiers);
      if (!res.success || !res.data) throw new Error(res.error);
      setMedias(prev => [...prev, ...(res.data as unknown as Media[])]);
      toast({ title: t('patrimoine.edit.photosAdded', 'Photos ajoutées') });
    } catch (err) {
      toast({ title: t('common.error', 'Erreur'), description: err instanceof Error && err.message ? err.message : t('patrimoine.edit.uploadError', 'L’envoi a échoué'), variant: 'destructive' });
    } finally {
      setEnvoiPhotos(false);
    }
  };

  const supprimerMedia = async () => {
    if (!mediaASupprimer) return;
    setSuppression(true);
    try {
      const res = await patrimoineService.deleteMedia(siteId, mediaASupprimer.id);
      if (!res.success) throw new Error(res.error);
      setMedias(prev => prev.filter(m => m.id !== mediaASupprimer.id));
      toast({ title: t('patrimoine.edit.mediaDeleted', 'Supprimé') });
    } catch (err) {
      toast({ title: t('common.error', 'Erreur'), description: err instanceof Error && err.message ? err.message : t('patrimoine.edit.deleteError', 'La suppression a échoué'), variant: 'destructive' });
    } finally {
      setSuppression(false);
      setMediaASupprimer(null);
    }
  };

  const photos = medias.filter(m => m.type === 'image' || m.type === 'video');
  const audios = medias.filter(m => m.type === 'audio');
  const champ = (cle: keyof typeof form) => (v: Multilingue) => setForm(f => ({ ...f, [cle]: v }));

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      <main className="container py-8 max-w-3xl mx-auto space-y-6">
        <FormPageHeader
          onBack={() => navigate(-1)}
          backLabel={t('common.back', 'Retour')}
          title={site?.id_lieu_parent ? t('patrimoine.edit.titlePoint', 'Modifier le point de visite') : t('patrimoine.edit.title', 'Modifier le site')}
          subtitle={typeof form.nom === 'object' ? (form.nom[i18n.language] || form.nom.fr || form.nom.ar || '') : ''}
          aside={site && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/patrimoine/${siteId}`}><Eye className="h-4 w-4 me-2" />{t('patrimoine.edit.viewPage', 'Voir la page')}</Link>
            </Button>
          )}
        />

        {chargement && <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" aria-label={t('common.loading', 'Chargement')} /></div>}

        {erreurChargement && (
          <Alert variant="destructive"><AlertDescription>{erreurChargement}</AlertDescription></Alert>
        )}

        {site && !peutModifier && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              {t('patrimoine.edit.forbidden', 'Seuls le créateur de ce site et la modération peuvent le modifier. Vous pouvez y ajouter un enregistrement audio ou un point de visite depuis sa page.')}
            </AlertDescription>
          </Alert>
        )}

        {site && peutModifier && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.edit.general', 'Informations')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <MultiLangInput name="nom" label={t('patrimoine.fields.nom', 'Nom')} value={form.nom} onChange={champ('nom')} required requiredLanguages={['fr']} />
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('patrimoine.fields.type', 'Type de patrimoine')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t('patrimoine.fields.type', 'Type de patrimoine')}>
                    {TYPES_PATRIMOINE.map(type => (
                      <button key={type} type="button" role="radio" aria-checked={form.typePatrimoine === type}
                        onClick={() => setForm(f => ({ ...f, typePatrimoine: type }))}
                        className={`p-3 rounded-lg border text-sm text-center transition-colors ${form.typePatrimoine === type ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-input hover:border-primary/50 hover:bg-muted'}`}>
                        {t(`patrimoine.types.${type}`, type)}
                      </button>
                    ))}
                  </div>
                </div>
                <MultiLangInput name="adresse" label={t('patrimoine.fields.adresse', 'Adresse')} value={form.adresse} onChange={champ('adresse')} />
                {site.id_lieu_parent && (
                  <MultiLangInput name="repere" label={t('patrimoine.points.repere', 'Repère dans le site')} value={form.repere} onChange={champ('repere')} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.edit.details', 'Fiche du site')}</CardTitle>
                <CardDescription>{t('patrimoine.edit.detailsHint', 'Affichée sur la page du site. Une langue laissée vide garde le texte déjà enregistré.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <MultiLangInput name="description" label={t('patrimoine.fields.description', 'Description')} value={form.description} onChange={champ('description')} type="textarea" rows={5} />
                <MultiLangInput name="histoire" label={t('patrimoine.fields.history', 'Histoire')} value={form.histoire} onChange={champ('histoire')} type="textarea" rows={5} />
                <MultiLangInput name="horaires" label={t('patrimoine.fields.openingHours', 'Horaires de visite')} value={form.horaires} onChange={champ('horaires')} type="textarea" rows={2} />
                <MultiLangInput name="referencesHistoriques" label={t('patrimoine.fields.references', 'Références historiques')} value={form.referencesHistoriques} onChange={champ('referencesHistoriques')} type="textarea" rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.edit.position', 'Position sur la carte')}</CardTitle>
                <CardDescription>{t('patrimoine.edit.positionHint', 'Cliquez sur la carte pour déplacer le repère.')}</CardDescription>
              </CardHeader>
              <CardContent>
                <React.Suspense fallback={<div className="h-[250px] bg-muted rounded-lg animate-pulse" />}>
                  <GPSPicker latitude={form.latitude} longitude={form.longitude} zoom={site.id_lieu_parent ? 17 : 14}
                    onPositionChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
                </React.Suspense>
              </CardContent>
            </Card>

            {estModeration && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('patrimoine.edit.parentTitle', 'Fait partie d’un site')}</CardTitle>
                  <CardDescription>{t('patrimoine.edit.parentHint', 'Pour faire de ce lieu un point de visite d’un autre site (ex. : un musée dans sa commune). Il quitte alors la liste des sites et apparaît dans les points du site choisi.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parentChoisi ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
                      <Footprints className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-sm">{t('patrimoine.edit.pointOf', 'Point de visite de :')} <strong>{parentChoisi.nom}</strong></span>
                      <Button type="button" variant="ghost" size="sm" className="ms-auto" onClick={() => setParentChoisi(null)}>
                        <X className="h-4 w-4 me-1" aria-hidden="true" />{t('patrimoine.edit.detach', 'Détacher (redevient un site principal)')}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('patrimoine.edit.noParent', 'Site principal (ne fait partie d’aucun autre site).')}</p>
                  )}
                  <Input
                    value={rechercheSite}
                    onChange={(e) => setRechercheSite(e.target.value)}
                    placeholder={t('patrimoine.edit.searchSite', 'Rechercher le site (ex. : Aït Smaïl)')}
                    aria-label={t('patrimoine.edit.searchSite', 'Rechercher le site (ex. : Aït Smaïl)')}
                  />
                  {sitesTrouves.length > 0 && (
                    <ul className="rounded-md border divide-y">
                      {sitesTrouves.map(x => (
                        <li key={x.id_lieu}>
                          <button type="button" className="w-full text-start px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => { setParentChoisi({ id: x.id_lieu, nom: x.nom }); setRechercheSite(''); setSitesTrouves([]); }}>
                            {x.nom}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(parentChoisi?.id ?? null) !== (site.id_lieu_parent ?? null) && (
                    <p className="text-sm text-primary">{t('patrimoine.edit.parentPending', 'Cliquez sur « Enregistrer les modifications » pour appliquer ce rattachement.')}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={enregistrer} disabled={enregistrement}>
                {enregistrement ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                {t('patrimoine.edit.save', 'Enregistrer les modifications')}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.edit.photos', 'Photos et vidéos')} ({photos.length})</CardTitle>
                <CardDescription>{t('patrimoine.edit.photosHint', 'Ajoutées ou supprimées immédiatement. La première photo sert d’image principale.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {photos.length > 0 ? (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((m, i) => (
                      <li key={m.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
                        {m.type === 'video'
                          ? <video src={getAssetUrl(m.url)} controls preload="none" className="w-full h-full object-cover" />
                          : <img src={getAssetUrl(m.url)} alt={t('patrimoine.edit.photoN', 'Photo {{n}}', { n: i + 1 })} className="w-full h-full object-cover" loading="lazy" />}
                        {i === 0 && <span className="absolute top-1 start-1 text-[10px] px-1.5 py-0.5 rounded bg-background/90">{t('patrimoine.edit.mainPhoto', 'Principale')}</span>}
                        <Button type="button" size="icon" variant="destructive" className="absolute top-1 end-1 h-8 w-8"
                          onClick={() => setMediaASupprimer(m)}
                          aria-label={t('patrimoine.edit.deletePhoto', 'Supprimer la photo {{n}}', { n: i + 1 })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('patrimoine.edit.noPhoto', 'Aucune photo pour l’instant.')}</p>
                )}
                <input ref={photosRef} type="file" accept="image/*,video/mp4,video/webm" multiple className="hidden" onChange={ajouterPhotos}
                  aria-label={t('patrimoine.edit.addPhotos', 'Ajouter des photos')} />
                <Button type="button" variant="outline" disabled={envoiPhotos} onClick={() => photosRef.current?.click()}>
                  {envoiPhotos ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
                  {t('patrimoine.edit.addPhotos', 'Ajouter des photos')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('patrimoine.edit.audio', 'Guide audio')} ({audios.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <GuideAudio
                  lieuId={siteId}
                  medias={audios}
                  lang={i18n.language}
                  canUpload
                  onUploaded={(ajoutes) => setMedias(prev => [...prev, ...ajoutes])}
                  onDelete={(m) => setMediaASupprimer(m)}
                />
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <ConfirmDialog
        open={mediaASupprimer !== null}
        onOpenChange={(o) => { if (!o && !suppression) setMediaASupprimer(null); }}
        title={mediaASupprimer?.type === 'audio' ? t('patrimoine.edit.confirmDeleteAudio', 'Supprimer cet enregistrement ?') : t('patrimoine.edit.confirmDeletePhoto', 'Supprimer cette photo ?')}
        description={t('patrimoine.edit.confirmDeleteDesc', 'Elle sera retirée de la page du site. Cette action est définitive.')}
        confirmLabel={t('common.delete', 'Supprimer')}
        cancelLabel={t('common.cancel', 'Annuler')}
        variant="destructive"
        loading={suppression}
        onConfirm={supprimerMedia}
      />
      <Footer />
    </div>
  );
};

export default ModifierPatrimoine;
