// hooks/useRegistration.ts - Hook personnalisé pour gérer l'inscription

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useNotifications } from '../components/UI';
import { 
  UserRegistrationForm, 
  VisitorRegistrationData, 
  ProfessionalRegistrationData,
  RegistrationFormState,
  validateRegistrationData,
  isVisitorRegistration,
  isProfessionalRegistration,
  DOMAINES_ACTIVITE
} from '../types/auth.types';

// État initial pour visiteur
const initialVisitorData: VisitorRegistrationData = {
  typeUtilisateur: 'visiteur',
  email: '',
  password: '',
  confirmPassword: '',
  nom: '',
  prenom: '',
  dateNaissance: '',
  telephone: '',
  acceptTerms: false,
  wilayaId: undefined,
  communeId: undefined
};

// État initial pour professionnel
const initialProfessionalData: ProfessionalRegistrationData = {
  typeUtilisateur: 'professionnel',
  email: '',
  password: '',
  confirmPassword: '',
  nom: '',
  prenom: '',
  dateNaissance: '',
  telephone: '',
  acceptTerms: false,
  biographie: '',
  domaineActivite: [],
  wilayaId: 0,
  communeId: 0,
  adresse: '',
  photo_url: undefined,
  siteWeb: undefined,
  reseauxSociaux: undefined,
  documents: undefined
};

export function useRegistration(accountType: 'visiteur' | 'professionnel') {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  // État du formulaire
  const [formData, setFormData] = useState<UserRegistrationForm>(
    accountType === 'visiteur' ? initialVisitorData : initialProfessionalData
  );

  const [formState, setFormState] = useState<RegistrationFormState>({
    currentStep: 1,
    isSubmitting: false,
    errors: {},
    touchedFields: new Set()
  });

  // Redirection si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Mise à jour d'un champ
  const updateField = useCallback((field: keyof UserRegistrationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Marquer le champ comme touché
    setFormState(prev => ({
      ...prev,
      touchedFields: new Set(prev.touchedFields).add(field)
    }));
    
    // Retirer l'erreur si elle existe
    if (formState.errors[field]) {
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: undefined }
      }));
    }
  }, [formState.errors]);

  // Validation d'une étape
  const validateStep = useCallback((step: number): boolean => {
    const errors = validateRegistrationData(formData);
    const stepErrors: Record<string, string> = {};
    
    if (step === 1) {
      // Validation des infos de base
      const fieldsToValidate = ['email', 'password', 'confirmPassword', 'nom', 'prenom', 'dateNaissance'];
      fieldsToValidate.forEach(field => {
        if (errors[field]) {
          stepErrors[field] = errors[field];
        }
      });
    } else if (step === 2 && accountType === 'professionnel') {
      // Validation des infos professionnelles
      const fieldsToValidate = ['profession', 'biographie', 'domaineActivite', 'wilayaId', 'communeId', 'adresse'];
      fieldsToValidate.forEach(field => {
        if (errors[field]) {
          stepErrors[field] = errors[field];
        }
      });
    }
    
    setFormState(prev => ({
      ...prev,
      errors: stepErrors
    }));
    
    return Object.keys(stepErrors).length === 0;
  }, [formData, accountType]);

  // Navigation entre les étapes
  const nextStep = useCallback(() => {
    if (validateStep(formState.currentStep)) {
      setFormState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    }
  }, [formState.currentStep, validateStep]);

  const previousStep = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1)
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setFormState(prev => ({
      ...prev,
      currentStep: step
    }));
  }, []);

  // Soumission du formulaire
  const submitForm = useCallback(async () => {
    // Valider toutes les données
    const errors = validateRegistrationData(formData);
    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({
        ...prev,
        errors
      }));
      return;
    }
    
    // Vérifier l'acceptation des conditions
    if (!formData.acceptTerms) {
      setFormState(prev => ({
        ...prev,
        errors: { acceptTerms: 'Vous devez accepter les conditions d\'utilisation' }
      }));
      return;
    }
    
    setFormState(prev => ({ ...prev, isSubmitting: true, errors: {} }));
    
    try {
      // Préparer les données pour l'API
      let registrationData: any = {
        email: formData.email,
        password: formData.password,
        nom: formData.nom,
        prenom: formData.prenom,
        date_naissance: formData.dateNaissance,
        telephone: formData.telephone || undefined,
        accepte_conditions: formData.acceptTerms
      };
      
      if (isVisitorRegistration(formData)) {
        registrationData = {
          ...registrationData,
          type_user: 'visiteur',
          wilaya_residence: formData.wilayaId
        };
      } else if (isProfessionalRegistration(formData)) {
        registrationData = {
          ...registrationData,
          type_user: formData.profession,
          biographie: formData.biographie,
          specialites: formData.domaineActivite,
          wilaya_residence: formData.wilayaId,
          commune_id: formData.communeId,
          adresse: formData.adresse,
          photo_url: formData.photo_url,
          site_web: formData.siteWeb,
          reseaux_sociaux: formData.reseauxSociaux
        };
      }
      
      await register(registrationData);
      
      addNotification({
        type: 'success',
        title: 'Inscription réussie !',
        message: accountType === 'professionnel' 
          ? 'Votre compte professionnel a été créé. Il sera validé par un administrateur sous 48h.'
          : 'Bienvenue dans la communauté Action Culture !'
      });
      
      // Redirection après succès
      navigate('/');
      
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erreur lors de l\'inscription';
      
      setFormState(prev => ({
        ...prev,
        errors: { general: message }
      }));
      
      addNotification({
        type: 'error',
        title: 'Erreur d\'inscription',
        message
      });
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formData, accountType, register, navigate, addNotification]);

  // Gestion des spécialités (pour les professionnels)
  const addSpecialite = useCallback((specialite: string) => {
    if (!isProfessionalRegistration(formData)) return;
    
    const trimmed = specialite.trim();
    if (trimmed && !formData.domaineActivite.includes(trimmed)) {
      updateField('domaineActivite', [...formData.domaineActivite, trimmed]);
    }
  }, [formData, updateField]);

  const removeSpecialite = useCallback((specialite: string) => {
    if (!isProfessionalRegistration(formData)) return;
    
    updateField('domaineActivite', formData.domaineActivite.filter(s => s !== specialite));
  }, [formData, updateField]);

  // Gestion de la photo (pour les professionnels)
  const updatePhotoUrl = useCallback((url: string | undefined) => {
    if (isProfessionalRegistration(formData)) {
      updateField('photo_url', url);
    }
  }, [formData, updateField]);

  // Reset du formulaire
  const resetForm = useCallback(() => {
    setFormData(accountType === 'visiteur' ? initialVisitorData : initialProfessionalData);
    setFormState({
      currentStep: 1,
      isSubmitting: false,
      errors: {},
      touchedFields: new Set()
    });
  }, [accountType]);

  return {
    // État
    formData,
    formState,
    
    // Actions
    updateField,
    nextStep,
    previousStep,
    goToStep,
    submitForm,
    resetForm,
    
    // Helpers spécifiques aux professionnels
    addSpecialite,
    removeSpecialite,
    updatePhotoUrl,
    
    // Utilitaires
    isVisitor: isVisitorRegistration(formData),
    isProfessional: isProfessionalRegistration(formData),
    canSubmit: formData.acceptTerms && !formState.isSubmitting,
    totalSteps: accountType === 'visiteur' ? 1 : 2,
    domainesActivite: DOMAINES_ACTIVITE
  };
}

