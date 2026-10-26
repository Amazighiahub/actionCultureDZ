/**
 * AjouterServicePro - Formulaire pour les professionnels
 * Permet d'ajouter un service commercial autour d'un lieu patrimonial
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/services/httpClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Save, Loader2, AlertCircle, CheckCircle2,
  MapPin, Building2, Utensils, Hotel, Car, Compass, ShoppingBag,
  Phone, Mail, Globe, Clock, DollarSign, Camera, Upload, X
} from 'lucide-react';
import { LieuSelector } from '@/components/LieuSelector';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import MultiLangInput from '@/components/MultiLangInput';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import FormPageHeader from '@/components/shared/FormPageHeader';

// Types de services pour les professionnels
const TYPES_SERVICE = [
  { value: 'restaurant', label: { fr: 'Restaurant / Café', ar: 'مطعم / مقهى', en: 'Restaurant / Cafe', 'tz-ltn': 'Asensu / Aqahwi', 'tz-tfng': 'ⴰⵙⵏⵙⵓ / ⴰⵇⴰⵀⵡⵉ' }, icon: Utensils },
  { value: 'hotel', label: { fr: 'Hébergement', ar: 'إقامة', en: 'Accommodation', 'tz-ltn': 'Ansawen', 'tz-tfng': 'ⴰⵏⵙⴰⵡⵏ' }, icon: Hotel },
  { value: 'guide', label: { fr: 'Guide touristique', ar: 'مرشد سياحي', en: 'Tour Guide', 'tz-ltn': 'Amessadaɣ n tmazirt', 'tz-tfng': 'ⴰⵎⵙⵙⴰⴷⴰⵖ ⵏ ⵜⵎⴰⵣⵉⵔⵜ' }, icon: Compass },
  { value: 'transport', label: { fr: 'Transport', ar: 'نقل', en: 'Transport', 'tz-ltn': 'Anagi', 'tz-tfng': 'ⴰⵏⴰⴳⵉ' }, icon: Car },
  { value: 'artisanat', label: { fr: 'Artisanat / Boutique', ar: 'حرف يدوية / متجر', en: 'Crafts / Shop', 'tz-ltn': 'Tawuri n ufus / Taḥanut', 'tz-tfng': 'ⵜⴰⵡⵓⵔⵉ ⵏ ⵓⴼⵓⵙ / ⵜⴰⵃⴰⵏⵓⵜ' }, icon: ShoppingBag },
  { value: 'location', label: { fr: 'Location (vélos, etc.)', ar: 'تأجير', en: 'Rental', 'tz-ltn': 'Askari', 'tz-tfng': 'ⴰⵙⴽⴰⵔⵉ' }, icon: Car },
  { value: 'autre', label: { fr: 'Autre service', ar: 'خدمة أخرى', en: 'Other service', 'tz-ltn': 'Tanbaḍt nniḍen', 'tz-tfng': 'ⵜⴰⵏⴱⴰⴹⵜ ⵏⵏⵉⴹⵏ' }, icon: Building2 },
];

interface MultiLangText {
  fr: string;
  ar: string;
  en: string;
  'tz-ltn': string;
  'tz-tfng': string;
}

interface ServiceFormData {
  nom: MultiLangText;
  description: MultiLangText;
  type_service: string;
  id_lieu: number | null;
  latitude: string;
  longitude: string;
  adresse: MultiLangText;
  telephone: string;
  email: string;
  site_web: string;
  horaires: MultiLangText;
  tarif_min: string;
  tarif_max: string;
  disponible: boolean;
}

const INITIAL_FORM: ServiceFormData = {
  nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  type_service: '',
  id_lieu: null,
  latitude: '',
  longitude: '',
  adresse: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  telephone: '',
  email: '',
  site_web: '',
  horaires: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  tarif_min: '',
  tarif_max: '',
  disponible: true,
};

const AjouterServicePro: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentLang = i18n.language as 'fr' | 'ar' | 'en';
  const { direction } = useRTL();

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && editId) {
      loadExistingService();
    }
  }, [isEditMode, editId]);

  const loadExistingService = async () => {
    if (!editId) return;
    try {
      // Toutes les langues : la fiche traduite écrasait les autres traductions à l'enregistrement
      const result = await httpClient.get<Record<string, unknown>>(`/services/${editId}`, { i18n: 'all' });
      if (result.success && result.data) {
        const svc = result.data;
        const toML = (v: unknown): MultiLangText => {
          if (typeof v === 'object' && v !== null) {
            const obj = v as Record<string, unknown>;
            return { fr: (obj.fr as string) || '', ar: (obj.ar as string) || '', en: (obj.en as string) || '', 'tz-ltn': (obj['tz-ltn'] as string) || '', 'tz-tfng': (obj['tz-tfng'] as string) || '' };
          }
          return { fr: (typeof v === 'string' ? v : '') || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };
        };
        setFormData({
          nom: toML(svc.nom),
          description: toML(svc.description),
          type_service: svc.type_service || '',
          id_lieu: svc.id_lieu || null,
          latitude: svc.latitude?.toString() || '',
          longitude: svc.longitude?.toString() || '',
          adresse: toML(svc.adresse),
          telephone: svc.telephone || '',
          email: svc.email || '',
          site_web: svc.site_web || '',
          horaires: toML(svc.horaires),
          tarif_min: svc.tarif_min?.toString() || '',
          tarif_max: svc.tarif_max?.toString() || '',
          disponible: svc.disponible !== false,
        });
        if (typeof svc.photo_url === 'string' && svc.photo_url) setPhotoPreview(svc.photo_url);
        // Service loaded for editing
      } else {
        toast({ title: t('toasts.error'), description: t('toasts.serviceNotFound'), variant: 'destructive' });
        navigate('/dashboard-pro');
      }
    } catch (err: unknown) {
      console.error('Erreur chargement service:', err);
      toast({ title: t('toasts.error'), description: t('toasts.serviceLoadFailed'), variant: 'destructive' });
    }
  };

  // Pré-remplir si un lieu est passé en paramètre (page d'un site : « Proposez vos services ici »)
  useEffect(() => {
    const lieuId = parseInt(searchParams.get('lieu') || '', 10);
    if (!isEditMode && lieuId > 0) setFormData(prev => ({ ...prev, id_lieu: lieuId }));
  }, [searchParams, isEditMode]);

  // Gérer le changement de photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error', 'Erreur'),
          description: t('service.photoTooLarge', 'La photo ne doit pas dépasser 5 MB'),
          variant: 'destructive',
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateFieldOnBlur = (field: string) => {
    let error: string | undefined;
    switch (field) {
      case 'email':
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          error = t('service.errors.emailInvalid', 'Adresse email invalide');
        }
        break;
      case 'telephone':
        if (formData.telephone && !/^[0-9+\-\s()]{8,20}$/.test(formData.telephone)) {
          error = t('service.errors.phoneInvalid', 'Numéro de téléphone invalide');
        }
        break;
      case 'site_web':
        if (formData.site_web && !/^https?:\/\/.+\..+/.test(formData.site_web)) {
          error = t('service.errors.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)');
        }
        break;
      case 'tarif_min':
      case 'tarif_max':
        if (formData.tarif_min && formData.tarif_max && parseFloat(formData.tarif_min) > parseFloat(formData.tarif_max)) {
          const tarifErr = t('service.errors.tarifMinMax', 'Le tarif minimum ne peut pas être supérieur au tarif maximum');
          setFieldErrors(prev => ({ ...prev, tarif_min: tarifErr, tarif_max: tarifErr }));
          return;
        } else {
          // Clear both tarif errors when the range becomes valid
          setFieldErrors(prev => {
            const next = { ...prev };
            delete next.tarif_min;
            delete next.tarif_max;
            return next;
          });
          return;
        }
    }
    setFieldErrors(prev => {
      if (!error) { const next = { ...prev }; delete next[field]; return next; }
      return { ...prev, [field]: error };
    });
  };

  // Mettre à jour un champ du formulaire
  const updateField = (field: keyof ServiceFormData, value: ServiceFormData[keyof ServiceFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setError(null);
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Mettre à jour un champ multilingue
  const updateMultiLangField = (field: keyof ServiceFormData, lang: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...(prev[field] as MultiLangText), [lang]: value },
    }));
    setIsDirty(true);
    setError(null);
  };

  // Valider le formulaire
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.nom.fr?.trim() && !formData.nom.ar?.trim()) {
      errs.nom = t('service.errors.nomRequired', 'Le nom du service est requis (au moins en français ou arabe)');
    }
    if (!formData.type_service) {
      errs.type_service = t('service.errors.typeRequired', 'Le type de service est requis');
    }

    if (!formData.id_lieu) {
      errs.id_lieu = t('service.errors.lieuRequired', 'Veuillez choisir le lieu de votre service');
    }
    if (formData.tarif_min && formData.tarif_max && parseFloat(formData.tarif_min) > parseFloat(formData.tarif_max)) {
      const tarifErr = t('service.errors.tarifMinMax', 'Le tarif minimum ne peut pas être supérieur au tarif maximum');
      errs.tarif_min = tarifErr;
      errs.tarif_max = tarifErr;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = t('service.errors.emailInvalid', 'Adresse email invalide');
    }
    if (formData.site_web && !/^https?:\/\/.+\..+/.test(formData.site_web)) {
      errs.site_web = t('service.errors.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)');
    }
    if (formData.telephone && !/^[0-9+\-\s()]{8,20}$/.test(formData.telephone)) {
      errs.telephone = t('service.errors.phoneInvalid', 'Numéro de téléphone invalide');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(Object.values(errs)[0]);
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return false;
    }
    return true;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      // Préparer les données du service
      const serviceData = {
        nom: formData.nom,
        description: formData.description,
        type_service: formData.type_service,
        id_lieu: formData.id_lieu,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        adresse: formData.adresse,
        telephone: formData.telephone,
        email: formData.email,
        site_web: formData.site_web,
        horaires: formData.horaires,
        tarif_min: formData.tarif_min ? parseFloat(formData.tarif_min) : null,
        tarif_max: formData.tarif_max ? parseFloat(formData.tarif_max) : null,
        disponible: formData.disponible,
      };

      const data = isEditMode && editId
        ? await httpClient.put<{ id?: number }>(`/services/${editId}`, serviceData)
        : await httpClient.post<{ id?: number }>('/services', serviceData);

      if (data.success) {
        const serviceId = data.data?.id || editId;
        if (photoFile && serviceId) {
          const formDataPhoto = new FormData();
          formDataPhoto.append('image', photoFile);
          const uploadRes = await httpClient.upload<{ url?: string }>(`/upload/image`, formDataPhoto);
          if (uploadRes.success && uploadRes.data?.url) {
            await httpClient.put<unknown>(`/services/${serviceId}`, { photo_url: uploadRes.data.url });
          }
        }

        setIsDirty(false);
        // Le tableau de bord affiche tout de suite le service (et son statut)
        queryClient.invalidateQueries({ queryKey: ['dashboard-pro-services'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-pro-stats'] });
        toast({
          title: isEditMode ? t('toasts.serviceStatusUpdated') : t('service.success.title', 'Service ajouté'),
          description: isEditMode ? t('toasts.actionSuccess') : t('service.success.description', 'Votre service a été soumis et sera validé par un administrateur.'),
        });

        navigate('/dashboard-pro');
      } else {
        throw new Error(data.error || (isEditMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
      }
    } catch (err: unknown) {
      console.error('Erreur création service:', err);
      setError(err instanceof Error ? err.message : t('service.errors.submitFailed', 'Erreur lors de la soumission'));
    } finally {
      setSubmitting(false);
    }
  };

  // Vérifier l'authentification
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('common.authRequired', 'Connexion requise')}</h2>
              <p className="text-muted-foreground mb-4">
                {t('service.authRequired', 'Vous devez être connecté en tant que professionnel pour ajouter un service.')}
              </p>
              <Button onClick={() => navigate('/auth')}>
                {t('common.login', 'Se connecter')}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <FormPageHeader
          onBack={() => navigate(-1)}
          backLabel={t('common.back', 'Retour')}
          title={id ? t('service.editTitle', 'Modifier mon service') : t('service.addTitle', 'Ajouter mon service')}
          subtitle={t('service.addSubtitle', 'Proposez vos services aux visiteurs des sites patrimoniaux')}
        />

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6" role="alert" aria-live="assertive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground mb-4">{t('common.requiredFieldsLegend')}</p>
          <div className="grid gap-6">
            {/* Type de service */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('service.typeTitle', 'Type de service')}</CardTitle>
                <CardDescription>
                  {t('service.typeDescription', 'Quel type de service proposez-vous ?')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="radiogroup" aria-invalid={!!fieldErrors.type_service} aria-describedby={fieldErrors.type_service ? 'type_service-error' : undefined}>
                  {TYPES_SERVICE.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type_service === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateField('type_service', type.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                            : 'border-border hover:border-emerald-300'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium text-center">
                          {type.label[currentLang] || type.label.fr}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.type_service && <p id="type_service-error" role="alert" className="text-sm text-destructive mt-2">{fieldErrors.type_service}</p>}
              </CardContent>
            </Card>

            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('service.infoTitle', 'Informations générales')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nom */}
                <div className="space-y-2">
                  <RequiredLabel required>{t('service.name', 'Nom du service')}</RequiredLabel>
                  <MultiLangInput
                    name="nom"
                    value={formData.nom}
                    onChange={(value) => updateField('nom', value)}
                    requiredLanguages={['fr']}
                    placeholder="Ex: Restaurant Le Casbah"
                    aria-invalid={!!fieldErrors.nom}
                  />
                  {fieldErrors.nom && <p id="nom-error" role="alert" className="text-sm text-destructive">{fieldErrors.nom}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>{t('service.description', 'Description')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <MultiLangInput
                    value={formData.description}
                    onChange={(value) => updateField('description', value)}
                    placeholder={t('service.descriptionPlaceholder', 'Décrivez votre service...')}
                    multiline
                    requiredLanguages={[]}
                  />
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <Label>{t('service.photo', 'Photo')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                          className="absolute -top-2 -end-2 bg-destructive text-white rounded-full p-1"
                          aria-label={t('common.remove', 'Supprimer')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-400 transition-colors">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">{t('common.upload', 'Upload')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t('service.photoHint', 'JPG, PNG. Max 5 MB')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Localisation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('service.locationTitle', 'Localisation')}
                </CardTitle>
                <CardDescription>
                  {t('service.locationDescription', 'Associez votre service à un lieu patrimonial ou entrez une adresse')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <RequiredLabel required>{t('service.placeLabel', 'Lieu du service')}</RequiredLabel>
                  <p className="text-sm text-muted-foreground">
                    {t('service.placeHint', 'Cherchez le lieu (site, quartier, village). Introuvable ? « Créer un nouveau lieu » : nom, adresse et point sur la carte.')}
                  </p>
                  <LieuSelector
                    value={formData.id_lieu ?? undefined}
                    onChange={(lieuId, lieu) => {
                      updateField('id_lieu', lieuId ?? null);
                      setFormData(prev => ({
                        ...prev,
                        latitude: lieu?.latitude != null ? String(lieu.latitude) : '',
                        longitude: lieu?.longitude != null ? String(lieu.longitude) : '',
                      }));
                    }}
                    required
                  />
                  {fieldErrors.id_lieu && <p className="text-sm text-destructive" role="alert">{fieldErrors.id_lieu}</p>}
                </div>

                <Separator />

                {/* Adresse et coordonnées */}
                <div className="space-y-2">
                  <Label>{t('service.address', 'Adresse')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <MultiLangInput
                    value={formData.adresse}
                    onChange={(value) => updateField('adresse', value)}
                    placeholder={t('service.addressPlaceholder', 'Adresse complète...')}
                    requiredLanguages={[]}
                  />
                </div>

              </CardContent>
            </Card>

            {/* Contact et tarifs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('service.contactTitle', 'Contact et tarifs')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t('service.phone', 'Téléphone')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                    </Label>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      maxLength={20}
                      value={formData.telephone}
                      onChange={(e) => updateField('telephone', e.target.value)}
                      onBlur={() => validateFieldOnBlur('telephone')}
                      placeholder="+213 XX XX XX XX"
                      aria-invalid={!!fieldErrors.telephone}
                      aria-describedby={fieldErrors.telephone ? 'telephone-error' : 'telephone-helper'}
                    />
                    <p id="telephone-helper" className="text-xs text-muted-foreground">{t('common.phoneHelper')}</p>
                    {fieldErrors.telephone && <p id="telephone-error" role="alert" className="text-sm text-destructive">{fieldErrors.telephone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('service.email', 'Email')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                    </Label>
                    <Input
                      type="email"
                      autoComplete="email"
                      maxLength={255}
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      onBlur={() => validateFieldOnBlur('email')}
                      placeholder="contact@example.com"
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    />
                    {fieldErrors.email && <p id="email-error" role="alert" className="text-sm text-destructive">{fieldErrors.email}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('service.website', 'Site web')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                  </Label>
                  <Input
                    type="url"
                    autoComplete="url"
                    maxLength={2048}
                    value={formData.site_web}
                    onChange={(e) => updateField('site_web', e.target.value)}
                    onBlur={() => validateFieldOnBlur('site_web')}
                    placeholder="https://www.example.com"
                    aria-invalid={!!fieldErrors.site_web}
                    aria-describedby={fieldErrors.site_web ? 'site_web-error' : 'service-site_web-helper'}
                  />
                  <p id="service-site_web-helper" className="text-xs text-muted-foreground">{t('common.urlHelper')}</p>
                  {fieldErrors.site_web && <p id="site_web-error" role="alert" className="text-sm text-destructive">{fieldErrors.site_web}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('service.hours', 'Horaires')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                  </Label>
                  <MultiLangInput
                    value={formData.horaires}
                    onChange={(value) => updateField('horaires', value)}
                    placeholder={t('service.hoursPlaceholder', 'Ex : tous les jours, 9 h – 18 h')}
                    requiredLanguages={[]}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('service.priceMin', 'Tarif minimum (DA)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.tarif_min}
                      onChange={(e) => updateField('tarif_min', e.target.value)}
                      onBlur={() => validateFieldOnBlur('tarif_min')}
                      placeholder="500"
                      aria-invalid={!!fieldErrors.tarif_min}
                      aria-describedby={fieldErrors.tarif_min ? 'tarif_min-error' : undefined}
                    />
                    {fieldErrors.tarif_min && <p id="tarif_min-error" role="alert" className="text-sm text-destructive">{fieldErrors.tarif_min}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('service.priceMax', 'Tarif maximum (DA)')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.tarif_max}
                      onChange={(e) => updateField('tarif_max', e.target.value)}
                      onBlur={() => validateFieldOnBlur('tarif_max')}
                      placeholder="2000"
                      aria-invalid={!!fieldErrors.tarif_max}
                      aria-describedby={fieldErrors.tarif_max ? 'tarif_max-error' : undefined}
                    />
                    {fieldErrors.tarif_max && <p id="tarif_max-error" role="alert" className="text-sm text-destructive">{fieldErrors.tarif_max}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="disponible"
                    checked={formData.disponible}
                    onCheckedChange={(checked) => updateField('disponible', !!checked)}
                  />
                  <Label htmlFor="disponible" className="cursor-pointer">
                    {t('service.available', 'Service actuellement disponible')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Info validation */}
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {t('service.validationInfo', 'Votre service sera soumis à validation par un administrateur avant d\'être visible sur le site.')}
              </AlertDescription>
            </Alert>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                {t('common.cancel', 'Annuler')}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t('common.submitting', 'Envoi...')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 me-2" />
                    {t('service.submit', 'Soumettre mon service')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterServicePro;
