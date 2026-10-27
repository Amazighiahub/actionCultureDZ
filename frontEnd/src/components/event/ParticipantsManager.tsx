/**
 * ParticipantsManager - Gestion des participants d'un événement
 * Permet au professionnel de voir les participants, leurs œuvres soumises et leurs profils
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Eye,
  Palette,
  BookOpen,
  Music,
  Film,
  Mail,
  Phone,
  Globe,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  User,
  ExternalLink,
  Loader2,
  UserCheck,
  UserX,
  UserCog,
  Download,
  FileSpreadsheet,
  Send
} from 'lucide-react';
import ImportInscriptionsDialog from './ImportInscriptionsDialog';
import MessageParticipantsDialog from './MessageParticipantsDialog';
import { httpClient } from '@/services/httpClient';
import { useTranslateData } from '@/hooks/useTranslateData';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/Utils';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { getAssetUrl } from '@/helpers/assetUrl';
import { safeExternalUrl } from '@/utils/safeUrl';
import SocialLinks, { type SocialLinksValue } from '@/components/shared/SocialLinks';
import ReponsesInscription from '@/components/event/ReponsesInscription';
import { professionnelService } from '@/services/professionnel.service';
import type { ConfigInscription, Reponses } from '@/utils/formulaireInscription';

interface ParticipantsManagerProps {
  evenementId: number;
  evenementNom: string;
}

interface OeuvreSoumise {
  id_oeuvre: number;
  titre: string;
  description?: string;
  image_url?: string;
  TypeOeuvre?: { nom_type: string };
  ordre_presentation?: number;
  description_presentation?: string;
  // Champs supplémentaires pour les détails
  annee_creation?: number;
  dimensions?: string;
  materiaux?: string;
  technique?: string;
  prix?: number;
  statut?: string;
  langue?: string;
  editeur?: string;
  isbn?: string;
  nombre_pages?: number;
  date_publication?: string;
  Medias?: Array<{ id_media: number; url: string; type: string }>;
}

interface Participant {
  id_EventUser: number;
  id_user: number;
  statut_participation: string;
  role_participation: string;
  date_inscription: string;
  notes?: string;
  /** Montant calculé à l'inscription (profil, présence, nombre de personnes) ; null : gratuit ou inconnu */
  montant_du?: number | string | null;
  reponses_inscription?: Reponses | null;
  User: {
    id_user: number;
    nom: string;
    prenom: string;
    email: string;
    /** Faux tant qu'un compte créé par import n'a pas choisi son mot de passe */
    email_verifie?: boolean;
    bio?: string;
    photo_profil?: string;
    site_web?: string;
    telephone?: string;
    TypeUser?: { nom_type: string };
  };
  oeuvres_soumises: OeuvreSoumise[];
}

interface ParticipantProfil {
  profil: {
    id_user: number;
    nom: string;
    prenom: string;
    email: string;
    bio?: string;
    photo_profil?: string;
    site_web?: string;
    telephone?: string;
    reseaux_sociaux?: SocialLinksValue;
    TypeUser?: { nom_type: string };
    Organisations?: Array<{ id_organisation: number; nom: string; logo_url?: string }>;
  };
  participation: {
    statut_participation: string;
    role_participation: string;
    date_inscription: string;
    notes?: string;
    reponses_inscription?: Reponses | null;
  };
  /** Questions du formulaire du type d'événement (null = formulaire de base) */
  formulaire?: ConfigInscription | null;
  oeuvres_soumises: OeuvreSoumise[];
  portfolio: OeuvreSoumise[];
  historique_participations: Array<{
    evenement: { id_evenement: number; nom_evenement: string; date_debut: string };
    statut: string;
    date: string;
  }>;
}

interface Stats {
  total: number;
  par_statut: Record<string, number>;
  par_role: Record<string, number>;
}

