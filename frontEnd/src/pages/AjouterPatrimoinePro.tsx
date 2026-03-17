/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Save, Upload, X, Loader2, AlertCircle,
  MapPin, Building, Calendar, Globe, CheckCircle2
} from 'lucide-react';
import { patrimoineService, CreateSiteData } from '@/services/patrimoine.service';
import { metadataService } from '@/services/metadata.service';
// lieuService is used internally by LieuSelector
import MultiLangInput from '@/components/MultiLangInput';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
// LieuSelector chargé en lazy (inclut leaflet ~40KB)
const LieuSelector = React.lazy(() =>
  import('@/components/LieuSelector').then(m => ({ default: m.LieuSelector }))
);

interface TranslatableValue {
  fr?: string;
  ar?: string;
  en?: string;
  'tz-ltn'?: string;
  'tz-tfng'?: string;
  [key: string]: string | undefined;
}

interface FormData {
  nom: TranslatableValue;
  description: TranslatableValue;
  type: string;
  epoque?: string;
  wilaya_id: number;
  commune_id?: number;
  adresse?: string;
  latitude: number;
  longitude: number;
  statut: string;
  classement?: string;
  date_classement?: string;
  visite_virtuelle_url?: string;
}

const INITIAL_FORM: FormData = {
  nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  type: '',
  wilaya_id: 0,
  latitude: 0,
  longitude: 0,
  statut: 'ouvert'
};

// Values only — labels resolved via t() in getLocalizedLabel
const TYPES_PATRIMOINE = ['monument', 'vestige', 'musee', 'site_naturel', 'ville_village', 'autre'];
const STATUTS = ['ouvert', 'ferme', 'restauration', 'abandonne'];
const CLASSEMENTS = ['mondial', 'national', 'regional', 'local'];
const EPOQUES = ['prehistoire', 'antiquite', 'moyen_age', 'epoque_moderne', 'contemporain'];

