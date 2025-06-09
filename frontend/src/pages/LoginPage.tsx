import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiException } from '../services/api.service';
import {
  HiOutlineEnvelope as Email,
  HiOutlineLockClosed as Lock,
  HiOutlineEye as Eye,
  HiOutlineEyeSlash as EyeOff,
  HiArrowLeft,
  HiArrowPath
} from 'react-icons/hi2';

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAdmin, isProfessional } = useAuth();
  
  // États du formulaire
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/');

  // Styles personnalisés
  const customStyles = {
    bgPrimary: 'bg-[#f8fbfa]',
    textPrimary: 'text-[#0e1a13]',
    textSecondary: 'text-[#51946b]',
    bgSecondary: 'bg-[#e8f2ec]',
    bgAccent: 'bg-[#eb9f13]',
    borderColor: 'border-[#e8f2ec]',
    hoverAccent: 'hover:text-[#eb9f13]',
    textAccent: 'text-[#eb9f13]',
    inputBorder: 'border-[#dde0e3]',
    inputFocus: 'focus:border-[#eb9f13]',
    textMuted: 'text-[#6a7581]'
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestion de la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    
    try {
      const response = await login(formData);
      
      console.log('Connexion réussie:', response);
      
      // Déterminer le chemin de redirection selon le type d'utilisateur
      let redirectTo = '/';
      
      if (isAdmin) {
        redirectTo = '/admin';
      } else if (isProfessional) {
        // Vérifier si le compte professionnel est validé
        const user = response.user;
        if (user.professionnelValide === false) {
          setErrors({ 
            general: 'Votre compte professionnel est en attente de validation. Vous recevrez un email une fois validé.' 
          });
          setIsLoading(false);
          return;
        }
        redirectTo = '/profil';
      }
      
      setRedirectPath(redirectTo);
      setLoginSuccess(true);
      
      // Redirection après un court délai
      setTimeout(() => {
        navigate(redirectTo);
      }, 1500);
      
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      
      let errorMessage = 'Erreur de connexion';
      
      if (error instanceof ApiException) {
        if (error.status === 401) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.status === 403) {
          errorMessage = 'Votre compte a été suspendu. Contactez un administrateur.';
        } else if (error.status === 429) {
          errorMessage = 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion des changements d'input
  const handleChange = (field: keyof LoginCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Effacer l'erreur du champ
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Si connexion réussie, afficher un message de succès
  if (loginSuccess) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${customStyles.bgPrimary}`}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold ${customStyles.textPrimary}`}>
            Connexion réussie !
          </h2>
          <p className={customStyles.textMuted}>
            Redirection vers {redirectPath === '/admin' ? 'le tableau de bord' : 'votre profil'}...
          </p>
          <div className="flex items-center justify-center gap-2">
            <HiArrowPath className="w-5 h-5 animate-spin text-[#eb9f13]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex size-full min-h-screen flex-col ${customStyles.bgPrimary} group/design-root overflow-x-hidden`} style={{ fontFamily: '"Noto Serif", "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        
        {/* Header simplifié */}
        <header className={`flex items-center justify-between whitespace-nowrap border-b border-solid ${customStyles.borderColor} px-10 py-3`}>
          <a href="/" className={`flex items-center gap-4 ${customStyles.textPrimary}`}>
            <div className="size-4">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2 className={`${customStyles.textPrimary} text-lg font-bold leading-tight tracking-[-0.015em]`}>Timlilit Culture</h2>
          </a>
          
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 ${customStyles.textSecondary} text-sm font-medium ${customStyles.hoverAccent} transition-colors`}
          >
            <HiArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </button>
        </header>

        {/* Contenu principal */}
        <div className="px-4 sm:px-10 lg:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-[512px] py-5">
            
            {/* Titre avec motif berbère */}
            <div className="text-center mb-8">
              <div className="inline-block relative">
                <h2 className={`${customStyles.textPrimary} tracking-light text-[28px] sm:text-[32px] font-bold leading-tight px-4 pb-3 pt-5`}>
                  Bon retour parmi nous
                </h2>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-[#eb9f13] to-transparent"></div>
              </div>
              <p className={`${customStyles.textMuted} text-base mt-4`}>
                Connectez-vous pour accéder à votre espace culturel
              </p>
            </div>

            {/* Message d'erreur général */}
            {errors.general && (
              <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4">
                <label className="flex flex-col min-w-40 flex-1">
                  <span className={`${customStyles.textPrimary} text-sm font-medium mb-2`}>Email</span>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="votre.email@exemple.com"
                      className={`
                        form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl 
                        ${customStyles.textPrimary} focus:outline-0 focus:ring-2 focus:ring-[#eb9f13]/20
                        border ${errors.email ? 'border-red-500' : customStyles.inputBorder} 
                        bg-white ${customStyles.inputFocus} h-14 
                        placeholder:text-gray-400 pl-12 pr-4 py-[15px] 
                        text-base font-normal leading-normal transition-all
                      `}
                      value={formData.email}
                      onChange={handleChange('email')}
                      disabled={isLoading}
                    />
                    <Email className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${customStyles.textMuted}`} />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </label>
              </div>

              {/* Mot de passe */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4">
                <label className="flex flex-col min-w-40 flex-1">
                  <span className={`${customStyles.textPrimary} text-sm font-medium mb-2`}>Mot de passe</span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`
                        form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl 
                        ${customStyles.textPrimary} focus:outline-0 focus:ring-2 focus:ring-[#eb9f13]/20
                        border ${errors.password ? 'border-red-500' : customStyles.inputBorder} 
                        bg-white ${customStyles.inputFocus} h-14 
                        placeholder:text-gray-400 pl-12 pr-12 py-[15px] 
                        text-base font-normal leading-normal transition-all
                      `}
                      value={formData.password}
                      onChange={handleChange('password')}
                      disabled={isLoading}
                    />
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${customStyles.textMuted}`} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 ${customStyles.textMuted} hover:text-gray-700 transition-colors`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </label>
              </div>

              {/* Mot de passe oublié */}
              <div className="px-4">
                <a 
                  href="/mot-de-passe-oublie" 
                  className={`${customStyles.textAccent} text-sm font-normal hover:underline`}
                >
                  Mot de passe oublié ?
                </a>
              </div>

              {/* Bouton de connexion */}
              <div className="flex px-4 py-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`
                    flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center 
                    overflow-hidden rounded-full h-12 px-6 flex-1 ${customStyles.bgAccent} 
                    ${customStyles.textPrimary} text-base font-bold leading-normal tracking-[0.015em]
                    hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <HiArrowPath className="w-5 h-5 animate-spin" />
                      <span>Connexion...</span>
                    </div>
                  ) : (
                    <span>Se connecter</span>
                  )}
                </button>
              </div>

              {/* Divider avec motif berbère */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center px-4">
                  <div className="w-full border-t border-[#e8f2ec]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-4 ${customStyles.bgPrimary} ${customStyles.textMuted}`}>ou</span>
                </div>
              </div>

              {/* Lien inscription */}
              <p className={`${customStyles.textMuted} text-sm font-normal text-center`}>
                Nouveau sur Timlilit Culture ?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/inscription')}
                  className={`${customStyles.textAccent} font-medium hover:underline`}
                >
                  Créez votre compte
                </button>
              </p>

              {/* Message d'invitation */}
              <div className={`mx-4 mt-6 p-4 ${customStyles.bgSecondary} rounded-lg text-center`}>
                <p className={`${customStyles.textPrimary} text-sm`}>
                  Rejoignez notre communauté pour préserver et partager le patrimoine culturel algérien
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Footer minimal */}
        <footer className="border-t border-[#e8f2ec] py-6">
          <p className={`text-center ${customStyles.textMuted} text-sm`}>
            @2024 Timlilit Culture. Tous droits réservés.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;