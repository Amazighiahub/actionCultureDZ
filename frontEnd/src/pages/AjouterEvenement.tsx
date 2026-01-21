import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Upload, Save, ArrowLeft, Calendar, Building2, Globe, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/UI/use-toast';
import MultiLangInput from '@/components/MultiLangInput';

// Import des hooks de localisation
import { useRTL } from '@/hooks/useRTL';

// Import des services
import { metadataService } from '@/services/metadata.service';
import { authService } from '@/services/auth.service';

// Import des types
import { Wilaya } from '@/types';
import { Lieu } from '@/types/models/lieu.types';

// Import du composant LieuSelector
import { LieuSelector } from '@/components/LieuSelector';

const AjouterEvenement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const { toast } = useToast();
  
  const [gratuit, setGratuit] = useState(false);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  
  // État pour l'organisation
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<number | undefined>();
  const [hasOrganisation, setHasOrganisation] = useState(false);
  const [loadingOrganisations, setLoadingOrganisations] = useState(true);
  
  // État pour événement virtuel
  const [isVirtual, setIsVirtual] = useState(false);
    
  // État pour le lieu sélectionné
  const [selectedLieuId, setSelectedLieuId] = useState<number | undefined>();
  const [selectedLieu, setSelectedLieu] = useState<Lieu | undefined>();
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | undefined>();
  
  // État pour le formulaire multilingue
  const [formData, setFormData] = useState<{
    nom: { fr: string; ar: string; en: string };
    description: { fr: string; ar: string; en: string };
  }>({
    nom: { fr: '', ar: '', en: '' },
    description: { fr: '', ar: '', en: '' }
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    // Vérifier l'authentification
    const authenticated = authService.isAuthenticated();
    
    if (!authenticated) {
      toast({
        title: t('auth.required'),
        description: t('auth.mustBeConnected'),
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Charger les wilayas
    try {
      const wilayasResponse = await metadataService.getWilayas();
      if (wilayasResponse.success && wilayasResponse.data) {
        setWilayas(wilayasResponse.data);
      }
    } catch (error) {
      console.error('Erreur chargement wilayas:', error);
    }
    
    // Charger les organisations de l'utilisateur
    try {
      setLoadingOrganisations(true);
      const response = await fetch('/api/users/me/organisations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setOrganisations(data.data);
        setHasOrganisation(data.data.length > 0);
        if (data.data.length === 1) {
          setSelectedOrganisationId(data.data[0].id_organisation);
        }
      }
    } catch (error) {
      console.error('Erreur chargement organisations:', error);
    } finally {
      setLoadingOrganisations(false);
    }
  };

  const typesEvenements = [
    { value: 'exposition', label: t('events.types.exhibition') },
    { value: 'concert', label: t('events.types.concert') },
    { value: 'projection', label: t('events.types.screening') },
    { value: 'conference', label: t('events.types.conference') },
    { value: 'atelier', label: t('events.types.workshop') },
    { value: 'festival', label: t('events.types.festival') },
    { value: 'spectacle', label: t('events.types.show') },
    { value: 'rencontre_litteraire', label: t('events.types.literaryMeeting') },
    { value: 'webinaire', label: t('events.types.webinar', 'Webinaire') },
    { value: 'streaming', label: t('events.types.streaming', 'Streaming en direct') }
  ];

  const handleGratuitChange = (checked: boolean | "indeterminate") => {
    setGratuit(checked === true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Organisation requise sauf pour événements virtuels
    if (!isVirtual && !selectedOrganisationId) {
      toast({
        title: t('common.error'),
        description: t('events.create.organisationRequired', 'Une organisation est requise pour les événements en présentiel'),
        variant: "destructive",
      });
      return;
    }
    
    // Validation: Lieu requis sauf pour événements virtuels
    if (!isVirtual && !selectedLieuId) {
      toast({
        title: t('common.error'),
        description: t('events.create.locationRequired'),
        variant: "destructive",
      });
      return;
    }
    
    // Ici, vous pouvez collecter toutes les données du formulaire
    const submitData = {
      nom: JSON.stringify(formData.nom),
      description: JSON.stringify(formData.description),
      lieu_id: selectedLieuId,
      // ... autres champs du formulaire
      // Si vous avez créé un nouveau lieu, les coordonnées sont déjà dans la BD
    };
    
    console.log('Données à soumettre:', submitData);
    
    toast({
      title: t('common.featureInDevelopment'),
      description: t('events.create.willBeAvailableSoon'),
    });
  };

  return (
    <div className={`min-h-screen bg-background`} dir="ltr">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className={`flex items-center gap-4 mb-8 ${rtlClasses.flexRow}`}>
            <Link to="/dashboard-pro">
              <Button variant="outline" size="sm">
                <ArrowLeft className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('common.backToDashboard')}
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
                {t('events.create.title')}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                {t('events.create.subtitle')}
              </p>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Alerte si pas d'organisation et événement non-virtuel */}
            {!loadingOrganisations && !hasOrganisation && !isVirtual && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span>
                      {t('events.create.noOrganisation', 'Vous devez créer une organisation pour organiser un événement en présentiel.')}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-400 text-amber-700 hover:bg-amber-100"
                      onClick={() => navigate('/ajouter-organisation')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('events.create.createOrganisation', 'Créer une organisation')}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Type d'événement: Présentiel ou Virtuel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('events.create.eventFormat', 'Format de l\'événement')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsVirtual(false)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      !isVirtual
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Building2 className={`h-6 w-6 mb-2 ${!isVirtual ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold">{t('events.create.inPerson', 'En présentiel')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('events.create.inPersonDesc', 'Événement physique avec un lieu et une organisation')}
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsVirtual(true)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isVirtual
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Globe className={`h-6 w-6 mb-2 ${isVirtual ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold">{t('events.create.virtual', 'Virtuel / En ligne')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('events.create.virtualDesc', 'Webinaire, streaming, conférence en ligne')}
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Organisation (requis pour présentiel) */}
            {!isVirtual && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t('events.create.organisation', 'Organisation')} *
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingOrganisations ? (
                    <div className="text-center py-4 text-muted-foreground">
                      {t('common.loading', 'Chargement...')}
                    </div>
                  ) : organisations.length > 0 ? (
                    <div className="space-y-2">
                      <Label>{t('events.create.selectOrganisation', 'Sélectionnez votre organisation')}</Label>
                      <Select
                        value={selectedOrganisationId?.toString()}
                        onValueChange={(value) => setSelectedOrganisationId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('events.create.selectOrganisationPlaceholder', 'Choisir une organisation')} />
                        </SelectTrigger>
                        <SelectContent>
                          {organisations.map((org) => (
                            <SelectItem key={org.id_organisation} value={org.id_organisation.toString()}>
                              {typeof org.nom === 'object' ? org.nom.fr || org.nom.ar : org.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-3">
                        {t('events.create.noOrganisationYet', 'Vous n\'avez pas encore d\'organisation')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/ajouter-organisation')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('events.create.createOrganisation', 'Créer une organisation')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.generalInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>{t('events.create.eventName')} *</Label>
                  <MultiLangInput
                    name="nom"
                    label={t('events.create.eventName')}
                    value={formData.nom}
                    onChange={(value) => setFormData(prev => ({ ...prev, nom: value as { fr: string; ar: string; en: string } }))}
                    required
                    placeholder={t('events.create.eventNamePlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('common.description')} *</Label>
                  <MultiLangInput
                    name="description"
                    label={t('common.description')}
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value as { fr: string; ar: string; en: string } }))}
                    type="textarea"
                    rows={4}
                    placeholder={t('events.create.descriptionPlaceholder')}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('events.create.eventType')} *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {typesEvenements.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!isVirtual && (
                    <div className="space-y-2">
                      <Label htmlFor="wilaya">{t('common.wilaya')}</Label>
                      <Select 
                        value={selectedWilayaId?.toString()}
                        onValueChange={(value) => setSelectedWilayaId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.selectWilaya')} />
                        </SelectTrigger>
                        <SelectContent>
                          {wilayas.map((wilaya) => (
                            <SelectItem key={wilaya.id_wilaya} value={wilaya.id_wilaya.toString()}>
                              {wilaya.codeW} - {wilaya.wilaya_name_ascii}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Lieu pour événements en présentiel */}
                {!isVirtual && (
                  <div className="space-y-2">
                    <Label>{t('events.create.location')} *</Label>
                    <LieuSelector
                      value={selectedLieuId}
                      onChange={(lieuId, lieu) => {
                        setSelectedLieuId(lieuId);
                        setSelectedLieu(lieu);
                      }}
                      wilayaId={selectedWilayaId}
                      required
                    />
                    {selectedLieu && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedLieu.adresse}
                      </p>
                    )}
                  </div>
                )}

                {/* URL pour événements virtuels */}
                {isVirtual && (
                  <div className="space-y-2">
                    <Label htmlFor="url_virtuel">{t('events.create.virtualUrl', 'Lien de l\'événement')} *</Label>
                    <Input 
                      id="url_virtuel" 
                      type="url" 
                      placeholder={t('events.create.virtualUrlPlaceholder', 'https://zoom.us/j/... ou https://meet.google.com/...')}
                      required={isVirtual}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('events.create.virtualUrlHint', 'Lien Zoom, Google Meet, YouTube Live, etc.')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.datesAndTimes')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date-debut">{t('events.create.startDate')} *</Label>
                    <Input id="date-debut" type="date" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date-fin">{t('events.create.endDate')}</Label>
                    <Input id="date-fin" type="date" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heure-debut">{t('events.create.startTime')}</Label>
                    <Input id="heure-debut" type="time" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="heure-fin">{t('events.create.endTime')}</Label>
                    <Input id="heure-fin" type="time" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.participationAndPricing')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max-participants">{t('events.create.maxParticipants')}</Label>
                  <Input 
                    id="max-participants" 
                    type="number" 
                    placeholder={t('events.create.maxParticipantsPlaceholder')} 
                  />
                </div>
                
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <Checkbox 
                    id="gratuit" 
                    checked={gratuit}
                    onCheckedChange={handleGratuitChange}
                  />
                  <Label htmlFor="gratuit">{t('events.create.freeEvent')}</Label>
                </div>
                
                {!gratuit && (
                  <div className={`space-y-2 ${rtlClasses.marginStart(6)}`}>
                    <Label htmlFor="tarif">{t('events.create.price')}</Label>
                    <Input 
                      id="tarif" 
                      type="number" 
                      placeholder={t('events.create.pricePlaceholder')} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.imageAndMedia')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="affiche">{t('events.create.eventImage')} *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      {t('common.dragDropImage')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('common.imageFormats')}
                    </p>
                    <Button variant="outline" className="mt-4">
                      {t('common.chooseFile')}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="medias-post">{t('events.create.postEventMedia')}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {t('events.create.postEventMediaDesc')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('events.create.addAfterEvent')}
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      {t('common.chooseFiles')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className={`flex justify-end gap-4 ${rtlClasses.flexRow}`}>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  toast({
                    title: t('common.featureInDevelopment'),
                    description: t('events.create.draftSaved'),
                  });
                }}
              >
                <Save className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('events.create.saveAsDraft')}
              </Button>
              <Button type="submit" className="btn-hover" disabled={false}>
                <Calendar className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('events.create.publishEvent')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterEvenement;