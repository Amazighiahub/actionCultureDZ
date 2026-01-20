/**
 * useEventDetails - Hook pour la page détail événement
 * Gère le chargement des données et les actions (favoris, inscription, commentaires)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/UI/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriCheck } from '@/hooks/useFavoris';
import { evenementService } from '@/services/evenement.service';
import { programmeService } from '@/services/programme.service';
import { commentaireService } from '@/services/commentaire.service';
import { mediaService } from '@/services/media.service';
import type { Evenement } from '@/types/models/evenement.types';
import type { Programme } from '@/types/models/programme.types';
import type { Media } from '@/types/models/media.types';

interface EventDetailsOptions {
  enabled?: boolean;
}

interface Organizer {
  id: number;
  type: 'user' | 'organisation';
  nom: string;
  prenom?: string;
  photo_url?: string;
  logo_url?: string;
  role?: string;
  description?: string;
  email?: string;
  telephone?: string;
  site_web?: string;
  type_organisation?: string;
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

export function useEventDetails(eventId: number, options: EventDetailsOptions = {}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { enabled = true } = options;

  // Query keys
  const eventKey = ['event', eventId];
  const programsKey = ['event-programs', eventId];
  const mediasKey = ['event-medias', eventId];
  const commentsKey = ['event-comments', eventId];

  // ============================================
  // QUERIES
  // ============================================

  // Charger l'événement
  const eventQuery = useQuery({
    queryKey: eventKey,
    queryFn: async () => {
      const response = await evenementService.getDetail(eventId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Événement non trouvé');
    },
    enabled: enabled && eventId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Charger les programmes
  const programsQuery = useQuery({
    queryKey: programsKey,
    queryFn: async () => {
      try {
        // Essayer avec programmeService d'abord
        const response = await programmeService.getByEvent(eventId);
        if (response.success && response.data) {
          return response.data.programmes || [];
        }
      } catch (error) {
        console.warn('programmeService.getByEvent failed, trying evenementService.getProgrammes:', error);
        // Fallback vers evenementService
        const response = await evenementService.getProgrammes(eventId);
        if (response.success && response.data) {
          return response.data.programmes || [];
        }
      }
      return [];
    },
    enabled: enabled && eventId > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Charger les médias
  const mediasQuery = useQuery({
    queryKey: mediasKey,
    queryFn: async () => {
      const response = await evenementService.getMedias(eventId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: enabled && eventId > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Charger les commentaires
  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      const response = await commentaireService.getCommentairesEvenement(eventId);
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    enabled: enabled && eventId > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Vérifier le statut d'inscription de l'utilisateur
  const registrationKey = ['event-registration', eventId, user?.id_user];
  const registrationQuery = useQuery({
    queryKey: registrationKey,
    queryFn: async () => {
      const response = await evenementService.checkRegistration(eventId);
      if (response.success && response.data) {
        return response.data;
      }
      return { isRegistered: false, status: null };
    },
    enabled: enabled && eventId > 0 && isAuthenticated,
    staleTime: 30 * 1000, // 30 secondes
  });

  // ============================================
  // FAVORIS (utilise le hook existant)
  // ============================================
  
  const { isFavorite, toggleFavorite: toggleFavoriBase } = useFavoriCheck(
    'evenement',
    eventId
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

  // Inscription à l'événement
  const registerMutation = useMutation({
    mutationFn: async (data?: { nombre_personnes?: number; commentaire?: string; oeuvres?: number[]; notes?: string }) => {
      const response = await evenementService.inscription(eventId, data);
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de l\'inscription');
      }
      return response;
    },
    onSuccess: (response) => {
      const oeuvresCount = response.data?.oeuvres_soumises || 0;
      toast({
        title: t('event.registration.success', 'Inscription confirmée'),
        description: oeuvresCount > 0
          ? t('event.registration.successWithWorks', 'Vous êtes inscrit avec {{count}} œuvre(s) soumise(s)', { count: oeuvresCount })
          : t('event.registration.successDesc', 'Vous êtes inscrit à cet événement'),
      });
      queryClient.invalidateQueries({ queryKey: eventKey });
      queryClient.invalidateQueries({ queryKey: registrationKey });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Erreur'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Désinscription
  const unregisterMutation = useMutation({
    mutationFn: async () => {
      const response = await evenementService.desinscription(eventId);
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la désinscription');
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: t('event.registration.cancelled', 'Inscription annulée'),
        description: t('event.registration.cancelledDesc', 'Votre inscription a été annulée'),
      });
      queryClient.invalidateQueries({ queryKey: eventKey });
      queryClient.invalidateQueries({ queryKey: registrationKey });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Erreur'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ contenu, note }: { contenu: string; note?: number }) => {
      const response = await commentaireService.createCommentaireEvenement(eventId, {
        contenu,
        // Note est généralement gérée séparément ou dans le contenu
      });
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

  // ============================================
  // HELPERS
  // ============================================

  // Extraire les organisateurs depuis l'événement
  const extractOrganizers = (): Organizer[] => {
    const event = eventQuery.data;
    if (!event) return [];

    const organizers: Organizer[] = [];

    // Organisateur principal (User)
    if (event.Organisateur) {
      organizers.push({
        id: event.Organisateur.id_user,
        type: 'user',
        nom: event.Organisateur.nom,
        prenom: event.Organisateur.prenom,
        photo_url: event.Organisateur.photo_url,
        role: 'organisateur_principal',
        email: event.Organisateur.email,
      });
    }

    // Organisations partenaires
    if (event.Organisations) {
      event.Organisations.forEach((org) => {
        organizers.push({
          id: org.id_organisation,
          type: 'organisation',
          nom: org.nom,
          logo_url: org.logo_url,
          role: org.EvenementOrganisation?.role || 'partenaire',
          description: org.description,
          site_web: org.site_web,
          type_organisation: org.TypeOrganisation?.nom,
        });
      });
    }

    return organizers;
  };

  // ============================================
  // ACTIONS WRAPPER
  // ============================================

  const registerToEvent = async (data?: { nombre_personnes?: number; commentaire?: string; oeuvres?: number[]; notes?: string }) => {
    if (!isAuthenticated) {
      toast({
        title: t('auth.required', 'Connexion requise'),
        description: t('auth.loginToRegister', 'Connectez-vous pour vous inscrire'),
        variant: 'destructive',
      });
      return false;
    }

    try {
      await registerMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  };

  const unregisterFromEvent = async () => {
    if (!isAuthenticated) return false;

    try {
      await unregisterMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  };

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

  // ============================================
  // RETURN
  // ============================================

  return {
    // Données
    event: eventQuery.data as Evenement | undefined,
    programs: programsQuery.data as Programme[] | undefined,
    medias: mediasQuery.data as Media[] | undefined,
    comments: commentsQuery.data as Comment[] | undefined,
    organizers: extractOrganizers(),

    // États de chargement
    loading: eventQuery.isLoading,
    loadingPrograms: programsQuery.isLoading,
    loadingMedias: mediasQuery.isLoading,
    loadingComments: commentsQuery.isLoading,

    // Erreurs
    error: eventQuery.error?.message || null,

    // Favoris
    isFavorite,
    toggleFavorite,

    // Inscription
    isRegistered: registrationQuery.data?.isRegistered || false,
    registrationStatus: registrationQuery.data?.status as 'pending' | 'confirmed' | 'cancelled' | 'waiting_list' | undefined,

    // Actions
    registerToEvent,
    unregisterFromEvent,
    addComment,

    // États des mutations
    isRegistering: registerMutation.isPending,
    isUnregistering: unregisterMutation.isPending,
    isAddingComment: addCommentMutation.isPending,

    // Refresh
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: eventKey });
      queryClient.invalidateQueries({ queryKey: programsKey });
      queryClient.invalidateQueries({ queryKey: mediasKey });
      queryClient.invalidateQueries({ queryKey: commentsKey });
      queryClient.invalidateQueries({ queryKey: registrationKey });
    },
  };
}

export default useEventDetails;
