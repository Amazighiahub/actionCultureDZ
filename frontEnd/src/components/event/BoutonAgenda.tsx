/**
 * Bouton « Ajouter à mon agenda » de la fiche d'un événement (audit V11 OUT-4) : agenda du téléphone
 * (fichier .ics, ouvert par l'agenda Google sur Android et par Calendrier sur iPhone) ou Google Agenda.
 */
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { lienGoogleAgenda, telechargerIcs, type EvenementAgenda } from '@/utils/agendaEvenement';

export default function BoutonAgenda({ evenement, className }: { evenement: EvenementAgenda; className?: string }) {
  const { t } = useTranslation();
  const google = lienGoogleAgenda(evenement);
  if (!google) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg" className={className}>
          <CalendarPlus className="h-5 w-5 me-2" aria-hidden="true" />
          {t('events.agenda.ajouter', 'Ajouter à mon agenda')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => telechargerIcs(evenement)}>
          {t('events.agenda.telephone', 'Agenda du téléphone ou de l’ordinateur')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={google} target="_blank" rel="noopener noreferrer">
            {t('events.agenda.google', 'Google Agenda')}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
