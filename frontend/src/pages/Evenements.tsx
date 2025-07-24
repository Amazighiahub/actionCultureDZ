/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Progress } from '@/components/UI/progress';
import { Input } from '@/components/UI/input';
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
  Gauge,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  X
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rateLimitStats = useRateLimitMonitor();

  const [evenements, setEvenements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<string>('tous');
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredEvenements, setFilteredEvenements] = useState<any[]>([]);
  const [showRateLimitInfo, setShowRateLimitInfo] = useState(false);

  // Utiliser le mode conservateur au montage si nécessaire
  useEffect(() => {
    // Vérifier si on a eu des problèmes de rate limit récemment
    const lastRateLimit = localStorage.getItem('lastRateLimit');
    if (lastRateLimit) {
      const timeSince = Date.now() - parseInt(lastRateLimit);
      if (timeSince < 5 * 60 * 1000) {// Moins de 5 minutes
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
      const params: any = { limit: 50 }; // Charger plus d'événements pour filtrer localement

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
          if (age < 30 * 60 * 1000) {// 30 minutes
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
  }, []);

  // Charger au montage
  useEffect(() => {
    loadEvenements();
  }, [loadEvenements]);

  // Filtrer localement par type, statut et recherche
  useEffect(() => {
    let filtered = [...evenements];

    // Filtrer par statut
    if (selectedStatut !== 'tous') {
      filtered = filtered.filter((e) => e.statut === selectedStatut);
    }

    // Filtrer par type
    if (selectedType !== 'tous') {
      filtered = filtered.filter((e) => {
        const type = e.type_evenement?.nom_type || e.TypeEvenement?.nom_type || e.type;
        return type === selectedType;
      });
    }

    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => {
        const nom = (e.nom_evenement || e.titre || '').toLowerCase();
        const description = (e.description || '').toLowerCase();
        const lieu = (e.Lieu?.nom || e.lieu?.nom || e.adresse || '').toLowerCase();
        return nom.includes(query) || description.includes(query) || lieu.includes(query);
      });
    }

    setFilteredEvenements(filtered);
  }, [evenements, selectedType, selectedStatut, searchQuery]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifie':
        return Clock;
      case 'en_cours':
        return Activity;
      case 'termine':
        return CheckCircle;
      case 'annule':
        return XCircle;
      case 'reporte':
        return AlertTriangle;
      default:
        return Calendar;
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
    evenements.
    map((e) => e.type_evenement?.nom_type || e.TypeEvenement?.nom_type || e.type).
    filter(Boolean)
  ));

  // Statistiques pour chaque statut
  const getStatutCount = (statut: string) => {
    if (statut === 'tous') return evenements.length;
    return evenements.filter(e => e.statut === statut).length;
  };

  // Indicateur de santé du rate limit
  const getRateLimitHealth = () => {
    if (!rateLimitStats) return { status: 'unknown', color: 'gray' };

    const { requestsLastMinute, rateLimitHits, currentDelay } = rateLimitStats;

    if (rateLimitHits > 0) {
      return { status: 'critical', color: 'red', message: t("evenements.message_rate_limit_atteint") };
    }

    if (requestsLastMinute > 25) {
      return { status: 'warning', color: 'orange', message: t("evenements.message_proche_limite") };
    }

    if (currentDelay > 500) {
      return { status: 'slow', color: 'yellow', message: t("evenements.message_mode_ralenti_actif") };
    }

    return { status: 'good', color: 'green', message: t("evenements.message_tout_bien") };
  };

  const health = getRateLimitHealth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("evenements.loading")}</p>
            {rateLimitStats &&
            <p className="text-sm text-muted-foreground">{t("evenements.file_dattente_1")}
              {rateLimitStats.queueSize}{t("evenements.requtes")}
            </p>
            }
          </div>
        </main>
        <Footer />
      </div>);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Nouveau design du sous-menu avec types d'événements */}
      <div className="sticky top-16 z-40 bg-gradient-to-br from-primary via-primary/90 to-primary/80 dark:from-primary/90 dark:via-primary/80 dark:to-primary/70 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
          <div className="relative py-2">
            {/* Overlay avec pattern subtil */}
            <div className="absolute inset-0 opacity-10" 
                 style={{
                   backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                    radial-gradient(circle at 60% 30%, white 1px, transparent 1px),
                                    radial-gradient(circle at 80% 70%, white 1px, transparent 1px)`,
                   backgroundSize: '30px 30px',
                   backgroundPosition: '0 0, 15px 15px, 30px 30px'
                 }}>
            </div>
            
            {/* Conteneur des tabs centré */}
            <div 
              className="flex items-center justify-center gap-6 lg:gap-8 overflow-x-auto relative"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Tab Tous */}
              <button
                onClick={() => setSelectedType('tous')}
                className={`relative flex items-center gap-2 py-1.5 px-4 text-sm font-medium transition-all duration-300 whitespace-nowrap rounded-lg ${
                  selectedType === 'tous' 
                    ? 'text-white bg-white/20 backdrop-blur-sm' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{t("evenements.toutes_catgories")}</span>
                <span className={`text-xs ${
                  selectedType === 'tous' 
                    ? 'text-white/80' 
                    : 'text-white/50'
                }`}>
                  {evenements.length}
                </span>
                {selectedType === 'tous' && (
                  <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-secondary to-secondary/80"></div>
                )}
              </button>
              
              {/* Types d'événements */}
              {uniqueTypes.map((type) => {
                const count = evenements.filter(e => {
                  const eventType = e.type_evenement?.nom_type || e.TypeEvenement?.nom_type || e.type;
                  return eventType === type;
                }).length;
                
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type!)}
                    className={`relative flex items-center gap-2 py-1.5 px-4 text-sm font-medium transition-all duration-300 whitespace-nowrap rounded-lg ${
                      selectedType === type 
                        ? 'text-white bg-white/20 backdrop-blur-sm' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Calendar className={`h-4 w-4 ${
                      selectedType === type 
                        ? 'text-secondary' 
                        : 'text-white/50'
                    }`} />
                    <span>{type?.charAt(0).toUpperCase() + type?.slice(1)}</span>
                    {count > 0 && (
                      <span className={`text-xs ${
                        selectedType === type 
                          ? 'text-white/80' 
                          : 'text-white/50'
                      }`}>
                        {count}
                      </span>
                    )}
                    {selectedType === type && (
                      <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-secondary to-secondary/80"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Indicateur de rate limit en développement */}
      {process.env.NODE_ENV === 'development' && rateLimitStats &&
      <div className="fixed bottom-4 left-4 z-50">
          <Button
          variant="outline"
          size="sm"
          className="shadow-lg"
          onClick={() => setShowRateLimitInfo(!showRateLimitInfo)}>

            <Activity className={`h-4 w-4 mr-2 text-${health.color}-500`} />{t("evenements.rate_limit")}

        </Button>
          
          {showRateLimitInfo &&
        <Card className="absolute bottom-full left-0 mb-2 w-64">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" />{t("evenements.tat_rate_limit")}

            </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("evenements.file_dattente_1")}</span>
                  <span className="font-mono">{rateLimitStats.queueSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("evenements.cache")}</span>
                  <span className="font-mono">{rateLimitStats.cacheSize}{t("evenements.entres")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("evenements.reqminute")}</span>
                  <span className="font-mono">{rateLimitStats.requestsLastMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("evenements.dlai_actuel")}</span>
                  <span className="font-mono">{rateLimitStats.currentDelay}{t("evenements.ms")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("evenements.429_hits")}</span>
                  <span className="font-mono">{rateLimitStats.rateLimitHits}</span>
                </div>
                <Progress
              value={rateLimitStats.requestsLastMinute / 30 * 100}
              className="h-2" />

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
                }}>

                    <Zap className="h-3 w-3 mr-1" />{t("evenements.vider_cache_recharger")}

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
                }}>

                    {rateLimitStats.currentDelay > 500 ? '🚶 Mode normal' : '🐢 Mode lent'}
                  </Button>
                </div>
              </CardContent>
            </Card>
        }
        </div>
      }
      
      <main className="container py-8">
        {/* En-tête */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-serif text-gradient">
            {t("evenements.vnements_culturels")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("evenements.participez_aux_vnements")}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-primary" />
              {filteredEvenements.length} {t("evenements.vnement")}{filteredEvenements.length > 1 ? 's' : ''} {t("evenements.disponible")}{filteredEvenements.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              type="text"
              placeholder={t('evenements.searchPlaceholder') || "Rechercher un événement..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-secondary/10 dark:bg-secondary/5 border-primary/20 dark:border-primary/10 focus:border-primary dark:focus:border-primary/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {error &&
        <Alert variant={error.includes('cache') ? 'default' : 'destructive'} className="max-w-2xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {!error.includes('cache') &&
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={loadEvenements}>{t("evenements.ressayer")}
            </Button>
            }
            </AlertDescription>
          </Alert>
        }

        {/* Filtres par statut */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <Button
            variant={selectedStatut === 'tous' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatut('tous')}
          >
            {t("evenements.tous_les_statuts")}
          </Button>
          <Button
            variant={selectedStatut === 'planifie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatut('planifie')}
          >
            {t("evenements.venir")}
          </Button>
          <Button
            variant={selectedStatut === 'en_cours' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatut('en_cours')}
          >
            {t("evenements.cours")}
          </Button>
          <Button
            variant={selectedStatut === 'termine' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatut('termine')}
          >
            {t("evenements.passs")}
          </Button>
        </div>

        {searchQuery && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              {filteredEvenements.length} résultat{filteredEvenements.length > 1 ? 's' : ''} pour "{searchQuery}"
            </p>
          </div>
        )}

        {/* Liste des événements */}
        {filteredEvenements.length === 0 ?
        <Alert className="max-w-2xl mx-auto">
            <AlertDescription>{t("evenements.aucun_vnement_correspond")}
          </AlertDescription>
          </Alert> :

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Cartes d'événements */}
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
            const StatusIcon = getStatusIcon(evenement.statut);
            
            return (
              <Card 
                key={eventId} 
                className="overflow-hidden hover-lift group h-full flex flex-col relative cursor-pointer transition-all duration-300"
                onClick={() => handleEventDetails(eventId)}
              >
                  {/* Badge de statut */}
                  <Badge
                    variant={getStatusColor(evenement.statut) as any}
                    className="absolute top-2 left-2 z-10 text-xs px-2 py-0.5 shadow-md"
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {getStatusLabel(evenement.statut)}
                  </Badge>
                  
                  <div className="aspect-video overflow-hidden bg-muted relative">
                    {eventImage ?
                  <img
                    src={eventImage}
                    alt={eventName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" /> :


                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/20 to-secondary/10 dark:from-secondary/10 dark:to-secondary/5">
                        <Calendar className="h-12 w-12 text-primary/40" />
                      </div>
                  }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  
                  <div className="flex flex-col flex-1">
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="font-serif text-base leading-tight line-clamp-2 flex-1 hover:text-primary transition-colors">
                          {eventName}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/30 dark:border-primary/20 self-start">
                        {eventType}
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 pt-0 flex-1 flex flex-col">
                      {evenement.description &&
                      <p className="text-xs text-muted-foreground line-clamp-2">
                          {evenement.description}
                        </p>
                      }
                      
                      <div className="space-y-1.5 text-xs flex-1">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="truncate">{formatDate(evenement.date_debut, evenement.date_fin)}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="truncate">{lieuName}</span>
                        </div>
                        {evenement.capacite_max &&
                        <div className="flex items-center space-x-1.5">
                              <Users className="h-3 w-3 text-primary flex-shrink-0" />
                              <span>{formatParticipants(evenement)}</span>
                              {eventComplet &&
                          <Badge variant="destructive" className="text-xs py-0 px-1.5 h-5">{t("evenements.complet")}</Badge>
                          }
                            </div>
                        }
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center space-x-1.5">
                          <DollarSign className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="font-medium text-xs">{formatTarif(evenement)}</span>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full btn-hover group h-8 text-xs mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventDetails(eventId);
                        }}
                        disabled={evenement.statut === 'annule'}
                      >
                        <Info className="h-3 w-3 mr-1.5" />{t("evenements.dtails_vnement")}
                        <ArrowRight className="h-3 w-3 ml-1.5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </CardContent>
                  </div>
                </Card>);
          })}
          </div>
        }
      </main>

      <Footer />
    </div>);
};

export default Evenements;