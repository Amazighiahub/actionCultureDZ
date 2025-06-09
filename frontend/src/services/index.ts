
// src/services/index.ts - Point d'entrée pour tous les services

// ==========================================================================
// EXPORT DU CLIENT API
// ==========================================================================
export { apiClient } from './api/client';

// ==========================================================================
// EXPORT DES SERVICES MÉTIER
// ==========================================================================
export { authService } from './api/auth';
export { OeuvreService } from './api/oeuvres';
export { evenementService } from './api/evenements';
export { patrimoineService } from './api/patrimoine';
export { metadataService } from './api/metadata';

// ==========================================================================
// EXPORT DES HOOKS
// ==========================================================================
export { 
  useApi, 
  
} from '../hooks/useApi';

export { 
  useAuth, 
  
} from '../hooks/useAuth';

export { 
  useMetadata, 
  useLangues, 
  useCategories, 
  useGeography,
  useOeuvreMetadata,
  useEvenementMetadata,
  useMetadataStatistics,
  useMetadataValidator 
} from '../hooks/useMetadata';

import {  authService } from '../services/api/auth';

import { evenementService } from '@/services/api/evenements';
import { patrimoineService } from '@/services/api/patrimoine';
import { metadataService } from '@/services/api/metadata';
import { OeuvreService } from '@/services/api/oeuvres';
import { apiClient } from '../services/api/client';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';

// ==========================================================================
// EXPORT DES UTILITAIRES
// ==========================================================================
export { permissions, permissionMessages } from '../utils/permissions';

// ==========================================================================
// EXPORT DE LA CONFIGURATION
// ==========================================================================
export { API_CONFIG, API_ENDPOINTS } from '../config/api';

// ==========================================================================
// SERVICES COMBINÉS POUR FACILITER L'UTILISATION
// ==========================================================================

