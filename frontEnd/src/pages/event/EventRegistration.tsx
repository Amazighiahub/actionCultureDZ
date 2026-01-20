/**
 * EventRegistration - Composant d'inscription à l'événement
 * Gère l'inscription, la désinscription et affiche le statut
 * Supporte la soumission d'œuvres selon le type d'événement
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Progress } from '@/components/UI/progress';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Separator } from '@/components/UI/separator';
import { Checkbox } from '@/components/UI/checkbox';
import { ScrollArea } from '@/components/UI/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/UI/dialog';
import {
  Calendar, Clock, Users, Ticket, CheckCircle, XCircle,
  AlertCircle, Loader2, UserPlus, UserMinus,
  Mail, Phone, Palette, BookOpen, Music, Film, Heart
} from 'lucide-react';
import { httpClient } from '@/services/httpClient';
import { oeuvreService } from '@/services/oeuvre.service';
import { useAuth } from '@/hooks/useAuth';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useTranslateData } from '@/hooks/useTranslateData';
import { cn } from '@/lib/utils';
import type { Evenement } from '@/types/models/evenement.types';

interface ConfigSoumission {
  type_oeuvre: string[];
  requis: boolean;
  max_soumissions: number;
  label: string;
}

interface InscriptionConfig {
  id_evenement: number;
  nom_evenement: string;
  type_evenement: string;
  inscription_requise: boolean;
  date_limite_inscription: string | null;
  places_disponibles: number | null;
  est_complet: boolean;
  deja_inscrit: boolean;
  accepte_soumissions: boolean;
  config_soumission: ConfigSoumission | null;
}

interface OeuvreSimple {
  id_oeuvre: number;
  titre: string;
  description?: string;
  image_url?: string;
  TypeOeuvre?: { nom_type: string };
}

interface EventRegistrationProps {
  event: Evenement;
  onRegister: (data?: { nombre_personnes?: number; commentaire?: string; oeuvres?: number[]; notes?: string }) => Promise<boolean>;
  isRegistered?: boolean;
  registrationStatus?: 'pending' | 'confirmed' | 'cancelled' | 'waiting_list';
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const EventRegistration: React.FC<EventRegistrationProps> = ({
  event,
  onRegister,
  isRegistered = false,
  registrationStatus,
  isFavorite = false,
  onToggleFavorite
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, isProfessional } = useAuth();
  const { formatDate } = useLocalizedDate();
  const { formatPrice } = useLocalizedNumber();
  const { td, safe } = useTranslateData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nombrePersonnes, setNombrePersonnes] = useState(1);
  const [commentaire, setCommentaire] = useState('');
  
  // États pour la soumission d'œuvres
  const [inscriptionConfig, setInscriptionConfig] = useState<InscriptionConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [mesOeuvres, setMesOeuvres] = useState<OeuvreSimple[]>([]);
  const [selectedOeuvres, setSelectedOeuvres] = useState<number[]>([]);
  const [oeuvresLoading, setOeuvresLoading] = useState(false);

  // Charger la configuration d'inscription quand le dialog s'ouvre
  useEffect(() => {
    if (isDialogOpen && isAuthenticated) {
      loadInscriptionConfig();
    }
  }, [isDialogOpen, isAuthenticated]);

  const loadInscriptionConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await httpClient.get<InscriptionConfig>(`/evenements/${event.id_evenement}/config-inscription`);
      if (response.success && response.data) {
        setInscriptionConfig(response.data);
        
        // Si le type accepte des soumissions, charger les œuvres de l'utilisateur
        if (response.data.accepte_soumissions) {
          loadMesOeuvres();
        }
      }
    } catch (error) {
      console.error('Erreur chargement config inscription:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const loadMesOeuvres = async () => {
    try {
      setOeuvresLoading(true);
      const response = await oeuvreService.getMyOeuvres({ limit: 50 });
      if (response.success && response.data) {
        // Récupérer les œuvres brutes
        const oeuvresRaw = response.data.oeuvres || [];

        // Filtrer selon le type d'œuvre accepté si configuré
        const typesAcceptes = inscriptionConfig?.config_soumission?.type_oeuvre || [];

        if (typesAcceptes.length > 0) {
          // Filtrer les œuvres dont le type correspond aux types acceptés
          const oeuvresFiltrees = oeuvresRaw.filter(oeuvre => {
            const typeOeuvre = (oeuvre.TypeOeuvre?.nom_type as string)?.toLowerCase() || '';
            // Vérifier si le type de l'œuvre correspond à un des types acceptés
            return typesAcceptes.some(typeAccepte => {
              const typeNorm = typeAccepte.toLowerCase();
              return typeOeuvre.includes(typeNorm) ||
                     typeNorm.includes(typeOeuvre) ||
                     // Correspondances spécifiques français/anglais
                     (typeNorm.includes('livre') && typeOeuvre.includes('book')) ||
                     (typeNorm.includes('book') && typeOeuvre.includes('livre')) ||
                     (typeNorm.includes('musique') && typeOeuvre.includes('music')) ||
                     (typeNorm.includes('music') && typeOeuvre.includes('musique')) ||
                     (typeNorm.includes('peinture') && typeOeuvre.includes('paint')) ||
                     (typeNorm.includes('paint') && typeOeuvre.includes('peinture')) ||
                     (typeNorm.includes('poème') && typeOeuvre.includes('poem')) ||
                     (typeNorm.includes('poem') && typeOeuvre.includes('poème'));
            });
          });
          setMesOeuvres(oeuvresFiltrees as OeuvreSimple[]);
        } else {
          // Si pas de filtre de type, afficher toutes les œuvres
          setMesOeuvres(oeuvresRaw as OeuvreSimple[]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement œuvres:', error);
    } finally {
      setOeuvresLoading(false);
    }
  };

  const toggleOeuvreSelection = (oeuvreId: number) => {
    setSelectedOeuvres(prev => {
      if (prev.includes(oeuvreId)) {
        return prev.filter(id => id !== oeuvreId);
      }
      // Vérifier la limite max
      const maxSoumissions = inscriptionConfig?.config_soumission?.max_soumissions || 10;
      if (prev.length >= maxSoumissions) {
        return prev;
      }
      return [...prev, oeuvreId];
    });
  };

  const getOeuvreTypeIcon = (type?: string) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('livre') || typeLower.includes('book')) return BookOpen;
    if (typeLower.includes('musique') || typeLower.includes('music')) return Music;
    if (typeLower.includes('film') || typeLower.includes('video')) return Film;
    return Palette;
  };

  // Calculer les statistiques
  const capacityPercentage = event.capacite_max
    ? Math.round((event.nombre_inscrits || 0) / event.capacite_max * 100)
    : 0;
  
  const placesRestantes = event.capacite_max
    ? event.capacite_max - (event.nombre_inscrits || 0)
    : null;

  const isEventFull = event.est_complet || (placesRestantes !== null && placesRestantes <= 0);
  
  const isRegistrationClosed = event.date_limite_inscription
    ? new Date(event.date_limite_inscription) < new Date()
    : false;

  const isEventPast = event.date_fin
    ? new Date(event.date_fin) < new Date()
    : event.date_debut
      ? new Date(event.date_debut) < new Date()
      : false;

  // Déterminer si l'inscription est possible
  const canRegister = !isEventFull && !isRegistrationClosed && !isEventPast && !isRegistered;

  // Soumettre l'inscription
  const handleSubmit = async () => {
    // Vérifier si des œuvres sont requises
    if (inscriptionConfig?.accepte_soumissions && 
        inscriptionConfig?.config_soumission?.requis && 
        selectedOeuvres.length === 0) {
      alert(t('event.registration.oeuvresRequired', 'Veuillez sélectionner au moins une œuvre à soumettre'));
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onRegister({
        nombre_personnes: nombrePersonnes,
        commentaire: commentaire.trim() || undefined,
        oeuvres: selectedOeuvres.length > 0 ? selectedOeuvres : undefined,
        notes: commentaire.trim() || undefined
      });
      
      if (success) {
        setIsDialogOpen(false);
        setNombrePersonnes(1);
        setCommentaire('');
        setSelectedOeuvres([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Badge de statut d'inscription
  const getStatusBadge = () => {
    if (!isRegistered) return null;

    const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: Clock,
        label: t('event.registration.pending', 'En attente')
      },
      confirmed: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: CheckCircle,
        label: t('event.registration.confirmed', 'Confirmée')
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: XCircle,
        label: t('event.registration.cancelled', 'Annulée')
      },
      waiting_list: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: Users,
        label: t('event.registration.waitingList', 'Liste d\'attente')
      }
    };

    const status = statusConfig[registrationStatus || 'pending'];
    const Icon = status.icon;

    return (
      <Badge className={cn("flex items-center gap-1", status.color)}>
        <Icon className="h-3 w-3" />
        {status.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {t('event.registration.title', 'Inscription')}
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Prix */}
        <div className="text-center py-4 bg-muted/50 rounded-lg">
          {event.tarif === 0 ? (
            <div>
              <Badge className="bg-green-500 text-white text-lg px-4 py-1">
                {t('events.free', 'Gratuit')}
              </Badge>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-primary">
                {formatPrice(event.tarif)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('event.registration.perPerson', 'par personne')}
              </p>
            </div>
          )}
        </div>

        {/* Capacité */}
        {event.capacite_max && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('event.registration.participants', 'Participants')}
              </span>
              <span className="font-medium">
                {safe(event.nombre_inscrits, '0')} / {safe(event.capacite_max)}
              </span>
            </div>
            <Progress 
              value={capacityPercentage} 
              className={cn(
                "h-2",
                capacityPercentage >= 90 && "bg-red-100"
              )}
            />
            {placesRestantes !== null && placesRestantes > 0 && placesRestantes <= 10 && (
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                ⚠️ {t('event.registration.fewPlaces', 'Plus que {{count}} place(s) !', { count: placesRestantes })}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Dates importantes */}
        <div className="space-y-2 text-sm">
          {event.date_debut && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatDate(event.date_debut, { dateStyle: 'long' })}
                {event.date_fin && event.date_fin !== event.date_debut && (
                  <> - {formatDate(event.date_fin, { dateStyle: 'long' })}</>
                )}
              </span>
            </div>
          )}

          {event.date_limite_inscription && (
            <div className={cn(
              "flex items-center gap-2",
              isRegistrationClosed && "text-red-600"
            )}>
              <AlertCircle className="h-4 w-4" />
              <span>
                {t('event.registration.deadline', 'Inscription avant le')} {formatDate(event.date_limite_inscription, { dateStyle: 'long' })}
              </span>
            </div>
          )}
        </div>

        {/* Messages d'état */}
        {isEventPast && (
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              {t('event.registration.eventPast', 'Cet événement est terminé')}
            </p>
          </div>
        )}

        {isEventFull && !isEventPast && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {t('event.registration.full', 'Complet - Plus de places disponibles')}
            </p>
          </div>
        )}

        {isRegistrationClosed && !isEventPast && !isEventFull && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
              {t('event.registration.closed', 'Les inscriptions sont closes')}
            </p>
          </div>
        )}

        {/* Inscription requise */}
        {event.inscription_requise && !isRegistered && canRegister && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              ℹ️ {t('event.registration.required', 'L\'inscription est obligatoire pour participer')}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {!isAuthenticated ? (
          <>
            {/* Message pour visiteurs non connectés */}
            <div className="w-full p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
              <Heart className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('event.registration.interestedVisitor', 'Intéressé(e) par cet événement ?')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {t('event.registration.connectToParticipate', 'Connectez-vous pour vous inscrire ou ajoutez aux favoris')}
              </p>
            </div>

            {/* Bouton favoris pour visiteurs */}
            {onToggleFavorite && (
              <Button
                variant={isFavorite ? "default" : "outline"}
                className={cn(
                  "w-full",
                  isFavorite && "bg-red-500 hover:bg-red-600 text-white"
                )}
                onClick={onToggleFavorite}
              >
                <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-current")} />
                {isFavorite
                  ? t('event.registration.removeFromFavorites', 'Retirer des favoris')
                  : t('event.registration.addToFavorites', 'Ajouter aux favoris')
                }
              </Button>
            )}

            {/* Bouton connexion */}
            <Button asChild className="w-full" variant="outline">
              <Link to="/auth">
                <UserPlus className="h-4 w-4 mr-2" />
                {t('event.registration.loginToRegister', 'Se connecter pour s\'inscrire')}
              </Link>
            </Button>
          </>
        ) : isRegistered ? (
          <>
            <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {t('event.registration.alreadyRegistered', 'Vous êtes inscrit(e)')}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRegister()}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              {t('event.registration.cancel', 'Annuler mon inscription')}
            </Button>
          </>
        ) : canRegister ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <UserPlus className="h-4 w-4 mr-2" />
                {t('event.registration.register', 'S\'inscrire')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t('event.registration.dialogTitle', 'Inscription à l\'événement')}
                </DialogTitle>
                <DialogDescription>
                  {td(event.nom_evenement)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Nombre de personnes */}
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    {t('event.registration.numberOfPeople', 'Nombre de personnes')}
                  </Label>
                  <Input
                    id="nombre"
                    type="number"
                    min={1}
                    max={placesRestantes || 10}
                    value={nombrePersonnes}
                    onChange={(e) => setNombrePersonnes(parseInt(e.target.value) || 1)}
                  />
                  {event.tarif > 0 && nombrePersonnes > 1 && (
                    <p className="text-sm text-muted-foreground">
                      {t('event.registration.total', 'Total')}: {formatPrice(event.tarif * nombrePersonnes)}
                    </p>
                  )}
                </div>

                {/* Commentaire */}
                <div className="space-y-2">
                  <Label htmlFor="commentaire">
                    {t('event.registration.comment', 'Commentaire')} ({t('common.optional', 'optionnel')})
                  </Label>
                  <Textarea
                    id="commentaire"
                    placeholder={t('event.registration.commentPlaceholder', 'Besoins particuliers, questions...')}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                  />
                </div>

                {/* Section soumission d'œuvres selon le type d'événement */}
                {configLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {t('common.loading', 'Chargement...')}
                    </span>
                  </div>
                ) : inscriptionConfig?.accepte_soumissions && (
                  <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      <Label className="text-base font-semibold">
                        {td(inscriptionConfig.config_soumission?.label) || t('event.registration.submitWorks', 'Œuvres à soumettre')}
                        {inscriptionConfig.config_soumission?.requis && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                    </div>

                    {/* Message pour les non-professionnels */}
                    {!isProfessional ? (
                      <div className="text-center py-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Palette className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                          {t('event.registration.professionalOnly', 'La soumission d\'œuvres est réservée aux professionnels')}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {t('event.registration.upgradeToPro', 'Passez en compte professionnel pour soumettre vos œuvres')}
                        </p>
                        <Button variant="outline" size="sm" asChild className="mt-3">
                          <Link to="/auth?tab=register&type=professional">
                            {t('event.registration.becomePro', 'Devenir professionnel')}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {inscriptionConfig.config_soumission?.requis
                            ? t('event.registration.worksRequired', 'Sélectionnez les œuvres que vous souhaitez présenter (obligatoire)')
                            : t('event.registration.worksOptional', 'Sélectionnez les œuvres que vous souhaitez présenter (optionnel)')
                          }
                          {inscriptionConfig.config_soumission?.max_soumissions && (
                            <span className="block mt-1">
                              {t('event.registration.maxWorks', 'Maximum: {{max}} œuvre(s)', { max: inscriptionConfig.config_soumission.max_soumissions })}
                            </span>
                          )}
                        </p>

                        {inscriptionConfig.config_soumission?.type_oeuvre && inscriptionConfig.config_soumission.type_oeuvre.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">{t('event.registration.acceptedTypes', 'Types acceptés:')}</span>
                            {inscriptionConfig.config_soumission.type_oeuvre.map((type, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {oeuvresLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : mesOeuvres.length === 0 ? (
                          <div className="text-center py-4 bg-muted/50 rounded-lg">
                            <Palette className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {t('event.registration.noWorks', 'Vous n\'avez pas encore d\'œuvres')}
                            </p>
                            <Button variant="link" size="sm" asChild className="mt-2">
                              <Link to="/ajouter-oeuvre">
                                {t('event.registration.createWork', 'Créer une œuvre')}
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <ScrollArea className="h-48 border rounded-md p-2">
                            <div className="space-y-2">
                              {mesOeuvres.map((oeuvre) => {
                                const isSelected = selectedOeuvres.includes(oeuvre.id_oeuvre);
                                const Icon = getOeuvreTypeIcon(oeuvre.TypeOeuvre?.nom_type);

                                return (
                                  <div
                                    key={oeuvre.id_oeuvre}
                                    className={cn(
                                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                      isSelected
                                        ? "bg-primary/10 border-2 border-primary"
                                        : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                                    )}
                                    onClick={() => toggleOeuvreSelection(oeuvre.id_oeuvre)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleOeuvreSelection(oeuvre.id_oeuvre)}
                                    />
                                    {oeuvre.image_url ? (
                                      <img
                                        src={oeuvre.image_url}
                                        alt={td(oeuvre.titre)}
                                        className="w-12 h-12 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                        <Icon className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{td(oeuvre.titre)}</p>
                                      {oeuvre.TypeOeuvre?.nom_type && (
                                        <p className="text-xs text-muted-foreground">{td(oeuvre.TypeOeuvre.nom_type)}</p>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}

                        {selectedOeuvres.length > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t('event.registration.selectedWorks', 'Œuvres sélectionnées:')}
                            </span>
                            <Badge variant="secondary">
                              {selectedOeuvres.length} / {inscriptionConfig.config_soumission?.max_soumissions || 10}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Récapitulatif */}
                <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('event.registration.event', 'Événement')}</span>
                    <span className="font-medium">{td(event.nom_evenement)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('event.registration.date', 'Date')}</span>
                    <span>{event.date_debut ? formatDate(event.date_debut, { dateStyle: 'medium' }) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('event.registration.people', 'Personnes')}</span>
                    <span>{nombrePersonnes}</span>
                  </div>
                  {selectedOeuvres.length > 0 && (
                    <div className="flex justify-between">
                      <span>{t('event.registration.worksSubmitted', 'Œuvres soumises')}</span>
                      <span className="font-medium text-primary">{selectedOeuvres.length}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>{t('event.registration.total', 'Total')}</span>
                    <span className="text-primary">
                      {event.tarif === 0 
                        ? t('events.free', 'Gratuit')
                        : formatPrice(event.tarif * nombrePersonnes)
                      }
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel', 'Annuler')}
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.loading', 'Chargement...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('event.registration.confirm', 'Confirmer l\'inscription')}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled className="w-full">
            {t('event.registration.unavailable', 'Inscription non disponible')}
          </Button>
        )}

        {/* Contact */}
        {(event.contact_email || event.contact_telephone) && (
          <div className="w-full pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center mb-2">
              {t('event.registration.questions', 'Des questions ?')}
            </p>
            <div className="flex justify-center gap-2">
              {event.contact_email && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={`mailto:${event.contact_email}`}>
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {event.contact_telephone && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={`tel:${event.contact_telephone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default EventRegistration;
