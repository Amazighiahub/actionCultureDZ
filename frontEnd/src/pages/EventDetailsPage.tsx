/**
 * EventDetailsPage.tsx - Page détail événement refactorisée
 * Réduit de 1326 lignes à ~200 lignes
 */
import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { evenementPath, idFromSlug } from '@/utils/slug';
import { getLocalizedText } from '@/utils/getLocalizedText';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, Calendar, Image, MessageCircle, Users, Info, MapPin, Tag, QrCode } from 'lucide-react';

// Composants partagés
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import SEOHead, { buildEvenementJsonLd, buildBreadcrumbJsonLd } from '@/components/SEOHead';

// Hook personnalisé
import { useEventDetails } from '@/hooks/useEventDetails';
import { saisieEnAttente } from '@/hooks/useSaisieConservee';
import { useUtilisateurOptionnel } from '@/providers/PermissionsProvider';
// Haut de page (photo, titre) chargé avec la page : en chargement séparé, il ajoutait une attente
// de 0,4 à 0,7 s sur téléphone avant l'affichage de la photo
import EventHero from './event/EventHero';

// ✅ LAZY LOADING des sections
const EventInfo = React.lazy(() => import('./event/EventInfo'));
const EventDocuments = React.lazy(() => import('@/components/event/EventDocuments'));
const EventProgram = React.lazy(() => import('./event/EventProgram'));
const EventGallery = React.lazy(() => import('./event/EventGallery'));
import { LiensDuContenu } from '@/components/shared/LiensExternes';
import ContenuIntrouvable from '@/components/shared/ContenuIntrouvable';
const EventComments = React.lazy(() => import('./event/EventComments'));
const EventOrganizers = React.lazy(() => import('./event/EventOrganizers'));
const EventRegistration = React.lazy(() => import('./event/EventRegistration'));
const EventParticipants = React.lazy(() => import('./event/EventParticipants'));
const EventMetadata = React.lazy(() => import('./event/EventMetadata'));
const EventQRCode = React.lazy(() => import('./event/EventQRCode'));
const RelatedEvents = React.lazy(() => import('./event/RelatedEvents'));
const ServicesProximite = React.lazy(() => import('@/components/shared/ServicesProximite'));
const CarteInteractiveUnifiee = React.lazy(() => import('@/components/CarteInteractiveUnifiee'));

