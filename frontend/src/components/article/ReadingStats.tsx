// components/article/ReadingStats.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Clock,
  Eye,
  FileText,
  TrendingUp,
  Users,
  MessageCircle } from
'lucide-react';import { useTranslation } from "react-i18next";

interface ReadingStatsProps {
  wordCount: number;
  viewCount: number;
  commentCount: number;
  className?: string;
  onlineReaders?: number;
}

export const ReadingStats: React.FC<ReadingStatsProps> = ({
  wordCount,
  viewCount,
  commentCount,
  className,
  onlineReaders = 0
}) => {
  const [readingProgress, setReadingProgress] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isReading, setIsReading] = useState(true);const { t } = useTranslation();

  const estimatedReadingTime = Math.ceil(wordCount / 250); // 250 mots/minute

  // Tracker le temps passé sur l'article
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isReading) {
      interval = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReading]);

  // Détecter l'inactivité
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleActivity = () => {
      setIsReading(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsReading(false), 30000); // 30 secondes d'inactivité
    };

    // Événements qui indiquent une activité
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    handleActivity(); // Démarrer

    return () => {
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearTimeout(timeout);
    };
  }, []);

  // Tracker la progression de lecture
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / docHeight * 100, 100);
      setReadingProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Calculer la position initiale

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getEngagementLevel = (): {label: string;color: string;} => {
    const readingSpeed = timeSpent > 0 ? wordCount * (readingProgress / 100) / (timeSpent / 60) : 0;

    if (readingProgress > 80 && readingSpeed > 150 && readingSpeed < 400) {
      return { label: t("article_readingstats.label_lecture_attentive"), color: 'text-green-500' };
    } else if (readingProgress > 50) {
      return { label: t("article_readingstats.label_lecture_active"), color: 'text-blue-500' };
    } else if (timeSpent > 30) {
      return { label: t("article_readingstats.label_cours"), color: 'text-yellow-500' };
    } else {
      return { label: t("article_readingstats.label_dcouverte"), color: 'text-gray-500' };
    }
  };

  const engagement = getEngagementLevel();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{t("article_readingstats.statistiques_lecture")}</h3>
          <span className={cn("text-xs font-medium", engagement.color)}>
            {engagement.label}
          </span>
        </div>
        
        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("article_readingstats.progression")}</span>
            <span>{Math.round(readingProgress)}%</span>
          </div>
          <Progress value={readingProgress} className="h-2" />
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* Statistiques en grille */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">{t("article_readingstats.temps_lecture")}</span>
            </div>
            <p className="text-sm font-semibold">
              {formatTime(timeSpent)} / ~{estimatedReadingTime}{t("article_readingstats.min")}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs">{t("article_readingstats.mots_lus")}</span>
            </div>
            <p className="text-sm font-semibold">
              ~{Math.round(wordCount * (readingProgress / 100))} / {wordCount}
            </p>
          </div>
        </div>

        {/* Statistiques sociales */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span>{viewCount}{t("article_readingstats.vues")}</span>
            </div>
            {onlineReaders > 0 &&
            <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  {onlineReaders}{t("article_readingstats.ligne")}
              </span>
              </div>
            }
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span>{commentCount}{t("article_readingstats.commentaires")}</span>
          </div>
        </div>

        {/* Vitesse de lecture estimée */}
        {timeSpent > 10 && readingProgress > 5 &&
        <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("article_readingstats.vitesse_lecture")}</span>
              <span className="font-medium">
                ~{Math.round(wordCount * (readingProgress / 100) / (timeSpent / 60))}{t("article_readingstats.motsmin")}
            </span>
            </div>
          </div>
        }
      </CardContent>
    </Card>);

};

// Composant de badge flottant minimaliste
export const ReadingProgressBadge: React.FC<{
  progress: number;
  timeSpent: number;
  estimatedTime: number;
}> = ({ progress, timeSpent, estimatedTime }) => {
  const [isMinimized, setIsMinimized] = useState(false);const { t } = useTranslation();

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-40 bg-background/95 backdrop-blur-sm border rounded-full p-3 shadow-lg hover:shadow-xl transition-all">
        
        <div className="relative h-6 w-6">
          <svg className="h-6 w-6 -rotate-90">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-muted" />
            
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
              className="text-primary transition-all duration-300" />
            
          </svg>
        </div>
      </button>);

  }

  return (
    <div className="fixed bottom-6 right-6 z-40 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">{t("article_readingstats.lecture_cours")}</span>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-muted-foreground hover:text-foreground">
          
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10">
          <svg className="h-10 w-10 -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-muted" />
            
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
              className="text-primary transition-all duration-300" />
            
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="text-xs">
          <p className="font-medium">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</p>
          <p className="text-muted-foreground">~{estimatedTime}{t("article_readingstats.min_total")}</p>
        </div>
      </div>
    </div>);

};

// Utilisation dans ArticleViewPage :
/*
// Dans le composant principal
<ReadingStats
  wordCount={contentStats.wordCount}
  viewCount={viewCount}
  commentCount={commentaires.length}
  onlineReaders={3} // Peut venir d'un websocket
  className="sticky top-24"
/>

// Ou utiliser le badge flottant
<ReadingProgressBadge
  progress={readingProgress}
  timeSpent={timeSpent}
  estimatedTime={contentStats.readingTime}
/>
*/