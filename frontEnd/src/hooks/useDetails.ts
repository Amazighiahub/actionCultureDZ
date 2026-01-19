/**
 * Hooks pour les pages de détails (événements et œuvres)
 * Compatible avec l'infrastructure existante: useQuery, useFavoris
 */
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/UI/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriCheck } from '@/hooks/useFavoris';
import { httpClient } from '@/services/httpClient';
import { evenementService } from '@/services/evenement.service';
import { oeuvreService } from '@/services/oeuvre.service';
import { commentaireService } from '@/services/commentaire.service';

// ============================================================================
// Types communs
// ============================================================================
export interface Media {
  id_media: number;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  titre?: string;
  description?: string;
  est_principal?: boolean;
}

export interface Comment {
  id_commentaire: number;
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

// ============================================================================
// useEventDetails - Hook pour la page détail événement
// ============================================================================
export interface EventDetails {
  id_evenement: number;
  nom_evenement: string;
  description?: string;
  date_debut?: string;
  date_fin?: string;
  heure_debut?: string;
  heure_fin?: string;
  lieu?: any;
  image_url?: string;
  statut: string;
  tarif?: number;
  gratuit?: boolean;
  capacite_max?: number;
  nombre_inscrits?: number;
  est_complet?: boolean;
  type_evenement?: string;
  Lieu?: {
    nom: string;
    adresse?: string;
    latitude?: number;
    longitude?: number;
    Wilaya?: { nom: string };
  };
  Programmes?: Program[];
  Media?: Media[];
  Commentaires?: Comment[];
  Organisations?: Array<{
    User?: {
      id_user: number;
      nom: string;
      prenom: string;
      photo_url?: string;
    };
    role?: string;
  }>;
  Tags?: Array<{ nom: string }>;
}

export interface Program {
  id_programme: number;
  titre: string;
  description?: string;
  heure_debut?: string;
  heure_fin?: string;
  ordre?: number;
  intervenants?: Array<{
    nom: string;
    prenom: string;
    photo_url?: string;
    fonction?: string;
  }>;
}

export interface Organizer {
  id: number;
  nom: string;
  prenom: string;
  photo_url?: string;
  role?: string;
}

interface UseEventDetailsOptions {
  autoFetch?: boolean;
}

export function useEventDetails(eventId: number, options: UseEventDetailsOptions = {}) {
  const { autoFetch = true } = options;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Utiliser useFavoriCheck pour les favoris
  const { isFavorite, toggle: toggleFavorite, loading: favoriteLoading } = useFavoriCheck('evenement', eventId);

  // Query pour charger l'événement
  const {
    data: eventData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['event-details', eventId],
    queryFn: async () => {
      const response = await evenementService.getById(eventId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch && !!eventId,
    staleTime: 5 * 60 * 1000,
  });

  // Extraire les données
  const event = eventData as EventDetails | null;
  const programs = event?.Programmes || [];
  const medias = event?.Media || [];
  const comments = event?.Commentaires || [];
  const organizers: Organizer[] = (event?.Organisations || []).map(org => ({
    id: org.User?.id_user || 0,
    nom: org.User?.nom || '',
    prenom: org.User?.prenom || '',
    photo_url: org.User?.photo_url,
    role: org.role
  }));

  // Mutation pour ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, rating }: { content: string; rating?: number }) => {
      const response = await commentaireService.create({
        type: 'evenement',
        id_reference: eventId,
        contenu: content,
        note: rating
      });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Commentaire ajouté' });
      queryClient.invalidateQueries({ queryKey: ['event-details', eventId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation pour s'inscrire à l'événement
  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await evenementService.register(eventId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Inscription réussie !' });
      queryClient.invalidateQueries({ queryKey: ['event-details', eventId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur d\'inscription', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation pour se désinscrire
  const unregisterMutation = useMutation({
    mutationFn: async () => {
      const response = await evenementService.unregister(eventId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Désinscription effectuée' });
      queryClient.invalidateQueries({ queryKey: ['event-details', eventId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Fonctions wrapper
  const addComment = useCallback(async (content: string, rating?: number) => {
    if (!isAuthenticated) {
      toast({ title: 'Connexion requise', variant: 'destructive' });
      return false;
    }
    try {
      await addCommentMutation.mutateAsync({ content, rating });
      return true;
    } catch {
      return false;
    }
  }, [isAuthenticated, addCommentMutation, toast]);

  const registerToEvent = useCallback(async () => {
    if (!isAuthenticated) {
      toast({ title: 'Connexion requise', variant: 'destructive' });
      return false;
    }
    try {
      await registerMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [isAuthenticated, registerMutation, toast]);

  return {
    // Données
    event,
    programs,
    medias,
    comments,
    organizers,
    
    // États
    loading,
    error: error?.message || null,
    
    // Favoris
    isFavorite,
    toggleFavorite,
    favoriteLoading,
    
    // Actions
    addComment,
    registerToEvent,
    unregisterFromEvent: unregisterMutation.mutate,
    refresh: refetch,
    
    // États des mutations
    isAddingComment: addCommentMutation.isPending,
    isRegistering: registerMutation.isPending
  };
}

// ============================================================================
// useOeuvreDetails - Hook pour la page détail œuvre
// ============================================================================
export interface OeuvreDetails {
  id_oeuvre: number;
  titre: string;
  description?: string;
  annee_creation?: number;
  prix?: number;
  statut: string;
  id_type_oeuvre: number;
  vues?: number;
  note_moyenne?: number;
  TypeOeuvre?: { nom_type: string; code?: string };
  Langue?: { nom: string; code?: string };
  Media?: Media[];
  Commentaires?: Comment[];
  Tags?: Array<{ nom: string }>;
  Categories?: Array<{ nom: string }>;
  Users?: Array<{
    id_user: number;
    nom: string;
    prenom: string;
    photo_url?: string;
    OeuvreUser?: {
      TypeUser?: { nom: string };
    };
  }>;
  OeuvreIntervenants?: Array<{
    Intervenant?: {
      id_intervenant: number;
      nom: string;
      prenom: string;
      photo_url?: string;
    };
    TypeUser?: { nom: string };
  }>;
  Evenements?: Array<{
    id_evenement: number;
    nom_evenement: string;
    date_debut?: string;
    image_url?: string;
  }>;
  // Champs spécifiques par type
  isbn?: string;
  nb_pages?: number;
  editeur?: string;
  duree_minutes?: number;
  realisateur?: string;
  journal?: string;
  doi?: string;
  dimensions?: string;
  technique?: string;
  materiau?: string;
}

export interface Contributeur {
  id: string;
  nom: string;
  prenom: string;
  photo_url?: string;
  role?: string;
  type: 'user' | 'intervenant';
}

interface UseOeuvreDetailsOptions {
  autoFetch?: boolean;
  incrementViews?: boolean;
}

export function useOeuvreDetails(oeuvreId: number, options: UseOeuvreDetailsOptions = {}) {
  const { autoFetch = true, incrementViews = true } = options;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [viewIncremented, setViewIncremented] = useState(false);
  
  // Utiliser useFavoriCheck pour les favoris
  const { isFavorite, toggle: toggleFavorite, loading: favoriteLoading } = useFavoriCheck('oeuvre', oeuvreId);

  // Query pour charger l'œuvre
  const {
    data: oeuvreData,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['oeuvre-details', oeuvreId],
    queryFn: async () => {
      const response = await oeuvreService.getById(oeuvreId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch && !!oeuvreId,
    staleTime: 5 * 60 * 1000,
  });

  // Incrémenter les vues une seule fois
  useEffect(() => {
    if (oeuvreId && incrementViews && !viewIncremented && oeuvreData) {
      oeuvreService.incrementViews?.(oeuvreId).catch(() => {});
      setViewIncremented(true);
    }
  }, [oeuvreId, incrementViews, viewIncremented, oeuvreData]);

  // Extraire les données
  const oeuvre = oeuvreData as OeuvreDetails | null;
  const medias = oeuvre?.Media || [];
  const comments = oeuvre?.Commentaires || [];
  const relatedEvents = oeuvre?.Evenements || [];

  // Extraire les contributeurs
  const contributeurs: Contributeur[] = [];
  
  if (oeuvre?.Users) {
    oeuvre.Users.forEach(user => {
      contributeurs.push({
        id: `user-${user.id_user}`,
        nom: user.nom,
        prenom: user.prenom,
        photo_url: user.photo_url,
        role: user.OeuvreUser?.TypeUser?.nom || 'Contributeur',
        type: 'user'
      });
    });
  }

  if (oeuvre?.OeuvreIntervenants) {
    oeuvre.OeuvreIntervenants.forEach(oi => {
      if (oi.Intervenant) {
        contributeurs.push({
          id: `intervenant-${oi.Intervenant.id_intervenant}`,
          nom: oi.Intervenant.nom,
          prenom: oi.Intervenant.prenom,
          photo_url: oi.Intervenant.photo_url,
          role: oi.TypeUser?.nom || 'Intervenant',
          type: 'intervenant'
        });
      }
    });
  }

  // Mutation pour ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, rating }: { content: string; rating?: number }) => {
      const response = await commentaireService.create({
        type: 'oeuvre',
        id_reference: oeuvreId,
        contenu: content,
        note: rating
      });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Commentaire ajouté' });
      queryClient.invalidateQueries({ queryKey: ['oeuvre-details', oeuvreId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });

  // Fonction wrapper pour ajouter un commentaire
  const addComment = useCallback(async (content: string, rating?: number) => {
    if (!isAuthenticated) {
      toast({ title: 'Connexion requise', variant: 'destructive' });
      return false;
    }
    try {
      await addCommentMutation.mutateAsync({ content, rating });
      return true;
    } catch {
      return false;
    }
  }, [isAuthenticated, addCommentMutation, toast]);

  return {
    // Données
    oeuvre,
    medias,
    contributeurs,
    comments,
    relatedEvents,
    
    // États
    loading,
    error: error?.message || null,
    
    // Favoris
    isFavorite,
    toggleFavorite,
    favoriteLoading,
    
    // Actions
    addComment,
    refresh: refetch,
    
    // États des mutations
    isAddingComment: addCommentMutation.isPending
  };
}

// ============================================================================
// useRelatedItems - Hook pour les éléments similaires
// ============================================================================
interface UseRelatedItemsOptions {
  type: 'oeuvre' | 'evenement';
  itemId: number;
  limit?: number;
  autoFetch?: boolean;
}

export function useRelatedItems(options: UseRelatedItemsOptions) {
  const { type, itemId, limit = 4, autoFetch = true } = options;

  const {
    data: relatedData,
    isLoading: loading,
    error
  } = useQuery({
    queryKey: ['related-items', type, itemId],
    queryFn: async () => {
      const endpoint = type === 'oeuvre' 
        ? `/oeuvres/${itemId}/related`
        : `/evenements/${itemId}/related`;
      
      const response = await httpClient.get<any>(endpoint, { limit });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: autoFetch && !!itemId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    items: relatedData?.items || relatedData || [],
    loading,
    error: error?.message || null
  };
}
