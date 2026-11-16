/**
 * « N° 1 sur 5 restaurants à Alger » (comme TripAdvisor) : rang calculé par le serveur sur tous les
 * services validés du même type dans la wilaya (note pondérée). Rien sous 2 services dans le groupe.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { nomWilaya, type Wilaya } from '@/components/gastronomie/PlatCard';

export interface Classement { rang: number; total: number; wilaya?: Wilaya | null }

// Nom du groupe au pluriel (texte par défaut ; traductions : servicesVisiteurs.classement.genres.*)
const GENRES: Record<string, string> = {
  restaurant: 'restaurants', hotel: 'hébergements', guide: 'guides', transport: 'transports',
  artisanat: 'artisans', location: 'locations', autre: 'services'
};

const ClassementService: React.FC<{ classement?: Classement | null; typeService?: string; wilaya?: Wilaya | null; className?: string }> = ({ classement, typeService, wilaya, className = '' }) => {
  const { t, i18n } = useTranslation();
  if (!classement || classement.total < 2) return null;
  const nom = nomWilaya(classement.wilaya || wilaya || null, i18n.language);
  const cleGenre = typeService && GENRES[typeService] ? typeService : 'autre';
  const genre = t(`servicesVisiteurs.classement.genres.${cleGenre}`, GENRES[cleGenre]);
  const texte = nom
    ? t('servicesVisiteurs.classement.texte', 'N° {{rang}} sur {{total}} {{genre}} à {{wilaya}}', { rang: classement.rang, total: classement.total, genre, wilaya: nom })
    : t('servicesVisiteurs.classement.sansWilaya', 'N° {{rang}} sur {{total}} {{genre}}', { rang: classement.rang, total: classement.total, genre });
  const premier = classement.rang === 1;
  return (
    <p className={`flex items-center gap-1.5 text-sm ${premier ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-muted-foreground'} ${className}`} data-testid="classement-service">
      <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />{texte}
    </p>
  );
};

export default ClassementService;