// Hook pour gérer l'upload de photo
export function usePhotoUpload(onUploadComplete?: (url: string) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  const uploadPhoto = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    
    try {
      // Validation du fichier
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('La photo ne doit pas dépasser 5MB');
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format non supporté. Utilisez JPG, PNG ou WebP');
      }
      
      // Simuler l'upload avec progression
      // Dans une vraie app, utiliser XMLHttpRequest ou une lib comme axios
      const formData = new FormData();
      formData.append('photo', file);
      
      // TODO: Remplacer par un vrai appel API
      await new Promise(resolve => setTimeout(resolve, 1500));
      setUploadProgress(100);
      
      // URL simulée - remplacer par la vraie URL retournée par l'API
      const uploadedUrl = URL.createObjectURL(file);
      
      if (onUploadComplete) {
        onUploadComplete(uploadedUrl);
      }
      
      addNotification({
        type: 'success',
        title: 'Photo uploadée',
        message: 'Votre photo de profil a été mise à jour'
      });
      
      return uploadedUrl;
      
    } catch (error: any) {
      const message = error?.message || 'Erreur lors de l\'upload';
      setUploadError(message);
      
      addNotification({
        type: 'error',
        title: 'Erreur d\'upload',
        message
      });
      
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [addNotification, onUploadComplete]);

  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  return {
    uploadPhoto,
    resetUpload,
    isUploading,
    uploadProgress,
    uploadError
  };
}

// Hook pour la validation en temps réel
export function useFieldValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateField = useCallback((field: string, value: any, additionalData?: any): string | null => {
    const validation = validateRegistrationData({ [field]: value, ...additionalData });
    const error = validation[field] || null;
    
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    
    return error;
  }, []);
  
  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);
  
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);
  
  return {
    errors,
    validateField,
    clearError,
    clearAllErrors
  };
}