// Service principal qui combine tous les autres
export const patrimoineApiService = {
  // Authentification
  auth: authService,
  
  // Contenu culturel
  oeuvres: OeuvreService,
  evenements: evenementService,
  patrimoine: patrimoineService,
  
  // Métadonnées
  metadata: metadataService,
  
  // Client de base
  client: apiClient,
  
  // Méthodes utilitaires
  async healthCheck(): Promise<boolean> {
    return apiClient.healthCheck();
  },
  
  async preloadAll(): Promise<void> {
    console.log('🚀 Préchargement de toutes les données essentielles...');
    
    try {
      await Promise.all([
        metadataService.preloadAll(),
        // Autres préchargements si nécessaire
      ]);
      
      console.log('✅ Préchargement terminé');
    } catch (error) {
      console.error('❌ Erreur lors du préchargement:', error);
    }
  },
  
  clearAllCache(): void {
    console.log('🧹 Nettoyage de tous les caches...');
    apiClient.clearCache();
    metadataService.clearCache();
  },
  
  getSystemInfo(): {
    api: { baseURL: string; hasToken: boolean; cacheSize: number };
    version: string;
    environment: string;
  } {
    return {
      api: apiClient.getInfo(),
      version: process.env.REACT_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
};
import type { PaginatedResponse } from '../types/base';
// ==========================================================================
// HOOKS COMBINÉS POUR LES CAS D'USAGE FRÉQUENTS
// ==========================================================================

export * from '../hooks/combined';

// ==========================================================================
// TYPES UTILES
// ==========================================================================
export type {
  // Types de base
  ApiResponse,

  ValidationError,
  PaginationMeta
} from '../config/api';

export type {
  // Types d'authentification
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  UpdateProfileData,
  ChangePasswordData
} from '../types/user';

export type {
  // Types d'œuvres
  Oeuvre,
  CreateOeuvreData,
  UpdateOeuvreData,
  OeuvreFilters,
  ValidationOeuvreData
} from '../types/oeuvre';

export type {
  // Types d'événements
  Evenement,
  CreateEvenementData,
  EvenementFilters,
  InscriptionEvenementData
} from '../types/event';

export type {
  // Types de patrimoine
  Lieu,
  CreateLieuData,
  LieuFilters,
  PatrimoineSearchParams
} from '../types/place';

export type {
  // Types de métadonnées
  Langue,
  Categorie,
  TypeOeuvre,
  TypeEvenement
} from '../types/classification';

export type {
  // Types géographiques
  Wilaya,
  Daira,
  Commune
} from '../types/geography';

// ==========================================================================
// CONSTANTES UTILES
// ==========================================================================

export const ENDPOINTS = API_ENDPOINTS;
export const CONFIG = API_CONFIG;

// Constantes spécifiques à l'Algérie
export const ALGERIA_CONSTANTS = {
  MAIN_LANGUAGES: ['ar', 'tm', 'fr'],
  TIMEZONE: 'Africa/Algiers',
  CURRENCY: 'DZD',
  COUNTRY_CODE: '+213',
  
  // Wilayas principales
  MAIN_WILAYAS: [
    { id: 16, name: 'Alger', code: 'ALG' },
    { id: 31, name: 'Oran', code: 'ORN' },
    { id: 25, name: 'Constantine', code: 'CST' },
    { id: 15, name: 'Tizi Ouzou', code: 'TZO' },
    { id: 6, name: 'Béjaïa', code: 'BEJ' },
  ],
  
  // Périodes historiques
  HISTORICAL_PERIODS: [
    'Préhistoire',
    'Période berbère',
    'Période romaine',
    'Conquête arabe',
    'Période ottomane',
    'Période coloniale française',
    'Indépendance',
    'Moderne'
  ],
  
  // Types de patrimoine spécifiques
  HERITAGE_TYPES: {
    MONUMENTS: ['Mosquée', 'Palais', 'Musée', 'Statue', 'Tour'],
    VESTIGES: ['Ruines', 'Murailles', 'Site archéologique'],
    CRAFTS: ['Poterie', 'Tissage', 'Bijouterie', 'Maroquinerie', 'Sculpture']
  }
} as const;

// ==========================================================================
// FONCTION D'INITIALISATION GLOBALE
// ==========================================================================

export async function initializePatrimoineApp(): Promise<void> {
  console.log('🇩🇿 Initialisation de l\'application Patrimoine Culturel Algérien...');
  
  try {
    // Vérifier la connexion API
    const isHealthy = await patrimoineApiService.healthCheck();
    if (!isHealthy) {
      throw new Error('API non accessible');
    }
    
    // Précharger les métadonnées essentielles
    await patrimoineApiService.preloadAll();
    
    // Log des informations système
    const info = patrimoineApiService.getSystemInfo();
    console.log('✅ Application initialisée:', info);
    
    console.log('🎉 Application prête à l\'utilisation !');
  } catch (error) {
    console.error('❌ Erreur d\'initialisation:', error);
    throw error;
  }
}

// ==========================================================================
// UTILITAIRES DE DEBUG (DÉVELOPPEMENT UNIQUEMENT)
// ==========================================================================

if (process.env.NODE_ENV === 'development') {
  // Exposer les services dans la console pour le debug
  (window as any).patrimoineApp = {
    services: patrimoineApiService,
    
    // Raccourcis utiles
    async testLogin(email: string, password: string) {
      return authService.login({ email, password });
    },
    
    async getMyOeuvres() {
      return new OeuvreService().getMyOeuvres();
    },
    
    async searchEverything(query: string) {
      const [oeuvres, evenements, sites] = await Promise.all([
        new OeuvreService().search(query),
        evenementService.search(query),
        patrimoineService.search(query)
      ]);
      
      return { oeuvres, evenements, sites };
    },
    
    async getStats() {
      const [oeuvresStats, evenementsStats, patrimoineStats] = await Promise.all([
        new OeuvreService().getStatistics(),
        evenementService.getStatistics(),
        patrimoineService.getStatistiques()
      ]);
      
      return { oeuvres: oeuvresStats, evenements: evenementsStats, patrimoine: patrimoineStats };
    }
  };
  
  console.log('🔧 Debug disponible: window.patrimoineApp');
}

