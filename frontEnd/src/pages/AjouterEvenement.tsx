import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Upload, Save, ArrowLeft, Calendar, Building2, Globe, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import MultiLangInput from '@/components/MultiLangInput';

// Import des hooks de localisation
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

// Import des services
import { metadataService } from '@/services/metadata.service';
import { authService } from '@/services/auth.service';
import { evenementService } from '@/services/evenement.service';
import { httpClient } from '@/services/httpClient';
import { API_ENDPOINTS } from '@/config/api';

// Import des types
import { Wilaya } from '@/types';
import { Lieu } from '@/types/models/lieu.types';

// LieuSelector chargé en lazy (inclut leaflet ~40KB)
const LieuSelector = React.lazy(() =>
  import('@/components/LieuSelector').then(m => ({ default: m.LieuSelector }))
);

const AjouterEvenement = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;
  const { t, i18n } = useTranslation();
  const { rtlClasses, direction } = useRTL();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);

  const [gratuit, setGratuit] = useState(false);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [typesEvenements, setTypesEvenements] = useState<Array<{ id_type_evenement: number; nom_type: string | Record<string, string> }>>([]);
  
  // État pour l'organisation
  const [organisations, setOrganisations] = useState<Array<Record<string, unknown>>>([]);
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
  const [isDragging, setIsDragging] = useState(false);

  const DRAFT_KEY = 'eventculture_draft_event';

  // Restaurer le brouillon si l'utilisateur revient après création d'organisation
  useEffect(() => {
    if (isEditMode) return; // Pas de restauration en mode édition
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.formData) setFormData(draft.formData);
        if (draft.selectedLieuId) setSelectedLieuId(draft.selectedLieuId);
        if (draft.selectedWilayaId) setSelectedWilayaId(draft.selectedWilayaId);
        if (draft.selectedOrganisationId) setSelectedOrganisationId(draft.selectedOrganisationId);
        if (draft.gratuit !== undefined) setGratuit(draft.gratuit);
        if (draft.isVirtual !== undefined) setIsVirtual(draft.isVirtual);
        sessionStorage.removeItem(DRAFT_KEY);
        setIsDirty(true);
        toast({ title: t('events.create.draftRestored', 'Brouillon restauré'), description: t('events.create.draftRestoredDesc', 'Vos données précédentes ont été restaurées.') });
      }
    } catch { /* ignore parsing errors */ }
  }, [isEditMode]);

  const saveDraftAndNavigate = (path: string) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        formData,
        selectedLieuId,
        selectedWilayaId,
        selectedOrganisationId,
        gratuit,
        isVirtual,
      }));
    } catch { /* storage full — proceed without saving */ }
    navigate(path);
  };

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
        const evt = response.data as Record<string, unknown>;
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
        if (evt.image_url) {
          setAffichePreview(evt.image_url);
        }
        if (evt.id_lieu) setSelectedLieuId(evt.id_lieu);
        if (evt.id_organisation) setSelectedOrganisationId(evt.id_organisation);
        if (evt.tarif === 0 || !evt.tarif) setGratuit(true);
        if (evt.url_virtuel) setIsVirtual(true);
        // Data loaded for edit mode
      } else {
        toast({ title: t('toasts.error'), description: t('toasts.eventNotFound'), variant: 'destructive' });
        navigate('/dashboard-pro');
      }
    } catch (error: unknown) {
      toast({ title: t('toasts.error'), description: t('toasts.eventLoadFailed'), variant: 'destructive' });
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
    } catch {
      toast({ title: t('toasts.error'), description: t('events.create.loadWilayasFailed', 'Erreur lors du chargement des wilayas'), variant: 'destructive' });
    }

    // Charger les types d'événements
    try {
      const typesResponse = await metadataService.getTypesEvenements();
      if (typesResponse.success && typesResponse.data) {
        setTypesEvenements(typesResponse.data);
      }
    } catch {
      toast({ title: t('toasts.error'), description: t('events.create.loadTypesFailed', 'Erreur lors du chargement des types d\'événements'), variant: 'destructive' });
    }

    // Charger les organisations de l'utilisateur
    try {
      setLoadingOrganisations(true);
      const response = await httpClient.get<Array<Record<string, unknown>>>(API_ENDPOINTS.organisations.me);
      if (response.success && response.data) {
        setOrganisations(response.data);
        setHasOrganisation(response.data.length > 0);
        if (response.data.length === 1) {
          setSelectedOrganisationId(response.data[0].id_organisation);
        }
      }
    } catch {
      toast({ title: t('toasts.error'), description: t('events.create.loadOrgsFailed', 'Erreur lors du chargement des organisations'), variant: 'destructive' });
    } finally {
      setLoadingOrganisations(false);
    }
  };

  // Les types d'événements sont chargés depuis l'API dans checkAuthAndLoadData

  const handleGratuitChange = (checked: boolean | "indeterminate") => {
    setGratuit(checked === true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateFieldOnBlur = (field: string) => {
    let error: string | undefined;
    switch (field) {
      case 'dateDebut':
        if (!formData.dateDebut) {
          error = t('events.create.startDateRequired', 'La date de début est requise');
        }
        break;
      case 'dateFin':
        if (formData.dateDebut && formData.dateFin && formData.dateFin < formData.dateDebut) {
          error = t('events.create.endDateAfterStart', 'La date de fin doit être après la date de début');
        }
        break;
    }
    setFieldErrors(prev => {
      if (!error) { const next = { ...prev }; delete next[field]; return next; }
      return { ...prev, [field]: error };
    });
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: t('common.error', 'Erreur'), description: t('validation.invalidFileType', 'Le fichier doit être une image'), variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t('common.error', 'Erreur'), description: t('validation.fileTooLarge', 'Fichier trop volumineux (max 5 Mo)'), variant: 'destructive' });
      return;
    }
    clearFieldError('affiche');
    setIsDirty(true);
    setAffiche(file);
    setAffichePreview(URL.createObjectURL(file));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const submitEvent = async (statut: 'publie' | 'brouillon') => {
    if (isSubmitting) return;

    // Validation minimale même pour les brouillons
    if (statut === 'brouillon') {
      const hasAnyName = formData.nom.fr?.trim() || formData.nom.ar?.trim() || formData.nom.en?.trim() || formData.nom['tz-ltn']?.trim() || formData.nom['tz-tfng']?.trim();
      if (!hasAnyName) {
        toast({ title: t('common.error'), description: t('events.create.draftNameRequired', 'Le nom est requis même pour un brouillon (au moins une langue)'), variant: 'destructive' });
        return;
      }
      if (!formData.idTypeEvenement) {
        toast({ title: t('common.error'), description: t('events.create.typeRequired', 'Le type d\'événement est requis'), variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);
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
        // Updating event
        response = await evenementService.update(editId, fd as unknown as Parameters<typeof evenementService.update>[1]);
      } else {
        response = await evenementService.create(fd as unknown as Parameters<typeof evenementService.create>[0]);
      }

      if (response.success) {
        setIsDirty(false);
        sessionStorage.removeItem(DRAFT_KEY);
        queryClient.invalidateQueries({ queryKey: ['evenements'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-pro-evenements'] });
        queryClient.invalidateQueries({ queryKey: ['evenement-stats'] });
        toast({
          title: t('common.success', 'Succès'),
          description: isEditMode
            ? t('events.create.updateSuccess', 'Événement mis à jour avec succès')
            : (statut === 'brouillon'
              ? t('events.create.draftSaved', 'Brouillon sauvegardé avec succès')
              : t('events.create.success', 'Événement créé avec succès!')),
        });
        navigate('/dashboard-pro');
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: response.error || (isEditMode ? t('toasts.updateError') : t('events.create.error', 'Erreur lors de la création')),
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      toast({
        title: t('common.error', 'Erreur'),
        description: isEditMode ? t('toasts.updateError') : t('events.create.error', 'Erreur lors de la création de l\'événement'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Validation: Nom requis — aligné sur le backend (fr OU ar)
    if (!formData.nom.fr?.trim() && !formData.nom.ar?.trim()) {
      newErrors.nom = t('events.create.nameRequired', 'Le nom de l\'événement est requis (au moins en français ou arabe)');
    }

    // Validation: Type requis
    if (!formData.idTypeEvenement) {
      newErrors.type = t('events.create.typeRequired', 'Le type d\'événement est requis');
    }

    // Validation: Date de début requise
    if (!formData.dateDebut) {
      newErrors.dateDebut = t('events.create.startDateRequired', 'La date de début est requise');
    }

    // Validation: Date de fin après date de début
    if (formData.dateDebut && formData.dateFin && formData.dateFin < formData.dateDebut) {
      newErrors.dateFin = t('events.create.endDateAfterStart', 'La date de fin doit être après la date de début');
    }

    // Validation: Organisation requise sauf pour événements virtuels
    if (!isVirtual && !selectedOrganisationId) {
      newErrors.organisation = t('events.create.organisationRequired', 'Une organisation est requise pour les événements en présentiel');
    }

    // Validation: Lieu requis sauf pour événements virtuels
    if (!isVirtual && !selectedLieuId) {
      newErrors.lieu = t('events.create.locationRequired');
    }

    // Validation: URL virtuel requis pour événements virtuels
    if (isVirtual && !formData.urlVirtuel?.trim()) {
      newErrors.urlVirtuel = t('events.create.virtualUrlRequired', 'Le lien de l\'événement virtuel est requis');
    }

    // Validation: Affiche requise (nouveau fichier OU image existante en mode édition)
    if (!affiche && !affichePreview) {
      newErrors.affiche = t('events.create.imageRequired', 'L\'image de l\'événement est requise');
    }

    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: t('common.error'),
        description: Object.values(newErrors)[0],
        variant: "destructive",
      });
      // Focus first errored field
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    await submitEvent('publie');
  };

  return (
    <div className={`min-h-screen bg-background`} dir={direction}>
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

          <form className="space-y-8" onSubmit={handleSubmit} onChange={() => setIsDirty(true)}>
            <p className="text-sm text-muted-foreground">{t('common.requiredFieldsLegend')}</p>
            {/* Alerte si pas d'organisation et événement non-virtuel */}
            {!loadingOrganisations && !hasOrganisation && !isVirtual && (
              <Alert className="border-destructive/20 bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <AlertDescription className="text-destructive">
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
                        onClick={() => saveDraftAndNavigate('/ajouter-organisation')}
                      >
                        <Plus className="h-4 w-4 me-1" />
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
                        onValueChange={(value) => { clearFieldError('organisation'); setSelectedOrganisationId(parseInt(value)); }}
                      >
                        <SelectTrigger aria-invalid={!!fieldErrors.organisation} aria-describedby={fieldErrors.organisation ? 'organisation-error' : undefined}>
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
                      {fieldErrors.organisation && <p id="organisation-error" role="alert" className="text-sm text-destructive">{fieldErrors.organisation}</p>}
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
                        onClick={() => saveDraftAndNavigate('/ajouter-organisation')}
                      >
                        <Plus className="h-4 w-4 me-2" />
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
                    onChange={(value) => { clearFieldError('nom'); setFormData(prev => ({ ...prev, nom: value as { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string } })); }}
                    required
                    requiredLanguages={['fr']}
                    placeholder={t('events.create.eventNamePlaceholder')}
                    aria-invalid={!!fieldErrors.nom}
                  />
                  {fieldErrors.nom && <p id="nom-error" role="alert" className="text-sm text-destructive">{fieldErrors.nom}</p>}
                </div>

                <div className="space-y-2">
                  <Label>{t('common.description')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <MultiLangInput
                    name="description"
                    label={t('common.description')}
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value as { fr: string; ar: string; en: string; 'tz-ltn': string; 'tz-tfng': string } }))}
                    type="textarea"
                    rows={4}
                    requiredLanguages={[]}
                    placeholder={t('events.create.descriptionPlaceholder')}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('events.create.eventType')} *</Label>
                    <Select
                      value={formData.idTypeEvenement}
                      onValueChange={(value) => { clearFieldError('type'); setFormData(prev => ({ ...prev, idTypeEvenement: value })); }}
                      required
                    >
                      <SelectTrigger aria-invalid={!!fieldErrors.type} aria-describedby={fieldErrors.type ? 'type-error' : undefined}>
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
                    {fieldErrors.type && <p id="type-error" role="alert" className="text-sm text-destructive">{fieldErrors.type}</p>}
                  </div>
                  
                  {!isVirtual && (
                    <div className="space-y-2">
                      <Label htmlFor="wilaya">{t('common.wilaya')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
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
                              {String(wilaya.codeW).padStart(2, '0')} - {i18n.language === 'ar' && wilaya.nom ? wilaya.nom : wilaya.wilaya_name_ascii}
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
                    <React.Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded" />}>
                      <LieuSelector
                        value={selectedLieuId}
                        onChange={(lieuId, lieu) => {
                          clearFieldError('lieu');
                          setSelectedLieuId(lieuId);
                          setSelectedLieu(lieu);
                        }}
                        wilayaId={selectedWilayaId}
                        required
                      />
                    </React.Suspense>
                    {selectedLieu && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedLieu.adresse}
                      </p>
                    )}
                    {fieldErrors.lieu && (
                      <p id="lieu-error" role="alert" className="text-sm text-destructive mt-1">{fieldErrors.lieu}</p>
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
                      autoComplete="url"
                      maxLength={2048}
                      value={formData.urlVirtuel}
                      onChange={(e) => { clearFieldError('urlVirtuel'); setFormData(prev => ({ ...prev, urlVirtuel: e.target.value })); }}
                      placeholder={t('events.create.virtualUrlPlaceholder', 'https://zoom.us/j/... ou https://meet.google.com/...')}
                      required={isVirtual}
                      aria-invalid={!!fieldErrors.urlVirtuel}
                      aria-describedby={fieldErrors.urlVirtuel ? 'urlVirtuel-error' : undefined}
                    />
                    {fieldErrors.urlVirtuel && <p id="urlVirtuel-error" role="alert" className="text-sm text-destructive">{fieldErrors.urlVirtuel}</p>}
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
                      onChange={(e) => { clearFieldError('dateDebut'); setFormData(prev => ({ ...prev, dateDebut: e.target.value })); }}
                      onBlur={() => validateFieldOnBlur('dateDebut')}
                      required
                      aria-invalid={!!fieldErrors.dateDebut}
                      aria-describedby={fieldErrors.dateDebut ? 'dateDebut-error' : undefined}
                    />
                    {fieldErrors.dateDebut && <p id="dateDebut-error" role="alert" className="text-sm text-destructive">{fieldErrors.dateDebut}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-fin">{t('events.create.endDate')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                    <Input
                      id="date-fin"
                      type="date"
                      value={formData.dateFin}
                      onChange={(e) => { clearFieldError('dateFin'); setFormData(prev => ({ ...prev, dateFin: e.target.value })); }}
                      onBlur={() => validateFieldOnBlur('dateFin')}
                      aria-invalid={!!fieldErrors.dateFin}
                      aria-describedby={fieldErrors.dateFin ? 'dateFin-error' : undefined}
                    />
                    {fieldErrors.dateFin && <p id="dateFin-error" role="alert" className="text-sm text-destructive">{fieldErrors.dateFin}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heure-debut">{t('events.create.startTime')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                    <Input
                      id="heure-debut"
                      type="time"
                      value={formData.heureDebut}
                      onChange={(e) => setFormData(prev => ({ ...prev, heureDebut: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heure-fin">{t('events.create.endTime')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
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
                  <Label htmlFor="max-participants">{t('events.create.maxParticipants')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <Input
                    id="max-participants"
                    type="number"
                    min="0"
                    max="100000"
                    value={formData.maxParticipants}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (Number(val) >= 0 && Number(val) <= 100000)) setFormData(prev => ({ ...prev, maxParticipants: val }));
                    }}
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
                    <Label htmlFor="tarif">{t('events.create.price')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                    <Input
                      id="tarif"
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.01"
                      value={formData.tarif}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (Number(val) >= 0 && Number(val) <= 1000000)) setFormData(prev => ({ ...prev, tarif: val }));
                      }}
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
                      isDragging ? 'border-primary bg-primary/10' : affichePreview ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
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
                        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`mb-2 ${isDragging ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {isDragging
                            ? t('common.dropImageHere', 'Déposez l\'image ici')
                            : t('common.dragOrClickImage', 'Glissez-déposez ou cliquez pour ajouter une image')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('common.imageFormats')} — {t('validation.maxFileSize', 'Max 5 Mo')}
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
                        if (file) handleImageFile(file);
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
                  {fieldErrors.affiche && <p id="affiche-error" role="alert" className="text-sm text-destructive mt-2">{fieldErrors.affiche}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medias-post">{t('events.create.postEventMedia')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t('events.create.postEventMediaDesc')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('events.create.addAfterEvent')}
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" disabled title={t('events.create.availableAfterCreation', 'Disponible après la création de l\'événement')}>
                      {t('common.chooseFiles')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message si organisation requise mais manquante */}
            {!isVirtual && !hasOrganisation && !loadingOrganisations && (
              <Alert variant="destructive" role="alert">
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
                disabled={isSubmitting}
              >
                <Save className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {isSubmitting ? t('common.saving', 'Saving...') : t('events.create.saveAsDraft')}
              </Button>
              <span
                title={!isVirtual && !hasOrganisation ? t('events.create.organisationRequiredMessage') : undefined}
              >
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || (!isVirtual && !hasOrganisation)}
                >
                  {isSubmitting
                    ? <Loader2 className={`h-4 w-4 animate-spin ${rtlClasses.marginEnd(2)}`} />
                    : <Calendar className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                  }
                  {isSubmitting ? t('common.publishing', 'Publication...') : t('events.create.publishEvent')}
                </Button>
              </span>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterEvenement;