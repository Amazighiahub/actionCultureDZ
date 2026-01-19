// utils/index.ts - Utilitaires principaux exportés

// =============================================================================
// FORMATAGE ET AFFICHAGE
// =============================================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
export const formatting = {
  // Formatage des dates
  date: {
    format(date: string | Date, format: 'short' | 'long' | 'time' | 'datetime' = 'short'): string {
      if (!date) return '';
      
      const d = typeof date === 'string' ? new Date(date) : date;
      const locale = 'fr-FR';
      
      switch (format) {
        case 'short':
          return d.toLocaleDateString(locale);
        case 'long':
          return d.toLocaleDateString(locale, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'time':
          return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        case 'datetime':
          return d.toLocaleString(locale);
        default:
          return d.toLocaleDateString(locale);
      }
    },

    isToday(date: string | Date): boolean {
      const d = typeof date === 'string' ? new Date(date) : date;
      const today = new Date();
      return d.toDateString() === today.toDateString();
    },

    isUpcoming(date: string | Date): boolean {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d > new Date();
    },

    isPast(date: string | Date): boolean {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d < new Date();
    },

    timeAgo(date: string | Date): string {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 0) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      if (diffHours > 0) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (diffMinutes > 0) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      return 'À l\'instant';
    }
  },

  // Formatage des nombres
  number: {
    format(num: number, options: Intl.NumberFormatOptions = {}): string {
      return new Intl.NumberFormat('fr-FR', options).format(num);
    },

    currency(amount: number, currency = 'DZD'): string {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency
      }).format(amount);
    },

    percentage(value: number, decimals = 1): string {
      return `${value.toFixed(decimals)}%`;
    },

    fileSize(bytes: number): string {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  },

  // Formatage du texte
  text: {
    truncate(text: string, length: number, suffix = '...'): string {
      if (!text) return '';
      if (text.length <= length) return text;
      return text.substring(0, length) + suffix;
    },

    capitalize(text: string): string {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    titleCase(text: string): string {
      if (!text) return '';
      return text.replace(/\w\S*/g, txt => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    },

    slug(text: string): string {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9 -]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens
        .trim();
    },

    normalizeForSearch(text: string): string {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Keep only letters, numbers, spaces
        .trim();
    },

    excerpt(text: string, maxLength = 160): string {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      
      // Couper au dernier espace avant la limite
      const truncated = text.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      
      return lastSpace > 0 
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
    }
  }
};

// =============================================================================
// VALIDATION
// =============================================================================

export const validation = {
  email(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone(phone: string): boolean {
    // Format algérien: +213 ou 0 suivi de 9 chiffres
    const phoneRegex = /^(\+213|0)[1-9][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  password(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    return { valid: errors.length === 0, errors };
  },

  required(value: any): boolean {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  },

  minLength(value: string, min: number): boolean {
    return value && value.length >= min;
  },

  maxLength(value: string, max: number): boolean {
    return !value || value.length <= max;
  },

  isNumeric(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  },

  isYear(value: string | number): boolean {
    const year = typeof value === 'string' ? parseInt(value) : value;
    const currentYear = new Date().getFullYear();
    return year >= 1000 && year <= currentYear + 10;
  },

  isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
};

// =============================================================================
// PERFORMANCE
// =============================================================================

export const performance = {
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// =============================================================================
// GÉOLOCALISATION
// =============================================================================

export const geo = {
  // Calculer la distance entre deux points (formule de Haversine)
  calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  },

  // Vérifier si un point est dans un rayon donné
  isWithinRadius(
    centerLat: number, centerLng: number,
    pointLat: number, pointLng: number,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(centerLat, centerLng, pointLat, pointLng);
    return distance <= radiusKm;
  },

  // Obtenir la position de l'utilisateur
  async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
};

// =============================================================================
// GESTION D'ERREURS
// =============================================================================

export const errorHandling = {
  getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (error?.response?.data?.error) return error.response.data.error;
    return 'Une erreur est survenue';
  },

  isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('Network Error') ||
           !navigator.onLine;
  },

  isAuthError(error: any): boolean {
    return error?.status === 401 || error?.response?.status === 401;
  },

  logError(error: any, context?: string): void {
    const errorInfo = {
      message: this.getErrorMessage(error),
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Application Error:', errorInfo);
    
    // En production, vous pourriez envoyer à un service de logging
    if (process.env.NODE_ENV === 'production') {
      // sendToErrorReportingService(errorInfo);
    }
  }
};

// =============================================================================
// UTILITAIRES URL ET NAVIGATION
// =============================================================================

export const navigation = {
  getQueryParams(): URLSearchParams {
    return new URLSearchParams(window.location.search);
  },

  setQueryParam(key: string, value: string): void {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
  },

  removeQueryParam(key: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    window.history.replaceState({}, '', url.toString());
  },

  buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  },

  downloadFile(data: any, filename: string, type = 'application/json'): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  copyToClipboard(text: string): Promise<boolean> {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => false);
  }
};

