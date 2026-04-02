// components/oeuvre/HeroSection.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HeroLivre from './HeroLivre';
import HeroFilm from './HeroFilm';
import HeroAlbum from './HeroAlbum';
import HeroArticle from './HeroArticle';
import HeroDefault from './HeroDefault';
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

const OeuvreTypeIcon = ({ typeId }: { typeId: number }) => {
  const iconMap: Record<number, typeof BookOpen> = {
    1: BookOpen,   // Livre
    2: Film,       // Film
    3: Music,      // Album Musical
    6: Palette,    // Œuvre d'Art
    7: Sparkles,   // Artisanat
  };

  const Icon = iconMap[typeId] || Sparkles;
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
  const { rtlClasses, direction } = useRTL();

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
      title: titre,
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

  // Helper pour extraire le texte d'un champ multilingue
  const gt = (field: unknown): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field !== null) {
      const obj = field as Record<string, string>;
      return obj.fr || obj.ar || obj.en || Object.values(obj).find(v => typeof v === 'string' && v) || '';
    }
    return String(field);
  };

  const titre = gt(oeuvre.titre);
  const description = gt(oeuvre.description);

  const mainImage = getMainImage(medias);
  const typeId = oeuvre.id_type_oeuvre;
  const typeOeuvre = typeof oeuvre.TypeOeuvre?.nom_type === 'object'
    ? (oeuvre.TypeOeuvre.nom_type as Record<string, string>).fr || Object.values(oeuvre.TypeOeuvre.nom_type as Record<string, string>)[0] || 'Œuvre'
    : oeuvre.TypeOeuvre?.nom_type || 'Œuvre';
  
  // Fonction helper pour obtenir les contributeurs principaux
  const getMainContributors = () => {
    const principaux = contributeurs.filter(c => c.role_principal);
    return principaux.length > 0 ? principaux : contributeurs.slice(0, 3);
  };

  const mainContributors = getMainContributors();

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR LIVRE - Composant extrait dans HeroLivre.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeId === 1) {
    return (
      <HeroLivre
        oeuvre={oeuvre} medias={medias} mainImage={mainImage}
        titre={titre} description={description} typeOeuvre={typeOeuvre}
        mainContributors={mainContributors} gt={gt}
        viewCount={viewCount} commentsCount={commentsCount}
        isFavorite={isFavorite} favoriteLoading={favoriteLoading}
        onToggleFavorite={onToggleFavorite}
        shareButton={<ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR FILM - Composant extrait dans HeroFilm.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeId === 2) {
    return (
      <HeroFilm
        oeuvre={oeuvre} medias={medias} mainImage={mainImage}
        titre={titre} description={description}
        mainContributors={mainContributors} gt={gt}
        viewCount={viewCount} commentsCount={commentsCount}
        isFavorite={isFavorite} favoriteLoading={favoriteLoading}
        onToggleFavorite={onToggleFavorite}
        shareButton={<ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />}
        playableMedia={playableMedia} videoMedia={videoMedia}
        handlePlay={handlePlay} noMediaMsg={noMediaMsg}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR ALBUM - Composant extrait dans HeroAlbum.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeId === 3) {
    return (
      <HeroAlbum
        oeuvre={oeuvre} medias={medias} mainImage={mainImage}
        titre={titre} description={description}
        mainContributors={mainContributors} gt={gt}
        viewCount={viewCount} commentsCount={commentsCount}
        isFavorite={isFavorite} favoriteLoading={favoriteLoading}
        onToggleFavorite={onToggleFavorite}
        shareButton={<ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />}
        playableMedia={playableMedia}
        handlePlay={handlePlay} noMediaMsg={noMediaMsg}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO POUR ARTICLE - Composant extrait dans HeroArticle.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  if (typeId === 4 || typeId === 5) {
    return (
      <HeroArticle
        oeuvre={oeuvre} mainImage={mainImage}
        titre={titre} description={description} typeId={typeId}
        mainContributors={mainContributors} gt={gt}
        viewCount={viewCount} commentsCount={commentsCount}
        isFavorite={isFavorite} favoriteLoading={favoriteLoading}
        onToggleFavorite={onToggleFavorite}
        shareButton={<ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO PAR DÉFAUT - Composant extrait dans HeroDefault.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <HeroDefault
      oeuvre={oeuvre} mainImage={mainImage}
      titre={titre} typeId={typeId} typeOeuvre={typeOeuvre}
      mainContributors={mainContributors} viewCount={viewCount}
      isFavorite={isFavorite} favoriteLoading={favoriteLoading}
      onToggleFavorite={onToggleFavorite}
      shareButton={<ShareButton shareOpen={shareOpen} setShareOpen={setShareOpen} onShare={handleShare} t={t} />}
    />
  );
};

export default HeroSection;
