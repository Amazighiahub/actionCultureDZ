/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import {
  ArrowLeft, Save, Plus, Loader2, AlertCircle, CheckCircle2,
  MapPin, Building2, Landmark, TreePine, Church, Castle, HelpCircle,
  Search, X, Settings
} from 'lucide-react';
import { lieuService } from '@/services/lieu.service';
import { patrimoineService } from '@/services/patrimoine.service';
import MultiLangInput from '@/components/MultiLangInput';
import { useToast } from '@/hooks/use-toast';

// Types de patrimoine avec leurs icones
const TYPES_PATRIMOINE = [
  { value: 'all', label: { fr: 'Tous les lieux', ar: 'جميع الأماكن', en: 'All places' }, icon: MapPin },
  { value: 'ville_village', label: { fr: 'Ville / Village', ar: 'مدينة / قرية', en: 'City / Village' }, icon: Building2 },
  { value: 'monument', label: { fr: 'Monument', ar: 'نصب تذكاري', en: 'Monument' }, icon: Landmark },
  { value: 'musee', label: { fr: 'Musée', ar: 'متحف', en: 'Museum' }, icon: Building2 },
  { value: 'site_archeologique', label: { fr: 'Site archéologique', ar: 'موقع أثري', en: 'Archaeological Site' }, icon: Landmark },
  { value: 'site_naturel', label: { fr: 'Site naturel', ar: 'موقع طبيعي', en: 'Natural Site' }, icon: TreePine },
  { value: 'edifice_religieux', label: { fr: 'Édifice religieux', ar: 'مبنى ديني', en: 'Religious Building' }, icon: Church },
  { value: 'palais_forteresse', label: { fr: 'Palais / Forteresse', ar: 'قصر / حصن', en: 'Palace / Fortress' }, icon: Castle },
  { value: 'autre', label: { fr: 'Autre', ar: 'أخرى', en: 'Other' }, icon: HelpCircle }
];

// Services prédéfinis
const SERVICES_PREDEFINIS = [
  { id: 'parking', label: { fr: 'Parking', ar: 'موقف سيارات', en: 'Parking' } },
  { id: 'toilettes', label: { fr: 'Toilettes', ar: 'مراحيض', en: 'Restrooms' } },
  { id: 'restaurant', label: { fr: 'Restaurant', ar: 'مطعم', en: 'Restaurant' } },
  { id: 'cafe', label: { fr: 'Café', ar: 'مقهى', en: 'Cafe' } },
  { id: 'boutique', label: { fr: 'Boutique souvenirs', ar: 'محل تذكارات', en: 'Gift shop' } },
  { id: 'guide', label: { fr: 'Guide touristique', ar: 'مرشد سياحي', en: 'Tour guide' } },
  { id: 'audioguide', label: { fr: 'Audioguide', ar: 'دليل صوتي', en: 'Audio guide' } },
  { id: 'wifi', label: { fr: 'WiFi gratuit', ar: 'واي فاي مجاني', en: 'Free WiFi' } },
  { id: 'accessibilite', label: { fr: 'Accessibilité PMR', ar: 'إمكانية الوصول للمعاقين', en: 'Wheelchair accessible' } },
  { id: 'vestiaire', label: { fr: 'Vestiaire', ar: 'غرفة ملابس', en: 'Cloakroom' } },
  { id: 'aire_piquenique', label: { fr: 'Aire de pique-nique', ar: 'منطقة نزهة', en: 'Picnic area' } },
  { id: 'aire_jeux', label: { fr: 'Aire de jeux', ar: 'ملعب أطفال', en: 'Playground' } }
];

interface MultiLangText {
  fr: string;
  ar: string;
  en: string;
  'tz-ltn': string;
  'tz-tfng': string;
}

interface ServiceForm {
  nom: MultiLangText;
  description: MultiLangText;
  disponible: boolean;
}

const INITIAL_SERVICE: ServiceForm = {
  nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  disponible: true
};

