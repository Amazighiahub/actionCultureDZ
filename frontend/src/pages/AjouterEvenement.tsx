import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Upload, Save, ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/UI/use-toast';

// Import des hooks de localisation
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
import { useLocalizedNumber } from '@/hooks/useLocalizedNumber';
import { useRTL } from '@/hooks/useRTL';

// Import des services
import { metadataService } from '@/services/metadata.service';
import { authService } from '@/services/auth.service';

// Import des types
import { Wilaya } from '@/types';

const AjouterEvenement = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rtlClasses } = useRTL();
  const { formatPrice } = useLocalizedNumber();
  const { toast } = useToast();
  
  const [gratuit, setGratuit] = useState(false);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    // Vérifier l'authentification
    const authenticated = authService.isAuthenticated();
    setIsAuthenticated(authenticated);
    
    if (!authenticated) {
      toast({
        title: t('auth.required'),
        description: t('auth.mustBeConnected'),
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Charger les wilayas
    try {
      const wilayasResponse = await metadataService.getWilayas();
      if (wilayasResponse.success && wilayasResponse.data) {
        setWilayas(wilayasResponse.data);
      }
    } catch (error) {
      console.error('Erreur chargement wilayas:', error);
    }
  };

  const typesEvenements = [
    { value: 'exposition', label: t('events.types.exhibition') },
    { value: 'concert', label: t('events.types.concert') },
    { value: 'projection', label: t('events.types.screening') },
    { value: 'conference', label: t('events.types.conference') },
    { value: 'atelier', label: t('events.types.workshop') },
    { value: 'festival', label: t('events.types.festival') },
    { value: 'spectacle', label: t('events.types.show') },
    { value: 'rencontre_litteraire', label: t('events.types.literaryMeeting') }
  ];

  const handleGratuitChange = (checked: boolean | "indeterminate") => {
    setGratuit(checked === true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t('common.featureInDevelopment'),
      description: t('events.create.willBeAvailableSoon'),
    });
  };

  return (
    <div className={`min-h-screen bg-background`} dir={rtlClasses.direction}>
      <Header />
      
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* En-tête */}
          <div className={`flex items-center space-x-4 mb-8 ${rtlClasses.flexRow}`}>
            <Link to="/dashboard-pro">
              <Button variant="outline" size="sm">
                <ArrowLeft className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('common.backToDashboard')}
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
                {t('events.create.title')}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                {t('events.create.subtitle')}
              </p>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.generalInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nom">{t('events.create.eventName')} *</Label>
                  <Input 
                    id="nom" 
                    placeholder={t('events.create.eventNamePlaceholder')} 
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{t('common.description')} *</Label>
                  <Textarea 
                    id="description" 
                    placeholder={t('events.create.descriptionPlaceholder')}
                    className="min-h-[120px]"
                    required
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('events.create.eventType')} *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {typesEvenements.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ville">{t('common.city')} *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectCity')} />
                      </SelectTrigger>
                      <SelectContent>
                        {wilayas.map((wilaya) => (
                          <SelectItem key={wilaya.id_wilaya} value={wilaya.id_wilaya.toString()}>
                            {wilaya.wilaya_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lieu">{t('events.create.exactLocation')} *</Label>
                  <Input 
                    id="lieu" 
                    placeholder={t('events.create.locationPlaceholder')} 
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.datesAndTimes')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date-debut">{t('events.create.startDate')} *</Label>
                    <Input id="date-debut" type="date" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date-fin">{t('events.create.endDate')}</Label>
                    <Input id="date-fin" type="date" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heure-debut">{t('events.create.startTime')}</Label>
                    <Input id="heure-debut" type="time" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="heure-fin">{t('events.create.endTime')}</Label>
                    <Input id="heure-fin" type="time" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.participationAndPricing')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="max-participants">{t('events.create.maxParticipants')}</Label>
                  <Input 
                    id="max-participants" 
                    type="number" 
                    placeholder={t('events.create.maxParticipantsPlaceholder')} 
                  />
                </div>
                
                <div className={`flex items-center space-x-2 ${rtlClasses.flexRow}`}>
                  <Checkbox 
                    id="gratuit" 
                    checked={gratuit}
                    onCheckedChange={handleGratuitChange}
                  />
                  <Label htmlFor="gratuit">{t('events.create.freeEvent')}</Label>
                </div>
                
                {!gratuit && (
                  <div className={`space-y-2 ${rtlClasses.marginStart(6)}`}>
                    <Label htmlFor="tarif">{t('events.create.price')}</Label>
                    <Input 
                      id="tarif" 
                      type="number" 
                      placeholder={t('events.create.pricePlaceholder')} 
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('events.create.imageAndMedia')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="affiche">{t('events.create.eventImage')} *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      {t('common.dragDropImage')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('common.imageFormats')}
                    </p>
                    <Button variant="outline" className="mt-4">
                      {t('common.chooseFile')}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="medias-post">{t('events.create.postEventMedia')}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {t('events.create.postEventMediaDesc')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('events.create.addAfterEvent')}
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      {t('common.chooseFiles')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className={`flex justify-end space-x-4 ${rtlClasses.flexRow}`}>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  toast({
                    title: t('common.featureInDevelopment'),
                    description: t('events.create.draftSaved'),
                  });
                }}
              >
                <Save className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('events.create.saveAsDraft')}
              </Button>
              <Button type="submit" className="btn-hover" disabled={loading}>
                <Calendar className={`h-4 w-4 ${rtlClasses.marginEnd(2)}`} />
                {t('events.create.publishEvent')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AjouterEvenement;