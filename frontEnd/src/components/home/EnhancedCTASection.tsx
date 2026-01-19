/**
 * EnhancedCTASection - Section CTA pour les professionnels
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Star, Palette, Calendar } from 'lucide-react';
import { useRTL } from '@/hooks/useRTL';
import { authService } from '@/services/auth.service';

const EnhancedCTASection: React.FC = () => {
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Contenu */}
      <div className="container relative z-10">
        <Card className="max-w-5xl mx-auto bg-white/95 dark:bg-green-900/95 backdrop-blur-sm shadow-2xl border-0">
          <CardContent className="p-8 md:p-12">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('home.professionals.badge', 'Espace Professionnels')}
                </span>
              </div>

              {/* Titre */}
              <h2 className="text-3xl md:text-4xl font-bold font-serif">
                {t('home.professionals.title', 'Rejoignez notre communauté')}
              </h2>

              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('home.professionals.subtitle')}
              </p>

              {/* Boutons CTA */}
              <div className={`flex flex-col sm:flex-row justify-center gap-4`}>
                <Button 
                  size="lg" 
                  className="group shadow-lg hover:shadow-xl transition-all"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/ajouter-oeuvre');
                    } else {
                      navigate('/auth');
                    }
                  }}
                >
                  <Palette className={`h-5 w-5 ${rtlClasses.marginEnd(2)} group-hover:rotate-12 transition-transform`} />
                  {t('home.professionals.createWork')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="shadow-lg hover:shadow-xl transition-all bg-white hover:bg-gray-50"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/ajouter-evenement');
                    } else {
                      navigate('/auth');
                    }
                  }}
                >
                  <Calendar className={`h-5 w-5 ${rtlClasses.marginEnd(2)}`} />
                  {t('home.professionals.organizeEvent')}
                </Button>
              </div>

              {/* Avantages */}
              <div className={`flex flex-wrap justify-center gap-6 text-sm text-muted-foreground pt-4`}>
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {t('home.professionals.benefits.visibility', 'Visibilité accrue')}
                </div>
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {t('home.professionals.benefits.tools', 'Outils de gestion')}
                </div>
                <div className={`flex items-center gap-2 ${rtlClasses.flexRow}`}>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  {t('home.professionals.benefits.community', 'Communauté active')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default EnhancedCTASection;
