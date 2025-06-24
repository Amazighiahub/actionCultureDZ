/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Loader2
} from 'lucide-react';

// Import des types
import type { Evenement } from '@/types/models/evenement.types';
import type { Programme } from '@/types/models/programme.types';
import type { Media } from '@/types/models/media.types';
import type { Commentaire } from '@/types/models/tracking.types';
import type { EvenementUser } from '@/types/models/associations.types';

// Helper pour extraire les données d'une réponse potentiellement paginée
function extractArrayFromResponse<T>(response: any): T[] {
  if (!response) return [];
  
  // Si c'est directement un tableau
  if (Array.isArray(response)) {
    return response;
  }
  
  // Si c'est un objet avec une propriété data
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  // Si c'est un objet avec une propriété items
  if (response.items && Array.isArray(response.items)) {
    return response.items;
  }
  
  // Si c'est un objet avec une propriété results
  if (response.results && Array.isArray(response.results)) {
    return response.results;
  }
  
  return [];
}

// Interface pour mapper les données de l'API si elles diffèrent
interface EvenementApiResponse {
  Organisations: any[];
  Oeuvres: any[];
  Participants: any[];
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
  // Relations
  type_evenement?: any;
  TypeEvenement?: any;
  lieu?: any;
  Lieu?: any;
  organisateur?: any;
  Organisateur?: any;
  user?: any;
  medias?: any[];
  Media?: any[];
  programmes?: any[];
  Programmes?: any[];
}

// Import des services
import { evenementService } from '@/services/evenement.service';
import { programmeService } from '@/services/programme.service';
import { commentaireService } from '@/services/commentaire.service';
import { authService } from '@/services/auth.service';

// Import des enums
import { StatutEvenement } from '@/types/enums/evenement.enums';
import { StatutParticipation } from '@/types/enums/liaison.enums';

// Composants Tabs
interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
}

const Tabs: React.FC<TabsProps> = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div className="w-full">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