const AjouterPatrimoinePro: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { direction } = useRTL();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;
  i18n.language;

  // States
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);
  const [medias, setMedias] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs for focusing on first errored field
  const typeRef = useRef<HTMLButtonElement>(null);
  const wilayaRef = useRef<HTMLButtonElement>(null);
  const nomRef = useRef<HTMLDivElement>(null);
  const gpsRef = useRef<HTMLDivElement>(null);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && editId) {
      loadExistingPatrimoine();
    }
  }, [isEditMode, editId]);

  const loadExistingPatrimoine = async () => {
    if (!editId) return;
    try {
      const response = await patrimoineService.getById(editId);
      if (response.success && response.data) {
        const site = response.data as any;
        const toTV = (v: any): TranslatableValue =>
          typeof v === 'object' && v !== null
            ? { fr: v.fr || '', ar: v.ar || '', en: v.en || '', 'tz-ltn': v['tz-ltn'] || '', 'tz-tfng': v['tz-tfng'] || '' }
            : { fr: v || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };
        setFormData({
          nom: toTV(site.nom),
          description: toTV(site.description),
          type: site.type || '',
          epoque: site.epoque,
          wilaya_id: site.wilaya_id || 0,
          commune_id: site.commune_id,
          adresse: site.adresse,
          latitude: site.latitude || 0,
          longitude: site.longitude || 0,
          statut: site.statut || 'ouvert',
          classement: site.classement,
          date_classement: site.date_classement,
          visite_virtuelle_url: site.visite_virtuelle_url,
        });
        // Patrimoine loaded for editing
      } else {
        setError(t('ajouterPatrimoine.errors.siteNotFound', 'Site introuvable'));
        navigate('/dashboard-pro');
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement patrimoine:', err);
      setError(t('ajouterPatrimoine.errors.loadFailed', 'Impossible de charger le site'));
    }
  };

  // État pour le lieu sélectionné via LieuSelector
  const [createdLieuId, setCreatedLieuId] = useState<number | null>(null);

  // Metadata
  const [wilayas, setWilayas] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setLoadingMetadata(true);
      const wilayasRes = await metadataService.getWilayas();

      if (wilayasRes.success && wilayasRes.data) {
        setWilayas(wilayasRes.data);
      }
    } catch (err) {
      console.error('Erreur chargement metadata:', err);
    } finally {
      setLoadingMetadata(false);
    }
  };


  // Handle file upload
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const allFiles = Array.from(files);
      const oversized = allFiles.filter(f => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        setError(t('ajouterPatrimoine.errors.fileTooLarge', 'Chaque fichier doit faire moins de 10 Mo'));
        return;
      }
      const newFiles = allFiles;
      setMedias(prev => [...prev, ...newFiles]);
      setIsDirty(true);

      // Create previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeMedia = (index: number) => {
    setMedias(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation — collect ALL errors
    const errors: Record<string, string> = {};

    if (!formData.nom.fr?.trim() && !formData.nom.ar?.trim()) {
      errors.nom = t('ajouterPatrimoine.errors.nomRequired', 'Le nom est requis (au moins en français ou arabe)');
    }
    if (!formData.type?.trim()) {
      errors.type = t('ajouterPatrimoine.errors.typeRequired', 'Le type est requis');
    }
    if (!formData.wilaya_id) {
      errors.wilaya = t('ajouterPatrimoine.errors.wilayaRequired', 'La wilaya est requise');
    }
    // GPS validation
    if (formData.latitude && formData.longitude) {
      if (formData.latitude < -90 || formData.latitude > 90 || formData.longitude < -180 || formData.longitude > 180) {
        errors.gps = t('validation.invalidGPS', 'Coordonnées GPS invalides (latitude : -90 à 90, longitude : -180 à 180)');
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      // Focus and scroll to the first errored field
      const fieldOrder: { key: string; ref: React.RefObject<HTMLElement | null> }[] = [
        { key: 'nom', ref: nomRef },
        { key: 'type', ref: typeRef },
        { key: 'wilaya', ref: wilayaRef },
        { key: 'gps', ref: gpsRef },
      ];
      const firstErrorField = fieldOrder.find(f => errors[f.key]);
      if (firstErrorField?.ref.current) {
        firstErrorField.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.ref.current.focus();
      }
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);

      const createData: CreateSiteData = {
        ...(createdLieuId ? { lieuId: createdLieuId } : {}),
        nom: JSON.stringify(formData.nom),
        description: JSON.stringify(formData.description),
        type: formData.type,
        epoque: formData.epoque,
        wilaya_id: formData.wilaya_id,
        commune_id: formData.commune_id,
        adresse: formData.adresse,
        latitude: formData.latitude,
        longitude: formData.longitude,
        statut: formData.statut,
        classement: formData.classement,
        date_classement: formData.date_classement,
        visite_virtuelle_url: formData.visite_virtuelle_url
      };

      let response;
      if (isEditMode && editId) {
        response = await patrimoineService.update(editId, createData);
      } else {
        response = await patrimoineService.create(createData);
      }

      if (response.success) {
        const siteId = (response.data as any)?.id_lieu || (response.data as any)?.id;
        if (siteId && medias.length > 0) {
          try {
            await patrimoineService.uploadMedias(siteId, medias);
          } catch (uploadErr) {
            // Media upload failure should not block success
          }
        }
        setSuccess(true);
        setIsDirty(false);
        setTimeout(() => {
          navigate('/dashboard-pro');
        }, 2000);
      } else {
        setError(response.error || (isEditMode ? t('ajouterPatrimoine.errors.updateFailed', 'Erreur lors de la mise à jour') : t('ajouterPatrimoine.errors.createFailed')));
      }
    } catch (err: any) {
      console.error('Erreur creation patrimoine:', err);
      setError(err.message || t('ajouterPatrimoine.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedLabel = (category: string, value: string) => {
    return t(`ajouterPatrimoine.options.${category}.${value}`, value);
  };

  if (loadingMetadata) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 me-2" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building className="h-6 w-6 text-emerald-600" />
              {t('ajouterPatrimoine.title')}
            </h1>
            <p className="text-muted-foreground">{t('ajouterPatrimoine.subtitle')}</p>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <Alert className="mb-6 bg-primary/10 border-primary/20">
            <AlertDescription className="text-primary">
              {t('ajouterPatrimoine.success')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground mb-4">{t('common.requiredFieldsLegend')}</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('ajouterPatrimoine.basicInfo')}</CardTitle>
                  <CardDescription>{t('ajouterPatrimoine.basicInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Nom multilingue */}
                  <div ref={nomRef}>
                    <MultiLangInput
                      name="nom"
                      label={t('ajouterPatrimoine.nom')}
                      value={formData.nom}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, nom: value }));
                        setIsDirty(true);
                        if (fieldErrors.nom) setFieldErrors(prev => { const { nom: _, ...rest } = prev; return rest; });
                      }}
                      required
                      requiredLanguages={['fr']}
                      placeholder={t('ajouterPatrimoine.nomPlaceholder')}
                      errors={fieldErrors.nom ? { fr: fieldErrors.nom, ar: fieldErrors.nom } : undefined}
                    />
                  </div>
                  {fieldErrors.nom && (
                    <p id="nom-error" role="alert" className="text-sm text-destructive">{fieldErrors.nom}</p>
                  )}

                  {/* Description multilingue */}
                  <MultiLangInput
                    name="description"
                    label={t('ajouterPatrimoine.description')}
                    value={formData.description}
                    onChange={(value) => { setFormData(prev => ({ ...prev, description: value })); setIsDirty(true); }}
                    type="textarea"
                    rows={4}
                    requiredLanguages={[]}
                    placeholder={t('ajouterPatrimoine.descriptionPlaceholder')}
                  />

                  {/* Type et Epoque */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.type')} *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, type: value }));
                          setIsDirty(true);
                          if (fieldErrors.type) setFieldErrors(prev => { const { type: _, ...rest } = prev; return rest; });
                        }}
                      >
                        <SelectTrigger
                          ref={typeRef}
                          aria-invalid={!!fieldErrors.type}
                          aria-describedby={fieldErrors.type ? 'type-error' : undefined}
                        >
                          <SelectValue placeholder={t('ajouterPatrimoine.selectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_PATRIMOINE.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getLocalizedLabel('types', type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.type && (
                        <p id="type-error" role="alert" className="text-sm text-destructive">{fieldErrors.type}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.epoque')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Select
                        value={formData.epoque || ''}
                        onValueChange={(value) => { setFormData(prev => ({ ...prev, epoque: value })); setIsDirty(true); }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('ajouterPatrimoine.selectEpoque')} />
                        </SelectTrigger>
                        <SelectContent>
                          {EPOQUES.map((ep) => (
                            <SelectItem key={ep} value={ep}>
                              {getLocalizedLabel('epoques', ep)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('ajouterPatrimoine.locationTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Wilaya selector */}
                  <div className="space-y-2">
                    <Label>{t('ajouterPatrimoine.wilaya')} *</Label>
                    <Select
                      value={formData.wilaya_id ? String(formData.wilaya_id) : ''}
                      onValueChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          wilaya_id: parseInt(value)
                        }));
                        setIsDirty(true);
                        if (fieldErrors.wilaya) setFieldErrors(prev => { const { wilaya: _, ...rest } = prev; return rest; });
                      }}
                    >
                      <SelectTrigger
                        ref={wilayaRef}
                        aria-invalid={!!fieldErrors.wilaya}
                        aria-describedby={fieldErrors.wilaya ? 'wilaya-error' : undefined}
                      >
                        <SelectValue placeholder={t('ajouterPatrimoine.selectWilaya')} />
                      </SelectTrigger>
                      <SelectContent>
                        {wilayas.map((w) => (
                          <SelectItem key={w.id_wilaya || w.id} value={String(w.id_wilaya || w.id)}>
                            {w.nom || w.nom_fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.wilaya && (
                      <p id="wilaya-error" role="alert" className="text-sm text-destructive">{fieldErrors.wilaya}</p>
                    )}
                  </div>

                  {/* LieuSelector — même composant que dans AjouterEvenement */}
                  <div className="space-y-2" ref={gpsRef}>
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t('ajouterPatrimoine.lieu', 'Lieu')} *
                    </Label>
                    <React.Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded" />}>
                      <LieuSelector
                        value={createdLieuId ?? undefined}
                        onChange={(lieuId, lieu) => {
                          setCreatedLieuId(lieuId ?? null);
                          if (lieu) {
                            setFormData(prev => ({
                              ...prev,
                              latitude: lieu.latitude,
                              longitude: lieu.longitude,
                              adresse: typeof lieu.adresse === 'object'
                                ? (lieu.adresse as any).fr || ''
                                : lieu.adresse || ''
                            }));
                          }
                          if (fieldErrors.gps) setFieldErrors(prev => { const { gps: _, ...rest } = prev; return rest; });
                        }}
                        wilayaId={formData.wilaya_id || undefined}
                        required
                      />
                    </React.Suspense>
                    {fieldErrors.gps && (
                      <p id="gps-error" role="alert" className="text-sm text-destructive">{fieldErrors.gps}</p>
                    )}
                  </div>

                  {/* Afficher les coordonnées du lieu sélectionné */}
                  {createdLieuId && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">{t('ajouterPatrimoine.lieuSelected', 'Lieu sélectionné')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{t('ajouterPatrimoine.latitude')}: {formData.latitude.toFixed(6)}</span>
                        <span>{t('ajouterPatrimoine.longitude')}: {formData.longitude.toFixed(6)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status and Classification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('ajouterPatrimoine.statusTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.statut')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Select
                        value={formData.statut}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUTS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {getLocalizedLabel('statuts', s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.classement')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Select
                        value={formData.classement || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, classement: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('ajouterPatrimoine.selectClassement')} />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSEMENTS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {getLocalizedLabel('classements', c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.classement && (
                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.dateClassement')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                      <Input
                        type="date"
                        value={formData.date_classement || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, date_classement: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t('ajouterPatrimoine.visiteVirtuelle')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                    </Label>
                    <Input
                      type="url"
                      autoComplete="url"
                      maxLength={2048}
                      value={formData.visite_virtuelle_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, visite_virtuelle_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground">{t('common.urlHelper')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Media upload */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    {t('ajouterPatrimoine.mediasTitle')}
                  </CardTitle>
                  <CardDescription>{t('ajouterPatrimoine.mediasDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-upload"
                    />
                    <label
                      htmlFor="media-upload"
                      className="cursor-pointer block"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('ajouterPatrimoine.mediasUploadText')}
                      </p>
                    </label>
                  </div>

                  {/* Preview */}
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {t('ajouterPatrimoine.submitting')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {t('ajouterPatrimoine.submit')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterPatrimoinePro;
