/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Share2,
  Heart,
  MessageCircle,
  Facebook,
  Twitter,
  Link as LinkIcon,
  Star,
  ChevronLeft,
  DollarSign,
  Building,
  CheckCircle,
  AlertCircle,
  Loader2,
  ImageIcon
} from 'lucide-react';

// Import des types
import { favoriService } from '@/services/favori.service';
import type { Evenement } from '@/types/models/evenement.types';
import type { Programme } from '@/types/models/programme.types';
import type { Media } from '@/types/models/media.types';
import type { Commentaire } from '@/types/models/tracking.types';

// Interface pour les réponses paginées
interface PaginatedResponse<T> {
  items?: T[];
  data?: T[] | PaginatedResponse<T>;
  results?: T[];
  programmes?: T[];
  commentaires?: T[];
  [key: string]: any;
}

// Helper pour extraire les données d'une réponse potentiellement paginée
function extractArrayFromResponse<T>(response: any): T[] {
  if (!response) return [];
  
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.items && Array.isArray(response.items)) return response.items;
  if (response.results && Array.isArray(response.results)) return response.results;
  
  return [];
}

// Interface pour mapper les données de l'API
interface EvenementApiResponse {
  Organisations: any[];
  Oeuvres: any[];
  Participants: any[];
  Programmes: any[];
  Commentaires: any[];
  Media: any[];
  note_moyenne: number;
  duree_totale: number;
  est_complet: boolean;
  nombre_inscrits: number;
  date_limite_inscription: string;
  accessibilite: string;
  age_minimum: number;
  contact_telephone: string;
  contact_email: string;
  id?: number;
  id_evenement?: number;
  titre?: string;
  nom_evenement?: string;
  nom?: string;
  description?: string;
  date_debut?: string;
  date_fin?: string;
  heure_debut?: string;
  heure_fin?: string;
  lieu_id?: number;
  id_lieu?: number;
  user_id?: number;
  id_user?: number;
  organisateur_id?: number;
  type_evenement_id?: number;
  id_type_evenement?: number;
  statut?: string;
  prix?: number;
  tarif?: number;
  capacite_max?: number;
  participants_count?: number;
  nombre_participants?: number;
  inscription_requise?: boolean;
  certificat_delivre?: boolean;
  created_at?: string;
  date_creation?: string;
  updated_at?: string;
  date_modification?: string;
  image?: string;
  image_url?: string;
  type_evenement?: any;
  TypeEvenement?: any;
  lieu?: any;
  Lieu?: any;
  organisateur?: any;
  Organisateur?: any;
  user?: any;
  medias?: any[];
  programmes?: any[];
  commentaires?: any[];
}

// Import des services
import { evenementService } from '@/services/evenement.service';
import { programmeService } from '@/services/programme.service';
import { commentaireService } from '@/services/commentaire.service';
import { authService } from '@/services/auth.service';

// Import des enums
import { StatutEvenement } from '@/types/enums/evenement.enums';

