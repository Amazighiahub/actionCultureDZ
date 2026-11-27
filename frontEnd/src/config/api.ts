// config/api.ts - Configuration de l'API avec tous les types intégrés
import { API_BASE_URL as ENV_API_URL } from './env';

// ================================================
// CONFIGURATION DE BASE
// ================================================

// Base URL de l'API
export const API_BASE_URL = ENV_API_URL;

// Configuration de l'authentification
// ✅ SÉCURITÉ: Les tokens sont maintenant stockés dans des cookies httpOnly
// Le localStorage n'est utilisé que pour la compatibilité pendant la transition
export const AUTH_CONFIG = {
  type: 'JWT Bearer Token (httpOnly cookies)',
  header: 'Authorization',
  headerPrefix: 'Bearer',
  tokenKey: 'auth_token', // Fallback localStorage (sera supprimé après migration)
  refreshTokenKey: 'refresh_token', // Fallback localStorage
  tokenExpiryKey: 'token_expires_at',
  expiration: 15 * 60 * 1000, // 15 minutes (access token)
  refreshExpiration: 7 * 24 * 60 * 60 * 1000, // 7 jours (refresh token)
  useHttpOnlyCookies: true, // ✅ Nouveaux tokens via cookies
} as const;

// Dans config/api.ts ou un fichier de types

// ================================================
// TYPES DE BASE
// ================================================

// Types pour les paramètres de requête
export type QueryParamValue = string | number | boolean | null | undefined;

// Types pour les paramètres de pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Types pour les paramètres de recherche
export interface SearchParams extends PaginationParams {
  q?: string;
  search?: string;
}
export interface UploadOptions<T = Record<string, any>> {
  fieldName?: string;
  onProgress?: (progress: UploadProgress) => void;
  additionalData?: T;
  headers?: Record<string, string>;
}
// Types pour les filtres (sans Date qui sera passée en string)
export interface FilterParams extends PaginationParams {
  [key: string]: string | number | boolean | null | undefined;
}

// Types pour les réponses API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: ValidationError[] | Record<string, unknown>;
  /** Code de l'erreur (serveur : CONFLICT, VALIDATION_ERROR… ; réseau : ERR_NETWORK, ECONNABORTED) */
  code?: string;
  /** Statut HTTP d'une réponse refusée (absent si le réseau est coupé) */
  status?: number;
  pagination?: PaginationInfo;
}

// Information de pagination
export interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
  limit: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Erreur de validation
export interface ValidationError {
  field: string;
  message: string;
  value?: string | number | boolean;
  code?: string;
}

// Erreur API structurée
export interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
  details?: ValidationError[] | Record<string, unknown>;
  timestamp?: string;
  path?: string;
  code?: string;
}

// Réponse paginée
export interface PaginatedResponse<T = unknown> {
  items: T[];
  pagination: PaginationInfo;
}

// Types pour l'authentification
export interface AuthTokenData {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    type_user: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  type_user: string;
  telephone?: string;
}

// Types pour les uploads
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}



// Types pour les permissions
export type UserRole = 'Admin' | 'Professionnel' | 'Visiteur' | 'Moderateur' | 'Super Admin';

export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
}

// ================================================
// HELPERS
// ================================================

