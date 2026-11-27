/**
 * AjouterServicePro - Formulaire pour les professionnels
 * Permet d'ajouter un service commercial autour d'un lieu patrimonial
 */
import { messageErreurServeur, useDefilerVersErreur } from '@/utils/erreurServeur';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { avecEffacements } from '@/utils/effacementLangues';
import { useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/services/httpClient';
import { uploadService } from '@/services/upload.service';
import { FORMATS_IMAGE_ACCEPTES } from '@/utils/prepareImageForUpload';
import type { RequiredTranslatableValue } from '@/types/common/multilingual.types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  Loader2,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Camera
} from 'lucide-react';
import { LieuSelector } from '@/components/LieuSelector';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import MultiLangInput from '@/components/MultiLangInput';
import { useRTL } from '@/hooks/useRTL';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import FormPageHeader from '@/components/shared/FormPageHeader';
import ServiceMediasGestion from '@/components/services/ServiceMediasGestion';
import ServiceStatistiques from '@/components/services/ServiceStatistiques';
import ServiceDetailsChamps, { DETAILS_VIDES, type DetailsServiceForm } from '@/components/services/ServiceDetailsChamps';
import { aDuTexte } from '@/utils/getLocalizedText';
import { TYPES_SERVICE, styleTypeService, libelleTypeFormulaire } from '@/components/services/typesService';
import { emailValide, lienWebValide, nombreHorsLimites } from '@/utils/validationChamps';
import { SaisieConserveeAvis, useSaisieConservee } from '@/hooks/useSaisieConservee';
import { lienGuidePour } from '@/utils/lienGuide';

import BoutonRetirerApercu from '@/components/shared/BoutonRetirerApercu';
// Types de services : liste commune (components/services/typesService.ts), libellés du formulaire traduits
// (service.typesFormulaire.*). Avant : une 3e copie de la liste, libellés écrits ici en 5 langues.

// Ce que le professionnel doit indiquer comme tarif, selon le type (même unité qu'à l'affichage)
const AIDE_TARIF: Record<string, string> = {
  restaurant: 'Prix moyen d\'un repas, par personne. Il sera affiché « par personne ».',
  hotel: 'Prix d\'une nuit. Il sera affiché « par nuit ».',
  guide: 'Prix d\'une visite guidée. Il sera affiché « par visite ».',
  transport: 'Prix d\'un trajet. Il sera affiché « par trajet ».',
  location: 'Prix de la location pour une journée. Il sera affiché « par jour ».',
};

// Texte multilingue du formulaire : type commun (types/common/multilingual.types)
type MultiLangText = RequiredTranslatableValue;

/** Texte reçu (objet multilingue, ancien texte simple ou rien) mis en texte complet, une case par langue */
const toML = (v: unknown): MultiLangText => {
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    const langue = (code: string): string => {
      const texte = obj[code];
      return typeof texte === 'string' ? texte : '';
    };
    return { fr: langue('fr'), ar: langue('ar'), en: langue('en'), 'tz-ltn': langue('tz-ltn'), 'tz-tfng': langue('tz-tfng') };
  }
  return { fr: (typeof v === 'string' ? v : '') || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };
};

/** Champ texte reçu de l'API : chaîne vide s'il manque ou n'est pas du texte */
const texteRecu = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Nombre ou texte reçu (ex. DECIMAL de MySQL renvoyé en texte) remis en texte pour le champ */
const nombreEnTexte = (v: unknown): string => (typeof v === 'number' || typeof v === 'string' ? String(v) : '');

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
  // Lot 2 : équipements, langues, capacité, réservation
  equipements: string[];
  langues: string[];
  capacite: string;
  lien_reservation: string;
  whatsapp: string;
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
  ...DETAILS_VIDES,
};