const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  evenementId,
  evenementNom
}) => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useLocalizedNumber();
  const [importOuvert, setImportOuvert] = useState(false);
  const [messageOuvert, setMessageOuvert] = useState(false);
  const { td } = useTranslateData();
  const { formatDate } = useLocalizedDate();
  const { toast } = useToast();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [profilData, setProfilData] = useState<ParticipantProfil | null>(null);
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilDialogOpen, setProfilDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  /** Choix de « Vous êtes » : l'organisateur peut corriger le profil d'un participant (prix recalculé) */
  const [profils, setProfils] = useState<{ valeur: string; label?: string | Record<string, string> }[]>([]);
  const [profilEnCours, setProfilEnCours] = useState<number | null>(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState<number | null>(null);

  // État pour le dialogue de détails d'œuvre
  const [selectedOeuvre, setSelectedOeuvre] = useState<OeuvreSoumise | null>(null);
  const [oeuvreDialogOpen, setOeuvreDialogOpen] = useState(false);
  const [oeuvreAuteur, setOeuvreAuteur] = useState<{ nom: string; prenom: string } | null>(null);

  useEffect(() => {
    loadParticipants();
    httpClient.get<{ valeur: string; label?: string | Record<string, string> }[]>(`/evenements/${evenementId}/participants/profils`)
      .then(res => setProfils(res.success && Array.isArray(res.data) ? res.data : []))
      .catch(() => setProfils([]));
  }, [evenementId]);

  /** Email « Choisir mon mot de passe » renvoyé (nouveau lien de 7 jours) */
  const renvoyerInvitation = async (userId: number) => {
    setRenvoiEnCours(userId);
    const res = await httpClient.post<{ email: string }>(`/evenements/${evenementId}/participants/${userId}/invitation`, {});
    setRenvoiEnCours(null);
    if (res.success) {
      toast({ title: t('pro.participants.invitation.envoyee', 'Email envoyé'), description: t('pro.participants.invitation.envoyeeDesc', 'Un nouveau lien pour choisir son mot de passe, valable 7 jours, a été envoyé à {{email}}.', { email: res.data?.email || '' }) });
    } else {
      toast({ title: t('common.error', 'Erreur'), description: res.error || t('pro.participants.actions.error', 'Une erreur est survenue'), variant: 'destructive' });
    }
  };

  const changerProfil = async (userId: number, profil: string) => {
    setProfilEnCours(userId);
    const res = await httpClient.put(`/evenements/${evenementId}/participants/${userId}/profil`, { profil });
    setProfilEnCours(null);
    if (res.success) {
      toast({ title: t('pro.participants.profil.modifie', 'Profil modifié'), description: t('pro.participants.profil.modifieDesc', 'Le prix a été recalculé. Aucun message n’a été envoyé.') });
      await loadParticipants();
    } else {
      toast({ title: t('common.error', 'Erreur'), description: res.error || t('pro.participants.actions.error', 'Une erreur est survenue'), variant: 'destructive' });
    }
  };

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await httpClient.get<{ data: Participant[]; stats: Stats }>(
        `/professionnel/evenements/${evenementId}/participants`
      );

      if (response.success && response.data) {
        // response.data contient directement le tableau de participants
        const participantsList = Array.isArray(response.data) ? response.data : [];
        setParticipants(participantsList as Participant[]);
        if ((response as any).stats) {
          setStats((response as any).stats);
        }
      }
    } catch (error) {
      console.error('Erreur chargement participants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Liste des inscrits avec leurs réponses au formulaire, au format Excel
  const handleExport = async () => {
    setExporting(true);
    const response = await professionnelService.exportParticipants(evenementId, 'excel');
    setExporting(false);
    if (!response.success) {
      toast({
        title: t('toasts.exportFailed', 'Échec de l\'export'),
        description: response.error,
        variant: 'destructive'
      });
    }
  };

  const loadParticipantProfil = async (userId: number) => {
    try {
      setProfilLoading(true);
      setProfilDialogOpen(true);
      
      const response = await httpClient.get<ParticipantProfil>(
        `/professionnel/evenements/${evenementId}/participants/${userId}/profil`
      );
      if (response.success && response.data) {
        setProfilData(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setProfilLoading(false);
    }
  };

  // Gestion des actions sur les participants (confirmer, rejeter, marquer présent/absent)
  const handleParticipantAction = async (
    userId: number,
    action: 'confirmer' | 'rejeter' | 'marquer_present' | 'marquer_absent',
    notes?: string
  ) => {
    try {
      setActionLoading(userId);

      const response = await httpClient.post(
        `/professionnel/evenements/${evenementId}/participants/manage`,
        { userId, action, notes }
      );

      if (response.success) {
        // Messages de succès selon l'action
        const messages: Record<string, { title: string; description: string }> = {
          confirmer: {
            title: t('pro.participants.actions.confirmSuccess', 'Participation confirmée'),
            description: t('pro.participants.actions.confirmDesc', 'Le participant a été notifié')
          },
          rejeter: {
            title: t('pro.participants.actions.rejectSuccess', 'Participation refusée'),
            description: t('pro.participants.actions.rejectDesc', 'Le participant a été notifié')
          },
          marquer_present: {
            title: t('pro.participants.actions.presentSuccess', 'Présence enregistrée'),
            description: t('pro.participants.actions.presentDesc', 'Le participant est marqué présent')
          },
          marquer_absent: {
            title: t('pro.participants.actions.absentSuccess', 'Absence enregistrée'),
            description: t('pro.participants.actions.absentDesc', 'Le participant est marqué absent')
          }
        };

        toast({
          title: messages[action].title,
          description: messages[action].description
        });

        // Recharger la liste des participants
        await loadParticipants();
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: response.error || t('pro.participants.actions.error', 'Une erreur est survenue'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur action participant:', error);
      toast({
        title: t('common.error', 'Erreur'),
        description: t('pro.participants.actions.error', 'Une erreur est survenue'),
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (statut: string) => {
    const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      inscrit: { color: 'bg-accent/15 text-accent', icon: Clock, label: t('status.pending', 'Inscrit') },
      confirme: { color: 'bg-primary/15 text-primary', icon: CheckCircle, label: t('status.validated', 'Confirmé') },
      present: { color: 'bg-primary/20 text-primary', icon: CheckCircle, label: t('status.present', 'Présent') },
      absent: { color: 'bg-muted text-muted-foreground', icon: XCircle, label: t('status.absent', 'Absent') },
      annule: { color: 'bg-destructive/15 text-destructive', icon: XCircle, label: t('status.cancelled', 'Annulé') }
    };
    const status = config[statut] || config.inscrit;
    const Icon = status.icon;
    return (
      <Badge className={cn("flex items-center gap-1", status.color)}>
        <Icon className="h-3 w-3" />
        {status.label}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { color: string; label: string }> = {
      participant: { color: 'bg-muted text-muted-foreground', label: t('event.roles.participant', 'Participant') },
      organisateur: { color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300', label: t('event.roles.organisateur', 'Organisateur') },
      intervenant: { color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300', label: t('event.roles.intervenant', 'Intervenant') },
      benevole: { color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300', label: t('event.roles.benevole', 'Bénévole') },
      staff: { color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300', label: t('event.roles.staff', 'Staff') }
    };
    const roleConfig = config[role] || config.participant;
    return <Badge className={roleConfig.color}>{roleConfig.label}</Badge>;
  };

  const getOeuvreIcon = (type?: string) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('livre') || typeLower.includes('book')) return BookOpen;
    if (typeLower.includes('musique') || typeLower.includes('music')) return Music;
    if (typeLower.includes('film') || typeLower.includes('video')) return Film;
    return Palette;
  };

  const filteredParticipants = participants.filter(p => {
    const matchSearch = !searchQuery || 
      `${p.User.nom} ${p.User.prenom} ${p.User.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatut = filterStatut === 'all' || p.statut_participation === filterStatut;
    const matchRole = filterRole === 'all' || p.role_participation === filterRole;
    return matchSearch && matchStatut && matchRole;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg sm:text-2xl">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5 shrink-0" />
            {t('pro.participants.title', 'Participants')} - {evenementNom}
          </span>
          {stats && (
            <Badge variant="secondary">{stats.total} {t('pro.participants.total', 'inscrits')}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('pro.participants.search', 'Rechercher un participant...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allStatuses', 'Tous les statuts')}</SelectItem>
              <SelectItem value="inscrit">{t('status.pending', 'Inscrit')}</SelectItem>
              <SelectItem value="confirme">{t('status.validated', 'Confirmé')}</SelectItem>
              <SelectItem value="present">{t('status.present', 'Présent')}</SelectItem>
              <SelectItem value="absent">{t('status.absent', 'Absent')}</SelectItem>
              <SelectItem value="annule">{t('status.cancelled', 'Annulé')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allRoles', 'Tous les rôles')}</SelectItem>
              <SelectItem value="participant">{t('event.roles.participant', 'Participant')}</SelectItem>
              <SelectItem value="intervenant">{t('event.roles.intervenant', 'Intervenant')}</SelectItem>
              <SelectItem value="benevole">{t('event.roles.benevole', 'Bénévole')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || participants.length === 0}
          >
            {exporting
              ? <Loader2 className="h-4 w-4 me-2 animate-spin" aria-hidden="true" />
              : <Download className="h-4 w-4 me-2" aria-hidden="true" />}
            {t('pro.participants.exportExcel', 'Télécharger en Excel')}
          </Button>
          <Button variant="outline" onClick={() => setImportOuvert(true)}>
            <FileSpreadsheet className="h-4 w-4 me-2" aria-hidden="true" />
            {t('pro.participants.import.bouton', 'Importer une liste (Excel)')}
          </Button>
          <Button onClick={() => setMessageOuvert(true)} disabled={participants.length === 0}>
            <Send className="h-4 w-4 me-2" aria-hidden="true" />
            {t('pro.participants.messages.bouton', 'Écrire aux participants')}
          </Button>
        </div>
        <MessageParticipantsDialog
          evenementId={evenementId}
          ouvert={messageOuvert}
          onFermer={() => setMessageOuvert(false)}
        />
        <ImportInscriptionsDialog
          evenementId={evenementId}
          ouvert={importOuvert}
          onFermer={() => setImportOuvert(false)}
          onImporte={() => loadParticipants()}
        />

        {/* Statistiques rapides */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(stats.par_statut).map(([statut, count]) => (
              <div key={statut} className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{statut}</div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Liste des participants */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {t('pro.participants.empty', 'Aucun participant trouvé')}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.id_EventUser}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Téléphone : boutons sous les informations ; écran large : à droite */}
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={participant.User.photo_profil} />
                      <AvatarFallback>
                        {participant.User.prenom?.[0]}{participant.User.nom?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">
                          {td(participant.User.prenom)} {td(participant.User.nom)}
                        </h4>
                        {getStatusBadge(participant.statut_participation)}
                        {getRoleBadge(participant.role_participation)}
                      </div>
                      <p className="text-sm text-muted-foreground">{participant.User.email}</p>
                      {/* Mot de passe : bouton pour tout participant ; grisé quand la personne a déjà choisi
                          son mot de passe (l'email « Choisir mon mot de passe » ne servirait à rien) */}
                      {participant.statut_participation !== 'annule' && (() => {
                        const aSonMotDePasse = participant.User.email_verifie !== false;
                        return (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {aSonMotDePasse
                              ? <span className="text-xs text-muted-foreground">{t('pro.participants.invitation.dejaChoisi', 'Mot de passe déjà choisi')}</span>
                              : <span className="text-xs text-amber-700">{t('pro.participants.invitation.pasEncore', 'N’a pas encore choisi son mot de passe')}</span>}
                            <Button
                              variant="outline" size="sm" className="h-7"
                              onClick={() => renvoyerInvitation(participant.id_user)}
                              disabled={aSonMotDePasse || renvoiEnCours === participant.id_user}
                              title={aSonMotDePasse ? t('pro.participants.invitation.inutile', 'Cette personne a déjà choisi son mot de passe') : undefined}
                            >
                              {renvoiEnCours === participant.id_user
                                ? <Loader2 className="h-3 w-3 me-1 animate-spin" aria-hidden="true" />
                                : aSonMotDePasse
                                  ? <CheckCircle className="h-3 w-3 me-1" aria-hidden="true" />
                                  : <Mail className="h-3 w-3 me-1" aria-hidden="true" />}
                              {t('pro.participants.invitation.renvoyer', 'Renvoyer l’email')}
                            </Button>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="inline h-3 w-3 me-1" />
                        {t('pro.participants.registeredOn', 'Inscrit le')} {formatDate(participant.date_inscription, { dateStyle: 'medium' })}
                      </p>
                      {/* À payer : profil choisi et montant calculé à l'inscription */}
                      {(Number(participant.montant_du) > 0 || typeof participant.reponses_inscription?.profil === 'string') && (
                        <p className="text-sm mt-1">
                          {participant.montant_du === null || participant.montant_du === undefined
                            ? <span className="text-muted-foreground">{t('events.tarif.aConvenir', 'à convenir')}</span>
                            : Number(participant.montant_du) > 0
                              ? <span className="font-semibold text-primary">{formatPrice(Number(participant.montant_du))}</span>
                              : <span className="text-muted-foreground">{t('events.free', 'Gratuit')}</span>}
                          {typeof participant.reponses_inscription?.profil === 'string' && (
                            <span className="text-muted-foreground"> · {participant.reponses_inscription.profil}
                              {typeof participant.reponses_inscription?.profil_autre === 'string' && ` (${participant.reponses_inscription.profil_autre})`}
                            </span>
                          )}
                          {participant.reponses_inscription?.presence === 'Partielle' && (
                            <span className="text-muted-foreground"> · {t('pro.participants.partielle', 'présence partielle')}</span>
                          )}
                        </p>
                      )}
                      {profils.length > 0 && participant.statut_participation !== 'annule' && (() => {
                        const actuel = participant.reponses_inscription?.profil;
                        const connu = typeof actuel === 'string' && profils.some(pr => pr.valeur === actuel);
                        return (
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                            <span className="text-muted-foreground">{t('pro.participants.profil.label', 'Profil :')}</span>
                            <Select
                              value={connu ? (actuel as string) : ''}
                              onValueChange={(v) => changerProfil(participant.id_user, v)}
                              disabled={profilEnCours === participant.id_user}
                            >
                              <SelectTrigger
                                className={cn('w-64 h-8', !connu && 'border-amber-500')}
                                aria-label={t('pro.participants.profil.de', 'Profil de {{nom}}', { nom: `${td(participant.User.prenom)} ${td(participant.User.nom)}`.trim() })}
                              >
                                <SelectValue placeholder={t('pro.participants.profil.choisir', 'À choisir')} />
                              </SelectTrigger>
                              <SelectContent>
                                {profils.map(pr => (
                                  <SelectItem key={pr.valeur} value={pr.valeur}>{getLocalizedText(pr.label, i18n.language, pr.valeur)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })()}

                      {/* Œuvres soumises - cliquables pour voir les détails */}
                      {participant.oeuvres_soumises && participant.oeuvres_soumises.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            <Palette className="inline h-3 w-3 me-1" />
                            {participant.oeuvres_soumises.length} {t('pro.participants.worksSubmitted', 'œuvre(s) soumise(s)')}:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {participant.oeuvres_soumises.slice(0, 3).map((oeuvre) => (
                              <Badge
                                key={oeuvre.id_oeuvre}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => {
                                  setSelectedOeuvre(oeuvre);
                                  setOeuvreAuteur({ nom: participant.User.nom, prenom: participant.User.prenom });
                                  setOeuvreDialogOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3 me-1" />
                                {td(oeuvre.titre)}
                              </Badge>
                            ))}
                            {participant.oeuvres_soumises.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-muted"
                                onClick={() => loadParticipantProfil(participant.id_user)}
                              >
                                +{participant.oeuvres_soumises.length - 3} {t('common.more', 'autres')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadParticipantProfil(participant.id_user)}
                      >
                        <Eye className="h-4 w-4 me-1" />
                        {t('pro.participants.viewProfile', 'Voir profil')}
                      </Button>

                      {/* Boutons de validation selon le statut actuel */}
                      <div className="flex flex-wrap gap-1">
                        {/* Si inscrit -> peut confirmer ou rejeter */}
                        {participant.statut_participation === 'inscrit' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleParticipantAction(participant.id_user, 'confirmer')}
                              disabled={actionLoading === participant.id_user}
                            >
                              {actionLoading === participant.id_user ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserCheck className="h-4 w-4 me-1" />
                              )}
                              {t('pro.participants.actions.confirm', 'Confirmer')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleParticipantAction(participant.id_user, 'rejeter')}
                              disabled={actionLoading === participant.id_user}
                            >
                              {actionLoading === participant.id_user ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserX className="h-4 w-4 me-1" />
                              )}
                              {t('pro.participants.actions.reject', 'Refuser')}
                            </Button>
                          </>
                        )}

                        {/* Si confirmé -> peut marquer présent ou absent */}
                        {participant.statut_participation === 'confirme' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleParticipantAction(participant.id_user, 'marquer_present')}
                              disabled={actionLoading === participant.id_user}
                            >
                              {actionLoading === participant.id_user ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 me-1" />
                              )}
                              {t('pro.participants.actions.markPresent', 'Présent')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleParticipantAction(participant.id_user, 'marquer_absent')}
                              disabled={actionLoading === participant.id_user}
                            >
                              {actionLoading === participant.id_user ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 me-1" />
                              )}
                              {t('pro.participants.actions.markAbsent', 'Absent')}
                            </Button>
                          </>
                        )}

                        {/* Si présent -> afficher badge */}
                        {participant.statut_participation === 'present' && (
                          <Badge className="bg-primary/15 text-primary">
                            <CheckCircle className="h-3 w-3 me-1" />
                            {t('status.present', 'Présent')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Dialog profil participant */}
      <Dialog open={profilDialogOpen} onOpenChange={setProfilDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('pro.participants.profile', 'Profil du participant')}
            </DialogTitle>
          </DialogHeader>

          {profilLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : profilData ? (
            <div className="space-y-6">
              {/* En-tête profil */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profilData.profil.photo_profil} />
                  <AvatarFallback className="text-xl">
                    {profilData.profil.prenom?.[0]}{profilData.profil.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">
                    {td(profilData.profil.prenom)} {td(profilData.profil.nom)}
                  </h3>
                  {profilData.profil.TypeUser && (
                    <Badge variant="secondary" className="mt-1">
                      {td(profilData.profil.TypeUser.nom_type)}
                    </Badge>
                  )}
                  {profilData.profil.bio && (
                    <p className="text-sm text-muted-foreground mt-2">{td(profilData.profil.bio)}</p>
                  )}
                  
                  {/* Contact */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`mailto:${profilData.profil.email}`}>
                        <Mail className="h-4 w-4 me-1" />
                        {profilData.profil.email}
                      </a>
                    </Button>
                    {profilData.profil.telephone && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`tel:${profilData.profil.telephone}`}>
                          <Phone className="h-4 w-4 me-1" />
                          {profilData.profil.telephone}
                        </a>
                      </Button>
                    )}
                    {profilData.profil.site_web && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={safeExternalUrl(profilData.profil.site_web)} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 me-1" />
                          {t('common.website', 'Site web')}
                        </a>
                      </Button>
                    )}
                    <SocialLinks
                      links={profilData.profil.reseaux_sociaux}
                      ownerName={`${profilData.profil.prenom} ${profilData.profil.nom}`}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Inscription à cet événement */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('pro.participants.eventRegistration', 'Inscription à cet événement')}
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {getStatusBadge(profilData.participation.statut_participation)}
                  {getRoleBadge(profilData.participation.role_participation)}
                  <span className="text-sm text-muted-foreground">
                    {t('pro.participants.registeredOn', 'Inscrit le')} {formatDate(profilData.participation.date_inscription, { dateStyle: 'long' })}
                  </span>
                </div>
                {profilData.participation.notes && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                    <strong>{t('common.notes', 'Notes')}:</strong> {profilData.participation.notes}
                  </p>
                )}
                <ReponsesInscription
                  formulaire={profilData.formulaire}
                  reponses={profilData.participation.reponses_inscription}
                />
              </div>

              {/* Œuvres soumises pour cet événement */}
              {profilData.oeuvres_soumises && profilData.oeuvres_soumises.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {t('pro.participants.submittedWorks', 'Œuvres soumises pour cet événement')} ({profilData.oeuvres_soumises.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profilData.oeuvres_soumises.map((oeuvre) => {
                      const Icon = getOeuvreIcon(oeuvre.TypeOeuvre?.nom_type);
                      return (
                        <div
                          key={oeuvre.id_oeuvre}
                          className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedOeuvre(oeuvre);
                            setOeuvreAuteur({ nom: profilData.profil.nom, prenom: profilData.profil.prenom });
                            setProfilDialogOpen(false);
                            setOeuvreDialogOpen(true);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOeuvre(oeuvre); setOeuvreAuteur({ nom: profilData.profil.nom, prenom: profilData.profil.prenom }); setProfilDialogOpen(false); setOeuvreDialogOpen(true); } }}
                        >
                          {oeuvre.image_url ? (
                            <img loading="lazy" decoding="async" src={oeuvre.image_url} alt={td(oeuvre.titre)} className="w-16 h-16 object-cover rounded" />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                              <Icon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{td(oeuvre.titre)}</p>
                            {oeuvre.TypeOeuvre && (
                              <p className="text-xs text-muted-foreground">{td(oeuvre.TypeOeuvre.nom_type)}</p>
                            )}
                            {oeuvre.description && (
                              <p className="text-xs text-muted-foreground truncate mt-1">{td(oeuvre.description)}</p>
                            )}
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Portfolio (autres œuvres) */}
              {profilData.portfolio && profilData.portfolio.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {t('pro.participants.portfolio', 'Portfolio')} ({profilData.portfolio.length} {t('common.works', 'œuvres')})
                  </h4>
                  <ScrollArea className="h-36">
                    <div className="flex gap-3">
                      {profilData.portfolio.map((oeuvre) => (
                        <div
                          key={oeuvre.id_oeuvre}
                          className="flex-shrink-0 w-28 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedOeuvre(oeuvre);
                            setOeuvreAuteur({ nom: profilData.profil.nom, prenom: profilData.profil.prenom });
                            setProfilDialogOpen(false);
                            setOeuvreDialogOpen(true);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedOeuvre(oeuvre); setOeuvreAuteur({ nom: profilData.profil.nom, prenom: profilData.profil.prenom }); setProfilDialogOpen(false); setOeuvreDialogOpen(true); } }}
                        >
                          {oeuvre.image_url ? (
                            <img loading="lazy" decoding="async" src={oeuvre.image_url} alt={td(oeuvre.titre)} className="w-28 h-28 object-cover rounded shadow-sm" />
                          ) : (
                            <div className="w-28 h-28 bg-muted rounded flex items-center justify-center shadow-sm">
                              <Palette className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-xs truncate mt-1 font-medium">{td(oeuvre.titre)}</p>
                          {oeuvre.TypeOeuvre && (
                            <p className="text-xs text-muted-foreground truncate">{td(oeuvre.TypeOeuvre.nom_type)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Historique participations */}
              {profilData.historique_participations && profilData.historique_participations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('pro.participants.participationHistory', 'Historique des participations')}
                  </h4>
                  <div className="space-y-2">
                    {profilData.historique_participations.slice(0, 5).map((h, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>{td(h.evenement?.nom_evenement)}</span>
                        <span className="text-muted-foreground">
                          {h.evenement?.date_debut && formatDate(h.evenement.date_debut, { dateStyle: 'medium' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('pro.participants.loadError', 'Impossible de charger le profil')}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog détails œuvre */}
      <Dialog open={oeuvreDialogOpen} onOpenChange={setOeuvreDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('pro.participants.workDetails', 'Détails de l\'œuvre')}
            </DialogTitle>
          </DialogHeader>

          {selectedOeuvre && (
            <div className="space-y-6">
              {/* Image principale */}
              <div className="relative">
                {selectedOeuvre.image_url ? (
                  <img loading="lazy" decoding="async"
                    src={selectedOeuvre.image_url}
                    alt={td(selectedOeuvre.titre)}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <Palette className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Titre et type */}
              <div>
                <h3 className="text-2xl font-bold">{td(selectedOeuvre.titre)}</h3>
                {selectedOeuvre.TypeOeuvre && (
                  <Badge variant="secondary" className="mt-2">
                    {td(selectedOeuvre.TypeOeuvre.nom_type)}
                  </Badge>
                )}
              </div>

              {/* Auteur */}
              {oeuvreAuteur && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pro.participants.author', 'Auteur / Artiste')}</p>
                    <p className="font-medium">{td(oeuvreAuteur.prenom)} {td(oeuvreAuteur.nom)}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedOeuvre.description && (
                <div>
                  <h4 className="font-semibold mb-2">{t('common.description', 'Description')}</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{td(selectedOeuvre.description)}</p>
                </div>
              )}

              {/* Description de présentation (spécifique à l'événement) */}
              {selectedOeuvre.description_presentation && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('pro.participants.presentationDesc', 'Note pour cet événement')}
                  </h4>
                  <p className="text-sm">{td(selectedOeuvre.description_presentation)}</p>
                </div>
              )}

              {/* Informations techniques */}
              <div className="grid grid-cols-2 gap-4">
                {selectedOeuvre.annee_creation && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.yearCreation', 'Année de création')}</p>
                    <p className="font-medium">{selectedOeuvre.annee_creation}</p>
                  </div>
                )}
                {selectedOeuvre.dimensions && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.dimensions', 'Dimensions')}</p>
                    <p className="font-medium">{selectedOeuvre.dimensions}</p>
                  </div>
                )}
                {selectedOeuvre.materiaux && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.materials', 'Matériaux')}</p>
                    <p className="font-medium">{td(selectedOeuvre.materiaux)}</p>
                  </div>
                )}
                {selectedOeuvre.technique && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.technique', 'Technique')}</p>
                    <p className="font-medium">{td(selectedOeuvre.technique)}</p>
                  </div>
                )}
                {/* Champs spécifiques aux livres */}
                {selectedOeuvre.editeur && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.publisher', 'Éditeur')}</p>
                    <p className="font-medium">{td(selectedOeuvre.editeur)}</p>
                  </div>
                )}
                {selectedOeuvre.isbn && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">ISBN</p>
                    <p className="font-medium">{selectedOeuvre.isbn}</p>
                  </div>
                )}
                {selectedOeuvre.nombre_pages && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.pageCount', 'Nombre de pages')}</p>
                    <p className="font-medium">{selectedOeuvre.nombre_pages}</p>
                  </div>
                )}
                {selectedOeuvre.date_publication && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.publicationDate', 'Date de publication')}</p>
                    <p className="font-medium">{formatDate(selectedOeuvre.date_publication, { dateStyle: 'long' })}</p>
                  </div>
                )}
                {selectedOeuvre.langue && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('oeuvre.language', 'Langue')}</p>
                    <p className="font-medium">{td(selectedOeuvre.langue)}</p>
                  </div>
                )}
              </div>

              {/* Galerie de médias */}
              {selectedOeuvre.Medias && selectedOeuvre.Medias.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">{t('oeuvre.gallery', 'Galerie')}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedOeuvre.Medias.map((media) => (
                      <img loading="lazy" decoding="async"
                        key={media.id_media}
                        src={getAssetUrl(media.url)}
                        alt=""
                        className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                        onClick={() => window.open(getAssetUrl(media.url), '_blank', 'noopener,noreferrer')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton pour voir la page complète */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setOeuvreDialogOpen(false)}>
                  {t('common.close', 'Fermer')}
                </Button>
                <Button asChild>
                  <a href={`/oeuvres/${selectedOeuvre.id_oeuvre}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 me-2" />
                    {t('pro.participants.viewFullPage', 'Voir page complète')}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ParticipantsManager;
