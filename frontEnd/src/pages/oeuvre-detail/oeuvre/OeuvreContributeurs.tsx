/**
 * OeuvreContributeurs - Liste des contributeurs de l'œuvre
 * Auteurs, réalisateurs, artistes, intervenants
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import { Users, Award, Star, ExternalLink } from 'lucide-react';
import { LazyImage, EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';

interface Contributeur {
  id_user?: number;
  id_intervenant?: number;
  nom: string;
  prenom?: string;
  photo_url?: string;
  role?: string;
  type_user?: string;
  TypeUser?: {
    id_type_user: number;
    nom_type: string;
  };
  personnage?: string;
  role_principal?: boolean;
  description_role?: string;
  biographie?: string;
}

interface OeuvreContributeursProps {
  contributeurs: Contributeur[];
}

// Couleurs par type de rôle
const roleColors: Record<string, string> = {
  auteur: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  realisateur: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  acteur: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  compositeur: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  artiste: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  illustrateur: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  traducteur: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  default: 'bg-muted text-muted-foreground'
};

// Obtenir la couleur du badge
const getRoleColor = (role?: string) => {
  if (!role) return roleColors.default;
  const normalizedRole = role.toLowerCase().replace(/[^a-z]/g, '');
  return roleColors[normalizedRole] || roleColors.default;
};

// Carte de contributeur
interface ContributeurCardProps {
  contributeur: Contributeur;
  featured?: boolean;
}

const ContributeurCard: React.FC<ContributeurCardProps> = ({ contributeur, featured = false }) => {
  const { t } = useTranslation();
  
  const displayName = contributeur.prenom 
    ? `${contributeur.prenom} ${contributeur.nom}` 
    : contributeur.nom;

  const roleLabel = contributeur.TypeUser?.nom_type || contributeur.type_user || contributeur.role;

  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      featured && "border-primary"
    )}>
      <CardContent className={cn("p-4", featured ? "flex gap-4" : "")}>
        {featured ? (
          // Version featured (principale)
          <>
            <LazyImage
              src={contributeur.photo_url || '/images/default-avatar.png'}
              alt={displayName}
              className="w-20 h-20 rounded-full flex-shrink-0"
              aspectRatio="square"
              fallback="/images/default-avatar.png"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    {displayName}
                    {contributeur.role_principal && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </h4>
                  {roleLabel && (
                    <Badge className={cn("mt-1", getRoleColor(roleLabel))}>
                      {roleLabel}
                    </Badge>
                  )}
                </div>
              </div>
              
              {contributeur.personnage && (
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium">{t('oeuvre.character', 'Personnage')}:</span>{' '}
                  {contributeur.personnage}
                </p>
              )}
              
              {contributeur.description_role && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {contributeur.description_role}
                </p>
              )}
              
              {contributeur.biographie && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {contributeur.biographie}
                </p>
              )}
            </div>
          </>
        ) : (
          // Version compacte
          <div className="flex items-center gap-3">
            <LazyImage
              src={contributeur.photo_url || '/images/default-avatar.png'}
              alt={displayName}
              className="w-12 h-12 rounded-full flex-shrink-0"
              aspectRatio="square"
              fallback="/images/default-avatar.png"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate flex items-center gap-1">
                {displayName}
                {contributeur.role_principal && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </p>
              {roleLabel && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {roleLabel}
                </Badge>
              )}
              {contributeur.personnage && (
                <p className="text-xs text-muted-foreground truncate">
                  {contributeur.personnage}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Composant principal
const OeuvreContributeurs: React.FC<OeuvreContributeursProps> = ({ contributeurs }) => {
  const { t } = useTranslation();

  if (!contributeurs || contributeurs.length === 0) {
    return (
      <EmptyState
        type="users"
        title={t('oeuvre.noContributors', 'Aucun contributeur renseigné')}
        description={t('oeuvre.noContributorsDesc', 'Les informations sur les contributeurs ne sont pas encore disponibles')}
      />
    );
  }

  // Séparer les contributeurs principaux des autres
  const principaux = contributeurs.filter(c => c.role_principal);
  const autres = contributeurs.filter(c => !c.role_principal);

  // Grouper par type de rôle
  const groupedByRole = contributeurs.reduce((acc, c) => {
    const role = c.TypeUser?.nom_type || c.type_user || c.role || 'Autre';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(c);
    return acc;
  }, {} as Record<string, Contributeur[]>);

  const roles = Object.keys(groupedByRole);

  return (
    <div className="space-y-8">
      {/* Contributeurs principaux */}
      {principaux.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            {t('oeuvre.mainContributors', 'Contributeurs principaux')}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {principaux.map((contributeur, index) => (
              <ContributeurCard
                key={contributeur.id_user || contributeur.id_intervenant || index}
                contributeur={contributeur}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* Contributeurs par rôle */}
      {roles.length > 1 ? (
        // Affichage groupé par rôle
        roles.map((role) => {
          const members = groupedByRole[role];
          // Skip si déjà affiché dans principaux
          const nonPrincipaux = members.filter(m => !m.role_principal);
          if (nonPrincipaux.length === 0) return null;

          return (
            <div key={role}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                {role} ({nonPrincipaux.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nonPrincipaux.map((contributeur, index) => (
                  <ContributeurCard
                    key={contributeur.id_user || contributeur.id_intervenant || `${role}-${index}`}
                    contributeur={contributeur}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : autres.length > 0 ? (
        // Affichage simple si un seul type ou pas de groupement
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('oeuvre.contributors', 'Contributeurs')} ({autres.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {autres.map((contributeur, index) => (
              <ContributeurCard
                key={contributeur.id_user || contributeur.id_intervenant || index}
                contributeur={contributeur}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Résumé */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('oeuvre.totalContributors', 'Total des contributeurs')}
            </span>
            <Badge variant="secondary">
              {contributeurs.length} {t('oeuvre.people', 'personnes')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OeuvreContributeurs;
