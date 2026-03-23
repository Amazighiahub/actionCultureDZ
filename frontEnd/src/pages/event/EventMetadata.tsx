/**
 * EventMetadata - Métadonnées de l'événement
 * Type, oeuvres présentées, infos complémentaires
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tag, BookOpen, Building2, Globe, Award, Ticket,
  Users, CalendarCheck, FileCheck
} from 'lucide-react';
import { LazyImage } from '@/components/shared';
import { useTranslateData } from '@/hooks/useTranslateData';
import type { Evenement } from '@/types/models/evenement.types';

interface EventMetadataProps {
  event: Evenement;
}

const EventMetadata: React.FC<EventMetadataProps> = ({ event }) => {
  const { t } = useTranslation();
  const { td } = useTranslateData();
  const navigate = useNavigate();

  const typeNom = td(event.TypeEvenement?.nom_type);
  const oeuvres = event.Oeuvres || [];
  const organisations = event.Organisations || [];

  return (
    <div className="space-y-6">
      {/* Type d'événement + badges clés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {t('event.metadata.title', 'Informations complémentaires')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type d'événement */}
          {typeNom && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('event.metadata.type', 'Type d\'événement')}</p>
                <Badge variant="default" className="mt-1">{typeNom}</Badge>
              </div>
            </div>
          )}

          {/* Badges résumé */}
          <div className="flex flex-wrap gap-2 pt-2">
            {event.inscription_requise && (
              <Badge variant="outline" className="gap-1">
                <FileCheck className="h-3.5 w-3.5" />
                {t('event.metadata.registrationRequired', 'Inscription requise')}
              </Badge>
            )}
            {event.certificat_delivre && (
              <Badge variant="outline" className="gap-1">
                <Award className="h-3.5 w-3.5" />
                {t('event.metadata.certificateDelivered', 'Certificat délivré')}
              </Badge>
            )}
            {event.tarif === 0 && (
              <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                <Ticket className="h-3.5 w-3.5" />
                {t('event.metadata.free', 'Gratuit')}
              </Badge>
            )}
            {event.url_virtuel && (
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3.5 w-3.5" />
                {t('event.metadata.virtual', 'Événement en ligne')}
              </Badge>
            )}
            {event.capacite_max && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3.5 w-3.5" />
                {t('event.metadata.capacity', 'Capacité')}: {event.capacite_max}
              </Badge>
            )}
            {event.TypeEvenement?.accepte_soumissions && (
              <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                <BookOpen className="h-3.5 w-3.5" />
                {t('event.metadata.acceptsSubmissions', 'Accepte les soumissions')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Oeuvres présentées */}
      {oeuvres.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('event.metadata.presentedWorks', 'Oeuvres présentées')}
              <Badge variant="secondary" className="ml-auto">{oeuvres.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {oeuvres.map((oeuvre: any) => (
                <button
                  key={oeuvre.id_oeuvre}
                  onClick={() => navigate(`/oeuvres/${oeuvre.id_oeuvre}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <LazyImage
                    src={oeuvre.image_url || '/images/default-oeuvre.png'}
                    alt={td(oeuvre.titre) || ''}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    fallback="/images/default-oeuvre.png"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{td(oeuvre.titre)}</p>
                    {oeuvre.TypeOeuvre?.nom && (
                      <p className="text-xs text-muted-foreground">{td(oeuvre.TypeOeuvre.nom)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organisations partenaires (compact, si pas déjà affiché ailleurs) */}
      {organisations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {t('event.metadata.partners', 'Partenaires')}
              <Badge variant="secondary" className="ml-auto">{organisations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {organisations.map((org: any) => (
                <Badge key={org.id_organisation} variant="outline" className="gap-1.5 py-1.5">
                  {org.logo_url && (
                    <img src={org.logo_url} alt="" className="w-4 h-4 rounded-full" />
                  )}
                  {td(org.nom)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventMetadata;