// Fallback
const SectionFallback: React.FC = () => (
  <LoadingSkeleton type="card" count={1} />
);

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('info');

  // Scroll to top when navigating to a different event
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Hook pour charger les données
  const {
    event,
    programs,
    medias,
    comments,
    publicParticipants,
    organizers,
    loading,
    error,
    erreurChargement,
    recharger,
    isFavorite,
    toggleFavorite,
    addComment,
    rafraichirCommentaires,
    registerToEvent,
    unregisterFromEvent,
    isRegistered,
    registrationStatus
  } = useEventDetails(idFromSlug(id) ?? 0);

  // Retour après une session expirée pendant l'écriture d'un avis : l'onglet des avis s'ouvre pour que
  // le texte conservé réapparaisse (l'onglet n'est affiché que s'il est ouvert, audit V11 FRM-23)
  const user = useUtilisateurOptionnel();
  useEffect(() => {
    if (event?.id_evenement && saisieEnAttente(`avis-evenement:${event.id_evenement}`, user?.id_user)) setActiveTab('comments');
  }, [event?.id_evenement, user?.id_user]);

  // Adresse lisible et partageable : /evenements/1 -> /evenements/1-salon-de-la-poterie-…
  const cheminCanonique = event ? evenementPath(event.id_evenement, event.nom_evenement) : null;
  useEffect(() => {
    if (cheminCanonique && id && `/evenements/${id}` !== cheminCanonique) {
      navigate(cheminCanonique + window.location.search + window.location.hash, { replace: true });
    }
  }, [cheminCanonique, id, navigate]);

  // Retour si pas d'ID
  if (!id) {
    navigate('/evenements');
    return null;
  }

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <LoadingSkeleton type="profile" />
          <div className="mt-8">
            <LoadingSkeleton type="card" count={3} />
          </div>
        </main>
      </div>
    );
  }

  // Erreur
  if (error || !event) {
    return (
      <ContenuIntrouvable
        erreur={erreurChargement}
        titre={t('event.notFound', 'Événement non trouvé')}
        message={t('introuvable.evenement', 'Cet événement n’existe pas ou n’est plus publié.')}
        lienListe={{ to: '/evenements', libelle: t('event.backToList', 'Retour à la liste') }}
        onReessayer={recharger}
      />
    );
  }

  // Titre dans la langue du site (pour le partage depuis le QR code)
  const titreEvenement = getLocalizedText(event.nom_evenement, i18n.language);

  // Onglets de la fiche (« Services » seulement si l'événement a un lieu)
  const onglets = [
    { key: 'info', icon: Info, label: t('event.tabs.info', 'Informations') },
    { key: 'program', icon: Calendar, label: t('event.tabs.program', 'Programme') },
    { key: 'gallery', icon: Image, label: t('event.tabs.gallery', 'Galerie') },
    { key: 'participants', icon: Users, label: `${t('event.tabs.participants', 'Participants')} (${publicParticipants.total})` },
    { key: 'comments', icon: MessageCircle, label: `${t('event.tabs.comments', 'Avis')} (${comments?.length || 0})` },
    ...(event.Lieu?.id_lieu ? [{ key: 'services', icon: MapPin, label: t('event.tabs.services', 'Services') }] : []),
    { key: 'metadata', icon: Tag, label: t('event.tabs.metadata', 'Métadonnées') },
  ];

  const seoKeywords = [
    event.nom_evenement || event.titre, event.TypeEvenement?.nom,
    event.Lieu?.nom, 'événement culturel', 'culture algérienne', 'Algérie'
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={event.nom_evenement || event.titre}
        description={event.description?.substring(0, 160) || `Événement culturel en Algérie`}
        image={event.image_url || event.couverture_url}
        type="event"
        keywords={seoKeywords}
        jsonLd={[
          buildEvenementJsonLd(event),
          buildBreadcrumbJsonLd([
            { name: 'Accueil', url: '/' },
            { name: 'Événements', url: '/evenements' },
            { name: event.nom_evenement || event.titre || '', url: evenementPath(event.id_evenement, event.nom_evenement) },
          ]),
        ]}
      />
      <Header />

      <main>
        {/* Bouton retour */}
        <div className="container pt-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ChevronLeft className="h-4 w-4 me-2 rtl:-scale-x-100" />
            {t('common.back', 'Retour')}
          </Button>
        </div>

        {/* Hero Section */}
        <ErrorBoundary>
          <EventHero
            event={event}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </ErrorBoundary>

        {/* Contenu principal */}
        <div className="container py-8">
          {/* Sur téléphone, l'inscription (prix, places, bouton) vient juste après l'en-tête : avant, elle était
              sous tout le contenu, à plus de deux écrans (audit V11 UX-8). Sur ordinateur, colonne de droite. */}
          <div className="grid gap-8 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
            {/* Colonne principale */}
            <div className="lg:col-span-2 lg:row-span-2 lg:col-start-1 lg:row-start-1 space-y-8 min-w-0">
              {/* Onglets Radix : rôles tablist/tab, aria-selected et flèches du clavier fournis par le kit.
                  Sur téléphone la rangée défile, avec un fondu sur les bords pour signaler la suite (audit V11 UX-21). */}
              <Tabs value={activeTab} onValueChange={setActiveTab} dir={i18n.dir()}>
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)] sm:[mask-image:none]">
                  <TabsList aria-label={t('event.tabs.label', 'Rubriques de l’événement')} className="h-auto justify-start gap-1 rounded-lg p-1 flex-nowrap w-max">
                    {onglets.map(({ key, icon: Icon, label }) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="gap-2 rounded-md flex-shrink-0"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Contenu de l'onglet actif (seul l'onglet ouvert est monté) */}
                <div className="mt-6">
                  <TabsContent value="info" className="mt-0">
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <EventInfo event={event} />
                        <div className="mt-6"><EventDocuments eventId={event.id_evenement} /></div>
                      </Suspense>
                    </ErrorBoundary>
                    <LiensDuContenu type="evenement" id={event.id_evenement} className="mt-8" />
                  </TabsContent>

                  <TabsContent value="program" className="mt-0">
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <EventProgram programs={programs || []} />
                        <div className="mt-6"><EventDocuments eventId={event.id_evenement} /></div>
                      </Suspense>
                    </ErrorBoundary>
                  </TabsContent>

                  <TabsContent value="gallery" className="mt-0">
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        {/* Les PDF sont dans « Documents à télécharger », pas dans la galerie */}
                        <EventGallery medias={(medias || []).filter(m => m.type_media !== 'document')} />
                      </Suspense>
                    </ErrorBoundary>
                  </TabsContent>

                  <TabsContent value="participants" className="mt-0">
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <EventParticipants
                          participants={publicParticipants.participants}
                          total={publicParticipants.total}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <EventComments
                          comments={comments || []}
                          onAddComment={addComment}
                          eventId={event.id_evenement}
                          onChange={rafraichirCommentaires}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </TabsContent>

                  {event.Lieu?.id_lieu && (
                  <TabsContent value="services" className="mt-0">
                    <div className="space-y-6">
                      {event.Lieu.latitude && event.Lieu.longitude && (
                        <ErrorBoundary>
                          <Suspense fallback={<SectionFallback />}>
                            <CarteInteractiveUnifiee
                              lieux={[event.Lieu]}
                              center={[event.Lieu.latitude, event.Lieu.longitude]}
                              zoom={14}
                              height="350px"
                              showFilters={true}
                              showFullscreen={true}
                            />
                          </Suspense>
                        </ErrorBoundary>
                      )}
                      <ErrorBoundary>
                        <Suspense fallback={<SectionFallback />}>
                          <ServicesProximite
                            lieuId={event.Lieu.id_lieu}
                            lieuName={event.Lieu.nom || ''}
                            variant="full"
                            showTitle={true}
                          />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </TabsContent>
                  )}

                  <TabsContent value="metadata" className="mt-0">
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <EventMetadata event={event} />
                      </Suspense>
                    </ErrorBoundary>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Inscription */}
            <div id="inscription" className="order-first lg:order-none lg:col-start-3 lg:row-start-1 scroll-mt-24">
              <ErrorBoundary>
                <Suspense fallback={<SectionFallback />}>
                  <EventRegistration
                    event={event}
                    onRegister={registerToEvent}
                    onUnregister={unregisterFromEvent}
                    isRegistered={isRegistered}
                    registrationStatus={registrationStatus}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:col-start-3 lg:row-start-2">

              {/* Organisateurs */}
              <ErrorBoundary>
                <Suspense fallback={<SectionFallback />}>
                  <EventOrganizers organizers={organizers || []} />
                </Suspense>
              </ErrorBoundary>

              {/* QR Code : carte sur ordinateur ; sur téléphone, un bouton l'ouvre dans un dialogue
                  (on est déjà sur la page : le grand QR ne sert qu'à l'imprimer, audit V11 UX-19) */}
              <div className="hidden md:block">
                <ErrorBoundary>
                  <Suspense fallback={<SectionFallback />}>
                    <EventQRCode eventId={event.id_evenement} eventTitle={titreEvenement} />
                  </Suspense>
                </ErrorBoundary>
              </div>
              <div className="md:hidden">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <QrCode className="h-4 w-4 me-2" aria-hidden="true" />
                      {t('qrcode.imprimer', 'QR code à imprimer')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                    <DialogHeader><DialogTitle>{t('event.qrcode.title', 'QR Code de l’événement')}</DialogTitle></DialogHeader>
                    <ErrorBoundary>
                      <Suspense fallback={<SectionFallback />}>
                        <EventQRCode eventId={event.id_evenement} eventTitle={titreEvenement} enDialogue />
                      </Suspense>
                    </ErrorBoundary>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Événements similaires */}
          <div className="mt-12">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="card" count={3} />}>
                <RelatedEvents eventId={event.id_evenement} typeEvenementId={event.id_type_evenement} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetailsPage;
