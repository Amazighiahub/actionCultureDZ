/**
 * RegisterForm - Formulaire d'inscription
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/UI/card';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Label } from '@/components/UI/label';
import { Textarea } from '@/components/UI/textarea';
import { Checkbox } from '@/components/UI/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/UI/radio-group';
import { Alert, AlertDescription } from '@/components/UI/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/UI/select';
import { 
  User, Palette, Mail, Lock, UserPlus, Upload, 
  Loader2, AlertCircle, X, Check 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWilayas } from '@/hooks/useGeographie';
import { useToast } from '@/components/UI/use-toast';
import { LazyImage } from '@/components/shared';

// Options de secteur
const SECTEUR_OPTIONS = [
  { value: 'artiste', label: 'Artiste' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'musicien', label: 'Musicien' },
  { value: 'ecrivain', label: 'Écrivain' },
  { value: 'cineaste', label: 'Cinéaste' },
  { value: 'photographe', label: 'Photographe' },
  { value: 'organisateur', label: 'Organisateur d\'événements' },
  { value: 'guide', label: 'Guide touristique' },
  { value: 'autre', label: 'Autre' }
];

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { registerVisitor, registerProfessional, registerLoading } = useAuth();
  const { wilayas, loading: wilayasLoading } = useWilayas();

  // Type d'utilisateur
  const [userType, setUserType] = useState<'visiteur' | 'professionnel'>('visiteur');

  // État du formulaire
  const [formData, setFormData] = useState({
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
    biographie: '',
    secteur: '',
    portfolio: ''
  });

  // Photo de profil
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Erreurs
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Gestion de la photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('auth.errors.fileTooLarge.title', 'Fichier trop volumineux'),
          description: t('auth.errors.fileTooLarge.description', 'Max 5 MB'),
          variant: 'destructive'
        });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Mise à jour du formulaire
  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom) newErrors.nom = t('auth.errors.required', 'Champ requis');
    if (!formData.prenom) newErrors.prenom = t('auth.errors.required', 'Champ requis');
    if (!formData.email) {
      newErrors.email = t('auth.errors.required', 'Champ requis');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid', 'Email invalide');
    }
    if (!formData.mot_de_passe) {
      newErrors.mot_de_passe = t('auth.errors.required', 'Champ requis');
    } else if (formData.mot_de_passe.length < 12) {
      newErrors.mot_de_passe = t('auth.errors.passwordTooShort', 'Minimum 12 caractères');
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.mot_de_passe)) {
      newErrors.mot_de_passe = t('auth.errors.passwordNoSpecialChar', 'Doit contenir un caractère spécial');
    }
    if (formData.mot_de_passe !== formData.confirmation_mot_de_passe) {
      newErrors.confirmation_mot_de_passe = t('auth.errors.passwordMismatch', 'Les mots de passe ne correspondent pas');
    }
    if (!formData.accepte_conditions) {
      newErrors.accepte_conditions = t('auth.errors.acceptTerms', 'Vous devez accepter les conditions');
    }

    if (userType === 'professionnel') {
      if (!formData.secteur) newErrors.secteur = t('auth.errors.required', 'Champ requis');
      if (!formData.biographie || formData.biographie.length < 50) {
        newErrors.biographie = t('auth.errors.biographyTooShort', 'Minimum 50 caractères');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Traduire les erreurs du backend
  const getRegisterErrorMessage = (error: string): string => {
    const errorMappings: Record<string, string> = {
      'Cet email est déjà utilisé': t('auth.errors.emailExists', 'Cet email est déjà utilisé'),
      'Email already exists': t('auth.errors.emailExists', 'Cet email est déjà utilisé'),
      'Email déjà utilisé': t('auth.errors.emailExists', 'Cet email est déjà utilisé'),
      'Un compte existe déjà': t('auth.errors.emailExists', 'Un compte existe déjà avec cet email'),
      'Mot de passe trop court': t('auth.errors.passwordTooShort', 'Le mot de passe doit contenir au moins 8 caractères'),
      'Password too short': t('auth.errors.passwordTooShort', 'Le mot de passe doit contenir au moins 8 caractères'),
      'Données invalides': t('auth.errors.invalidData', 'Données invalides. Vérifiez le formulaire.'),
      'Invalid data': t('auth.errors.invalidData', 'Données invalides. Vérifiez le formulaire.'),
    };

    for (const [key, value] of Object.entries(errorMappings)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return error || t('auth.errors.serverError', 'Erreur serveur');
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const registerFn = userType === 'visiteur' ? registerVisitor : registerProfessional;
      const result = await registerFn(formData);

      if (result.success) {
        toast({
          title: t('auth.success.registerTitle', 'Compte créé !'),
          description: userType === 'professionnel'
            ? t('auth.success.professionalRegistration', 'Votre compte professionnel a été créé et est en attente de validation.')
            : t('auth.success.visitorRegistration', 'Vérifiez votre email pour activer votre compte.')
        });
        // La redirection est gérée par le hook useAuth
      } else {
        // Utiliser le message d'erreur spécifique du backend
        const errorMessage = getRegisterErrorMessage(result.error || '');

        toast({
          title: t('auth.errors.registerError', 'Erreur d\'inscription'),
          description: errorMessage,
          variant: 'destructive'
        });

        // Afficher l'erreur sur le champ email si c'est lié à l'email
        if (result.error?.toLowerCase().includes('email')) {
          setErrors({ ...errors, email: errorMessage });
        }
      }
    } catch (error: any) {
      toast({
        title: t('auth.errors.registerError', 'Erreur'),
        description: t('auth.errors.serverError', 'Erreur serveur. Veuillez réessayer.'),
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-serif">
          {t('auth.register.welcome', 'Rejoignez-nous')}
        </CardTitle>
        <CardDescription>
          {t('auth.register.chooseType', 'Choisissez votre type de compte')}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Sélection du type de compte */}
          <RadioGroup
            value={userType}
            onValueChange={(v) => setUserType(v as 'visiteur' | 'professionnel')}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="visiteur"
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                userType === 'visiteur' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              }`}
            >
              <RadioGroupItem value="visiteur" id="visiteur" />
              <User className="h-5 w-5" />
              <div>
                <p className="font-medium">{t('auth.register.visitor', 'Visiteur')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('auth.register.visitorDesc', 'Découvrez la culture')}
                </p>
              </div>
            </Label>

            <Label
              htmlFor="professionnel"
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                userType === 'professionnel' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              }`}
            >
              <RadioGroupItem value="professionnel" id="professionnel" />
              <Palette className="h-5 w-5" />
              <div>
                <p className="font-medium">{t('auth.register.professional', 'Professionnel')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('auth.register.professionalDesc', 'Partagez vos créations')}
                </p>
              </div>
            </Label>
          </RadioGroup>

          {/* Champs de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">{t('auth.fields.firstName', 'Prénom')} *</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => updateField('prenom', e.target.value)}
                className={errors.prenom ? 'border-destructive' : ''}
              />
              {errors.prenom && <p className="text-sm text-destructive">{errors.prenom}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom">{t('auth.fields.lastName', 'Nom')} *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => updateField('nom', e.target.value)}
                className={errors.nom ? 'border-destructive' : ''}
              />
              {errors.nom && <p className="text-sm text-destructive">{errors.nom}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.fields.email', 'Email')} *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {/* Mots de passe */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.fields.password', 'Mot de passe')} *</Label>
              <Input
                id="password"
                type="password"
                value={formData.mot_de_passe}
                onChange={(e) => updateField('mot_de_passe', e.target.value)}
                className={errors.mot_de_passe ? 'border-destructive' : ''}
              />
              {errors.mot_de_passe && <p className="text-sm text-destructive">{errors.mot_de_passe}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.fields.confirmPassword', 'Confirmer')} *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmation_mot_de_passe}
                onChange={(e) => updateField('confirmation_mot_de_passe', e.target.value)}
                className={errors.confirmation_mot_de_passe ? 'border-destructive' : ''}
              />
              {errors.confirmation_mot_de_passe && (
                <p className="text-sm text-destructive">{errors.confirmation_mot_de_passe}</p>
              )}
            </div>
          </div>

          {/* Wilaya */}
          <div className="space-y-2">
            <Label>{t('auth.fields.wilaya', 'Wilaya de résidence')}</Label>
            <Select
              value={formData.wilaya_residence?.toString()}
              onValueChange={(v) => updateField('wilaya_residence', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select', 'Sélectionner')} />
              </SelectTrigger>
              <SelectContent>
                {wilayas?.map((w) => (
                  <SelectItem key={w.id_wilaya} value={w.id_wilaya.toString()}>
                    {w.codeW} - {w.wilaya_name_ascii}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Champs professionnels */}
          {userType === 'professionnel' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-medium">{t('auth.register.professionalInfo', 'Informations professionnelles')}</h3>

              <div className="space-y-2">
                <Label>{t('auth.fields.sector', 'Secteur d\'activité')} *</Label>
                <Select
                  value={formData.secteur}
                  onValueChange={(v) => updateField('secteur', v)}
                >
                  <SelectTrigger className={errors.secteur ? 'border-destructive' : ''}>
                    <SelectValue placeholder={t('common.select', 'Sélectionner')} />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTEUR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.secteur && <p className="text-sm text-destructive">{errors.secteur}</p>}
              </div>

              <div className="space-y-2">
                <Label>{t('auth.fields.biography', 'Biographie')} *</Label>
                <Textarea
                  value={formData.biographie}
                  onChange={(e) => updateField('biographie', e.target.value)}
                  placeholder={t('auth.fields.biographyPlaceholder', 'Décrivez votre parcours...')}
                  className={`min-h-[100px] ${errors.biographie ? 'border-destructive' : ''}`}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.biographie.length}/500 caractères
                </p>
                {errors.biographie && <p className="text-sm text-destructive">{errors.biographie}</p>}
              </div>

              {/* Photo de profil */}
              <div className="space-y-2">
                <Label>{t('auth.fields.photo', 'Photo de profil')}</Label>
                <div className="flex items-center gap-4">
                  {photoPreview && (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditions */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="conditions"
                checked={formData.accepte_conditions}
                onCheckedChange={(c) => updateField('accepte_conditions', !!c)}
                className={errors.accepte_conditions ? 'border-destructive' : ''}
              />
              <Label htmlFor="conditions" className="text-sm leading-tight cursor-pointer">
                {t('auth.register.acceptTerms', 'J\'accepte les conditions d\'utilisation')} *
              </Label>
            </div>
            {errors.accepte_conditions && (
              <p className="text-sm text-destructive">{errors.accepte_conditions}</p>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="newsletter"
                checked={formData.accepte_newsletter}
                onCheckedChange={(c) => updateField('accepte_newsletter', !!c)}
              />
              <Label htmlFor="newsletter" className="text-sm leading-tight cursor-pointer">
                {t('auth.register.newsletter', 'Recevoir la newsletter')}
              </Label>
            </div>
          </div>

          {/* Alerte pro */}
          {userType === 'professionnel' && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {t('auth.register.professionalNote', 'Votre compte sera validé par un administrateur.')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={registerLoading}>
            {registerLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('auth.register.loading', 'Création...')}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('auth.register.submit', 'Créer mon compte')}
              </>
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            {t('auth.register.hasAccount', 'Déjà un compte ?')}{' '}
            <Button variant="link" className="p-0 h-auto" type="button" onClick={onSwitchToLogin}>
              {t('auth.register.login', 'Se connecter')}
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default RegisterForm;
