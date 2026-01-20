/**
 * CreateProgrammePage - Page pour créer un programme d'événement
 * Utilise le ProgrammeForm pour gérer l'ajout de programmes sur plusieurs jours
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { ArrowLeft, Calendar, Clock, Users, MapPin } from 'lucide-react';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { programmeService } from '@/services/programme.service';

const CreateProgrammePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (data: ProgrammeFormData) => {
    if (!eventId) {
      setError('ID d\'événement non spécifié');
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

      const response = await programmeService.create(parseInt(eventId), apiData);

      if (response.success) {
        setSuccess(true);
        console.log('Programme créé avec succès');

        // Rediriger vers la page de l'événement après 2 secondes
        setTimeout(() => {
          navigate(`/events/${eventId}`);
        }, 2000);
      } else {
        setError(response.error || 'Erreur lors de la création du programme');
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

  if (!eventId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur: ID d'événement non spécifié
          </h1>
          <Button onClick={() => navigate('/events')}>
            Retour aux événements
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
          <h1 className="text-3xl font-bold">Créer un programme</h1>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Événement #{eventId}
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
            <Calendar className="h-5 w-5" />
            Nouveau programme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgrammeForm
            eventId={parseInt(eventId)}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            mode="create"
            loading={loading}
            error={error}
            success={success}
            lieux={lieux || []}
            users={users || []}
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
              Créez des programmes pour chaque jour de votre événement. 
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
              Ajoutez plusieurs intervenants avec des rôles spécifiques. 
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
              Utilisez des lieux prédéfinis ou spécifiez un lieu personnalisé 
              pour chaque activité du programme.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateProgrammePage;
