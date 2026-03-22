/**
 * ViewProgrammePage - Page pour consulter un programme d'événement
 * Affiche les détails d'un programme en mode lecture seule
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Calendar, Clock, Users, MapPin, Edit, Trash2, Copy, User, Mic } from 'lucide-react';
import ProgrammeForm, { ProgrammeFormData } from '@/components/forms/ProgrammeForm';
import { programmeService, IntervenantUser } from '@/services/programme.service';
import { useTranslation } from 'react-i18next';

const ViewProgrammePage: React.FC = () => {
  const { eventId, programmeId } = useParams<{ eventId: string; programmeId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programmeData, setProgrammeData] = useState<Partial<ProgrammeFormData> | null>(null);
  const [rawIntervenants, setRawIntervenants] = useState<IntervenantUser[]>([]);
  const [lieuNom, setLieuNom] = useState<string | null>(null);

  // Charger les données du programme
  useEffect(() => {
    const fetchProgramme = async () => {
      if (!programmeId) {
        setError(t('programmePages.errors.programmeIdMissing'));
        setLoading(false);
        return;
      }

      try {
        const response = await programmeService.getDetail(parseInt(programmeId));
        
        if (response.success && response.data) {
          const programme = response.data;

          // Stocker les intervenants complets (nom, prénom, etc.)
          setRawIntervenants(programme.Intervenants || []);

          // Stocker le nom du lieu
          if (programme.Lieu?.nom) {
            setLieuNom(typeof programme.Lieu.nom === 'object' ? (programme.Lieu.nom as any).fr || '' : programme.Lieu.nom);
          }

          // Transformer les données pour le formulaire
          const formData: Partial<ProgrammeFormData> = {
            titre: typeof programme.titre === 'object' ? programme.titre as any : {
              fr: programme.titre || '',
              ar: '',
              en: ''
            },
            description: typeof programme.description === 'object' ? programme.description as any : {
              fr: programme.description || '',
              ar: '',
              en: ''
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('programmePages.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchProgramme();
  }, [programmeId, t]);

  const handleEdit = () => {
    if (eventId && programmeId) {
      navigate(`/programme/modifier/${programmeId}`);
    }
  };

  const handleDelete = async () => {
    if (!programmeId) return;

    if (window.confirm(t('programmePages.view.confirmDelete'))) {
      try {
        const response = await programmeService.delete(parseInt(programmeId));
        
        if (response.success) {
          navigate(`/evenements/${eventId}`);
        } else {
          setError(response.error || t('programmePages.errors.deleteFailed'));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('programmePages.errors.generic'));
      }
    }
  };

  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!programmeId) return;
    setDuplicating(true);
    try {
      const response = await programmeService.duplicate(parseInt(programmeId));
      if (response.success && response.data) {
        navigate(`/programme/${eventId}/${response.data.id_programme}`);
      } else {
        setError(response.error || t('programmePages.errors.duplicateFailed', 'Erreur lors de la duplication'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('programmePages.errors.generic'));
    } finally {
      setDuplicating(false);
    }
  };

  const handleBack = () => {
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

  if (loading) {
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('programmePages.actions.backToEvent')}
            </Button>
            <h1 className="text-3xl font-bold">{t('programmePages.view.title')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {t('programmePages.actions.duplicate', 'Dupliquer')}
            </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {t('programmePages.actions.edit')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('programmePages.actions.delete')}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('programmePages.meta.eventNumber', { id: eventId })}
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t('programmePages.meta.programNumber', { id: programmeId })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {programmeData?.date_programme}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('programmePages.meta.speakersCount', { count: programmeData?.intervenants?.length || 0 })}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {lieuNom || t('programmePages.meta.locationNotSpecified')}
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
            {t('programmePages.view.consultation')}
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
            lieux={[]}
            users={[]}
          />
        </CardContent>
      </Card>

      {/* Section Intervenants */}
      {rawIntervenants.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('programmePages.view.intervenants', 'Intervenants')} ({rawIntervenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rawIntervenants.map((intervenant) => {
                const pi = intervenant.ProgrammeIntervenant;
                const nom = typeof intervenant.nom === 'object' ? (intervenant.nom as any).fr || '' : intervenant.nom || '';
                const prenom = typeof intervenant.prenom === 'object' ? (intervenant.prenom as any).fr || '' : intervenant.prenom || '';
                return (
                  <div
                    key={intervenant.id_user}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
                  >
                    {/* Avatar / icône */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>

                    {/* Détails */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">
                          {prenom} {nom}
                        </span>
                        {pi?.role_intervenant && (
                          <Badge variant="secondary">
                            {t(`programme.form.participants.roles.${pi.role_intervenant}`, pi.role_intervenant)}
                          </Badge>
                        )}
                        {pi?.statut_confirmation && (
                          <Badge variant={pi.statut_confirmation === 'confirme' ? 'default' : 'outline'}>
                            {t(`programme.form.participants.status.${pi.statut_confirmation}`, pi.statut_confirmation)}
                          </Badge>
                        )}
                      </div>

                      {/* Sujet d'intervention */}
                      {pi?.sujet_intervention && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <Mic className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{pi.sujet_intervention}</span>
                        </div>
                      )}

                      {/* Biographie courte */}
                      {pi?.biographie_courte && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pi.biographie_courte}
                        </p>
                      )}

                      {/* Durée d'intervention */}
                      {pi?.duree_intervention && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{pi.duree_intervention} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
              {t('programmePages.info.viewMultiDayDesc')}
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
              {t('programmePages.info.viewSpeakersDesc', { count: programmeData?.intervenants?.length || 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('programmePages.info.locationAndOptionsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('programmePages.info.viewLocationOptionsDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
          <Copy className="h-4 w-4 me-2" />
          {t('programmePages.view.quickActions.duplicateProgram', 'Dupliquer ce programme')}
        </Button>
        <Button variant="outline" onClick={handleEdit}>
          <Edit className="h-4 w-4 me-2" />
          {t('programmePages.view.quickActions.editProgram')}
        </Button>
        <Button variant="outline" onClick={() => navigate(`/programme/creer?eventId=${eventId}`)}>
          <Calendar className="h-4 w-4 me-2" />
          {t('programmePages.view.quickActions.addAnotherProgram')}
        </Button>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 me-2" />
          {t('programmePages.actions.backToEvent')}
        </Button>
      </div>
    </div>
  );
};

export default ViewProgrammePage;
