/**
 * useInviterConnexion — une action réservée aux comptes (favori, commentaire, inscription) tentée
 * sans être connecté : message aimable (pas une erreur rouge) avec « Se connecter », qui ramène
 * sur la même page après la connexion (/auth?redirect=…).
 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function useInviterConnexion() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback((description: string) => {
    const retour = encodeURIComponent(`${location.pathname}${location.search}`);
    toast({
      title: t('auth.inviteTitle', 'Connectez-vous, c’est gratuit'),
      description,
      action: (
        <ToastAction altText={t('auth.login.submit', 'Se connecter')} onClick={() => navigate(`/auth?redirect=${retour}`)}>
          {t('auth.login.submit', 'Se connecter')}
        </ToastAction>
      ),
    });
  }, [t, toast, navigate, location.pathname, location.search]);
}

export default useInviterConnexion;
