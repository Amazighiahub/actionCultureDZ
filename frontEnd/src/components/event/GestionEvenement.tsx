/**
 * GestionEvenement - Composant de gestion d'événement pour les professionnels
 * Permet de gérer les programmes et les œuvres d'un événement
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  BookOpen,
  Calendar,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  UserCheck
} from 'lucide-react';
import ParticipantsManager from './ParticipantsManager';
import { useToast } from '@/components/UI/use-toast';
import { programmeService, type Programme, type CreateProgrammeData } from '@/services/programme.service';
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
  const { toast } = useToast();

  // État pour activer/désactiver la gestion des œuvres
  const [showOeuvresSection, setShowOeuvresSection] = useState(!hideOeuvres);

  // États pour les programmes
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loadingProgrammes, setLoadingProgrammes] = useState(true);
  const [showProgrammeDialog, setShowProgrammeDialog] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [programmeForm, setProgrammeForm] = useState<Partial<CreateProgrammeData>>({
    titre: '',
    description: '',
    type_activite: 'conference',
    heure_debut: '',
    heure_fin: '',
    nb_participants_max: undefined
  });

  // États pour les œuvres
  const [oeuvresData, setOeuvresData] = useState<MesOeuvresResponse | null>(null);
  const [loadingOeuvres, setLoadingOeuvres] = useState(true);
  const [showOeuvreDialog, setShowOeuvreDialog] = useState(false);
  const [selectedOeuvre, setSelectedOeuvre] = useState<Oeuvre | null>(null);
  const [oeuvreDescription, setOeuvreDescription] = useState('');
  const [oeuvresDuree, setOeuvresDuree] = useState<number | undefined>();

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
  const handleSaveProgramme = async () => {
    try {
      if (editingProgramme) {
        const response = await programmeService.update(editingProgramme.id_programme, programmeForm);
        if (response.success) {
          toast({ title: t('common.success'), description: t('programme.updated', 'Programme mis à jour') });
          loadProgrammes();
        }
      } else {
        const response = await programmeService.create(evenementId, programmeForm as CreateProgrammeData);
        if (response.success) {
          toast({ title: t('common.success'), description: t('programme.created', 'Programme créé') });
          loadProgrammes();
        }
      }
      setShowProgrammeDialog(false);
      resetProgrammeForm();
    } catch (error) {
      console.error('Erreur sauvegarde programme:', error);
      toast({ title: t('common.error'), description: t('programme.saveError', 'Erreur lors de la sauvegarde'), variant: 'destructive' });
    }
  };

  const handleDeleteProgramme = async (programmeId: number) => {
    if (!confirm(t('programme.confirmDelete', 'Voulez-vous vraiment supprimer ce programme ?'))) return;

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
  };

  const handleEditProgramme = (programme: Programme) => {
    setEditingProgramme(programme);
    setProgrammeForm({
      titre: programme.titre,
      description: programme.description,
      type_activite: programme.type_activite,
      heure_debut: programme.heure_debut,
      heure_fin: programme.heure_fin,
      nb_participants_max: programme.nb_participants_max
    });
    setShowProgrammeDialog(true);
  };

  const resetProgrammeForm = () => {
    setEditingProgramme(null);
    setProgrammeForm({
      titre: '',
      description: '',
      type_activite: 'conference',
      heure_debut: '',
      heure_fin: '',
      nb_participants_max: undefined
    });
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
                <Button onClick={resetProgrammeForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('programme.add', 'Ajouter un programme')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
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

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="titre">{t('common.title', 'Titre')} *</Label>
                    <Input
                      id="titre"
                      value={programmeForm.titre || ''}
                      onChange={(e) => setProgrammeForm({ ...programmeForm, titre: e.target.value })}
                      placeholder={t('programme.titlePlaceholder', 'Titre du programme')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type_activite">{t('programme.type', 'Type d\'activité')} *</Label>
                    <Select
                      value={programmeForm.type_activite}
                      onValueChange={(value) => setProgrammeForm({ ...programmeForm, type_activite: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.select', 'Sélectionner')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES_ACTIVITE.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="heure_debut">{t('programme.startTime', 'Heure de début')}</Label>
                      <Input
                        id="heure_debut"
                        type="time"
                        value={programmeForm.heure_debut || ''}
                        onChange={(e) => setProgrammeForm({ ...programmeForm, heure_debut: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heure_fin">{t('programme.endTime', 'Heure de fin')}</Label>
                      <Input
                        id="heure_fin"
                        type="time"
                        value={programmeForm.heure_fin || ''}
                        onChange={(e) => setProgrammeForm({ ...programmeForm, heure_fin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nb_participants_max">{t('programme.maxParticipants', 'Participants max')}</Label>
                    <Input
                      id="nb_participants_max"
                      type="number"
                      value={programmeForm.nb_participants_max || ''}
                      onChange={(e) => setProgrammeForm({ ...programmeForm, nb_participants_max: parseInt(e.target.value) || undefined })}
                      placeholder="Illimité"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('common.description', 'Description')}</Label>
                    <Textarea
                      id="description"
                      value={programmeForm.description || ''}
                      onChange={(e) => setProgrammeForm({ ...programmeForm, description: e.target.value })}
                      placeholder={t('programme.descPlaceholder', 'Description du programme')}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowProgrammeDialog(false)}>
                    {t('common.cancel', 'Annuler')}
                  </Button>
                  <Button onClick={handleSaveProgramme}>
                    <Save className="h-4 w-4 mr-2" />
                    {t('common.save', 'Enregistrer')}
                  </Button>
                </DialogFooter>
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
                          <h4 className="font-semibold">{programme.titre}</h4>
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
                            {programme.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {programme.heure_debut && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(programme.heure_debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              {programme.heure_fin && ` - ${new Date(programme.heure_fin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
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
                            {oeuvre.titre}
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
                        <h4 className="font-semibold">{item.Oeuvre?.titre || 'Œuvre'}</h4>
                        {item.description_presentation && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.description_presentation}
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
                  {oeuvresData.oeuvres_disponibles.slice(0, 5).map(oeuvre => oeuvre.titre).join(', ')}
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
