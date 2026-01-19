/**
 * EventInfo - Informations détaillées de l'événement
 * Description, lieu, horaires, tarifs, accessibilité
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';
import { Button } from '@/components/UI/button';
import {
  MapPin, Clock, Calendar, Users, Ticket, Phone, Mail,
  Globe, Accessibility, Baby, Award, CheckCircle, AlertCircle,
  Navigation, ExternalLink
} from 'lucide-react';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useTranslateData } from '@/hooks/useTranslateData';
import type { Evenement } from '@/types/models/evenement.types';

interface EventInfoProps {
  event: Evenement;
}

const EventInfo: React.FC<EventInfoProps> = ({ event }) => {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  const { formatPrice } = useLocalizedNumber();
  const { td, safe } = useTranslateData(); // Pour traduire les champs JSON multilingues

  // Helper pour vérifier si un champ multilingue a du contenu
  const hasContent = (field: unknown): boolean => {
    if (!field) return false;
    if (typeof field === 'string') return field.trim().length > 0;
    if (typeof field === 'object') {
      const values = Object.values(field as Record<string, string>);
      return values.some(v => v && typeof v === 'string' && v.trim().length > 0);
    }
    return false;
  };

  // Ouvrir dans Google Maps
  const openInMaps = () => {
    if (event.Lieu?.latitude && event.Lieu?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${event.Lieu.latitude},${event.Lieu.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {t('event.description', 'Description')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {hasContent(event.description) ? (
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                {td(event.description)}
              </p>
            ) : (
              <p className="text-muted-foreground italic">
                {t('event.noDescription', 'Aucune description disponible')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Détails pratiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('event.practicalInfo', 'Informations pratiques')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dates et horaires */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Date de début */}
            {event.date_debut && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('event.startDate', 'Date de début')}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.date_debut, { dateStyle: 'full' })}
                  </p>
                </div>
              </div>
            )}

            {/* Date de fin */}
            {event.date_fin && event.date_fin !== event.date_debut && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('event.endDate', 'Date de fin')}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.date_fin, { dateStyle: 'full' })}
                  </p>
                </div>
              </div>
            )}

            {/* Date limite d'inscription */}
            {event.date_limite_inscription && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">{t('event.registrationDeadline', 'Date limite d\'inscription')}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.date_limite_inscription, { dateStyle: 'full' })}
                  </p>
                </div>
              </div>
            )}

            {/* Capacité */}
            {event.capacite_max && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('event.capacity', 'Capacité')}</p>
                  <p className="text-sm text-muted-foreground">
                    {safe(event.nombre_inscrits, '0')} / {safe(event.capacite_max)} {t('events.participants', 'participants')}
                  </p>
                  {event.est_complet && (
                    <Badge variant="destructive" className="mt-1">
                      {t('events.full', 'Complet')}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tarification */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
              <Ticket className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{t('event.pricing', 'Tarification')}</p>
              {event.tarif === 0 ? (
                <Badge className="bg-green-500 mt-1">
                  {t('events.free', 'Gratuit')}
                </Badge>
              ) : (
                <p className="text-lg font-bold text-primary">
                  {formatPrice(event.tarif)}
                </p>
              )}
            </div>
          </div>

          {/* Âge minimum */}
          {event.age_minimum && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Baby className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('event.minimumAge', 'Âge minimum')}</p>
                  <p className="text-sm text-muted-foreground">
                    {safe(event.age_minimum)} {t('common.years', 'ans')}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Accessibilité */}
          {hasContent(event.accessibilite) && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Accessibility className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{t('event.accessibility', 'Accessibilité')}</p>
                  <p className="text-sm text-muted-foreground">
                    {td(event.accessibilite)}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Certificat */}
          {event.certificat_delivre && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                  <Award className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">{t('event.certificate', 'Certificat')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('event.certificateDelivered', 'Un certificat de participation sera délivré')}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lieu */}
      {event.Lieu && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {t('event.location', 'Lieu')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-lg">{td(event.Lieu.nom) || t('common.unknown', 'Inconnu')}</h4>
              {hasContent(event.Lieu.adresse) && (
                <p className="text-muted-foreground">{td(event.Lieu.adresse)}</p>
              )}

              {/* Hiérarchie géographique */}
              {event.Lieu.Commune && (
                <p className="text-sm text-muted-foreground mt-1">
                  {td(event.Lieu.Commune.nom) || td(event.Lieu.Commune.commune_name_ascii)}
                  {event.Lieu.Commune.Daira && (
                    <>, {td(event.Lieu.Commune.Daira.nom) || td(event.Lieu.Commune.Daira.daira_name_ascii)}</>
                  )}
                  {event.Lieu.Commune.Daira?.Wilaya && (
                    <> - {td(event.Lieu.Commune.Daira.Wilaya.nom) || td(event.Lieu.Commune.Daira.Wilaya.wilaya_name_ascii)}</>
                  )}
                </p>
              )}
            </div>

            {/* Mini carte ou bouton pour ouvrir Maps */}
            {event.Lieu.latitude && event.Lieu.longitude && (
              <div className="flex gap-2">
                <Button onClick={openInMaps} variant="outline" className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  {t('event.getDirections', 'Itinéraire')}
                </Button>
                <Button 
                  variant="outline"
                  asChild
                >
                  <a 
                    href={`https://www.google.com/maps?q=${event.Lieu.latitude},${event.Lieu.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('event.viewOnMap', 'Voir sur la carte')}
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      {(event.contact_email || event.contact_telephone) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              {t('event.contact', 'Contact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.contact_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <a 
                  href={`mailto:${event.contact_email}`}
                  className="text-primary hover:underline"
                >
                  {event.contact_email}
                </a>
              </div>
            )}
            
            {event.contact_telephone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <a 
                  href={`tel:${event.contact_telephone}`}
                  className="text-primary hover:underline"
                >
                  {event.contact_telephone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventInfo;
