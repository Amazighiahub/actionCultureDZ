/**
 * EventDetailsPage.tsx - Page détail événement refactorisée
 * Réduit de 1326 lignes à ~200 lignes
 */
import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/UI/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { ChevronLeft, Calendar, Image, MessageCircle, Users, Info } from 'lucide-react';

// Composants partagés
import { LoadingSkeleton } from '@/components/shared';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Hook personnalisé
import { useEventDetails } from '@/hooks/useEventDetails';

// ✅ LAZY LOADING des sections
const EventHero = React.lazy(() => import('./event/EventHero'));
const EventInfo = React.lazy(() => import('./event/EventInfo'));
const EventProgram = React.lazy(() => import('./event/EventProgram'));
const EventGallery = React.lazy(() => import('./event/EventGallery'));
const EventComments = React.lazy(() => import('./event/EventComments'));
const EventOrganizers = React.lazy(() => import('./event/EventOrganizers'));
const EventRegistration = React.lazy(() => import('./event/EventRegistration'));
const RelatedEvents = React.lazy(() => import('./event/RelatedEvents'));

// Fallback
const SectionFallback: React.FC = () => (
  <LoadingSkeleton type="card" count={1} />
);

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('info');

  // Hook pour charger les données
  const {
    event,
    programs,
    medias,
    comments,
    organizers,
    loading,
    error,
    isFavorite,
    toggleFavorite,
    addComment,
    registerToEvent,
    isRegistered,
    registrationStatus
  } = useEventDetails(id ? parseInt(id) : 0);

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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t('event.notFound', 'Événement non trouvé')}</h2>
            <Button onClick={() => navigate('/evenements')}>
              {t('event.backToList', 'Retour aux événements')}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Bouton retour */}
        <div className="container pt-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('common.back', 'Retour')}
          </Button>
        </div>

        {/* Hero Section */}
        <ErrorBoundary>
          <Suspense fallback={<SectionFallback />}>
            <EventHero
              event={event}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </Suspense>
        </ErrorBoundary>

        {/* Contenu principal */}
        <div className="container py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="info" className="gap-2">
                    <Info className="h-4 w-4" />
                    {t('event.tabs.info', 'Informations')}
                  </TabsTrigger>
                  <TabsTrigger value="program" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('event.tabs.program', 'Programme')}
                  </TabsTrigger>
                  <TabsTrigger value="gallery" className="gap-2">
                    <Image className="h-4 w-4" />
                    {t('event.tabs.gallery', 'Galerie')}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {t('event.tabs.comments', 'Avis')} ({comments?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-6">
                  <ErrorBoundary>
                    <Suspense fallback={<SectionFallback />}>
                      <EventInfo event={event} />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="program" className="mt-6">
                  <ErrorBoundary>
                    <Suspense fallback={<SectionFallback />}>
                      <EventProgram programs={programs || []} />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="gallery" className="mt-6">
                  <ErrorBoundary>
                    <Suspense fallback={<SectionFallback />}>
                      <EventGallery medias={medias || []} />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                  <ErrorBoundary>
                    <Suspense fallback={<SectionFallback />}>
                      <EventComments
                        comments={comments || []}
                        onAddComment={addComment}
                        eventId={event.id_evenement}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Inscription */}
              <ErrorBoundary>
                <Suspense fallback={<SectionFallback />}>
                  <EventRegistration
                    event={event}
                    onRegister={registerToEvent}
                    isRegistered={isRegistered}
                    registrationStatus={registrationStatus}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                  />
                </Suspense>
              </ErrorBoundary>

              {/* Organisateurs */}
              <ErrorBoundary>
                <Suspense fallback={<SectionFallback />}>
                  <EventOrganizers organizers={organizers || []} />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          {/* Événements similaires */}
          <div className="mt-12">
            <ErrorBoundary>
              <Suspense fallback={<LoadingSkeleton type="card" count={3} />}>
                <RelatedEvents eventId={event.id_evenement} />
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
