/**
 * GestionEvenementSimple - Version simplifiée utilisant le nouveau ProgrammeForm
 * Permet de gérer les programmes d'un événement avec le formulaire complet
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Skeleton } from '@/components/UI/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  UserCheck,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/UI/use-toast';
import { programmeService, type Programme } from '@/services/programme.service';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';

interface GestionEvenementSimpleProps {
  evenementId: number;
  evenementNom: string;
  onClose?: () => void;
}

const TYPES_ACTIVITE = [
  { value: 'conference', label: 'Conférence' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'projection', label: 'Projection' },
  { value: 'presentation', label: 'Présentation' },
  { value: 'concert', label: 'Concert' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'debat', label: 'Débat' },
  { value: 'formation', label: 'Formation' },
  { value: 'ceremonie', label: 'Cérémonie' },
  { value: 'autre', label: 'Autre' }
];

const GestionEvenementSimple: React.FC<GestionEvenementSimpleProps> = ({
  evenementId,
  evenementNom,
  onClose
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // États pour les programmes
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loadingProgrammes, setLoadingProgrammes] = useState(true);
  const [showProgrammeDialog, setShowProgrammeDialog] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);

  // Données de test pour les lieux
  const lieux = [
    { id_lieu: 1, nom: 'Salle principale' },
    { id_lieu: 2, nom: 'Salle de conférence A' },
    { id_lieu: 3, nom: 'Atelier 1' },
    { id_lieu: 4, nom: 'Espace extérieur' }
  ];

  // Données de test pour les utilisateurs
  const users = [
    { id_user: 1, prenom: 'Ahmed', nom: 'Benali' },
    { id_user: 2, prenom: 'Fatima', nom: 'Messaoudi' },
    { id_user: 3, prenom: 'Mohamed', nom: 'Kaci' },
    { id_user: 4, prenom: 'Leila', nom: 'Boudiaf' }
  ];

  // Chargement des programmes
  const loadProgrammes = async () => {
    try {
      setLoadingProgrammes(true);
      const response = await programmeService.getByEvent(evenementId);
      if (response.success && response.data) {
        setProgrammes(response.data.programmes || []);
      } else {
        toast({
          title: t('common.error'),
          description: 'Erreur lors du chargement des programmes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur chargement programmes:', error);
      toast({
        title: t('common.error'),
        description: 'Erreur lors du chargement des programmes',
        variant: 'destructive'
      });
    } finally {
      setLoadingProgrammes(false);
    }
  };

  // Handler pour sauvegarder un programme
  const handleSaveProgramme = async (data: ProgrammeFormData) => {
    try {
      // Transformer les données pour l'API
      const apiData = {
        titre: data.titre.fr,
        description: data.description.fr,
        type_activite: data.type_activite,
        heure_debut: `${data.date_programme}T${data.heure_debut}:00`,
        heure_fin: `${data.date_programme}T${data.heure_fin}:00`,
        id_lieu: data.id_lieu,
        lieu_specifique: data.lieu_specifique?.fr,
        nb_participants_max: data.nb_participants_max,
        niveau_requis: data.niveau_requis,
        materiel_requis: data.materiel_requis,
        notes_organisateur: data.notes_organisateur,
        traduction_disponible: data.traduction_disponible,
        enregistrement_autorise: data.enregistrement_autorise,
        diffusion_live: data.diffusion_live,
        support_numerique: data.support_numerique,
        langue_principale: data.langue_principale,
        ordre: data.ordre,
        intervenants: data.intervenants
      };

      if (editingProgramme) {
        const response = await programmeService.update(editingProgramme.id_programme, apiData);
        if (response.success) {
          toast({ 
            title: t('common.success'), 
            description: 'Programme mis à jour avec succès' 
          });
          loadProgrammes();
        }
      } else {
        const response = await programmeService.create(evenementId, apiData);
        if (response.success) {
          toast({ 
            title: t('common.success'), 
            description: 'Programme créé avec succès' 
          });
          loadProgrammes();
        }
      }
      setShowProgrammeDialog(false);
      setEditingProgramme(null);
    } catch (error) {
      console.error('Erreur sauvegarde programme:', error);
      toast({ 
        title: t('common.error'), 
        description: 'Erreur lors de la sauvegarde', 
        variant: 'destructive' 
      });
    }
  };

  // Handler pour supprimer un programme
  const handleDeleteProgramme = async (programmeId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) {
      try {
        const response = await programmeService.delete(programmeId);
        if (response.success) {
          toast({ 
            title: t('common.success'), 
            description: 'Programme supprimé avec succès' 
          });
          loadProgrammes();
        }
      } catch (error) {
        console.error('Erreur suppression programme:', error);
        toast({ 
          title: t('common.error'), 
          description: 'Erreur lors de la suppression', 
          variant: 'destructive' 
        });
      }
    }
  };

  // Handler pour éditer un programme
  const handleEditProgramme = (programme: Programme) => {
    setEditingProgramme(programme);
    setShowProgrammeDialog(true);
  };

  // Handler pour annuler
  const handleCancelProgramme = () => {
    setShowProgrammeDialog(false);
    setEditingProgramme(null);
  };

  // Charger au montage
  useEffect(() => {
    loadProgrammes();
  }, [evenementId]);

  // Formater l'heure
  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const date = new Date(time);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Obtenir le type d'activité
  const getTypeLabel = (type: string) => {
    const typeObj = TYPES_ACTIVITE.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gestion des programmes - {evenementNom}
            </CardTitle>
            <Dialog open={showProgrammeDialog} onOpenChange={setShowProgrammeDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProgramme(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un programme
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProgramme ? 'Modifier le programme' : 'Créer un programme'}
                  </DialogTitle>
                  <DialogDescription>
                    Remplissez les informations du programme
                  </DialogDescription>
                </DialogHeader>

                <ProgrammeForm
                  eventId={evenementId}
                  initialData={editingProgramme ? {
                    titre: {
                      fr: editingProgramme.titre || '',
                      ar: editingProgramme.titre || '',
                      en: editingProgramme.titre || ''
                    },
                    description: {
                      fr: editingProgramme.description || '',
                      ar: editingProgramme.description || '',
                      en: editingProgramme.description || ''
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
                  lieux={lieux}
                  users={users}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProgrammes ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : programmes.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun programme</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter un programme à cet événement
              </p>
              <Button onClick={() => setShowProgrammeDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un programme
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {programmes.map((programme) => (
                <div key={programme.id_programme} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{programme.titre}</h4>
                      <p className="text-muted-foreground">{programme.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProgramme(programme)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProgramme(programme.id_programme)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(programme.heure_debut)} - {formatTime(programme.heure_fin)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {programme.nb_participants_max ? `Max ${programme.nb_participants_max}` : 'Illimité'}
                    </div>
                    <Badge variant="secondary">
                      {getTypeLabel(programme.type_activite)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GestionEvenementSimple;
