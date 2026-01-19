/**
 * useOeuvreDetails - Hook pour la page détail œuvre
 * Gère le chargement des données et les actions
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/UI/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriCheck } from '@/hooks/useFavoris';
import { oeuvreService } from '@/services/oeuvre.service';
import { commentaireService } from '@/services/commentaire.service';
import { evenementService } from '@/services/evenement.service';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { Media } from '@/types/models/media.types';
import type { Evenement } from '@/types/models/evenement.types';

interface UseOeuvreDetailsOptions {
  enabled?: boolean;
}

interface Contributeur {
  id_user?: number;
  id_intervenant?: number;
  nom: string;
  prenom?: string;
  photo_url?: string;
  role?: string;
  type_user?: string;
  TypeUser?: {
    id_type_user: number;
    nom_type: string;
  };
  personnage?: string;
  role_principal?: boolean;
  description_role?: string;
}

interface Comment {
  id_commentaire?: number;
  id?: number;
  contenu: string;
  note?: number;
  date_creation: string;
  User?: {
    id_user: number;
    nom: string;
    prenom: string;
    photo_url?: string;
  };
}

export function useOeuvreDetails(oeuvreId: number, options: UseOeuvreDetailsOptions = {}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { enabled = true } = options;

  // Query keys
  const oeuvreKey = ['oeuvre', oeuvreId];
  const mediasKey = ['oeuvre-medias', oeuvreId];
  const commentsKey = ['oeuvre-comments', oeuvreId];
  const eventsKey = ['oeuvre-events', oeuvreId];

  // ============================================
  // QUERIES
  // ============================================

  // Charger l'œuvre
  const oeuvreQuery = useQuery({
    queryKey: oeuvreKey,
    queryFn: async () => {
      const response = await oeuvreService.getOeuvreById(oeuvreId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Œuvre non trouvée');
    },
    enabled: enabled && oeuvreId > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Charger les médias (avec gestion gracieuse des erreurs)
  const mediasQuery = useQuery({
    queryKey: mediasKey,
    queryFn: async () => {
      try {
        const response = await oeuvreService.getMedias(oeuvreId);
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.warn('Médias non disponibles pour cette œuvre');
        return [];
      }
    },
    enabled: enabled && oeuvreId > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Charger les commentaires (avec gestion gracieuse des erreurs 501)
  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      try {
        const response = await commentaireService.getCommentairesOeuvre(oeuvreId);
        if (response.success && response.data) {
          return response.data.items || response.data || [];
        }
        // Si pas de succès mais pas d'erreur critique, retourner vide
        return [];
      } catch (error) {
        // Gérer silencieusement les erreurs 501 (Not Implemented)
        console.warn('Commentaires non disponibles pour cette œuvre');
        return [];
      }
    },
    enabled: enabled && oeuvreId > 0,
    staleTime: 1 * 60 * 1000,
    retry: false, // Ne pas réessayer si erreur
  });

  // Charger les événements liés (avec gestion gracieuse des erreurs)
  const eventsQuery = useQuery({
    queryKey: eventsKey,
    queryFn: async () => {
      try {
        const response = await evenementService.getByOeuvre(oeuvreId);
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.warn('Événements non disponibles pour cette œuvre');
        return [];
      }
    },
    enabled: enabled && oeuvreId > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // ============================================
  // FAVORIS
  // ============================================
  
  const { isFavorite, toggle: toggleFavoriBase } = useFavoriCheck(
    'oeuvre',
    oeuvreId
  );

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      toast({
        title: t('auth.required', 'Connexion requise'),
        description: t('auth.loginToFavorite', 'Connectez-vous pour ajouter aux favoris'),
        variant: 'destructive',
      });
      return;
    }
    await toggleFavoriBase();
  };

  // ============================================
  // MUTATIONS
  // ============================================

  // Ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ contenu, note }: { contenu: string; note?: number }) => {
      const response = await commentaireService.createCommentaireOeuvre(oeuvreId, { contenu });
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de l\'ajout du commentaire');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: t('comments.added', 'Commentaire ajouté'),
        description: t('comments.addedDesc', 'Votre avis a été publié'),
      });
      queryClient.invalidateQueries({ queryKey: commentsKey });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Erreur'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Incrémenter les vues
  const incrementViewsMutation = useMutation({
    mutationFn: async () => {
      // Appeler l'API pour incrémenter les vues
      const response = await oeuvreService.incrementViews?.(oeuvreId);
      return response;
    },
    onSuccess: () => {
      // Mettre à jour le cache local
      queryClient.setQueryData(oeuvreKey, (oldData: Oeuvre | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            nombre_vues: (oldData.nombre_vues || 0) + 1
          };
        }
        return oldData;
      });
    },
  });

  // ============================================
  // EFFETS
  // ============================================

  // Incrémenter les vues une fois par session
  useEffect(() => {
    if (oeuvreId > 0 && oeuvreQuery.data) {
      const viewedKey = `oeuvre-viewed-${oeuvreId}`;
      const alreadyViewed = sessionStorage.getItem(viewedKey);
      
      if (!alreadyViewed && oeuvreService.incrementViews) {
        incrementViewsMutation.mutate();
        sessionStorage.setItem(viewedKey, 'true');
      }
    }
  }, [oeuvreId, oeuvreQuery.data]);

  // ============================================
  // HELPERS
  // ============================================

  // Extraire les contributeurs depuis l'œuvre
  const extractContributeurs = (): Contributeur[] => {
    const oeuvre = oeuvreQuery.data;
    if (!oeuvre) return [];

    const contributeurs: Contributeur[] = [];

    // Users associés
    if (oeuvre.Users) {
      oeuvre.Users.forEach((user: any) => {
        contributeurs.push({
          id_user: user.id_user,
          nom: user.nom,
          prenom: user.prenom,
          photo_url: user.photo_url,
          role: user.OeuvreUser?.role_dans_oeuvre,
          type_user: user.TypeUser?.nom_type,
          TypeUser: user.TypeUser,
          personnage: user.OeuvreUser?.personnage,
          role_principal: user.OeuvreUser?.role_principal,
          description_role: user.OeuvreUser?.description_role,
        });
      });
    }

    // Intervenants associés
    if (oeuvre.Intervenants) {
      oeuvre.Intervenants.forEach((intervenant: any) => {
        contributeurs.push({
          id_intervenant: intervenant.id_intervenant,
          nom: intervenant.nom,
          prenom: intervenant.prenom,
          photo_url: intervenant.photo_url,
          TypeUser: intervenant.TypeUser,
          type_user: intervenant.TypeUser?.nom_type,
          personnage: intervenant.OeuvreIntervenant?.personnage,
          role_principal: intervenant.OeuvreIntervenant?.role_principal,
          description_role: intervenant.OeuvreIntervenant?.description_role,
        });
      });
    }

    return contributeurs;
  };

  // ============================================
  // ACTIONS WRAPPER
  // ============================================

  const addComment = async (contenu: string, note?: number) => {
    if (!isAuthenticated) {
      toast({
        title: t('auth.required', 'Connexion requise'),
        description: t('auth.loginToComment', 'Connectez-vous pour commenter'),
        variant: 'destructive',
      });
      return false;
    }

    try {
      await addCommentMutation.mutateAsync({ contenu, note });
      return true;
    } catch {
      return false;
    }
  };

  const incrementViews = () => {
    incrementViewsMutation.mutate();
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // Données
    oeuvre: oeuvreQuery.data as Oeuvre | undefined,
    medias: mediasQuery.data as Media[] | undefined,
    contributeurs: extractContributeurs(),
    comments: commentsQuery.data as Comment[] | undefined,
    relatedEvents: eventsQuery.data as Evenement[] | undefined,

    // États de chargement
    loading: oeuvreQuery.isLoading,
    loadingMedias: mediasQuery.isLoading,
    loadingComments: commentsQuery.isLoading,
    loadingEvents: eventsQuery.isLoading,

    // Erreurs
    error: oeuvreQuery.error?.message || null,

    // Favoris
    isFavorite,
    toggleFavorite,

    // Actions
    addComment,
    incrementViews,

    // États des mutations
    isAddingComment: addCommentMutation.isPending,

    // Refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: oeuvreKey });
      queryClient.invalidateQueries({ queryKey: mediasKey });
      queryClient.invalidateQueries({ queryKey: commentsKey });
      queryClient.invalidateQueries({ queryKey: eventsKey });
    },
  };
}

export default useOeuvreDetails;