// Fonction pour mapper les données API vers le type Evenement
const mapApiToEvenement = (data: EvenementApiResponse, eventId: number): Evenement => {
  return {
    // Propriétés requises avec fallbacks
    id_evenement: data.id_evenement || data.id || eventId,
    nom_evenement: data.nom_evenement || data.titre || data.nom || 'Sans titre',
    id_lieu: data.id_lieu || data.lieu_id || 0,
    id_user: data.id_user || data.user_id || data.organisateur_id || 0,
    id_type_evenement: data.id_type_evenement || data.type_evenement_id || 0,
    statut: (data.statut as StatutEvenement) || 'planifie',
    tarif: data.tarif ?? data.prix ?? 0,
    inscription_requise: data.inscription_requise ?? true,
    certificat_delivre: data.certificat_delivre ?? false,
    date_creation: data.date_creation || data.created_at || new Date().toISOString(),
    date_modification: data.date_modification || data.updated_at || new Date().toISOString(),
    
    // Propriétés optionnelles
    description: data.description,
    date_debut: data.date_debut,
    date_fin: data.date_fin,
    contact_email: data.contact_email,
    contact_telephone: data.contact_telephone,
    image_url: data.image_url || data.image,
    capacite_max: data.capacite_max,
    age_minimum: data.age_minimum,
    accessibilite: data.accessibilite,
    date_limite_inscription: data.date_limite_inscription,
    
    // Champs virtuels
    nombre_participants: data.nombre_participants || data.participants_count,
    nombre_inscrits: data.nombre_inscrits,
    est_complet: data.est_complet,
    duree_totale: data.duree_totale,
    note_moyenne: data.note_moyenne ? Number(data.note_moyenne) : undefined,
    
    // Relations
    TypeEvenement: data.TypeEvenement || data.type_evenement,
    Lieu: data.Lieu || data.lieu,
    Organisateur: data.Organisateur || data.organisateur || data.user,
    Programmes: data.Programmes || data.programmes || [],
    Media: data.Media || data.medias || [],
    Participants: data.Participants || [],
    Oeuvres: data.Oeuvres || [],
    Organisations: data.Organisations || []
  };
};

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Evenement | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
const [isFavorite, setIsFavorite] = useState(false);
const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isInscrit, setIsInscrit] = useState(false);
  const [inscriptionLoading, setInscriptionLoading] = useState(false);

  // Charger les données de l'événement
  useEffect(() => {
    if (id) {
      loadEventData(parseInt(id));
    }
  }, [id]);

  // Vérifier l'authentification
  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);
  useEffect(() => {
    if (id && isAuthenticated) {
      checkFavoriteStatus(parseInt(id));
    }
  }, [id, isAuthenticated]);
  const checkFavoriteStatus = async (eventId: number) => {
    try {
      const response = await favoriService.check('evenement', eventId);
      if (response.success && response.data) {
        setIsFavorite(response.data.is_favorite);
      }
    } catch (err) {
      console.error('Erreur vérification favori:', err);
    }
  };
  const loadEventData = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Charger l'événement avec toutes ses relations
      console.log('🔄 Chargement événement ID:', eventId);
      const eventResult = await evenementService.getDetail(eventId);
      console.log('✅ Event API response:', eventResult);
      
      if (eventResult.success && eventResult.data) {
        const eventData = eventResult.data as any;
        const validEvent = mapApiToEvenement(eventData, eventId);
        setEvent(validEvent);
        
        // Vérifier si les données sont déjà incluses dans la réponse
        if (eventData.programmes || eventData.Programmes) {
          const rawProgrammes = eventData.programmes || eventData.Programmes;
          console.log('📋 Programmes inclus:', rawProgrammes);
          setProgrammes(Array.isArray(rawProgrammes) ? rawProgrammes : []);
        }
        
        if (eventData.commentaires || eventData.Commentaires) {
          const rawComments = eventData.commentaires || eventData.Commentaires;
          console.log('💬 Commentaires inclus:', rawComments);
          setCommentaires(Array.isArray(rawComments) ? rawComments : []);
        }
        
        if (eventData.medias || eventData.Media) {
          const rawMedias = eventData.medias || eventData.Media;
          console.log('🖼️ Médias inclus:', rawMedias);
          setMedias(Array.isArray(rawMedias) ? rawMedias : []);
        }
      } else {
        throw new Error(eventResult.error || 'Erreur lors du chargement de l\'événement');
      }

      // Charger les programmes si pas déjà inclus
      if (programmes.length === 0) {
        try {
          console.log('🔄 Chargement programmes séparé...');
          const programmeResult = await programmeService.getByEvent(eventId);
          console.log('📋 Programme Result:', programmeResult);
          
          if (programmeResult.success && programmeResult.data) {
            let rawProgrammes: any[] = [];
            
            // Gestion TypeScript correcte avec type assertion
            if (Array.isArray(programmeResult.data)) {
              rawProgrammes = programmeResult.data;
            } else if (programmeResult.data && typeof programmeResult.data === 'object') {
              const dataAsAny = programmeResult.data as any;;
              
              if (dataAsAny.items && Array.isArray(dataAsAny.items)) {
                rawProgrammes = dataAsAny.items;
              } else if (dataAsAny.data && Array.isArray(dataAsAny.data)) {
                rawProgrammes = dataAsAny.data;
              } else if (dataAsAny.results && Array.isArray(dataAsAny.results)) {
                rawProgrammes = dataAsAny.results;
              } else if (dataAsAny.programmes && Array.isArray(dataAsAny.programmes)) {
                rawProgrammes = dataAsAny.programmes;
              }
            }
            
            console.log('📋 Programmes extraits:', rawProgrammes.length);
            setProgrammes(rawProgrammes);
          }
        } catch (err) {
          console.error('❌ Erreur chargement programmes:', err);
        }
      }



      // Charger les commentaires si pas déjà inclus
      // Charger les commentaires si pas déjà inclus
