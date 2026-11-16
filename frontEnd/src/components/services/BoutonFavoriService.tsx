/**
 * « Ajouter aux favoris » sur la page d'un service (accord de la responsable, 2026-11-16), comme sur
 * la page d'un événement : un visiteur non connecté est invité à se connecter.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriCheck } from '@/hooks/useFavoris';
import { useInviterConnexion } from '@/hooks/useInviterConnexion';

const BoutonFavoriService: React.FC<{ serviceId: number }> = ({ serviceId }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const inviterConnexion = useInviterConnexion();
  const { isFavorite, toggle } = useFavoriCheck('service', serviceId);

  const basculer = async () => {
    if (!isAuthenticated) {
      inviterConnexion(t('auth.loginToFavorite', 'Connectez-vous pour ajouter aux favoris'));
      return;
    }
    await toggle();
  };

  return (
    <Button type="button" variant="favorite" data-active={isFavorite} onClick={basculer} aria-pressed={isFavorite} className="gap-2">
      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
      {isFavorite ? t('events.removeFromFavorites', 'Retirer des favoris') : t('events.addToFavorites', 'Ajouter aux favoris')}
    </Button>
  );
};

export default BoutonFavoriService;
