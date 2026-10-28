/**
 * ServiceDetail — fiche publique d'un service aux visiteurs (/services/:id) : photo, description,
 * lieu, contact, horaires, tarifs, professionnel. Un service pas encore validé n'est visible que
 * de son propriétaire et de l'administration (le serveur répond 404 aux autres).
 */
import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, ExternalLink, Globe, Mail, MapPin, Phone, User } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSkeleton } from '@/components/shared';
import ShareButtons from '@/components/shared/ShareButtons';
import { httpClient } from '@/services/httpClient';
import { getAssetUrl } from '@/helpers/assetUrl';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { safeExternalUrl } from '@/utils/safeUrl';
import { professionnelPath } from '@/utils/slug';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { styleTypeService, tarifAvecUnite } from '@/components/services/typesService';
import ServiceAvis from '@/components/services/ServiceAvis';
import NoteService from '@/components/services/NoteService';

interface ServiceFiche {
  id: number;
  nom: unknown;
  description?: unknown;
  type_service?: string;
  statut?: string;
  disponible?: boolean;
  photo_url?: string | null;
  adresse?: unknown;
  telephone?: string | null;
  email?: string | null;
  site_web?: string | null;
  horaires?: unknown;
  tarif_min?: string | number | null;
  tarif_max?: string | number | null;
  Lieu?: {
    id_lieu: number; nom: unknown; adresse?: unknown;
    Commune?: { nom?: unknown; Daira?: { Wilaya?: { nom?: string; wilaya_name_ascii?: string } } };
  } | null;
  Professionnel?: { id_user: number; prenom?: unknown; nom?: unknown; photo_url?: string | null } | null;
  id_user?: number | null;
  // Note moyenne des avis publiés (null : aucune note)
  note?: { moyenne: number; nombre: number } | null;
}

const ServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { formatPriceRange } = useLocalizedNumber();
  const [service, setService] = useState<ServiceFiche | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'introuvable'>('chargement');

  useEffect(() => {
    const n = parseInt(id || '', 10);
    if (!n) { setEtat('introuvable'); return; }
    let actif = true;
    setEtat('chargement');
    httpClient.get<ServiceFiche>(`/services/${n}`)
      .then(res => {
        if (!actif) return;
        if (res.success && res.data) { setService(res.data); setEtat('ok'); } else setEtat('introuvable');
      })
      .catch(() => { if (actif) setEtat('introuvable'); });
    return () => { actif = false; };
  }, [id]);

  const retour = (
    <Button variant="ghost" size="sm" onClick={() => navigate('/patrimoine/services')} className="mb-4 -ms-2">
      <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" aria-hidden="true" />
      {t('servicesVisiteurs.title', 'Services aux visiteurs')}
    </Button>
  );

  if (etat !== 'ok' || !service) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 max-w-4xl">
          {retour}
          {etat === 'chargement'
            ? <LoadingSkeleton type="card" count={1} />
            : <Card className="p-10 text-center"><p className="text-lg">{t('servicesVisiteurs.introuvable', 'Ce service est introuvable ou n’est pas encore publié.')}</p></Card>}
        </main>
        <Footer />
      </div>
    );
  }

  const style = styleTypeService(service.type_service);
  const Icone = style.icon;
  const nom = getLocalizedText(service.nom, lang, t('common.unnamed', 'Sans nom'));
  const description = getLocalizedText(service.description, lang, '');
  const horaires = getLocalizedText(service.horaires, lang, '');
  const adresse = getLocalizedText(service.adresse, lang, '') || getLocalizedText(service.Lieu?.adresse, lang, '');
  const lieu = service.Lieu;
  const wilaya = lieu?.Commune?.Daira?.Wilaya;
  const nomWilaya = lang.startsWith('ar') ? wilaya?.nom : (wilaya?.wilaya_name_ascii || wilaya?.nom);
  const pro = service.Professionnel;
  const nomPro = pro ? `${getLocalizedText(pro.prenom, lang, '')} ${getLocalizedText(pro.nom, lang, '')}`.trim() : '';
  const aTarif = service.tarif_min != null || service.tarif_max != null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={nom}
        description={description.slice(0, 160) || t('servicesVisiteurs.subtitleShort', 'Où manger, où dormir, avec qui visiter, près des lieux du patrimoine')}
        image={service.photo_url ? getAssetUrl(service.photo_url) : undefined}
        type="website"
      />
      <Header />
      <main className="container py-8 max-w-4xl">
        {retour}

        {service.statut && service.statut !== 'valide' && (
          <Alert className="mb-6">
            <AlertDescription>
              {service.statut === 'rejete'
                ? t('servicesVisiteurs.refuse', 'Ce service a été refusé : corrigez-le depuis votre tableau de bord, il repartira en validation.')
                : t('servicesVisiteurs.enAttente', 'En attente de validation : seuls vous et l’équipe Tala DZ voyez cette page pour l’instant.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-xl bg-muted aspect-[16/9] mb-6">
          {service.photo_url
            ? <img src={getAssetUrl(service.photo_url, { width: 1200 })} alt={nom} className="w-full h-full object-cover" />
            : <div className={`w-full h-full flex items-center justify-center ${style.bg}`}><Icone className={`h-20 w-20 ${style.color}`} aria-hidden="true" /></div>}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary" className="gap-1">
            <Icone className={`h-3.5 w-3.5 ${style.color}`} aria-hidden="true" />
            {t(`service.types.${service.type_service || 'autre'}`, service.type_service || 'autre')}
          </Badge>
          {service.disponible !== undefined && (
            <span className={`text-sm ${service.disponible ? 'text-green-700' : 'text-red-600'}`}>
              {service.disponible ? t('services.open', '● Disponible') : t('services.closed', '● Indisponible')}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">{nom}</h1>
        {service.note && <NoteService note={service.note} className="mb-4" />}
        {description && <p className="text-lg text-muted-foreground whitespace-pre-line mb-8">{description}</p>}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold text-lg">{t('servicesVisiteurs.ouTrouver', 'Où le trouver')}</h2>
              {lieu && (
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <Link to={`/patrimoine/${lieu.id_lieu}`} className="font-medium hover:underline underline-offset-4">{getLocalizedText(lieu.nom, lang)}</Link>
                    {nomWilaya && <span className="text-muted-foreground"> · {nomWilaya}</span>}
                  </span>
                </p>
              )}
              {adresse && <p className="text-sm text-muted-foreground ps-6">{adresse}</p>}
              {horaires && (
                <p className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />{horaires}
                </p>
              )}
              {aTarif && (
                <p className="font-medium text-primary">{tarifAvecUnite(t, service.type_service, formatPriceRange(service.tarif_min ?? undefined, service.tarif_max ?? undefined))}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="font-semibold text-lg">{t('servicesVisiteurs.contact', 'Contact')}</h2>
              {service.telephone && (
                <a href={`tel:${service.telephone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-primary">
                  <Phone className="h-4 w-4 text-primary" aria-hidden="true" />{service.telephone}
                </a>
              )}
              {service.email && (
                <a href={`mailto:${service.email}`} className="flex items-center gap-2 hover:text-primary break-all">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{service.email}
                </a>
              )}
              {service.site_web && (
                <a href={safeExternalUrl(service.site_web)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
                  <Globe className="h-4 w-4 text-primary" aria-hidden="true" />{t('services.website', 'Site web')}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
              {!service.telephone && !service.email && !service.site_web && (
                <p className="text-sm text-muted-foreground">{t('servicesVisiteurs.pasDeContact', 'Pas de coordonnées pour l’instant.')}</p>
              )}
              {pro && nomPro && (
                <p className="flex items-center gap-2 pt-2 border-t text-sm">
                  <User className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('servicesVisiteurs.proposePar', 'Proposé par')}{' '}
                  <Link to={professionnelPath(pro.id_user, getLocalizedText(pro.prenom, 'fr'), getLocalizedText(pro.nom, 'fr'))} className="font-medium hover:underline underline-offset-4">{nomPro}</Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {service.statut === 'valide' && (
          <ServiceAvis serviceId={service.id} proprietaireId={service.Professionnel?.id_user ?? service.id_user} />
        )}

        <div className="mt-8">
          <ShareButtons url={typeof window !== 'undefined' ? window.location.href : ''} title={nom} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServiceDetail;
