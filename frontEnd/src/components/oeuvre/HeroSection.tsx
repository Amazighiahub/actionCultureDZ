// components/oeuvre/HeroSection.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft, BookOpen, Film, Music, Palette, FileText,
  Sparkles, Eye, Heart, Share2, Star, Play, MessageCircle,
  User, Calendar, Clock, Headphones, RotateCcw, Quote, Globe,
  BookMarked, Facebook, Twitter, Link as LinkIcon, Copy, ZoomIn, X,
  Beaker, ExternalLink, CheckCircle, Hash
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { MediaExtended } from '@/types/models/media-extended.types';
import { getMainImage } from '@/types/models/media-extended.types';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';

// ShareButton extracted to module scope to avoid re-creation on every render
const ShareButton = ({
  shareOpen,
  setShareOpen,
  onShare,
  t,
  variant = "outline",
  className = "",
  iconOnly = false,
  size = "lg"
}: {
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
  onShare: (platform: string) => void;
  t: (key: string, fallback?: string) => string;
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
          onClick={() => onShare('facebook')}
          className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
        >
          <Facebook className="h-4 w-4 text-blue-600" />
          <span>Facebook</span>
        </button>
        <button
          onClick={() => onShare('twitter')}
          className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
        >
          <Twitter className="h-4 w-4 text-sky-500" />
          <span>Twitter</span>
        </button>
        <button
          onClick={() => onShare('whatsapp')}
          className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-green-500" />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={() => onShare('copy')}
          className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md text-sm transition-colors"
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
          <span>{t('common.copyLink', 'Copier le lien')}</span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
);

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
  // État pour le zoom de la couverture
  const [showZoom, setShowZoom] = useState(false);
  // État pour la modal de lecture vidéo/audio
  const [showPlayer, setShowPlayer] = useState(false);
  // Message "pas de média"
  const [noMediaMsg, setNoMediaMsg] = useState(false);

  // Helper : trouver le premier média vidéo ou audio
  const videoMedia = medias.find(m => m.type_media === 'video');
  const audioMedia = medias.find(m => m.type_media === 'audio');
  const playableMedia = videoMedia || audioMedia;

  const handlePlay = () => {
    if (playableMedia) {
      setShowPlayer(true);
    } else {
      setNoMediaMsg(true);
      setTimeout(() => setNoMediaMsg(false), 3000);
    }
  };

  // Fonction de partage
  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = t('oeuvre.share.text', 'Découvrez "{{title}}" - {{type}}', {
      title: oeuvre.titre,
      type: oeuvre.TypeOeuvre?.nom_type || 'Œuvre'
    });

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=600,height=400');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=600,height=400');
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
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'noopener,noreferrer');
        break;
    }
    setShareOpen(false);
  };

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
      <div className="relative bg-gradient-to-br from-amber-50/50 via-background to-orange-50/30 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10 min-h-[500px]">
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
                className="relative mx-auto w-[240px] sm:w-[280px] md:w-[320px] lg:w-[340px]"
                style={{ perspective: '1200px' }}
              >
                {/* Conteneur du livre avec effet flip */}
                <div
                  className={cn(
                    "relative w-full aspect-[2/3] cursor-pointer transition-all duration-700 ease-in-out",
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped
                      ? `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})`
                      : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
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
                        
                        {/* Boutons d'action (zoom et flip) */}
                        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {/* Bouton Zoom */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowZoom(true);
                            }}
                            className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
                            title={t('works.zoom', 'Agrandir')}
                          >
                            <ZoomIn className="h-5 w-5 text-white" />
                          </button>
                          {/* Indicateur de flip */}
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
                        medias[1] ? '' : "bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 dark:from-amber-900 dark:via-amber-950 dark:to-black",
                        rtlClasses.direction === 'rtl' ? 'rounded-r-lg border-l-4' : 'rounded-l-lg border-r-4',
                        "border-amber-600/30"
                      )}>
                        {/* Si 2e image existe → l'afficher comme dos */}
                        {medias[1] ? (
                          <img
                            src={medias[1].url}
                            alt={t('oeuvre.backCover', 'Dos de couverture')}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                        <div className="h-full">
                        {/* Motif décoratif en fond (fallback si pas de 2e image) */}
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
                      )}
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
                <ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />
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
                      <p key={contributeur.id_contributeur || contributeur.id || `contrib-${contributeur.nom}-${index}`} className="text-xl text-muted-foreground">
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

              {/* Modal Zoom Couverture */}
              <Dialog open={showZoom} onOpenChange={setShowZoom}>
                <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                  <button
                    onClick={() => setShowZoom(false)}
                    className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                  <div className="flex items-center justify-center min-h-[60vh] p-4">
                    {mainImage ? (
                      <img 
                        src={mainImage} 
                        alt={oeuvre.titre}
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/60">
                        <BookOpen className="h-24 w-24 mb-4" />
                        <p>{t('works.noCover', 'Aucune couverture disponible')}</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white/80 font-medium text-lg">{oeuvre.titre}</p>
                    {mainContributors.length > 0 && (
                      <p className="text-white/60 text-sm">
                        {mainContributors[0].prenom} {mainContributors[0].nom}
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
  // HERO POUR FILM - AVEC AFFICHE FLIP 3D
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeOeuvre === 'Film') {
    return (
      <div className="relative bg-gradient-to-br from-slate-900/50 via-background to-purple-950/30 dark:from-slate-950 dark:via-background dark:to-purple-950/20 min-h-[500px]">
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
            {/* AFFICHE DU FILM AVEC EFFET FLIP */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-2">
              <div
                className="relative mx-auto w-[240px] sm:w-[280px] md:w-[320px] lg:w-[340px]"
                style={{ perspective: '1200px' }}
              >
                <div
                  className={cn(
                    "relative w-full aspect-[2/3] cursor-pointer transition-all duration-700 ease-in-out",
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped
                      ? `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})`
                      : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
                >
                  {/* FACE AVANT - AFFICHE */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <div className="relative w-full h-full group">
                      {/* Ombre portée 3D */}
                      <div
                        className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6"
                        style={{ filter: 'blur(8px)' }}
                      />

                      {/* Affiche principale */}
                      <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border-2 border-purple-500/20">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={oeuvre.titre}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
                            <Film className="h-24 w-24 text-purple-400/50 mb-4" />
                            <h3 className="text-xl font-bold text-center line-clamp-3 text-purple-100">
                              {oeuvre.titre}
                            </h3>
                          </div>
                        )}

                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                        {/* Note */}
                        {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                          <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                            <Badge className="bg-yellow-500 text-black shadow-lg">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {oeuvre.note_moyenne.toFixed(1)}
                            </Badge>
                          </div>
                        )}

                        {/* Durée */}
                        {oeuvre.Film?.duree_minutes && (
                          <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                            <Badge className="bg-purple-600 text-white border-0 shadow-lg">
                              <Clock className="h-3 w-3 mr-1" />
                              {oeuvre.Film.duree_minutes} min
                            </Badge>
                          </div>
                        )}

                        {/* Infos en bas d'affiche */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <h2 className="text-2xl font-bold mb-1 line-clamp-2 drop-shadow-lg">
                            {oeuvre.titre}
                          </h2>
                          {mainContributors.length > 0 && (
                            <p className="text-white/90 font-medium drop-shadow">
                              {mainContributors[0].prenom} {mainContributors[0].nom}
                            </p>
                          )}
                        </div>

                        {/* Boutons hover */}
                        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowZoom(true);
                            }}
                            className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
                            title={t('works.zoom', 'Agrandir')}
                          >
                            <ZoomIn className="h-5 w-5 text-white" />
                          </button>
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                            <RotateCcw className="h-5 w-5 text-white" />
                          </div>
                        </div>

                        {/* Effet brillance */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* FACE ARRIÈRE - INFOS FILM */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})`
                    }}
                  >
                    <div className="relative w-full h-full group">
                      <div
                        className="absolute inset-0 bg-black/20 rounded-lg transform -translate-x-4 translate-y-4 -z-10"
                        style={{ filter: 'blur(8px)' }}
                      />

                      <div className={cn(
                        "relative w-full h-full overflow-hidden shadow-2xl rounded-lg",
                        "bg-gradient-to-br from-purple-900 via-slate-900 to-purple-950",
                        "dark:from-purple-950 dark:via-slate-950 dark:to-black",
                      )}>
                        {/* Motif pellicule en fond */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
                            {[...Array(15)].map((_, i) => (
                              <div key={i} className="w-5 h-3 mx-auto rounded-sm bg-white/50" />
                            ))}
                          </div>
                          <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
                            {[...Array(15)].map((_, i) => (
                              <div key={i} className="w-5 h-3 mx-auto rounded-sm bg-white/50" />
                            ))}
                          </div>
                        </div>

                        <div className="relative h-full flex flex-col p-6 text-purple-50">
                          <div className="flex items-center justify-between mb-4">
                            <Film className="h-8 w-8 text-purple-400" />
                            <Badge variant="outline" className="border-purple-400/50 text-purple-200 bg-purple-950/50">
                              {oeuvre.TypeOeuvre?.nom_type || 'Film'}
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold mb-3 text-purple-100">
                            {oeuvre.titre}
                          </h3>

                          {/* Synopsis */}
                          <div className="flex-1 overflow-hidden">
                            <Quote className="h-5 w-5 text-purple-500/50 mb-2" />
                            <p className="text-sm leading-relaxed text-purple-100/90 line-clamp-[8]">
                              {oeuvre.description || t('works.noDescription', 'Aucun synopsis disponible pour ce film.')}
                            </p>
                          </div>

                          {/* Séparateur */}
                          <div className="my-4 flex items-center gap-2">
                            <div className="flex-1 h-px bg-purple-600/30" />
                            <Sparkles className="h-4 w-4 text-purple-500/50" />
                            <div className="flex-1 h-px bg-purple-600/30" />
                          </div>

                          {/* Métadonnées */}
                          <div className="space-y-2 text-sm">
                            {oeuvre.Film?.realisateur && (
                              <div className="flex items-center justify-between text-purple-200/80">
                                <span>{t('works.directedBy', 'Réalisateur')}</span>
                                <span className="font-medium">{oeuvre.Film.realisateur}</span>
                              </div>
                            )}
                            {oeuvre.Film?.duree_minutes && (
                              <div className="flex items-center justify-between text-purple-200/80">
                                <span>{t('works.duration.label', 'Durée')}</span>
                                <span>{oeuvre.Film.duree_minutes} min</span>
                              </div>
                            )}
                            {oeuvre.Langue && (
                              <div className="flex items-center gap-2 text-purple-200/80">
                                <Globe className="h-4 w-4" />
                                <span>{oeuvre.Langue.nom}</span>
                              </div>
                            )}
                            {oeuvre.annee_creation && (
                              <div className="flex items-center gap-2 text-purple-200/80">
                                <Calendar className="h-4 w-4" />
                                <span>{oeuvre.annee_creation}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 text-center">
                            <span className="text-xs text-purple-400/60 flex items-center justify-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              {t('works.flipToFront', 'Cliquez pour voir l\'affiche')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {isFlipped
                    ? t('works.viewPoster', 'Voir l\'affiche')
                    : t('works.viewSynopsis', 'Voir le synopsis au dos')
                  }
                </p>
              </div>

              {/* Actions sous l'affiche */}
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
                <ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* INFORMATIONS DU FILM (DROITE) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                  <Badge className="bg-purple-600 text-white">
                    <Film className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                    {t('works.types.film', 'Film')}
                  </Badge>
                  {oeuvre.annee_creation && (
                    <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                  )}
                  {oeuvre.Film?.Genre && (
                    <Badge variant="secondary">{oeuvre.Film.Genre.nom}</Badge>
                  )}
                  {oeuvre.Film?.duree_minutes && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {oeuvre.Film.duree_minutes} min
                    </Badge>
                  )}
                  {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {oeuvre.note_moyenne.toFixed(1)}
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold mb-4">{typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}</h1>

                {mainContributors.length > 0 && (
                  <div className="space-y-2">
                    {mainContributors.map((contributeur, index) => (
                      <p key={contributeur.id_contributeur || contributeur.id || `contrib-${contributeur.nom}-${index}`} className="text-xl text-muted-foreground">
                        {contributeur.role || t('works.directedBy', 'Réalisateur')} : <span className="text-foreground font-medium">
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
                <Button size="lg" className="shadow-lg" onClick={handlePlay}>
                  <Play className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                  {t('works.actions.watchTrailer', 'Voir la bande-annonce')}
                </Button>
                {noMediaMsg && (
                  <span className="text-sm text-muted-foreground self-center animate-pulse">
                    {t('works.noTrailer', 'Aucune bande-annonce disponible pour le moment')}
                  </span>
                )}
              </div>

              {/* Modal Zoom Affiche */}
              <Dialog open={showZoom} onOpenChange={setShowZoom}>
                <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                  <button
                    onClick={() => setShowZoom(false)}
                    className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                  <div className="flex items-center justify-center min-h-[60vh] p-4">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={oeuvre.titre}
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/60">
                        <Film className="h-24 w-24 mb-4" />
                        <p>{t('works.noPoster', 'Aucune affiche disponible')}</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Modal Player Vidéo (Film) */}
              <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
                <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                  <button
                    onClick={() => setShowPlayer(false)}
                    className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                  <div className="p-4">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-white flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        {typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}
                      </DialogTitle>
                    </DialogHeader>
                    {playableMedia && videoMedia ? (
                      <video
                        src={playableMedia.url}
                        controls
                        autoPlay
                        className="w-full rounded-lg"
                        style={{ maxHeight: '70vh' }}
                      />
                    ) : playableMedia ? (
                      <audio src={playableMedia.url} controls autoPlay className="w-full" />
                    ) : null}
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
                {oeuvre.Film?.duree_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">{oeuvre.Film.duree_minutes}</span>
                    <span className="text-sm">min</span>
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
  // HERO POUR MUSIQUE - AVEC POCHETTE FLIP 3D VINYLE
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeOeuvre === 'Musique' || typeOeuvre === 'AlbumMusical' || typeOeuvre === 'Album Musical') {
    return (
      <div className="relative bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10 min-h-[500px]">
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
            {/* POCHETTE ALBUM AVEC EFFET FLIP (VINYLE AU DOS) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-2">
              <div
                className="relative mx-auto w-[260px] sm:w-[300px] md:w-[340px] lg:w-[360px]"
                style={{ perspective: '1200px' }}
              >
                <div
                  className={cn(
                    "relative w-full aspect-square cursor-pointer transition-all duration-700 ease-in-out",
                  )}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped
                      ? `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})`
                      : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
                >
                  {/* FACE AVANT - POCHETTE */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <div className="relative w-full h-full group">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg blur-2xl opacity-15 group-hover:opacity-25 transition-opacity duration-300 -z-10" />

                      {/* Ombre portée 3D */}
                      <div
                        className="absolute inset-0 bg-black/20 rounded-lg transform translate-x-4 translate-y-4 -z-10 transition-transform duration-300 group-hover:translate-x-6 group-hover:translate-y-6"
                        style={{ filter: 'blur(8px)' }}
                      />

                      {/* Pochette principale */}
                      <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={oeuvre.titre}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-teal-900 flex flex-col items-center justify-center p-8">
                            <Music className="h-24 w-24 text-emerald-400/50 mb-4" />
                            <h3 className="text-xl font-bold text-center line-clamp-3 text-emerald-100">
                              {oeuvre.titre}
                            </h3>
                          </div>
                        )}

                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Note */}
                        {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                          <div className={`absolute top-4 ${rtlClasses.start(4)}`}>
                            <Badge className="bg-yellow-500 text-black shadow-lg">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {oeuvre.note_moyenne.toFixed(1)}
                            </Badge>
                          </div>
                        )}

                        {/* Badge gratuit */}
                        {oeuvre.prix === 0 && (
                          <div className={`absolute top-4 ${rtlClasses.end(4)}`}>
                            <Badge className="bg-green-500 text-white border-0 shadow-lg">
                              {t('works.pricing.free', 'Gratuit')}
                            </Badge>
                          </div>
                        )}

                        {/* Infos en bas de pochette */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <h2 className="text-2xl font-bold mb-1 line-clamp-2 drop-shadow-lg">
                            {oeuvre.titre}
                          </h2>
                          {mainContributors.length > 0 && (
                            <p className="text-white/90 font-medium drop-shadow">
                              {mainContributors[0].prenom} {mainContributors[0].nom}
                            </p>
                          )}
                        </div>

                        {/* Boutons hover */}
                        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowZoom(true);
                            }}
                            className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white/40 transition-colors"
                            title={t('works.zoom', 'Agrandir')}
                          >
                            <ZoomIn className="h-5 w-5 text-white" />
                          </button>
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 shadow-lg">
                            <RotateCcw className="h-5 w-5 text-white" />
                          </div>
                        </div>

                        {/* Effet brillance */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* FACE ARRIÈRE - VINYLE / INFOS ALBUM */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: `rotateY(${rtlClasses.direction === 'rtl' ? '-180deg' : '180deg'})`
                    }}
                  >
                    <div className="relative w-full h-full group">
                      <div
                        className="absolute inset-0 bg-black/20 rounded-lg transform -translate-x-4 translate-y-4 -z-10"
                        style={{ filter: 'blur(8px)' }}
                      />

                      <div className={cn(
                        "relative w-full h-full overflow-hidden shadow-2xl rounded-lg",
                        "bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950",
                        "dark:from-emerald-950 dark:via-teal-950 dark:to-black",
                      )}>
                        {/* Vinyle en fond */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                          <div className="w-[80%] aspect-square rounded-full border-[20px] border-white/20 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                            <div className="absolute inset-[30%] rounded-full bg-white/10" />
                            <div className="absolute inset-[45%] rounded-full bg-white/20" />
                          </div>
                        </div>

                        <div className="relative h-full flex flex-col p-6 text-emerald-50">
                          <div className="flex items-center justify-between mb-4">
                            <Music className="h-8 w-8 text-emerald-400" />
                            <Badge variant="outline" className="border-emerald-400/50 text-emerald-200 bg-emerald-950/50">
                              {oeuvre.TypeOeuvre?.nom_type || 'Album'}
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold mb-3 text-emerald-100">
                            {oeuvre.titre}
                          </h3>

                          {/* Description */}
                          <div className="flex-1 overflow-hidden">
                            <Quote className="h-5 w-5 text-emerald-500/50 mb-2" />
                            <p className="text-sm leading-relaxed text-emerald-100/90 line-clamp-[8]">
                              {oeuvre.description || t('works.noDescription', 'Aucune description disponible pour cet album.')}
                            </p>
                          </div>

                          {/* Séparateur */}
                          <div className="my-4 flex items-center gap-2">
                            <div className="flex-1 h-px bg-emerald-600/30" />
                            <Sparkles className="h-4 w-4 text-emerald-500/50" />
                            <div className="flex-1 h-px bg-emerald-600/30" />
                          </div>

                          {/* Métadonnées */}
                          <div className="space-y-2 text-sm">
                            {oeuvre.AlbumMusical?.label && (
                              <div className="flex items-center justify-between text-emerald-200/80">
                                <span>Label</span>
                                <span className="font-medium">{oeuvre.AlbumMusical.label}</span>
                              </div>
                            )}
                            {oeuvre.AlbumMusical?.duree && (
                              <div className="flex items-center justify-between text-emerald-200/80">
                                <span>{t('works.duration.label', 'Durée')}</span>
                                <span>{oeuvre.AlbumMusical.duree} min</span>
                              </div>
                            )}
                            {oeuvre.Langue && (
                              <div className="flex items-center gap-2 text-emerald-200/80">
                                <Globe className="h-4 w-4" />
                                <span>{oeuvre.Langue.nom}</span>
                              </div>
                            )}
                            {oeuvre.annee_creation && (
                              <div className="flex items-center gap-2 text-emerald-200/80">
                                <Calendar className="h-4 w-4" />
                                <span>{oeuvre.annee_creation}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 text-center">
                            <span className="text-xs text-emerald-400/60 flex items-center justify-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              {t('works.flipToFront', 'Cliquez pour voir la pochette')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {isFlipped
                    ? t('works.viewCover', 'Voir la pochette')
                    : t('works.viewDetails', 'Voir les détails au dos')
                  }
                </p>
              </div>

              {/* Actions sous la pochette */}
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
                <ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* INFORMATIONS DE L'ALBUM (DROITE) */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className={`flex flex-wrap items-center gap-3 mb-4 ${rtlClasses.flexRow}`}>
                  <Badge className="bg-emerald-600 text-white">
                    <Music className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                    {t('works.types.album', 'Album')}
                  </Badge>
                  {oeuvre.annee_creation && (
                    <Badge variant="outline">{oeuvre.annee_creation}</Badge>
                  )}
                  {oeuvre.AlbumMusical?.Genre && (
                    <Badge variant="secondary">{oeuvre.AlbumMusical.Genre.nom}</Badge>
                  )}
                  {oeuvre.note_moyenne && oeuvre.note_moyenne > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {oeuvre.note_moyenne.toFixed(1)}
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold mb-4">{typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}</h1>

                {mainContributors.length > 0 && (
                  <div className="space-y-2">
                    {mainContributors.map((contributeur, index) => (
                      <p key={contributeur.id_contributeur || contributeur.id || `contrib-${contributeur.nom}-${index}`} className="text-xl text-muted-foreground">
                        {contributeur.role || t('works.artist', 'Artiste')} : <span className="text-foreground font-medium">
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
                <Button size="lg" className="shadow-lg" onClick={handlePlay}>
                  <Headphones className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                  {t('works.actions.listenNow', 'Écouter')}
                </Button>
                {noMediaMsg && (
                  <span className="text-sm text-muted-foreground self-center animate-pulse">
                    {t('works.noAudio', 'Aucun extrait audio disponible pour le moment')}
                  </span>
                )}
              </div>

              {/* Modal Zoom Pochette */}
              <Dialog open={showZoom} onOpenChange={setShowZoom}>
                <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                  <button
                    onClick={() => setShowZoom(false)}
                    className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                  <div className="flex items-center justify-center min-h-[60vh] p-4">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={oeuvre.titre}
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/60">
                        <Music className="h-24 w-24 mb-4" />
                        <p>{t('works.noCover', 'Aucune pochette disponible')}</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Modal Player Audio (Album) */}
              <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
                <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
                  <button
                    onClick={() => setShowPlayer(false)}
                    className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <X className="h-6 w-6 text-white" />
                  </button>
                  <div className="p-6">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-white flex items-center gap-2">
                        <Headphones className="h-5 w-5" />
                        {typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center">
                      <div className="w-48 h-48 rounded-lg overflow-hidden mb-6 shadow-xl">
                        {mainImage ? (
                          <img src={mainImage} alt={oeuvre.titre} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-teal-900 flex items-center justify-center">
                            <Music className="h-16 w-16 text-emerald-400/50" />
                          </div>
                        )}
                      </div>
                      {playableMedia && videoMedia ? (
                        <video src={playableMedia.url} controls autoPlay className="w-full rounded-lg" style={{ maxHeight: '50vh' }} />
                      ) : playableMedia ? (
                        <audio src={playableMedia.url} controls autoPlay className="w-full max-w-md" />
                      ) : null}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Description */}
              {oeuvre.description && (
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {t('works.description', 'Description')}
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
                  <Headphones className="h-5 w-5" />
                  <span className="font-medium">{formatNumber(viewCount)}</span>
                  <span className="text-sm">{t('works.stats.listens', 'écoutes')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-medium">{formatNumber(commentsCount)}</span>
                  <span className="text-sm">{t('works.stats.reviews', 'avis')}</span>
                </div>
                {oeuvre.AlbumMusical?.duree && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">{oeuvre.AlbumMusical.duree}</span>
                    <span className="text-sm">min</span>
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
  // HERO POUR ARTICLE SCIENTIFIQUE
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeOeuvre === 'Article Scientifique' || typeOeuvre === 'Article') {
    const isScientific = typeOeuvre === 'Article Scientifique';
    const articleSci = oeuvre.ArticleScientifique;
    const article = oeuvre.Article;

    return (
      <div className="relative bg-gradient-to-b from-slate-50 via-white to-background dark:from-slate-950 dark:via-background dark:to-background">
        {/* Motif académique subtil en fond */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative container max-w-5xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            size="icon"
            className="mb-6 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* En-tête type publication académique */}
          <div className="space-y-6">
            {/* Badges de classification */}
            <div className={`flex flex-wrap items-center gap-3 ${rtlClasses.flexRow}`}>
              <Badge className={cn(
                "text-white shadow-sm",
                isScientific 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              )}>
                {isScientific ? (
                  <Beaker className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                ) : (
                  <FileText className={`h-3 w-3 ${rtlClasses.marginEnd(1)}`} />
                )}
                {typeOeuvre}
              </Badge>
              {articleSci?.peer_reviewed && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Peer-reviewed
                </Badge>
              )}
              {articleSci?.journal && (
                <Badge variant="outline" className="font-normal">
                  <BookMarked className="h-3 w-3 mr-1" />
                  {articleSci.journal}
                </Badge>
              )}
              {article?.source && (
                <Badge variant="outline" className="font-normal">
                  <BookMarked className="h-3 w-3 mr-1" />
                  {article.source}
                </Badge>
              )}
              {oeuvre.annee_creation && (
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  {oeuvre.annee_creation}
                </Badge>
              )}
            </div>

            {/* Titre — style académique */}
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold font-serif leading-tight text-foreground">
              {typeof oeuvre.titre === 'string' ? oeuvre.titre : (oeuvre.titre as any)?.fr || ''}
            </h1>

            {/* Auteurs */}
            {mainContributors.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-muted-foreground">
                {mainContributors.map((contributeur, index) => (
                  <span key={contributeur.id_contributeur || contributeur.id || `contrib-${contributeur.nom}-${index}`}>
                    <span className="font-medium text-foreground">
                      {contributeur.prenom} {contributeur.nom}
                    </span>
                    {contributeur.role && contributeur.role !== 'Contributeur' && (
                      <span className="text-sm text-muted-foreground ml-1">({contributeur.role})</span>
                    )}
                    {index < mainContributors.length - 1 && <span className="mx-1">,</span>}
                  </span>
                ))}
              </div>
            )}

            {/* Ligne de métadonnées académiques */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-y border-border/50 py-4">
              {articleSci?.journal && (
                <div className="flex items-center gap-1.5">
                  <BookMarked className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="italic font-medium">{articleSci.journal}</span>
                </div>
              )}
              {articleSci?.volume && (
                <div className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  <span>Vol. {articleSci.volume}{articleSci.numero ? `, n° ${articleSci.numero}` : ''}</span>
                </div>
              )}
              {articleSci?.pages && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>pp. {articleSci.pages}</span>
                </div>
              )}
              {articleSci?.doi && (
                <a
                  href={`https://doi.org/${articleSci.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-mono text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  DOI: {articleSci.doi}
                </a>
              )}
              {article?.url_source && (
                <a
                  href={article.url_source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('oeuvre.readOriginal', 'Article original')}
                </a>
              )}
              {oeuvre.Langue && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{oeuvre.Langue.nom}</span>
                </div>
              )}
            </div>

            {/* Résumé / Abstract */}
            {oeuvre.description && (
              <Card className="bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {isScientific ? t('oeuvre.abstract', 'Abstract') : t('oeuvre.summary', 'Résumé')}
                  </h3>
                  <p className="leading-relaxed text-foreground/90">
                    {typeof oeuvre.description === 'string' ? oeuvre.description : (oeuvre.description as any)?.fr || ''}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className={`flex flex-wrap items-center gap-3 ${rtlClasses.flexRow}`}>
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
              <ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />
              {articleSci?.doi && (
                <Button variant="outline" size="lg" asChild>
                  <a href={`https://doi.org/${articleSci.doi}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('oeuvre.viewOnDOI', 'Voir sur DOI.org')}
                  </a>
                </Button>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 ml-auto text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>{formatNumber(viewCount)} {t('works.stats.views', 'vues')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  <span>{formatNumber(commentsCount)} {t('works.stats.reviews', 'avis')}</span>
                </div>
              </div>
            </div>

            {/* Catégories et tags */}
            {((oeuvre.Categories && oeuvre.Categories.length > 0) || (oeuvre.Tags && oeuvre.Tags.length > 0)) && (
              <div className="flex flex-wrap gap-2">
                {oeuvre.Categories?.map((cat: any) => (
                  <Badge key={cat.id_categorie} variant="outline" className="text-xs">
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
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO PAR DÉFAUT (Art, Artisanat, etc.)
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
          <ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;