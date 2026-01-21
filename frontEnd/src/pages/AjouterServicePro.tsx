/**
 * AjouterServicePro - Formulaire pour les professionnels
 * Permet d'ajouter un service commercial autour d'un lieu patrimonial
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';
import {
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2,
  MapPin, Building2, Utensils, Hotel, Car, Compass, ShoppingBag,
  Phone, Mail, Globe, Clock, DollarSign, Camera, Upload, Search
} from 'lucide-react';
import { patrimoineService } from '@/services/patrimoine.service';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/UI/use-toast';
import MultiLangInput from '@/components/MultiLangInput';

// Types de services pour les professionnels
const TYPES_SERVICE = [
  { value: 'restaurant', label: { fr: 'Restaurant / Café', ar: 'مطعم / مقهى', en: 'Restaurant / Cafe' }, icon: Utensils },
  { value: 'hotel', label: { fr: 'Hébergement', ar: 'إقامة', en: 'Accommodation' }, icon: Hotel },
  { value: 'guide', label: { fr: 'Guide touristique', ar: 'مرشد سياحي', en: 'Tour Guide' }, icon: Compass },
  { value: 'transport', label: { fr: 'Transport', ar: 'نقل', en: 'Transport' }, icon: Car },
  { value: 'artisanat', label: { fr: 'Artisanat / Boutique', ar: 'حرف يدوية / متجر', en: 'Crafts / Shop' }, icon: ShoppingBag },
  { value: 'location', label: { fr: 'Location (vélos, etc.)', ar: 'تأجير', en: 'Rental' }, icon: Car },
  { value: 'autre', label: { fr: 'Autre service', ar: 'خدمة أخرى', en: 'Other service' }, icon: Building2 },
];

interface ServiceFormData {
  nom: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
  type_service: string;
  id_lieu: number | null;
  latitude: string;
  longitude: string;
  adresse: { fr: string; ar: string; en: string };
  telephone: string;
  email: string;
  site_web: string;
  horaires: { fr: string; ar: string; en: string };
  tarif_min: string;
  tarif_max: string;
  disponible: boolean;
}

const INITIAL_FORM: ServiceFormData = {
  nom: { fr: '', ar: '', en: '' },
  description: { fr: '', ar: '', en: '' },
  type_service: '',
  id_lieu: null,
  latitude: '',
  longitude: '',
  adresse: { fr: '', ar: '', en: '' },
  telephone: '',
  email: '',
  site_web: '',
  horaires: { fr: '', ar: '', en: '' },
  tarif_min: '',
  tarif_max: '',
  disponible: true,
};

const AjouterServicePro: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const currentLang = i18n.language as 'fr' | 'ar' | 'en';

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Lieu selection
  const [searchQuery, setSearchQuery] = useState('');
  const [lieux, setLieux] = useState<any[]>([]);
  const [selectedLieu, setSelectedLieu] = useState<any | null>(null);
  const [showLieuSearch, setShowLieuSearch] = useState(false);
  const [loadingLieux, setLoadingLieux] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplir si un lieu est passé en paramètre
  useEffect(() => {
    const lieuId = searchParams.get('lieu');
    if (lieuId) {
      loadLieuById(parseInt(lieuId));
    }
  }, [searchParams]);

  // Charger un lieu par ID
  const loadLieuById = async (id: number) => {
    try {
      const response = await patrimoineService.getSiteDetail(id);
      if (response.success && response.data) {
        setSelectedLieu(response.data);
        setFormData(prev => ({
          ...prev,
          id_lieu: id,
          latitude: response.data.latitude?.toString() || '',
          longitude: response.data.longitude?.toString() || '',
        }));
      }
    } catch (err) {
      console.error('Erreur chargement lieu:', err);
    }
  };

  // Rechercher des lieux
  const searchLieux = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setLieux([]);
      return;
    }

    try {
      setLoadingLieux(true);
      const response = await patrimoineService.recherche({
        q: searchQuery,
        limit: 10,
      });

      if (response.success && response.data) {
        const items = response.data.items || response.data.sites || response.data || [];
        setLieux(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      setLieux([]);
    } finally {
      setLoadingLieux(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(searchLieux, 300);
    return () => clearTimeout(timer);
  }, [searchLieux]);

  // Obtenir le nom localisé
  const getLocalizedName = (item: any, field: string = 'nom') => {
    if (!item) return '';
    const value = item[field];
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[currentLang] || value.fr || '';
  };

  // Sélectionner un lieu
  const handleSelectLieu = (lieu: any) => {
    setSelectedLieu(lieu);
    setFormData(prev => ({
      ...prev,
      id_lieu: lieu.id_lieu,
      latitude: lieu.latitude?.toString() || '',
      longitude: lieu.longitude?.toString() || '',
    }));
    setShowLieuSearch(false);
    setSearchQuery('');
    setLieux([]);
  };

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

  // Mettre à jour un champ du formulaire
  const updateField = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Mettre à jour un champ multilingue
  const updateMultiLangField = (field: keyof ServiceFormData, lang: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...(prev[field] as any), [lang]: value },
    }));
    setError(null);
  };

  // Valider le formulaire
  const validateForm = (): boolean => {
    if (!formData.nom.fr && !formData.nom.ar) {
      setError(t('service.errors.nomRequired', 'Le nom du service est requis'));
      return false;
    }
    if (!formData.type_service) {
      setError(t('service.errors.typeRequired', 'Le type de service est requis'));
      return false;
    }
    if (!formData.id_lieu && (!formData.latitude || !formData.longitude)) {
      setError(t('service.errors.locationRequired', 'Veuillez sélectionner un lieu ou entrer des coordonnées GPS'));
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

      // Préparer les données
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

      // Appel API pour créer le service
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(serviceData),
      });

      const data = await response.json();

      if (data.success) {
        // Upload photo si présente
        if (photoFile && data.data?.id) {
          const formDataPhoto = new FormData();
          formDataPhoto.append('image', photoFile);
          await fetch(`/api/services/${data.data.id}/photo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: formDataPhoto,
          });
        }

        toast({
          title: t('service.success.title', 'Service ajouté'),
          description: t('service.success.description', 'Votre service a été soumis et sera validé par un administrateur.'),
        });

        // Rediriger vers le dashboard pro
        navigate('/dashboard-pro');
      } else {
        throw new Error(data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      console.error('Erreur création service:', err);
      setError(err.message || t('service.errors.submitFailed', 'Erreur lors de la soumission'));
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 me-2" />
            {t('common.back', 'Retour')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-600" />
              {t('service.addTitle', 'Ajouter mon service')}
            </h1>
            <p className="text-muted-foreground">
              {t('service.addSubtitle', 'Proposez vos services aux visiteurs des sites patrimoniaux')}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                  <Label>{t('service.name', 'Nom du service')} *</Label>
                  <MultiLangInput
                    value={formData.nom}
                    onChange={(value) => updateField('nom', value)}
                    placeholder={{ fr: 'Ex: Restaurant Le Casbah', ar: 'مثال: مطعم القصبة', en: 'Ex: Le Casbah Restaurant' }}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>{t('service.description', 'Description')}</Label>
                  <MultiLangInput
                    value={formData.description}
                    onChange={(value) => updateField('description', value)}
                    placeholder={{ fr: 'Décrivez votre service...', ar: 'صف خدمتك...', en: 'Describe your service...' }}
                    multiline
                  />
                </div>

                {/* Photo */}
                <div className="space-y-2">
                  <Label>{t('service.photo', 'Photo')}</Label>
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
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                        >
                          <AlertCircle className="h-4 w-4" />
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
                {/* Lieu patrimonial */}
                <div className="space-y-2">
                  <Label>{t('service.nearbyPlace', 'Lieu patrimonial à proximité')}</Label>
                  {selectedLieu ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="font-medium">{getLocalizedName(selectedLieu)}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedLieu.wilaya?.nom || selectedLieu.commune?.nom}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLieu(null);
                          updateField('id_lieu', null);
                        }}
                      >
                        {t('common.change', 'Changer')}
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('service.searchPlace', 'Rechercher un lieu...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            onFocus={() => setShowLieuSearch(true)}
                          />
                        </div>
                      </div>
                      {showLieuSearch && lieux.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
                          {loadingLieux ? (
                            <div className="p-4 text-center">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </div>
                          ) : (
                            lieux.map((lieu) => (
                              <button
                                key={lieu.id_lieu}
                                type="button"
                                onClick={() => handleSelectLieu(lieu)}
                                className="w-full p-3 text-left hover:bg-muted flex items-center gap-3"
                              >
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{getLocalizedName(lieu)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {lieu.wilaya?.nom || lieu.commune?.nom}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Adresse et coordonnées */}
                <div className="space-y-2">
                  <Label>{t('service.address', 'Adresse')}</Label>
                  <MultiLangInput
                    value={formData.adresse}
                    onChange={(value) => updateField('adresse', value)}
                    placeholder={{ fr: 'Adresse complète...', ar: 'العنوان الكامل...', en: 'Full address...' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('service.latitude', 'Latitude')}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => updateField('latitude', e.target.value)}
                      placeholder="36.7538"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('service.longitude', 'Longitude')}</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => updateField('longitude', e.target.value)}
                      placeholder="3.0588"
                    />
                  </div>
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
                      {t('service.phone', 'Téléphone')}
                    </Label>
                    <Input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => updateField('telephone', e.target.value)}
                      placeholder="+213 XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('service.email', 'Email')}
                    </Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t('service.website', 'Site web')}
                  </Label>
                  <Input
                    type="url"
                    value={formData.site_web}
                    onChange={(e) => updateField('site_web', e.target.value)}
                    placeholder="https://www.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('service.hours', 'Horaires')}
                  </Label>
                  <MultiLangInput
                    value={formData.horaires}
                    onChange={(value) => updateField('horaires', value)}
                    placeholder={{ fr: 'Ex: Lun-Ven 9h-18h', ar: 'مثال: الاثنين-الجمعة 9-18', en: 'Ex: Mon-Fri 9am-6pm' }}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('service.priceMin', 'Tarif minimum (DA)')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.tarif_min}
                      onChange={(e) => updateField('tarif_min', e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('service.priceMax', 'Tarif maximum (DA)')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.tarif_max}
                      onChange={(e) => updateField('tarif_max', e.target.value)}
                      placeholder="2000"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
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
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.submitting', 'Envoi...')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
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
