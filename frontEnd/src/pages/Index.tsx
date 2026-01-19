/**
 * Page d'accueil - Index.tsx (Refactorisé)
 * Composants séparés, lazy loading, et bouton "Contribuer" visible
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Composants UI
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/UI/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { Button } from '@/components/UI/button';
import { Skeleton } from '@/components/UI/skeleton';
import { useToast } from '@/components/UI/use-toast';

// Icônes
import { 
  MapPin, Calendar, Palette, Map, Bell, Hammer, 
  Info, ArrowRight 
} from 'lucide-react';

// Hooks de localisation
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';

// Services
import { dashboardService } from '@/services/dashboard.service';
import { notificationService } from '@/services/notification.service';
import { authService } from '@/services/auth.service';
import { metadataService } from '@/services/metadata.service';

// Types
import { Wilaya } from '@/types';
import type { OverviewStats } from '@/services/dashboard.service';
import type { Notification } from '@/services/notification.service';

// ✅ Composants séparés (refactorisés)
import HeroSection from '@/components/home/HeroSection';
import IslamicPatternDivider from '@/components/home/IslamicPatternDivider';
import PatrimoineDynamique from '@/components/home/PatrimoineDynamique';
import EvenementsDynamique from '@/components/home/EvenementsDynamique';
import OeuvresDynamique from '@/components/home/OeuvresDynamique';
import ArtisanatDynamique from '@/components/home/ArtisanatDynamique';
import EnhancedCTASection from '@/components/home/EnhancedCTASection';

// Carte patrimoine (lazy loaded)
const CartePatrimoine = React.lazy(() => import('@/components/CartePatrimoine'));

// État global pour les wilayas (à remplacer par Context dans le futur)
let wilayasCache: Wilaya[] = [];

const Index: React.FC = () => {
  console.log('=== Index component mounted ===');
  
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { formatNumber } = useLocalizedNumber();
  const { rtlClasses } = useRTL();
  const { toast } = useToast();
  
  // États
  const [activeTab, setActiveTab] = useState('patrimoine');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Direction RTL
  const direction = i18n.language === 'ar' || i18n.language === 'ar-DZ' ? 'rtl' : 'ltr';

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      console.log('=== checkAuthAndLoadData START ===');
      setLoading(true);
      
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Charger les wilayas
      const wilayasResponse = await metadataService.getWilayas();
      if (wilayasResponse.success && wilayasResponse.data) {
        wilayasCache = wilayasResponse.data;
      }

      // Charger les stats si authentifié
      if (authenticated) {
        try {
          const statsResponse = await dashboardService.getOverview();
          if (statsResponse.success && statsResponse.data) {
            setStats(statsResponse.data);
          }
        } catch (statsError) {
          console.log('Stats error:', statsError);
        }
      }

      // Charger les notifications si connecté
      if (authenticated) {
        try {
          const notifSummary = await notificationService.getSummary();
          if (notifSummary && notifSummary.dernieres && Array.isArray(notifSummary.dernieres)) {
            setNotifications((notifSummary.dernieres as any) || []);
          }
        } catch (notifError) {
          console.log('Notifications error:', notifError);
        }
      }
    } catch (error) {
      console.error('Erreur dans checkAuthAndLoadData:', error);
      toast({
        title: t('errors.generic.title'),
        description: t('errors.partialDataLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`min-h-screen bg-background`} dir={direction}>
      <Header />
      
      <main>
        {/* Notifications pour les utilisateurs connectés */}
        {isAuthenticated && notifications.length > 0 && (
          <div className="container mt-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Bell className="h-4 w-4" />
              <AlertDescription>
                {t('notifications.youHave', { count: notifications.length })}
                <Button 
                  variant="link" 
                  size="sm" 
                  className={`${rtlClasses.marginStart(2)} p-0 h-auto`}
                  onClick={() => navigate('/notifications')}
                >
                  {t('common.viewAll')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* ✅ Hero Section (composant séparé avec bouton visible) */}
        <HeroSection />

        {/* Séparateur décoratif */}
        <IslamicPatternDivider />

        {/* Section principale avec onglets */}
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight font-serif lg:text-4xl mb-4">
                {t('home.explore.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('home.explore.subtitle')}
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-wrap justify-center gap-2 w-full max-w-3xl mx-auto h-auto p-2 mb-12">
                <TabsTrigger value="patrimoine" className="group">
                  <MapPin className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.heritage')}
                </TabsTrigger>
                <TabsTrigger value="carte" className="group">
                  <Map className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.map')}
                </TabsTrigger>
                <TabsTrigger value="evenements" className="group">
                  <Calendar className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.events')}
                </TabsTrigger>
                <TabsTrigger value="oeuvres" className="group">
                  <Palette className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.works')}
                </TabsTrigger>
                <TabsTrigger value="artisanat" className="group">
                  <Hammer className={`h-4 w-4 ${rtlClasses.marginEnd(2)} group-data-[state=active]:scale-110 transition-transform`} />
                  {t('home.explore.tabs.crafts')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="patrimoine" className="space-y-8">
                <PatrimoineDynamique wilayasCache={wilayasCache} />
              </TabsContent>
              
              <TabsContent value="carte" className="space-y-8">
                <div className="text-center space-y-4 mb-8">
                  <h3 className="text-2xl font-bold tracking-tight font-serif">
                    {t('sections.heritage.interactiveMap')}
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    {t('sections.heritage.mapDescription')}
                  </p>
                </div>
                <React.Suspense fallback={<Skeleton className="h-[500px] w-full rounded-lg" />}>
                  <CartePatrimoine />
                </React.Suspense>
              </TabsContent>
              
              <TabsContent value="evenements" className="space-y-8">
                <EvenementsDynamique />
              </TabsContent>
              
              <TabsContent value="oeuvres" className="space-y-8">
                <OeuvresDynamique />
              </TabsContent>

              <TabsContent value="artisanat" className="space-y-8">
                <ArtisanatDynamique />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Section CTA pour les professionnels */}
        <EnhancedCTASection />

        {/* Section Mission et Ressources */}
        <section className="py-16 relative overflow-hidden">
          {/* Background décoratif */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full">
              <pattern id="dots-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="currentColor" className="text-primary" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#dots-pattern)" />
            </svg>
          </div>

          <div className="container relative">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Mission */}
              <Card className="bg-gradient-to-br from-primary/5 to-transparent hover-lift overflow-hidden group">
                <div className={`absolute top-0 ${rtlClasses.end(0)} w-32 h-32 opacity-10`}>
                  <img 
                    src="https://images.unsplash.com/photo-1569163139394-de4798a9f0d5?w=400"
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <CardContent className="p-8 relative">
                  <div className={`flex items-start gap-4 ${rtlClasses.flexRow}`}>
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Info className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        {t('home.mission.title')}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {t('home.mission.description')}
                      </p>
                      <Button variant="link" className="p-0 group" onClick={() => navigate('/a-propos')}>
                        {t('home.mission.learnMore')}
                        <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ressources */}
              <Card className="bg-gradient-to-br from-accent/5 to-transparent hover-lift overflow-hidden group">
                <div className={`absolute top-0 ${rtlClasses.end(0)} w-32 h-32 opacity-10`}>
                  <img 
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <CardContent className="p-8 relative">
                  <div className={`flex items-start gap-4 ${rtlClasses.flexRow}`}>
                    <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                      <Hammer className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-3">
                        {t('home.resources.title')}
                      </h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className={`flex items-center ${rtlClasses.flexRow}`}>
                          <span className={rtlClasses.marginEnd(2)}>•</span>
                          {t('home.resources.guide')}
                        </li>
                        <li className={`flex items-center ${rtlClasses.flexRow}`}>
                          <span className={rtlClasses.marginEnd(2)}>•</span>
                          {t('home.resources.calendar')}
                        </li>
                        <li className={`flex items-center ${rtlClasses.flexRow}`}>
                          <span className={rtlClasses.marginEnd(2)}>•</span>
                          {t('home.resources.directory')}
                        </li>
                      </ul>
                      <Button variant="link" className="p-0 mt-4 group" onClick={() => navigate('/a-propos#ressources')}>
                        {t('home.resources.access')}
                        <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} group-hover:translate-x-1 transition-transform`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
