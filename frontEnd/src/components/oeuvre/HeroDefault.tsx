// components/oeuvre/HeroDefault.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, BookOpen, Film, Music, Palette,
  Sparkles, Heart, User,
} from 'lucide-react';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import { useRTL } from '@/hooks/useRTL';
import { cn } from '@/lib/Utils';

const OeuvreTypeIcon = ({ typeId }: { typeId: number }) => {
  const iconMap: Record<number, typeof BookOpen> = { 1: BookOpen, 2: Film, 3: Music, 6: Palette, 7: Sparkles };
  const Icon = iconMap[typeId] || Sparkles;
  return <Icon className="h-5 w-5" />;
};

interface HeroDefaultProps {
  oeuvre: Oeuvre;
  mainImage: string | null;
  titre: string;
  typeId: number;
  typeOeuvre: string;
  mainContributors: any[];
  viewCount: number;
  isFavorite: boolean;
  favoriteLoading: boolean;
  onToggleFavorite: () => void;
  shareButton: React.ReactNode;
}

const HeroDefault: React.FC<HeroDefaultProps> = ({
  oeuvre,
  mainImage,
  titre,
  typeId,
  typeOeuvre,
  mainContributors,
  viewCount,
  isFavorite,
  favoriteLoading,
  onToggleFavorite,
  shareButton,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();

  return (
    <div className="relative">
      <div className="h-[40vh] relative overflow-hidden">
        {mainImage ? (
          <>
            <img
              src={mainImage}
              alt={titre}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <OeuvreTypeIcon typeId={typeId} />
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
                  <OeuvreTypeIcon typeId={typeId} />
                  <span className={rtlClasses.marginStart(2)}>{typeOeuvre}</span>
                </Badge>
                {oeuvre.annee_creation && (
                  <Badge variant="secondary" className="backdrop-blur-sm">
                    {oeuvre.annee_creation}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold">
                {titre}
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
          {shareButton}
        </div>
      </div>
    </div>
  );
};

export default HeroDefault;
