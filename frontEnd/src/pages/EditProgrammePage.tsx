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
import { jourProgramme, heureProgramme, heurePourApi } from '@/utils/programmeHoraire';
import { evenementService } from '@/services/evenement.service';
import { lieuService } from '@/services/lieu.service';
import { useTranslation } from 'react-i18next';
import type { Lieu } from '@/types/models/lieu.types';
import { partiesEvenement } from '@/utils/dateHeureEvenement';
import { intervenantsPourFormulaire } from '@/utils/programmeIntervenants';
import { rafraichirTableauDeBord, rafraichirEvenement } from '@/lib/queryClient';

/** API response shape for lieux list */
interface LieuxResponseData {
  lieux?: Lieu[];
}

const EditProgrammePage: React.FC = () => {
  const { eventId, programmeId } = useParams<{ eventId: string; programmeId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [programmeData, setProgrammeData] = useState<Partial<ProgrammeFormData> | null>(null);
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [eventDates, setEventDates] = useState<{ dateDebut: string; dateFin: string } | undefined>();

  React.useEffect(() => {
    const loadRefData = async () => {
      try {
        const lieuxPromise = lieuService.getAll({ limit: 100 });
        const eventPromise = eventId ? evenementService.getDetail(parseInt(eventId)) : null;

        const [lieuxRes, eventRes] = await Promise.all([lieuxPromise, eventPromise]);
        if (lieuxRes.success && lieuxRes.data) {
          const items = (lieuxRes.data as LieuxResponseData).lieux || lieuxRes.data;
          setLieux(Array.isArray(items) ? items : []);
        }
        if (eventRes?.success && eventRes.data) {
          const evt = eventRes.data;
          // Jours à l'heure de l'Algérie (la date UTC peut être la veille)
          const dateDebut = partiesEvenement(evt.date_debut as string).date || evt.date_debut;
          const dateFin = partiesEvenement(evt.date_fin as string).date || dateDebut;
          if (dateDebut) {
            setEventDates({ dateDebut, dateFin });
          }
        }
      } catch (_e) { /* empty lists as fallback */ }
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
            date_programme: jourProgramme(programme),
            heure_debut: heureProgramme(programme.heure_debut),
            heure_fin: heureProgramme(programme.heure_fin),
            duree_estimee: programmeService.getDuration(programme),
            id_lieu: programme.id_lieu,
            lieu_specifique: programme.lieu_specifique ? {
              fr: programme.lieu_specifique,
              ar: programme.lieu_specifique,
              en: programme.lieu_specifique
            } : undefined,
            type_activite: programme.type_activite as ProgrammeFormData['type_activite'],
            statut: programme.statut,
            ordre: programme.ordre,
            nb_participants_max: programme.nb_participants_max,
            niveau_requis: programme.niveau_requis as ProgrammeFormData['niveau_requis'],
            materiel_requis: programme.materiel_requis || [],
            langue_principale: 'fr',
            traduction_disponible: false,
            enregistrement_autorise: false,
            diffusion_live: false,
            support_numerique: false,
            notes_organisateur: '',
            intervenants: intervenantsPourFormulaire(programme.Intervenants, i18n.language)
          };

          setProgrammeData(formData);
        } else {
          setError(response.error || t('programmePages.errors.loadFailed'));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('programmePages.errors.generic'));
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
        date_programme: data.date_programme,
        heure_debut: heurePourApi(data.date_programme, data.heure_debut),
        heure_fin: heurePourApi(data.date_programme, data.heure_fin),
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
        rafraichirEvenement(eventId);
        rafraichirTableauDeBord();
        // Rediriger vers la page de l'événement après 2 secondes
        setTimeout(() => {
          navigate(`/evenements/${eventId}`);
        }, 2000);
      } else {
        setError(response.error || t('programmePages.errors.updateFailed'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('programmePages.errors.generic'));
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
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
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
