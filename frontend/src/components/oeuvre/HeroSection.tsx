// components/oeuvre/HeroSection.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, BookOpen, Film, Music, Palette, FileText, Award, 
  Sparkles, Eye, Heart, Share2, DollarSign, Star, Download, Play,
  User, Calendar, Clock, Headphones
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { getMainImage } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';

interface HeroSectionProps {
  oeuvre: Oeuvre;
  medias: MediaExtended[];
  contributeurs: any[];
  viewCount: number;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
}

const OeuvreTypeIcon = ({ type }: { type: string }) => {
  const iconMap: Record<string, any> = {
    'Livre': BookOpen,
    'Film': Film,
    'Musique': Music,
    'Art': Palette,
   
  };
  
  const Icon = iconMap[type] || Sparkles;
  return <Icon className="h-5 w-5" />;
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  oeuvre,
  medias,
  contributeurs,
  viewCount,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
  onShare
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  
  const mainImage = getMainImage(medias);
  const typeOeuvre = oeuvre.TypeOeuvre?.nom_type || 'Œuvre';
  
  // Fonction helper pour obtenir les contributeurs principaux
  const getMainContributors = () => {
    const principaux = contributeurs.filter(c => c.role_principal);
    return principaux.length > 0 ? principaux : contributeurs.slice(0, 3);
  };

  const mainContributors = getMainContributors();

  // HERO POUR LIVRE
  if (typeOeuvre === 'Livre') {
    return (
      <div className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 min-h-[600px]">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            size="icon"
            className="mb-6 hover:bg-background/80"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Couverture du livre avec effet 3D */}
            <div className="lg:col-span-2">
              <div className="relative group mx-auto max-w-sm lg:max-w-none">
                {/* Ombre portée pour effet 3D */}
                <div className={`absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-600 transform ${rtlClasses.direction === 'rtl' ? '-translate-x-3' : 'translate-x-3'} translate-y-3 rounded-lg opacity-20 group-hover:${rtlClasses.direction === 'rtl' ? '-translate-x-4' : 'translate-x-4'} group-hover:translate-y-4 transition-transform duration-300`} />
                
                {/* Couverture */}
                <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden transform group-hover:${rtlClasses.direction === 'rtl' ? 'translate-x-1' : '-translate-x-1'} group-hover:-translate-y-1 transition-all duration-300`}>
                  {mainImage ? (
                    <img 
                      src={mainImage} 
                      alt={oeuvre.titre}
                      className="w-full aspect-[3/4] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/20 flex flex-col items-center justify-center p-8">
                      <BookOpen className="h-24 w-24 text-primary/50 mb-4" />
                      <h3 className="text-xl font-bold text-center line-clamp-3">
                        {oeuvre.titre}
                      </h3>
                    </div>
                  )}
                  
                  {/* Badges sur la couverture */}
                  {oeuvre.prix === 0 && (
                    <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                      <Badge className="bg-green-500 text-white border-0 shadow-lg">
                        {t('works.pricing.free')}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Actions au survol */}
                <div className={`absolute bottom-4 ${rtlClasses.start(4)} ${rtlClasses.end(4)} flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                  <Button size="sm" className="flex-1 shadow-lg">
                    <Eye className={`h-4 w-4 ${rtlClasses.marginEnd(1)}`} />
                    {t('works.actions.preview')}
                  </Button>
                  <Button size="icon" variant="secondary" onClick={onToggleFavorite} disabled={favoriteLoading}>
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Métadonnées du livre */}
              <Card className="mt-6 border-primary/20">
                <CardContent className="p-4 space-y-2 text-sm">
                  {oeuvre.Livre?.isbn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('works.fields.isbn')}:</span>
                      <span className="font-mono">{oeuvre.Livre.isbn}</span>
                    </div>
                  )}
                  {oeuvre.Livre?.nb_pages && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('works.fields.pages')}:</span>
                      <span>{formatNumber(oeuvre.Livre.nb_pages)}</span>
                    </div>
                  )}
                  {oeuvre.Langue && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.language')}:</span>
                      <span>{oeuvre.Langue.nom}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('works.stats.views')}:</span>
                    <span>{formatNumber(viewCount)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informations du livre */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                  <Badge className="bg-primary/90 text-primary-foreground">
                    <BookOpen className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                    {t('works.types.book')}
                  </Badge>
                  {oeuvre.annee_creation && (
                    <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                  )}
                  {oeuvre.Livre?.Genre && (
                    <Badge variant="outline">{oeuvre.Livre.Genre.nom}</Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold mb-4">{oeuvre.titre}</h1>
                
                {mainContributors.length > 0 && (
                  <div className="space-y-2">
                    {mainContributors.map((contributeur, index) => (
                      <p key={index} className="text-xl text-muted-foreground">
                        {contributeur.role} : <span className="text-foreground font-medium">
                          {contributeur.prenom} {contributeur.nom}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Prix et actions principales */}
              <div className="space-y-4">
                {oeuvre.prix !== undefined && (
                  <div className={`flex items-baseline gap-2 ${rtlClasses.flexRow}`}>
                    <span className="text-4xl font-bold text-primary">
                      {oeuvre.prix === 0 ? t('works.pricing.free') : formatPrice(oeuvre.prix)}
                    </span>
                    {oeuvre.prix > 0 && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(Math.round(oeuvre.prix * 1.2))}
                      </span>
                    )}
                  </div>
                )}
                
                <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
                  <Button size="lg" className="shadow-lg">
                    <Download className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                    {t('works.actions.readNow')}
                  </Button>
                  <Button size="lg" variant="outline">
                    <BookOpen className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                    {t('works.actions.readExcerpt')}
                  </Button>
                  <Button size="icon" variant="outline" onClick={onShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Description courte */}
              {oeuvre.description && (
                <Card className="border-primary/20">
                  <CardContent className="p-6">
                    <p className="text-lg leading-relaxed line-clamp-4">
                      {oeuvre.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Note et statistiques */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-2xl font-bold">4.8</p>
                    <p className="text-sm text-muted-foreground">
                      {t('works.stats.reviewsCount', { count: 234 })}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{formatNumber(viewCount)}</p>
                    <p className="text-sm text-muted-foreground">{t('works.stats.views')}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{t('works.stats.readingTimeValue', { hours: 3 })}</p>
                    <p className="text-sm text-muted-foreground">{t('works.stats.readingTime')}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // HERO POUR FILM
  if (typeOeuvre === 'Film') {
    return (
      <div className="relative min-h-[70vh]">
        {/* Background avec image floue */}
        <div className="absolute inset-0">
          {mainImage ? (
            <>
              <img 
                src={mainImage} 
                alt={oeuvre.titre}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className={`absolute inset-0 bg-gradient-to-${rtlClasses.direction === 'rtl' ? 'l' : 'r'} from-background via-transparent to-transparent`} />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
        </div>

        {/* Contenu */}
        <div className="relative">
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <Button 
              variant="ghost" 
              size="icon"
              className="mb-8 bg-background/10 backdrop-blur-md hover:bg-background/20"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="grid lg:grid-cols-3 gap-8 items-end min-h-[60vh] pb-12">
              {/* Affiche du film */}
              <div className="hidden lg:block">
                <div className="relative group cursor-pointer max-w-sm">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                  {mainImage ? (
                    <img 
                      src={mainImage} 
                      alt={oeuvre.titre}
                      className="w-full rounded-lg shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="aspect-[2/3] bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg shadow-2xl flex items-center justify-center">
                      <Film className="h-24 w-24 text-primary/50" />
                    </div>
                  )}
                  
                  {/* Play button au survol */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button size="lg" className="bg-white/90 text-black hover:bg-white shadow-xl">
                      <Play className={`h-6 w-6 ${rtlClasses.marginEnd(2)}`} />
                      {t('works.actions.trailer')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Informations du film */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                    <Badge className="bg-primary/90 text-primary-foreground">
                      <Film className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                      {t('works.types.film')}
                    </Badge>
                    {oeuvre.annee_creation && (
                      <Badge className="bg-background/20 backdrop-blur-sm border-white/30">
                        {oeuvre.annee_creation}
                      </Badge>
                    )}
                    {oeuvre.Film?.duree_minutes && (
                      <Badge className="bg-background/20 backdrop-blur-sm border-white/30">
                        <Clock className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                        {t('works.duration.minutes', { count: oeuvre.Film.duree_minutes })}
                      </Badge>
                    )}
                    {oeuvre.Film?.Genre && (
                      <Badge className="bg-background/20 backdrop-blur-sm border-white/30">
                        {oeuvre.Film.Genre.nom}
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-5xl lg:text-6xl font-bold mb-4">{oeuvre.titre}</h1>
                  
                  {mainContributors.length > 0 && (
                    <div className="space-y-1 text-lg opacity-90">
                      {mainContributors.map((contributeur, index) => (
                        <p key={index}>
                          {contributeur.role} : <span className="font-medium">
                            {contributeur.prenom} {contributeur.nom}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions et prix */}
                <div className="space-y-4">
                  {oeuvre.prix !== undefined && (
                    <div className="text-3xl font-bold text-primary">
                      {oeuvre.prix === 0 ? t('works.pricing.free') : formatPrice(oeuvre.prix)}
                    </div>
                  )}
                  
                  <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
                    <Button size="lg" className="bg-primary hover:bg-primary/90">
                      <Play className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                      {t('works.actions.watchNow')}
                    </Button>
                    <Button size="lg" variant="secondary">
                      <Play className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                      {t('works.actions.trailer')}
                    </Button>
                    <Button size="lg" variant="outline" onClick={onToggleFavorite} disabled={favoriteLoading}>
                      <Heart className={`h-5 w-5 ${rtlClasses.marginEnd(2)} ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                      {t('works.actions.myList')}
                    </Button>
                    <Button size="icon" variant="outline" onClick={onShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Synopsis */}
                {oeuvre.description && (
                  <Card className="bg-background/80 backdrop-blur-sm border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-3">{t('works.sections.synopsis')}</h3>
                      <p className="text-lg leading-relaxed line-clamp-4">
                        {oeuvre.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // HERO POUR MUSIQUE
  if (typeOeuvre === 'Musique' || typeOeuvre === 'AlbumMusical') {
    return (
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 min-h-[500px]">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            size="icon"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Cover de l'album */}
            <div className="flex justify-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-lg blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                <div className="relative">
                  {mainImage ? (
                    <img 
                      src={mainImage} 
                      alt={oeuvre.titre}
                      className="w-full max-w-md aspect-square object-cover rounded-lg shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full max-w-md aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg shadow-2xl flex items-center justify-center">
                      <Music className="h-32 w-32 text-primary/50" />
                    </div>
                  )}
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button size="lg" variant="secondary" className={`rounded-full w-20 h-20 shadow-xl opacity-90 hover:opacity-100`}>
                      <Play className={`h-8 w-8 ${rtlClasses.direction === 'rtl' ? 'mr-1' : 'ml-1'}`} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations de l'album */}
            <div className={`space-y-6 text-center lg:${rtlClasses.textStart}`}>
              <div>
                <div className={`flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4 ${rtlClasses.flexRow}`}>
                  <Badge className="bg-primary/90 text-primary-foreground">
                    <Music className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                    {t('works.types.album')}
                  </Badge>
                  {oeuvre.annee_creation && (
                    <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                  )}
                  {oeuvre.AlbumMusical?.Genre && (
                    <Badge variant="outline">{oeuvre.AlbumMusical.Genre.nom}</Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold mb-4">{oeuvre.titre}</h1>
                
                {mainContributors.length > 0 && (
                  <p className="text-xl text-muted-foreground">
                    {mainContributors[0].prenom} {mainContributors[0].nom}
                  </p>
                )}

                {oeuvre.AlbumMusical && (
                  <div className={`flex items-center justify-center lg:justify-start gap-4 mt-4 text-sm text-muted-foreground ${rtlClasses.flexRow}`}>
                    {oeuvre.AlbumMusical.duree && (
                      <span>{t('works.album.tracksCount', { count: oeuvre.AlbumMusical.duree })}</span>
                    )}
                    {oeuvre.AlbumMusical.duree && (
                      <span>• {t('works.duration.minutes', { count: oeuvre.AlbumMusical.duree })}</span>
                    )}
                    <span>• {t('works.stats.listensCount', { count: viewCount })}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-4">
                {oeuvre.prix !== undefined && (
                  <div className="text-3xl font-bold text-primary">
                    {oeuvre.prix === 0 ? t('works.pricing.free') : formatPrice(oeuvre.prix)}
                  </div>
                )}
                
                <div className={`flex flex-wrap justify-center lg:justify-start gap-3 ${rtlClasses.flexRow}`}>
                  <Button size="lg" className="shadow-lg">
                    <Headphones className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                    {t('works.actions.listenNow')}
                  </Button>
                  <Button size="lg" variant="outline" onClick={onToggleFavorite} disabled={favoriteLoading}>
                    <Heart className={`h-5 w-5 ${rtlClasses.marginEnd(2)} ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                    {t('works.actions.favorites')}
                  </Button>
                  <Button size="icon" variant="outline" onClick={onShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Description */}
              {oeuvre.description && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed line-clamp-3">
                      {oeuvre.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // HERO PAR DÉFAUT (Art, Article, Artisanat, etc.)
  return (
    <div className="relative">
      <div className="h-[40vh] relative overflow-hidden">
        {mainImage ? (
          <>
            <img 
              src={mainImage} 
              alt={oeuvre.titre}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <OeuvreTypeIcon type={typeOeuvre} />
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="icon"
          className={`absolute top-4 ${rtlClasses.start(4)} bg-background/10 backdrop-blur-md hover:bg-background/20`}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="container max-w-6xl">
            <div className="space-y-4">
              <div className={`flex items-center gap-3 ${rtlClasses.flexRow}`}>
                <Badge className="bg-primary/90 backdrop-blur-sm text-primary-foreground">
                  <OeuvreTypeIcon type={typeOeuvre} />
                  <span className={rtlClasses.marginStart(2)}>{typeOeuvre}</span>
                </Badge>
                {oeuvre.annee_creation && (
                  <Badge variant="secondary" className="backdrop-blur-sm">
                    {oeuvre.annee_creation}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold">
                {oeuvre.titre}
              </h1>
              {mainContributors.length > 0 && (
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <User className="h-4 w-4" />
                  <span className="text-lg">
                    {t('common.by')} {mainContributors.map(c => `${c.prenom} ${c.nom}`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};