const AjouterServicePro: React.FC = () => {
  const { t, i18n } = useTranslation();
  const textesCharges = useRef<Record<string, unknown>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const editId = id ? parseInt(id) : null;
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { direction } = useRTL();

  // Form state
  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Modification : service chargé (la saisie conservée ne doit être remise qu'après)
  const [serviceCharge, setServiceCharge] = useState(false);
  // Saisie remise après une session expirée : la photo choisie (fichier) est à rajouter
  const [photoARajouter, setPhotoARajouter] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refErreur = useDefilerVersErreur(error);
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
        const charge = {
          nom: toML(svc.nom),
          description: toML(svc.description),
          type_service: texteRecu(svc.type_service),
          id_lieu: typeof svc.id_lieu === 'number' && svc.id_lieu ? svc.id_lieu : null,
          latitude: nombreEnTexte(svc.latitude),
          longitude: nombreEnTexte(svc.longitude),
          adresse: toML(svc.adresse),
          telephone: texteRecu(svc.telephone),
          email: texteRecu(svc.email),
          site_web: texteRecu(svc.site_web),
          horaires: toML(svc.horaires),
          tarif_min: nombreEnTexte(svc.tarif_min),
          tarif_max: nombreEnTexte(svc.tarif_max),
          disponible: svc.disponible !== false,
          equipements: Array.isArray(svc.equipements) ? svc.equipements.map(String) : [],
          langues: Array.isArray(svc.langues) ? svc.langues.map(String) : [],
          capacite: svc.capacite ? String(svc.capacite) : '',
          lien_reservation: typeof svc.lien_reservation === 'string' ? svc.lien_reservation : '',
          whatsapp: typeof svc.whatsapp === 'string' ? svc.whatsapp : '',
        };
        setFormData(charge);
        // Textes chargés : une langue vidée ensuite est effacée à l’enregistrement (2026-11-27)
        textesCharges.current = charge;
        if (typeof svc.photo_url === 'string' && svc.photo_url) setPhotoPreview(svc.photo_url);
        setServiceCharge(true);
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

  // Session expirée pendant la saisie : formulaire conservé, remis au retour (audit V11 FRM-23).
  // Modification : clé connue une fois le service chargé ; le brouillon passe après et l'emporte.
  // Jamais la photo (fichier, aperçu) : seulement les champs saisis.
  const { restauree, oublier } = useSaisieConservee({
    cle: isEditMode ? (serviceCharge && editId ? `service:${editId}` : null) : 'service:nouveau',
    valeur: { formData, avaitPhoto: !!photoFile },
    restaurer: (v) => {
      setFormData({ ...INITIAL_FORM, ...v.formData });
      setPhotoARajouter(!!v.avaitPhoto);
      setIsDirty(true);
    },
    actif: isDirty,
  });

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
      // Formats refusés par le serveur (HEIC, BMP…) : message clair avant l'envoi
      if (!FORMATS_IMAGE_ACCEPTES.includes(file.type)) {
        toast({
          title: t('common.error', 'Erreur'),
          description: t('auth.errors.invalidFileType.description', 'Seuls les fichiers JPG, PNG, GIF et WEBP sont acceptés'),
          variant: 'destructive',
        });
        return;
      }
      setPhotoFile(file);
      setPhotoARajouter(false);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Une seule règle par champ, utilisée à la sortie du champ et à l'envoi (avant : écrite deux fois)
  const erreurDuChamp = (field: 'email' | 'telephone' | 'site_web' | 'tarif_min' | 'tarif_max'): string | undefined => {
    switch (field) {
      case 'email':
        return formData.email && !emailValide(formData.email) ? t('service.errors.emailInvalid', 'Adresse email invalide') : undefined;
      case 'telephone':
        return formData.telephone && !/^[0-9+\-\s()]{8,20}$/.test(formData.telephone) ? t('service.errors.phoneInvalid', 'Numéro de téléphone invalide') : undefined;
      case 'site_web':
        return formData.site_web && !lienWebValide(formData.site_web) ? t('service.errors.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)') : undefined;
      default:
        // Tarif négatif : contrôlé ici depuis noValidate (avant, seule la bulle du navigateur le faisait)
        return nombreHorsLimites(formData[field], { min: 0 }) ? t('service.errors.tarifInvalide', 'Le tarif doit être un nombre positif') : undefined;
    }
  };

  const validateFieldOnBlur = (field: string) => {
    let error: string | undefined;
    switch (field) {
      case 'email':
      case 'telephone':
      case 'site_web':
        error = erreurDuChamp(field);
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

  /** Erreurs des champs du lot 2 (équipements, capacité, réservation), à l'écran et à l'envoi */
  const erreursDetailsService = (): Partial<Record<'capacite' | 'lien_reservation' | 'whatsapp', string>> => {
    const e: Partial<Record<'capacite' | 'lien_reservation' | 'whatsapp', string>> = {};
    if (formData.capacite && !/^[1-9][0-9]{0,4}$|^100000$/.test(formData.capacite)) e.capacite = t('service.details.capaciteInvalide', 'Un nombre entier entre 1 et 100 000');
    if (formData.lien_reservation.trim() && !lienWebValide(formData.lien_reservation.trim())) e.lien_reservation = t('service.errors.urlInvalid', 'URL du site web invalide (doit commencer par http:// ou https://)');
    if (formData.whatsapp.trim() && !/^\+?[0-9\s().-]{8,20}$/.test(formData.whatsapp.trim())) e.whatsapp = t('service.details.whatsappInvalide', 'Numéro WhatsApp invalide');
    return e;
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

  // Valider le formulaire
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!aDuTexte(formData.nom)) {
      errs.nom = t('service.errors.nomRequired', 'Le nom du service est requis, dans au moins une langue');
    }
    if (!formData.type_service) {
      errs.type_service = t('service.errors.typeRequired', 'Le type de service est requis');
    }

    if (!formData.id_lieu) {
      errs.id_lieu = t('service.errors.lieuRequired', 'Veuillez choisir le lieu de votre service');
    }
    for (const champ of ['tarif_min', 'tarif_max', 'email', 'site_web', 'telephone'] as const) {
      const erreur = erreurDuChamp(champ);
      if (erreur) errs[champ] = erreur;
    }
    // Équipements, capacité, réservation : mêmes règles que l'affichage (avant : le formulaire partait quand même)
    const erreursDetails = erreursDetailsService();
    for (const [champ, erreur] of Object.entries(erreursDetails)) if (erreur) errs[champ] = erreur;
    if (!errs.tarif_min && !errs.tarif_max && formData.tarif_min && formData.tarif_max && parseFloat(formData.tarif_min) > parseFloat(formData.tarif_max)) {
      const tarifErr = t('service.errors.tarifMinMax', 'Le tarif minimum ne peut pas être supérieur au tarif maximum');
      errs.tarif_min = tarifErr;
      errs.tarif_max = tarifErr;
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
        nom: editId ? avecEffacements(formData.nom, textesCharges.current.nom) : formData.nom,
        description: editId ? avecEffacements(formData.description, textesCharges.current.description) : formData.description,
        type_service: formData.type_service,
        id_lieu: formData.id_lieu,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        adresse: editId ? avecEffacements(formData.adresse, textesCharges.current.adresse) : formData.adresse,
        telephone: formData.telephone,
        email: formData.email,
        site_web: formData.site_web,
        horaires: formData.horaires,
        tarif_min: formData.tarif_min ? parseFloat(formData.tarif_min) : null,
        tarif_max: formData.tarif_max ? parseFloat(formData.tarif_max) : null,
        disponible: formData.disponible,
        equipements: formData.equipements,
        langues: formData.langues,
        capacite: formData.capacite ? Number(formData.capacite) : null,
        lien_reservation: formData.lien_reservation.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
      };

      const data = isEditMode && editId
        ? await httpClient.put<{ id?: number }>(`/services/${editId}`, serviceData)
        : await httpClient.post<{ id?: number }>('/services', serviceData);

      if (data.success) {
        const serviceId = data.data?.id || editId;
        if (photoFile && serviceId) {
          // Le service est déjà enregistré : un échec ici ne doit pas inviter à recliquer et créer un doublon
          try {
            // Réduite avant l'envoi (une photo de téléphone était envoyée entière)
            const uploadRes = await uploadService.uploadImage(photoFile);
            if (!uploadRes.success || !uploadRes.data?.url) throw new Error(uploadRes.error);
            await httpClient.put<unknown>(`/services/${serviceId}`, { photo_url: uploadRes.data.url });
          } catch {
            toast({
              title: t('toasts.warning'),
              description: t('service.photoNonEnvoyee', "Service enregistré, mais la photo n'a pas pu être envoyée. Ajoutez-la en le modifiant."),
              variant: 'destructive',
            });
          }
        }

        setIsDirty(false);
        oublier();
        // Le tableau de bord affiche tout de suite le service (et son statut)
        queryClient.invalidateQueries({ queryKey: ['dashboard-pro-services'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-pro-stats'] });
        toast({
          title: isEditMode ? t('toasts.serviceStatusUpdated') : t('service.success.title', 'Service ajouté'),
          description: isEditMode ? t('toasts.actionSuccess') : t('service.success.description', 'Votre service a été soumis et sera validé par un administrateur.'),
        });

        navigate('/dashboard-pro');
      } else {
        // Raison du serveur, détail des champs compris (avant : repli en français dans l'interface arabe)
        throw new Error(messageErreurServeur(data, isEditMode ? t('toasts.updateError', 'Erreur lors de la mise à jour') : t('ajouterService.errors.createFailed', 'Erreur lors de la création du service')));
      }
    } catch (err: unknown) {
      console.error('Erreur création service:', err);
      setError(messageErreurServeur(err, t('service.errors.submitFailed', 'Erreur lors de la soumission')));
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
              {/* Après la connexion, retour à ce formulaire (audit V11 UX-29) */}
              <Button onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`)}>
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
            aide={lienGuidePour('service', i18n.language)}
          onBack={() => navigate(-1)}
          backLabel={t('common.back', 'Retour')}
          title={id ? t('service.editTitle', 'Modifier mon service') : t('service.addTitle', 'Ajouter mon service')}
          subtitle={t('service.addSubtitle', 'Proposez vos services aux visiteurs des sites patrimoniaux')}
        />

        {/* Error */}
        {error && (
          <Alert ref={refErreur} variant="destructive" className="mb-6" role="alert" aria-live="assertive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <p className="text-sm text-muted-foreground mb-4">{t('common.requiredFieldsLegend')}</p>
          {restauree && (
            <div className="mb-4 space-y-2">
              <SaisieConserveeAvis visible={restauree} />
              {photoARajouter && (
                <p className="text-sm text-muted-foreground">{t('ajouteroeuvre.brouillonFichiers', 'Votre session avait expiré. Ajoutez à nouveau les fichiers (images, sons) avant d’envoyer.')}</p>
              )}
            </div>
          )}
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
                  {TYPES_SERVICE.map((valeur) => {
                    const type = { value: valeur, icon: styleTypeService(valeur).icon };
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
                          {libelleTypeFormulaire(t, type.value)}
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
                  {/* Libellé dans le champ : relié à la zone de saisie (avant, libellé vide et id « undefined-fr ») */}
                  <MultiLangInput
                    name="nom"
                    label={t('service.name', 'Nom du service')}
                    required
                    value={formData.nom}
                    onChange={(value) => updateField('nom', toML(value))}
                    requiredLanguages={[]}
                    placeholder="Ex: Restaurant Le Casbah"
                    // Message et marque rouge sur la zone de la langue ouverte (aria-invalid passé ici était ignoré)
                    error={fieldErrors.nom}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  {/* « multiline » n'existait pas : la description tenait sur une seule ligne */}
                  <MultiLangInput
                    name="description"
                    label={`${t('service.description', 'Description')} (${t('common.optional')})`}
                    value={formData.description}
                    onChange={(value) => updateField('description', toML(value))}
                    placeholder={t('service.descriptionPlaceholder', 'Décrivez votre service...')}
                    type="textarea"
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
                          alt={t('auth.register.photoPreview', 'Aperçu de la photo')}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <BoutonRetirerApercu onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} />
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-emerald-400 transition-colors">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">{t('common.upload', 'Upload')}</span>
                        <input
                          type="file"
                          accept={FORMATS_IMAGE_ACCEPTES.join(',')}
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
                  <MultiLangInput
                    name="adresse"
                    label={`${t('service.address', 'Adresse')} (${t('common.optional')})`}
                    value={formData.adresse}
                    onChange={(value) => updateField('adresse', toML(value))}
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
                  <MultiLangInput
                    name="horaires"
                    label={`${t('service.hours', 'Horaires')} (${t('common.optional')})`}
                    value={formData.horaires}
                    onChange={(value) => updateField('horaires', toML(value))}
                    placeholder={t('service.hoursPlaceholder', 'Ex : tous les jours, 9 h – 18 h')}
                    requiredLanguages={[]}
                  />
                </div>

                {/* Ce que couvre le tarif, selon le type choisi (« par personne », « par nuit »…) */}
                {AIDE_TARIF[formData.type_service] && (
                  <p className="text-sm text-muted-foreground">
                    {t(`service.aideTarif.${formData.type_service}`, AIDE_TARIF[formData.type_service])}
                  </p>
                )}
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

            {/* Équipements, langues, capacité, bouton « Réserver » (lot 2) */}
            <ServiceDetailsChamps
              valeur={{ equipements: formData.equipements, langues: formData.langues, capacite: formData.capacite, lien_reservation: formData.lien_reservation, whatsapp: formData.whatsapp }}
              onChange={(v: DetailsServiceForm) => { setFormData(prev => ({ ...prev, ...v })); setIsDirty(true); }}
              typeService={formData.type_service}
              erreurs={erreursDetailsService()}
            />

            {/* Info validation */}
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {t('service.validationInfo', 'Votre service sera soumis à validation par un administrateur avant d\'être visible sur le site.')}
              </AlertDescription>
            </Alert>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => { oublier(); navigate(-1); }}>
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

        {/* Galerie et menus : rattachés à un service déjà enregistré */}
        <div className="mt-6">
          {isEditMode && editId ? (
            <div className="space-y-6">
              <ServiceStatistiques serviceId={editId} />
              <ServiceMediasGestion serviceId={editId} />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {t('service.medias.apresEnregistrement', 'Après l’enregistrement, vous pourrez ajouter jusqu’à 10 photos et votre menu (PDF ou photo) depuis « Modifier ».')}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterServicePro;
