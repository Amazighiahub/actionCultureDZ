import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';
import { ApiException } from '../services/api.service';
import PhotoUpload from '../components/UI/PhotoUpload';
import MetadataService from '../services/metadata.service';
import { Wilaya } from '../types/Geographie.types';
import { RegisterData } from '../types/auth.types';
import { TypeUser } from '../types/User.types';

// Interface étendue pour gérer différents formats de wilayas
interface WilayaExtended extends Partial<Wilaya> {
  id?: number;
  code?: string;
  nom?: string;
  nomAscii?: string;
  wilayaNameAscii?: string;
}

const DOMAINES_ACTIVITE = [
  { value: 'artisanat', label: 'Artisanat traditionnel' },
  { value: 'musique', label: 'Musique et chant' },
  { value: 'danse', label: 'Danse traditionnelle' },
  { value: 'theatre', label: 'Théâtre' },
  { value: 'scientifique', label: 'Scientifique' },
  { value: 'litterature', label: 'Littérature' },
  { value: 'arts_visuels', label: 'Arts visuels' },
  { value: 'patrimoine', label: 'Conservation du patrimoine' },
  { value: 'gastronomie', label: 'Gastronomie traditionnelle' },
  { value: 'education', label: 'Éducation culturelle' },
  { value: 'autre', label: 'Autre' }
];

// Interface pour le formulaire
interface FormData {
  // Données de base
  email: string;
  password: string;
  confirmPassword: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe?: 'M' | 'F';
  telephone?: string;
  typeUtilisateur: 'visiteur' | string;
  acceptTerms: boolean;
  acceptNewsletter: boolean;
  
  // Données professionnelles
  profession?: string;
  biographie?: string;
  domaineActivite: string[];
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  adresse?: string;
  siteWeb?: string;
  photo_url?: string;
  reseauxSociaux: Record<string, string>;
}

// Helper functions pour gérer les wilayas
const getWilayaId = (wilaya: any): number => {
  return wilaya.idWilaya || wilaya.id_wilaya || wilaya.id || wilaya.ID || 0;
};

const getWilayaCode = (wilaya: any): string => {
  return wilaya.codeW || wilaya.code_w || wilaya.code || wilaya.CODE || '';
};

const getWilayaName = (wilaya: any): string => {
  return wilaya.nomAscii || wilaya.nom_ascii || wilaya.wilayaNameAscii || wilaya.wilaya_name_ascii || 
         wilaya.nom || wilaya.name || '';
};

