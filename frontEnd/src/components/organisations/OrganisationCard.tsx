/** Carte d'une organisation dans l'annuaire : logo, type, wilaya, nombre d'événements et d'œuvres */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { getAssetUrl } from '@/helpers/assetUrl';
import { organisationPath } from '@/utils/slug';
import { nomWilaya } from '@/components/gastronomie/PlatCard';
import { styleCategorie, type OrganisationAnnuaire } from './categoriesOrganisation';

const OrganisationCard: React.FC<{ organisation: OrganisationAnnuaire }> = ({ organisation: o }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const style = styleCategorie(o.categorie);
  const Icone = style.icon;
  const nom = getLocalizedText(o.nom, lang, t('common.unnamed', 'Sans nom'));
  const description = getLocalizedText(o.description, lang, '');
  const wilaya = nomWilaya(o.Wilaya, lang);

  return (
    <Card className="group relative hover:shadow-lg transition-shadow">
      <CardContent className="p-5 flex gap-4">
        <div className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${o.logo_url ? 'bg-white border' : style.bg}`}>
          {o.logo_url
            ? <img src={getAssetUrl(o.logo_url, { width: 160 })} alt="" loading="lazy" className="h-full w-full object-contain" />
            : <Icone className={`h-8 w-8 ${style.color}`} aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {o.TypeOrganisation && (
            <Badge variant="secondary" className="gap-1">
              <Icone className={`h-3 w-3 ${style.color}`} aria-hidden="true" />
              {getLocalizedText(o.TypeOrganisation.nom, lang)}
            </Badge>
          )}
          <h2 className="font-semibold text-lg leading-snug">
            {/* Lien « étiré » : toute la carte est cliquable */}
            <Link to={organisationPath(o.id_organisation, o.nom)} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring rounded-lg">
              {nom}
            </Link>
          </h2>
          {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {wilaya && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{wilaya}</span>}
            {!!o.evenements && (
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {t('organisations.nbEvenements', { count: o.evenements, defaultValue: '{{count}} événement(s)' })}
              </span>
            )}
            {!!o.oeuvres && (
              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {t('organisations.nbOeuvres', { count: o.oeuvres, defaultValue: '{{count}} œuvre(s)' })}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganisationCard;
