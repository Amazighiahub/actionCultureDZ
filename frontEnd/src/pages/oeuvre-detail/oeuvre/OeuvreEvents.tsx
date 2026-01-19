/**
 * OeuvreEvents - Événements où l'œuvre est présentée
 * Liste des événements associés à l'œuvre
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  Calendar, MapPin, Clock, Users, ArrowRight, Ticket
} from 'lucide-react';
import { LazyImage, StatusBadge, EmptyState } from '@/components/shared';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import type { Evenement } from '@/types/models/evenement.types';

interface OeuvreEventsProps {
  events: Evenement[];
}

// Carte d'événement
const EventCard: React.FC<{ event: Evenement; onClick: () => void }> = ({ event, onClick }) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatPrice } = useLocalizedNumber();

  const isUpcoming = event.date_debut ? new Date(event.date_debut) > new Date() : false;
  const isPast = event.date_fin ? new Date(event.date_fin) < new Date() : false;

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <LazyImage
            src={event.image_url || '/images/placeholder-event.png'}
            alt={event.nom_evenement}
            className="w-full h-full object-cover"
            fallback="/images/placeholder-event.png"
          />
          {/* Badge date */}
          {event.date_debut && (
            <div className="absolute bottom-1 left-1 bg-background/90 backdrop-blur-sm rounded px-2 py-1">
              <div className="text-center">
                <div className="text-sm font-bold leading-none">
                  {new Date(event.date_debut).getDate()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(event.date_debut).toLocaleDateString('fr-FR', { month: 'short' })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenu */}
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={event.statut} />
                {isPast && (
                  <Badge variant="outline" className="text-xs">
                    {t('events.past', 'Passé')}
                  </Badge>
                )}
                {isUpcoming && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {t('events.upcoming', 'À venir')}
                  </Badge>
                )}
              </div>
              
              <h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {event.nom_evenement}
              </h4>
            </div>
          </div>

          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {/* Date */}
            {event.date_debut && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{formatDate(event.date_debut, { dateStyle: 'medium' })}</span>
              </div>
            )}

            {/* Lieu */}
            {event.Lieu && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.Lieu.nom}</span>
              </div>
            )}
          </div>

          {/* Prix et action */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            {event.tarif === 0 ? (
              <Badge variant="secondary" className="text-xs">
                {t('events.free', 'Gratuit')}
              </Badge>
            ) : (
              <span className="text-sm font-medium text-primary">
                {formatPrice(event.tarif)}
              </span>
            )}
            
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              {t('common.viewDetails', 'Voir')}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

// Composant principal
const OeuvreEvents: React.FC<OeuvreEventsProps> = ({ events }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Séparer événements à venir et passés
  const now = new Date();
  const upcomingEvents = events.filter(e => e.date_debut && new Date(e.date_debut) >= now);
  const pastEvents = events.filter(e => e.date_fin && new Date(e.date_fin) < now);

  const handleEventClick = (eventId: number) => {
    navigate(`/evenements/${eventId}`);
  };

  if (!events || events.length === 0) {
    return (
      <EmptyState
        type="events"
        title={t('oeuvre.noEvents', 'Aucun événement associé')}
        description={t('oeuvre.noEventsDesc', 'Cette œuvre n\'est liée à aucun événement pour le moment')}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Événements à venir */}
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            {t('oeuvre.upcomingEvents', 'Événements à venir')} ({upcomingEvents.length})
          </h3>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id_evenement}
                event={event}
                onClick={() => handleEventClick(event.id_evenement)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Événements passés */}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {t('oeuvre.pastEvents', 'Événements passés')} ({pastEvents.length})
          </h3>
          <div className="space-y-3 opacity-75">
            {pastEvents.slice(0, 5).map((event) => (
              <EventCard
                key={event.id_evenement}
                event={event}
                onClick={() => handleEventClick(event.id_evenement)}
              />
            ))}
            {pastEvents.length > 5 && (
              <Button variant="outline" className="w-full">
                {t('common.showMore', 'Voir plus')} (+{pastEvents.length - 5})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Résumé */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('oeuvre.totalEvents', 'Total des événements')}
            </span>
            <div className="flex items-center gap-2">
              {upcomingEvents.length > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  {upcomingEvents.length} {t('events.upcoming', 'à venir')}
                </Badge>
              )}
              {pastEvents.length > 0 && (
                <Badge variant="secondary">
                  {pastEvents.length} {t('events.past', 'passés')}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OeuvreEvents;
