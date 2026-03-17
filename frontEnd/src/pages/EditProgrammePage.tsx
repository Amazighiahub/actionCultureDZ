/**
 * EditProgrammePage - Page pour modifier un programme d'événement
 * Utilise le ProgrammeForm pour gérer la modification de programmes
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, Clock, Users, MapPin } from 'lucide-react';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { programmeService } from '@/services/programme.service';
import { evenementService } from '@/services/evenement.service';
import { lieuService } from '@/services/lieu.service';
import { httpClient } from '@/services/httpClient';
import { useTranslation } from 'react-i18next';

const EditProgrammePage: React.FC = () => {
  const { eventId, programmeId } = useParams<{ eventId: string; programmeId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [programmeData, setProgrammeData] = useState<Partial<ProgrammeFormData> | null>(null);
  const [lieux, setLieux] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [eventDates, setEventDates] = useState<{ dateDebut: string; dateFin: string } | undefined>();

  React.useEffect(() => {
    const loadRefData = async () => {
      try {
        const promises: Promise<any>[] = [
          lieuService.getAll({ limit: 100 }),
          httpClient.get<any>('/intervenants/search', { q: '', limit: 50 })
        ];
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
      } catch (e) { /* empty lists as fallback */ }
    };
    loadRefData();
  }, [eventId]);

  // Charger les données du programme
  useEffect(() => {
    const fetchProgramme = async () => {
      if (!programmeId) {
        setError(t('programmePages.errors.programmeIdMissing'));
        setFetchLoading(false);
        return;
      }

      try {
        const response = await programmeService.getDetail(parseInt(programmeId));
        
        if (response.success && response.data) {
          const programme = response.data;
          
          // Transformer les données pour le formulaire
          const formData: Partial<ProgrammeFormData> = {
            titre: typeof programme.titre === 'object' 
              ? programme.titre 
              : { fr: programme.titre || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
            description: typeof programme.description === 'object'
              ? programme.description
              : { fr: programme.description || '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
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
          setError(response.error || t('programmePages.errors.loadFailed'));
        }
      } catch (err: any) {
        setError(err.message || t('programmePages.errors.generic'));
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProgramme();
  }, [programmeId, t]);

  const handleSubmit = async (data: ProgrammeFormData) => {
    if (!eventId || !programmeId) {
      setError(t('programmePages.errors.eventOrProgrammeIdMissing'));
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

      const response = await programmeService.update(parseInt(programmeId), apiData);

      if (response.success) {
        setSuccess(true);
        // Rediriger vers la page de l'événement après 2 secondes
        setTimeout(() => {
          navigate(`/evenements/${eventId}`);
        }, 2000);
      } else {
        setError(response.error || t('programmePages.errors.updateFailed'));
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

  if (!eventId || !programmeId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {t('programmePages.errors.eventOrProgrammeIdMissingWithPrefix')}
          </h1>
          <Button onClick={() => navigate('/evenements')}>
            {t('programmePages.actions.backToEvents')}
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
          <p>{t('programmePages.status.loadingProgram')}</p>
        </div>
      </div>
    );
  }

  if (error && !programmeData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {t('programmePages.errors.prefix')}: {error}
          </h1>
          <Button onClick={() => navigate(`/evenements/${eventId}`)}>
            {t('programmePages.actions.backToEvent')}
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
          <h1 className="text-3xl font-bold">{t('programmePages.edit.title')}</h1>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('programmePages.meta.eventNumber', { id: eventId })}
          </div>
          <div className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            {t('programmePages.meta.programNumber', { id: programmeId })}
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

      {/* Formulaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {t('programmePages.edit.editProgram')}
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
              {t('programmePages.info.editMultiDayDesc')}
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
              {t('programmePages.info.editSpeakersDesc')}
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
              {t('programmePages.info.editLocationsDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditProgrammePage;
