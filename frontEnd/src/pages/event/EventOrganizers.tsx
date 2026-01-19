/**
 * EventOrganizers - Liste des organisateurs de l'événement
 * Affiche les organisations et personnes qui organisent l'événement
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import {
  Users, Building2, Mail, Phone, Globe, ExternalLink,
  Award, Star, MapPin
} from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { useTranslateData } from '@/hooks/useTranslateData';
import { cn } from '@/lib/utils';
import type { Organisation } from '@/types/models/organisation.types';
import type { User } from '@/types/models/user.types';

// Type unifié pour les organisateurs (peut être User ou Organisation)
interface Organizer {
  id: number;
  type: 'user' | 'organisation';
  nom: string;
  prenom?: string;
  photo_url?: string;
  logo_url?: string;
  role?: string;
  description?: string;
  email?: string;
  telephone?: string;
  site_web?: string;
  type_organisation?: string;
  // Pour les users
  entreprise?: string;
  specialites?: string[];
}

interface EventOrganizersProps {
  organizers: Organizer[];
}

// Couleurs par rôle
const roleColors: Record<string, string> = {
  organisateur_principal: 'bg-primary text-primary-foreground',
  co_organisateur: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  partenaire: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  sponsor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  media: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  default: 'bg-muted text-muted-foreground'
};

// Icône par type d'organisation
const getOrgIcon = (type?: string | object) => {
  // S'assurer que type est une string (peut être un objet multilingue)
  const typeStr = typeof type === 'string' ? type : '';
  switch (typeStr.toLowerCase()) {
    case 'association':
    case 'ong':
      return Users;
    case 'entreprise':
    case 'societe':
      return Building2;
    case 'institution':
    case 'gouvernement':
      return Award;
    default:
      return Building2;
  }
};

// Composant pour un organisateur
interface OrganizerCardProps {
  organizer: Organizer;
  variant?: 'default' | 'compact';
}

const OrganizerCard: React.FC<OrganizerCardProps> = ({ organizer, variant = 'default' }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const OrgIcon = getOrgIcon(td(organizer.type_organisation));

  const displayName = organizer.type === 'user'
    ? `${td(organizer.prenom) || ''} ${td(organizer.nom)}`.trim()
    : td(organizer.nom);

  const imageUrl = organizer.photo_url || organizer.logo_url || '/images/default-avatar.png';

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <LazyImage
          src={imageUrl}
          alt={displayName}
          className="w-10 h-10 rounded-full"
          aspectRatio="square"
          fallback="/images/default-avatar.png"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{displayName}</p>
          {organizer.role && (
            <Badge variant="secondary" className="text-xs mt-1">
              {t(`event.roles.${organizer.role}`, organizer.role)}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Avatar/Logo */}
          <div className="flex-shrink-0">
            {organizer.type === 'organisation' ? (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                {organizer.logo_url ? (
                  <LazyImage
                    src={organizer.logo_url}
                    alt={displayName}
                    className="w-full h-full object-contain rounded-lg"
                    fallback="/images/default-org.png"
                  />
                ) : (
                  <OrgIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            ) : (
              <LazyImage
                src={imageUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full"
                aspectRatio="square"
                fallback="/images/default-avatar.png"
              />
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{displayName}</h4>
                
                {organizer.type === 'user' && organizer.entreprise && (
                  <p className="text-sm text-muted-foreground">
                    {td(organizer.entreprise)}
                  </p>
                )}

                {organizer.type === 'organisation' && organizer.type_organisation && (
                  <p className="text-sm text-muted-foreground capitalize">
                    {td(organizer.type_organisation)}
                  </p>
                )}
              </div>

              {organizer.role && (
                <Badge className={cn(
                  "flex-shrink-0",
                  roleColors[organizer.role] || roleColors.default
                )}>
                  {t(`event.roles.${organizer.role}`, organizer.role)}
                </Badge>
              )}
            </div>

            {/* Description courte */}
            {td(organizer.description) && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {td(organizer.description)}
              </p>
            )}

            {/* Spécialités pour les users */}
            {organizer.specialites && organizer.specialites.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {organizer.specialites.slice(0, 3).map((spec, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {spec}
                  </Badge>
                ))}
                {organizer.specialites.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{organizer.specialites.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Contact */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {organizer.email && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                  <a href={`mailto:${organizer.email}`}>
                    <Mail className="h-4 w-4 mr-1" />
                    {t('common.email', 'Email')}
                  </a>
                </Button>
              )}
              
              {organizer.telephone && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                  <a href={`tel:${organizer.telephone}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    {t('common.call', 'Appeler')}
                  </a>
                </Button>
              )}
              
              {organizer.site_web && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                  <a href={organizer.site_web} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-1" />
                    {t('common.website', 'Site web')}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant principal
const EventOrganizers: React.FC<EventOrganizersProps> = ({ organizers }) => {
  const { t } = useTranslation();

  // Séparer organisateurs principaux et autres
  const mainOrganizers = organizers.filter(
    o => o.role === 'organisateur_principal' || o.role === 'organisateur'
  );
  const otherOrganizers = organizers.filter(
    o => o.role !== 'organisateur_principal' && o.role !== 'organisateur'
  );

  if (!organizers || organizers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('event.organizers', 'Organisateurs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('event.noOrganizers', 'Aucun organisateur renseigné')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Organisateurs principaux */}
      {mainOrganizers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              {t('event.mainOrganizer', 'Organisateur')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mainOrganizers.map((organizer) => (
              <OrganizerCard 
                key={`${organizer.type}-${organizer.id}`} 
                organizer={organizer}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Partenaires et sponsors */}
      {otherOrganizers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('event.partners', 'Partenaires')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherOrganizers.map((organizer) => (
              <OrganizerCard 
                key={`${organizer.type}-${organizer.id}`} 
                organizer={organizer}
                variant="compact"
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventOrganizers;
