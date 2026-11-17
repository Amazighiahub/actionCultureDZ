/**
 * Fenêtre « Gestion de l'événement » (programme, œuvres et articles, participants, documents et photos),
 * commune au tableau de bord du professionnel et à l'administration (2026-11-17 : la responsable
 * crée des événements au nom d'un organisateur et doit pouvoir les gérer).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const GestionEvenement = React.lazy(() => import('@/components/event/GestionEvenement'));

export interface EvenementAGerer { id: number; nom: string; onglet?: string }

const FenetreGestionEvenement: React.FC<{ evenement: EvenementAGerer | null; onClose: () => void }> = ({ evenement, onClose }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={evenement !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto [&>*]:min-w-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">
          {t('gestion.title', "Gestion de l'événement")}{evenement?.nom ? ` – ${evenement.nom}` : ''}
        </DialogTitle>
        {evenement && (
          <React.Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
            <GestionEvenement evenementId={evenement.id} evenementNom={evenement.nom} onglet={evenement.onglet} onClose={onClose} />
          </React.Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FenetreGestionEvenement;
