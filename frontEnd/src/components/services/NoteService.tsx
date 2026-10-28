/** « ★ 4,5 (12 avis) » : note moyenne d'un service, dans la langue du visiteur */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { cn } from '@/lib/Utils';

const NoteService: React.FC<{ note: { moyenne: number; nombre: number }; className?: string }> = ({ note, className }) => {
  const { t } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const moyenne = formatNumber(note.moyenne, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <p className={cn('flex items-center gap-1 text-sm', className)}
      aria-label={t('servicesVisiteurs.avis.noteSur5', { note: moyenne, count: note.nombre, defaultValue: 'Note {{note}} sur 5, {{count}} avis' })}>
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
      <span className="font-medium" aria-hidden="true">{moyenne}</span>
      <span className="text-muted-foreground" aria-hidden="true">({t('servicesVisiteurs.avis.nombreAvis', { count: note.nombre, defaultValue: '{{count}} avis' })})</span>
    </p>
  );
};

export default NoteService;