if (commentaires.length === 0) {
  try {
    console.log('🔄 Chargement commentaires séparé...');
    const commentaireResult = await commentaireService.getCommentairesEvenement(eventId);
    console.log('💬 Commentaire Result:', commentaireResult);
    
    if (commentaireResult.success) {
      let rawComments: any[] = [];
      
      // Vérifier d'abord si c'est directement un array
      if (Array.isArray(commentaireResult.data)) {
        rawComments = commentaireResult.data;
      } 
      // Sinon, vérifier si pagination existe
      else if (commentaireResult.pagination && typeof commentaireResult.pagination === 'object') {
        const pagination = commentaireResult.pagination as any;
        
        if (pagination.items && Array.isArray(pagination.items)) {
          rawComments = pagination.items;
        } else if (pagination.data && Array.isArray(pagination.data)) {
          rawComments = pagination.data;
        } else if (pagination.results && Array.isArray(pagination.results)) {
          rawComments = pagination.results;
        }
      }
      // Sinon, vérifier data comme objet
      else if (commentaireResult.data && typeof commentaireResult.data === 'object') {
        const dataAsAny = commentaireResult.data as any;
        
        if (dataAsAny.items && Array.isArray(dataAsAny.items)) {
          rawComments = dataAsAny.items;
        } else if (dataAsAny.data && Array.isArray(dataAsAny.data)) {
          rawComments = dataAsAny.data;
        } else if (dataAsAny.results && Array.isArray(dataAsAny.results)) {
          rawComments = dataAsAny.results;
        } else if (dataAsAny.commentaires && Array.isArray(dataAsAny.commentaires)) {
          rawComments = dataAsAny.commentaires;
        }
      }
      
      console.log('💬 Commentaires extraits:', rawComments.length);
      setCommentaires(rawComments);
    }
  } catch (err) {
    console.error('❌ Erreur chargement commentaires:', err);
  }
}

      // Charger les médias si pas déjà inclus
      if (medias.length === 0) {
        try {
          console.log('🔄 Chargement médias séparé...');
          const mediaResult = await evenementService.getMedias(eventId);
          if (mediaResult.success && mediaResult.data) {
            const eventMedias = extractArrayFromResponse<any>(mediaResult.data);
            setMedias(eventMedias);
          }
        } catch (err) {
          console.error('❌ Erreur chargement médias:', err);
        }
      }

    } catch (err) {
      console.error('❌ Erreur lors du chargement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };
  const handleToggleFavorite = async () => {
    if (!event || !isAuthenticated) {
      if (!isAuthenticated) {
        navigate('/auth');
        return;
      }
      return;
    }
  
    setFavoriteLoading(true);
    try {
      const response = await favoriService.toggle('evenement', event.id_evenement);
      if (response.success && response.data) {
        setIsFavorite(response.data.added);
      }
    } catch (err) {
      console.error('Erreur toggle favori:', err);
      alert('Erreur lors de la modification du favori');
    } finally {
      setFavoriteLoading(false);
    }
  };
  const handleInscription = async () => {
    if (!event) return;
    
    setInscriptionLoading(true);
    try {
      const result = await evenementService.inscription(event.id_evenement);
      if (result.success) {
        setIsInscrit(true);
        loadEventData(event.id_evenement);
      } else {
        alert(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      alert('Erreur lors de l\'inscription');
    } finally {
      setInscriptionLoading(false);
    }
  };

  const handleDesinscription = async () => {
    if (!event) return;
    
    setInscriptionLoading(true);
    try {
      const result = await evenementService.desinscription(event.id_evenement);
      if (result.success) {
        setIsInscrit(false);
        loadEventData(event.id_evenement);
      } else {
        alert(result.error || 'Erreur lors de la désinscription');
      }
    } catch (err) {
      console.error('Erreur désinscription:', err);
      alert('Erreur lors de la désinscription');
    } finally {
      setInscriptionLoading(false);
    }
  };

  const shareEvent = (platform: string) => {
    if (!event) return;
    
    const url = window.location.href;
    const text = `Découvrez ${event.nom_evenement} - ${formatDateRange(event.date_debut, event.date_fin)}`;
    
    switch(platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Lien copié !');
        break;
    }
    setShowShareMenu(false);
  };

  const getStatusColor = (status: StatutEvenement) => {
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

  const getStatusLabel = (status: StatutEvenement) => {
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

  const formatDate = (date?: string) => {
    if (!date) return 'Date non définie';
    
    const dateObj = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    
    return dateObj.toLocaleDateString('fr-FR', options);
  };

  const formatDateRange = (dateDebut?: string, dateFin?: string) => {
    if (!dateDebut) return 'Dates non définies';
    
    const start = formatDate(dateDebut);
    const end = dateFin ? formatDate(dateFin) : null;
    
    if (end && dateDebut !== dateFin) {
      return `Du ${start} au ${end}`;
    }
    
    return start;
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    
    // Si le temps contient une date
    if (time.includes(' ')) {
      return time.split(' ')[1]?.slice(0, 5) || '--:--';
    }
    if (time.includes('T')) {
      return time.split('T')[1]?.slice(0, 5) || '--:--';
    }
    
    // Si c'est juste l'heure
    return time.slice(0, 5);
  };

  // Grouper les programmes par jour
  const programmesByDay = programmes.reduce((acc, prog) => {
    let date = 'Sans date';
    
    if (prog.heure_debut) {
      if (prog.heure_debut.includes(' ')) {
        date = prog.heure_debut.split(' ')[0];
      } else if (prog.heure_debut.includes('T')) {
        date = prog.heure_debut.split('T')[0];
      }
    }
    
    if (!acc[date]) acc[date] = [];
    acc[date].push(prog);
    
    acc[date].sort((a, b) => {
      if (a.ordre !== undefined && b.ordre !== undefined) {
        return a.ordre - b.ordre;
      }
      if (a.heure_debut && b.heure_debut) {
        return a.heure_debut.localeCompare(b.heure_debut);
      }
      return 0;
    });
    
    return acc;
  }, {} as Record<string, Programme[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-semibold">Erreur</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              {error || 'Événement introuvable'}
            </p>
            <Button onClick={() => navigate('/evenements')} variant="outline">
              Retour aux événements
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mainImage = event.image_url || medias.find(m => m.type_media === 'image')?.url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header avec image amélioré */}
      <div className="relative h-[40vh] lg:h-[50vh] overflow-hidden">
        {mainImage ? (
          <>
            <img 
              src={mainImage} 
              alt={event.nom_evenement}
              className="w-full h-full object-cover"
            />
            {/* Overlay gradient plus prononcé pour meilleure lisibilité */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <ImageIcon className="h-20 w-20 text-primary/40" />
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur hover:bg-background/90"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="container max-w-6xl">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary text-primary-foreground border-0 px-3 py-1">
                    {event.TypeEvenement?.nom_type || 'Événement'}
                  </Badge>
                  <Badge variant={getStatusColor(event.statut) as any} className="border-0 px-3 py-1">
                    {getStatusLabel(event.statut)}
                  </Badge>
                </div>
                {/* Titre avec meilleure visibilité */}
                <h1 className="text-3xl lg:text-5xl font-bold">
                  <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {event.nom_evenement}
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Informations essentielles */}
            <Card className="border hover:shadow-xl transition-all duration-300 hover:border-primary/30">
              <CardContent className="p-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold">{formatDateRange(event.date_debut, event.date_fin)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Lieu</p>
                        <p className="font-semibold">{event.Lieu?.nom || 'Non spécifié'}</p>
                        {event.Lieu?.adresse && (
                          <p className="text-sm text-muted-foreground">{event.Lieu.adresse}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tarif</p>
                        <p className="font-semibold text-lg">
                          {event.tarif === 0 ? 'Gratuit' : `${event.tarif} DA`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Building className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Organisateur</p>
                        <p className="font-semibold">
                          {event.Organisations?.[0]?.nom || event.Organisateur?.nom || 'Non spécifié'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {(event.contact_email || event.contact_telephone) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {event.contact_email && `Email : ${event.contact_email}`}
                      {event.contact_telephone && ` • Tél : ${event.contact_telephone}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs pour Description, Programme, Commentaires */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="programme">
                  Programme {programmes.length > 0 && `(${programmes.length})`}
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Commentaires {commentaires.length > 0 && `(${commentaires.length})`}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <div className="whitespace-pre-line text-base leading-relaxed">
                        {event.description || 'Aucune description disponible.'}
                      </div>
                    </div>
                    
                    {event.accessibilite && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{event.accessibilite}</span>
                      </div>
                    )}

                    {event.age_minimum && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Âge minimum requis : {event.age_minimum} ans
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="programme" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {programmes.length > 0 ? (
                      <div className="space-y-8">
                        {Object.entries(programmesByDay).map(([day, dayProgrammes]) => (
                          <div key={day}>
                            <h3 className="text-lg font-semibold mb-4 text-primary">
                              {day === 'Sans date' ? day : formatDate(day)}
                            </h3>
                            <div className="space-y-4">
                              {dayProgrammes.map((prog) => (
                                <div 
                                  key={prog.id_programme} 
                                  className="flex space-x-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm min-w-[100px]">
                                      {formatTime(prog.heure_debut)} - {formatTime(prog.heure_fin)}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold">{prog.titre}</h4>
                                    {prog.description && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {prog.description}
                                      </p>
                                    )}
                                    {prog.lieu_specifique && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        <MapPin className="inline h-3 w-3 mr-1" />
                                        {prog.lieu_specifique}
                                      </p>
                                    )}
                                    {prog.type_activite && (
                                      <Badge variant="outline" className="text-xs mt-2">
                                        {prog.type_activite.replace(/_/g, ' ').charAt(0).toUpperCase() + 
                                         prog.type_activite.replace(/_/g, ' ').slice(1)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          Le programme détaillé sera bientôt disponible.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="comments" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    {commentaires.length > 0 ? (
                      <div className="space-y-6">
                        {commentaires.map((comment) => (
                          <div key={comment.id_commentaire} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start space-x-4">
                              <Avatar>
                                <AvatarImage 
                                  src={(comment.User as any)?.photo_url || (comment.User as any)?.avatar} 
                                  alt={`${comment.User?.prenom} ${comment.User?.nom}`} 
                                />
                                <AvatarFallback>
                                  {comment.User?.prenom?.[0]}{comment.User?.nom?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold">
                                      {comment.User ? `${comment.User.prenom} ${comment.User.nom}` : 'Utilisateur'}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(comment.date_creation)}
                                    </p>
                                  </div>
                                  {comment.note_qualite && (
                                    <div className="flex items-center space-x-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`h-4 w-4 ${
                                            i < Math.floor(comment.note_qualite!) 
                                              ? 'fill-yellow-400 text-yellow-400' 
                                              : 'text-gray-300'
                                          }`} 
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="mt-3 text-sm leading-relaxed">{comment.contenu}</p>
                                
                                {/* Afficher les réponses si disponibles */}
                                {comment.Reponses && comment.Reponses.length > 0 && (
                                  <div className="mt-4 ml-4 pl-4 border-l-2 border-muted space-y-4">
                                    {comment.Reponses.map((reponse) => (
                                      <div key={reponse.id_commentaire} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage 
                                              src={(reponse.User as any)?.photo_url} 
                                              alt={`${reponse.User?.prenom} ${reponse.User?.nom}`} 
                                            />
                                            <AvatarFallback className="text-xs">
                                              {reponse.User?.prenom?.[0]}{reponse.User?.nom?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <p className="text-sm font-medium">
                                              {reponse.User ? `${reponse.User.prenom} ${reponse.User.nom}` : 'Utilisateur'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatDate(reponse.date_creation)}
                                            </p>
                                          </div>
                                        </div>
                                        <p className="text-sm ml-10">{reponse.contenu}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          Aucun commentaire pour le moment. Soyez le premier à commenter !
                        </p>
                      </div>
                    )}
                    
                    <div className="pt-6 border-t mt-6">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          if (isAuthenticated) {
                            // TODO: Ouvrir un modal pour ajouter un commentaire
                            alert('Fonctionnalité d\'ajout de commentaire à implémenter');
                          } else {
                            navigate('/auth');
                          }
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ajouter un commentaire
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Galerie en bas (mobile uniquement) */}
            {medias.length > 0 && (
              <Card className="lg:hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span>Galerie de l'événement</span>
                    <Badge variant="outline" className="text-sm">
                      {medias.length} média{medias.length > 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {medias.map((media, index) => (
                      <div 
                        key={media.id_media} 
                        className="aspect-[4/3] rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
                      >
                        <img
                          src={media.thumbnail_url || media.url}
                          alt={media.titre || `Photo ${index + 1}`}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                            <p className="text-sm font-medium truncate">
                              {media.titre || `Photo ${index + 1}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar avec espacement approprié */}
          <div className="space-y-6">
            {/* Card d'inscription */}
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-3xl font-bold text-primary">
                    {event.tarif === 0 ? 'Gratuit' : `${event.tarif} DA`}
                  </p>
                  <Badge variant={getStatusColor(event.statut) as any}>
                    {getStatusLabel(event.statut)}
                  </Badge>
                </div>
                
                {event.capacite_max && event.nombre_participants !== undefined && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Places disponibles</span>
                      <span className="font-semibold">
                        {Math.max(0, event.capacite_max - (event.nombre_participants || 0))}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{event.nombre_participants || 0} inscrits</span>
                        </span>
                        <span>
                          {Math.round(((event.nombre_participants || 0) / event.capacite_max) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all"
                          style={{
                            width: `${((event.nombre_participants || 0) / event.capacite_max) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {event.note_moyenne && !isNaN(event.note_moyenne) && event.note_moyenne > 0 && (
                  <div className="flex items-center justify-center space-x-2 py-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-5 w-5 ${
                            i < Math.floor(event.note_moyenne!) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{Number(event.note_moyenne).toFixed(1)}</span>
                  </div>
                )}
                
                {event.statut === 'planifie' && event.inscription_requise && (
                  <>
                    {isInscrit ? (
                      <div className="space-y-3">
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">
                            Vous êtes inscrit à cet événement
                          </AlertDescription>
                        </Alert>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={handleDesinscription}
                          disabled={inscriptionLoading}
                        >
                          {inscriptionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Se désinscrire
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full" 
                        size="lg" 
                        disabled={event.est_complet || inscriptionLoading}
                        onClick={handleInscription}
                      >
                        {inscriptionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {event.est_complet ? 'Complet' : 'S\'inscrire maintenant'}
                      </Button>
                    )}
                  </>
                )}

                {event.statut === 'planifie' && !event.inscription_requise && (
                  <Alert>
                    <AlertDescription>
                      Entrée libre, aucune inscription requise
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                <Button 
  variant="outline" 
  className="flex-1 transition-all duration-200 hover:border-red-500/50"
  onClick={handleToggleFavorite}
  disabled={favoriteLoading}
>
  {favoriteLoading ? (
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <Heart 
      className={`h-4 w-4 mr-2 transition-all duration-300 ${
        isFavorite 
          ? 'fill-red-500 text-red-500 scale-110' 
          : 'hover:text-red-500'
      }`} 
    />
  )}
  <span className={isFavorite ? 'text-red-500' : ''}>
    {isFavorite ? 'Favori' : 'Ajouter aux favoris'}
  </span>
</Button>
                  
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowShareMenu(!showShareMenu)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    
                    {showShareMenu && (
                      <Card className="absolute right-0 top-12 z-10 shadow-lg">
                        <CardContent className="p-2">
                          <button
                            onClick={() => shareEvent('facebook')}
                            className="flex items-center space-x-2 w-full p-2 hover:bg-muted rounded text-sm"
                          >
                            <Facebook className="h-4 w-4" />
                            <span>Facebook</span>
                          </button>
                          <button
                            onClick={() => shareEvent('twitter')}
                            className="flex items-center space-x-2 w-full p-2 hover:bg-muted rounded text-sm"
                          >
                            <Twitter className="h-4 w-4" />
                            <span>Twitter</span>
                          </button>
                          <button
                            onClick={() => shareEvent('copy')}
                            className="flex items-center space-x-2 w-full p-2 hover:bg-muted rounded text-sm"
                          >
                            <LinkIcon className="h-4 w-4" />
                            <span>Copier le lien</span>
                          </button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {event.certificat_delivre && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm">
                      Un certificat de participation sera délivré
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Galerie sur le côté (desktop uniquement) - Sans sticky pour éviter le chevauchement */}
            {medias.length > 0 && (
              <Card className="hidden lg:block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Galerie</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      {medias.length} photo{medias.length > 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {medias.slice(0, 4).map((media, index) => (
                      <div 
                        key={media.id_media} 
                        className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
                      >
                        <img
                          src={media.thumbnail_url || media.url}
                          alt={media.titre || `Photo ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      </div>
                    ))}
                  </div>
                  {medias.length > 4 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-3 hover:bg-primary hover:text-primary-foreground transition-colors" 
                      size="sm"
                    >
                      <span>Voir toutes les photos</span>
                      <span className="ml-2 text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                        {medias.length}
                      </span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;