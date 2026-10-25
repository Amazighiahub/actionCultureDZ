/**
 * Page d'accueil — mise en page magazine :
 * grande photo, « À la une » (prochains événements), « À lire » (derniers articles),
 * patrimoine, saveurs d'Algérie, artisanat, espace professionnels, mission et contribution.
 * Une section sans contenu à montrer (aucun événement à venir, aucun article…) n'apparaît pas.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

// Composants UI
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Icônes
import { Bell, Info, ArrowRight, BookOpen, Map } from 'lucide-react';

// Hooks de localisation
import { useRTL } from '@/hooks/useRTL';

// Services
import { notificationService } from '@/services/notification.service';
import { authService } from '@/services/auth.service';
import { metadataService } from '@/services/metadata.service';
import SEOHead, { buildWebsiteJsonLd } from '@/components/SEOHead';


// ✅ Composants séparés (refactorisés)
import HeroSection from '@/components/home/HeroSection';
import ALaUne from '@/components/home/ALaUne';
import ALire from '@/components/home/ALire';
import EnTeteSection from '@/components/home/EnTeteSection';
import PatrimoineDynamique from '@/components/home/PatrimoineDynamique';
import SaveursAlgerie from '@/components/home/SaveursAlgerie';
import ArtisanatALaUne from '@/components/home/ArtisanatALaUne';
import EnhancedCTASection from '@/components/home/EnhancedCTASection';
import { lienSommaireGuides } from '@/utils/lienGuide';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { rtlClasses } = useRTL();
  // Direction RTL
  const direction = i18n.language === 'ar' || i18n.language === 'ar-DZ' ? 'rtl' : 'ltr';

  // Auth check (synchrone)
  const isAuthenticated = authService.isAuthenticated();

  // Wilayas — données publiques, cache long
  const { data: wilayasCache = null } = useQuery({
    queryKey: ['metadata', 'wilayas'],
    queryFn: async () => {
      const res = await metadataService.getWilayas();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 30 * 60 * 1000,
  });

  // Notifications — seulement si authentifié
  const { data: notifications = [] } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ['notifications', 'summary'],
    queryFn: async () => {
      const summary = await notificationService.getSummary();
      return summary?.dernieres && Array.isArray(summary.dernieres) ? summary.dernieres : [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
  
  return (
    <div className={`min-h-screen bg-background`} dir={direction}>
      {/* Sans titre : titre complet par défaut « Tala DZ - La source de la culture algérienne » */}
      <SEOHead
        description="Découvrez le riche patrimoine culturel algérien : événements, sites historiques, œuvres littéraires et artistiques, artisanat traditionnel."
        keywords={[
          'culture algérienne', 'patrimoine Algérie', 'événements culturels', 'artisanat algérien',
          'littérature algérienne', 'tourisme culturel', 'histoire Algérie', 'traditions algériennes',
          'musées Algérie', 'festivals Algérie', 'monuments historiques'
        ]}
        jsonLd={buildWebsiteJsonLd()}
      />
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

        {/* À la une : les prochains événements */}
        <ALaUne />

        {/* À lire : les derniers articles */}
        <ALire />

        {/* Patrimoine */}
        <section className="py-14 lg:py-20" aria-labelledby="titre-patrimoine">
          <div className="container">
            <EnTeteSection
              id="titre-patrimoine"
              surtitre={t('home.patrimoine.surtitre', 'Patrimoine')}
              titre={t('home.patrimoine.titre', 'Lieux à découvrir')}
              accroche={t('home.patrimoine.accroche', 'Villages, médinas, sites antiques et musées, avec leurs points à visiter et leurs histoires.')}
              lien={{ to: '/patrimoine', libelle: t('home.patrimoine.tous', 'Tous les lieux') }}
            />
            <PatrimoineDynamique wilayasCache={wilayasCache || []} />
            <p className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link to="/patrimoine"><Map className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} aria-hidden="true" />{t('home.patrimoine.carte', 'Explorer sur la carte')}</Link>
              </Button>
            </p>
          </div>
        </section>

        {/* Saveurs d'Algérie */}
        <SaveursAlgerie />

        {/* Artisanat */}
        <ArtisanatALaUne />

        {/* Espace professionnels */}
        <EnhancedCTASection />

        {/* Mission et contribution */}
        <section className="py-14 lg:py-20" aria-label={t('home.contribuer.section', 'Notre mission et comment contribuer')}>
          <div className="container grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8">
                <div className={`flex items-start gap-4 ${rtlClasses.flexRow}`}>
                  <div className="p-3 bg-primary/10 rounded-lg"><Info className="h-6 w-6 text-primary" aria-hidden="true" /></div>
                  <div className="flex-1">
                    <h2 className="font-serif text-2xl font-bold mb-3">{t('home.mission.title')}</h2>
                    <p className="text-muted-foreground mb-4">{t('home.mission.description')}</p>
                    <Button variant="link" className="p-0 group" onClick={() => navigate('/a-propos')}>
                      {t('home.mission.learnMore')}
                      <ArrowRight className={`h-4 w-4 ${rtlClasses.marginStart(2)} rtl:-scale-x-100`} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden bg-gradient-to-br from-accent/5 to-transparent">
              <CardContent className="p-8">
                <div className={`flex items-start gap-4 ${rtlClasses.flexRow}`}>
                  <div className="p-3 bg-accent/10 rounded-lg"><BookOpen className="h-6 w-6 text-accent" aria-hidden="true" /></div>
                  <div className="flex-1">
                    <h2 className="font-serif text-2xl font-bold mb-3">{t('home.contribuer.titre', 'Contribuer')}</h2>
                    <p className="text-muted-foreground mb-4">{t('home.contribuer.texte', 'Associations, artisans, passionnés : ajoutez un lieu, écrivez un article, publiez vos événements.')}</p>
                    <ul className="space-y-2">
                      {/* Guides : pages statiques (lien classique) */}
                      <li><a className="font-medium text-primary hover:underline underline-offset-4" href={lienSommaireGuides(i18n.language)}>{t('home.contribuer.guide', 'Guide du contributeur')}</a></li>
                      <li><a className="font-medium text-primary hover:underline underline-offset-4" href={i18n.language.startsWith('ar') ? '/guide/ar/article' : '/guide/article'}>{t('home.contribuer.article', 'Écrire un article')}</a></li>
                      <li><Link className="font-medium text-primary hover:underline underline-offset-4" to="/evenements">{t('home.contribuer.agenda', 'L’agenda culturel')}</Link></li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
