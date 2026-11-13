/**
 * Bloc « professionnels » de l'accueil, court (choix de la responsable, audit V11 UX-32).
 * Avant : grand encart « Créer une œuvre / Créer un événement » montré à tout le monde, avec l'état de
 * connexion lu une seule fois au montage (pas mis à jour après une connexion).
 * - Personne non connectée : une phrase et un lien vers l'inscription (on devient professionnel en
 *   créant son compte).
 * - Professionnel connecté : un lien vers son espace.
 * - Visiteur connecté : rien (il n'a pas d'action à faire ici).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const EnhancedCTASection: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isProfessional } = useAuth();

  if (isAuthenticated && !isProfessional) return null;

  const lien = isAuthenticated
    ? { to: '/dashboard-pro', texte: t('home.pro.lienEspace', 'Ouvrir mon espace professionnel') }
    : { to: '/auth?tab=inscription', texte: t('home.pro.lienInscription', 'Créer mon compte professionnel') };

  return (
    <section className="py-12" aria-labelledby="accueil-pro-titre">
      <div className="container">
        <div className="max-w-3xl mx-auto rounded-2xl border bg-card px-6 py-8 sm:px-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-start">
          <Palette className="h-10 w-10 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex-1 space-y-1">
            <h2 id="accueil-pro-titre" className="text-xl sm:text-2xl font-semibold font-serif">
              {t('home.pro.titre', 'Vous êtes artiste ou association ?')}
            </h2>
            <p className="text-muted-foreground">
              {t('home.pro.texte', 'Présentez vos œuvres et vos événements sur Tala DZ.')}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link to={lien.to}>
              {lien.texte}
              <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default EnhancedCTASection;
