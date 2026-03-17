/**
 * ProgrammeForm - Formulaire pour ajouter/modifier un programme d'événement
 * Gère les événements sur plusieurs jours avec horaires, intervenants et options
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar, Clock, MapPin, Users, Plus, X, Save, Loader2, 
  ArrowLeft, Edit, Eye, User, Mic, Video, FileText, Play, Pause,
  Upload, Trash2, AlertCircle, CheckCircle
} from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import FormField from './FormField';
import { cn } from '@/lib/Utils';
import { useFormatDate } from '@/hooks/useFormatDate';
import { programmeService, CreateProgrammeData, IntervenantData } from '@/services/programme.service';

export interface ProgrammeFormData {
  // Informations de base
  titre: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  description: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  
  // Date et horaires
  date_programme: string;
  heure_debut: string;
  heure_fin: string;
  duree_estimee?: number;
  
  // Lieu
  id_lieu?: number;
  lieu_specifique?: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  
  // Type et statut
  type_activite: 'conference' | 'atelier' | 'projection' | 'presentation' | 'pause' | 'autre';
  statut: 'planifie' | 'en_cours' | 'termine' | 'annule' | 'reporte';
  ordre: number;
  
  // Participants
  nb_participants_max?: number;
  niveau_requis?: 'debutant' | 'intermediaire' | 'avance' | 'tous_niveaux';
  
  // Matériel et options
  materiel_requis: string[];
  langue_principale: string;
  traduction_disponible: boolean;
  enregistrement_autorise: boolean;
  diffusion_live: boolean;
  support_numerique: boolean;
  
  // Notes
  notes_organisateur?: string;
  
  // Intervenants
  intervenants: IntervenantData[];
}

interface ProgrammeFormProps {
  eventId: number;
  initialData?: Partial<ProgrammeFormData>;
  onSubmit: (data: ProgrammeFormData) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  lieux?: any[];
  users?: any[];
  eventDates?: { dateDebut: string; dateFin: string };
}

// Icônes par type d'activité
const activityIcons: Record<string, React.ElementType> = {
  conference: Mic,
  atelier: Users,
  projection: Video,
  presentation: FileText,
  pause: Pause,
  autre: Play
};

// Types d'activités - les labels sont traduits via t() dans le composant
const typesActivite = [
  { value: 'conference', icon: Mic },
  { value: 'atelier', icon: Users },
  { value: 'projection', icon: Video },
  { value: 'presentation', icon: FileText },
  { value: 'spectacle', icon: Play },
  { value: 'exposition', icon: Eye },
  { value: 'visite', icon: MapPin },
  { value: 'concert', icon: Mic },
  { value: 'lecture', icon: FileText },
  { value: 'debat', icon: Users },
  { value: 'formation', icon: Users },
  { value: 'ceremonie', icon: Calendar },
  { value: 'pause', icon: Pause },
  { value: 'autre', icon: Play }
];

// Plages horaires prédéfinies
const plagesHoraires = [
  { value: '08:00', label: '08:00' },
  { value: '08:30', label: '08:30' },
  { value: '09:00', label: '09:00' },
  { value: '09:30', label: '09:30' },
  { value: '10:00', label: '10:00' },
  { value: '10:30', label: '10:30' },
  { value: '11:00', label: '11:00' },
  { value: '11:30', label: '11:30' },
  { value: '12:00', label: '12:00' },
  { value: '12:30', label: '12:30' },
  { value: '13:00', label: '13:00' },
  { value: '13:30', label: '13:30' },
  { value: '14:00', label: '14:00' },
  { value: '14:30', label: '14:30' },
  { value: '15:00', label: '15:00' },
  { value: '15:30', label: '15:30' },
  { value: '16:00', label: '16:00' },
  { value: '16:30', label: '16:30' },
  { value: '17:00', label: '17:00' },
  { value: '17:30', label: '17:30' },
  { value: '18:00', label: '18:00' },
  { value: '18:30', label: '18:30' },
  { value: '19:00', label: '19:00' },
  { value: '19:30', label: '19:30' },
  { value: '20:00', label: '20:00' },
  { value: '20:30', label: '20:30' },
  { value: '21:00', label: '21:00' },
  { value: '21:30', label: '21:30' },
  { value: '22:00', label: '22:00' }
];

// Fonction pour générer les dates entre deux dates
const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

// Niveaux requis - labels traduits via t()
const niveauxKeys = ['debutant', 'intermediaire', 'avance', 'tous_niveaux'] as const;

// Langues disponibles - labels traduits via t()
const languesCodes = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'] as const;

// Rôles d'intervenant - labels traduits via t()
const rolesIntervenantKeys = ['principal', 'co_intervenant', 'moderateur', 'animateur', 'invite'] as const;

// Constants to avoid creating new array references on every render
const EMPTY_LIEUX_ARRAY: any[] = [];
const EMPTY_USERS_ARRAY: any[] = [];

const ProgrammeForm: React.FC<ProgrammeFormProps> = ({
  eventId,
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
  loading = false,
  error = null,
  success = false,
  lieux = EMPTY_LIEUX_ARRAY,
  users = EMPTY_USERS_ARRAY,
  eventDates
}) => {
  // Générer les dates disponibles basées sur les dates de l'événement
  const availableDates = eventDates
    ? generateDateRange(eventDates.dateDebut, eventDates.dateFin)
    : [];
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();

  // Formater une date pour l'affichage
  const formatDateLabel = (dateStr: string): string => {
    return formatDate(new Date(dateStr), { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const [formData, setFormData] = useState<ProgrammeFormData>({
    titre: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    date_programme: '',
    heure_debut: '',
    heure_fin: '',
    duree_estimee: undefined,
    id_lieu: undefined,
    lieu_specifique: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
    type_activite: 'conference',
    statut: 'planifie',
    ordre: 1,
    nb_participants_max: undefined,
    niveau_requis: 'tous_niveaux',
    materiel_requis: [],
    langue_principale: 'fr',
    traduction_disponible: false,
    enregistrement_autorise: false,
    diffusion_live: false,
    support_numerique: false,
    notes_organisateur: '',
    intervenants: []
  });

  const [newMateriel, setNewMateriel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialiser avec les données existantes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field: keyof ProgrammeFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };

    // Calculer la durée automatiquement si heure_debut ou heure_fin change
    if (field === 'heure_debut' || field === 'heure_fin') {
      const heureDebut = field === 'heure_debut' ? value : formData.heure_debut;
      const heureFin = field === 'heure_fin' ? value : formData.heure_fin;

      if (heureDebut && heureFin) {
        const debut = new Date(`2000-01-01T${heureDebut}`);
        const fin = new Date(`2000-01-01T${heureFin}`);
        const duree = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60));
        if (duree > 0) {
          newFormData.duree_estimee = duree;
        }
      }
    }

    setFormData(newFormData);

    // Effacer l'erreur si elle existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMultiLangChange = (field: 'titre' | 'description' | 'lieu_specifique', value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addMateriel = () => {
    if (newMateriel.trim() && !formData.materiel_requis.includes(newMateriel.trim())) {
      setFormData(prev => ({
        ...prev,
        materiel_requis: [...prev.materiel_requis, newMateriel.trim()]
      }));
      setNewMateriel('');
    }
  };

  const removeMateriel = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materiel_requis: prev.materiel_requis.filter((_, i) => i !== index)
    }));
  };

  const addIntervenant = () => {
    const newIntervenant: IntervenantData = {
      id_user: 0,
      role_intervenant: 'principal',
      sujet_intervention: '',
      biographie_courte: '',
      ordre_intervention: formData.intervenants.length + 1,
      duree_intervention: undefined,
      honoraires: undefined,
      frais_deplacement: undefined
    };
    setFormData(prev => ({
      ...prev,
      intervenants: [...prev.intervenants, newIntervenant]
    }));
  };

  const updateIntervenant = (index: number, field: keyof IntervenantData, value: any) => {
    setFormData(prev => ({
      ...prev,
      intervenants: prev.intervenants.map((intervenant, i) =>
        i === index ? { ...intervenant, [field]: value } : intervenant
      )
    }));
  };

  const removeIntervenant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      intervenants: prev.intervenants.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Titre requis — aligné sur le backend (fr OU ar)
    if (!formData.titre.fr?.trim() && !formData.titre.ar?.trim()) {
      newErrors.titre = t('programme.form.errors.titleRequired', 'Le titre est requis (au moins en français ou arabe)');
    }

    // Date et horaires requis
    if (!formData.date_programme) {
      newErrors.date_programme = t('programme.form.errors.dateRequired');
    }
    if (!formData.heure_debut) {
      newErrors.heure_debut = t('programme.form.errors.startTimeRequired');
    }
    if (!formData.heure_fin) {
      newErrors.heure_fin = t('programme.form.errors.endTimeRequired');
    }

    // Validation des horaires
    if (formData.heure_debut && formData.heure_fin && formData.heure_debut >= formData.heure_fin) {
      newErrors.heure_fin = t('programme.form.errors.endTimeAfterStart');
    }

    // Validation des intervenants — chaque intervenant doit avoir un vrai user sélectionné
    if (formData.intervenants.length > 0) {
      const invalidIntervenant = formData.intervenants.some(i => !i.id_user || i.id_user <= 0);
      if (invalidIntervenant) {
        newErrors.intervenants = t('programme.form.errors.intervenantUserRequired', 'Chaque intervenant doit avoir un utilisateur sélectionné');
      }
    }

    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    if (hasErrors) {
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
    }
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Messages d'erreur et succès */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">
            {mode === 'create' ? t('programme.form.success.created') : t('programme.form.success.updated')}
          </span>
        </div>
      )}

      {/* Onglets */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">{t('programme.form.tabs.basic')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('programme.form.tabs.schedule')}</TabsTrigger>
          <TabsTrigger value="participants">{t('programme.form.tabs.participants')}</TabsTrigger>
          <TabsTrigger value="options">{t('programme.form.tabs.options')}</TabsTrigger>
        </TabsList>

        {/* Onglet Informations de base */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('programme.form.basicInfo.title')}</CardTitle>
              <CardDescription>
                {t('programme.form.basicInfo.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Titre multilingue */}
              <MultiLangInput
                name="titre"
                label={t('programme.form.activityTitle')}
                value={formData.titre}
                onChange={(value) => handleMultiLangChange('titre', value)}
                required={true}
                requiredLanguages={['fr']}
                disabled={isReadOnly}
                errors={errors}
              />

              {/* Description multilingue */}
              <MultiLangInput
                name="description"
                label={t('programme.form.description')}
                value={formData.description}
                onChange={(value) => handleMultiLangChange('description', value)}
                type="textarea"
                rows={4}
                disabled={isReadOnly}
                errors={errors}
              />

              {/* Type d'activité */}
              <FormField label={t('programme.form.activityType')} required={true} error={errors.type_activite}>
                <Select
                  value={formData.type_activite}
                  onValueChange={(value) => handleChange('type_activite', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('programme.form.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {typesActivite.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {t(`programme.form.types.${type.value}`)}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Statut */}
              <FormField label={t('programme.form.status')} error={errors.statut}>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => handleChange('statut', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('programme.form.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(['planifie', 'en_cours', 'termine', 'annule', 'reporte'] as const).map((statusKey) => (
                      <SelectItem key={statusKey} value={statusKey}>
                        {t(`programme.form.statuses.${statusKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Ordre */}
              <FormField label={t('programme.form.order')} error={errors.ordre}>
                <Input
                  type="number"
                  min="1"
                  value={formData.ordre}
                  onChange={(e) => handleChange('ordre', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </FormField>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Horaires et Lieu */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('programme.form.schedule.title')}</CardTitle>
              <CardDescription>
                {t('programme.form.schedule.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date - Menu déroulant avec dates de l'événement */}
              <FormField label={t('programme.form.schedule.activityDate')} required={true} error={errors.date_programme}>
                <Select
                  value={formData.date_programme}
                  onValueChange={(value) => handleChange('date_programme', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('programme.form.schedule.selectDate')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.length > 0 ? (
                      availableDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {formatDateLabel(date)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        {t('programme.form.schedule.noDateAvailable')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Heures - Menus déroulants avec plages prédéfinies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label={t('programme.form.schedule.startTime')} required={true} error={errors.heure_debut}>
                  <Select
                    value={formData.heure_debut}
                    onValueChange={(value) => handleChange('heure_debut', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('programme.form.schedule.selectTime')} />
                    </SelectTrigger>
                    <SelectContent>
                      {plagesHoraires.map((plage) => (
                        <SelectItem key={plage.value} value={plage.value}>
                          {plage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label={t('programme.form.schedule.endTime')} required={true} error={errors.heure_fin}>
                  <Select
                    value={formData.heure_fin}
                    onValueChange={(value) => handleChange('heure_fin', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('programme.form.schedule.selectTime')} />
                    </SelectTrigger>
                    <SelectContent>
                      {plagesHoraires.map((plage) => (
                        <SelectItem key={plage.value} value={plage.value}>
                          {plage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {/* Lieu */}
              <FormField label={t('programme.form.schedule.place')} error={errors.id_lieu}>
                <Select
                  value={formData.id_lieu?.toString()}
                  onValueChange={(value) => handleChange('id_lieu', value ? parseInt(value) : undefined)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('programme.form.schedule.selectPlace')} />
                  </SelectTrigger>
                  <SelectContent>
                    {lieux.map((lieu) => (
                      <SelectItem key={lieu.id_lieu} value={lieu.id_lieu.toString()}>
                        {lieu.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Intervenants */}
        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('programme.form.participants.title')}</CardTitle>
              <CardDescription>
                {t('programme.form.participants.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Intervenants */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t('programme.form.participants.label')}</Label>
                  {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={addIntervenant}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('programme.form.participants.addIntervenant')}
                    </Button>
                  )}
                </div>

                {formData.intervenants.map((intervenant, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{t('programme.form.participants.intervenantNum', { num: index + 1 })}</h4>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIntervenant(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={t('programme.form.participants.user')}>
                          <Select
                            value={intervenant.id_user?.toString()}
                            onValueChange={(value) => updateIntervenant(index, 'id_user', parseInt(value))}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('programme.form.participants.selectUser')} />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id_user} value={user.id_user.toString()}>
                                  {user.prenom} {user.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label={t('programme.form.participants.role')}>
                          <Select
                            value={intervenant.role_intervenant}
                            onValueChange={(value) => updateIntervenant(index, 'role_intervenant', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('programme.form.participants.selectRole')} />
                            </SelectTrigger>
                            <SelectContent>
                              {rolesIntervenantKeys.map((roleKey) => (
                                <SelectItem key={roleKey} value={roleKey}>
                                  {t(`programme.form.participants.roles.${roleKey}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>

                      <FormField label={t('programme.form.participants.interventionSubject')}>
                        <Input
                          value={intervenant.sujet_intervention || ''}
                          onChange={(e) => updateIntervenant(index, 'sujet_intervention', e.target.value)}
                          disabled={isReadOnly}
                          placeholder={t('programme.form.participants.subjectPlaceholder')}
                        />
                      </FormField>

                      <FormField label={t('programme.form.participants.shortBiography')}>
                        <Textarea
                          value={intervenant.biographie_courte || ''}
                          onChange={(e) => updateIntervenant(index, 'biographie_courte', e.target.value)}
                          disabled={isReadOnly}
                          rows={3}
                          placeholder={t('programme.form.participants.biographyPlaceholder')}
                        />
                      </FormField>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Options */}
        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('programme.form.options.title')}</CardTitle>
              <CardDescription>
                {t('programme.form.options.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Langue principale */}
              <FormField label={t('programme.form.options.mainLanguage')}>
                <Select
                  value={formData.langue_principale}
                  onValueChange={(value) => handleChange('langue_principale', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('programme.form.options.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languesCodes.map((langCode) => (
                      <SelectItem key={langCode} value={langCode}>
                        {t(`programme.form.languages.${langCode}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-base font-medium">{t('programme.form.options.optionsLabel')}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="traduction"
                      checked={formData.traduction_disponible}
                      onCheckedChange={(checked) => handleChange('traduction_disponible', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="traduction">{t('programme.form.options.translationAvailable')}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enregistrement"
                      checked={formData.enregistrement_autorise}
                      onCheckedChange={(checked) => handleChange('enregistrement_autorise', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="enregistrement">{t('programme.form.options.recordingAllowed')}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="diffusion"
                      checked={formData.diffusion_live}
                      onCheckedChange={(checked) => handleChange('diffusion_live', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="diffusion">{t('programme.form.options.liveBroadcast')}</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="support"
                      checked={formData.support_numerique}
                      onCheckedChange={(checked) => handleChange('support_numerique', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="support">{t('programme.form.options.digitalSupport')}</Label>
                  </div>
                </div>
              </div>

              {/* Matériel requis */}
              <div className="space-y-3">
                <Label className="text-base font-medium">{t('programme.form.options.requiredMaterial')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMateriel}
                    onChange={(e) => setNewMateriel(e.target.value)}
                    placeholder={t('programme.form.options.addMaterial')}
                    disabled={isReadOnly}
                    maxLength={200}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMateriel())}
                  />
                  <Button type="button" variant="outline" onClick={addMateriel} disabled={isReadOnly}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.materiel_requis.map((materiel, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {materiel}
                      {!isReadOnly && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeMateriel(index)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes organisateur */}
              <FormField label={t('programme.form.options.organizerNotes')}>
                <Textarea
                  value={formData.notes_organisateur || ''}
                  onChange={(e) => handleChange('notes_organisateur', e.target.value)}
                  disabled={isReadOnly}
                  rows={4}
                  placeholder={t('programme.form.options.organizerNotesPlaceholder')}
                />
              </FormField>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('programme.form.actions.cancel')}
          </Button>
        )}
        {!isReadOnly && (
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('programme.form.actions.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? t('programme.form.actions.create') : t('programme.form.actions.update')}
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
};

export default ProgrammeForm;
