/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Alert, AlertDescription } from '@/components/UI/alert';
import {
  ArrowLeft, Save, Upload, X, Loader2, AlertCircle,
  MapPin, Building, Calendar, Globe, CheckCircle2
} from 'lucide-react';
import { patrimoineService, CreateSiteData } from '@/services/patrimoine.service';
import { metadataService } from '@/services/metadata.service';
// lieuService is used internally by LieuSelector
import MultiLangInput from '@/components/MultiLangInput';
import { LieuSelector } from '@/components/LieuSelector';

interface TranslatableValue {
  fr?: string;
  ar?: string;
  en?: string;
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
  nom: { fr: '', ar: '', en: '' },
  description: { fr: '', ar: '', en: '' },
  type: '',
  wilaya_id: 0,
  latitude: 0,
  longitude: 0,
  statut: 'ouvert'
};

const TYPES_PATRIMOINE = [
  { value: 'monument', label: 'Monument' },
  { value: 'vestige', label: 'Vestige archéologique' },
  { value: 'musee', label: 'Musée' },
  { value: 'site_naturel', label: 'Site naturel' },
  { value: 'ville_village', label: 'Ville/Village historique' },
  { value: 'autre', label: 'Autre' }
];

const STATUTS = [
  { value: 'ouvert', label: 'Ouvert au public' },
  { value: 'ferme', label: 'Fermé' },
  { value: 'restauration', label: 'En restauration' },
  { value: 'abandonne', label: 'Abandonné' }
];

const CLASSEMENTS = [
  { value: 'mondial', label: 'Patrimoine mondial UNESCO' },
  { value: 'national', label: 'Classement national' },
  { value: 'regional', label: 'Classement régional' },
  { value: 'local', label: 'Classement local' }
];

const EPOQUES = [
  { value: 'prehistoire', label: 'Préhistoire' },
  { value: 'antiquite', label: 'Antiquité' },
  { value: 'moyen_age', label: 'Moyen Âge' },
  { value: 'epoque_moderne', label: 'Époque moderne' },
  { value: 'contemporain', label: 'Contemporain' }
];

const AjouterPatrimoinePro: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  i18n.language;

  // States
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [medias, setMedias] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setMedias(prev => [...prev, ...newFiles]);

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

    // Validation
    if (!formData.nom.fr && !formData.nom.ar) {
      setError(t('ajouterPatrimoine.errors.nomRequired'));
      return;
    }
    if (!formData.type) {
      setError(t('ajouterPatrimoine.errors.typeRequired'));
      return;
    }
    if (!formData.wilaya_id) {
      setError(t('ajouterPatrimoine.errors.wilayaRequired'));
      return;
    }

    try {
      setLoading(true);

      const createData: CreateSiteData = {
        ...(createdLieuId ? { lieuId: createdLieuId } : {}),
        nom: JSON.stringify(formData.nom),
        nom_ar: formData.nom.ar,
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

      const response = await patrimoineService.create(createData);

      if (response.success && response.data) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard-pro');
        }, 2000);
      } else {
        setError(response.error || t('ajouterPatrimoine.errors.createFailed'));
      }
    } catch (err: any) {
      console.error('Erreur creation patrimoine:', err);
      setError(err.message || t('ajouterPatrimoine.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedLabel = (item: { value: string; label: string }) => {
    // Could be extended to support i18n labels
    return item.label;
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
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
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              {t('ajouterPatrimoine.success')}
            </AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
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
                  <MultiLangInput
                    name="nom"
                    label={t('ajouterPatrimoine.nom')}
                    value={formData.nom}
                    onChange={(value) => setFormData(prev => ({ ...prev, nom: value }))}
                    required
                    placeholder={t('ajouterPatrimoine.nomPlaceholder')}
                  />

                  {/* Description multilingue */}
                  <MultiLangInput
                    name="description"
                    label={t('ajouterPatrimoine.description')}
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    type="textarea"
                    rows={4}
                    placeholder={t('ajouterPatrimoine.descriptionPlaceholder')}
                  />

                  {/* Type et Epoque */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.type')} *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('ajouterPatrimoine.selectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES_PATRIMOINE.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {getLocalizedLabel(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.epoque')}</Label>
                      <Select
                        value={formData.epoque || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, epoque: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('ajouterPatrimoine.selectEpoque')} />
                        </SelectTrigger>
                        <SelectContent>
                          {EPOQUES.map((ep) => (
                            <SelectItem key={ep.value} value={ep.value}>
                              {getLocalizedLabel(ep)}
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
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        wilaya_id: parseInt(value)
                      }))}
                    >
                      <SelectTrigger>
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
                  </div>

                  {/* LieuSelector — même composant que dans AjouterEvenement */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {t('ajouterPatrimoine.lieu', 'Lieu')} *
                    </Label>
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
                      }}
                      wilayaId={formData.wilaya_id || undefined}
                      required
                    />
                  </div>

                  {/* Afficher les coordonnées du lieu sélectionné */}
                  {createdLieuId && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
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
                      <Label>{t('ajouterPatrimoine.statut')}</Label>
                      <Select
                        value={formData.statut}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, statut: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {getLocalizedLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.classement')}</Label>
                      <Select
                        value={formData.classement || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, classement: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('ajouterPatrimoine.selectClassement')} />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSEMENTS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {getLocalizedLabel(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.classement && (
                    <div className="space-y-2">
                      <Label>{t('ajouterPatrimoine.dateClassement')}</Label>
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
                      {t('ajouterPatrimoine.visiteVirtuelle')}
                    </Label>
                    <Input
                      type="url"
                      value={formData.visite_virtuelle_url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, visite_virtuelle_url: e.target.value }))}
                      placeholder="https://..."
                    />
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
