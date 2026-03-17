/**
 * CreateProgrammePage - Page pour créer un programme d'événement
 * Utilise le ProgrammeForm pour gérer l'ajout de programmes sur plusieurs jours
 */
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Clock, Users, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { programmeService } from '@/services/programme.service';
import { evenementService } from '@/services/evenement.service';
import { lieuService } from '@/services/lieu.service';
import { httpClient } from '@/services/httpClient';
import { useTranslation } from 'react-i18next';

const CreateProgrammePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId') ?? undefined;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lieux, setLieux] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [eventDates, setEventDates] = useState<{ dateDebut: string; dateFin: string } | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoadError(null);
    try {
        const promises: Promise<any>[] = [
          lieuService.getAll({ limit: 100 }),
          httpClient.get<any>('/intervenants/search', { q: '', limit: 50 })
        ];
        // Fetch event details for dates
        if (eventId) {
          promises.push(evenementService.getDetail(parseInt(eventId)));
        }
        const [lieuxRes, usersRes, eventRes] = await Promise.all(promises);
        if (lieuxRes.success && lieuxRes.data) {
          const items = (lieuxRes.data as any).lieux || lieuxRes.data;
          setLieux(Array.isArray(items) ? items : []);
        }
        if (usersRes.success && usersRes.data) {
          const items = (usersRes.data as any).intervenants || usersRes.data;
          setUsers(Array.isArray(items) ? items : []);
        }
        if (eventRes?.success && eventRes.data) {
          const evt = eventRes.data;
          const dateDebut = evt.date_debut?.split('T')[0] || evt.date_debut;
          const dateFin = evt.date_fin?.split('T')[0] || evt.date_fin || dateDebut;
          if (dateDebut) {
            setEventDates({ dateDebut, dateFin });
          }
        }
      } catch (e) {
        setLoadError(t('programmePages.errors.loadDataFailed', 'Impossible de charger les données de l\'événement. Vérifiez votre connexion.'));
      }
    }, [eventId, t]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (data: ProgrammeFormData) => {
    if (!eventId) {
      setError(t('programmePages.errors.eventIdMissing'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Transformer les données pour l'API
      const apiData = {
        titre: data.titre,
        description: data.description,
        type_activite: data.type_activite,
        heure_debut: `${data.date_programme}T${data.heure_debut}:00`,
        heure_fin: `${data.date_programme}T${data.heure_fin}:00`,
        id_lieu: data.id_lieu,
        lieu_specifique: data.lieu_specifique,
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

        // Rediriger vers la page de l'événement après 2 secondes
        setTimeout(() => {
          navigate(`/evenements/${eventId}`);
        }, 2000);
      } else {
        setError(response.error || t('programmePages.errors.createFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('programmePages.errors.generic'));
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/evenements/${eventId}`);
  };

  if (!eventId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {t('programmePages.errors.eventIdMissingWithPrefix')}
          </h1>
          <Button onClick={() => navigate('/evenements')}>
            {t('programmePages.actions.backToEvents')}
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
            {t('programmePages.actions.backToEvent')}
          </Button>
          <h1 className="text-3xl font-bold">{t('programmePages.create.title')}</h1>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('programmePages.meta.eventNumber', { id: eventId })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('programmePages.meta.multiDay')}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('programmePages.meta.multipleSpeakers')}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t('programmePages.meta.flexibleLocations')}
          </div>
        </div>
      </div>

      {/* Alerte si le chargement des données a échoué */}
      {loadError && (
        <Alert variant="destructive" className="mb-6" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 me-1" />
              {t('common.retry', 'Réessayer')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('programmePages.create.newProgram')}
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
            eventDates={eventDates}
          />
        </CardContent>
      </Card>

      {/* Informations supplémentaires */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('programmePages.info.multiDayTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('programmePages.info.createMultiDayDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('programmePages.info.speakersTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('programmePages.info.createSpeakersDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('programmePages.info.flexibleLocationsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('programmePages.info.createLocationsDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateProgrammePage;
