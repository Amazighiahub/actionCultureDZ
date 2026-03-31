import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Palette, Mail, Lock, UserPlus, LogIn, Upload, Calendar, Phone, MapPin, AlertCircle, X, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRTL } from '@/hooks/useRTL';
import { useToast } from '@/components/ui/use-toast';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { mediaService } from '@/services/media.service';
import { httpClient } from '@/services/httpClient';
import { SECTEUR_TYPE_USER_MAP, SECTEUR_OPTIONS, AUTH_ERROR_MESSAGES } from '@/types/models/auth.types';
import { useWilayas } from '@/hooks/useGeographie';
import { getAssetUrl } from '@/helpers/assetUrl';
import { authLogger } from '@/utils/logger';
import LoginFormComponent from '@/pages/auth/LoginForm';

const Auth = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { direction } = useRTL();
  const { registerVisitor, registerProfessional, registerLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('connexion');
  
  // État pour les wilayas
  const { wilayas, loading: wilayasLoading, error: wilayasError } = useWilayas();
  
  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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

  // Validation onBlur d'un champ individuel (inscription)
  const validateRegisterField = (field: string) => {
    let error = '';
    switch (field) {
      case 'nom':
        if (!registerForm.nom || registerForm.nom.length < 2) error = t('auth.errors.nameMinLength');
        break;
      case 'prenom':
        if (!registerForm.prenom || registerForm.prenom.length < 2) error = t('auth.errors.firstNameMinLength');
        break;
      case 'email':
        if (!registerForm.email) error = t('auth.errors.emailRequired');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) error = t('auth.errors.emailInvalid');
        break;
      case 'mot_de_passe':
        if (!registerForm.mot_de_passe || registerForm.mot_de_passe.length < 12) error = t('auth.errors.passwordMinLength');
        else if (!/[A-Z]/.test(registerForm.mot_de_passe)) error = t('auth.errors.passwordNeedUppercase', 'Le mot de passe doit contenir au moins une majuscule');
        else if (!/[a-z]/.test(registerForm.mot_de_passe)) error = t('auth.errors.passwordNeedLowercase', 'Le mot de passe doit contenir au moins une minuscule');
        else if (!/[0-9]/.test(registerForm.mot_de_passe)) error = t('auth.errors.passwordNeedDigit', 'Le mot de passe doit contenir au moins un chiffre');
        else if (!/[!@#$%^&*(),.?":{}|<>]/.test(registerForm.mot_de_passe)) error = t('auth.errors.passwordNeedSpecial', 'Le mot de passe doit contenir au moins un caractère spécial');
        break;
      case 'confirmation_mot_de_passe':
        if (registerForm.mot_de_passe && registerForm.mot_de_passe !== registerForm.confirmation_mot_de_passe) error = t('auth.errors.passwordMismatch');
        break;
      case 'telephone':
        if (registerForm.telephone) {
          const phoneDigits = registerForm.telephone.replace(/[^\d]/g, '');
          if (phoneDigits.length < 8 || phoneDigits.length > 15) {
            error = t('auth.errors.phoneInvalid', 'Numéro de téléphone invalide (8 à 15 chiffres)');
          }
        }
        break;
      case 'portfolio':
        if (registerForm.portfolio) {
          try {
            const url = new URL(registerForm.portfolio);
            if (!['http:', 'https:'].includes(url.protocol)) error = t('auth.errors.portfolioInvalidUrl', 'URL invalide (doit commencer par http:// ou https://)');
          } catch { error = t('auth.errors.portfolioInvalidUrl', 'URL invalide (doit commencer par http:// ou https://)'); }
        }
        break;
    }
    setRegisterErrors(prev => {
      if (!error) {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: error };
    });
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
    
    if (!registerForm.mot_de_passe || registerForm.mot_de_passe.length < 12) {
      errors.mot_de_passe = t('auth.errors.passwordMinLength');
    } else if (!/[A-Z]/.test(registerForm.mot_de_passe)) {
      errors.mot_de_passe = t('auth.errors.passwordNeedUppercase', 'Le mot de passe doit contenir au moins une majuscule');
    } else if (!/[a-z]/.test(registerForm.mot_de_passe)) {
      errors.mot_de_passe = t('auth.errors.passwordNeedLowercase', 'Le mot de passe doit contenir au moins une minuscule');
    } else if (!/[0-9]/.test(registerForm.mot_de_passe)) {
      errors.mot_de_passe = t('auth.errors.passwordNeedDigit', 'Le mot de passe doit contenir au moins un chiffre');
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(registerForm.mot_de_passe)) {
      errors.mot_de_passe = t('auth.errors.passwordNeedSpecial', 'Le mot de passe doit contenir au moins un caractère spécial');
    }
    
    if (registerForm.mot_de_passe !== registerForm.confirmation_mot_de_passe) {
      errors.confirmation_mot_de_passe = t('auth.errors.passwordMismatch');
    }
    
    if (!registerForm.date_naissance) {
      errors.date_naissance = t('auth.errors.birthDateRequired');
    } else {
      const birthDate = new Date(registerForm.date_naissance);
      if (isNaN(birthDate.getTime())) {
        errors.date_naissance = t('auth.errors.invalidDate', 'Date invalide');
      } else {
        const today = new Date();
        if (birthDate > today) {
          errors.date_naissance = t('auth.errors.futureDateNotAllowed', 'La date ne peut pas être dans le futur');
        } else {
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 13) {
            errors.date_naissance = t('auth.errors.minAge');
          }
        }
      }
    }
    
    if (!registerForm.wilaya_residence || registerForm.wilaya_residence === 0) {
      errors.wilaya_residence = t('auth.errors.wilayaRequired');
    }
    
    if (registerForm.telephone && !/^(0|\+213)[567]\d{8}$/.test(registerForm.telephone.replace(/\s/g, ''))) {
      errors.telephone = t('auth.errors.phoneInvalid', 'Numéro de téléphone invalide (format: 05/06/07XXXXXXXX)');
    }

    if (registerForm.portfolio) {
      try {
        const url = new URL(registerForm.portfolio);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.portfolio = t('auth.errors.portfolioInvalidUrl', 'URL invalide (doit commencer par http:// ou https://)');
        }
      } catch {
        errors.portfolio = t('auth.errors.portfolioInvalidUrl', 'URL invalide (doit commencer par http:// ou https://)');
      }
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
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setTimeout(() => {
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          (firstError as HTMLElement).focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
    }
    return !hasErrors;
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
          const formData = new FormData();
          formData.append('image', photoFile);
          const uploadResult = await httpClient.upload<Record<string, unknown>>('/upload/image/public', formData);

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || t('auth.errors.uploadError'));
          }
          
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
      
      let registrationResult: { success: boolean; error?: string };

      if (userType === 'visiteur') {
        authLogger.debug('Inscription en tant que visiteur...');
        registrationResult = await registerVisitor(baseData);
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

        registrationResult = await registerProfessional(professionalData);
      }

      if (registrationResult.success) {
        authLogger.debug('Inscription réussie !');

        // Message de succès différent selon le type d'utilisateur
        if (userType === 'professionnel') {
          toast({
            title: t('auth.success.registrationTitle', 'Inscription réussie !'),
            description: t('auth.success.professionalRegistration', 'Votre compte professionnel a été créé. Il sera validé par un administrateur sous 24-48h.'),
          });
        } else {
          toast({
            title: t('auth.success.registrationTitle', 'Inscription réussie !'),
            description: t('auth.success.visitorRegistration', 'Bienvenue ! Votre compte a été créé avec succès.'),
          });
        }

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
      } else {
        console.error('❌ Échec de l\'inscription:', registrationResult.error);

        // Afficher le message d'erreur spécifique du backend
        const errorMessage = registrationResult.error || '';
        let title = t('auth.errors.registrationError', 'Erreur d\'inscription');
        let description = t('auth.errors.registrationErrorDescription', 'Une erreur est survenue lors de l\'inscription');

        // Messages d'erreur spécifiques
        if (errorMessage.toLowerCase().includes('email') && (errorMessage.toLowerCase().includes('exist') || errorMessage.toLowerCase().includes('déjà'))) {
          title = t('auth.errors.emailExists', 'Email déjà utilisé');
          description = t('auth.errors.emailExistsDescription', 'Un compte existe déjà avec cette adresse email. Veuillez vous connecter ou utiliser une autre adresse.');
        } else if (errorMessage.toLowerCase().includes('mot de passe')) {
          description = t('auth.errors.passwordError', 'Le mot de passe ne respecte pas les critères de sécurité');
        } else if (errorMessage) {
          description = errorMessage;
        }

        toast({
          title,
          description,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('❌ Erreur inscription:', error);
      const errorMessage = error instanceof Error ? error.message : '';

      // Vérifier si c'est une erreur d'email existant
      let title = t('errors.generic.title', 'Erreur');
      let description = t('errors.generic.message', 'Une erreur est survenue');

      if (errorMessage.toLowerCase().includes('email') && (errorMessage.toLowerCase().includes('exist') || errorMessage.toLowerCase().includes('déjà'))) {
        title = t('auth.errors.emailExists', 'Email déjà utilisé');
        description = t('auth.errors.emailExistsDescription', 'Un compte existe déjà avec cette adresse email.');
      } else if (errorMessage) {
        description = errorMessage;
      }

      toast({
        title,
        description,
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
    <div className="min-h-screen bg-background" dir={direction}>
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
              <LoginFormComponent onSwitchToRegister={() => setActiveTab('inscription')} />
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
                    <p className="text-sm text-muted-foreground">{t('common.requiredFieldsLegend')}</p>
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
                          autoComplete="given-name"
                          maxLength={100}
                          placeholder={t('auth.register.firstNamePlaceholder')}
                          value={registerForm.prenom}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, prenom: e.target.value});
                            setRegisterErrors({...registerErrors, prenom: ''});
                          }}
                          onBlur={() => validateRegisterField('prenom')}
                          className={registerErrors.prenom ? 'border-destructive' : ''}
                          required
                          aria-invalid={!!registerErrors.prenom}
                          aria-describedby={registerErrors.prenom ? 'auth-prenom-error' : undefined}
                        />
                        {registerErrors.prenom && (
                          <p id="auth-prenom-error" role="alert" className="text-sm text-destructive">{registerErrors.prenom}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom">{t('auth.register.lastName')} *</Label>
                        <Input
                          id="nom"
                          autoComplete="family-name"
                          maxLength={100}
                          placeholder={t('auth.register.lastNamePlaceholder')}
                          value={registerForm.nom}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, nom: e.target.value});
                            setRegisterErrors({...registerErrors, nom: ''});
                          }}
                          onBlur={() => validateRegisterField('nom')}
                          className={registerErrors.nom ? 'border-destructive' : ''}
                          required
                          aria-invalid={!!registerErrors.nom}
                          aria-describedby={registerErrors.nom ? 'auth-nom-error' : undefined}
                        />
                        {registerErrors.nom && (
                          <p id="auth-nom-error" role="alert" className="text-sm text-destructive">{registerErrors.nom}</p>
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
                          autoComplete="bday"
                          value={registerForm.date_naissance}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, date_naissance: e.target.value});
                            setRegisterErrors({...registerErrors, date_naissance: ''});
                          }}
                          className={registerErrors.date_naissance ? 'border-destructive' : ''}
                          required
                          aria-invalid={!!registerErrors.date_naissance}
                          aria-describedby={registerErrors.date_naissance ? 'auth-date-naissance-error' : undefined}
                        />
                        {registerErrors.date_naissance && (
                          <p id="auth-date-naissance-error" role="alert" className="text-sm text-destructive">{registerErrors.date_naissance}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.register.email')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        maxLength={255}
                        placeholder={t('auth.register.emailPlaceholder')}
                        value={registerForm.email}
                        onChange={(e) => {
                          setRegisterForm({...registerForm, email: e.target.value});
                          setRegisterErrors({...registerErrors, email: ''});
                        }}
                        onBlur={() => validateRegisterField('email')}
                        className={registerErrors.email ? 'border-destructive' : ''}
                        required
                        aria-invalid={!!registerErrors.email}
                        aria-describedby={registerErrors.email ? 'auth-register-email-error' : undefined}
                      />
                      {registerErrors.email && (
                        <p id="auth-register-email-error" role="alert" className="text-sm text-destructive">{registerErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">{t('auth.register.password')} *</Label>
                        <p className="text-xs text-muted-foreground">{t('auth.register.passwordHint', '12 caractères min., 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial')}</p>
                        <Input
                          id="password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={registerForm.mot_de_passe}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, mot_de_passe: e.target.value});
                            setRegisterErrors({...registerErrors, mot_de_passe: ''});
                          }}
                          onBlur={() => validateRegisterField('mot_de_passe')}
                          className={registerErrors.mot_de_passe ? 'border-destructive' : ''}
                          required
                          minLength={12}
                          aria-invalid={!!registerErrors.mot_de_passe}
                          aria-describedby={registerErrors.mot_de_passe ? 'auth-mot-de-passe-error' : undefined}
                        />
                        <PasswordStrengthIndicator password={registerForm.mot_de_passe} />
                        {registerErrors.mot_de_passe && (
                          <p id="auth-mot-de-passe-error" role="alert" className="text-sm text-destructive">{registerErrors.mot_de_passe}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-confirm">{t('auth.register.confirmPassword')} *</Label>
                        <Input
                          id="password-confirm"
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={registerForm.confirmation_mot_de_passe}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, confirmation_mot_de_passe: e.target.value});
                            setRegisterErrors({...registerErrors, confirmation_mot_de_passe: ''});
                          }}
                          onBlur={() => validateRegisterField('confirmation_mot_de_passe')}
                          className={registerErrors.confirmation_mot_de_passe ? 'border-destructive' : ''}
                          required
                          minLength={12}
                          aria-invalid={!!registerErrors.confirmation_mot_de_passe}
                          aria-describedby={registerErrors.confirmation_mot_de_passe ? 'auth-confirmation-error' : undefined}
                        />
                        {registerErrors.confirmation_mot_de_passe && (
                          <p id="auth-confirmation-error" role="alert" className="text-sm text-destructive">{registerErrors.confirmation_mot_de_passe}</p>
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
                          <SelectTrigger
                            className={registerErrors.wilaya_residence ? 'border-destructive' : ''}
                            aria-invalid={!!registerErrors.wilaya_residence}
                            aria-describedby={registerErrors.wilaya_residence ? 'auth-wilaya-error' : undefined}
                          >
                            <SelectValue placeholder={wilayasLoading ? t('common.loading') : t('auth.register.selectWilaya')} />
                          </SelectTrigger>
                          <SelectContent>
                            {wilayas.map((wilaya) => (
                              <SelectItem key={wilaya.id_wilaya} value={wilaya.id_wilaya.toString()}>
                                {String(wilaya.codeW).padStart(2, '0')} - {i18n.language === 'ar' && wilaya.nom ? wilaya.nom : wilaya.wilaya_name_ascii}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {registerErrors.wilaya_residence && (
                          <p id="auth-wilaya-error" role="alert" className="text-sm text-destructive">{registerErrors.wilaya_residence}</p>
                        )}
                        {wilayasError && (
                          <p className="text-sm text-destructive">{t('auth.errors.wilayasLoadError')}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">{t('auth.register.phone')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                        <div className="flex gap-2">
                          <Select
                            value={registerForm.telephone?.split(' ')[0] || '+213'}
                            onValueChange={(code) => {
                              const num = registerForm.telephone?.replace(/^\+\d{1,4}\s?/, '') || '';
                              setRegisterForm({...registerForm, telephone: code + ' ' + num});
                              setRegisterErrors({...registerErrors, telephone: ''});
                            }}
                          >
                            <SelectTrigger className="w-[130px] flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+213">🇩🇿 +213</SelectItem>
                              <SelectItem value="+33">🇫🇷 +33</SelectItem>
                              <SelectItem value="+212">🇲🇦 +212</SelectItem>
                              <SelectItem value="+216">🇹🇳 +216</SelectItem>
                              <SelectItem value="+218">🇱🇾 +218</SelectItem>
                              <SelectItem value="+222">🇲🇷 +222</SelectItem>
                              <SelectItem value="+223">🇲🇱 +223</SelectItem>
                              <SelectItem value="+227">🇳🇪 +227</SelectItem>
                              <SelectItem value="+1">🇺🇸 +1</SelectItem>
                              <SelectItem value="+44">🇬🇧 +44</SelectItem>
                              <SelectItem value="+49">🇩🇪 +49</SelectItem>
                              <SelectItem value="+34">🇪🇸 +34</SelectItem>
                              <SelectItem value="+39">🇮🇹 +39</SelectItem>
                              <SelectItem value="+90">🇹🇷 +90</SelectItem>
                              <SelectItem value="+966">🇸🇦 +966</SelectItem>
                              <SelectItem value="+971">🇦🇪 +971</SelectItem>
                              <SelectItem value="+974">🇶🇦 +974</SelectItem>
                              <SelectItem value="+20">🇪🇬 +20</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="telephone"
                            type="tel"
                            autoComplete="tel"
                            maxLength={15}
                            placeholder="5XX XXX XXX"
                            value={registerForm.telephone?.replace(/^\+\d{1,4}\s?/, '') || ''}
                            onChange={(e) => {
                              const code = registerForm.telephone?.split(' ')[0] || '+213';
                              const num = e.target.value.replace(/[^\d\s]/g, '');
                              setRegisterForm({...registerForm, telephone: code + ' ' + num});
                              setRegisterErrors({...registerErrors, telephone: ''});
                            }}
                            onBlur={() => validateRegisterField('telephone')}
                            className={`flex-1 ${registerErrors.telephone ? 'border-destructive' : ''}`}
                            aria-invalid={!!registerErrors.telephone}
                            aria-describedby={registerErrors.telephone ? 'auth-telephone-error' : 'auth-telephone-helper'}
                          />
                        </div>
                        <p id="auth-telephone-helper" className="text-xs text-muted-foreground">{t('common.phoneHelper')}</p>
                        {registerErrors.telephone && (
                          <p id="auth-telephone-error" role="alert" className="text-sm text-destructive">{registerErrors.telephone}</p>
                        )}
                      </div>
                    </div>

                    {/* Champs spécifiques aux professionnels */}
                    {userType === 'professionnel' && (
                      <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                        <h3 className="font-semibold text-secondary flex items-center">
                          <Palette className="h-5 w-5 me-2" />
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
                            <SelectTrigger
                              className={registerErrors.secteur ? 'border-destructive' : ''}
                              aria-invalid={!!registerErrors.secteur}
                              aria-describedby={registerErrors.secteur ? 'auth-secteur-error' : undefined}
                            >
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
                            <p id="auth-secteur-error" role="alert" className="text-sm text-destructive">{registerErrors.secteur}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="photo">{t('auth.register.profilePhoto')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
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
                                className="cursor-pointer file:me-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('auth.register.photoFormats')}
                              </p>
                              {uploadingPhoto && (
                                <p className="text-xs text-accent mt-1 flex items-center">
                                  <Loader2 className="h-3 w-3 me-1 animate-spin" />
                                  {t('auth.register.uploadingPhoto')}
                                </p>
                              )}
                              {uploadedPhotoUrl && !uploadingPhoto && (
                                <p className="text-xs text-primary mt-1 flex items-center">
                                  <Check className="h-3 w-3 me-1" />
                                  {t('auth.register.photoUploaded')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="portfolio">{t('auth.register.portfolio')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                          <Input
                            id="portfolio"
                            type="url"
                            autoComplete="url"
                            maxLength={2048}
                            placeholder="https://monportfolio.com"
                            value={registerForm.portfolio}
                            onChange={(e) => {
                              setRegisterForm({...registerForm, portfolio: e.target.value});
                              setRegisterErrors({...registerErrors, portfolio: ''});
                            }}
                            className={registerErrors.portfolio ? 'border-destructive' : ''}
                            aria-invalid={!!registerErrors.portfolio}
                            aria-describedby={registerErrors.portfolio ? 'auth-portfolio-error' : 'auth-portfolio-helper'}
                          />
                          <p id="auth-portfolio-helper" className="text-xs text-muted-foreground">{t('common.portfolioHelper')}</p>
                          {registerErrors.portfolio && (
                            <p id="auth-portfolio-error" role="alert" className="text-sm text-destructive">{registerErrors.portfolio}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="biographie">{t('auth.register.biography')} *</Label>
                          <Textarea
                            id="biographie"
                            maxLength={500}
                            placeholder={t('auth.register.biographyPlaceholder')}
                            className={`min-h-[100px] ${registerErrors.biographie ? 'border-destructive' : ''}`}
                            value={registerForm.biographie}
                            onChange={(e) => {
                              setRegisterForm({...registerForm, biographie: e.target.value});
                              setRegisterErrors({...registerErrors, biographie: ''});
                            }}
                            required={userType === 'professionnel'}
                            aria-invalid={!!registerErrors.biographie}
                            aria-describedby={registerErrors.biographie ? 'auth-biographie-error' : undefined}
                          />
                          <p className="text-xs text-muted-foreground">
                            {registerForm.biographie.length}/500 {t('auth.register.charactersMinimum')}
                          </p>
                          {registerErrors.biographie && (
                            <p id="auth-biographie-error" role="alert" className="text-sm text-destructive">{registerErrors.biographie}</p>
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
                          aria-invalid={!!registerErrors.accepte_conditions}
                          aria-describedby={registerErrors.accepte_conditions ? 'auth-conditions-error' : undefined}
                        />
                        <Label htmlFor="conditions" className="text-sm cursor-pointer">
                          {t('auth.register.acceptTerms.prefix')}{' '}
                          <a href="/a-propos#conditions" className="text-primary underline">
                            {t('auth.register.acceptTerms.terms')}
                          </a>{' '}
                          {t('auth.register.acceptTerms.and')}{' '}
                          <a href="/a-propos#confidentialite" className="text-primary underline">
                            {t('auth.register.acceptTerms.privacy')}
                          </a>{' '}*
                        </Label>
                      </div>
                      {registerErrors.accepte_conditions && (
                        <p id="auth-conditions-error" role="alert" className="text-sm text-destructive ml-6">{registerErrors.accepte_conditions}</p>
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
                      size="lg"
                      className="w-full"
                      disabled={registerLoading || wilayasLoading || uploadingPhoto}
                    >
                      {registerLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                          {t('auth.register.registering')}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 me-2" />
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