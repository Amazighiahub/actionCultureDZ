/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/UI/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/UI/select';
import { Checkbox } from '@/components/UI/checkbox';
import { Alert, AlertDescription } from '@/components/UI/alert';
import { User, Palette, Mail, Lock, UserPlus, LogIn, Upload, Calendar, Phone, MapPin, AlertCircle, X, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/UI/use-toast';
import { mediaService } from '@/services/media.service';
import { SECTEUR_TYPE_USER_MAP, SECTEUR_OPTIONS, AUTH_ERROR_MESSAGES } from '@/types/models/auth.types';
import { useWilayas } from '@/hooks/useGeographie';
import { getAssetUrl } from '@/helpers/assetUrl';
import { authLogger } from '@/utils/logger';

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { login, registerVisitor, registerProfessional, loginLoading, registerLoading, isAuthenticated } = useAuth();
  
  // État pour les wilayas
  const { wilayas, loading: wilayasLoading, error: wilayasError } = useWilayas();
  
  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // État pour le formulaire de connexion
  const [loginForm, setLoginForm] = useState({
    email: '',
    mot_de_passe: '',
    remember: false
  });

  // État pour le formulaire d'inscription
  const [userType, setUserType] = useState<'visiteur' | 'professionnel'>('visiteur');
  const [registerForm, setRegisterForm] = useState({
    nom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    date_naissance: '',
    email: '',
    mot_de_passe: '',
    confirmation_mot_de_passe: '',
    wilaya_residence: 0,
    telephone: '',
    accepte_conditions: false,
    accepte_newsletter: false,
    // Champs professionnels
    photo_url: '',
    biographie: '',
    secteur: '',
    portfolio: '',
    id_type_user: 0
  });

  // État pour l'upload de photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // État pour les erreurs de validation
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  // Gestion de l'upload de photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation de la taille
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('auth.errors.fileTooLarge.title'),
          description: t('auth.errors.fileTooLarge.description'),
          variant: "destructive",
        });
        return;
      }
      
      // Validation du type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t('auth.errors.invalidFileType.title'),
          description: t('auth.errors.invalidFileType.description'),
          variant: "destructive",
        });
        return;
      }
      
      setPhotoFile(file);
      
      // Créer un aperçu local
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Réinitialiser l'URL uploadée car on a un nouveau fichier
      setUploadedPhotoUrl(null);
      
      authLogger.debug('Photo sélectionnée:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type
      });
    }
  };

  // Supprimer la photo
  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadedPhotoUrl(null);
    
    // Réinitialiser l'input file
    const fileInput = document.getElementById('photo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Validation du formulaire de connexion
  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!loginForm.email) {
      errors.email = t('auth.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      errors.email = t('auth.errors.emailInvalid');
    }
    
    if (!loginForm.mot_de_passe) {
      errors.password = t('auth.errors.passwordRequired');
    }
    
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumission du formulaire de connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }

    try {
      const success = await login({
        email: loginForm.email,
        password: loginForm.mot_de_passe
      });

      if (!success) {
        toast({
          title: t('auth.errors.loginError'),
          description: t('auth.errors.invalidCredentials'),
          variant: "destructive",
        });
      } else {
        // Succès - afficher un toast de bienvenue
        toast({
          title: t('auth.success.loginTitle'),
          description: t('auth.success.loginDescription'),
        });
        
        // Forcer le rafraîchissement complet de la page
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error: any) {
      console.error('Erreur login:', error);
      toast({
        title: t('errors.generic.title'),
        description: error.message || t('errors.generic.message'),
        variant: "destructive",
      });
    }
  };

  // Validation du formulaire d'inscription
  const validateRegisterForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validation des champs communs
    if (!registerForm.nom || registerForm.nom.length < 2) {
      errors.nom = t('auth.errors.nameMinLength');
    }
    
    if (!registerForm.prenom || registerForm.prenom.length < 2) {
      errors.prenom = t('auth.errors.firstNameMinLength');
    }
    
    if (!registerForm.email) {
      errors.email = t('auth.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
      errors.email = t('auth.errors.emailInvalid');
    }
    
    if (!registerForm.mot_de_passe || registerForm.mot_de_passe.length < 8) {
      errors.mot_de_passe = t('auth.errors.passwordMinLength');
    }
    
    if (registerForm.mot_de_passe !== registerForm.confirmation_mot_de_passe) {
      errors.confirmation_mot_de_passe = t('auth.errors.passwordMismatch');
    }
    
    if (!registerForm.date_naissance) {
      errors.date_naissance = t('auth.errors.birthDateRequired');
    } else {
      const birthDate = new Date(registerForm.date_naissance);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) {
        errors.date_naissance = t('auth.errors.minAge');
      }
    }
    
    if (!registerForm.wilaya_residence || registerForm.wilaya_residence === 0) {
      errors.wilaya_residence = t('auth.errors.wilayaRequired');
    }
    
    if (!registerForm.accepte_conditions) {
      errors.accepte_conditions = t('auth.errors.acceptTermsRequired');
    }
    
    // Validation spécifique pour les professionnels
    if (userType === 'professionnel') {
      if (!registerForm.secteur) {
        errors.secteur = t('auth.errors.sectorRequired');
      }
      
      if (!registerForm.biographie || registerForm.biographie.length < 50) {
        errors.biographie = t('auth.errors.biographyMinLength');
      }
    }
    
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumission du formulaire d'inscription
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegisterForm()) {
      toast({
        title: t('auth.errors.validationError'),
        description: t('auth.errors.correctErrors'),
        variant: "destructive",
      });
      return;
    }

    try {
      let photoUrl: string | null = null;

      // ÉTAPE 1 : UPLOAD DE LA PHOTO SI PRÉSENTE (AVANT L'INSCRIPTION)
      if (userType === 'professionnel' && photoFile) {
        authLogger.debug('ÉTAPE 1 - Upload de la photo AVANT inscription');
        setUploadingPhoto(true);
        
        try {
          // Upload public de la photo
          const apiBaseUrl = window.location.origin;
          const uploadResponse = await fetch(`${apiBaseUrl}/api/upload/image/public`, {
            method: 'POST',
            body: (() => {
              const formData = new FormData();
              formData.append('image', photoFile);
              return formData;
            })()
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || t('auth.errors.uploadError'));
          }

          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success && uploadResult.data?.url) {
            photoUrl = uploadResult.data.url;
            authLogger.debug('Photo uploadée avec succès:', photoUrl);
          } else {
            throw new Error(t('auth.errors.uploadUrlNotReceived'));
          }
        } catch (uploadError) {
          console.error('❌ Erreur upload photo:', uploadError);
          toast({
            title: t('auth.errors.uploadTitle'),
            description: t('auth.errors.uploadContinueWithoutPhoto'),
            variant: "destructive"
          });
        } finally {
          setUploadingPhoto(false);
        }
      }

      // ÉTAPE 2 : INSCRIPTION AVEC LA PHOTO_URL
      // Préparer les données de base
      const baseData = {
        nom: registerForm.nom.trim(),
        prenom: registerForm.prenom.trim(),
        sexe: registerForm.sexe as 'M' | 'F',
        date_naissance: registerForm.date_naissance,
        email: registerForm.email.trim().toLowerCase(),
        mot_de_passe: registerForm.mot_de_passe,
        confirmation_mot_de_passe: registerForm.confirmation_mot_de_passe,
        wilaya_residence: Number(registerForm.wilaya_residence),
        accepte_conditions: registerForm.accepte_conditions,
        accepte_newsletter: registerForm.accepte_newsletter || false
      };
      
      authLogger.debug('ÉTAPE 2 - Inscription avec les données complètes');
      authLogger.debug('Données d\'inscription préparées:', {
        type: userType,
        email: baseData.email,
        photo_url: photoUrl,
        hasPhoto: !!photoUrl
      });

      let success = false;
      
      if (userType === 'visiteur') {
        authLogger.debug('Inscription en tant que visiteur...');
        const result = await registerVisitor(baseData);
        success = result.success;
      } else {
        const professionalData = {
          ...baseData,
          photo_url: photoUrl || '', // Inclure la photo_url dans l'inscription
          biographie: registerForm.biographie.trim(),
          id_type_user: SECTEUR_TYPE_USER_MAP[registerForm.secteur] || 2
        };
        
        authLogger.debug('Inscription en tant que professionnel avec photo_url:', {
          id_type_user: professionalData.id_type_user,
          photo_url: professionalData.photo_url
        });
        
        authLogger.debug('DONNÉES COMPLÈTES ENVOYÉES:', professionalData);
        
        const result = await registerProfessional(professionalData);
        success = result.success;
      }

      if (success) {
        authLogger.debug('Inscription réussie !');
        
        // Message de succès
        toast({
          title: t('auth.success.registrationTitle'),
          description: userType === 'professionnel' 
            ? t('auth.success.professionalRegistration') 
            : t('auth.success.visitorRegistration'),
        });
        
        // Réinitialiser le formulaire
        setPhotoFile(null);
        setPhotoPreview(null);
        setUploadedPhotoUrl(null);
        setRegisterForm({
          nom: '',
          prenom: '',
          sexe: 'M',
          date_naissance: '',
          email: '',
          mot_de_passe: '',
          confirmation_mot_de_passe: '',
          wilaya_residence: 0,
          telephone: '',
          accepte_conditions: false,
          accepte_newsletter: false,
          photo_url: '',
          biographie: '',
          secteur: '',
          portfolio: '',
          id_type_user: 0
        });
        
        // La redirection sera gérée automatiquement par le hook useAuth
        // car le token est stocké et l'état isAuthenticated va changer
      } else {
        console.error('❌ Échec de l\'inscription');
        toast({
          title: t('auth.errors.registrationError'), 
          description: t('auth.errors.registrationErrorDescription'),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      toast({
        title: t('errors.generic.title'),
        description: error.message || t('errors.generic.message'),
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Fonction pour traduire les options de secteur
  const getTranslatedSectorOptions = () => {
    return SECTEUR_OPTIONS.map(option => ({
      ...option,
      label: t(`auth.sectors.${option.value}`, option.label)
    }));
  };
 
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
              {t('auth.title')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('auth.subtitle')}
            </p>
          </div>

          <Tabs defaultValue="connexion" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connexion" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>{t('auth.login.tabTitle')}</span>
              </TabsTrigger>
              <TabsTrigger value="inscription" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>{t('auth.register.tabTitle')}</span>
              </TabsTrigger>
            </TabsList>

            {/* Onglet Connexion */}
            <TabsContent value="connexion">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5" />
                    <span>{t('auth.login.title')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('auth.login.email')}</Label>
                      <Input 
                        id="login-email" 
                        type="email" 
                        placeholder={t('auth.login.emailPlaceholder')}
                        value={loginForm.email}
                        onChange={(e) => {
                          setLoginForm({...loginForm, email: e.target.value});
                          setLoginErrors({...loginErrors, email: ''});
                        }}
                        className={loginErrors.email ? 'border-destructive' : ''}
                        required
                      />
                      {loginErrors.email && (
                        <p className="text-sm text-destructive">{loginErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('auth.login.password')}</Label>
                      <Input 
                        id="login-password" 
                        type="password" 
                        placeholder="••••••••"
                        value={loginForm.mot_de_passe}
                        onChange={(e) => {
                          setLoginForm({...loginForm, mot_de_passe: e.target.value});
                          setLoginErrors({...loginErrors, password: ''});
                        }}
                        className={loginErrors.password ? 'border-destructive' : ''}
                        required
                      />
                      {loginErrors.password && (
                        <p className="text-sm text-destructive">{loginErrors.password}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <label className="flex items-center gap-2">
                        <Checkbox 
                          checked={loginForm.remember}
                          onCheckedChange={(checked) => setLoginForm({...loginForm, remember: !!checked})}
                        />
                        <span>{t('auth.login.rememberMe')}</span>
                      </label>
                      <Link to="/forgot-password">
                        <Button variant="link" className="p-0 h-auto">
                          {t('auth.login.forgotPassword')}
                        </Button>
                      </Link>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('auth.login.loggingIn')}
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          {t('auth.login.submit')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Inscription */}
            <TabsContent value="inscription">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    <span>{t('auth.register.title')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-6">
                    {/* Choix du profil */}
                    <div className="space-y-3">
                      <Label>{t('auth.register.profileType')}</Label>
                      <RadioGroup 
                        value={userType} 
                        onValueChange={(value) => setUserType(value as 'visiteur' | 'professionnel')}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="visiteur" id="visiteur" />
                          <Label htmlFor="visiteur" className="flex items-center gap-2 cursor-pointer">
                            <User className="h-4 w-4" />
                            <span>{t('auth.register.individual')}</span>
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="professionnel" id="professionnel" />
                          <Label htmlFor="professionnel" className="flex items-center gap-2 cursor-pointer">
                            <Palette className="h-4 w-4" />
                            <span>{t('auth.register.professional')}</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Formulaire commun */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prenom">{t('auth.register.firstName')} *</Label>
                        <Input 
                          id="prenom" 
                          placeholder={t('auth.register.firstNamePlaceholder')}
                          value={registerForm.prenom}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, prenom: e.target.value});
                            setRegisterErrors({...registerErrors, prenom: ''});
                          }}
                          className={registerErrors.prenom ? 'border-destructive' : ''}
                          required
                        />
                        {registerErrors.prenom && (
                          <p className="text-sm text-destructive">{registerErrors.prenom}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom">{t('auth.register.lastName')} *</Label>
                        <Input 
                          id="nom" 
                          placeholder={t('auth.register.lastNamePlaceholder')}
                          value={registerForm.nom}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, nom: e.target.value});
                            setRegisterErrors({...registerErrors, nom: ''});
                          }}
                          className={registerErrors.nom ? 'border-destructive' : ''}
                          required
                        />
                        {registerErrors.nom && (
                          <p className="text-sm text-destructive">{registerErrors.nom}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sexe">{t('auth.register.gender')} *</Label>
                        <Select 
                          value={registerForm.sexe}
                          onValueChange={(value) => setRegisterForm({...registerForm, sexe: value as 'M' | 'F'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">{t('auth.register.male')}</SelectItem>
                            <SelectItem value="F">{t('auth.register.female')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date-naissance">{t('auth.register.birthDate')} *</Label>
                        <Input 
                          id="date-naissance" 
                          type="date"
                          value={registerForm.date_naissance}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, date_naissance: e.target.value});
                            setRegisterErrors({...registerErrors, date_naissance: ''});
                          }}
                          className={registerErrors.date_naissance ? 'border-destructive' : ''}
                          required
                        />
                        {registerErrors.date_naissance && (
                          <p className="text-sm text-destructive">{registerErrors.date_naissance}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.register.email')} *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder={t('auth.register.emailPlaceholder')}
                        value={registerForm.email}
                        onChange={(e) => {
                          setRegisterForm({...registerForm, email: e.target.value});
                          setRegisterErrors({...registerErrors, email: ''});
                        }}
                        className={registerErrors.email ? 'border-destructive' : ''}
                        required
                      />
                      {registerErrors.email && (
                        <p className="text-sm text-destructive">{registerErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">{t('auth.register.password')} *</Label>
                        <Input 
                          id="password" 
                          type="password" 
                          placeholder="••••••••"
                          value={registerForm.mot_de_passe}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, mot_de_passe: e.target.value});
                            setRegisterErrors({...registerErrors, mot_de_passe: ''});
                          }}
                          className={registerErrors.mot_de_passe ? 'border-destructive' : ''}
                          required
                          minLength={8}
                        />
                        {registerErrors.mot_de_passe && (
                          <p className="text-sm text-destructive">{registerErrors.mot_de_passe}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-confirm">{t('auth.register.confirmPassword')} *</Label>
                        <Input 
                          id="password-confirm" 
                          type="password" 
                          placeholder="••••••••"
                          value={registerForm.confirmation_mot_de_passe}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, confirmation_mot_de_passe: e.target.value});
                            setRegisterErrors({...registerErrors, confirmation_mot_de_passe: ''});
                          }}
                          className={registerErrors.confirmation_mot_de_passe ? 'border-destructive' : ''}
                          required
                          minLength={8}
                        />
                        {registerErrors.confirmation_mot_de_passe && (
                          <p className="text-sm text-destructive">{registerErrors.confirmation_mot_de_passe}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wilaya">{t('auth.register.wilaya')} *</Label>
                        <Select 
                          value={registerForm.wilaya_residence.toString()}
                          onValueChange={(value) => {
                            setRegisterForm({ ...registerForm, wilaya_residence: parseInt(value) });
                            setRegisterErrors({...registerErrors, wilaya_residence: ''});
                          }}
                          disabled={wilayasLoading}
                        >
                          <SelectTrigger className={registerErrors.wilaya_residence ? 'border-destructive' : ''}>
                            <SelectValue placeholder={wilayasLoading ? t('common.loading') : t('auth.register.selectWilaya')} />
                          </SelectTrigger>
                          <SelectContent>
                            {wilayas.map((wilaya) => (
                              <SelectItem key={wilaya.id_wilaya} value={wilaya.id_wilaya.toString()}>
                                {String(wilaya.codeW).padStart(2, '0')} - {wilaya.wilaya_name_ascii}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {registerErrors.wilaya_residence && (
                          <p className="text-sm text-destructive">{registerErrors.wilaya_residence}</p>
                        )}
                        {wilayasError && (
                          <p className="text-sm text-destructive">{t('auth.errors.wilayasLoadError')}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">{t('auth.register.phone')}</Label>
                        <Input 
                          id="telephone" 
                          type="tel" 
                          placeholder="+213 XXX XXX XXX"
                          value={registerForm.telephone}
                          onChange={(e) => setRegisterForm({...registerForm, telephone: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Champs spécifiques aux professionnels */}
                    {userType === 'professionnel' && (
                      <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                        <h3 className="font-semibold text-secondary flex items-center">
                          <Palette className="h-5 w-5 mr-2" />
                          {t('auth.register.professionalInfo')}
                        </h3>
                        
                        <div className="space-y-2">
                          <Label htmlFor="secteur">{t('auth.register.sector')} *</Label>
                          <Select 
                            value={registerForm.secteur}
                            onValueChange={(value) => {
                              setRegisterForm({...registerForm, secteur: value});
                              setRegisterErrors({...registerErrors, secteur: ''});
                            }}
                            required={userType === 'professionnel'}
                          >
                            <SelectTrigger className={registerErrors.secteur ? 'border-destructive' : ''}>
                              <SelectValue placeholder={t('auth.register.selectSector')} />
                            </SelectTrigger>
                            <SelectContent>
                              {getTranslatedSectorOptions().map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {registerErrors.secteur && (
                            <p className="text-sm text-destructive">{registerErrors.secteur}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="photo">{t('auth.register.profilePhoto')}</Label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {photoPreview && (
                              <div className="relative w-20 h-20">
                                <img 
                                  src={photoPreview} 
                                  alt={t('auth.register.photoPreview')} 
                                  className="w-full h-full object-cover rounded-lg border-2 border-border"
                                  onError={(e) => {
                                    console.error('Erreur chargement aperçu photo');
                                    e.currentTarget.src = '/images/default-avatar.png';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={removePhoto}
                                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-sm"
                                  aria-label={t('auth.register.removePhoto')}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <div className="flex-1">
                              <Input 
                                id="photo" 
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handlePhotoChange}
                                disabled={uploadingPhoto}
                                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('auth.register.photoFormats')}
                              </p>
                              {uploadingPhoto && (
                                <p className="text-xs text-blue-600 mt-1 flex items-center">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  {t('auth.register.uploadingPhoto')}
                                </p>
                              )}
                              {uploadedPhotoUrl && !uploadingPhoto && (
                                <p className="text-xs text-green-600 mt-1 flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  {t('auth.register.photoUploaded')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="portfolio">{t('auth.register.portfolio')}</Label>
                          <Input 
                            id="portfolio" 
                            type="url"
                            placeholder="https://monportfolio.com"
                            value={registerForm.portfolio}
                            onChange={(e) => setRegisterForm({...registerForm, portfolio: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="biographie">{t('auth.register.biography')} *</Label>
                          <Textarea 
                            id="biographie" 
                            placeholder={t('auth.register.biographyPlaceholder')}
                            className={`min-h-[100px] ${registerErrors.biographie ? 'border-destructive' : ''}`}
                            value={registerForm.biographie}
                            onChange={(e) => {
                              setRegisterForm({...registerForm, biographie: e.target.value});
                              setRegisterErrors({...registerErrors, biographie: ''});
                            }}
                            required={userType === 'professionnel'}
                          />
                          <p className="text-xs text-muted-foreground">
                            {registerForm.biographie.length}/500 {t('auth.register.charactersMinimum')}
                          </p>
                          {registerErrors.biographie && (
                            <p className="text-sm text-destructive">{registerErrors.biographie}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          id="conditions"
                          checked={registerForm.accepte_conditions}
                          onCheckedChange={(checked) => {
                            setRegisterForm({...registerForm, accepte_conditions: !!checked});
                            setRegisterErrors({...registerErrors, accepte_conditions: ''});
                          }}
                          required
                          className={registerErrors.accepte_conditions ? 'border-destructive' : ''}
                        />
                        <Label htmlFor="conditions" className="text-sm cursor-pointer">
                          {t('auth.register.acceptTerms.prefix')}{' '}
                          <a href="/conditions" className="text-primary underline">
                            {t('auth.register.acceptTerms.terms')}
                          </a>{' '}
                          {t('auth.register.acceptTerms.and')}{' '}
                          <a href="/confidentialite" className="text-primary underline">
                            {t('auth.register.acceptTerms.privacy')}
                          </a>{' '}*
                        </Label>
                      </div>
                      {registerErrors.accepte_conditions && (
                        <p className="text-sm text-destructive ml-6">{registerErrors.accepte_conditions}</p>
                      )}
                      
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          id="newsletter"
                          checked={registerForm.accepte_newsletter}
                          onCheckedChange={(checked) => setRegisterForm({...registerForm, accepte_newsletter: !!checked})}
                        />
                        <Label htmlFor="newsletter" className="text-sm cursor-pointer">
                          {t('auth.register.newsletter')}
                        </Label>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit"
                      className="w-full" 
                      disabled={registerLoading || wilayasLoading || uploadingPhoto}
                    >
                      {registerLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('auth.register.registering')}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          {t('auth.register.createAccount')}
                        </>
                      )}
                    </Button>

                    {userType === 'professionnel' && (
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong>{t('auth.register.professionalNote.title')}</strong>{' '}
                          {t('auth.register.professionalNote.description')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;