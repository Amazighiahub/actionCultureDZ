/**
 * GestionEvenement - Composant de gestion d'événement pour les professionnels
 * Permet de gérer les programmes et les œuvres d'un événement
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTranslateData } from '@/hooks/useTranslateData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Skeleton } from '@/components/UI/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/UI/dialog';
import {
  Plus,
  Trash2,
  Edit,
  Clock,
  Users,
  Calendar,
  BookOpen,
  ArrowUp,
  ArrowDown,
  UserCheck
} from 'lucide-react';
import ParticipantsManager from './ParticipantsManager';
import { useToast } from '@/components/UI/use-toast';
import { programmeService, type Programme } from '@/services/programme.service';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { evenementOeuvreService, type EvenementOeuvre, type MesOeuvresResponse } from '@/services/evenement-oeuvre.service';
import type { Oeuvre } from '@/types/models/oeuvre.types';

interface GestionEvenementProps {
  evenementId: number;
  evenementNom: string;
  onClose?: () => void;
  /** Si true, masque l'onglet des œuvres (pour événements sans œuvres comme concours, lectures, etc.) */
  hideOeuvres?: boolean;
}

// Types d'activités pour les programmes
const TYPES_ACTIVITE = [
  { value: 'conference', label: 'Conférence' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'spectacle', label: 'Spectacle' },
  { value: 'exposition', label: 'Exposition' },
  { value: 'visite', label: 'Visite guidée' },
  { value: 'projection', label: 'Projection' },
  { value: 'concert', label: 'Concert' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'debat', label: 'Débat' },
  { value: 'formation', label: 'Formation' },
  { value: 'ceremonie', label: 'Cérémonie' },
  { value: 'autre', label: 'Autre' }
];

