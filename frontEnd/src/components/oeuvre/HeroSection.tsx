// components/oeuvre/HeroSection.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/UI/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/UI/popover';
import {
  ChevronLeft, BookOpen, Film, Music, Palette, FileText,
  Sparkles, Eye, Heart, Share2, Star, Play, MessageCircle,
  User, Calendar, Clock, Headphones, RotateCcw, Quote, Globe,
  BookMarked, Facebook, Twitter, Link as LinkIcon, Copy
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { getMainImage } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  oeuvre: Oeuvre;
  medias: MediaExtended[];
  contributeurs: any[];
  viewCount: number;
  commentsCount?: number;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onToggleFavorite: () => void;
  onShare?: () => void; // Optional - le composant gère le partage en interne maintenant
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
  commentsCount = 0,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatNumber, formatPrice } = useLocalizedNumber();
  const { rtlClasses } = useRTL();

  // État pour l'effet flip du livre
  const [isFlipped, setIsFlipped] = useState(false);
  // État pour le menu de partage
  const [shareOpen, setShareOpen] = useState(false);
  // État pour la modal d'extrait
  const [showExcerpt, setShowExcerpt] = useState(false);

  // Fonction de partage
  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = t('oeuvre.share.text', 'Découvrez "{{title}}" - {{type}}', {
      title: oeuvre.titre,
      type: oeuvre.TypeOeuvre?.nom_type || 'Œuvre'
    });

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
    }
    setShareOpen(false);
  };

  // Composant bouton de partage avec Popover
  const ShareButton = ({
    variant = "outline",
    className = "",
    iconOnly = false,
    size = "lg"
  }: {
    variant?: "outline" | "default" | "ghost";
    className?: string;
    iconOnly?: boolean;
    size?: "default" | "sm" | "lg" | "icon";
  }) => (
    <Popover open={shareOpen} onOpenChange={setShareOpen}>
      <PopoverTrigger asChild>
        <Button size={iconOnly ? "icon" : size} variant={variant} className={className}>
          <Share2 className={cn("h-5 w-5", !iconOnly && "mr-2")} />
          {!iconOnly && t('common.share', 'Partager')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => handleShare('facebook')}
            className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
          >
            <Facebook className="h-4 w-4 text-blue-600" />
            <span>Facebook</span>
          </button>
          <button
            onClick={() => handleShare('twitter')}
            className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
          >
            <Twitter className="h-4 w-4 text-sky-500" />
            <span>Twitter</span>
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
            <span>{t('common.copyLink', 'Copier le lien')}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
  
  const mainImage = getMainImage(medias);
  const typeOeuvre = oeuvre.TypeOeuvre?.nom_type || 'Œuvre';
  
  // Fonction helper pour obtenir les contributeurs principaux
  const getMainContributors = () => {
    const principaux = contributeurs.filter(c => c.role_principal);
    return principaux.length > 0 ? principaux : contributeurs.slice(0, 3);
  };

  const mainContributors = getMainContributors();

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR LIVRE - AVEC EFFET FLIP COUVERTURE AVANT/ARRIÈRE
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeOeuvre === 'Livre') {
    return (
      <div className="relative bg-gradient-to-br from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10 min-h-[650px]">
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
            
            {/* ════════════════════════════════════════════════════════════════ */}
            {/* LIVRE 3D AVEC EFFET FLIP */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-2">
              <div 
                className="relative mx-auto min-w-[280px] max-w-sm lg:max-w-none"
                style={{ perspective: '1200px' }}
              >
                {/* Conteneur du livre avec effet flip */}
                <div
                  className={cn(
                    "relative w-full aspect-[3/4] cursor-pointer transition-all duration-700 ease-in-out",
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped 
                      ? `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})` 
                      : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* ══════════════════════════════════════════════════════════ */}
                  {/* COUVERTURE AVANT */}
                  {/* ══════════════════════════════════════════════════════════ */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                    <div className="relative w-full h-full group">
                      {/* Effet de tranche du livre (gauche) */}
                      <div 
                        className={cn(
                          "absolute top-0 bottom-0 w-6 bg-gradient-to-r z-10",
                          "from-amber-200 via-amber-100 to-amber-50",
                          "dark:from-amber-900 dark:via-amber-800 dark:to-amber-700"
                        )}
                        style={{
                          [rtlClasses.direction === 'rtl' ? 'right' : 'left']: 0,
                          transform: `translateX(${rtlClasses.direction === 'rtl' ? '100%' : '-100%'})`,
                          boxShadow: rtlClasses.direction === 'rtl' 
                            ? 'inset -3px 0 8px rgba(0,0,0,0.15)' 
                            : 'inset 3px 0 8px rgba(0,0,0,0.15)',
                          borderRadius: rtlClasses.direction === 'rtl' ? '0 4px 4px 0' : '4px 0 0 4px'
                        }}
                      >
                        {/* Lignes de pages */}
                        <div className="absolute inset-y-2 inset-x-1 flex flex-col justify-between opacity-30">
                          {[...Array(20)].map((_, i) => (
                            <div key={i} className="h-px bg-amber-600/50" />
                          ))}
                        </div>
                      </div>
                      
                      {/* Ombre portée 3D */}
                      <div 
                        className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6"
                        style={{ filter: 'blur(8px)' }}
                      />
                      
                      {/* Couverture principale */}
                      <div className="relative w-full h-full rounded-r-lg overflow-hidden shadow-2xl border-l-4 border-amber-700/30 dark:border-amber-500/30">
                        {mainImage ? (
                          <img 
                            src={mainImage} 
                            alt={oeuvre.titre}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 flex flex-col items-center justify-center p-8">
                            <BookOpen className="h-24 w-24 text-amber-600/50 dark:text-amber-400/50 mb-4" />
                            <h3 className="text-xl font-bold text-center line-clamp-3 text-amber-900 dark:text-amber-100">
                              {oeuvre.titre}
                            </h3>
                          </div>
                        )}
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                        
                        {/* Badge gratuit */}
                        {oeuvre.prix === 0 && (
                          <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                            <Badge className="bg-green-500 text-white border-0 shadow-lg">
                              {t('works.pricing.free', 'Gratuit')}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Note */}
                        {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                          <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                            <Badge className="bg-yellow-500 text-black shadow-lg">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {oeuvre.note_moyenne.toFixed(1)}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Infos en bas de couverture */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <h2 className="text-2xl font-bold font-serif mb-1 line-clamp-2 drop-shadow-lg">
                            {oeuvre.titre}
                          </h2>
                          {mainContributors.length > 0 && (
                            <p className="text-white/90 font-medium drop-shadow">
                              {mainContributors[0].prenom} {mainContributors[0].nom}
                            </p>
                          )}
                        </div>
                        
                        {/* Indicateur de flip */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                            <RotateCcw className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        
                        {/* Effet de brillance */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* ══════════════════════════════════════════════════════════ */}
                  {/* COUVERTURE ARRIÈRE (DOS DU LIVRE) */}
                  {/* ══════════════════════════════════════════════════════════ */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ 
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})`
                    }}
                  >
                    <div className="relative w-full h-full group">
                      {/* Effet de tranche du livre (droite pour le dos) */}
                      <div 
                        className={cn(
                          "absolute top-0 bottom-0 w-6 bg-gradient-to-l z-10",
                          "from-amber-200 via-amber-100 to-amber-50",
                          "dark:from-amber-900 dark:via-amber-800 dark:to-amber-700"
                        )}
                        style={{
                          [rtlClasses.direction === 'rtl' ? 'left' : 'right']: 0,
                          transform: `translateX(${rtlClasses.direction === 'rtl' ? '-100%' : '100%'})`,
                          boxShadow: rtlClasses.direction === 'rtl' 
                            ? 'inset 3px 0 8px rgba(0,0,0,0.15)' 
                            : 'inset -3px 0 8px rgba(0,0,0,0.15)',
                          borderRadius: rtlClasses.direction === 'rtl' ? '4px 0 0 4px' : '0 4px 4px 0'
                        }}
                      >
                        {/* Lignes de pages */}
                        <div className="absolute inset-y-2 inset-x-1 flex flex-col justify-between opacity-30">
                          {[...Array(20)].map((_, i) => (
                            <div key={i} className="h-px bg-amber-600/50" />
                          ))}
                        </div>
                      </div>
                      
                      {/* Ombre portée */}
                      <div 
                        className="absolute inset-0 bg-black/20 rounded-lg transform -translate-x-4 translate-y-4 -z-10"
                        style={{ filter: 'blur(8px)' }}
                      />
                      
                      {/* Contenu du dos */}
                      <div className={cn(
                        "relative w-full h-full overflow-hidden shadow-2xl",
                        "bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950",
                        "dark:from-amber-900 dark:via-amber-950 dark:to-black",
                        rtlClasses.direction === 'rtl' ? 'rounded-r-lg border-l-4' : 'rounded-l-lg border-r-4',
                        "border-amber-600/30"
                      )}>
                        {/* Motif décoratif en fond */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="absolute inset-0" style={{
                            backgroundImage: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 10px,
                              rgba(255,255,255,0.1) 10px,
                              rgba(255,255,255,0.1) 20px
                            )`
                          }} />
                        </div>
                        
                        <div className="relative h-full flex flex-col p-6 text-amber-50">
                          {/* En-tête */}
                          <div className="flex items-center justify-between mb-4">
                            <BookMarked className="h-8 w-8 text-amber-400" />
                            <Badge variant="outline" className="border-amber-400/50 text-amber-200 bg-amber-950/50">
                              {oeuvre.TypeOeuvre?.nom_type || 'Livre'}
                            </Badge>
                          </div>
                          
                          {/* Titre */}
                          <h3 className="text-xl font-bold font-serif mb-3 text-amber-100">
                            {oeuvre.titre}
                          </h3>
                          
                          {/* Citation / Description */}
                          <div className="flex-1 overflow-hidden">
                            <Quote className="h-5 w-5 text-amber-500/50 mb-2" />
                            <p className="text-sm leading-relaxed text-amber-100/90 line-clamp-[8]">
                              {oeuvre.description || t('works.noDescription', 'Aucune description disponible pour cet ouvrage.')}
                            </p>
                          </div>
                          
                          {/* Séparateur décoratif */}
                          <div className="my-4 flex items-center gap-2">
                            <div className="flex-1 h-px bg-amber-600/30" />
                            <Sparkles className="h-4 w-4 text-amber-500/50" />
                            <div className="flex-1 h-px bg-amber-600/30" />
                          </div>
                          
                          {/* Métadonnées */}
                          <div className="space-y-2 text-sm">
                            {/* ISBN */}
                            {oeuvre.Livre?.isbn && (
                              <div className="flex items-center justify-between text-amber-200/80">
                                <span>ISBN</span>
                                <span className="font-mono text-xs">{oeuvre.Livre.isbn}</span>
                              </div>
                            )}
                            
                            {/* Pages */}
                            {oeuvre.Livre?.nb_pages && (
                              <div className="flex items-center justify-between text-amber-200/80">
                                <span>{t('works.fields.pages', 'Pages')}</span>
                                <span>{formatNumber(oeuvre.Livre.nb_pages)}</span>
                              </div>
                            )}
                            
                            {/* Langue */}
                            {oeuvre.Langue && (
                              <div className="flex items-center gap-2 text-amber-200/80">
                                <Globe className="h-4 w-4" />
                                <span>{oeuvre.Langue.nom}</span>
                              </div>
                            )}
                            
                            {/* Année */}
                            {oeuvre.annee_creation && (
                              <div className="flex items-center gap-2 text-amber-200/80">
                                <Calendar className="h-4 w-4" />
                                <span>{oeuvre.annee_creation}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Indicateur flip */}
                          <div className="mt-4 text-center">
                            <span className="text-xs text-amber-400/60 flex items-center justify-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              {t('works.flipToFront', 'Cliquez pour voir la couverture')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Instruction flip (en dessous du livre) */}
                <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {isFlipped 
                    ? t('works.viewCover', 'Voir la couverture')
                    : t('works.viewSummary', 'Voir le résumé au dos')
                  }
                </p>
              </div>

              {/* Actions sous le livre */}
              <div className="flex gap-2 mt-6 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  onClick={onToggleFavorite} 
                  disabled={favoriteLoading}
                  variant={isFavorite ? "default" : "outline"}
                  className={cn(isFavorite && "bg-red-500 hover:bg-red-600")}
                >
                  <Heart className={cn("h-5 w-5 mr-2", isFavorite && "fill-current")} />
                  {isFavorite ? t('works.inFavorites', 'Favori') : t('works.actions.addFavorite', 'Favoris')}
                </Button>
                <ShareButton />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* INFORMATIONS DU LIVRE (DROITE) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                  <Badge className="bg-amber-600 text-white">
                    <BookOpen className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                    {t('works.types.book', 'Livre')}
                  </Badge>
                  {oeuvre.annee_creation && (
                    <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                  )}
                  {oeuvre.Livre?.Genre && (
                    <Badge variant="secondary">{oeuvre.Livre.Genre.nom}</Badge>
                  )}
                  {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {oeuvre.note_moyenne.toFixed(1)}
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold font-serif mb-4">{typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}</h1>
                
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

              {/* Prix */}
              {oeuvre.prix !== undefined && (
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-primary">
                    {oeuvre.prix === 0 ? t('works.pricing.free', 'Gratuit') : formatPrice(oeuvre.prix)}
                  </span>
                </div>
              )}

              {/* Actions principales */}
              <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
                <Button 
                  size="lg" 
                  className="shadow-lg"
                  onClick={() => setShowExcerpt(true)}
                >
                  <Eye className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                  {t('works.actions.readExcerpt', 'Lire un extrait')}
                </Button>
              </div>

              {/* Modal Extrait */}
              <Dialog open={showExcerpt} onOpenChange={setShowExcerpt}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {t('works.excerpt.title', 'Extrait de')} "{typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}"
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    {oeuvre.description ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed whitespace-pre-wrap">
                        {typeof oeuvre.description === 'string' ? oeuvre.description : (oeuvre.description as any)?.fr || ''}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        {t('works.excerpt.noContent', "Aucun contenu disponible pour cet ouvrage.")}
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Description */}
              {oeuvre.description && (
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {t('works.synopsis', 'Synopsis')}
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      {oeuvre.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Vues et Avis */}
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <span className="font-medium">{formatNumber(viewCount)}</span>
                  <span className="text-sm">{t('works.stats.views', 'vues')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-medium">{formatNumber(commentsCount)}</span>
                  <span className="text-sm">{t('works.stats.reviews', 'avis')}</span>
                </div>
                {oeuvre.Livre?.nb_pages && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">{formatNumber(oeuvre.Livre.nb_pages)}</span>
                    <span className="text-sm">{t('works.fields.pages', 'pages')}</span>
                  </div>
                )}
              </div>

              {/* Catégories et tags */}
              {((oeuvre.Categories && oeuvre.Categories.length > 0) || (oeuvre.Tags && oeuvre.Tags.length > 0)) && (
                <div className="flex flex-wrap gap-2">
                  {oeuvre.Categories?.map((cat: any) => (
                    <Badge key={cat.id_categorie} variant="outline">
                      {cat.nom || cat.nom_categorie}
                    </Badge>
                  ))}
                  {oeuvre.Tags?.map((tag: any) => (
                    <Badge key={tag.id_tag} variant="secondary" className="text-xs">
                      #{tag.nom || tag.nom_tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR FILM
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeOeuvre === 'Film') {
    return (
      <div className="relative min-h-[600px] md:min-h-[700px]">
        {/* Background cinématique */}
        <div className="absolute inset-0">
          {mainImage ? (
            <>
              <img 
                src={mainImage} 
                alt={oeuvre.titre}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/50" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
        </div>
        
        <div className="relative container max-w-6xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            size="icon"
            className="mb-6 bg-background/20 backdrop-blur-sm hover:bg-background/40"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="grid lg:grid-cols-3 gap-8 items-end min-h-[500px]">
            {/* Affiche du film */}
            <div className="hidden lg:block">
              <div className="relative group">
                <div className="absolute inset-0 bg-black/50 rounded-lg transform translate-x-2 translate-y-2 -z-10" />
                {mainImage ? (
                  <img 
                    src={mainImage} 
                    alt={oeuvre.titre}
                    className="w-full aspect-[2/3] object-cover rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                    <Film className="h-24 w-24 text-primary/50" />
                  </div>
                )}
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="lg" className="rounded-full w-16 h-16 shadow-xl">
                    <Play className="h-6 w-6 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Informations du film */}
            <div className="lg:col-span-2 space-y-6 pb-8">
              <div className={`flex flex-wrap items-center gap-3 ${rtlClasses.flexRow}`}>
                <Badge className="bg-purple-600 text-white">
                  <Film className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                  {t('works.types.film', 'Film')}
                </Badge>
                {oeuvre.annee_creation && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    {oeuvre.annee_creation}
                  </Badge>
                )}
                {oeuvre.Film?.Genre && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    {oeuvre.Film.Genre.nom}
                  </Badge>
                )}
                {oeuvre.Film?.duree_minutes && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    {oeuvre.Film.duree_minutes} min
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold text-white drop-shadow-lg">
                {oeuvre.titre}
              </h1>
              
              {mainContributors.length > 0 && (
                <p className="text-xl text-white/80">
                  {t('works.directedBy', 'Réalisé par')} <span className="text-white font-medium">
                    {mainContributors[0].prenom} {mainContributors[0].nom}
                  </span>
                </p>
              )}

              {oeuvre.description && (
                <p className="text-white/70 leading-relaxed max-w-2xl line-clamp-3">
                  {oeuvre.description}
                </p>
              )}

              <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
                <Button size="lg" className="bg-white text-black hover:bg-white/90 shadow-lg">
                  <Play className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                  {t('works.actions.watchTrailer', 'Voir la bande-annonce')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/20"
                  onClick={onToggleFavorite}
                  disabled={favoriteLoading}
                >
                  <Heart className={`h-5 w-5 ${rtlClasses.marginEnd(2)} ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  {t('works.actions.favorites', 'Favoris')}
                </Button>
                <ShareButton iconOnly variant="outline" className="border-white/30 text-white hover:bg-white/20" />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-white/70">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{formatNumber(viewCount)} {t('works.stats.views', 'vues')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>{formatNumber(commentsCount)} {t('works.stats.reviews', 'avis')}</span>
                </div>
                {oeuvre.note_moyenne && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span>{oeuvre.note_moyenne.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR MUSIQUE
  // ═══════════════════════════════════════════════════════════════════════════
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
                    {t('works.types.album', 'Album')}
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
                      <span>{t('works.album.tracksCount', '{{count}} titres', { count: oeuvre.AlbumMusical.duree })}</span>
                    )}
                    {oeuvre.AlbumMusical.duree && (
                      <span>• {t('works.duration.minutes', '{{count}} min', { count: oeuvre.AlbumMusical.duree })}</span>
                    )}
                    <span>• {t('works.stats.listensCount', '{{count}} écoutes', { count: viewCount })}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-4">
                {oeuvre.prix !== undefined && (
                  <div className="text-3xl font-bold text-primary">
                    {oeuvre.prix === 0 ? t('works.pricing.free', 'Gratuit') : formatPrice(oeuvre.prix)}
                  </div>
                )}
                
                <div className={`flex flex-wrap justify-center lg:justify-start gap-3 ${rtlClasses.flexRow}`}>
                  <Button size="lg" className="shadow-lg">
                    <Headphones className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                    {t('works.actions.listenNow', 'Écouter')}
                  </Button>
                  <Button size="lg" variant="outline" onClick={onToggleFavorite} disabled={favoriteLoading}>
                    <Heart className={`h-5 w-5 ${rtlClasses.marginEnd(2)} ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                    {t('works.actions.favorites', 'Favoris')}
                  </Button>
                  <ShareButton iconOnly />
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO PAR DÉFAUT (Art, Article, Artisanat, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
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
                    {t('common.by', 'par')} {mainContributors.map(c => `${c.prenom} ${c.nom}`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions pour le type par défaut */}
      <div className="container max-w-6xl py-4">
        <div className={`flex flex-wrap gap-3 ${rtlClasses.flexRow}`}>
          <Button 
            size="lg" 
            onClick={onToggleFavorite} 
            disabled={favoriteLoading}
            variant={isFavorite ? "default" : "outline"}
            className={cn(isFavorite && "bg-red-500 hover:bg-red-600")}
          >
            <Heart className={cn("h-5 w-5 mr-2", isFavorite && "fill-current")} />
            {isFavorite ? t('works.inFavorites', 'Favori') : t('works.actions.addFavorite', 'Ajouter aux favoris')}
          </Button>
          <ShareButton />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;