// Helper pour construire les URLs avec paramètres
export const buildUrl = (endpoint: string, params?: Record<string, QueryParamValue>): string => {
  if (!params) return endpoint;
  
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

// ================================================
// ENDPOINTS DE L'API
// ================================================

export const API_ENDPOINTS = { // Documentation complète de l'API

  // ================================================
  // AUTHENTIFICATION & UTILISATEURS
  // ================================================
 

  auth: {
    // Authentification
    register: '/users/register',
    login: '/users/login',
    // Sous /refresh-token : seul chemin où le navigateur envoie le cookie de cette connexion
    logout: '/users/refresh-token/deconnexion',
    verifyEmail: (token: string) => `/email-verification/verify/${token}`,
    forgotPassword: '/email-verification/request-password-reset',
    resetPassword: '/email-verification/reset-password',
   
    // Profil
    me: '/users/profile',
    changePassword: '/users/change-password',
    // RGPD : export (art. 15/20) et suppression du compte (art. 17)
    exportData: '/users/profile/export',
    deleteAccount: '/users/profile',
    
    // Changement d'adresse e-mail (lien de confirmation envoyé à la nouvelle adresse)
    requestEmailChange: '/email-verification/request-email-change',

    // Préférences
    updatePreferences: '/users/preferences',
    
    // Autres
    sendVerificationEmail: '/email-verification/resend',
  },

  // ================================================
  // METADATA (Données de référence)
  // ================================================
  metadata: {
   
    typesOrganisations: '/metadata/types-organisations',
   
    geographie: {
      wilayas: '/metadata/wilayas',
      
      // Dairas par wilaya
      dairasByWilaya: (wilayaId: number) => `/metadata/wilayas/${wilayaId}/dairas`,
      
      // Communes par daira
      communesByDaira: (dairaId: number) => `/metadata/dairas/${dairaId}/communes`,
      
      // Localités par commune
      localitesByCommune: (communeId: number) => `/metadata/communes/${communeId}/localites`,
      },
  },

  // ================================================
  // ORGANISATIONS
  // ================================================
  organisations: {
    me: '/organisations/me',
    annuaire: '/organisations',
    adminListe: '/organisations/admin/liste',
    create: '/organisations',
    types: '/organisations/types',
  },

  // ================================================
  // ŒUVRES
  // ================================================
  oeuvres: {
    uploadMedia: (id: number) => `/oeuvres/${id}/medias/upload`,
    myWorks: '/oeuvres/my/list',
  },

  // ================================================
  // ÉVÉNEMENTS
  // ================================================
  evenements: {
    // Public
    list: '/evenements',
    upcoming: '/evenements/upcoming', // AJOUT
    detail: (id: number) => `/evenements/${id}`,
    medias: (id: number) => `/evenements/${id}/medias`,
    cancel: (id: number) => `/evenements/${id}/cancel`,
    
    // Participation
    inscription: (id: number) => `/evenements/${id}/register`,
    desinscription: (id: number) => `/evenements/${id}/register`,
    publicParticipants: (id: number) => `/evenements/${id}/participants/public`,
    
    // Espace professionnel
    mesOeuvres: (id: number) => `/evenements/${id}/mes-oeuvres`,
    addOeuvre: (id: number) => `/evenements/${id}/oeuvres`,
    removeOeuvre: (id: number, oeuvreId: number) => `/evenements/${id}/oeuvres/${oeuvreId}`,

    // QR Code
    qrcode: (id: number) => `/evenements/${id}/qrcode`,
  },

  // ================================================
  // PATRIMOINE
  // ================================================
  patrimoine: {
    // Sites — aligné avec backend patrimoineRoutes.js
    sites: '/patrimoine',
    sitesPopulaires: '/patrimoine/popular',
    // Sites géolocalisés pour la carte (id, nom, coordonnées, type)
    carte: '/patrimoine/map',
    siteDetail: (id: number) => `/patrimoine/${id}`,
    types: '/patrimoine/types',
    // Sites de la commune au nom proche, vérifiés avant une création
    checkDuplicate: '/patrimoine/check-duplicate',
    uploadMedias: (id: number) => `/patrimoine/${id}/medias`,
    uploadVoix: (id: number) => `/patrimoine/${id}/medias/voix`,
    deleteMedia: (id: number, mediaId: number) => `/patrimoine/${id}/medias/${mediaId}`,
    reordonnerPoints: (id: number) => `/patrimoine/${id}/points/ordre`,

    // Articles riches par section (blocs ArticleBlock liés au lieu)
    // Backend: backend/routes/patrimoineRoutes.js
    sectionArticles: (id: number) => `/patrimoine/${id}/articles`,
    sectionArticleDelete: (id: number, blockId: number) => `/patrimoine/${id}/articles/${blockId}`,

    // Administration : relevé Excel de points de visite (modèle Taladz)
    importReleveApercu: '/patrimoine/import-releve/apercu',
    importReleve: '/patrimoine/import-releve',
  },

  // ================================================
  // ARTISANAT
  // ================================================
  artisanat: {
    list: '/artisanat',
    search: '/artisanat/search',
    statistics: '/artisanat/statistics',
    detail: (id: number) => `/artisanat/${id}`, // CORRIGÉ
  },

  // ================================================
  // FAVORIS
  // ================================================
  favoris: {
    list: '/favoris',
    stats: '/favoris/stats',
    popular: '/favoris/popular',
    check: (type: string, id: number) => `/favoris/check/${type}/${id}`,
    ids: (type: string) => `/favoris/ids/${type}`,
    add: '/favoris',
    removeById: (id: number) => `/favoris/${id}`,
    removeByEntity: (type: string, id: number) => `/favoris/${type}/${id}`,
  },

  // ================================================
  // NOTIFICATIONS
  // ================================================
  notifications: {
  list: '/notifications/list',
  summary: '/notifications/summary',
  preferences: '/notifications/preferences',
  updatePreferences: '/notifications/preferences',
  markAsRead: (id: number) => `/notifications/${id}/read`,
  markAllAsRead: '/notifications/read-all',
  delete: (id: number) => `/notifications/${id}`,
  deleteRead: '/notifications/read/all',
},

  // ================================================
  // PROGRAMMES D'ÉVÉNEMENTS
  // ================================================
  programmes: {
    byEvent: (evenementId: number) => `/programmes/evenement/${evenementId}`,
    
    // Détail d'un programme
    detail: (id: number) => `/programmes/${id}`,
    
    // Créer un programme pour un événement
    create: (evenementId: number) => `/programmes/evenement/${evenementId}`,
    
    // Mettre à jour un programme
    update: (id: number) => `/programmes/${id}`,
    
    // Supprimer un programme
    delete: (id: number) => `/programmes/${id}`,
    
    // Dupliquer un programme
    duplicate: (id: number) => `/programmes/${id}/duplicate`,
  },

  // ================================================
  // UPLOAD
  // ================================================
  upload: {
    imagePublic: '/upload/image/public',
    image: '/upload/image',
    document: '/upload/document',
    video: '/upload/video',
    audio: '/upload/audio', // AJOUT (DELETE)
  },

  // ================================================
  // ESPACE PROFESSIONNEL
  // ================================================
  professionnel: {
    // Dashboard
    dashboard: '/professionnel/dashboard',
    notifications: '/professionnel/notifications',
    oeuvreStats: (id: number) => `/professionnel/oeuvres/${id}/stats`,
    
    // Artisanats
    artisanats: '/professionnel/artisanats',
    
    // Événements
    evenements: '/professionnel/evenements',
    evenementStats: (id: number) => `/professionnel/evenements/${id}/stats`,
    exportParticipants: (evenementId: number) => `/professionnel/export/participants/${evenementId}`,
  },

  articleBlocks: {
    getByArticle: (articleId: number, articleType: 'article' | 'article_scientifique' = 'article') =>
      `/article-blocks/article/${articleId}/${articleType}`,
    createBatch: '/article-blocks/batch',
  },
  // ================================================
  // DASHBOARD ADMIN
  // ================================================
  dashboard: {
    // Principal
    overview: '/dashboard/overview',
    stats: '/dashboard/stats',
    
    // Utilisateurs
    allUsers: '/dashboard/users',
    pendingUsers: '/dashboard/users/pending',
    
    // Contenu
    pendingOeuvres: '/dashboard/content/pending-oeuvres',
    
    // Modération
    moderationQueue: '/dashboard/moderation/queue',
    validateOeuvre: (id: number) => `/dashboard/oeuvres/${id}/validate`,
    moderateSignalement: (id: number) => `/dashboard/signalements/${id}/moderate`,
    
    // Rapports
    activityReport: '/dashboard/reports/activity',
    moderationReport: '/dashboard/reports/moderation',
    patrimoineReport: '/dashboard/reports/patrimoine',
    
    // Monitoring (AJOUT)
    monitoring: {
      alerts: '/dashboard/monitoring/alerts',
    },
  
  // Gestion des œuvres
  oeuvres: {
    list: '/oeuvres/admin/all',
  },
  
  // Gestion des événements
  evenements: {
    list: '/evenements/admin/all',
  },
  
  // Gestion du patrimoine
  patrimoine: {
    statistics: '/patrimoine/admin/stats',
  },
    
    // Cache (AJOUT)
    cache: {
      clear: '/dashboard/cache/clear',
    },
  },
} as const;
