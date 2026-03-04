import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Save, ArrowLeft, Calendar, Building2, Globe, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import MultiLangInput from '@/components/MultiLangInput';

// Import des hooks de localisation
import { useRTL } from '@/hooks/useRTL';

// Import des services
import { metadataService } from '@/services/metadata.service';
import { authService } from '@/services/auth.service';
import { evenementService } from '@/services/evenement.service';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

// Import des types
import { Wilaya } from '@/types';
import { Lieu } from '@/types/models/lieu.types';

// Import du composant LieuSelector
import { LieuSelector } from '@/components/LieuSelector';

const AjouterEvenement = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const { toast } = useToast();
  
  const [gratuit, setGratuit] = useState(false);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [typesEvenements, setTypesEvenements] = useState<Array<{ id_type_evenement: number; nom_type: any }>>([]);
  
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
  
  // État pour le formulaire multilingue (FR, AR, EN, Tamazight Latin, Tamazight Tifinagh)
  const [formData, setFormData] = useState<{
    nom: { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string };
    description: { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string };
    idTypeEvenement: string;
    dateDebut: string;
    dateFin: string;
    heureDebut: string;
    heureFin: string;
    maxParticipants: string;
    tarif: string;
    urlVirtuel: string;
  }>({
    nom: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    idTypeEvenement: '',
    dateDebut: '',
    dateFin: '',
    heureDebut: '',
    heureFin: '',
    maxParticipants: '',
    tarif: '',
    urlVirtuel: ''
  });

  // État pour les fichiers
  const [affiche, setAffiche] = useState<File | null>(null);
  const [affichePreview, setAffichePreview] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && editId) {
      loadExistingEvent();
    }
  }, [isEditMode, editId]);

  const loadExistingEvent = async () => {
    if (!editId) return;
    try {
      const response = await evenementService.getById(editId);
      if (response.success && response.data) {
        const evt = response.data as any;
        setFormData({
          nom: typeof evt.nom_evenement === 'object' ? evt.nom_evenement : { fr: evt.nom_evenement || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
          description: typeof evt.description === 'object' ? evt.description : { fr: evt.description || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
          idTypeEvenement: evt.id_type_evenement?.toString() || '',
          dateDebut: evt.date_debut ? evt.date_debut.split('T')[0] : '',
          dateFin: evt.date_fin ? evt.date_fin.split('T')[0] : '',
          heureDebut: evt.heure_debut || '',
          heureFin: evt.heure_fin || '',
          maxParticipants: evt.capacite_max?.toString() || '',
          tarif: evt.tarif?.toString() || '',
          urlVirtuel: evt.url_virtuel || '',
        });
        if (evt.id_lieu) setSelectedLieuId(evt.id_lieu);
        if (evt.id_organisation) setSelectedOrganisationId(evt.id_organisation);
        if (evt.tarif === 0 || !evt.tarif) setGratuit(true);
        if (evt.url_virtuel) setIsVirtual(true);
        console.log('✅ Événement chargé pour édition:', evt);
      } else {
        toast({ title: 'Erreur', description: 'Événement introuvable', variant: 'destructive' });
        navigate('/dashboard-pro');
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement événement:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger l\'événement', variant: 'destructive' });
    }
  };

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

    // Charger les types d'événements
    try {
      const typesResponse = await metadataService.getTypesEvenements();
      if (typesResponse.success && typesResponse.data) {
        setTypesEvenements(typesResponse.data);
      }
    } catch (error) {
      console.error('Erreur chargement types événements:', error);
    }
    
    // Charger les organisations de l'utilisateur
    try {
      setLoadingOrganisations(true);
      const response = await httpClient.get<any[]>(API_ENDPOINTS.organisations.me);
      if (response.success && response.data) {
        setOrganisations(response.data);
        setHasOrganisation(response.data.length > 0);
        if (response.data.length === 1) {
          setSelectedOrganisationId(response.data[0].id_organisation);
        }
      }
    } catch (error) {
      console.error('Erreur chargement organisations:', error);
    } finally {
      setLoadingOrganisations(false);
    }
  };

  // Les types d'événements sont chargés depuis l'API dans checkAuthAndLoadData

  const handleGratuitChange = (checked: boolean | "indeterminate") => {
    setGratuit(checked === true);
  };

  const submitEvent = async (statut: 'publie' | 'brouillon') => {
    const fd = new FormData();
    fd.append('nom_evenement', JSON.stringify(formData.nom));
    fd.append('description', JSON.stringify(formData.description));
    fd.append('id_type_evenement', formData.idTypeEvenement);
    fd.append('date_debut', formData.dateDebut);
    if (formData.dateFin) fd.append('date_fin', formData.dateFin);
    if (formData.heureDebut) fd.append('heure_debut', formData.heureDebut);
    if (formData.heureFin) fd.append('heure_fin', formData.heureFin);
    if (formData.maxParticipants) fd.append('capacite_max', formData.maxParticipants);
    fd.append('tarif', (!gratuit && formData.tarif) ? formData.tarif : '0');
    if (!isVirtual && selectedLieuId) fd.append('id_lieu', selectedLieuId.toString());
    if (!isVirtual && selectedOrganisationId) fd.append('id_organisation', selectedOrganisationId.toString());
    if (isVirtual && formData.urlVirtuel) fd.append('url_virtuel', formData.urlVirtuel);
    fd.append('statut', statut);
    if (affiche) fd.append('affiche', affiche);

    try {
      let response;
      if (isEditMode && editId) {
        console.log('📝 Mise à jour événement', editId);
        response = await evenementService.update(editId, fd as any);
      } else {
        response = await evenementService.create(fd as any);
      }

      if (response.success) {
        toast({
          title: t('common.success', 'Succès'),
          description: isEditMode
            ? 'Événement mis à jour avec succès'
            : (statut === 'brouillon'
              ? t('events.create.draftSaved', 'Brouillon sauvegardé avec succès')
              : t('events.create.success', 'Événement créé avec succès!')),
        });
        navigate('/dashboard-pro');
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: response.error || (isEditMode ? 'Erreur lors de la mise à jour' : t('events.create.error', 'Erreur lors de la création')),
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      console.error(isEditMode ? 'Erreur mise à jour événement:' : 'Erreur création événement:', error);
      toast({
        title: t('common.error', 'Erreur'),
        description: isEditMode ? 'Erreur lors de la mise à jour' : t('events.create.error', 'Erreur lors de la création de l\'événement'),
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Nom requis
    if (!formData.nom.fr && !formData.nom.ar) {
      toast({
        title: t('common.error'),
        description: t('events.create.nameRequired', 'Le nom de l\'événement est requis'),
        variant: "destructive",
      });
      return;
    }

    // Validation: Type requis
    if (!formData.idTypeEvenement) {
      toast({
        title: t('common.error'),
        description: t('events.create.typeRequired', 'Le type d\'événement est requis'),
        variant: "destructive",
      });
      return;
    }

    // Validation: Date de début requise
    if (!formData.dateDebut) {
      toast({
        title: t('common.error'),
        description: t('events.create.startDateRequired', 'La date de début est requise'),
        variant: "destructive",
      });
      return;
    }

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

    // Validation: URL virtuel requis pour événements virtuels
    if (isVirtual && !formData.urlVirtuel) {
      toast({
        title: t('common.error'),
        description: t('events.create.virtualUrlRequired', 'Le lien de l\'événement virtuel est requis'),
        variant: "destructive",
      });
      return;
    }

    // Validation: Affiche requise
    if (!affiche) {
      toast({
        title: t('common.error'),
        description: t('events.create.imageRequired', 'L\'image de l\'événement est requise'),
        variant: "destructive",
      });
      return;
    }

    await submitEvent('publie');
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
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <div className="flex flex-col gap-3">
                    <div className="font-semibold">
                      {t('events.create.organisationRequired', 'Organisation requise')}
                    </div>
                    <p>
                      {t('events.create.noOrganisation', 'En tant que professionnel, vous devez créer une organisation pour organiser un événement en présentiel. Une organisation représente votre structure (association, entreprise, collectif, etc.).')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => navigate('/ajouter-organisation')}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('events.create.createOrganisation', 'Créer une organisation')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-400 text-red-700 hover:bg-red-100"
                        onClick={() => setIsVirtual(true)}
                      >
                        {t('events.create.switchToVirtual', 'Créer un événement virtuel')}
                      </Button>
                    </div>
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
                        value={selectedOrganisationId?.toString() ?? ''}
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
                    onChange={(value) => setFormData(prev => ({ ...prev, nom: value as { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string } }))}
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
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value as { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string } }))}
                    type="textarea"
                    rows={4}
                    placeholder={t('events.create.descriptionPlaceholder')}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('events.create.eventType')} *</Label>
                    <Select
                      value={formData.idTypeEvenement}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, idTypeEvenement: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {typesEvenements.map((type) => (
                          <SelectItem key={type.id_type_evenement} value={type.id_type_evenement.toString()}>
                            {typeof type.nom_type === 'object' ? type.nom_type.fr || type.nom_type.ar || '' : type.nom_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!isVirtual && (
                    <div className="space-y-2">
                      <Label htmlFor="wilaya">{t('common.wilaya')}</Label>
                      <Select 
                        value={selectedWilayaId?.toString() ?? ''}
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
                      value={formData.urlVirtuel}
                      onChange={(e) => setFormData(prev => ({ ...prev, urlVirtuel: e.target.value }))}
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
                    <Input
                      id="date-debut"
                      type="date"
                      value={formData.dateDebut}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateDebut: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-fin">{t('events.create.endDate')}</Label>
                    <Input
                      id="date-fin"
                      type="date"
                      value={formData.dateFin}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateFin: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heure-debut">{t('events.create.startTime')}</Label>
                    <Input
                      id="heure-debut"
                      type="time"
                      value={formData.heureDebut}
                      onChange={(e) => setFormData(prev => ({ ...prev, heureDebut: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heure-fin">{t('events.create.endTime')}</Label>
                    <Input
                      id="heure-fin"
                      type="time"
                      value={formData.heureFin}
                      onChange={(e) => setFormData(prev => ({ ...prev, heureFin: e.target.value }))}
                    />
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
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
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
                      value={formData.tarif}
                      onChange={(e) => setFormData(prev => ({ ...prev, tarif: e.target.value }))}
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
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      affichePreview ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
                    }`}
                  >
                    {affichePreview ? (
                      <div className="relative">
                        <img
                          src={affichePreview}
                          alt="Aperçu affiche"
                          className="max-h-48 mx-auto rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setAffiche(null);
                            setAffichePreview(null);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                          {t('common.dragDropImage')}
                        </p>
                        <p className="text-sm text-gray-400">
                          {t('common.imageFormats')}
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      id="affiche-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAffiche(file);
                          setAffichePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => document.getElementById('affiche-upload')?.click()}
                    >
                      {affichePreview ? t('common.changeImage', 'Changer l\'image') : t('common.chooseFile')}
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

            {/* Message si organisation requise mais manquante */}
            {!isVirtual && !hasOrganisation && !loadingOrganisations && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('events.create.organisationRequiredMessage', 'Vous devez d\'abord créer une organisation pour publier un événement en présentiel.')}
                </AlertDescription>
              </Alert>
            )}

            <div className={`flex justify-end gap-4 ${rtlClasses.flexRow}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => submitEvent('brouillon')}
              >
                <Save className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('events.create.saveAsDraft')}
              </Button>
              <Button
                type="submit"
                className="btn-hover"
                disabled={!isVirtual && !hasOrganisation}
              >
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