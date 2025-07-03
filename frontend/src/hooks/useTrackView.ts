// hooks/useTrackView.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { httpClient } from '@/services/httpClient';

interface TrackViewOptions {
  delay?: number; // Délai avant d'enregistrer la vue (en ms)
  trackOnce?: boolean; // Ne tracker qu'une fois par session
}

/**
 * Hook personnalisé pour tracker les vues d'une entité
 * @param entityType Type d'entité ('oeuvre', 'evenement', 'lieu', 'artisanat')
 * @param entityId ID de l'entité
 * @param options Options de tracking
 */
export const useTrackView = (
  entityType: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat' | null,
  entityId: number | null,
  options: TrackViewOptions = {}
) => {
  const { delay = 3000, trackOnce = true } = options;
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!entityType || !entityId) return;
    if (trackOnce && hasTracked.current) return;

    const startTime = Date.now();

    const trackView = async () => {
      try {
        const duration = Date.now() - startTime;
        
        await httpClient.post(`/tracking/view`, {
          type_entite: entityType,
          id_entite: entityId,
          duree_secondes: Math.floor(duration / 1000)
        });
        
        hasTracked.current = true;
        console.log(`✅ Vue enregistrée: ${entityType} #${entityId}`);
      } catch (error) {
        console.error('❌ Erreur tracking vue:', error);
      }
    };

    // Tracker après le délai spécifié
    const timer = setTimeout(trackView, delay);

    // Tracker aussi quand l'utilisateur quitte la page
    const handleBeforeUnload = () => {
      if (!hasTracked.current) {
        // Envoyer de manière synchrone si possible
        const duration = Date.now() - startTime;
        navigator.sendBeacon?.(`/api/tracking/view`, JSON.stringify({
          type_entite: entityType,
          id_entite: entityId,
          duree_secondes: Math.floor(duration / 1000)
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [entityType, entityId, delay, trackOnce]);
};

/**
 * Hook pour tracker les interactions avec une entité
 */
export const useTrackInteraction = (
  entityType: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat' | null,
  entityId: number | null
) => {
  const trackInteraction = async (action: 'like' | 'share' | 'favorite' | 'comment') => {
    if (!entityType || !entityId) return;

    try {
      await httpClient.post(`/tracking/interaction`, {
        type_entite: entityType,
        id_entite: entityId,
        type_interaction: action
      });
      
      console.log(`✅ Interaction enregistrée: ${action} sur ${entityType} #${entityId}`);
    } catch (error) {
      console.error('❌ Erreur tracking interaction:', error);
    }
  };

  return { trackInteraction };
};

/**
 * Hook pour récupérer les statistiques de vues
 */
export const useViewStats = (
  entityType: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat',
  entityId: number
) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await httpClient.get(`/tracking/stats/${entityType}/${entityId}`);
        
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          throw new Error(response.error || 'Erreur lors de la récupération des stats');
        }
      } catch (err) {
        console.error('Erreur récupération stats:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    if (entityType && entityId) {
      fetchStats();
    }
  }, [entityType, entityId]);

  return { stats, loading, error };
};