const AjouterService: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentLang = i18n.language as 'fr' | 'ar' | 'en';

  // States
  const [activeTab, setActiveTab] = useState('select-lieu');
  const [selectedTypePatrimoine, setSelectedTypePatrimoine] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lieux, setLieux] = useState<any[]>([]);
  const [selectedLieu, setSelectedLieu] = useState<any | null>(null);
  const [existingServices, setExistingServices] = useState<any[]>([]);

  // Services à ajouter
  const [selectedPredefinedServices, setSelectedPredefinedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState<ServiceForm>(INITIAL_SERVICE);
  const [servicesToAdd, setServicesToAdd] = useState<ServiceForm[]>([]);

  // Loading states
  const [loadingLieux, setLoadingLieux] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Charger les lieux par type
  const loadLieux = useCallback(async () => {
    try {
      setLoadingLieux(true);
      setError(null);

      const params: any = {
        limit: 50,
        page: 1
      };

      if (selectedTypePatrimoine !== 'all') {
        params.typePatrimoine = selectedTypePatrimoine;
      }

      if (searchQuery) {
        params.q = searchQuery;
      }

      const response = await patrimoineService.recherche(params);

      if (response.success && response.data) {
        // Handle both paginated and direct array response
        const items = response.data.items || response.data.sites || response.data || [];
        setLieux(Array.isArray(items) ? items : []);
      } else {
        setLieux([]);
      }
    } catch (err) {
      console.error('Erreur chargement lieux:', err);
      setLieux([]);
    } finally {
      setLoadingLieux(false);
    }
  }, [selectedTypePatrimoine, searchQuery]);

  // Charger les services existants d'un lieu
  const loadExistingServices = useCallback(async (lieuId: number) => {
    try {
      setLoadingServices(true);
      const response = await lieuService.getServices(lieuId);
      if (response.success && response.data) {
        setExistingServices(response.data);
      } else {
        setExistingServices([]);
      }
    } catch (err) {
      console.error('Erreur chargement services:', err);
      setExistingServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Charger les lieux au changement de type ou recherche
  useEffect(() => {
    loadLieux();
  }, [loadLieux]);

  // Charger les services quand un lieu est sélectionné
  useEffect(() => {
    if (selectedLieu) {
      loadExistingServices(selectedLieu.id_lieu);
    }
  }, [selectedLieu, loadExistingServices]);

  // Obtenir le nom localisé
  const getLocalizedName = (item: any, field: string = 'nom') => {
    if (!item) return '';
    const value = item[field];
    if (!value) return '';
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed[currentLang] || parsed.fr || value;
      } catch {
        return value;
      }
    }
    return value[currentLang] || value.fr || '';
  };

  // Sélectionner un lieu
  const handleSelectLieu = (lieu: any) => {
    setSelectedLieu(lieu);
    setActiveTab('add-services');
    setSelectedPredefinedServices([]);
    setServicesToAdd([]);
  };

  // Toggle service prédéfini
  const togglePredefinedService = (serviceId: string) => {
    setSelectedPredefinedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Ajouter un service personnalisé à la liste
  const addCustomService = () => {
    if (!customService.nom.fr && !customService.nom.ar) {
      const errorMessage = t('ajouterService.errors.nomRequired', 'Le nom du service est requis');
      setError(errorMessage);
      toast({
        title: t('common.error', 'Erreur'),
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }
    setServicesToAdd(prev => [...prev, { ...customService }]);
    setCustomService(INITIAL_SERVICE);
    setError(null);
    toast({
      title: t('ajouterService.serviceAdded', 'Service ajouté'),
      description: t('ajouterService.serviceAddedDesc', 'Le service a été ajouté à la liste'),
    });
  };

  // Retirer un service de la liste
  const removeServiceToAdd = (index: number) => {
    setServicesToAdd(prev => prev.filter((_, i) => i !== index));
  };

  // Soumettre les services
  const handleSubmit = async () => {
    if (!selectedLieu) {
      const errorMessage = t('ajouterService.errors.noLieuSelected', 'Veuillez sélectionner un lieu');
      setError(errorMessage);
      toast({
        title: t('common.error', 'Erreur'),
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    const allServices: ServiceForm[] = [
      // Services prédéfinis sélectionnés
      ...selectedPredefinedServices.map(id => {
        const service = SERVICES_PREDEFINIS.find(s => s.id === id);
        return {
          nom: service?.label || { fr: id, ar: id, en: id },
          description: { fr: '', ar: '', en: '' },
          disponible: true
        };
      }),
      // Services personnalisés
      ...servicesToAdd
    ];

    if (allServices.length === 0) {
      const errorMessage = t('ajouterService.errors.noServices', 'Veuillez ajouter au moins un service');
      setError(errorMessage);
      toast({
        title: t('common.error', 'Erreur'),
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Ajouter chaque service
      for (const service of allServices) {
        await lieuService.addService(selectedLieu.id_lieu, {
          nom: service.nom,
          description: service.description,
          disponible: service.disponible
        });
      }

      setSuccess(true);

      toast({
        title: t('ajouterService.successTitle', 'Succès'),
        description: t('ajouterService.success', 'Services ajoutés avec succès!'),
      });

      // Recharger les services
      await loadExistingServices(selectedLieu.id_lieu);

      // Reset
      setSelectedPredefinedServices([]);
      setServicesToAdd([]);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      console.error('Erreur ajout services:', err);
      const errorMessage = err.message || t('ajouterService.errors.submitFailed', 'Erreur lors de l\'ajout des services');
      setError(errorMessage);
      toast({
        title: t('common.error', 'Erreur'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Obtenir l'icône du type
  const getTypeIcon = (typeValue: string) => {
    const type = TYPES_PATRIMOINE.find(t => t.value === typeValue);
    return type?.icon || MapPin;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 me-2" />
            {t('common.back', 'Retour')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              {t('ajouterService.title', 'Ajouter des services')}
            </h1>
            <p className="text-muted-foreground">
              {t('ajouterService.subtitle', 'Ajoutez des services aux sites patrimoniaux')}
            </p>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t('ajouterService.success', 'Services ajoutés avec succès!')}
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="select-lieu" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t('ajouterService.selectLieu', '1. Sélectionner un lieu')}
            </TabsTrigger>
            <TabsTrigger
              value="add-services"
              disabled={!selectedLieu}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {t('ajouterService.addServices', '2. Ajouter des services')}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Sélectionner un lieu */}
          <TabsContent value="select-lieu">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filtres */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('ajouterService.filters', 'Filtres')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recherche */}
                  <div className="space-y-2">
                    <Label>{t('ajouterService.search', 'Rechercher')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('ajouterService.searchPlaceholder', 'Nom du lieu...')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Type de patrimoine */}
                  <div className="space-y-2">
                    <Label>{t('ajouterService.typePatrimoine', 'Type de patrimoine')}</Label>
                    <Select value={selectedTypePatrimoine} onValueChange={setSelectedTypePatrimoine}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_PATRIMOINE.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {type.label[currentLang] || type.label.fr}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des lieux */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{t('ajouterService.lieuxList', 'Sites patrimoniaux')}</span>
                    <Badge variant="secondary">{lieux.length} {t('ajouterService.results', 'résultats')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingLieux ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : lieux.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('ajouterService.noLieux', 'Aucun lieu trouvé')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                      {lieux.map((lieu) => {
                        const Icon = getTypeIcon(lieu.typePatrimoine);
                        const isSelected = selectedLieu?.id_lieu === lieu.id_lieu;
                        return (
                          <div
                            key={lieu.id_lieu}
                            onClick={() => handleSelectLieu(lieu)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary'
                                : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">
                                  {getLocalizedName(lieu)}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {getLocalizedName(lieu, 'adresse')}
                                </p>
                                {lieu.typePatrimoine && (
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    {TYPES_PATRIMOINE.find(t => t.value === lieu.typePatrimoine)?.label[currentLang] || lieu.typePatrimoine}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Ajouter des services */}
          <TabsContent value="add-services">
            {selectedLieu && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Infos du lieu sélectionné */}
                <Card className="lg:col-span-3">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        {React.createElement(getTypeIcon(selectedLieu.typePatrimoine), { className: "h-8 w-8 text-primary" })}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold">{getLocalizedName(selectedLieu)}</h2>
                        <p className="text-muted-foreground">{getLocalizedName(selectedLieu, 'adresse')}</p>
                      </div>
                      <Button variant="outline" onClick={() => setActiveTab('select-lieu')}>
                        {t('ajouterService.changeLieu', 'Changer de lieu')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Services existants */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {t('ajouterService.existingServices', 'Services existants')}
                    </CardTitle>
                    <CardDescription>
                      {t('ajouterService.existingServicesDesc', 'Services déjà configurés pour ce lieu')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingServices ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : existingServices.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        {t('ajouterService.noExistingServices', 'Aucun service configuré')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {existingServices.map((service, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span>{getLocalizedName(service, 'nom_service') || getLocalizedName(service)}</span>
                            <Badge variant={service.disponible ? 'default' : 'secondary'}>
                              {service.disponible ? t('common.available', 'Disponible') : t('common.unavailable', 'Indisponible')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Services prédéfinis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {t('ajouterService.predefinedServices', 'Services courants')}
                    </CardTitle>
                    <CardDescription>
                      {t('ajouterService.predefinedServicesDesc', 'Sélectionnez les services à ajouter')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                      {SERVICES_PREDEFINIS.map((service) => {
                        const isExisting = existingServices.some(
                          s => (getLocalizedName(s, 'nom_service') || getLocalizedName(s))?.toLowerCase() === service.label.fr.toLowerCase()
                        );
                        return (
                          <div
                            key={service.id}
                            className={`flex items-center space-x-2 p-2 rounded ${isExisting ? 'opacity-50' : ''}`}
                          >
                            <Checkbox
                              id={service.id}
                              checked={selectedPredefinedServices.includes(service.id)}
                              onCheckedChange={() => !isExisting && togglePredefinedService(service.id)}
                              disabled={isExisting}
                            />
                            <Label
                              htmlFor={service.id}
                              className={`flex-1 cursor-pointer ${isExisting ? 'line-through' : ''}`}
                            >
                              {service.label[currentLang] || service.label.fr}
                              {isExisting && (
                                <span className="text-xs text-muted-foreground ms-2">
                                  ({t('ajouterService.alreadyAdded', 'déjà ajouté')})
                                </span>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Service personnalisé */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {t('ajouterService.customService', 'Service personnalisé')}
                    </CardTitle>
                    <CardDescription>
                      {t('ajouterService.customServiceDesc', 'Ajoutez un service non listé')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MultiLangInput
                      label={t('ajouterService.serviceName', 'Nom du service')}
                      value={customService.nom}
                      onChange={(value) => setCustomService(prev => ({ ...prev, nom: value }))}
                      placeholder={t('ajouterService.serviceNamePlaceholder', 'Ex: Location de vélos')}
                    />

                    <MultiLangInput
                      label={t('ajouterService.serviceDesc', 'Description (optionnel)')}
                      value={customService.description}
                      onChange={(value) => setCustomService(prev => ({ ...prev, description: value }))}
                      multiline
                      rows={2}
                    />

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="disponible"
                        checked={customService.disponible}
                        onCheckedChange={(checked) => setCustomService(prev => ({ ...prev, disponible: !!checked }))}
                      />
                      <Label htmlFor="disponible">{t('ajouterService.available', 'Service disponible')}</Label>
                    </div>

                    <Button type="button" onClick={addCustomService} className="w-full" variant="outline">
                      <Plus className="h-4 w-4 me-2" />
                      {t('ajouterService.addToList', 'Ajouter à la liste')}
                    </Button>

                    {/* Liste des services personnalisés à ajouter */}
                    {servicesToAdd.length > 0 && (
                      <div className="border-t pt-4 mt-4">
                        <Label className="mb-2 block">{t('ajouterService.servicesToAdd', 'Services à ajouter:')}</Label>
                        <div className="space-y-2">
                          {servicesToAdd.map((service, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span>{service.nom[currentLang] || service.nom.fr}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeServiceToAdd(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bouton de soumission */}
                <Card className="lg:col-span-3">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-muted-foreground">
                        {selectedPredefinedServices.length + servicesToAdd.length} {t('ajouterService.servicesSelected', 'service(s) à ajouter')}
                      </div>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || (selectedPredefinedServices.length === 0 && servicesToAdd.length === 0)}
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                            {t('ajouterService.submitting', 'Ajout en cours...')}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 me-2" />
                            {t('ajouterService.submit', 'Ajouter les services')}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterService;
