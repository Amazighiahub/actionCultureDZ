/**
 * EditProgrammePage - Page pour modifier un programme d'événement
 * Utilise le ProgrammeForm pour gérer la modification de programmes
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { ArrowLeft, Edit, Calendar, Clock, Users, MapPin } from 'lucide-react';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { programmeService } from '@/services/programme.service';

const EditProgrammePage: React.FC = () => {
  const { eventId, programmeId } = useParams<{ eventId: string; programmeId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
        setFetchLoading(false);
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
        setFetchLoading(false);
      }
    };

    fetchProgramme();
  }, [programmeId]);

  const handleSubmit = async (data: ProgrammeFormData) => {
    if (!eventId || !programmeId) {
      setError('ID d\'événement ou de programme non spécifié');
      return;
    }

    setLoading(true);
    setError(null);

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

      const response = await programmeService.update(parseInt(programmeId), apiData);

      if (response.success) {
        setSuccess(true);
        console.log('Programme mis à jour avec succès');

        // Rediriger vers la page de l'événement après 2 secondes
        setTimeout(() => {
          navigate(`/events/${eventId}`);
        }, 2000);
      } else {
        setError(response.error || 'Erreur lors de la mise à jour du programme');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
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

  if (fetchLoading) {
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
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'événement
          </Button>
          <h1 className="text-3xl font-bold">Modifier le programme</h1>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Événement #{eventId}
          </div>
          <div className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Programme #{programmeId}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Plusieurs jours possibles
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Intervenants multiples
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Lieux personnalisables
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Modifier le programme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgrammeForm
            eventId={parseInt(eventId)}
            initialData={programmeData || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            mode="edit"
            loading={loading}
            error={error}
            success={success}
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
              Modifiez les programmes pour chaque jour de votre événement. 
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
              Modifiez les intervenants avec leurs rôles spécifiques. 
              Chaque intervenant peut avoir ses propres paramètres.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Lieux flexibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Changez les lieux prédéfinis ou spécifiez un lieu personnalisé 
              pour chaque activité du programme.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditProgrammePage;
