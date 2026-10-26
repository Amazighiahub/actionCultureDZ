/**
 * ServiceCard — carte d'un service aux visiteurs (restaurant, hébergement, guide…) dans l'annuaire
 * Patrimoine › Services aux visiteurs. Toute la carte mène à la fiche du service.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { nomWilaya, type Wilaya } from '@/components/gastronomie/PlatCard';
import { styleTypeService } from './typesService';

export interface ServiceAnnuaire {
  id: number;
  nom: unknown;
  description?: unknown;
  type_service?: string;
  disponible?: boolean;
  photo_url?: string | null;
  tarif_min?: string | number | null;
  tarif_max?: string | number | null;
  lieu?: { id_lieu: number; nom: unknown; commune?: { nom?: unknown } | null } | null;
  wilaya?: Wilaya | null;
}

const ServiceCard: React.FC<{ service: ServiceAnnuaire }> = ({ service }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { formatPriceRange } = useLocalizedNumber();
  const style = styleTypeService(service.type_service);
  const Icone = style.icon;
  const nom = getLocalizedText(service.nom, lang, t('common.unnamed', 'Sans nom'));
  const lieu = getLocalizedText(service.lieu?.nom, lang, '');
  const wilaya = nomWilaya(service.wilaya, lang);
  const aTarif = service.tarif_min != null || service.tarif_max != null;

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[4/3] bg-muted overflow-hidden">
        {service.photo_url ? (
          <img src={getAssetUrl(service.photo_url, { width: 600 })} alt="" loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${style.bg}`}>
            <Icone className={`h-14 w-14 ${style.color}`} aria-hidden="true" />
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Icone className={`h-3 w-3 ${style.color}`} aria-hidden="true" />
            {t(`service.types.${service.type_service || 'autre'}`, service.type_service || 'autre')}
          </Badge>
          {service.disponible === false && <Badge variant="outline">{t('services.closed', '● Indisponible')}</Badge>}
        </div>
        <h2 className="font-semibold text-lg leading-snug">
          {/* Lien « étiré » : toute la carte est cliquable */}
          <Link to={`/services/${service.id}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {nom}
          </Link>
        </h2>
        {(lieu || wilaya) && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {[lieu, wilaya].filter(Boolean).join(' · ')}
          </p>
        )}
        {aTarif && (
          <p className="text-sm font-medium text-primary">{formatPriceRange(service.tarif_min ?? undefined, service.tarif_max ?? undefined)}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