const TabsList: React.FC<TabsListProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, activeTab, setActiveTab }) => {
  const isActive = activeTab === value;
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const activeClasses = isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50";
  
  return (
    <button
      className={`${baseClasses} ${activeClasses}`}
      onClick={() => setActiveTab && setActiveTab(value)}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}

const TabsContent: React.FC<TabsContentProps> = ({ value, children, activeTab }) => {
  if (activeTab !== value) return null;
  return <div className="mt-6">{children}</div>;
};

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
  const [isLiked, setIsLiked] = useState(false);
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

  const loadEventData = async (eventId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Charger l'événement
      const eventResult = await evenementService.getDetail(eventId);
      console.log('Event API response:', eventResult);
      
      if (eventResult.success && eventResult.data) {
        // Utiliser la fonction de mapping
        const validEvent = mapApiToEvenement(eventResult.data as EvenementApiResponse, eventId);
        setEvent(validEvent);
      } else {
        throw new Error(eventResult.error || 'Erreur lors du chargement de l\'événement');
      }

      // Charger les programmes
      try {
        const programmeResult = await programmeService.getByEvent(eventId);
        if (programmeResult.success && programmeResult.data) {
          const rawProgrammes = extractArrayFromResponse<any>(programmeResult.data);
          // S'assurer que les programmes ont la bonne structure
          const programmes: Programme[] = rawProgrammes.map(p => ({
            id_programme: p.id_programme || p.id,
            titre: p.titre || p.title || '',
            description: p.description,
            id_evenement: p.id_evenement || eventId,
            id_lieu: p.id_lieu,
            heure_debut: p.heure_debut,
            heure_fin: p.heure_fin,
            lieu_specifique: p.lieu_specifique,
            ordre: p.ordre || 0,
            statut: p.statut || 'planifie',
            type_activite: p.type_activite || 'autre',
            duree_estimee: p.duree_estimee,
            nb_participants_max: p.nb_participants_max,
            materiel_requis: p.materiel_requis || [],
            niveau_requis: p.niveau_requis,
            langue_principale: p.langue_principale || 'fr',
            traduction_disponible: p.traduction_disponible ?? false,
            enregistrement_autorise: p.enregistrement_autorise ?? false,
            diffusion_live: p.diffusion_live ?? false,
            support_numerique: p.support_numerique ?? false,
            notes_organisateur: p.notes_organisateur,
            // Relations
            Evenement: p.Evenement,
            Lieu: p.Lieu,
            Intervenants: p.Intervenants || []
          }));
          setProgrammes(programmes);
        }
      } catch (err) {
        console.error('Erreur chargement programmes:', err);
      }

      // Charger les commentaires
      try {
        const commentaireResult = await commentaireService.getCommentairesEvenement(eventId);
        if (commentaireResult.success && commentaireResult.data) {
          const rawComments = extractArrayFromResponse<any>(commentaireResult.data);
          // Mapper vers le type Commentaire correct si nécessaire
          const comments: Commentaire[] = rawComments.map(c => ({
            id_commentaire: c.id_commentaire || c.id,
            contenu: c.contenu || c.content || '',
            id_user: c.id_user || c.user_id,
            id_evenement: c.id_evenement || eventId,
            statut: c.statut || 'publie',
            note_qualite: c.note_qualite || c.rating,
            date_creation: c.date_creation || c.created_at || new Date().toISOString(),
            date_modification: c.date_modification || c.updated_at || new Date().toISOString(),
            commentaire_parent_id: c.commentaire_parent_id || c.parent_id,
            // Relations
            User: c.User || c.user,
            Reponses: c.Reponses || c.replies || []
          }));
          setCommentaires(comments);
        }
      } catch (err) {
        console.error('Erreur chargement commentaires:', err);
      }

      // Charger les médias
      try {
        const mediaResult = await evenementService.getMedias(eventId);
        if (mediaResult.success && mediaResult.data) {
          // Si les médias retournés sont de type EventMedia, les mapper vers Media
          const eventMedias = extractArrayFromResponse<any>(mediaResult.data);
          const medias: Media[] = eventMedias.map((m: any) => ({
            id_media: m.id || m.id_media || 0,
            type_media: m.type || m.type_media || 'image',
            url: m.url || '',
            titre: m.titre || m.title,
            description: m.description,
            tags: m.tags || [],
            metadata: m.metadata || {},
            qualite: m.qualite || 'originale',
            droits_usage: m.droits_usage || 'libre',
            alt_text: m.alt_text,
            credit: m.credit,
            visible_public: m.visible_public ?? true,
            ordre: m.ordre || 0,
            thumbnail_url: m.thumbnail_url,
            duree: m.duree,
            taille_fichier: m.taille_fichier || m.size,
            mime_type: m.mime_type || m.type,
            id_evenement: eventId
          }));
          setMedias(medias);
        }
      } catch (err) {
        console.error('Erreur chargement médias:', err);
      }

    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleInscription = async () => {
    if (!event) return;
    
    setInscriptionLoading(true);
    try {
      const result = await evenementService.inscription(event.id_evenement);
      if (result.success) {
        setIsInscrit(true);
        // Recharger l'événement pour mettre à jour le nombre de participants
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
    const text = `Découvrez ${event.nom_evenement} - Du ${formatDate(event.date_debut)} au ${formatDate(event.date_fin)}`;
    
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
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'en_cours':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'termine':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'annule':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'reporte':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: StatutEvenement) => {
    switch (status) {
      case 'planifie':
        return 'Planifié';
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

  // Grouper les programmes par jour
  const programmesByDay = programmes.reduce((acc, prog) => {
    // Extraire la date du programme (gérer différents formats possibles)
    let date = 'Sans date';
    
    if (prog.heure_debut) {
      // Si heure_debut contient date et heure (format: "2024-03-15 10:00:00")
      if (prog.heure_debut.includes(' ')) {
        date = prog.heure_debut.split(' ')[0];
      } else if (prog.heure_debut.includes('T')) {
        // Format ISO (2024-03-15T10:00:00)
        date = prog.heure_debut.split('T')[0];
      } else {
        date = prog.heure_debut;
      }
    } else if ((prog as any).date) {
      // Si le programme a une propriété date séparée
      date = (prog as any).date;
    }
    
    if (!acc[date]) acc[date] = [];
    acc[date].push(prog);
    
    // Trier les programmes par ordre ou heure de début
    acc[date].sort((a, b) => {
      // D'abord par ordre si disponible
      if (a.ordre !== undefined && b.ordre !== undefined) {
        return a.ordre - b.ordre;
      }
      // Sinon par heure de début
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
      {/* Header avec image */}
      <div className="relative h-[40vh] lg:h-[50vh] overflow-hidden">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={event.nom_evenement}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
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
                  <Badge className="bg-primary/90 text-primary-foreground">
                    {event.TypeEvenement?.nom_type || 'Événement'}
                  </Badge>
                  <Badge className={getStatusColor(event.statut)}>
                    {getStatusLabel(event.statut)}
                  </Badge>
                </div>
                <h1 className="text-3xl lg:text-5xl font-bold text-white drop-shadow-lg">
                  {event.nom_evenement}
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
            <Card className="border-2 hover:shadow-lg transition-shadow">
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
                        <p className="font-semibold">{event.Lieu?.nom}</p>
                        <p className="text-sm">{event.Lieu?.adresse}</p>
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
                      {event.contact_email && `Contact : ${event.contact_email}`}
                      {event.contact_telephone && ` • ${event.contact_telephone}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs pour Description, Programme, Commentaires */}
            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="programme">Programme ({programmes.length})</TabsTrigger>
                <TabsTrigger value="comments">Commentaires ({commentaires.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description">
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
              
              <TabsContent value="programme">
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
                                <div key={prog.id_programme} className="flex space-x-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm min-w-[100px]">
                                      {(() => {
                                        const startTime = prog.heure_debut?.includes(' ') 
                                          ? prog.heure_debut.split(' ')[1]?.slice(0, 5)
                                          : prog.heure_debut?.includes('T')
                                          ? prog.heure_debut.split('T')[1]?.slice(0, 5)
                                          : prog.heure_debut?.slice(0, 5) || '--:--';
                                        
                                        const endTime = prog.heure_fin?.includes(' ')
                                          ? prog.heure_fin.split(' ')[1]?.slice(0, 5)
                                          : prog.heure_fin?.includes('T')
                                          ? prog.heure_fin.split('T')[1]?.slice(0, 5)
                                          : prog.heure_fin?.slice(0, 5) || '--:--';
                                        
                                        return `${startTime} - ${endTime}`;
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold">{prog.titre}</h4>
                                    {prog.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{prog.description}</p>
                                    )}
                                    {prog.lieu_specifique && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        <MapPin className="inline h-3 w-3 mr-1" />
                                        {prog.lieu_specifique}
                                      </p>
                                    )}
                                    {prog.type_activite && (
                                      <Badge variant="outline" className="text-xs">
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
                      <p className="text-muted-foreground text-center py-8">
                        Le programme détaillé sera bientôt disponible.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="comments">
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
                                      {[...Array(5)].map((_, i) => {
                                        const isActive = i < Math.floor(comment.note_qualite!);
                                        const starClass = isActive 
                                          ? 'fill-yellow-400 text-yellow-400' 
                                          : 'text-gray-300';
                                        return (
                                          <Star 
                                            key={i} 
                                            className={`h-4 w-4 ${starClass}`} 
                                          />
                                        );
                                      })}
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
                                              src={(reponse.User as any)?.photo_url || (reponse.User as any)?.avatar} 
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
                      <p className="text-muted-foreground text-center py-8">
                        Aucun commentaire pour le moment.
                      </p>
                    )}
                    
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          if (isAuthenticated) {
                            // TODO: Ouvrir un modal ou une zone de saisie pour ajouter un commentaire
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card d'inscription */}
            <Card className="sticky top-6 border-2 border-primary/20">
              <CardContent className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-3xl font-bold text-primary">
                    {event.tarif === 0 ? 'Gratuit' : `${event.tarif} DA`}
                  </p>
                  <Badge className={getStatusColor(event.statut)}>
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
                      {[...Array(5)].map((_, i) => {
                        const isActive = i < Math.floor(event.note_moyenne!);
                        const starClass = isActive 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300';
                        return (
                          <Star 
                            key={i} 
                            className={`h-5 w-5 ${starClass}`} 
                          />
                        );
                      })}
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
                    className="flex-1"
                    onClick={() => setIsLiked(!isLiked)}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    {isLiked ? 'Enregistré' : 'Enregistrer'}
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

            {/* Galerie média si disponible */}
            {medias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Galerie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {medias.slice(0, 4).map((media) => (
                      <div key={media.id_media} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={media.thumbnail_url || media.url}
                          alt={media.titre || 'Image de l\'événement'}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  {medias.length > 4 && (
                    <Button variant="outline" className="w-full mt-3" size="sm">
                      Voir toutes les photos ({medias.length})
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