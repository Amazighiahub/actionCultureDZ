/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Info, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  Activity,
  Zap,
  Gauge
} from 'lucide-react';
import { evenementService } from '@/services/evenement.service';
import { httpClient } from '@/services/httpClient';

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

const Evenements = () => {
  const navigate = useNavigate();
  const rateLimitStats = useRateLimitMonitor();
  
  const [evenements, setEvenements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string>('tous');
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [filteredEvenements, setFilteredEvenements] = useState<any[]>([]);
  const [showRateLimitInfo, setShowRateLimitInfo] = useState(false);

  // Utiliser le mode conservateur au montage si nécessaire
  useEffect(() => {
    // Vérifier si on a eu des problèmes de rate limit récemment
    const lastRateLimit = localStorage.getItem('lastRateLimit');
    if (lastRateLimit) {
      const timeSince = Date.now() - parseInt(lastRateLimit);
      if (timeSince < 5 * 60 * 1000) { // Moins de 5 minutes
        (httpClient as any).useConservativeMode?.();
        console.log('🐢 Mode conservateur activé (rate limit récent)');
      }
    }

    return () => {
      // Retour au mode normal en quittant
      (httpClient as any).useNormalMode?.();
    };
  }, []);

  const loadEvenements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Construire les paramètres
      const params: any = { limit: 20 };
      if (selectedStatut !== 'tous') {
        params.statut = selectedStatut;
      }
      
      // Utiliser evenementService qui utilise httpClient amélioré
      const result = await evenementService.search(params);
      
      if (result.success && result.data) {
        const events = (result.data as any).items || 
                      (result.data as any).results || 
                      (result.data as any).data || 
                      result.data || 
                      [];
        
        console.log(`✅ ${events.length} événements chargés`);
        setEvenements(Array.isArray(events) ? events : []);
        
        // Sauvegarder en localStorage comme backup
        try {
          localStorage.setItem('evenements_backup', JSON.stringify(events));
          localStorage.setItem('evenements_backup_time', Date.now().toString());
        } catch (e) {
          console.error('Erreur sauvegarde backup:', e);
        }
      } else {
        throw new Error(result.error || 'Erreur lors du chargement des événements');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      
      // Gérer spécifiquement le rate limit
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        localStorage.setItem('lastRateLimit', Date.now().toString());
        
        // Essayer de charger depuis le backup
        const backup = localStorage.getItem('evenements_backup');
        const backupTime = localStorage.getItem('evenements_backup_time');
        
        if (backup && backupTime) {
          const age = Date.now() - parseInt(backupTime);
          if (age < 30 * 60 * 1000) { // 30 minutes
            try {
              const events = JSON.parse(backup);
              setEvenements(events);
              setError('Limite de requêtes atteinte. Affichage des données en cache.');
              return;
            } catch (e) {
              console.error('Erreur parsing backup:', e);
            }
          }
        }
        
        setError('Trop de requêtes. Veuillez patienter quelques instants.');
      } else {
        setError('Impossible de charger les événements');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStatut]);

  // Charger au montage et quand le filtre change
  useEffect(() => {
    loadEvenements();
  }, [loadEvenements]);

  // Filtrer localement par type
  useEffect(() => {
    let filtered = [...evenements];

    if (selectedType !== 'tous') {
      filtered = filtered.filter(e => {
        const type = e.type_evenement?.nom_type || e.TypeEvenement?.nom_type || e.type;
        return type === selectedType;
      });
    }

    setFilteredEvenements(filtered);
  }, [evenements, selectedType]);

  const handleEventDetails = (eventId: number) => {
    navigate(`/evenements/${eventId}`);
  };

  const formatDate = (dateDebut?: string, dateFin?: string) => {
    if (!dateDebut) return 'Date non définie';
    
    const start = new Date(dateDebut);
    const end = dateFin ? new Date(dateFin) : null;
    
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    
    if (end && dateDebut !== dateFin) {
      return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('fr-FR', options)}`;
    }
    
    return start.toLocaleDateString('fr-FR', options);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifie':
        return 'default';
      case 'en_cours':
        return 'success';
      case 'termine':
        return 'secondary';
      case 'annule':
        return 'destructive';
      case 'reporte':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifie':
        return 'À venir';
      case 'en_cours':
        return 'En cours';
      case 'termine':
        return 'Terminé';
      case 'annule':
        return 'Annulé';
      case 'reporte':
        return 'Reporté';
      default:
        return status;
    }
  };

  const formatParticipants = (event: any) => {
    if (!event.capacite_max) return 'Places illimitées';
    const inscrits = event.participants_count || 
                     event.nombre_participants || 
                     event.nombre_inscrits || 
                     0;
    return `${inscrits}/${event.capacite_max}`;
  };

  const formatTarif = (event: any) => {
    const tarif = event.tarif || event.prix || 0;
    if (!tarif || tarif === 0) return 'Gratuit';
    return `${tarif} DA`;
  };

  const uniqueTypes = Array.from(new Set(
    evenements
      .map(e => e.type_evenement?.nom_type || e.TypeEvenement?.nom_type || e.type)
      .filter(Boolean)
  ));

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
      
      {/* Indicateur de rate limit en développement */}
      {process.env.NODE_ENV === 'development' && rateLimitStats && (
        <div className="fixed bottom-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            className="shadow-lg"
            onClick={() => setShowRateLimitInfo(!showRateLimitInfo)}
          >
            <Activity className={`h-4 w-4 mr-2 text-${health.color}-500`} />
            Rate Limit
          </Button>
          
          {showRateLimitInfo && (
            <Card className="absolute bottom-full left-0 mb-2 w-64">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  État du Rate Limit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>File d'attente:</span>
                  <span className="font-mono">{rateLimitStats.queueSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache:</span>
                  <span className="font-mono">{rateLimitStats.cacheSize} entrées</span>
                </div>
                <div className="flex justify-between">
                  <span>Req/minute:</span>
                  <span className="font-mono">{rateLimitStats.requestsLastMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span>Délai actuel:</span>
                  <span className="font-mono">{rateLimitStats.currentDelay}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>429 hits:</span>
                  <span className="font-mono">{rateLimitStats.rateLimitHits}</span>
                </div>
                <Progress 
                  value={(rateLimitStats.requestsLastMinute / 30) * 100} 
                  className="h-2"
                />
                <div className={`text-xs text-${health.color}-600 font-medium`}>
                  {health.message}
                </div>
                <div className="pt-2 space-y-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      (httpClient as any).clearCache?.();
                      loadEvenements();
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Vider cache & recharger
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const mode = rateLimitStats.currentDelay > 500 ? 'normal' : 'conservative';
                      if (mode === 'normal') {
                        (httpClient as any).useNormalMode?.();
                      } else {
                        (httpClient as any).useConservativeMode?.();
                      }
                    }}
                  >
                    {rateLimitStats.currentDelay > 500 ? '🚶 Mode normal' : '🐢 Mode lent'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <main className="container py-12">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            Événements culturels
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Participez aux événements qui animent la scène culturelle algérienne
          </p>
          <p className="text-sm text-muted-foreground">
            {filteredEvenements.length} événement{filteredEvenements.length > 1 ? 's' : ''} disponible{filteredEvenements.length > 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <Alert variant={error.includes('cache') ? 'default' : 'destructive'} className="max-w-2xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {!error.includes('cache') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-4"
                  onClick={loadEvenements}
                >
                  Réessayer
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filtres par statut */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <Button 
            variant={selectedStatut === 'tous' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedStatut('tous')}
          >
            Tous les statuts
          </Button>
          <Button 
            variant={selectedStatut === 'planifie' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedStatut('planifie')}
          >
            À venir
          </Button>
          <Button 
            variant={selectedStatut === 'en_cours' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedStatut('en_cours')}
          >
            En cours
          </Button>
          <Button 
            variant={selectedStatut === 'termine' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedStatut('termine')}
          >
            Passés
          </Button>
        </div>

        {/* Filtres par type */}
        <div className="flex flex-wrap gap-4 mb-12 justify-center">
          <Button 
            variant={selectedType === 'tous' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedType('tous')}
          >
            Toutes catégories
          </Button>
          {uniqueTypes.map(type => (
            <Button 
              key={type}
              variant={selectedType === type ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedType(type!)}
            >
              {type?.charAt(0).toUpperCase() + type?.slice(1)}
            </Button>
          ))}
        </div>

        {/* Liste des événements */}
        {filteredEvenements.length === 0 ? (
          <Alert className="max-w-2xl mx-auto">
            <AlertDescription>
              Aucun événement ne correspond à vos critères de recherche.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Cartes d'événements - code existant */}
            {filteredEvenements.map((evenement) => {
              const eventId = evenement.id_evenement || evenement.id;
              const eventName = evenement.nom_evenement || evenement.titre || 'Sans titre';
              const eventImage = evenement.image_url || evenement.image;
              const eventType = evenement.type_evenement?.nom_type || evenement.TypeEvenement?.nom_type || evenement.type || 'Événement';
              const eventLieu = evenement.Lieu || evenement.lieu;
              const lieuName = eventLieu?.nom || evenement.adresse || 'Lieu non défini';
              // Ne pas utiliser est_complet car c'est une Promise (getter async)
// Utiliser les données calculées côté backend
const participants = evenement.participants_count || 
evenement.nombre_participants || 
evenement.nombre_inscrits || 
0;

const eventComplet = evenement.capacite_max && participants >= evenement.capacite_max;
              return (
                <Card key={eventId} className="overflow-hidden hover-lift group">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {eventImage ? (
                      <img 
                        src={eventImage} 
                        alt={eventName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                        <Calendar className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-serif text-lg leading-tight line-clamp-2">
                        {eventName}
                      </CardTitle>
                      <Badge 
                        variant={getStatusColor(evenement.statut) as any}
                        className="ml-2 whitespace-nowrap"
                      >
                        {getStatusLabel(evenement.statut)}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="self-start mt-2">
                      {eventType}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {evenement.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {evenement.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{formatDate(evenement.date_debut, evenement.date_fin)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{lieuName}</span>
                      </div>
                      {evenement.capacite_max && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{formatParticipants(evenement)}</span>
                          {eventComplet && (
                            <Badge variant="destructive" className="text-xs">
                              Complet
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">{formatTarif(evenement)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full btn-hover group"
                      onClick={() => handleEventDetails(eventId)}
                      disabled={evenement.statut === 'annule'}
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Détails événement
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Evenements;