/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { User, Palette, Mail, Lock, UserPlus, LogIn, Upload, Calendar, Phone, MapPin, AlertCircle, X, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { mediaService } from '@/services/media.service';
import { SECTEUR_TYPE_USER_MAP, SECTEUR_OPTIONS, AUTH_ERROR_MESSAGES } from '@/types/models/auth.types';
import { useWilayas } from '@/hooks/useGeographie';
import { getAssetUrl } from '@/helpers/assetUrl';

const Auth = () => {
  const navigate = useNavigate();
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
          title: "Fichier trop volumineux",
          description: "La photo ne doit pas dépasser 5 MB",
          variant: "destructive",
        });
        return;
      }
      
      // Validation du type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Type de fichier non autorisé",
          description: "Utilisez JPG, PNG, GIF ou WebP",
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
      
      console.log('📸 Photo sélectionnée:', {
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
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      errors.email = 'Email invalide';
    }
    
    if (!loginForm.mot_de_passe) {
      errors.password = 'Le mot de passe est requis';
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
          title: "Erreur de connexion",
          description: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
          variant: "destructive",
        });
      } else {
        // Succès - afficher un toast de bienvenue
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur Timlilit Culture !",
        });
        
        // Forcer le rafraîchissement complet de la page
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error: any) {
      console.error('Erreur login:', error);
      toast({
        title: "Erreur",
        description: error.message || AUTH_ERROR_MESSAGES.NETWORK_ERROR,
        variant: "destructive",
      });
    }
  };

  // Validation du formulaire d'inscription
  const validateRegisterForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validation des champs communs
    if (!registerForm.nom || registerForm.nom.length < 2) {
      errors.nom = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!registerForm.prenom || registerForm.prenom.length < 2) {
      errors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }
    
    if (!registerForm.email) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
      errors.email = 'Email invalide';
    }
    
    if (!registerForm.mot_de_passe || registerForm.mot_de_passe.length < 8) {
      errors.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (registerForm.mot_de_passe !== registerForm.confirmation_mot_de_passe) {
      errors.confirmation_mot_de_passe = 'Les mots de passe ne correspondent pas';
    }
    
    if (!registerForm.date_naissance) {
      errors.date_naissance = 'La date de naissance est requise';
    } else {
      const birthDate = new Date(registerForm.date_naissance);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) {
        errors.date_naissance = 'Vous devez avoir au moins 13 ans';
      }
    }
    
    if (!registerForm.wilaya_residence || registerForm.wilaya_residence === 0) {
      errors.wilaya_residence = 'Veuillez sélectionner une wilaya';
    }
    
    if (!registerForm.accepte_conditions) {
      errors.accepte_conditions = 'Vous devez accepter les conditions d\'utilisation';
    }
    
    // Validation spécifique pour les professionnels
    if (userType === 'professionnel') {
      if (!registerForm.secteur) {
        errors.secteur = 'Le secteur d\'activité est requis';
      }
      
      if (!registerForm.biographie || registerForm.biographie.length < 50) {
        errors.biographie = 'La biographie doit contenir au moins 50 caractères';
      }
    }
    
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumission du formulaire d'inscription
// Soumission du formulaire d'inscription
  // Soumission du formulaire d'inscription
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegisterForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }

    try {
      let photoUrl: string | null = null;

      // ÉTAPE 1 : UPLOAD DE LA PHOTO SI PRÉSENTE (AVANT L'INSCRIPTION)
      if (userType === 'professionnel' && photoFile) {
        console.log('📸 ÉTAPE 1 - Upload de la photo AVANT inscription');
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
            throw new Error(errorData.error || 'Erreur upload photo');
          }

          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success && uploadResult.data?.url) {
            photoUrl = uploadResult.data.url;
            console.log('✅ Photo uploadée avec succès:', photoUrl);
          } else {
            throw new Error('URL de photo non reçue');
          }
        } catch (uploadError) {
          console.error('❌ Erreur upload photo:', uploadError);
          toast({
            title: "Erreur d'upload",
            description: "Impossible d'uploader la photo. L'inscription continue sans photo.",
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
        telephone: registerForm.telephone?.trim() || undefined,
        accepte_conditions: registerForm.accepte_conditions,
        accepte_newsletter: registerForm.accepte_newsletter || false
      };

      console.log('📝 ÉTAPE 2 - Inscription avec les données complètes');
      console.log('📝 Données d\'inscription préparées:', {
        type: userType,
        email: baseData.email,
        photo_url: photoUrl,
        wilaya: baseData.wilaya_residence
      });

      let success = false;
      
      if (userType === 'visiteur') {
        console.log('👤 Inscription en tant que visiteur...');
        success = await registerVisitor(baseData);
      } else {
        const professionalData = {
          ...baseData,
          photo_url: photoUrl || '', // Inclure la photo_url dans l'inscription
          biographie: registerForm.biographie.trim(),
          id_type_user: SECTEUR_TYPE_USER_MAP[registerForm.secteur] || 2
        };
        
        console.log('👨‍🎨 Inscription en tant que professionnel avec photo_url:', {
          id_type_user: professionalData.id_type_user,
          photo_url: professionalData.photo_url
        });
        
        // LOG COMPLET pour debug
        console.log('📊 DONNÉES COMPLÈTES ENVOYÉES:', professionalData);
        
        success = await registerProfessional(professionalData);
      }

      if (success) {
        console.log('✅ Inscription réussie !');
        
        // Message de succès
        toast({
          title: "Inscription réussie",
          description: userType === 'professionnel' 
            ? "Votre compte est en attente de validation. Vous recevrez un email de confirmation." 
            : "Bienvenue sur Timlilit Culture !",
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
          title: "Erreur d'inscription", 
          description: "Une erreur est survenue lors de l'inscription",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      toast({
        title: "Erreur",
        description: error.message || AUTH_ERROR_MESSAGES.NETWORK_ERROR,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };
 
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight font-serif text-gradient">
              Connexion & Inscription
            </h1>
            <p className="text-lg text-muted-foreground">
              Rejoignez la communauté Timlilit Culture
            </p>
          </div>

          <Tabs defaultValue="connexion" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connexion" className="flex items-center space-x-2">
                <LogIn className="h-4 w-4" />
                <span>Connexion</span>
              </TabsTrigger>
              <TabsTrigger value="inscription" className="flex items-center space-x-2">
                <UserPlus className="h-4 w-4" />
                <span>Inscription</span>
              </TabsTrigger>
            </TabsList>

            {/* Onglet Connexion */}
            <TabsContent value="connexion">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LogIn className="h-5 w-5" />
                    <span>Se connecter</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input 
                        id="login-email" 
                        type="email" 
                        placeholder="votre.email@exemple.com"
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
                      <Label htmlFor="login-password">Mot de passe</Label>
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
                      <label className="flex items-center space-x-2">
                        <Checkbox 
                          checked={loginForm.remember}
                          onCheckedChange={(checked) => setLoginForm({...loginForm, remember: !!checked})}
                        />
                        <span>Se souvenir de moi</span>
                      </label>
                      <Button variant="link" className="p-0 h-auto">
                        Mot de passe oublié ?
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Se connecter
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
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Créer un compte</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-6">
                    {/* Choix du profil */}
                    <div className="space-y-3">
                      <Label>Type de profil</Label>
                      <RadioGroup 
                        value={userType} 
                        onValueChange={(value) => setUserType(value as 'visiteur' | 'professionnel')}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="visiteur" id="visiteur" />
                          <Label htmlFor="visiteur" className="flex items-center space-x-2 cursor-pointer">
                            <User className="h-4 w-4" />
                            <span>Particulier</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professionnel" id="professionnel" />
                          <Label htmlFor="professionnel" className="flex items-center space-x-2 cursor-pointer">
                            <Palette className="h-4 w-4" />
                            <span>Professionnel (création soumise à validation par un admin)</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Formulaire commun */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prenom">Prénom *</Label>
                        <Input 
                          id="prenom" 
                          placeholder="Votre prénom"
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
                        <Label htmlFor="nom">Nom *</Label>
                        <Input 
                          id="nom" 
                          placeholder="Votre nom"
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sexe">Sexe *</Label>
                        <Select 
                          value={registerForm.sexe}
                          onValueChange={(value) => setRegisterForm({...registerForm, sexe: value as 'M' | 'F'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculin</SelectItem>
                            <SelectItem value="F">Féminin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date-naissance">Date de naissance *</Label>
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
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="votre.email@exemple.com"
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe *</Label>
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
                        <Label htmlFor="password-confirm">Confirmer le mot de passe *</Label>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="wilaya">Wilaya de résidence *</Label>
                        <Select 
                          value={registerForm.wilaya_residence.toString()}
                          onValueChange={(value) => {
                            setRegisterForm({ ...registerForm, wilaya_residence: parseInt(value) });
                            setRegisterErrors({...registerErrors, wilaya_residence: ''});
                          }}
                          disabled={wilayasLoading}
                        >
                          <SelectTrigger className={registerErrors.wilaya_residence ? 'border-destructive' : ''}>
                            <SelectValue placeholder={wilayasLoading ? "Chargement..." : "Sélectionnez une wilaya"} />
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
                          <p className="text-sm text-destructive">Erreur de chargement des wilayas</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone (optionnel)</Label>
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
                          Informations professionnelles
                        </h3>
                        
                        <div className="space-y-2">
                          <Label htmlFor="secteur">Secteur d'activité *</Label>
                          <Select 
                            value={registerForm.secteur}
                            onValueChange={(value) => {
                              setRegisterForm({...registerForm, secteur: value});
                              setRegisterErrors({...registerErrors, secteur: ''});
                            }}
                            required={userType === 'professionnel'}
                          >
                            <SelectTrigger className={registerErrors.secteur ? 'border-destructive' : ''}>
                              <SelectValue placeholder="Sélectionnez votre secteur" />
                            </SelectTrigger>
                            <SelectContent>
                              {SECTEUR_OPTIONS.map((option) => (
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
                          <Label htmlFor="photo">Photo de profil (optionnel)</Label>
                          <div className="flex items-center space-x-4">
                            {photoPreview && (
                              <div className="relative w-20 h-20">
                                <img 
                                  src={photoPreview} 
                                  alt="Aperçu" 
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
                                  aria-label="Supprimer la photo"
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
                                JPG, PNG, GIF ou WebP. Max 5MB.
                              </p>
                              {uploadingPhoto && (
                                <p className="text-xs text-blue-600 mt-1 flex items-center">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Upload en cours...
                                </p>
                              )}
                              {uploadedPhotoUrl && !uploadingPhoto && (
                                <p className="text-xs text-green-600 mt-1 flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  Photo uploadée avec succès
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="portfolio">Lien portfolio (optionnel)</Label>
                          <Input 
                            id="portfolio" 
                            type="url"
                            placeholder="https://monportfolio.com"
                            value={registerForm.portfolio}
                            onChange={(e) => setRegisterForm({...registerForm, portfolio: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="biographie">Biographie *</Label>
                          <Textarea 
                            id="biographie" 
                            placeholder="Présentez brièvement votre parcours et vos projets..."
                            className={`min-h-[100px] ${registerErrors.biographie ? 'border-destructive' : ''}`}
                            value={registerForm.biographie}
                            onChange={(e) => {
                              setRegisterForm({...registerForm, biographie: e.target.value});
                              setRegisterErrors({...registerErrors, biographie: ''});
                            }}
                            required={userType === 'professionnel'}
                          />
                          <p className="text-xs text-muted-foreground">
                            {registerForm.biographie.length}/500 caractères (minimum 50)
                          </p>
                          {registerErrors.biographie && (
                            <p className="text-sm text-destructive">{registerErrors.biographie}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
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
                          J'accepte les <a href="/conditions" className="text-primary underline">conditions d'utilisation</a> et 
                          la <a href="/confidentialite" className="text-primary underline">politique de confidentialité</a> *
                        </Label>
                      </div>
                      {registerErrors.accepte_conditions && (
                        <p className="text-sm text-destructive ml-6">{registerErrors.accepte_conditions}</p>
                      )}
                      
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="newsletter"
                          checked={registerForm.accepte_newsletter}
                          onCheckedChange={(checked) => setRegisterForm({...registerForm, accepte_newsletter: !!checked})}
                        />
                        <Label htmlFor="newsletter" className="text-sm cursor-pointer">
                          Je souhaite recevoir la newsletter et les actualités culturelles
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
                          Inscription en cours...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Créer mon compte
                        </>
                      )}
                    </Button>

                    {userType === 'professionnel' && (
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <strong>Note :</strong> Les comptes professionnels sont soumis à validation. 
                          Vous recevrez un email de confirmation une fois votre profil approuvé par un administrateur.
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