// =============================================================================
// UTILITAIRES SPÉCIFIQUES ALGÉRIE
// =============================================================================

export const algeria = {
  // Formater les numéros de téléphone algériens
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Nettoyer le numéro
    const cleaned = phone.replace(/\D/g, '');
    
    // Format: +213 XX XX XX XX XX
    if (cleaned.startsWith('213')) {
      const number = cleaned.substring(3);
      return `+213 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)} ${number.substring(8)}`;
    }
    
    // Format: 0X XX XX XX XX
    if (cleaned.startsWith('0')) {
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`;
    }
    
    return phone;
  },

  // Obtenir le nom de la wilaya par son code
  getWilayaName(code: number): string {
    const wilayas: Record<number, string> = {
      1: 'Adrar', 2: 'Chlef', 3: 'Laghouat', 4: 'Oum El Bouaghi',
      5: 'Batna', 6: 'Béjaïa', 7: 'Biskra', 8: 'Béchar',
      9: 'Blida', 10: 'Bouira', 11: 'Tamanrasset', 12: 'Tébessa',
      13: 'Tlemcen', 14: 'Tiaret', 15: 'Tizi Ouzou', 16: 'Alger',
      17: 'Djelfa', 18: 'Jijel', 19: 'Sétif', 20: 'Saïda',
      21: 'Skikda', 22: 'Sidi Bel Abbès', 23: 'Annaba', 24: 'Guelma',
      25: 'Constantine', 26: 'Médéa', 27: 'Mostaganem', 28: 'M\'Sila',
      29: 'Mascara', 30: 'Ouargla', 31: 'Oran', 32: 'El Bayadh',
      33: 'Illizi', 34: 'Bordj Bou Arréridj', 35: 'Boumerdès', 36: 'El Tarf',
      37: 'Tindouf', 38: 'Tissemsilt', 39: 'El Oued', 40: 'Khenchela',
      41: 'Souk Ahras', 42: 'Tipaza', 43: 'Mila', 44: 'Aïn Defla',
      45: 'Naâma', 46: 'Aïn Témouchent', 47: 'Ghardaïa', 48: 'Relizane'
    };
    return wilayas[code] || 'Wilaya inconnue';
  },

  // Vérifier si une date correspond au calendrier berbère
  isBerberNewYear(date: Date): boolean {
    return date.getMonth() === 0 && date.getDate() === 12; // 12 janvier
  },

  // Formater une adresse complète algérienne
  formatAddress(components: {
    address?: string;
    locality?: string;
    commune?: string;
    daira?: string;
    wilaya?: string;
  }): string {
    const parts = [
      components.address,
      components.locality,
      components.commune,
      components.daira,
      components.wilaya
    ].filter(Boolean);
    
    return parts.join(', ');
  }
};

// =============================================================================
// EXPORT PRINCIPAL
// =============================================================================

export const utils = {
  formatting,
  validation,
  performance,
  geo,
  errorHandling,
  navigation,
  algeria,
  
  // Alias courts pour les plus utilisés
  format: formatting,
  validate: validation,
  text: formatting.text,
  date: formatting.date,
  number: formatting.number
} as const;

// Export par défaut
export default utils;
