/**
 * RelatedEvents - Événements similaires/liés
 * Affiche une liste d'événements similaires à l'événement actuel
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  Calendar, MapPin, Users, ArrowRight, ChevronRight,
  Sparkles, Loader2
} from 'lucide-react';
import { LazyImage, StatusBadge, EmptyState } from '@/components/shared';
import { evenementService } from '@/services/evenement.service';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useTranslateData } from '@/hooks/useTranslateData';
import { cn } from '@/lib/utils';
import type { Evenement } from '@/types/models/evenement.types';

interface RelatedEventsProps {
  eventId: number;
  typeEvenementId?: number;
  wilayaId?: number;
  limit?: number;
}

// Carte d'événement compact
interface EventMiniCardProps {
  event: Evenement;
  onClick: () => void;
}

const EventMiniCard: React.FC<EventMiniCardProps> = ({ event, onClick }) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatPrice } = useLocalizedNumber();
  const { td, safe } = useTranslateData();

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <LazyImage
            src={event.image_url || '/images/placeholder-event.png'}
            alt={td(event.nom_evenement)}
            className="w-full h-full object-cover"
            fallback="/images/placeholder-event.png"
          />
          {/* Date badge */}
          {event.date_debut && (
            <div className="absolute bottom-1 left-1 bg-background/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-medium">
              {new Date(event.date_debut).getDate()}/{new Date(event.date_debut).getMonth() + 1}
            </div>
          )}
        </div>

        {/* Contenu */}
        <CardContent className="flex-1 p-3">
          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {td(event.nom_evenement)}
          </h4>

          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
            {event.Lieu && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{td(event.Lieu.nom)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {event.tarif === 0 ? (
                <Badge variant="secondary" className="text-xs h-5">
                  {t('events.free', 'Gratuit')}
                </Badge>
              ) : (
                <span className="font-medium text-primary">
                  {formatPrice(event.tarif)}
                </span>
              )}
              
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

// Composant carte large (pour le premier événement)
interface EventFeatureCardProps {
  event: Evenement;
  onClick: () => void;
}

const EventFeatureCard: React.FC<EventFeatureCardProps> = ({ event, onClick }) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatPrice } = useLocalizedNumber();
  const { td, safe } = useTranslateData();

  const capacityPercentage = event.capacite_max
    ? Math.round((event.nombre_inscrits || 0) / event.capacite_max * 100)
    : 0;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <LazyImage
          src={event.image_url || '/images/placeholder-event.png'}
          alt={td(event.nom_evenement)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback="/images/placeholder-event.png"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Badge statut */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={event.statut} />
        </div>

        {/* Date */}
        {event.date_debut && (
          <div className="absolute bottom-3 right-3 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
            <div className="text-center">
              <div className="text-lg font-bold leading-none">
                {new Date(event.date_debut).getDate()}
              </div>
              <div className="text-xs uppercase text-muted-foreground">
                {new Date(event.date_debut).toLocaleDateString('fr-FR', { month: 'short' })}
              </div>
            </div>
          </div>
        )}

        {/* Titre superposé */}
        <div className="absolute bottom-3 left-3 right-16">
          <h3 className="text-white font-semibold text-lg line-clamp-2">
            {td(event.nom_evenement)}
          </h3>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          {/* Lieu */}
          {event.Lieu && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{td(event.Lieu.nom)}</span>
            </div>
          )}

          {/* Date complète */}
          {event.date_debut && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatDate(event.date_debut, { dateStyle: 'long' })}</span>
            </div>
          )}

          {/* Capacité */}
          {event.capacite_max && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>{safe(event.nombre_inscrits, '0')} / {safe(event.capacite_max)}</span>
              {capacityPercentage >= 90 && (
                <Badge variant="destructive" className="text-xs">
                  {t('events.almostFull', 'Presque complet')}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Prix et action */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          {event.tarif === 0 ? (
            <Badge className="bg-green-500 text-white">
              {t('events.free', 'Gratuit')}
            </Badge>
          ) : (
            <span className="font-semibold text-primary text-lg">
              {formatPrice(event.tarif)}
            </span>
          )}
          
          <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
            {t('common.viewDetails', 'Voir')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant principal
const RelatedEvents: React.FC<RelatedEventsProps> = ({
  eventId,
  typeEvenementId,
  wilayaId,
  limit = 4
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Charger les événements similaires
  const { data: relatedEvents, isLoading, error } = useQuery({
    queryKey: ['related-events', eventId, typeEvenementId, wilayaId],
    queryFn: async () => {
      // Rechercher des événements similaires
      const response = await evenementService.search({
        // Filtrer par type si disponible
        ...(typeEvenementId && { type_evenement_id: typeEvenementId }),
        // Filtrer par wilaya si disponible
        ...(wilayaId && { wilaya_id: wilayaId }),
        // Exclure l'événement actuel
        exclude_id: eventId,
        // Limiter aux événements à venir
        statut: 'publie',
        limit
      });

      if (response.success && response.data) {
        // Filtrer pour exclure l'événement actuel si le backend ne le fait pas
        return response.data.items.filter(e => e.id_evenement !== eventId).slice(0, limit);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!eventId
  });

  // Navigation
  const handleEventClick = (id: number) => {
    navigate(`/evenements/${id}`);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Voir tous les événements
  const handleViewAll = () => {
    navigate('/evenements');
  };

  // Chargement
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('event.relatedEvents', 'Événements similaires')}
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Pas d'événements similaires
  if (!relatedEvents || relatedEvents.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('event.relatedEvents', 'Événements similaires')}
        </h2>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            {t('event.noRelatedEvents', 'Aucun événement similaire pour le moment')}
          </p>
          <Button variant="outline" onClick={handleViewAll}>
            {t('event.browseAllEvents', 'Parcourir tous les événements')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Card>
      </div>
    );
  }

  // Séparer le premier événement (carte large) des autres (cartes compactes)
  const [featuredEvent, ...otherEvents] = relatedEvents;

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('event.relatedEvents', 'Événements similaires')}
        </h2>
        <Button variant="ghost" onClick={handleViewAll}>
          {t('common.viewAll', 'Voir tout')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Grille d'événements */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Événement mis en avant */}
        {featuredEvent && (
          <div className="md:col-span-2 lg:col-span-1">
            <EventFeatureCard
              event={featuredEvent}
              onClick={() => handleEventClick(featuredEvent.id_evenement)}
            />
          </div>
        )}

        {/* Autres événements */}
        <div className="space-y-3 lg:col-span-2">
          {otherEvents.map((event) => (
            <EventMiniCard
              key={event.id_evenement}
              event={event}
              onClick={() => handleEventClick(event.id_evenement)}
            />
          ))}
        </div>
      </div>

      {/* Bouton voir plus */}
      {relatedEvents.length >= limit && (
        <div className="text-center">
          <Button variant="outline" onClick={handleViewAll}>
            {t('event.moreEvents', 'Découvrir plus d\'événements')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RelatedEvents;
