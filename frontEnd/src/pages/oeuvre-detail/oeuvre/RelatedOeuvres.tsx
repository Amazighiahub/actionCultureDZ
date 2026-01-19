/**
 * RelatedOeuvres - Œuvres similaires
 * Affiche des œuvres du même type ou catégorie
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  BookOpen, Star, Eye, ArrowRight, ChevronRight,
  Sparkles, Loader2
} from 'lucide-react';
import { LazyImage, StatusBadge } from '@/components/shared';
import { oeuvreService } from '@/services/oeuvre.service';
import type { Oeuvre } from '@/types/models/oeuvre.types';

interface RelatedOeuvresProps {
  oeuvreId: number;
  typeId?: number;
  limit?: number;
}

// Carte d'œuvre compacte
const OeuvreCard: React.FC<{ oeuvre: Oeuvre; onClick: () => void }> = ({ oeuvre, onClick }) => {
  const { t } = useTranslation();

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <LazyImage
          src={oeuvre.image_url || oeuvre.couverture_url || '/images/placeholder-oeuvre.png'}
          alt={oeuvre.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback="/images/placeholder-oeuvre.png"
        />
        
        {/* Overlay au survol */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        
        {/* Badge type */}
        {oeuvre.TypeOeuvre && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs">
              {oeuvre.TypeOeuvre.nom_type}
            </Badge>
          </div>
        )}

        {/* Note */}
        {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500 text-black text-xs">
              <Star className="h-3 w-3 mr-0.5 fill-current" />
              {oeuvre.note_moyenne.toFixed(1)}
            </Badge>
          </div>
        )}
      </div>

      {/* Contenu */}
      <CardContent className="p-3">
        <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {oeuvre.titre}
        </h4>
        
        {oeuvre.sous_titre && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 italic">
            {oeuvre.sous_titre}
          </p>
        )}

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          {oeuvre.annee_creation && (
            <span>{oeuvre.annee_creation}</span>
          )}
          {oeuvre.nombre_vues !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {oeuvre.nombre_vues.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Composant principal
const RelatedOeuvres: React.FC<RelatedOeuvresProps> = ({
  oeuvreId,
  typeId,
  limit = 4
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Charger les œuvres similaires
  const { data: relatedOeuvres, isLoading, error } = useQuery({
    queryKey: ['related-oeuvres', oeuvreId, typeId],
    queryFn: async () => {
      // Rechercher des œuvres du même type
      const response = await oeuvreService.search({
        ...(typeId && { type_oeuvre_id: typeId }),
        exclude_id: oeuvreId,
        statut: 'publie',
        limit
      });

      if (response.success && response.data) {
        return response.data.items
          .filter((o: Oeuvre) => o.id_oeuvre !== oeuvreId)
          .slice(0, limit);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!oeuvreId
  });

  const handleOeuvreClick = (id: number) => {
    navigate(`/oeuvres/${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAll = () => {
    navigate('/oeuvres');
  };

  // Chargement
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('oeuvre.relatedOeuvres', 'Œuvres similaires')}
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Pas d'œuvres similaires
  if (!relatedOeuvres || relatedOeuvres.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('oeuvre.relatedOeuvres', 'Œuvres similaires')}
        </h2>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            {t('oeuvre.noRelatedOeuvres', 'Aucune œuvre similaire pour le moment')}
          </p>
          <Button variant="outline" onClick={handleViewAll}>
            {t('oeuvre.browseAllOeuvres', 'Parcourir toutes les œuvres')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          {t('oeuvre.relatedOeuvres', 'Œuvres similaires')}
        </h2>
        <Button variant="ghost" onClick={handleViewAll}>
          {t('common.viewAll', 'Voir tout')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {relatedOeuvres.map((oeuvre: Oeuvre) => (
          <OeuvreCard
            key={oeuvre.id_oeuvre}
            oeuvre={oeuvre}
            onClick={() => handleOeuvreClick(oeuvre.id_oeuvre)}
          />
        ))}
      </div>

      {/* Bouton voir plus */}
      {relatedOeuvres.length >= limit && (
        <div className="text-center">
          <Button variant="outline" onClick={handleViewAll}>
            {t('oeuvre.moreOeuvres', 'Découvrir plus d\'œuvres')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RelatedOeuvres;