const GestionEvenement: React.FC<GestionEvenementProps> = ({
  evenementId,
  evenementNom,
  onClose,
  hideOeuvres = false
}) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { toast } = useToast();

  // État pour activer/désactiver la gestion des œuvres
  const [showOeuvresSection, setShowOeuvresSection] = useState(!hideOeuvres);

  // États pour les programmes
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loadingProgrammes, setLoadingProgrammes] = useState(true);
  const [showProgrammeDialog, setShowProgrammeDialog] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);

  // États pour les œuvres
  const [oeuvresData, setOeuvresData] = useState<MesOeuvresResponse | null>(null);
  const [loadingOeuvres, setLoadingOeuvres] = useState(true);
  const [showOeuvreDialog, setShowOeuvreDialog] = useState(false);
  const [selectedOeuvre, setSelectedOeuvre] = useState<Oeuvre | null>(null);
  const [oeuvreDescription, setOeuvreDescription] = useState('');
  const [oeuvresDuree, setOeuvresDuree] = useState<number | undefined>();

  // Helper pour formater les heures (gère TIME et datetime ISO)
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    // Si c'est déjà au format HH:MM ou HH:MM:SS
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      return time.substring(0, 5);
    }
    // Si c'est une date ISO complète
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return '--:--';
  };

  // Chargement des données
  useEffect(() => {
    loadProgrammes();
    if (showOeuvresSection) {
      loadOeuvres();
    }
  }, [evenementId, showOeuvresSection]);

  const loadProgrammes = async () => {
    setLoadingProgrammes(true);
    try {
      const response = await programmeService.getByEvent(evenementId);
      if (response.success && response.data) {
        setProgrammes(response.data.programmes || []);
      }
    } catch (error) {
      console.error('Erreur chargement programmes:', error);
      toast({
        title: t('common.error'),
        description: t('programme.loadError', 'Erreur lors du chargement des programmes'),
        variant: 'destructive'
      });
    } finally {
      setLoadingProgrammes(false);
    }
  };

  const loadOeuvres = async () => {
    setLoadingOeuvres(true);
    try {
      const response = await evenementOeuvreService.getMesOeuvres(evenementId);
      if (response.success && response.data) {
        setOeuvresData(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement œuvres:', error);
      toast({
        title: t('common.error'),
        description: t('oeuvres.loadError', 'Erreur lors du chargement des œuvres'),
        variant: 'destructive'
      });
    } finally {
      setLoadingOeuvres(false);
    }
  };

  // Handlers pour les programmes
  const handleSaveProgramme = async (data: ProgrammeFormData) => {
    try {
      // Transformer les données pour l'API (conforme à la base de données)
      const apiData = {
        titre: data.titre.fr, // Base attend: string, on prend le français
        description: data.description.fr, // Base attend: string?, on prend le français
        type_activite: data.type_activite, // Conforme
        heure_debut: `${data.date_programme}T${data.heure_debut}:00`, // Format ISO pour la base
        heure_fin: `${data.date_programme}T${data.heure_fin}:00`, // Format ISO pour la base
        id_lieu: data.id_lieu, // Conforme
        lieu_specifique: data.lieu_specifique?.fr, // Base attend: string?, on prend le français
        nb_participants_max: data.nb_participants_max, // Conforme
        niveau_requis: data.niveau_requis, // Conforme
        materiel_requis: data.materiel_requis, // Conforme
        notes_organisateur: data.notes_organisateur, // Conforme
        traduction_disponible: data.traduction_disponible, // Conforme
        enregistrement_autorise: data.enregistrement_autorise, // Conforme
        diffusion_live: data.diffusion_live, // Conforme
        support_numerique: data.support_numerique, // Conforme
        langue_principale: data.langue_principale, // Conforme
        ordre: data.ordre, // Conforme
        intervenants: data.intervenants // Conforme
      };

      if (editingProgramme) {
        const response = await programmeService.update(editingProgramme.id_programme, apiData);
        if (response.success) {
          toast({ title: t('common.success'), description: t('programme.updated', 'Programme mis à jour') });
          loadProgrammes();
        }
      } else {
        const response = await programmeService.create(evenementId, apiData);
        if (response.success) {
          toast({ title: t('common.success'), description: t('programme.created', 'Programme créé') });
          loadProgrammes();
        }
      }
      setShowProgrammeDialog(false);
      setEditingProgramme(null);
    } catch (error) {
      console.error('Erreur sauvegarde programme:', error);
      toast({ title: t('common.error'), description: t('programme.saveError', 'Erreur lors de la sauvegarde'), variant: 'destructive' });
    }
  };

  const handleDeleteProgramme = async (programmeId: number) => {
    if (window.confirm(t('programme.confirmDelete', 'Êtes-vous sûr de vouloir supprimer ce programme ?'))) {
      try {
        const response = await programmeService.delete(programmeId);
        if (response.success) {
          toast({ title: t('common.success'), description: t('programme.deleted', 'Programme supprimé') });
          loadProgrammes();
        }
      } catch (error) {
        console.error('Erreur suppression programme:', error);
        toast({ title: t('common.error'), description: t('programme.deleteError', 'Erreur lors de la suppression'), variant: 'destructive' });
      }
    }
  };

  const handleEditProgramme = (programme: Programme) => {
    setEditingProgramme(programme);
    setShowProgrammeDialog(true);
  };

  const handleCancelProgramme = () => {
    setShowProgrammeDialog(false);
    setEditingProgramme(null);
  };

  // Handlers pour les œuvres
  const handleAddOeuvre = async () => {
    if (!selectedOeuvre) return;

    try {
      const response = await evenementOeuvreService.addOeuvre(evenementId, {
        id_oeuvre: selectedOeuvre.id_oeuvre,
        description_presentation: oeuvreDescription || undefined,
        duree_presentation: oeuvresDuree
      });

      if (response.success) {
        toast({ title: t('common.success'), description: t('oeuvres.addedToEvent', 'Œuvre ajoutée à l\'événement') });
        loadOeuvres();
        setShowOeuvreDialog(false);
        setSelectedOeuvre(null);
        setOeuvreDescription('');
        setOeuvresDuree(undefined);
      }
    } catch (error) {
      console.error('Erreur ajout œuvre:', error);
      toast({ title: t('common.error'), description: t('oeuvres.addError', 'Erreur lors de l\'ajout'), variant: 'destructive' });
    }
  };

  const handleRemoveOeuvre = async (oeuvreId: number) => {
    if (!confirm(t('oeuvres.confirmRemove', 'Voulez-vous vraiment retirer cette œuvre de l\'événement ?'))) return;

    try {
      const response = await evenementOeuvreService.removeOeuvre(evenementId, oeuvreId);
      if (response.success) {
        toast({ title: t('common.success'), description: t('oeuvres.removedFromEvent', 'Œuvre retirée de l\'événement') });
        loadOeuvres();
      }
    } catch (error) {
      console.error('Erreur suppression œuvre:', error);
      toast({ title: t('common.error'), description: t('oeuvres.removeError', 'Erreur lors de la suppression'), variant: 'destructive' });
    }
  };

  const moveOeuvre = async (index: number, direction: 'up' | 'down') => {
    if (!oeuvresData?.oeuvres_ajoutees) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= oeuvresData.oeuvres_ajoutees.length) return;

    const newOeuvres = [...oeuvresData.oeuvres_ajoutees];
    [newOeuvres[index], newOeuvres[newIndex]] = [newOeuvres[newIndex], newOeuvres[index]];

    try {
      await evenementOeuvreService.reorderOeuvres(
        evenementId,
        newOeuvres.map((o, i) => ({ id_oeuvre: o.id_oeuvre, ordre: i + 1 }))
      );
      loadOeuvres();
    } catch (error) {
      console.error('Erreur réorganisation:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('gestion.title', 'Gestion de l\'événement')}</h2>
          <p className="text-muted-foreground">{evenementNom}</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            {t('common.close', 'Fermer')}
          </Button>
        )}
      </div>

      <Tabs defaultValue="programmes">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="programmes">
              <Calendar className="h-4 w-4 mr-2" />
              {t('gestion.programmes', 'Programmes')}
            </TabsTrigger>
            <TabsTrigger value="participants">
              <UserCheck className="h-4 w-4 mr-2" />
              {t('gestion.participants', 'Participants')}
            </TabsTrigger>
            {showOeuvresSection && (
              <TabsTrigger value="oeuvres">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('gestion.oeuvres', 'Œuvres')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Toggle pour activer/désactiver la section œuvres */}
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="toggle-oeuvres" className="text-muted-foreground cursor-pointer">
              {t('gestion.showOeuvres', 'Présenter des œuvres')}
            </label>
            <input
              id="toggle-oeuvres"
              type="checkbox"
              checked={showOeuvresSection}
              onChange={(e) => setShowOeuvresSection(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Onglet Programmes */}
        <TabsContent value="programmes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {t('programme.list', 'Liste des programmes')} ({programmes.length})
            </h3>
            <Dialog open={showProgrammeDialog} onOpenChange={setShowProgrammeDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProgramme(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('programme.add', 'Ajouter un programme')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProgramme
                      ? t('programme.edit', 'Modifier le programme')
                      : t('programme.create', 'Créer un programme')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('programme.formDesc', 'Remplissez les informations du programme')}
                  </DialogDescription>
                </DialogHeader>

                <ProgrammeForm
                  eventId={evenementId}
                  initialData={editingProgramme ? {
                    titre: {
                      fr: editingProgramme.titre || '',
                      ar: editingProgramme.titre || '',
                      en: editingProgramme.titre || '',
                      'tz-ltn': '',
                      'tz-tfng': ''
                    },
                    description: {
                      fr: editingProgramme.description || '',
                      ar: editingProgramme.description || '',
                      en: editingProgramme.description || '',
                      'tz-ltn': '',
                      'tz-tfng': ''
                    },
                    date_programme: editingProgramme.heure_debut ? editingProgramme.heure_debut.split('T')[0] : '',
                    heure_debut: editingProgramme.heure_debut ? editingProgramme.heure_debut.split('T')[1]?.substring(0, 5) : '',
                    heure_fin: editingProgramme.heure_fin ? editingProgramme.heure_fin.split('T')[1]?.substring(0, 5) : '',
                    type_activite: editingProgramme.type_activite as any,
                    statut: 'planifie',
                    ordre: 1,
                    nb_participants_max: editingProgramme.nb_participants_max,
                    niveau_requis: 'tous_niveaux',
                    materiel_requis: [],
                    langue_principale: 'fr',
                    traduction_disponible: false,
                    enregistrement_autorise: false,
                    diffusion_live: false,
                    support_numerique: false,
                    notes_organisateur: '',
                    intervenants: []
                  } : undefined}
                  onSubmit={handleSaveProgramme}
                  onCancel={handleCancelProgramme}
                  mode={editingProgramme ? 'edit' : 'create'}
                  lieux={[
                    { id_lieu: 1, nom: 'Salle principale' },
                    { id_lieu: 2, nom: 'Salle de conférence A' },
                    { id_lieu: 3, nom: 'Atelier 1' },
                    { id_lieu: 4, nom: 'Espace extérieur' }
                  ]}
                  users={[
                    { id_user: 1, prenom: 'Ahmed', nom: 'Benali' },
                    { id_user: 2, prenom: 'Fatima', nom: 'Messaoudi' },
                    { id_user: 3, prenom: 'Mohamed', nom: 'Kaci' },
                    { id_user: 4, prenom: 'Leila', nom: 'Boudiaf' }
                  ]}
                />
              </DialogContent>
            </Dialog>
          </div>

          {loadingProgrammes ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : programmes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('programme.empty', 'Aucun programme pour cet événement')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {programmes.map((programme) => (
                <Card key={programme.id_programme}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{td(programme.titre)}</h4>
                          <Badge variant="outline">{programme.type_activite}</Badge>
                          <Badge
                            variant={
                              programme.statut === 'planifie' ? 'default' :
                              programme.statut === 'en_cours' ? 'secondary' :
                              'outline'
                            }
                          >
                            {programme.statut}
                          </Badge>
                        </div>
                        {programme.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {td(programme.description)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {programme.heure_debut && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(programme.heure_debut)}
                              {programme.heure_fin && ` - ${formatTime(programme.heure_fin)}`}
                            </span>
                          )}
                          {programme.nb_participants_max && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              Max {programme.nb_participants_max}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditProgramme(programme)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteProgramme(programme.id_programme)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Participants */}
        <TabsContent value="participants">
          <ParticipantsManager 
            evenementId={evenementId} 
            evenementNom={evenementNom} 
          />
        </TabsContent>

        {/* Onglet Œuvres - Affiché seulement si showOeuvresSection est true */}
        {showOeuvresSection && (
        <TabsContent value="oeuvres" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {t('oeuvres.inEvent', 'Œuvres présentées')} ({oeuvresData?.oeuvres_ajoutees?.length || 0})
            </h3>
            <Dialog open={showOeuvreDialog} onOpenChange={setShowOeuvreDialog}>
              <DialogTrigger asChild>
                <Button disabled={!oeuvresData?.oeuvres_disponibles?.length}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('oeuvres.addToEvent', 'Ajouter une œuvre')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('oeuvres.selectToAdd', 'Sélectionner une œuvre')}</DialogTitle>
                  <DialogDescription>
                    {t('oeuvres.selectDesc', 'Choisissez parmi vos œuvres disponibles')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('oeuvres.select', 'Œuvre')} *</Label>
                    <Select
                      value={selectedOeuvre?.id_oeuvre?.toString() || ''}
                      onValueChange={(value) => {
                        const oeuvre = oeuvresData?.oeuvres_disponibles?.find(o => o.id_oeuvre === parseInt(value));
                        setSelectedOeuvre(oeuvre || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('oeuvres.selectPlaceholder', 'Sélectionner une œuvre')} />
                      </SelectTrigger>
                      <SelectContent>
                        {oeuvresData?.oeuvres_disponibles?.map((oeuvre) => (
                          <SelectItem key={oeuvre.id_oeuvre} value={oeuvre.id_oeuvre.toString()}>
                            {td(oeuvre.titre)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duree">{t('oeuvres.duration', 'Durée de présentation (min)')}</Label>
                    <Input
                      id="duree"
                      type="number"
                      value={oeuvresDuree || ''}
                      onChange={(e) => setOeuvresDuree(parseInt(e.target.value) || undefined)}
                      placeholder="30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desc_presentation">{t('oeuvres.presentationDesc', 'Description de la présentation')}</Label>
                    <Textarea
                      id="desc_presentation"
                      value={oeuvreDescription}
                      onChange={(e) => setOeuvreDescription(e.target.value)}
                      placeholder={t('oeuvres.presentationDescPlaceholder', 'Notes sur la présentation de cette œuvre')}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowOeuvreDialog(false)}>
                    {t('common.cancel', 'Annuler')}
                  </Button>
                  <Button onClick={handleAddOeuvre} disabled={!selectedOeuvre}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.add', 'Ajouter')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loadingOeuvres ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : !oeuvresData?.oeuvres_ajoutees?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('oeuvres.noneInEvent', 'Aucune œuvre ajoutée à cet événement')}
                </p>
                {oeuvresData?.oeuvres_disponibles?.length ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('oeuvres.availableCount', 'Vous avez {{count}} œuvre(s) disponible(s)', { count: oeuvresData.oeuvres_disponibles.length })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('oeuvres.noAvailable', 'Créez d\'abord une œuvre pour pouvoir l\'ajouter')}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {oeuvresData.oeuvres_ajoutees.map((item, index) => (
                <Card key={item.id_EventOeuvre}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveOeuvre(index, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === oeuvresData.oeuvres_ajoutees.length - 1}
                          onClick={() => moveOeuvre(index, 'down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold">{td(item.Oeuvre?.titre) || 'Œuvre'}</h4>
                        {item.description_presentation && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {td(item.description_presentation)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {item.duree_presentation && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {item.duree_presentation} min
                            </span>
                          )}
                          <Badge variant="outline">#{item.ordre_presentation}</Badge>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleRemoveOeuvre(item.id_oeuvre)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {oeuvresData?.oeuvres_disponibles && oeuvresData.oeuvres_disponibles.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">
                  {t('oeuvres.available', 'Œuvres disponibles')} ({oeuvresData.oeuvres_disponibles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {oeuvresData.oeuvres_disponibles.slice(0, 5).map(oeuvre => td(oeuvre.titre)).join(', ')}
                  {oeuvresData.oeuvres_disponibles.length > 5 && ` et ${oeuvresData.oeuvres_disponibles.length - 5} autres...`}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        )}

        {/* Message si œuvres désactivées */}
        {!showOeuvresSection && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('gestion.oeuvresDisabled', 'La gestion des œuvres est désactivée pour cet événement.')}</p>
            <p className="mt-1">{t('gestion.oeuvresEnableHint', 'Activez "Présenter des œuvres" si cet événement inclut des présentations d\'œuvres.')}</p>
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default GestionEvenement;
