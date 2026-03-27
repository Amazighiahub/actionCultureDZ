/**
 * EventProgram - Programme de l'événement
 * Affiche la liste des activités/sessions avec horaires et intervenants
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, User, MapPin, Users, ChevronDown, ChevronUp,
  Play, Pause, CheckCircle, XCircle,
  Mic, Video, FileText
} from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useTranslateData } from '@/hooks/useTranslateData';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/Utils';
import type { Programme, ProgrammeIntervenant } from '@/types/models/programme.types';

interface EventProgramProps {
  programs: Programme[];
}

// Icônes par type d'activité
const activityIcons: Record<string, React.ElementType> = {
  conference: Mic,
  atelier: Users,
  projection: Video,
  presentation: FileText,
  pause: Pause,
  default: Play
};

// Couleurs par statut
const statusColors: Record<string, string> = {
  planifie: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  en_cours: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  termine: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  annule: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  reporte: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
};

// Composant pour un élément du programme
interface ProgramItemProps {
  program: Programme;
  isExpanded: boolean;
  onToggle: () => void;
}

const ProgramItem: React.FC<ProgramItemProps> = ({ program, isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { formatTime: hookFormatTime } = useFormatDate();

  // Normaliser les champs qui peuvent être des objets multilingues
  const statut = program.statut || 'planifie';
  const typeActivite = program.type_activite || 'default';
  const niveauRequis = program.niveau_requis || '';

  const Icon = activityIcons[typeActivite] || activityIcons.default;

  // Utiliser Intervenants (nouveau) avec fallback vers Users (ancien)
  const intervenants: ProgrammeIntervenant[] = (program.Intervenants || program.Users || []) as ProgrammeIntervenant[];

  const formatTime = (time?: string) => {
    if (!time) return '--:--';

    // Si c'est déjà au format HH:MM ou HH:MM:SS, extraire directement
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      return time.substring(0, 5);
    }

    // Si c'est une date ISO complète, parser et formater
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return hookFormatTime(date, { hour: '2-digit', minute: '2-digit' });
    }

    return '--:--';
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'termine': return <CheckCircle className="h-4 w-4" />;
      case 'annule': return <XCircle className="h-4 w-4" />;
      case 'en_cours': return <Play className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn(
      "border rounded-lg transition-all",
      statut === 'annule' && "opacity-60",
      statut === 'en_cours' && "border-primary ring-2 ring-primary/20"
    )}>
      {/* En-tête cliquable */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-4 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Horaire */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <div className="text-lg font-bold">{formatTime(program.heure_debut)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(program.heure_fin)}
          </div>
        </div>

        {/* Icône */}
        <div className={cn(
          "p-2 rounded-lg flex-shrink-0",
          statut === 'en_cours' 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className={cn(
                "font-semibold",
                statut === 'annule' && "line-through"
              )}>
                {td(program.titre)}
              </h4>

              {td(program.description) && !isExpanded && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {td(program.description)}
                </p>
              )}
            </div>

            {/* Badge statut */}
            <Badge className={cn("flex-shrink-0", statusColors[statut])}>
              {getStatusIcon(statut)}
              <span className="ml-1">
                {t(`programme.status.${statut}`, statut)}
              </span>
            </Badge>
          </div>

          {/* Infos rapides */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            {program.duree_estimee && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {program.duree_estimee} min
              </span>
            )}
            
            {(td(program.lieu_specifique) || td(program.Lieu?.nom)) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {td(program.lieu_specifique) || td(program.Lieu?.nom)}
              </span>
            )}
            
            {program.nb_participants_max && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Max {program.nb_participants_max}
              </span>
            )}
            
            {intervenants.length > 0 && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {intervenants.length} {t('programme.speakerCount', 'intervenant(s)')}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Détails étendus */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-muted/30">
          <div className="pt-4 space-y-4">
            {/* Description complète */}
            {td(program.description) && (
              <div>
                <h5 className="font-medium mb-2">{t('common.description', 'Description')}</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {td(program.description)}
                </p>
              </div>
            )}

            {/* Intervenants */}
            {intervenants.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">{t('programme.speakers', 'Intervenants')}</h5>
                <div className="space-y-3">
                  {intervenants.map((user) => {
                    const pi = user.ProgrammeIntervenant;
                    return (
                      <div
                        key={user.id_user}
                        className="flex items-start gap-3 bg-background rounded-lg p-3 border"
                      >
                        <LazyImage
                          src={user.photo_url || '/images/default-avatar.svg'}
                          alt={`${td(user.prenom)} ${td(user.nom)}`}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                          aspectRatio="square"
                          fallback="/images/default-avatar.svg"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">
                              {td(user.prenom)} {td(user.nom)}
                            </p>
                            {pi?.role_intervenant && (
                              <Badge variant="secondary" className="text-xs">
                                {t(`programme.roles.${pi.role_intervenant}`, pi.role_intervenant)}
                              </Badge>
                            )}
                            {pi?.statut_confirmation && pi.statut_confirmation !== 'en_attente' && (
                              <Badge
                                variant={pi.statut_confirmation === 'confirme' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {t(`programme.confirmation.${pi.statut_confirmation}`, pi.statut_confirmation)}
                              </Badge>
                            )}
                          </div>
                          {pi?.sujet_intervention && (
                            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Mic className="h-3.5 w-3.5 flex-shrink-0" />
                              {pi.sujet_intervention}
                            </p>
                          )}
                          {pi?.biographie_courte && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pi.biographie_courte}
                            </p>
                          )}
                          {pi?.duree_intervention && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {pi.duree_intervention} min
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Niveau requis */}
            {niveauRequis && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('programme.level', 'Niveau')}:</span>
                <Badge variant="outline">
                  {t(`programme.levels.${niveauRequis}`, niveauRequis)}
                </Badge>
              </div>
            )}

            {/* Matériel requis */}
            {program.materiel_requis && program.materiel_requis.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">{t('programme.requiredMaterial', 'Matériel requis')}</h5>
                <div className="flex flex-wrap gap-2">
                  {program.materiel_requis.map((item, index) => (
                    <Badge key={index} variant="secondary">
                      {typeof item === 'string' ? item : item.nom}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex flex-wrap gap-2">
              {program.traduction_disponible && (
                <Badge variant="outline" className="bg-blue-50">
                  🌐 {t('programme.translationAvailable', 'Traduction disponible')}
                </Badge>
              )}
              {program.diffusion_live && (
                <Badge variant="outline" className="bg-red-50">
                  📺 {t('programme.liveStreaming', 'Diffusion en direct')}
                </Badge>
              )}
              {program.support_numerique && (
                <Badge variant="outline" className="bg-green-50">
                  📱 {t('programme.digitalSupport', 'Support numérique')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant principal
const EventProgram: React.FC<EventProgramProps> = ({ programs }) => {
  const { t } = useTranslation();
  const { formatDate } = useFormatDate();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Grouper par jour si plusieurs jours
  const programsByDay = programs.reduce((acc, program) => {
    const day = program.date_programme
      ? formatDate(new Date(program.date_programme), {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })
      : t('programme.noDate', 'Date non définie');
    
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(program);
    return acc;
  }, {} as Record<string, Programme[]>);

  const days = Object.keys(programsByDay);
  const hasMultipleDays = days.length > 1;

  // Trier les programmes par ordre puis par heure
  const sortPrograms = (progs: Programme[]) => {
    return [...progs].sort((a, b) => {
      if (a.ordre !== b.ordre) return a.ordre - b.ordre;
      if (a.heure_debut && b.heure_debut) {
        return new Date(a.heure_debut).getTime() - new Date(b.heure_debut).getTime();
      }
      return 0;
    });
  };

  if (!programs || programs.length === 0) {
    return (
      <EmptyState
        type="events"
        title={t('programme.empty', 'Programme non disponible')}
        description={t('programme.emptyDesc', 'Le programme de cet événement n\'a pas encore été publié')}
      />
    );
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {hasMultipleDays ? (
        <Tabs defaultValue={days[0]} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {days.map((day) => (
              <TabsTrigger key={day} value={day} className="min-w-fit">
                {day}
                <Badge variant="secondary" className="ml-2">
                  {programsByDay[day].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {days.map((day) => (
            <TabsContent key={day} value={day} className="mt-6">
              <div className="space-y-4">
                {sortPrograms(programsByDay[day]).map((program) => (
                  <ProgramItem
                    key={program.id_programme}
                    program={program}
                    isExpanded={expandedId === program.id_programme}
                    onToggle={() => toggleExpand(program.id_programme)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-4">
          {sortPrograms(programs).map((program) => (
            <ProgramItem
              key={program.id_programme}
              program={program}
              isExpanded={expandedId === program.id_programme}
              onToggle={() => toggleExpand(program.id_programme)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventProgram;
