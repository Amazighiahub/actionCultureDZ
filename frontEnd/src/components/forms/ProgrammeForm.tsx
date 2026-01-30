/**
 * ProgrammeForm - Formulaire pour ajouter/modifier un programme d'événement
 * Gère les événements sur plusieurs jours avec horaires, intervenants et options
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Textarea } from '@/components/UI/textarea';
import {
  Calendar, Clock, MapPin, Users, Plus, X, Save, Loader2, 
  ArrowLeft, Edit, Eye, User, Mic, Video, FileText, Play, Pause,
  Upload, Trash2, AlertCircle, CheckCircle
} from 'lucide-react';
import MultiLangInput from '@/components/MultiLangInput';
import FormField from './FormField';
import { cn } from '@/lib/utils';
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

// Types d'activités
const typesActivite = [
  { value: 'conference', label: 'Conférence', icon: Mic },
  { value: 'atelier', label: 'Atelier', icon: Users },
  { value: 'projection', label: 'Projection', icon: Video },
  { value: 'presentation', label: 'Présentation', icon: FileText },
  { value: 'spectacle', label: 'Spectacle', icon: Play },
  { value: 'exposition', label: 'Exposition', icon: Eye },
  { value: 'visite', label: 'Visite guidée', icon: MapPin },
  { value: 'concert', label: 'Concert', icon: Mic },
  { value: 'lecture', label: 'Lecture', icon: FileText },
  { value: 'debat', label: 'Débat', icon: Users },
  { value: 'formation', label: 'Formation', icon: Users },
  { value: 'ceremonie', label: 'Cérémonie', icon: Calendar },
  { value: 'pause', label: 'Pause', icon: Pause },
  { value: 'autre', label: 'Autre', icon: Play }
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

// Formater une date pour l'affichage
const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Niveaux requis
const niveaux = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
  { value: 'tous_niveaux', label: 'Tous niveaux' }
];

// Langues disponibles
const langues = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
  { value: 'tz', label: 'Tamazight' }
];

// Rôles d'intervenant
const rolesIntervenant = [
  { value: 'principal', label: 'Intervenant principal' },
  { value: 'co_intervenant', label: 'Co-intervenant' },
  { value: 'moderateur', label: 'Modérateur' },
  { value: 'animateur', label: 'Animateur' },
  { value: 'invite', label: 'Invité' }
];

const ProgrammeForm: React.FC<ProgrammeFormProps> = ({
  eventId,
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
  loading = false,
  error = null,
  success = false,
  lieux = [],
  users = [],
  eventDates
}) => {
  // Générer les dates disponibles basées sur les dates de l'événement
  const availableDates = eventDates 
    ? generateDateRange(eventDates.dateDebut, eventDates.dateFin)
    : [];
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProgrammeFormData>({
    titre: { fr: '', ar: '', en: '' },
    description: { fr: '', ar: '', en: '' },
    date_programme: '',
    heure_debut: '',
    heure_fin: '',
    duree_estimee: undefined,
    id_lieu: undefined,
    lieu_specifique: { fr: '', ar: '', en: '' },
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

  // Calculer la durée automatiquement
  useEffect(() => {
    if (formData.heure_debut && formData.heure_fin) {
      const debut = new Date(`2000-01-01T${formData.heure_debut}`);
      const fin = new Date(`2000-01-01T${formData.heure_fin}`);
      const duree = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60));
      if (duree > 0) {
        setFormData(prev => ({ ...prev, duree_estimee: duree }));
      }
    }
  }, [formData.heure_debut, formData.heure_fin]);

  const handleChange = (field: keyof ProgrammeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    // Titre requis
    if (!formData.titre.fr || !formData.titre.ar || !formData.titre.en) {
      newErrors.titre = 'Le titre est requis dans toutes les langues';
    }

    // Date et horaires requis
    if (!formData.date_programme) {
      newErrors.date_programme = 'La date est requise';
    }
    if (!formData.heure_debut) {
      newErrors.heure_debut = 'L\'heure de début est requise';
    }
    if (!formData.heure_fin) {
      newErrors.heure_fin = 'L\'heure de fin est requise';
    }

    // Validation des horaires
    if (formData.heure_debut && formData.heure_fin && formData.heure_debut >= formData.heure_fin) {
      newErrors.heure_fin = 'L\'heure de fin doit être après l\'heure de début';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700">
            {mode === 'create' ? 'Programme créé avec succès' : 'Programme mis à jour avec succès'}
          </span>
        </div>
      )}

      {/* Onglets */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Informations</TabsTrigger>
          <TabsTrigger value="schedule">Horaires</TabsTrigger>
          <TabsTrigger value="participants">Intervenants</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        {/* Onglet Informations de base */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de base</CardTitle>
              <CardDescription>
                Informations principales sur l'activité du programme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Titre multilingue */}
              <MultiLangInput
                name="titre"
                label="Titre de l'activité"
                value={formData.titre}
                onChange={(value) => handleMultiLangChange('titre', value)}
                required={true}
                disabled={isReadOnly}
                errors={errors}
              />

              {/* Description multilingue */}
              <MultiLangInput
                name="description"
                label="Description"
                value={formData.description}
                onChange={(value) => handleMultiLangChange('description', value)}
                type="textarea"
                rows={4}
                disabled={isReadOnly}
                errors={errors}
              />

              {/* Type d'activité */}
              <FormField label="Type d'activité" required={true} error={errors.type_activite}>
                <Select
                  value={formData.type_activite}
                  onValueChange={(value) => handleChange('type_activite', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesActivite.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Statut */}
              <FormField label="Statut" error={errors.statut}>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => handleChange('statut', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifie">Planifié</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="annule">Annulé</SelectItem>
                    <SelectItem value="reporte">Reporté</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {/* Ordre */}
              <FormField label="Ordre dans le programme" error={errors.ordre}>
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
              <CardTitle>Horaires et lieu</CardTitle>
              <CardDescription>
                Date, horaires et lieu de l'activité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date - Menu déroulant avec dates de l'événement */}
              <FormField label="Date de l'activité" required={true} error={errors.date_programme}>
                <Select
                  value={formData.date_programme}
                  onValueChange={(value) => handleChange('date_programme', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une date" />
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
                        Aucune date disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Heures - Menus déroulants avec plages prédéfinies */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Heure de début" required={true} error={errors.heure_debut}>
                  <Select
                    value={formData.heure_debut}
                    onValueChange={(value) => handleChange('heure_debut', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'heure" />
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

                <FormField label="Heure de fin" required={true} error={errors.heure_fin}>
                  <Select
                    value={formData.heure_fin}
                    onValueChange={(value) => handleChange('heure_fin', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'heure" />
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
              <FormField label="Lieu" error={errors.id_lieu}>
                <Select
                  value={formData.id_lieu?.toString()}
                  onValueChange={(value) => handleChange('id_lieu', value ? parseInt(value) : undefined)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lieu" />
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
              <CardTitle>Intervenants</CardTitle>
              <CardDescription>
                Gestion des intervenants de l'activité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Intervenants */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Intervenants</Label>
                  {!isReadOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={addIntervenant}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un intervenant
                    </Button>
                  )}
                </div>

                {formData.intervenants.map((intervenant, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Intervenant #{index + 1}</h4>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Utilisateur">
                          <Select
                            value={intervenant.id_user?.toString()}
                            onValueChange={(value) => updateIntervenant(index, 'id_user', parseInt(value))}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un utilisateur" />
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

                        <FormField label="Rôle">
                          <Select
                            value={intervenant.role_intervenant}
                            onValueChange={(value) => updateIntervenant(index, 'role_intervenant', value)}
                            disabled={isReadOnly}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              {rolesIntervenant.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>

                      <FormField label="Sujet d'intervention">
                        <Input
                          value={intervenant.sujet_intervention || ''}
                          onChange={(e) => updateIntervenant(index, 'sujet_intervention', e.target.value)}
                          disabled={isReadOnly}
                          placeholder="Sujet de l'intervention"
                        />
                      </FormField>

                      <FormField label="Biographie courte">
                        <Textarea
                          value={intervenant.biographie_courte || ''}
                          onChange={(e) => updateIntervenant(index, 'biographie_courte', e.target.value)}
                          disabled={isReadOnly}
                          rows={3}
                          placeholder="Brève biographie"
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
              <CardTitle>Options et matériel</CardTitle>
              <CardDescription>
                Options supplémentaires et matériel requis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Langue principale */}
              <FormField label="Langue principale">
                <Select
                  value={formData.langue_principale}
                  onValueChange={(value) => handleChange('langue_principale', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une langue" />
                  </SelectTrigger>
                  <SelectContent>
                    {langues.map((langue) => (
                      <SelectItem key={langue.value} value={langue.value}>
                        {langue.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Options</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="traduction"
                      checked={formData.traduction_disponible}
                      onCheckedChange={(checked) => handleChange('traduction_disponible', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="traduction">Traduction disponible</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enregistrement"
                      checked={formData.enregistrement_autorise}
                      onCheckedChange={(checked) => handleChange('enregistrement_autorise', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="enregistrement">Enregistrement autorisé</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="diffusion"
                      checked={formData.diffusion_live}
                      onCheckedChange={(checked) => handleChange('diffusion_live', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="diffusion">Diffusion en direct</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="support"
                      checked={formData.support_numerique}
                      onCheckedChange={(checked) => handleChange('support_numerique', checked)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="support">Support numérique</Label>
                  </div>
                </div>
              </div>

              {/* Matériel requis */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Matériel requis</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMateriel}
                    onChange={(e) => setNewMateriel(e.target.value)}
                    placeholder="Ajouter un matériel"
                    disabled={isReadOnly}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMateriel())}
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
              <FormField label="Notes organisateur">
                <Textarea
                  value={formData.notes_organisateur || ''}
                  onChange={(e) => handleChange('notes_organisateur', e.target.value)}
                  disabled={isReadOnly}
                  rows={4}
                  placeholder="Notes internes pour l'organisateur"
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
            Annuler
          </Button>
        )}
        {!isReadOnly && (
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Créer' : 'Mettre à jour'}
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
};

export default ProgrammeForm;
