// utils/config-validator.ts - Validation de la configuration au démarrage

import React from 'react';
import { ENV, APP_CONFIG } from '../config';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide la configuration de l'application
 */
export class ConfigValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Lance la validation complète
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Validation des variables requises
    this.validateRequiredVars();
    
    // Validation des URLs
    this.validateUrls();
    
    // Validation des limites
    this.validateLimits();
    
    // Validation de l'environnement
    this.validateEnvironment();
    
    // Avertissements pour la production
    this.checkProductionWarnings();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Valide les variables requises
   */
  private validateRequiredVars(): void {
    const required = [
      { key: 'API_URL', value: ENV.API_URL },
      { key: 'APP_NAME', value: ENV.APP_NAME },
      { key: 'APP_VERSION', value: ENV.APP_VERSION }
    ];

    required.forEach(({ key, value }) => {
      if (!value) {
        this.errors.push(`Variable requise manquante: VITE_${key}`);
      }
    });
  }

  /**
   * Valide les URLs
   */
  private validateUrls(): void {
    const urls = [
      { name: 'API_URL', value: ENV.API_URL },
      { name: 'UPLOAD_URL', value: ENV.UPLOAD_URL }
    ];

    urls.forEach(({ name, value }) => {
      if (value && !this.isValidUrl(value)) {
        this.errors.push(`URL invalide pour ${name}: ${value}`);
      }
    });

    // Vérifier la cohérence des URLs
    if (ENV.API_URL && ENV.UPLOAD_URL) {
      const apiDomain = new URL(ENV.API_URL).hostname;
      const uploadDomain = new URL(ENV.UPLOAD_URL).hostname;
      
      if (apiDomain !== uploadDomain && ENV.IS_PRODUCTION) {
        this.warnings.push(
          'Les domaines API et Upload sont différents. ' +
          'Assurez-vous que CORS est correctement configuré.'
        );
      }
    }
  }

  /**
   * Valide les limites
   */
  private validateLimits(): void {
    if (APP_CONFIG.limits.fileSize <= 0) {
      this.errors.push('La taille maximale de fichier doit être positive');
    }

    if (APP_CONFIG.limits.fileSize > 100 * 1024 * 1024) {
      this.warnings.push('Taille de fichier très élevée (>100MB), peut causer des problèmes');
    }

    if (APP_CONFIG.api.timeout < 5000) {
      this.warnings.push('Timeout API très court (<5s), peut causer des timeouts');
    }
  }

  /**
   * Valide l'environnement
   */
  private validateEnvironment(): void {
    const validEnvs = ['development', 'production', 'staging', 'test'];
    const appEnv = import.meta.env.VITE_APP_ENV;
    
    if (appEnv && !validEnvs.includes(appEnv)) {
      this.warnings.push(`Environnement non standard: ${appEnv}`);
    }

    // Vérifier la cohérence avec Vite
    if (ENV.IS_PRODUCTION && appEnv === 'development') {
      this.errors.push('Incohérence: Mode production mais APP_ENV=development');
    }

    if (ENV.IS_DEVELOPMENT && appEnv === 'production') {
      this.errors.push('Incohérence: Mode développement mais APP_ENV=production');
    }
  }

  /**
   * Avertissements spécifiques à la production
   */
  private checkProductionWarnings(): void {
    if (ENV.IS_PRODUCTION) {
      // Debug activé en production
      if (APP_CONFIG.features.debug) {
        this.warnings.push('Mode debug activé en production');
      }

      // URL localhost en production
      if (ENV.API_URL.includes('localhost') || ENV.API_URL.includes('127.0.0.1')) {
        this.errors.push('URL localhost détectée en production');
      }

      // HTTPS requis en production
      if (!ENV.API_URL.startsWith('https://')) {
        this.warnings.push('HTTPS recommandé pour l\'API en production');
      }

      // Analytics désactivées
      if (!APP_CONFIG.features.analytics) {
        this.warnings.push('Analytics désactivées en production');
      }
    }
  }

  /**
   * Vérifie si une URL est valide
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Affiche le résultat de la validation dans la console
 */
export function displayValidationResult(result: ValidationResult): void {
  const styles = {
    error: 'color: #ff4444; font-weight: bold;',
    warning: 'color: #ff9800; font-weight: bold;',
    success: 'color: #4caf50; font-weight: bold;',
    info: 'color: #2196f3;'
  };

  console.group('%c🔍 Validation de la configuration', styles.info);

  if (result.errors.length > 0) {
    console.group('%c❌ Erreurs', styles.error);
    result.errors.forEach(error => console.error(error));
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group('%c⚠️  Avertissements', styles.warning);
    result.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }

  if (result.valid) {
    console.log('%c✅ Configuration valide', styles.success);
  } else {
    console.log('%c❌ Configuration invalide', styles.error);
  }

  console.groupEnd();
}

/**
 * Lance la validation et affiche les résultats
 */
export function validateConfig(): boolean {
  const validator = new ConfigValidator();
  const result = validator.validate();
  
  if (ENV.IS_DEVELOPMENT || APP_CONFIG.features.debug) {
    displayValidationResult(result);
  }
  
  return result.valid;
}

/**
 * Hook React pour valider la configuration au montage
 */
export function useConfigValidation(): ValidationResult {
  const [result, setResult] = React.useState<ValidationResult>({
    valid: true,
    errors: [],
    warnings: []
  });

  React.useEffect(() => {
    const validator = new ConfigValidator();
    const validationResult = validator.validate();
    setResult(validationResult);
    
    if (ENV.IS_DEVELOPMENT) {
      displayValidationResult(validationResult);
    }
  }, []);

  return result;
}

// Auto-validation au chargement en développement
if (ENV.IS_DEVELOPMENT && typeof window !== 'undefined') {
  // Attendre que l'app soit chargée
  setTimeout(() => {
    validateConfig();
  }, 1000);
}

export default ConfigValidator;