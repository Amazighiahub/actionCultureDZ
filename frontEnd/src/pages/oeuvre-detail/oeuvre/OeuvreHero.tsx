/**
 * OeuvreHero - Section héro de la page détail œuvre
 * Affiche l'image principale, titre, type, et boutons d'action
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { 
  Heart, Share2, Eye, Calendar, BookOpen, 
  Star, ExternalLink, Download
} from 'lucide-react';
import { LazyImage, StatusBadge } from '@/components/shared';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { Media } from '@/types/models/media.types';

interface OeuvreHeroProps {
  oeuvre: Oeuvre;
  mainImage?: Media;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const OeuvreHero: React.FC<OeuvreHeroProps> = ({ 
  oeuvre, 
  mainImage,
  isFavorite, 
  onToggleFavorite 
}) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();

  // Partager l'œuvre
  const handleShare = async () => {
    const shareData = {
      title: oeuvre.titre,
      text: oeuvre.description?.substring(0, 100) || '',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // L'utilisateur a annulé le partage
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Image principale
  const imageUrl = mainImage?.url || oeuvre.image_url || oeuvre.couverture_url || '/images/placeholder-oeuvre.png';

  return (
    <section className="relative">
      {/* Image de fond avec overlay */}
      <div className="relative h-[50vh] min-h-[400px] max-h-[600px]">
        <LazyImage
          src={imageUrl}
          alt={oeuvre.titre}
          className="w-full h-full object-cover"
          fallback="/images/placeholder-oeuvre.png"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Contenu superposé */}
        <div className="absolute inset-0 flex items-end">
          <div className="container pb-8">
            <div className="max-w-4xl space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={oeuvre.statut} />
                
                {oeuvre.TypeOeuvre && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {oeuvre.TypeOeuvre.nom_type}
                  </Badge>
                )}
                
                {oeuvre.Genres && oeuvre.Genres.length > 0 && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    {oeuvre.Genres[0].nom}
                  </Badge>
                )}
                
                {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                  <Badge className="bg-yellow-500 text-black">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {oeuvre.note_moyenne.toFixed(1)}
                  </Badge>
                )}
              </div>

              {/* Titre */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-serif">
                {oeuvre.titre}
              </h1>

              {/* Sous-titre si présent */}
              {oeuvre.sous_titre && (
                <p className="text-xl text-white/80 italic">
                  {oeuvre.sous_titre}
                </p>
              )}

              {/* Infos principales */}
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                {/* Année */}
                {oeuvre.annee_creation && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>{oeuvre.annee_creation}</span>
                  </div>
                )}

                {/* Vues */}
                {oeuvre.nombre_vues !== undefined && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    <span>{oeuvre.nombre_vues.toLocaleString()} {t('oeuvre.views', 'vues')}</span>
                  </div>
                )}

                {/* Langue */}
                {oeuvre.Langue && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/70">{oeuvre.Langue.nom}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
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
                    ? t('oeuvre.removeFromFavorites', 'Retirer des favoris')
                    : t('oeuvre.addToFavorites', 'Ajouter aux favoris')
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
                {oeuvre.lien_externe && (
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30"
                  >
                    <a href={oeuvre.lien_externe} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      {t('oeuvre.externalLink', 'Voir plus')}
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

export default OeuvreHero;
