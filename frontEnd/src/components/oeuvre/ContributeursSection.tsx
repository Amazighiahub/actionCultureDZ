import React from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { User, Star } from 'lucide-react';
import { useRTL } from '@/hooks/useRTL';

interface Contributeur {
  id: string;
  nom: string;
  prenom: string;
  photo_url?: string;
  type: 'user' | 'intervenant';
  role: string;
  role_principal?: boolean;
  personnage?: string;
  description_role?: string;
  biographie?: string;
  isInscrit: boolean;
}

interface ContributeursSectionProps {
  contributeurs: Contributeur[];
  layout?: 'grid' | 'list';
  showBiography?: boolean;
}

export const ContributeursSection: React.FC<ContributeursSectionProps> = ({ 
  contributeurs, 
  layout = 'grid',
  showBiography = false 
}) => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();

  if (contributeurs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('contributors.noContributors')}</p>
      </div>
    );
  }

  // Séparer les contributeurs principaux des autres
  const principaux = contributeurs.filter(c => c.role_principal);
  const autres = contributeurs.filter(c => !c.role_principal);

  if (layout === 'list') {
    return (
      <div className="space-y-4">
        {contributeurs.map((contributeur) => (
          <Card key={contributeur.id} className="p-4">
            <div className={`flex items-start gap-4 ${rtlClasses.flexRow}`}>
              <Avatar className="h-12 w-12">
                <AvatarImage src={contributeur.photo_url} />
                <AvatarFallback>
                  {contributeur.prenom?.[0]}{contributeur.nom?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-base">
                      {contributeur.prenom} {contributeur.nom}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {contributeur.role}
                      {contributeur.personnage && ` - ${contributeur.personnage}`}
                    </p>
                  </div>
                  {contributeur.role_principal && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                {contributeur.description_role && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    {contributeur.description_role}
                  </p>
                )}
                {showBiography && contributeur.biographie && (
                  <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                    {contributeur.biographie}
                  </p>
                )}
                <div className={`flex gap-2 mt-2 ${rtlClasses.flexRow}`}>
                  {contributeur.isInscrit ? (
                    <Badge variant="secondary" className="text-xs">
                      {t('contributors.registeredMember')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {t('contributors.externalContributor')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contributeurs principaux */}
      {principaux.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-muted-foreground mb-3">
            {t('contributors.mainContributors')}
          </h5>
          <div className="grid sm:grid-cols-2 gap-3">
            {principaux.map((contributeur) => (
              <div
                key={contributeur.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contributeur.photo_url} />
                  <AvatarFallback className="text-xs">
                    {contributeur.prenom?.[0]}{contributeur.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {contributeur.prenom} {contributeur.nom}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contributeur.role}
                    {contributeur.personnage && ` - ${contributeur.personnage}`}
                  </p>
                </div>
                <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Autres contributeurs */}
      {autres.length > 0 && (
        <div>
          {principaux.length > 0 && (
            <h5 className="text-sm font-semibold text-muted-foreground mb-3">
              {t('contributors.otherContributors')}
            </h5>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {autres.map((contributeur) => (
              <div
                key={contributeur.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={contributeur.photo_url} />
                  <AvatarFallback className="text-xs">
                    {contributeur.prenom?.[0]}{contributeur.nom?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {contributeur.prenom} {contributeur.nom}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contributeur.role}
                    {contributeur.personnage && ` - ${contributeur.personnage}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};