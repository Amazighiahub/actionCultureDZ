/**
 * RegisterForm - Composant formulaire d'inscription
 * Extrait de Auth.tsx pour une meilleure maintenabilité
 */
import AntiRobot, { useAntiRobot } from '@/components/shared/AntiRobot';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredLabel } from '@/components/ui/required-label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Palette, Mail, Lock, UserPlus, Upload, Calendar, Phone, MapPin, AlertCircle, X, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { httpClient } from '@/services/httpClient';
import { SECTEUR_TYPE_USER_MAP, SECTEUR_OPTIONS } from '@/types/models/auth.types';
import { useWilayas } from '@/hooks/useGeographie';
import GeoSelector from '@/components/shared/GeoSelector';
import { getAssetUrl } from '@/helpers/assetUrl';
import { authLogger } from '@/utils/logger';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { normaliserTelephone, telephoneValide } from '@/utils/telephone';
import { emailValide } from '@/utils/validationChamps';
import { erreurMotDePasse } from '@/utils/motDePasse';
import { messageErreurServeur, useDefilerVersErreur } from '@/utils/erreurServeur';
import type { AuthResult } from '@/types/models/auth.types';
import { Link } from 'react-router-dom';


interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

/** Nom du champ dans la réponse du serveur → champ du formulaire (pour placer l'erreur dessous) */
const CHAMP_DU_SERVEUR: Record<string, string> = {
  email: 'email',
  password: 'mot_de_passe',
  password_confirmation: 'confirmation_mot_de_passe',
  confirmation_mot_de_passe: 'confirmation_mot_de_passe',
  nom: 'nom',
  prenom: 'prenom',
  telephone: 'telephone',
  date_naissance: 'date_naissance',
  atteste_age_minimum: 'atteste_age',
  accepte_conditions: 'accepte_conditions',
  accepteConditions: 'accepte_conditions',
  wilaya_residence: 'wilaya_residence',
  id_commune: 'id_commune',
  biographie: 'biographie',
  portfolio: 'portfolio',
  site_web: 'portfolio',
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { registerVisitor, registerProfessional, registerLoading } = useAuth();
  // Liste des wilayas : chargée par GeoSelector ; on attend seulement son chargement
  const { loading: wilayasLoading } = useWilayas();
  const antiRobot = useAntiRobot();

  const [userType, setUserType] = useState<'visiteur' | 'professionnel'>('visiteur');
  // Inscription rapide d'un visiteur : prénom, nom, e-mail, mot de passe. Genre, date de naissance,
  // wilaya et téléphone se complètent ensuite dans « Mon espace » (audit V11 UX-9)
  const estVisiteur = userType === 'visiteur';
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    nom: '',
    prenom: '',
    // Pas de genre choisi d'avance (avant : « Homme » déjà réglé)
    sexe: '' as '' | 'M' | 'F',
    date_naissance: '',
    email: '',
    mot_de_passe: '',
    confirmation_mot_de_passe: '',
    wilaya_residence: 0 as number | null,
    // Daïra / commune de résidence (commune obligatoire pour un professionnel)
    dairaId: null as number | null,
    id_commune: null as number | null,
    telephone: '',
    accepte_conditions: false,
    accepte_newsletter: false,
    // Visiteur sans date de naissance : « J'ai 13 ans ou plus »
    atteste_age: false,
    // Champs professionnels
    photo_url: '',
    biographie: '',
    secteur: '',
    portfolio: '',
    id_type_user: 0
  });

  // État pour l'upload de photo
  // Date de naissance : les trois listes séparément, la date complète seulement quand tout est choisi
  const [naissance, setNaissance] = useState({ jour: '', mois: '', annee: '' });
  const choisirNaissance = (partie: 'jour' | 'mois' | 'annee', valeur: string) => {
    const n = { ...naissance, [partie]: valeur };
    setNaissance(n);
    let date = '';
    if (n.jour && n.mois !== '' && n.annee) {
      const j = Number(n.jour), m = Number(n.mois), a = Number(n.annee);
      const valide = new Date(Date.UTC(a, m, j)).getUTCDate() === j;
      date = valide ? `${a}-${String(m + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}` : 'invalide';
    }
    setRegisterForm((f) => ({ ...f, date_naissance: date }));
    setRegisterErrors((e) => ({ ...e, date_naissance: '' }));
  };
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // État pour les erreurs de validation
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  // Refus du serveur sans champ précis : encadré au-dessus du bouton, qui reste affiché
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const refErreurServeur = useDefilerVersErreur(erreurServeur);
  // E-mail déjà utilisé : liens « Se connecter » et « Mot de passe oublié ? » sous le champ
  const [emailDejaPris, setEmailDejaPris] = useState(false);

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
        else if (!emailValide(registerForm.email)) error = t('auth.errors.emailInvalid');
        break;
      case 'mot_de_passe':
        error = erreurMotDePasse(registerForm.mot_de_passe, t) || '';
        break;
      case 'confirmation_mot_de_passe':
        if (registerForm.mot_de_passe && registerForm.mot_de_passe !== registerForm.confirmation_mot_de_passe) error = t('auth.errors.passwordMismatch');
        break;
      case 'telephone':
        if (!telephoneValide(registerForm.telephone)) {
          error = t('auth.errors.phoneInvalid', 'Numéro de téléphone invalide');
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
    } else if (!emailValide(registerForm.email)) {
      errors.email = t('auth.errors.emailInvalid');
    }
    
    // Règles communes du mot de passe (utils/motDePasse.ts)
    const problemeMdp = erreurMotDePasse(registerForm.mot_de_passe, t);
    if (problemeMdp) errors.mot_de_passe = problemeMdp;
    
    // Visiteur : un seul champ de mot de passe, avec le bouton « afficher » (pas de confirmation)
    if (!estVisiteur && registerForm.mot_de_passe !== registerForm.confirmation_mot_de_passe) {
      errors.confirmation_mot_de_passe = t('auth.errors.passwordMismatch');
    }

    if (estVisiteur) {
      if (!registerForm.atteste_age) {
        errors.atteste_age = t('auth.errors.minAge');
      }
    } else if (!registerForm.date_naissance) {
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
    
    if (!estVisiteur && registerForm.wilaya_residence === 0) {
      errors.wilaya_residence = t('auth.errors.wilayaRequired');
    }
    // Professionnel résidant en Algérie : commune obligatoire (proximité avec les lieux)
    if (userType === 'professionnel' && registerForm.wilaya_residence !== null && !registerForm.id_commune) {
      errors.id_commune = t('auth.errors.communeRequired', 'La commune est obligatoire pour un compte professionnel');
    }

    if (!estVisiteur && !telephoneValide(registerForm.telephone)) {
      errors.telephone = t('auth.errors.phoneInvalid', 'Numéro de téléphone invalide');
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

  /**
   * Inscription refusée : l'erreur va sous le champ concerné, sinon dans un encadré au-dessus du bouton,
   * qui reste affiché (avant : un bandeau de 5 secondes en haut de l'écran, audit V11 FRM-9).
   * E-mail déjà utilisé (code CONFLICT, et non plus des mots-clés français du message) : liens vers
   * la connexion et le mot de passe oublié, sous le champ e-mail.
   */
  const montrerEchec = (resultat: AuthResult) => {
    if (resultat.code === 'CONFLICT' || resultat.status === 409) {
      setEmailDejaPris(true);
      setRegisterErrors({ email: t('auth.errors.emailExistsDescription', 'Un compte existe déjà avec cette adresse email. Veuillez vous connecter ou utiliser une autre adresse.') });
      requestAnimationFrame(() => {
        const champ = document.getElementById('email');
        champ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        champ?.focus({ preventScroll: true });
      });
      return;
    }
    const parChamp: Record<string, string> = {};
    for (const d of resultat.champs || []) {
      const champ = d.field ? CHAMP_DU_SERVEUR[d.field] : undefined;
      if (champ && d.message && !parChamp[champ]) parChamp[champ] = d.message;
    }
    if (Object.keys(parChamp).length > 0) {
      setRegisterErrors(parChamp);
      requestAnimationFrame(() => {
        const premier = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
        premier?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        premier?.focus({ preventScroll: true });
      });
      return;
    }
    setErreurServeur(resultat.error || t('auth.errors.registrationErrorDescription', 'Une erreur est survenue lors de l\'inscription'));
  };

  // Soumission du formulaire d'inscription
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Erreurs de saisie : sous chaque champ, curseur sur le premier (plus de bandeau en double)
    setErreurServeur(null);
    if (!validateRegisterForm()) return;
    // Vérification anti-robots pas encore terminée : message sous la case (bouton plus grisé sans raison)
    if (!antiRobot.pretAEnvoyer()) return;

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
      const jeton = antiRobot.lireJeton();
      const commun = {
        nom: registerForm.nom.trim(),
        prenom: registerForm.prenom.trim(),
        email: registerForm.email.trim().toLowerCase(),
        mot_de_passe: registerForm.mot_de_passe,
        accepte_conditions: registerForm.accepte_conditions,
        accepte_newsletter: registerForm.accepte_newsletter || false,
        ...(jeton ? { turnstile_token: jeton } : {})
      };
      // Visiteur : inscription rapide, le reste du profil se complète ensuite
      const baseData = estVisiteur ? {
        ...commun,
        confirmation_mot_de_passe: registerForm.mot_de_passe,
        atteste_age_minimum: registerForm.atteste_age
      } : {
        ...commun,
        confirmation_mot_de_passe: registerForm.confirmation_mot_de_passe,
        ...(registerForm.sexe ? { sexe: registerForm.sexe } : {}),
        date_naissance: registerForm.date_naissance,
        wilaya_residence: registerForm.wilaya_residence !== null ? Number(registerForm.wilaya_residence) : null,
        ...(registerForm.id_commune ? { id_commune: registerForm.id_commune } : {}),
        // Saisi et validé mais jamais envoyé auparavant
        ...(normaliserTelephone(registerForm.telephone) ? { telephone: normaliserTelephone(registerForm.telephone) } : {})
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
          // Portfolio en ligne = site web du profil (affiché sur la page publique)
          ...(registerForm.portfolio.trim() ? { site_web: registerForm.portfolio.trim() } : {}),
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
        setNaissance({ jour: '', mois: '', annee: '' });
        setRegisterForm({
          nom: '',
          prenom: '',
          sexe: '',
          date_naissance: '',
          email: '',
          mot_de_passe: '',
          confirmation_mot_de_passe: '',
          wilaya_residence: 0,
          dairaId: null,
          id_commune: null,
          telephone: '',
          accepte_conditions: false,
          accepte_newsletter: false,
          atteste_age: false,
          photo_url: '',
          biographie: '',
          secteur: '',
          portfolio: '',
          id_type_user: 0
        });

        // La redirection sera gérée automatiquement par le hook useAuth
      } else {
        montrerEchec(registrationResult);
      }
    } catch (error: unknown) {
      montrerEchec({ success: false, error: messageErreurServeur(error, t('auth.errors.registrationErrorDescription', 'Une erreur est survenue lors de l\'inscription')) });
    } finally {
      setUploadingPhoto(false);
      // Un jeton ne sert qu'une fois
      antiRobot.reinitialiser();
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    <span>{t('auth.register.title')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* noValidate : les messages du site, traduits et sous les champs, remplacent la bulle du navigateur */}
                  <form onSubmit={handleRegister} className="space-y-6" noValidate>
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
                      {estVisiteur && (
                        <p className="text-sm text-muted-foreground">{t('auth.register.rapideAide', 'Quatre informations suffisent. Vous pourrez ajouter votre wilaya, votre date de naissance et votre téléphone plus tard, dans « Mon espace ».')}</p>
                      )}
                    </div>

                    {/* Formulaire commun */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="prenom" required>{t('auth.register.firstName')}</RequiredLabel>
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
                        <RequiredLabel htmlFor="nom" required>{t('auth.register.lastName')}</RequiredLabel>
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

                    {!estVisiteur && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sexe">{t('auth.register.gender')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                        <Select 
                          value={registerForm.sexe}
                          onValueChange={(value) => setRegisterForm({...registerForm, sexe: value as 'M' | 'F'})}
                        >
                          <SelectTrigger id="sexe">
                            <SelectValue placeholder={t('auth.register.genderChoose', 'Choisir')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">{t('auth.register.male')}</SelectItem>
                            <SelectItem value="F">{t('auth.register.female')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <RequiredLabel required>{t('auth.register.birthDate')}</RequiredLabel>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            aria-label={t('auth.register.day', 'Jour')}
                            aria-invalid={!!registerErrors.date_naissance}
                            aria-describedby={registerErrors.date_naissance ? 'auth-date-naissance-error' : undefined}
                            className={`p-2 border rounded-lg ${registerErrors.date_naissance ? 'border-destructive' : ''}`}
                            value={naissance.jour}
                            onChange={(e) => choisirNaissance('jour', e.target.value)}
                          >
                            <option value="">{t('auth.register.day', 'Jour')}</option>
                            {Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                          </select>
                          <select
                            aria-label={t('auth.register.month', 'Mois')}
                            className={`p-2 border rounded-lg ${registerErrors.date_naissance ? 'border-destructive' : ''}`}
                            value={naissance.mois}
                            onChange={(e) => choisirNaissance('mois', e.target.value)}
                          >
                            <option value="">{t('auth.register.month', 'Mois')}</option>
                            {[
                              t('common.months.jan', 'Janvier'), t('common.months.feb', 'Février'), t('common.months.mar', 'Mars'),
                              t('common.months.apr', 'Avril'), t('common.months.may', 'Mai'), t('common.months.jun', 'Juin'),
                              t('common.months.jul', 'Juillet'), t('common.months.aug', 'Août'), t('common.months.sep', 'Septembre'),
                              t('common.months.oct', 'Octobre'), t('common.months.nov', 'Novembre'), t('common.months.dec', 'Décembre')
                            ].map((m, i) => <option key={i} value={i}>{m}</option>)}
                          </select>
                          <select
                            aria-label={t('auth.register.year', 'Année')}
                            className={`p-2 border rounded-lg ${registerErrors.date_naissance ? 'border-destructive' : ''}`}
                            value={naissance.annee}
                            onChange={(e) => choisirNaissance('annee', e.target.value)}
                          >
                            <option value="">{t('auth.register.year', 'Année')}</option>
                            {Array.from({length: 80}, (_, i) => new Date().getFullYear() - 13 - i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        {registerErrors.date_naissance && (
                          <p id="auth-date-naissance-error" role="alert" className="text-sm text-destructive">{registerErrors.date_naissance}</p>
                        )}
                      </div>
                    </div>
                    )}

                    <div className="space-y-2">
                      <RequiredLabel htmlFor="email" required>{t('auth.register.email')}</RequiredLabel>
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
                          setEmailDejaPris(false);
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
                      {emailDejaPris && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={onSwitchToLogin}>
                            {t('auth.login.submit', 'Se connecter')}
                          </button>
                          <Link to="/forgot-password" className="font-medium text-primary underline underline-offset-2">
                            {t('auth.login.forgotPassword', 'Mot de passe oublié ?')}
                          </Link>
                        </div>
                      )}
                    </div>
                    
                    <div className={`grid grid-cols-1 gap-4 ${estVisiteur ? '' : 'sm:grid-cols-2'}`}>
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="password" required>{t('auth.register.password')}</RequiredLabel>
                        <p className="text-xs text-muted-foreground">{t('auth.register.passwordHint', '12 caractères min., 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial')}</p>
                        <div className="relative">
                        <Input
                          id="password"
                          type={voirMotDePasse ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={registerForm.mot_de_passe}
                          onChange={(e) => {
                            setRegisterForm({...registerForm, mot_de_passe: e.target.value});
                            setRegisterErrors({...registerErrors, mot_de_passe: ''});
                          }}
                          onBlur={() => validateRegisterField('mot_de_passe')}
                          className={`pe-11 ${registerErrors.mot_de_passe ? 'border-destructive' : ''}`}
                          required
                          minLength={12}
                          aria-invalid={!!registerErrors.mot_de_passe}
                          aria-describedby={registerErrors.mot_de_passe ? 'auth-mot-de-passe-error' : undefined}
                        />
                          <button
                            type="button"
                            onClick={() => setVoirMotDePasse((v) => !v)}
                            className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={voirMotDePasse ? t('auth.hidePassword', 'Masquer') : t('auth.showPassword', 'Afficher')}
                            aria-pressed={voirMotDePasse}
                          >
                            {voirMotDePasse ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                          </button>
                        </div>
                        <PasswordStrengthIndicator password={registerForm.mot_de_passe} />
                        {registerErrors.mot_de_passe && (
                          <p id="auth-mot-de-passe-error" role="alert" className="text-sm text-destructive">{registerErrors.mot_de_passe}</p>
                        )}
                      </div>
                      {!estVisiteur && (
                      <div className="space-y-2">
                        <RequiredLabel htmlFor="password-confirm" required>{t('auth.register.confirmPassword')}</RequiredLabel>
                        <Input
                          id="password-confirm"
                          type={voirMotDePasse ? 'text' : 'password'}
                          autoComplete="new-password"
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
                      )}
                    </div>
                    
                    {!estVisiteur && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={registerForm.wilaya_residence === null}
                            onChange={(e) => {
                              setRegisterForm({
                                ...registerForm,
                                wilaya_residence: e.target.checked ? null : 0,
                                dairaId: null,
                                id_commune: null
                              });
                              setRegisterErrors({ ...registerErrors, wilaya_residence: '', id_commune: '' });
                            }}
                          />
                          {t('auth.register.foreignResident', 'Étranger (hors Algérie)')}
                        </label>
                        {registerForm.wilaya_residence !== null && (
                          <GeoSelector
                            wilayaId={registerForm.wilaya_residence || null}
                            dairaId={registerForm.dairaId}
                            communeId={registerForm.id_commune}
                            onWilayaChange={(id) => {
                              setRegisterForm(prev => ({ ...prev, wilaya_residence: id || 0, dairaId: null, id_commune: null }));
                              setRegisterErrors(prev => ({ ...prev, wilaya_residence: '' }));
                            }}
                            onDairaChange={(id) => setRegisterForm(prev => ({ ...prev, dairaId: id, id_commune: null }))}
                            onCommuneChange={(id) => {
                              setRegisterForm(prev => ({ ...prev, id_commune: id }));
                              setRegisterErrors(prev => ({ ...prev, id_commune: '' }));
                            }}
                            requiredWilaya
                            requiredDaira={userType === 'professionnel'}
                            requiredCommune={userType === 'professionnel'}
                            errors={{ wilaya: registerErrors.wilaya_residence, commune: registerErrors.id_commune }}
                          />
                        )}
                        {registerErrors.wilaya_residence && (
                          <p id="auth-wilaya-error" role="alert" className="text-sm text-destructive">{registerErrors.wilaya_residence}</p>
                        )}
                        {registerErrors.id_commune && (
                          <p role="alert" className="text-sm text-destructive">{registerErrors.id_commune}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">{t('auth.register.phone')} <span className="text-muted-foreground font-normal">({t('common.optional')})</span></Label>
                        <PhoneInput
                          id="telephone"
                          value={registerForm.telephone || '+213 '}
                          onChange={(val) => {
                            setRegisterForm({...registerForm, telephone: val});
                            setRegisterErrors({...registerErrors, telephone: ''});
                          }}
                          onBlur={() => validateRegisterField('telephone')}
                          error={!!registerErrors.telephone}
                          placeholder="5XX XXX XXX"
                          autoComplete="tel"
                          maxLength={15}
                          aria-describedby={registerErrors.telephone ? 'auth-telephone-error' : 'auth-telephone-helper'}
                        />
                        <p id="auth-telephone-helper" className="text-xs text-muted-foreground">{t('common.phoneHelper')}</p>
                        {registerErrors.telephone && (
                          <p id="auth-telephone-error" role="alert" className="text-sm text-destructive">{registerErrors.telephone}</p>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Champs spécifiques aux professionnels */}
                    {userType === 'professionnel' && (
                      <div className="space-y-4 p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                        <h3 className="font-semibold text-secondary flex items-center">
                          <Palette className="h-5 w-5 me-2" />
                          {t('auth.register.professionalInfo')}
                        </h3>
                        
                        <div className="space-y-2">
                          <RequiredLabel htmlFor="secteur" required>{t('auth.register.sector')}</RequiredLabel>
                          <Select 
                            value={registerForm.secteur}
                            onValueChange={(value) => {
                              setRegisterForm({...registerForm, secteur: value});
                              setRegisterErrors({...registerErrors, secteur: ''});
                            }}
                            required={userType === 'professionnel'}
                          >
                            <SelectTrigger
                              id="secteur"
                              aria-required="true"
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
                                    e.currentTarget.src = '/images/default-avatar.svg';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={removePhoto}
                                  className="absolute -top-2 -end-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-sm"
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
                          <RequiredLabel htmlFor="biographie" required>{t('auth.register.biography')}</RequiredLabel>
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
                          <p className={`text-xs ${registerForm.biographie.length > 450 ? 'text-amber-500' : registerForm.biographie.length < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {registerForm.biographie.length}/500 {registerForm.biographie.length < 50 ? t('auth.register.min50chars', '(min 50 caractères)') : ''}
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
                        <p id="auth-conditions-error" role="alert" className="text-sm text-destructive ms-6">{registerErrors.accepte_conditions}</p>
                      )}

                      {estVisiteur && (
                        <>
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id="atteste-age"
                              checked={registerForm.atteste_age}
                              onCheckedChange={(checked) => {
                                setRegisterForm({ ...registerForm, atteste_age: !!checked });
                                setRegisterErrors({ ...registerErrors, atteste_age: '' });
                              }}
                              className={registerErrors.atteste_age ? 'border-destructive' : ''}
                              aria-invalid={!!registerErrors.atteste_age}
                              aria-describedby={registerErrors.atteste_age ? 'auth-age-error' : undefined}
                            />
                            <Label htmlFor="atteste-age" className="text-sm cursor-pointer">
                              {t('auth.register.atteste13Ans', 'J’ai 13 ans ou plus')} *
                            </Label>
                          </div>
                          {registerErrors.atteste_age && (
                            <p id="auth-age-error" role="alert" className="text-sm text-destructive ms-6">{registerErrors.atteste_age}</p>
                          )}
                        </>
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
                    
                    <AntiRobot ref={antiRobot.ref} action="inscription" onJeton={antiRobot.setJeton} attente={antiRobot.attente} />

                    {erreurServeur && (
                      <Alert ref={refErreurServeur} variant="destructive" role="alert">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{erreurServeur}</AlertDescription>
                      </Alert>
                    )}

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
  );
};

export default RegisterForm;
