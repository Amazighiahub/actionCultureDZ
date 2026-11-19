/**
 * ArtisanatCard — carte d'un produit artisanal (photo, matériau, artisan, technique, prix, favori).
 * Partagée par la page Artisanat et la page d'accueil. Accepte la réponse brute de l'API
 * (titre et images dans Oeuvre) comme une forme déjà simplifiée.
 */
import React from 'react';
import { useFavoriCarte } from '@/hooks/useFavoris';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, ArrowRight, Palette, Hammer, Star } from 'lucide-react';
import { LazyImage } from '@/components/shared';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { artisanatPath } from '@/utils/slug';


// Lien « étiré » : le titre porte le lien, son ::after couvre toute la carte (cliquable + crawlable)
const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring';

/** Artisan affiché sous le titre (prénom et nom, texte simple ou multilingue) */
interface ArtisanCarte {
  prenom?: unknown;
  nom?: unknown;
}

/**
 * Ce que la carte lit d'un produit (liste /artisanat ou accueil). Tout est facultatif : selon la
 * route, le serveur renvoie le titre dans Oeuvre ou directement, et les photos dans Oeuvre.Media ou medias.
 * Les textes restent « unknown » : ils passent tous par getLocalizedText.
 */
export interface ArtisanatCarteDonnees {
  id?: number;
  id_artisanat?: number;
  nom?: unknown;
  titre?: unknown;
  description?: unknown;
  image_url?: string | null;
  medias?: Array<{ url?: string }>;
  prix?: number | string | null;
  prix_min?: number | string | null;
  prix_max?: number | string | null;
  note_moyenne?: number | string | null;
  // « vues » : nom du champ dans le type du service artisanat
  statistiques?: { nombre_vues?: number; vues?: number };
  artisan?: ArtisanCarte | null;
  Materiau?: { nom?: unknown } | null;
  Technique?: { nom?: unknown } | null;
  Oeuvre?: {
    titre?: unknown;
    description?: unknown;
    Media?: Array<{ url?: string }>;
    Saiseur?: ArtisanCarte | null;
  } | null;
}

// Composant carte d'artisanat
interface ArtisanatCardProps {
  artisanat: ArtisanatCarteDonnees;
  onFavorite?: (id: number) => void;
}

const ArtisanatCard: React.FC<ArtisanatCardProps> = React.memo(({ artisanat }) => {
  const { t } = useTranslation();
  const { formatPrice, formatPriceRange } = useLocalizedNumber();

  // Extraire les données de l'artisanat (peut venir de Oeuvre ou directement)
  const rawTitre = artisanat.Oeuvre?.titre || artisanat.nom || artisanat.titre || 'Sans titre';
  const titre = getLocalizedText(rawTitre) || 'Sans titre';
  const imageUrl = artisanat.Oeuvre?.Media?.[0]?.url ||
                   artisanat.medias?.[0]?.url ||
                   artisanat.image_url ||
                   '/images/placeholder-artisanat.svg';
  const artisan = artisanat.Oeuvre?.Saiseur || artisanat.artisan;
  const description = getLocalizedText(artisanat.Oeuvre?.description ?? artisanat.description) || '';
  const materiau = getLocalizedText(artisanat.Materiau?.nom) || '';
  const technique = getLocalizedText(artisanat.Technique?.nom) || '';
  const prix = artisanat.prix || artisanat.prix_min;
  const id = artisanat.id_artisanat || artisanat.id;
  // Cœur : outil commun des cartes (état, connexion, message)
  const { isFavorite, basculer: handleFavoriteClick } = useFavoriCarte('artisanat', id as number);
  const artisanatUrl = artisanatPath(Number(id), rawTitre);


  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
      {/* Image avec lazy loading */}
      <div className="relative aspect-square overflow-hidden">
        <LazyImage
          src={imageUrl}
          maxWidth={640}
          alt={titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          fallback="/images/placeholder-artisanat.svg"
        />

        {/* Overlay au survol */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />

        {/* Badge matériau */}
        {materiau && (
          <div className="absolute top-3 start-3 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-medium flex items-center gap-1">
              <Palette className="h-3 w-3" aria-hidden="true" />
              {materiau}
            </span>
          </div>
        )}

        {/* Bouton favori */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-pressed={isFavorite}
          aria-label={isFavorite
            ? t('artisanat.removeFromFavorites', 'Retirer des favoris')
            : t('artisanat.addToFavorites', 'Ajouter aux favoris')}
          className="absolute top-3 end-3 z-10 bg-background/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-opacity hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
        </button>

        {/* Actions au survol */}
        <div className="absolute bottom-3 start-3 end-3 flex justify-between items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 text-white text-sm">
            {artisanat.statistiques?.nombre_vues !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" aria-hidden="true" />
                {artisanat.statistiques.nombre_vues}
              </span>
            )}
            {artisanat.note_moyenne != null && Number(artisanat.note_moyenne) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                {Number(artisanat.note_moyenne).toFixed(1)}
              </span>
            )}
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link
              to={artisanatUrl}
              tabIndex={-1}
              aria-label={`${t('common.view', 'Voir')} : ${titre}`}
            >
              {t('common.view', 'Voir')}
              <ArrowRight className="h-3 w-3 ms-1 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          <Link to={artisanatUrl} className={STRETCHED_LINK_CLASS}>
            {titre}
          </Link>
        </h3>

        {/* Artisan */}
        {artisan && (
          <p className="text-sm text-muted-foreground mb-2">
            {getLocalizedText(artisan.prenom)} {getLocalizedText(artisan.nom)}
          </p>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>
        )}

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {technique && (
            <Badge variant="secondary" className="text-xs">
              <Hammer className="h-3 w-3 me-1" aria-hidden="true" />
              {technique}
            </Badge>
          )}
        </div>

        {/* Prix */}
        {prix && (
          <div className="mt-3 pt-3 border-t">
            <span className="font-semibold text-primary">{artisanat.prix ? formatPrice(Number(artisanat.prix), undefined, false) : formatPriceRange(artisanat.prix_min, artisanat.prix_max)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default ArtisanatCard;
