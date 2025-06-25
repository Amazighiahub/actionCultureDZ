/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Eye, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '@/services/httpClient';
import { useCallback } from 'react';
import { oeuvreService } from '@/services/oeuvre.service';
import { Loader2 } from 'lucide-react';

// Hook pour monitorer le rate limit
function useRateLimitMonitor() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const updateStats = () => {
      const queueStats = (httpClient as any).getQueueStats?.();
      setStats(queueStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

const Oeuvres = () => {
  const navigate = useNavigate();
  const rateLimitStats = useRateLimitMonitor();

  const [oeuvres, setOeuvres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string>('tous');
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [filteredOeuvres, setFilteredOeuvres] = useState<any[]>([]);
  const [showRateLimitInfo, setShowRateLimitInfo] = useState(false);

  useEffect(() => {
    // Vérifier si on a eu des problèmes de rate limit récemment
    const lastRateLimit = localStorage.getItem('lastRateLimit');
    if (lastRateLimit) {
      const timeSince = Date.now() - parseInt(lastRateLimit);
      if (timeSince < 5 * 60 * 1000) { // Moins de 5 minutes
        (httpClient as any).useConservativeMode?.();
        console.log('rate limit récent');
      }
    }

    return () => {
      // Retour au mode normal en quittant
      (httpClient as any).useNormalMode?.();
    };
  }, []);

  const loadOeuvres = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // const params: any = { limit: 20 };
      // if (selectedStatut !== 'tous') {
      //   params.statut = selectedStatut;
      // }

      const result = await oeuvreService.getOeuvres();

      console.error('ICI',result);

      if (result.success && result.data) {
        const oeuvres = (result.data as any).items ||
          (result.data as any).results ||
          (result.data as any).data ||
          result.data ||
          [];

        console.log(`${oeuvres.length} oeuvres chargés`);
        setOeuvres(Array.isArray(oeuvres) ? oeuvres : []);

        try {
          localStorage.setItem('oeuvres_backup', JSON.stringify(oeuvres));
          localStorage.setItem('oeuvres_backup_time', Date.now().toString());
        } catch (e) {
          console.error('Erreur sauvegarde backup:', e);
        }
      } else {
        throw new Error(result.error || 'Erreur lors du chargement des œuvres');
      }
    }
    catch (err) {
      console.error('Erreur:', err);

      // Gérer spécifiquement le rate limit
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        localStorage.setItem('lastRateLimit', Date.now().toString());

        // Essayer de charger depuis le backup
        const backup = localStorage.getItem('oeuvres_backup');
        const backupTime = localStorage.getItem('oeuvres_backup_time');

        if (backup && backupTime) {
          const age = Date.now() - parseInt(backupTime);
          if (age < 30 * 60 * 1000) { // 30 minutes
            try {
              const oeuvres = JSON.parse(backup);
              setOeuvres(oeuvres);
              setError('Limite de requêtes atteinte. Affichage des données en cache.');
              return;
            } catch (e) {
              console.error('Erreur parsing backup:', e);
            }
          }
        }
        setError('Trop de requêtes. Veuillez patienter quelques instants.');
      } else {
        setError('Impossible de charger les œuvres');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStatut]);

  useEffect(() => {
    loadOeuvres();
  }, [loadOeuvres]);

  // Filtrer localement par type
  useEffect(() => {
    let filtered = [...oeuvres];

    if (selectedType !== 'tous') {
      filtered = filtered.filter(e => {
        const type = e.type_evenement?.nom_type || e.TypeEvenement?.nom_type || e.type;
        return type === selectedType;
      });
    }
    setFilteredOeuvres(filtered);
  }, [oeuvres, selectedType]);

  const handleOeuvreDetails = (oeuvreId: number) => {
    navigate(`/oeuvres/${oeuvreId}`);
  };

  // Indicateur de santé du rate limit
  const getRateLimitHealth = () => {
    if (!rateLimitStats) return { status: 'unknown', color: 'gray' };

    const { requestsLastMinute, rateLimitHits, currentDelay } = rateLimitStats;

    if (rateLimitHits > 0) {
      return { status: 'critical', color: 'red', message: 'Rate limit atteint!' };
    }

    if (requestsLastMinute > 25) {
      return { status: 'warning', color: 'orange', message: 'Proche de la limite' };
    }

    if (currentDelay > 500) {
      return { status: 'slow', color: 'yellow', message: 'Mode ralenti actif' };
    }

    return { status: 'good', color: 'green', message: 'Tout va bien' };
  };

  const health = getRateLimitHealth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {rateLimitStats && (
              <p className="text-sm text-muted-foreground">
                File d'attente: {rateLimitStats.queueSize} requête(s)
              </p>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            Bibliothèque numérique
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Téléchargez les œuvres littéraires, cinématographiques et artistiques
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          <Button variant="outline" size="sm">Toutes catégories</Button>
          <Button variant="outline" size="sm">Littérature</Button>
          <Button variant="outline" size="sm">Cinéma</Button>
          <Button variant="outline" size="sm">Art visuel</Button>
          <Button variant="outline" size="sm">Musique</Button>
        </div>

        {/* Liste des œuvres */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {oeuvres.map((oeuvre) => (
            <Card key={oeuvre.titre} className="overflow-hidden hover-lift">
              <div className="aspect-[3/4]">
                <img
                  src={oeuvre.image}
                  alt={oeuvre.titre}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <div className="space-y-2">
                  <Badge variant="secondary" className="self-start">
                    {oeuvre.type}
                  </Badge>
                  <CardTitle className="font-serif leading-tight">
                    {oeuvre.titre}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{oeuvre.auteur}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {oeuvre.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {oeuvre.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{oeuvre.note}</span>
                    <span className="text-muted-foreground">({oeuvre.avis})</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{oeuvre.telechargements}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-primary">{oeuvre.prix}</span>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Aperçu
                    </Button>
                    <Button size="sm" className="flex-1 btn-hover">
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Acheter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Oeuvres;
