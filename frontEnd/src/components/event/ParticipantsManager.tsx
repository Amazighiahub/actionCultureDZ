/**
 * ParticipantsManager - Gestion des participants d'un événement
 * Permet au professionnel de voir les participants, leurs œuvres soumises et leurs profils
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Badge } from '@/components/UI/badge';
import { Input } from '@/components/UI/input';
import { Skeleton } from '@/components/UI/skeleton';
import { ScrollArea } from '@/components/UI/scroll-area';
import { Separator } from '@/components/UI/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/UI/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/UI/select';
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
  Loader2
} from 'lucide-react';
import { httpClient } from '@/services/httpClient';
import { useTranslateData } from '@/hooks/useTranslateData';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { cn } from '@/lib/utils';

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
}

interface Participant {
  id_EventUser: number;
  id_user: number;
  statut_participation: string;
  role_participation: string;
  date_inscription: string;
  notes?: string;
  User: {
    id_user: number;
    nom: string;
    prenom: string;
    email: string;
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
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    TypeUser?: { nom_type: string };
    Organisations?: Array<{ id_organisation: number; nom: string; logo_url?: string }>;
  };
  inscription: {
    statut_participation: string;
    role_participation: string;
    date_inscription: string;
    notes?: string;
  };
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
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const { formatDate } = useLocalizedDate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const [profilData, setProfilData] = useState<ParticipantProfil | null>(null);
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilDialogOpen, setProfilDialogOpen] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [evenementId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await httpClient.get<{ data: Participant[]; stats: Stats }>(
        `/professionnel/evenements/${evenementId}/participants`
      );
      if (response.success && response.data) {
        setParticipants(response.data as unknown as Participant[]);
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

  const getStatusBadge = (statut: string) => {
    const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      inscrit: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Inscrit' },
      confirme: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Confirmé' },
      present: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Présent' },
      absent: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Absent' },
      annule: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Annulé' }
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
      participant: { color: 'bg-slate-100 text-slate-800', label: 'Participant' },
      organisateur: { color: 'bg-purple-100 text-purple-800', label: 'Organisateur' },
      intervenant: { color: 'bg-orange-100 text-orange-800', label: 'Intervenant' },
      benevole: { color: 'bg-cyan-100 text-cyan-800', label: 'Bénévole' },
      staff: { color: 'bg-indigo-100 text-indigo-800', label: 'Staff' }
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
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('pro.participants.search', 'Rechercher un participant...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="inscrit">Inscrit</SelectItem>
              <SelectItem value="confirme">Confirmé</SelectItem>
              <SelectItem value="present">Présent</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="participant">Participant</SelectItem>
              <SelectItem value="intervenant">Intervenant</SelectItem>
              <SelectItem value="benevole">Bénévole</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
                  <div className="flex items-start gap-4">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        Inscrit le {formatDate(participant.date_inscription, { dateStyle: 'medium' })}
                      </p>

                      {/* Œuvres soumises */}
                      {participant.oeuvres_soumises && participant.oeuvres_soumises.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            <Palette className="inline h-3 w-3 mr-1" />
                            {participant.oeuvres_soumises.length} œuvre(s) soumise(s):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {participant.oeuvres_soumises.slice(0, 3).map((oeuvre) => (
                              <Badge key={oeuvre.id_oeuvre} variant="outline" className="text-xs">
                                {td(oeuvre.titre)}
                              </Badge>
                            ))}
                            {participant.oeuvres_soumises.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{participant.oeuvres_soumises.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadParticipantProfil(participant.id_user)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir profil
                    </Button>
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
                        <Mail className="h-4 w-4 mr-1" />
                        {profilData.profil.email}
                      </a>
                    </Button>
                    {profilData.profil.telephone && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`tel:${profilData.profil.telephone}`}>
                          <Phone className="h-4 w-4 mr-1" />
                          {profilData.profil.telephone}
                        </a>
                      </Button>
                    )}
                    {profilData.profil.site_web && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={profilData.profil.site_web} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-1" />
                          Site web
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Inscription à cet événement */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Inscription à cet événement
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {getStatusBadge(profilData.inscription.statut_participation)}
                  {getRoleBadge(profilData.inscription.role_participation)}
                  <span className="text-sm text-muted-foreground">
                    Inscrit le {formatDate(profilData.inscription.date_inscription, { dateStyle: 'long' })}
                  </span>
                </div>
                {profilData.inscription.notes && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded">
                    <strong>Notes:</strong> {profilData.inscription.notes}
                  </p>
                )}
              </div>

              {/* Œuvres soumises pour cet événement */}
              {profilData.oeuvres_soumises && profilData.oeuvres_soumises.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Œuvres soumises pour cet événement ({profilData.oeuvres_soumises.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {profilData.oeuvres_soumises.map((oeuvre) => {
                      const Icon = getOeuvreIcon(oeuvre.TypeOeuvre?.nom_type);
                      return (
                        <div key={oeuvre.id_oeuvre} className="flex items-center gap-3 p-3 border rounded-lg">
                          {oeuvre.image_url ? (
                            <img src={oeuvre.image_url} alt={td(oeuvre.titre)} className="w-16 h-16 object-cover rounded" />
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
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/oeuvres/${oeuvre.id_oeuvre}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
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
                    Portfolio ({profilData.portfolio.length} œuvres)
                  </h4>
                  <ScrollArea className="h-32">
                    <div className="flex gap-2">
                      {profilData.portfolio.map((oeuvre) => (
                        <div key={oeuvre.id_oeuvre} className="flex-shrink-0 w-24">
                          {oeuvre.image_url ? (
                            <img src={oeuvre.image_url} alt={td(oeuvre.titre)} className="w-24 h-24 object-cover rounded" />
                          ) : (
                            <div className="w-24 h-24 bg-muted rounded flex items-center justify-center">
                              <Palette className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-xs truncate mt-1">{td(oeuvre.titre)}</p>
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
                    Historique des participations
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
              Impossible de charger le profil
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ParticipantsManager;
