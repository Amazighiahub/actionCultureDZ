/**
 * AjouterPatrimoineRapide - Formulaire de création rapide d'un site patrimonial
 *
 * Étapes :
 * 1. Localisation (Wilaya → Daïra → Commune)
 * 2. Identité (Nom + Type + Adresse)
 * 3. Photo (au moins 1)
 * → Publier
 *
 * L'enrichissement (histoire, gastronomie, traditions...) se fait
 * ensuite sur la page détail du site.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RequiredLabel } from '@/components/ui/required-label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, ArrowRight, MapPin, Building2, Camera,
  Loader2, AlertCircle, CheckCircle2, Upload, X
} from 'lucide-react';
import { patrimoineService } from '@/services/patrimoine.service';
import MultiLangInput from '@/components/MultiLangInput';
import GeoSelector from '@/components/shared/GeoSelector';
import { useAuth } from '@/hooks/useAuth';
const GPSPicker = React.lazy(() => import('@/components/shared/GPSPicker'));
import { useRTL } from '@/hooks/useRTL';
import { useToast } from '@/hooks/use-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Types alignés sur le backend (lieu.js typePatrimoine ENUM)
const TYPES_PATRIMOINE = [
  'monument', 'musee', 'ville_village', 'site_archeologique',
  'site_naturel', 'edifice_religieux', 'palais_forteresse', 'autre'
] as const;

interface FormData {
  nom: { fr: string; ar: string; en: string; [key: string]: string };
  typePatrimoine: string;
  adresse: { fr: string; ar: string; en: string; [key: string]: string };
  wilayaId: number | null;
  dairaId: number | null;
  communeId: number | null;
  latitude: number;
  longitude: number;
}

const INITIAL_FORM: FormData = {
  nom: { fr: '', ar: '', en: '' },
  typePatrimoine: '',
  adresse: { fr: '', ar: '', en: '' },
  wilayaId: null,
  dairaId: null,
  communeId: null,
  latitude: 0,
  longitude: 0,
};

const AjouterPatrimoineRapide: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { direction } = useRTL();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [medias, setMedias] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<Array<{ id_lieu: number; nom: any; typePatrimoine: string }>>([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Validation par étape
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.wilayaId) newErrors.wilaya = t('patrimoine.errors.wilayaRequired', 'La wilaya est requise');
      if (!formData.communeId) newErrors.commune = t('patrimoine.errors.communeRequired', 'La commune est requise');
    }

    if (currentStep === 2) {
      if (!formData.nom.fr?.trim() && !formData.nom.ar?.trim()) {
        newErrors.nom = t('patrimoine.errors.nomRequired', 'Le nom est requis (au moins en français ou arabe)');
      }
      if (!formData.typePatrimoine) {
        newErrors.type = t('patrimoine.errors.typeRequired', 'Le type de patrimoine est requis');
      }
      if (formData.latitude === 0 && formData.longitude === 0) {
        newErrors.gps = t('patrimoine.errors.gpsRequired', 'Positionnez le site sur la carte (cliquez, cherchez une adresse ou utilisez la géolocalisation)');
      }
    }

    if (currentStep === 3) {
      if (medias.length === 0) {
        newErrors.medias = t('patrimoine.errors.photoRequired', 'Au moins une photo est requise');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = async () => {
    if (!validateStep(step)) return;

    // Vérification doublons à l'étape 2
    if (step === 2 && formData.communeId) {
      const nom = formData.nom.fr?.trim() || formData.nom.ar?.trim() || '';
      if (nom) {
        setCheckingDuplicate(true);
        try {
          const res = await fetch(`/api/patrimoine/check-duplicate?nom=${encodeURIComponent(nom)}&communeId=${formData.communeId}`);
          const data = await res.json();
          if (data.success && data.data?.exists) {
            setDuplicates(data.data.sites);
            setCheckingDuplicate(false);
            return; // Ne pas avancer, montrer les doublons
          }
        } catch { /* ignorer, laisser créer */ }
        setCheckingDuplicate(false);
        setDuplicates([]);
      }
    }

    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep(step - 1);
    setErrors({});
    window.scrollTo(0, 0);
  };

  // Gestion des médias
  const handleMediaAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);

    if (validFiles.length !== files.length) {
      toast({ title: t('common.warning'), description: t('patrimoine.errors.invalidFiles', 'Certains fichiers sont invalides (images < 10 Mo)'), variant: 'destructive' });
    }

    setMedias(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setMediaPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    setErrors(prev => { const { medias: _, ...rest } = prev; return rest; });
  };

  const handleMediaRemove = (index: number) => {
    setMedias(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Soumission
  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const createData = {
        nom: formData.nom,
        description: { fr: '', ar: '', en: '' },
        typePatrimoine: formData.typePatrimoine,
        communeId: formData.communeId,
        adresse: formData.adresse,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const response = await patrimoineService.create(createData as any);

      if (response.success) {
        const responseData = response.data as Record<string, unknown> | undefined;
        const siteId = responseData?.id_lieu || responseData?.id;

        // Upload des photos
        let uploadFailed = false;
        if (siteId && medias.length > 0) {
          try {
            await patrimoineService.uploadMedias(siteId as number, medias);
          } catch {
            uploadFailed = true;
          }
        }

        toast({
          title: uploadFailed ? t('patrimoine.success.partial', 'Site créé (photos non uploadées)') : t('patrimoine.success.created', 'Site créé !'),
          description: uploadFailed
            ? t('patrimoine.success.partialDesc', 'Le site a été créé mais certaines photos n\'ont pas pu être uploadées. Vous pouvez les ajouter plus tard.')
            : t('patrimoine.success.createdDesc', 'Vous pouvez maintenant enrichir ce site avec plus de détails.'),
          variant: uploadFailed ? 'destructive' : 'default',
        });

        setTimeout(() => { navigate(`/patrimoine/${siteId}`); }, 1500);
      } else {
        // Gestion erreur 409 (doublon)
        const errMsg = response.error || '';
        if (errMsg.includes('existe déjà') || errMsg.includes('DUPLICATE')) {
          toast({ title: t('patrimoine.duplicate.found', 'Site déjà existant'), description: t('patrimoine.duplicate.tryEnrich', 'Un site avec ce nom existe dans cette commune. Essayez de l\'enrichir plutôt.'), variant: 'destructive' });
        } else {
          toast({ title: t('common.error'), description: errMsg || t('patrimoine.errors.createFailed', 'Erreur lors de la création'), variant: 'destructive' });
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('409') || errMsg.includes('existe déjà') || errMsg.includes('DUPLICATE')) {
        toast({ title: t('patrimoine.duplicate.found', 'Site déjà existant'), description: t('patrimoine.duplicate.tryEnrich', 'Un site avec ce nom existe dans cette commune.'), variant: 'destructive' });
      } else {
        toast({ title: t('common.error'), description: errMsg || t('patrimoine.errors.createFailed'), variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Labels des types
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      monument: t('patrimoine.types.monument', 'Monument'),
      musee: t('patrimoine.types.musee', 'Musée'),
      ville_village: t('patrimoine.types.ville_village', 'Ville / Village'),
      site_archeologique: t('patrimoine.types.site_archeologique', 'Site archéologique'),
      site_naturel: t('patrimoine.types.site_naturel', 'Site naturel'),
      edifice_religieux: t('patrimoine.types.edifice_religieux', 'Édifice religieux'),
      palais_forteresse: t('patrimoine.types.palais_forteresse', 'Palais / Forteresse'),
      autre: t('patrimoine.types.autre', 'Autre'),
    };
    return labels[type] || type;
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            s < step ? 'bg-primary text-primary-foreground'
            : s === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
            : 'bg-muted text-muted-foreground'
          }`}>
            {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
          </div>
          {s < 3 && <div className={`w-12 h-1 rounded ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />

      <main className="container py-8 max-w-2xl mx-auto">
        {/* Retour */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('common.back', 'Retour')}
        </Button>

        <h1 className="text-3xl font-bold font-serif text-center mb-2">
          {t('patrimoine.create.title', 'Ajouter un site patrimonial')}
        </h1>
        <p className="text-center text-muted-foreground mb-2">
          {t('patrimoine.create.subtitle', 'Créez rapidement, enrichissez ensuite')}
        </p>
        <p className="text-center text-xs text-muted-foreground mb-8">
          {t('common.requiredFieldsLegend')}
        </p>

        {stepIndicator}

        {/* ÉTAPE 1 : Localisation */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {t('patrimoine.create.step1', 'Où se trouve ce site ?')}
              </CardTitle>
              <CardDescription>
                {t('patrimoine.create.step1Desc', 'Sélectionnez la localisation géographique')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeoSelector
                wilayaId={formData.wilayaId}
                dairaId={formData.dairaId}
                communeId={formData.communeId}
                onWilayaChange={(id) => setFormData(prev => ({ ...prev, wilayaId: id, dairaId: null, communeId: null }))}
                onDairaChange={(id) => setFormData(prev => ({ ...prev, dairaId: id, communeId: null }))}
                onCommuneChange={(id) => setFormData(prev => ({ ...prev, communeId: id }))}
                requiredWilaya
                requiredCommune
                errors={{ wilaya: errors.wilaya, commune: errors.commune }}
              />

              <div className="flex justify-end mt-6">
                <Button onClick={nextStep} size="lg">
                  {t('common.next', 'Suivant')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ÉTAPE 2 : Identité */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t('patrimoine.create.step2', 'Quel est ce site ?')}
              </CardTitle>
              <CardDescription>
                {t('patrimoine.create.step2Desc', 'Donnez un nom et choisissez le type')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nom multilingue */}
              <div>
                <MultiLangInput
                  name="nom"
                  label={t('patrimoine.fields.nom', 'Nom du site')}
                  value={formData.nom}
                  onChange={(value: any) => {
                    setFormData(prev => ({ ...prev, nom: value }));
                    setErrors(prev => { const { nom: _, ...rest } = prev; return rest; });
                  }}
                  required
                  requiredLanguages={['fr']}
                  placeholder={t('patrimoine.placeholders.nom', 'Ex: Casbah d\'Alger, Djemila...')}
                  maxLength={200}
                  showCharCount
                  errors={errors.nom ? { fr: errors.nom } : {}}
                />
              </div>

              {/* Type de patrimoine */}
              <div className="space-y-2">
                <RequiredLabel required>{t('patrimoine.fields.type', 'Type de patrimoine')}</RequiredLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TYPES_PATRIMOINE.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, typePatrimoine: type }));
                        setErrors(prev => { const { type: _, ...rest } = prev; return rest; });
                      }}
                      className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                        formData.typePatrimoine === type
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-input hover:border-primary/50 hover:bg-muted'
                      }`}
                    >
                      {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
                {errors.type && <p role="alert" className="text-sm text-destructive">{errors.type}</p>}
              </div>

              {/* Adresse */}
              <div>
                <MultiLangInput
                  name="adresse"
                  label={t('patrimoine.fields.adresse', 'Adresse / Localisation précise')}
                  value={formData.adresse}
                  onChange={(value: any) => setFormData(prev => ({ ...prev, adresse: value }))}
                  placeholder={t('patrimoine.placeholders.adresse', 'Ex: Centre-ville, Route de...')}
                  maxLength={300}
                />
              </div>

              {/* GPS via carte */}
              <React.Suspense fallback={<div className="h-[250px] bg-muted rounded-lg animate-pulse" />}>
                <GPSPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onPositionChange={(lat, lng) => {
                    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    setErrors(prev => { const { gps: _, ...rest } = prev; return rest; });
                  }}
                />
              </React.Suspense>
              {errors.gps && <p role="alert" className="text-sm text-destructive mt-2">{errors.gps}</p>}

              {/* Alerte doublons */}
              {duplicates.length > 0 && (
                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                      {t('patrimoine.duplicate.found', 'Un site similaire existe déjà dans cette commune :')}
                    </p>
                    {duplicates.map((d) => (
                      <div key={d.id_lieu} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded border mb-1">
                        <span className="text-sm">{typeof d.nom === 'object' ? d.nom.fr || d.nom.ar : d.nom} ({d.typePatrimoine})</span>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/patrimoine/${d.id_lieu}`)}>
                          {t('common.view', 'Voir')}
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => { setDuplicates([]); setStep(step + 1); window.scrollTo(0, 0); }}>
                        {t('patrimoine.duplicate.createAnyway', 'Créer quand même')}
                      </Button>
                      <Button variant="default" size="sm" onClick={() => navigate(`/patrimoine/${duplicates[0].id_lieu}`)}>
                        {t('patrimoine.duplicate.goToExisting', 'Enrichir le site existant')}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.previous', 'Précédent')}
                </Button>
                <Button onClick={nextStep} size="lg" disabled={checkingDuplicate}>
                  {checkingDuplicate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {checkingDuplicate ? t('patrimoine.checking', 'Vérification...') : t('common.next', 'Suivant')}
                  {!checkingDuplicate && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ÉTAPE 3 : Photo + Publication */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {t('patrimoine.create.step3', 'Ajoutez des photos')}
                <span className="text-destructive ml-1">*</span>
              </CardTitle>
              <CardDescription>
                {t('patrimoine.create.step3Desc', 'Au moins une photo pour illustrer le site')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Zone d'upload */}
              <div>
                <label
                  htmlFor="media-upload"
                  className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    errors.medias ? 'border-destructive bg-destructive/5' : 'border-input hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {t('patrimoine.create.uploadHint', 'Cliquez ou glissez vos photos ici')}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {t('patrimoine.create.uploadFormats', 'JPG, PNG, WebP — max 10 Mo')}
                  </span>
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/*,video/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={handleMediaAdd}
                  />
                </label>
                {errors.medias && <p role="alert" className="text-sm text-destructive mt-2">{errors.medias}</p>}
              </div>

              {/* Prévisualisations */}
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {mediaPreviews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleMediaRemove(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Récapitulatif complet */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {t('patrimoine.create.summary', 'Récapitulatif')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">{t('patrimoine.fields.nom', 'Nom')}</div>
                    <div className="font-medium">{formData.nom.fr || formData.nom.ar || '—'}</div>
                    <div className="text-muted-foreground">{t('patrimoine.fields.type', 'Type')}</div>
                    <div className="font-medium">{getTypeLabel(formData.typePatrimoine)}</div>
                    <div className="text-muted-foreground">{t('patrimoine.fields.adresse', 'Adresse')}</div>
                    <div className="font-medium">{formData.adresse.fr || formData.adresse.ar || '—'}</div>
                    <div className="text-muted-foreground">{t('patrimoine.fields.position', 'GPS')}</div>
                    <div className="font-medium">{formData.latitude !== 0 ? `${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}` : t('patrimoine.create.noGPS', 'Non défini (centre Algérie)')}</div>
                    <div className="text-muted-foreground">{t('patrimoine.create.photos', 'Photos')}</div>
                    <div className="font-medium">{medias.length}</div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.previous', 'Précédent')}
                </Button>
                <Button onClick={handleSubmit} size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('patrimoine.create.publishing', 'Publication en cours...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('patrimoine.create.publish', 'Publier le site')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AjouterPatrimoineRapide;