const RegisterPage: React.FC = () => {
  // Hook d'authentification et navigation
  const { register } = useAuth();
  const navigate = useNavigate();
  
  // État du formulaire
  const [currentStep, setCurrentStep] = useState(1);
  const [userType, setUserType] = useState<'visiteur' | 'professionnel'>('visiteur');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  
  // Données du formulaire typées
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    dateNaissance: '',
    typeUtilisateur: 'visiteur',
    acceptTerms: false,
    acceptNewsletter: false,
    domaineActivite: [],
    reseauxSociaux: {}
  });
  
  // État des erreurs
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  // Métadonnées
  const [wilayas, setWilayas] = useState<WilayaExtended[]>([]);
  const [dairas, setDairas] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [typesUtilisateurs, setTypesUtilisateurs] = useState<Array<{ value: string; label: string }>>([
    { value: 'ecrivain', label: 'Écrivain' },
    { value: 'journaliste', label: 'Journaliste' },
    { value: 'scientifique', label: 'Scientifique' },
    { value: 'artiste', label: 'Artiste' },
    { value: 'artisan', label: 'Artisan' },
    { value: 'photographe', label: 'Photographe' },
    { value: 'realisateur', label: 'Réalisateur' },
    { value: 'musicien', label: 'Musicien' },
    { value: 'danseur', label: 'Danseur' },
    { value: 'autre', label: 'Autre' }
  ]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingDairas, setLoadingDairas] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  
  // Chargement des métadonnées depuis le backend
  useEffect(() => {
    const loadMetadata = async () => {
      setLoadingMetadata(true);
      try {
        // Charger les wilayas
        const wilayasResponse = await MetadataService.getWilayas();
        if (wilayasResponse.success && wilayasResponse.data) {
          console.log('Wilayas chargées:', wilayasResponse.data);
          console.log('Première wilaya:', wilayasResponse.data[0]);
          setWilayas(wilayasResponse.data);
        } else {
          console.error('Erreur chargement wilayas:', wilayasResponse.error);
        }
        
        // Charger les types d'utilisateurs
        try {
          const typesResponse = await authService.getUserTypes();
          if (typesResponse && typesResponse.length > 0) {
            setTypesUtilisateurs(typesResponse);
          }
        } catch (error) {
          console.warn('Utilisation des types par défaut:', error);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des métadonnées:', error);
      } finally {
        setLoadingMetadata(false);
      }
    };
    
    loadMetadata();
  }, []);
  
  // Validation améliorée
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'email':
        if (!value) return 'Email requis';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide';
        return null;
      case 'password':
        if (!value) return 'Mot de passe requis';
        if (value.length < 8) return 'Au moins 8 caractères';
        if (!/[A-Z]/.test(value)) return 'Au moins une majuscule requise';
        if (!/[a-z]/.test(value)) return 'Au moins une minuscule requise';
        if (!/[0-9]/.test(value)) return 'Au moins un chiffre requis';
        return null;
      case 'confirmPassword':
        if (!value) return 'Confirmation requise';
        if (value !== formData.password) return 'Les mots de passe ne correspondent pas';
        return null;
      case 'nom':
      case 'prenom':
        if (!value) return 'Ce champ est requis';
        if (value.length < 2) return 'Au moins 2 caractères';
        if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) return 'Caractères non valides';
        return null;
      case 'dateNaissance':
        if (!value) return 'Date de naissance requise';
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        if (actualAge < 13) return 'Vous devez avoir au moins 13 ans';
        if (actualAge > 120) return 'Date de naissance invalide';
        return null;
      case 'telephone':
        if (value && !/^(0[567])[0-9]{8}$/.test(value)) {
          return 'Format invalide (ex: 0555123456)';
        }
        return null;
      case 'biographie':
        if (userType === 'professionnel') {
          if (!value) return 'Biographie requise pour les professionnels';
          if (value.length < 50) return 'Au moins 50 caractères';
          if (value.length > 500) return 'Maximum 500 caractères';
        }
        return null;
      case 'profession':
        if (userType === 'professionnel' && !value) {
          return 'Veuillez sélectionner votre profession';
        }
        return null;
      case 'domaineActivite':
        if (userType === 'professionnel' && (!value || value.length === 0)) {
          return 'Sélectionnez au moins un domaine d\'activité';
        }
        if (value && value.length > 3) {
          return 'Maximum 3 domaines d\'activité';
        }
        return null;
      case 'wilayaId':
        if (userType === 'professionnel' && !value) {
          return 'La wilaya est requise pour les professionnels';
        }
        return null;
      case 'acceptTerms':
        if (!value) return 'Vous devez accepter les conditions';
        return null;
      case 'adresse':
        // Adresse n'est plus requise
        return null;
      default:
        return null;
    }
  };
  
  // Valider le formulaire à chaque changement
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, (formData as any)[field]);
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    console.log('État du formulaire:', formData);
    console.log('WilayaId:', formData.wilayaId, 'Type:', typeof formData.wilayaId);
    console.log('AcceptTerms:', formData.acceptTerms, 'Type:', typeof formData.acceptTerms);
  }, [formData, userType]);
  
  const handleFieldChange = (field: keyof FormData, value: any) => {
    console.log(`Changement de ${field}:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => new Set(prev).add(field));
  };
  
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };
  
  const getFieldError = (field: string): string | undefined => {
    return touchedFields.has(field) ? errors[field] : undefined;
  };
  
  const isStepValid = (step: number): boolean => {
    const result = (() => {
      switch (step) {
        case 1:
          return userType === 'visiteur' || userType === 'professionnel';
        case 2:
          return !errors.email && !errors.password && !errors.confirmPassword &&
                 !!formData.email && !!formData.password && !!formData.confirmPassword;
        case 3:
          if (userType === 'visiteur') {
            return !errors.nom && !errors.prenom && !errors.dateNaissance &&
                   !!formData.nom && !!formData.prenom && !!formData.dateNaissance;
          } else {
            return !errors.nom && !errors.prenom && !errors.dateNaissance && 
                   !!formData.nom && !!formData.prenom && !!formData.dateNaissance && !!formData.profession;
          }
        case 4:
          if (userType === 'professionnel') {
            return !errors.biographie && !!formData.biographie && 
                   formData.domaineActivite.length > 0 && !!formData.wilayaId;
          }
          return true;
        case 5:
          console.log('Validation étape 5 - acceptTerms:', formData.acceptTerms);
          return formData.acceptTerms === true;
        default:
          return false;
      }
    })();
    
    console.log(`Étape ${step} valide:`, result);
    return result;
  };
  
  const getTotalSteps = () => {
    return userType === 'visiteur' ? 4 : 5;
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  // Fonction handleSubmit corrigée
  const handleSubmit = async () => {
    if (!isStepValid(currentStep)) {
      return;
    }
    
    if (currentStep < getTotalSteps()) {
      setCurrentStep(prev => prev + 1);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitMessage(null);
    
    try {
      // Vérification préalable
      console.log('=== AVANT SOUMISSION ===');
      console.log('formData.acceptTerms:', formData.acceptTerms);
      console.log('Type de acceptTerms:', typeof formData.acceptTerms);
      console.log('userType:', userType);
      
      if (!formData.acceptTerms) {
        console.error('acceptTerms est false ou undefined!');
        throw new Error('Vous devez accepter les conditions d\'utilisation');
      }
      
      // 1. Upload de la photo si professionnel
      let photoUrl: string | undefined = undefined;
      if (userType === 'professionnel' && profilePhoto) {
        try {
          photoUrl = await authService.uploadProfilePhoto(profilePhoto);
        } catch (uploadError) {
          console.error('Erreur upload photo:', uploadError);
        }
      }
      
      // 2. Préparer les données selon le format attendu par l'API
      // On envoie les deux formats (snake_case et camelCase) pour être compatible
      const registrationData: any = {
        // Format snake_case pour l'API
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        password: formData.password,
        type_user: userType === 'visiteur' ? 'visiteur' : formData.profession!,
        accepte_conditions: formData.acceptTerms,
        accepte_newsletter: formData.acceptNewsletter,
        telephone: formData.telephone || null,
        date_naissance: formData.dateNaissance,
        sexe: formData.sexe || null,
        wilaya_residence: formData.wilayaId || null,
        // Format camelCase pour le service TypeScript
        typeUser: userType === 'visiteur' ? 'visiteur' : formData.profession!,
        accepteConditions: formData.acceptTerms,
        accepteNewsletter: formData.acceptNewsletter,
        dateNaissance: formData.dateNaissance,
        wilayaResidence: formData.wilayaId || null,
        // Champs professionnels
        ...(userType === 'professionnel' && {
          // Snake case
          photo_url: photoUrl || null,
          biographie: formData.biographie,
          specialites: formData.domaineActivite,
          commune_id: formData.communeId || null,
          site_web: formData.siteWeb || null,
          reseaux_sociaux: Object.keys(formData.reseauxSociaux).length > 0 ? formData.reseauxSociaux : null,
          // Camel case
          photoUrl: photoUrl || null,
          communeId: formData.communeId || null,
          siteWeb: formData.siteWeb || null,
          reseauxSociaux: Object.keys(formData.reseauxSociaux).length > 0 ? formData.reseauxSociaux : null
        })
      };
      
      console.log('Données envoyées:', registrationData);
      console.log('acceptTerms:', formData.acceptTerms);
      console.log('accepte_conditions:', registrationData.accepte_conditions);
      console.log('accepteConditions:', registrationData.accepteConditions);
      
      // 3. Appeler le service d'inscription
      await register(registrationData);
      
      // 4. Gérer la réponse selon le type d'utilisateur
      if (userType === 'professionnel') {
        // Pour les professionnels, rediriger vers la page d'attente
        setSubmitMessage({
          type: 'success',
          text: 'Inscription réussie ! Redirection vers votre espace d\'attente...'
        });
        
        // Redirection vers la page d'attente après 1.5 secondes
        setTimeout(() => {
          navigate('/professionnel/en-attente');
        }, 1500);
        
      } else {
        // Pour les visiteurs, message de succès et redirection vers connexion
        setSubmitMessage({
          type: 'success',
          text: 'Inscription réussie! Bienvenue sur la plateforme. Redirection vers la page de connexion...'
        });
        
        // Redirection après 2 secondes pour les visiteurs
        setTimeout(() => {
          navigate('/connexion');
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      
      // Gérer les erreurs spécifiques
      let errorMessage = 'Une erreur est survenue lors de l\'inscription';
      
      if (error instanceof ApiException) {
        if (error.status === 400) {
          errorMessage = error.message || 'Données invalides';
          // Gérer les erreurs de validation détaillées
          if (error.data?.details && Array.isArray(error.data.details)) {
            errorMessage = error.data.details
              .map((d: any) => d.message)
              .join('\n');
          }
        } else if (error.status === 409) {
          errorMessage = 'Cet email est déjà utilisé';
        } else if (error.status === 422) {
          errorMessage = error.message || 'Erreur de validation des données';
        } else if (error.status === 429) {
          errorMessage = 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loadingMetadata) {
    return (
      <div className="min-h-screen bg-[#f8fbfa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#eb9f13] mx-auto"></div>
          <p className="mt-4 text-[#51946b]">Chargement...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#f8fbfa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        {/* Bouton retour à l'accueil */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center text-[#51946b] hover:text-[#eb9f13] transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à l'accueil
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#0e1a13]">Inscription</h2>
          <p className="mt-2 text-sm text-[#51946b]">
            Créez votre compte pour accéder à toutes les fonctionnalités
          </p>
        </div>
        
        {/* Message de résultat */}
        {submitMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            submitMessage.type === 'success' 
              ? 'bg-[#e8f2ec] text-[#51946b] border border-[#51946b]' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <p className="whitespace-pre-line">{submitMessage.text}</p>
          </div>
        )}
        
        {/* Progress bar - Masquer si inscription professionnel réussie */}
        {!(submitMessage?.type === 'success' && submitMessage.text.includes('attente de validation')) && (
          <div className="mb-8">
            <div className="flex items-center">
              {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex-1 h-2 rounded-full ${
                      step <= currentStep ? 'bg-[#eb9f13]' : 'bg-[#e8f2ec]'
                    }`}
                  />
                  {step < getTotalSteps() && <div className="w-2" />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center mt-2 text-sm text-[#51946b]">
              Étape {currentStep} sur {getTotalSteps()}
            </p>
          </div>
        )}
        
        {/* Formulaire - Masquer si inscription professionnel réussie */}
        {!(submitMessage?.type === 'success' && submitMessage.text.includes('attente de validation')) && (
          <div className="bg-white shadow rounded-lg p-6 border border-[#e8f2ec]">
          {/* Étape 1: Type d'utilisateur */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#0e1a13] mb-4">
                Type de compte
              </h3>
              <div className="space-y-3">
                <label className="flex items-start p-4 border border-[#e8f2ec] rounded-lg cursor-pointer hover:bg-[#f8fbfa] hover:border-[#eb9f13] transition-colors">
                  <input
                    type="radio"
                    value="visiteur"
                    checked={userType === 'visiteur'}
                    onChange={(e) => {
                      setUserType('visiteur');
                      handleFieldChange('typeUtilisateur', 'visiteur');
                    }}
                    className="mt-1 mr-3 text-[#eb9f13] focus:ring-[#eb9f13]"
                  />
                  <div>
                    <div className="font-medium text-[#0e1a13]">Visiteur</div>
                    <div className="text-sm text-[#51946b]">
                      Découvrez le patrimoine culturel algérien
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start p-4 border border-[#e8f2ec] rounded-lg cursor-pointer hover:bg-[#f8fbfa] hover:border-[#eb9f13] transition-colors">
                  <input
                    type="radio"
                    value="professionnel"
                    checked={userType === 'professionnel'}
                    onChange={(e) => {
                      setUserType('professionnel');
                      handleFieldChange('typeUtilisateur', 'professionnel');
                    }}
                    className="mt-1 mr-3 text-[#eb9f13] focus:ring-[#eb9f13]"
                  />
                  <div>
                    <div className="font-medium text-[#0e1a13]">Professionnel</div>
                    <div className="text-sm text-[#51946b]">
                      Partagez vos œuvres et organisez des événements
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
          
          {/* Étape 2: Informations de connexion */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#0e1a13] mb-4">
                Informations de connexion
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                    getFieldError('email')
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                  }`}
                />
                {getFieldError('email') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    onBlur={() => handleFieldBlur('password')}
                    className={`mt-1 block w-full rounded-md shadow-sm pr-10 p-2 border ${
                      getFieldError('password')
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#51946b] hover:text-[#eb9f13]"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {getFieldError('password') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
                )}
                <p className="mt-1 text-xs text-[#51946b]">
                  Doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword || ''}
                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    onBlur={() => handleFieldBlur('confirmPassword')}
                    className={`mt-1 block w-full rounded-md shadow-sm pr-10 p-2 border ${
                      getFieldError('confirmPassword')
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#51946b] hover:text-[#eb9f13]"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {getFieldError('confirmPassword') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
                )}
              </div>
            </div>
          )}
          
          {/* Étape 3: Informations personnelles */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#0e1a13] mb-4">
                Informations personnelles
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0e1a13]">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.nom || ''}
                    onChange={(e) => handleFieldChange('nom', e.target.value)}
                    onBlur={() => handleFieldBlur('nom')}
                    className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                      getFieldError('nom')
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                    }`}
                  />
                  {getFieldError('nom') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('nom')}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#0e1a13]">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.prenom || ''}
                    onChange={(e) => handleFieldChange('prenom', e.target.value)}
                    onBlur={() => handleFieldBlur('prenom')}
                    className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                      getFieldError('prenom')
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                    }`}
                  />
                  {getFieldError('prenom') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('prenom')}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={formData.dateNaissance || ''}
                  onChange={(e) => handleFieldChange('dateNaissance', e.target.value)}
                  onBlur={() => handleFieldBlur('dateNaissance')}
                  max={new Date(new Date().getFullYear() - 13, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                    getFieldError('dateNaissance')
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                  }`}
                />
                {getFieldError('dateNaissance') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('dateNaissance')}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0e1a13]">
                    Sexe (optionnel)
                  </label>
                  <select
                    value={formData.sexe || ''}
                    onChange={(e) => handleFieldChange('sexe', e.target.value as 'M' | 'F' | undefined)}
                    className="mt-1 block w-full rounded-md border-[#e8f2ec] shadow-sm p-2 border focus:ring-[#eb9f13] focus:border-[#eb9f13]"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#0e1a13]">
                    Téléphone (optionnel)
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone || ''}
                    onChange={(e) => handleFieldChange('telephone', e.target.value)}
                    onBlur={() => handleFieldBlur('telephone')}
                    placeholder="0555123456"
                    className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                      getFieldError('telephone')
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                    }`}
                  />
                  {getFieldError('telephone') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('telephone')}</p>
                  )}
                </div>
              </div>
              
              {userType === 'professionnel' && (
                <div>
                  <label className="block text-sm font-medium text-[#0e1a13]">
                    Profession *
                  </label>
                  <select
                    value={formData.profession || ''}
                    onChange={(e) => handleFieldChange('profession', e.target.value)}
                    onBlur={() => handleFieldBlur('profession')}
                    className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                      getFieldError('profession')
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                    }`}
                  >
                    <option value="">-- Sélectionner votre profession --</option>
                    {typesUtilisateurs.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {getFieldError('profession') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('profession')}</p>
                  )}
                </div>
              )}
              
              {userType === 'visiteur' && (
                <div>
                  <label className="block text-sm font-medium text-[#0e1a13]">
                    Wilaya de résidence
                  </label>
                  <select
                    value={formData.wilayaId ? formData.wilayaId.toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Wilaya sélectionnée:', value);
                      handleFieldChange('wilayaId', value ? parseInt(value, 10) : undefined);
                    }}
                    className="mt-1 block w-full rounded-md shadow-sm p-2 border border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]"
                  >
                    <option value="">-- Sélectionner une wilaya --</option>
                    {wilayas.map((wilaya) => {
                      const id = getWilayaId(wilaya);
                      const code = getWilayaCode(wilaya);
                      const name = getWilayaName(wilaya);
                      return (
                        <option key={id} value={id.toString()}>
                          {code} - {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          )}
          
          {/* Étape 4: Informations professionnelles */}
          {currentStep === 4 && userType === 'professionnel' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#0e1a13] mb-4">
                Informations professionnelles
              </h3>
              
              {/* Photo de profil */}
              <div>
                <label className="block text-sm font-medium text-[#0e1a13] mb-3">
                  Photo de profil (optionnel)
                </label>
                <PhotoUpload
                  currentPhotoUrl={formData.photo_url}
                  onPhotoChange={(file: File | null) => {
                    setProfilePhoto(file);
                    if (file) {
                      const tempUrl = URL.createObjectURL(file);
                      handleFieldChange('photo_url', tempUrl);
                    } else {
                      handleFieldChange('photo_url', undefined);
                    }
                  }}
                  onPhotoRemove={() => {
                    setProfilePhoto(null);
                    handleFieldChange('photo_url', undefined);
                  }}
                  size="lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Biographie *
                </label>
                <textarea
                  value={formData.biographie || ''}
                  onChange={(e) => handleFieldChange('biographie', e.target.value)}
                  onBlur={() => handleFieldBlur('biographie')}
                  rows={4}
                  className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                    getFieldError('biographie')
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                  }`}
                  placeholder="Parlez-nous de votre parcours..."
                />
                <p className="mt-1 text-sm text-[#51946b]">
                  {formData.biographie?.length || 0}/500 caractères
                </p>
                {getFieldError('biographie') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('biographie')}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13] mb-2">
                  Domaines d'activité * (max 3)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-[#e8f2ec] rounded">
                  {DOMAINES_ACTIVITE.map((domaine) => (
                    <label key={domaine.value} className="flex items-center hover:bg-[#f8fbfa] p-1 rounded">
                      <input
                        type="checkbox"
                        value={domaine.value}
                        checked={formData.domaineActivite?.includes(domaine.value)}
                        onChange={(e) => {
                          const value = e.target.value;
                          const currentDomaines = formData.domaineActivite || [];
                          if (e.target.checked) {
                            if (currentDomaines.length < 3) {
                              handleFieldChange('domaineActivite', [...currentDomaines, value]);
                            }
                          } else {
                            handleFieldChange('domaineActivite', currentDomaines.filter((d: string) => d !== value));
                          }
                        }}
                        disabled={!formData.domaineActivite?.includes(domaine.value) && formData.domaineActivite?.length === 3}
                        className="mr-2 text-[#eb9f13] focus:ring-[#eb9f13]"
                      />
                      <span className="text-sm text-[#0e1a13]">{domaine.label}</span>
                    </label>
                  ))}
                </div>
                {getFieldError('domaineActivite') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('domaineActivite')}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Wilaya *
                </label>
                <select
                  value={formData.wilayaId ? formData.wilayaId.toString() : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Wilaya sélectionnée (professionnel):', value);
                    handleFieldChange('wilayaId', value ? parseInt(value, 10) : undefined);
                    handleFieldChange('dairaId', undefined);
                    handleFieldChange('communeId', undefined);
                  }}
                  onBlur={() => handleFieldBlur('wilayaId')}
                  className={`mt-1 block w-full rounded-md shadow-sm p-2 border ${
                    getFieldError('wilayaId')
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]'
                  }`}
                >
                  <option value="">-- Sélectionner une wilaya --</option>
                  {wilayas.map((wilaya) => {
                    const id = getWilayaId(wilaya);
                    const code = getWilayaCode(wilaya);
                    const name = getWilayaName(wilaya);
                    return (
                      <option key={id} value={id.toString()}>
                        {code} - {name}
                      </option>
                    );
                  })}
                </select>
                {getFieldError('wilayaId') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('wilayaId')}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#0e1a13]">
                  Site web (optionnel)
                </label>
                <input
                  type="url"
                  value={formData.siteWeb || ''}
                  onChange={(e) => handleFieldChange('siteWeb', e.target.value)}
                  className="mt-1 block w-full rounded-md shadow-sm p-2 border border-[#e8f2ec] focus:ring-[#eb9f13] focus:border-[#eb9f13]"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
          
          {/* Étape finale: Conditions */}
          {((currentStep === 4 && userType === 'visiteur') || 
            (currentStep === 5 && userType === 'professionnel')) && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-[#0e1a13] mb-4">
                Conditions d'utilisation
              </h3>
              
              <div className="bg-[#f8fbfa] p-4 rounded-lg border border-[#e8f2ec]">
                <h4 className="font-medium text-[#0e1a13] mb-2">Conditions générales</h4>
                <p className="text-sm text-[#51946b] mb-4">
                  En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité. 
                  Vous vous engagez à respecter les règles de la communauté et à utiliser la plateforme de manière responsable.
                </p>
                
                {userType === 'professionnel' && (
                  <>
                    <h4 className="font-medium text-[#0e1a13] mb-2">Pour les professionnels</h4>
                    <p className="text-sm text-[#51946b]">
                      Votre compte professionnel sera soumis à validation par notre équipe. 
                      Cette vérification peut prendre jusqu'à 48 heures. 
                      Vous recevrez une notification par email une fois votre compte approuvé.
                    </p>
                  </>
                )}
              </div>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    console.log('Checkbox acceptTerms changée:', checked);
                    handleFieldChange('acceptTerms', checked);
                  }}
                  className="mt-1 mr-3 text-[#eb9f13] focus:ring-[#eb9f13]"
                />
                <span className="text-sm text-[#0e1a13]">
                  J'accepte les conditions d'utilisation et la politique de confidentialité *
                </span>
              </label>
              {getFieldError('acceptTerms') && (
                <p className="text-sm text-red-600">{getFieldError('acceptTerms')}</p>
              )}
              
              <label className="flex items-start mt-4">
                <input
                  type="checkbox"
                  checked={formData.acceptNewsletter}
                  onChange={(e) => handleFieldChange('acceptNewsletter', e.target.checked)}
                  className="mt-1 mr-3 text-[#eb9f13] focus:ring-[#eb9f13]"
                />
                <span className="text-sm text-[#0e1a13]">
                  Je souhaite recevoir la newsletter et les actualités culturelles
                </span>
              </label>
            </div>
          )}
          
          {/* Boutons de navigation */}
          <div className="mt-6 flex justify-between">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="px-4 py-2 text-sm font-medium text-[#0e1a13] bg-white border border-[#e8f2ec] rounded-md hover:bg-[#f8fbfa] hover:border-[#eb9f13] transition-colors"
              >
                Précédent
              </button>
            )}
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isStepValid(currentStep) || isSubmitting}
              className={`${currentStep === 1 ? 'w-full' : 'ml-auto'} px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                isStepValid(currentStep) && !isSubmitting
                  ? 'bg-[#eb9f13] hover:bg-[#e69d11]'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              title={!isStepValid(currentStep) ? 'Veuillez remplir tous les champs requis' : ''}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Inscription en cours...
                </span>
              ) : currentStep < getTotalSteps() ? (
                'Suivant'
              ) : (
                'S\'inscrire'
              )}
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[#51946b]">
              Vous avez déjà un compte ?{' '}
              <button 
                onClick={() => window.location.href = '/connexion'}
                className="font-medium text-[#eb9f13] hover:text-[#e69d11] transition-colors"
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
        )}  {/* Cette parenthèse fermante était manquante */}
      </div>
    </div>
  );
};

export default RegisterPage;