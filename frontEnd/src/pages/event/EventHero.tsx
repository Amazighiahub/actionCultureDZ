/**
 * EventHero - Section héro de la page détail événement
 * Affiche l'image principale, titre, dates, lieu et bouton favoris
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  Calendar, MapPin, Clock, Users, Heart, Share2,
  Ticket, ExternalLink
} from 'lucide-react';
import { LazyImage, StatusBadge } from '@/components/shared';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useTranslateData } from '@/hooks/useTranslateData';
import type { Evenement } from '@/types/models/evenement.types';

interface EventHeroProps {
  event: Evenement;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const EventHero: React.FC<EventHeroProps> = ({
  event,
  isFavorite,
  onToggleFavorite
}) => {
  const { t } = useTranslation();
  const { formatDate, formatDateRange } = useLocalizedDate();
  const { formatPrice } = useLocalizedNumber();
  const { td, safe } = useTranslateData();

  // Calculer le pourcentage de remplissage
  const capacityPercentage = event.capacite_max 
    ? Math.round((event.nombre_inscrits || 0) / event.capacite_max * 100)
    : 0;

  // Partager l'événement
  const handleShare = async () => {
    const eventTitle = td(event.nom_evenement);
    const eventDesc = td(event.description);
    const shareData = {
      title: eventTitle,
      text: eventDesc?.substring(0, 100) || '',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // L'utilisateur a annulé le partage
      }
    } else {
      // Fallback: copier le lien
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <section className="relative">
      {/* Image de fond avec overlay */}
      <div className="relative h-[50vh] min-h-[400px] max-h-[600px]">
        <LazyImage
          src={event.image_url || '/images/placeholder-event.png'}
          alt={td(event.nom_evenement)}
          className="w-full h-full object-cover"
          fallback="/images/placeholder-event.png"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Contenu superposé */}
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-8">
            <div className="max-w-4xl space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={event.statut} />
                
                {event.TypeEvenement && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {td(event.TypeEvenement.nom_type) || td(event.TypeEvenement)}
                  </Badge>
                )}
                
                {event.tarif === 0 && (
                  <Badge className="bg-green-500 text-white">
                    {t('events.free', 'Gratuit')}
                  </Badge>
                )}
                
                {capacityPercentage >= 90 && (
                  <Badge variant="destructive">
                    {t('events.almostFull', 'Presque complet')}
                  </Badge>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-serif">
                {td(event.nom_evenement)}
              </h1>

              {/* Infos principales */}
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                {/* Dates */}
                {event.date_debut && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>
                      {event.date_fin && event.date_fin !== event.date_debut
                        ? formatDateRange(event.date_debut, event.date_fin, { dateStyle: 'long' })
                        : formatDate(event.date_debut, { dateStyle: 'long' })
                      }
                    </span>
                  </div>
                )}

                {/* Lieu */}
                {event.Lieu && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span>{td(event.Lieu.nom)}</span>
                    {event.Lieu.Commune?.Daira?.Wilaya && (
                      <span className="text-white/70">
                        ({td(event.Lieu.Commune.Daira.Wilaya.nom)})
                      </span>
                    )}
                  </div>
                )}

                {/* Capacité */}
                {event.capacite_max && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>
                      {safe(event.nombre_inscrits, '0')} / {safe(event.capacite_max)} {t('events.participants', 'participants')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Prix */}
                {event.tarif > 0 && (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <Ticket className="h-5 w-5 text-white" />
                    <span className="text-xl font-bold text-white">
                      {formatPrice(event.tarif)}
                    </span>
                  </div>
                )}

                {/* Bouton favoris */}
                <Button
                  variant={isFavorite ? "default" : "outline"}
                  size="lg"
                  onClick={onToggleFavorite}
                  className={isFavorite 
                    ? "bg-red-500 hover:bg-red-600 border-0" 
                    : "bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                  }
                >
                  <Heart className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite 
                    ? t('events.removeFromFavorites', 'Retirer des favoris')
                    : t('events.addToFavorites', 'Ajouter aux favoris')
                  }
                </Button>

                {/* Bouton partage */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleShare}
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  {t('common.share', 'Partager')}
                </Button>

                {/* Lien externe si disponible */}
                {event.contact_email && (
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                  >
                    <a href={`mailto:${event.contact_email}`}>
                      <ExternalLink className="h-5 w-5 mr-2" />
                      {t('events.contact', 'Contact')}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventHero;
