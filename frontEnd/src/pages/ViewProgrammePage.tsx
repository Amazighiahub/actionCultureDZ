/**
 * ViewProgrammePage - Page pour consulter un programme d'événement
 * Affiche les détails d'un programme en mode lecture seule
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { ArrowLeft, Eye, Calendar, Clock, Users, MapPin, Edit, Trash2 } from 'lucide-react';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { programmeService } from '@/services/programme.service';

const ViewProgrammePage: React.FC = () => {
  const { eventId, programmeId } = useParams<{ eventId: string; programmeId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programmeData, setProgrammeData] = useState<Partial<ProgrammeFormData> | null>(null);

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

  // Charger les données du programme
  useEffect(() => {
    const fetchProgramme = async () => {
      if (!programmeId) {
        setError('ID de programme non spécifié');
        setLoading(false);
        return;
      }

      try {
        const response = await programmeService.getDetail(parseInt(programmeId));
        
        if (response.success && response.data) {
          const programme = response.data;
          
          // Transformer les données pour le formulaire
          const formData: Partial<ProgrammeFormData> = {
            titre: {
              fr: programme.titre || '',
              ar: programme.titre || '',
              en: programme.titre || ''
            },
            description: {
              fr: programme.description || '',
              ar: programme.description || '',
              en: programme.description || ''
            },
            date_programme: programme.heure_debut ? programme.heure_debut.split('T')[0] : '',
            heure_debut: programme.heure_debut ? programme.heure_debut.split('T')[1]?.substring(0, 5) : '',
            heure_fin: programme.heure_fin ? programme.heure_fin.split('T')[1]?.substring(0, 5) : '',
            duree_estimee: programmeService.getDuration(programme),
            id_lieu: programme.id_lieu,
            lieu_specifique: programme.lieu_specifique ? {
              fr: programme.lieu_specifique,
              ar: programme.lieu_specifique,
              en: programme.lieu_specifique
            } : undefined,
            type_activite: programme.type_activite as any,
            statut: programme.statut,
            ordre: programme.ordre,
            nb_participants_max: programme.nb_participants_max,
            niveau_requis: programme.niveau_requis as any,
            materiel_requis: programme.materiel_requis || [],
            langue_principale: 'fr',
            traduction_disponible: false,
            enregistrement_autorise: false,
            diffusion_live: false,
            support_numerique: false,
            notes_organisateur: '',
            intervenants: programme.Intervenants?.map(intervenant => ({
              id_user: intervenant.id_user,
              role_intervenant: intervenant.ProgrammeIntervenant?.role_intervenant || 'principal',
              sujet_intervention: intervenant.ProgrammeIntervenant?.sujet_intervention || '',
              biographie_courte: intervenant.ProgrammeIntervenant?.biographie_courte || '',
              ordre_intervention: intervenant.ProgrammeIntervenant?.ordre_intervention || 1,
              duree_intervention: intervenant.ProgrammeIntervenant?.duree_intervention,
              honoraires: intervenant.ProgrammeIntervenant?.honoraires,
              frais_deplacement: intervenant.ProgrammeIntervenant?.frais_deplacement
            })) || []
          };

          setProgrammeData(formData);
        } else {
          setError(response.error || 'Erreur lors du chargement du programme');
        }
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchProgramme();
  }, [programmeId]);

  const handleEdit = () => {
    if (eventId && programmeId) {
      navigate(`/events/${eventId}/programmes/${programmeId}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!programmeId) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce programme ?')) {
      try {
        const response = await programmeService.delete(parseInt(programmeId));
        
        if (response.success) {
          console.log('Programme supprimé avec succès');
          navigate(`/events/${eventId}`);
        } else {
          setError(response.error || 'Erreur lors de la suppression du programme');
        }
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue');
      }
    }
  };

  const handleBack = () => {
    navigate(`/events/${eventId}`);
  };

  if (!eventId || !programmeId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur: ID d'événement ou de programme non spécifié
          </h1>
          <Button onClick={() => navigate('/events')}>
            Retour aux événements
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement du programme...</p>
        </div>
      </div>
    );
  }

  if (error && !programmeData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur: {error}
          </h1>
          <Button onClick={() => navigate(`/events/${eventId}`)}>
            Retour à l'événement
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'événement
            </Button>
            <h1 className="text-3xl font-bold">Détails du programme</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Événement #{eventId}
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Programme #{programmeId}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {programmeData?.date_programme}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {programmeData?.intervenants?.length} intervenant(s)
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {lieux.find(l => l.id_lieu === programmeData?.id_lieu)?.nom || 'Lieu non spécifié'}
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Formulaire en mode lecture seule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Consultation du programme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgrammeForm
            eventId={parseInt(eventId)}
            initialData={programmeData || undefined}
            onSubmit={async () => {}}
            mode="view"
            loading={false}
            error={null}
            success={false}
            lieux={lieux}
            users={users}
          />
        </CardContent>
      </Card>

      {/* Informations supplémentaires */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gestion multi-jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ce programme fait partie d'un événement sur plusieurs jours. 
              Le système regroupe automatiquement les activités par date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Intervenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {programmeData?.intervenants?.length || 0} intervenant(s) participent à cette activité.
              Chaque intervenant a un rôle spécifique et ses propres paramètres.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Lieu et options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activité se déroulant dans un lieu spécifique avec des options 
              personnalisées pour les participants et l'organisation.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="mt-8 flex justify-center gap-4">
        <Button variant="outline" onClick={handleEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Modifier ce programme
        </Button>
        <Button variant="outline" onClick={() => navigate(`/events/${eventId}/programmes/create`)}>
          <Calendar className="h-4 w-4 mr-2" />
          Ajouter un autre programme
        </Button>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'événement
        </Button>
      </div>
    </div>
  );
};

export default ViewProgrammePage;
