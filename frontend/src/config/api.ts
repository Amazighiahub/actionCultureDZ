// config/api.ts - Configuration de l'API avec tous les types intégrés
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_BASE_URL as ENV_API_URL } from './env';

// ================================================
// CONFIGURATION DE BASE
// ================================================

// Base URL de l'API
export const API_BASE_URL = ENV_API_URL;

// Configuration de l'authentification
export const AUTH_CONFIG = {
  type: 'JWT Bearer Token',
  header: 'Authorization',
  headerPrefix: 'Bearer',
  tokenKey: 'auth_token',
  refreshTokenKey: 'refresh_token',
  tokenExpiryKey: 'token_expires_at',
  expiration: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
} as const;

// Limites de taux
export const RATE_LIMITS = {
  general: 100, // requêtes par minute
  creation: 20, // requêtes par minute
  sensitiveActions: 5, // requêtes par minute
  auth: 10, // tentatives par heure
} as const;

// Configuration de la pagination
export const PAGINATION_CONFIG = {
  defaultLimit: 10,
  maxLimit: 100,
  defaultPage: 1,
} as const;

// Codes d'erreur HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Messages d'erreur par code
export const ERROR_MESSAGES: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Authentification requise',
  403: 'Permissions insuffisantes',
  404: 'Ressource non trouvée',
  409: 'Conflit avec l\'état actuel',
  422: 'Erreur de validation',
  429: 'Limite de taux dépassée',
  500: 'Erreur serveur',
  501: 'Fonctionnalité non implémentée',
  503: 'Service temporairement indisponible',
};
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

// Types pour les fonctions d'endpoint
type EndpointFunction1 = (id: number) => string;
type EndpointFunction2 = (id1: number, id2: number) => string;
type EndpointFunction = EndpointFunction1 | EndpointFunction2;

// Helper pour créer l'URL complète
export const getApiUrl = (
  endpoint: string | EndpointFunction, 
  ...ids: number[]
): string => {
  let path: string;
  
  if (typeof endpoint === 'function') {
    if (ids.length === 1) {
      path = (endpoint as EndpointFunction1)(ids[0]);
    } else if (ids.length === 2) {
      path = (endpoint as EndpointFunction2)(ids[0], ids[1]);
    } else {
      throw new Error('Nombre d\'arguments incorrect pour la fonction d\'endpoint');
    }
  } else {
    path = endpoint;
  }
  
  return `${API_BASE_URL}${path}`;
};

// Helper pour obtenir la langue courante
const getCurrentLanguage = (): string => {
  return localStorage.getItem('i18nextLng') || 'fr';
};

// Helper pour les headers d'authentification + langue
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Language': getCurrentLanguage(),  // ⚡ AJOUT CRITIQUE
  };
  
  if (token) {
    headers[AUTH_CONFIG.header] = `${AUTH_CONFIG.headerPrefix} ${token}`;
  }
  
  return headers;
};
// Helper pour parser les dates de l'API
export const parseDateFromApi = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

// Helper pour formater une date pour l'API (format ISO YYYY-MM-DD)
export const formatDateForApi = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Si c'est déjà une string au format ISO, la retourner directement
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    // Si c'est une string ISO complète, extraire la date
    if (date.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return date.split('T')[0];
    }
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  return null;
};

// ================================================
// ENDPOINTS DE L'API
// ================================================

export const API_ENDPOINTS = {
  // Santé et documentation
  health: '/health',
  root: '/', // Documentation complète de l'API

  // ================================================
  // AUTHENTIFICATION & UTILISATEURS
  // ================================================
 

  auth: {
    // Authentification
    register: '/users/register',
    login: '/users/login',
    logout: '/users/logout',
    verifyEmail: (token: string) => `/users/verify-email/${token}`,
    forgotPassword: '/users/password/forgot',
    resetPassword: '/users/password/reset',
   
    // Profil
    me: '/users/profile',
    updateProfile: '/users/profile',
    updatePhoto: '/users/profile/photo',
    deletePhoto: '/users/profile/photo',
    changePassword: '/users/change-password',
    
    // Professionnel
    submitProfessional: '/users/professional/submit',
    professionalStatus: '/users/professional/status',
    
    // Préférences
    updatePreferences: '/users/preferences',
    updatePrivacy: '/users/privacy',
    
    // Autres
    sendVerificationEmail: '/users/send-verification-email',
    statistics: '/users/statistics',
    typesUtilisateurs: '/users/types-utilisateurs',
    
    // Administration
    admin: {
      getAllUsers: '/users/admin/users',
      getUserById: (id: number) => `/users/admin/users/${id}`,
      getPendingProfessionals: '/users/admin/professionals/pending',
      validateProfessional: (id: number) => `/users/admin/users/${id}/validate`,
      updateUserStatus: (id: number) => `/users/admin/users/${id}/status`,
      assignRole: (id: number) => `/users/admin/users/${id}/roles`,
      removeRole: (id: number) => `/users/admin/users/${id}/roles`,
      globalStatistics: '/users/admin/statistics',
    }
  },

  // ================================================
  // METADATA (Données de référence)
  // ================================================
  metadata: {
    all: '/metadata/all',
    statistics: '/metadata/statistics',
    // Hiérarchie Type → Genre → Catégorie
categoriesForType: (typeId: number) => `/metadata/types-oeuvres/${typeId}/categories`,
    typesUsers: '/metadata/types-users',
    hasCategories: (typeOeuvreId: number) => `/metadata/types-oeuvres/${typeOeuvreId}/has-categories`,
    
  editeurs: {
    list: '/metadata/editeurs',
    create: '/metadata/editeurs',
    update: (id: number) => `/metadata/editeurs/${id}`,
    delete: (id: number) => `/metadata/editeurs/${id}`
  },
    hierarchy: {
      complete: '/metadata/hierarchy',
      simplified: '/metadata/hierarchy?simplified=true',
      statistics: '/metadata/hierarchy/statistics',
      validate: '/metadata/validate-hierarchy',
    },
    
    // Types d'œuvres et navigation hiérarchique
    typesOeuvres: '/metadata/types-oeuvres',
    genresParType: (typeId: number) => `/metadata/types/${typeId}/genres`,
    categoriesParGenre: (genreId: number) => `/metadata/genres/${genreId}/categories`,
    
    // Gestion admin de la hiérarchie
    hierarchyAdmin: {
      addGenreToType: (typeId: number) => `/metadata/types/${typeId}/genres`,
      addCategoryToGenre: (genreId: number) => `/metadata/genres/${genreId}/categories`,
      updateRelation: (typeId: number, genreId: number) => `/metadata/types/${typeId}/genres/${genreId}`,
      disableRelation: (typeId: number, genreId: number) => `/metadata/types/${typeId}/genres/${genreId}`,
    },
    materiaux: {
      list: '/metadata/materiaux',
      create: '/metadata/materiaux',
      update: (id: number) => `/metadata/materiaux/${id}`,
      delete: (id: number) => `/metadata/materiaux/${id}`,
    },
     intervenants: {
    // Public
    list: '/intervenants',
    search: '/intervenants/search',
    types: '/intervenants/types',
    detail: (id: number) => `/intervenants/${id}`,
    oeuvres: (id) => `/intervenants/${id}/oeuvres`,
    // Gestion (Admin + Professionnel validé)
    create: '/intervenants',
    update: (id: number) => `/intervenants/${id}`,
    
    // Admin uniquement
    delete: (id: number) => `/intervenants/${id}`,
    statistics: '/intervenants/stats/overview',
  },
    techniques: {
      list: '/metadata/techniques',
      create: '/metadata/techniques',
      update: (id: number) => `/metadata/techniques/${id}`,
      delete: (id: number) => `/metadata/techniques/${id}`,
    },
    
    langues: '/metadata/langues',
    
    categories: {
      list: '/metadata/categories',
      search: '/metadata/categories/search',
    },
    
    
    genres: '/metadata/genres',
   
    typesOrganisations: '/metadata/types-organisations',
   
    geographie: {
      wilayas: '/metadata/wilayas',
      searchWilayas: '/metadata/wilayas/search',
      
      // Dairas par wilaya
      dairasByWilaya: (wilayaId: number) => `/metadata/wilayas/${wilayaId}/dairas`,
      
      // Communes par daira
      communesByDaira: (dairaId: number) => `/metadata/dairas/${dairaId}/communes`,
      
      // Localités par commune
      localitesByCommune: (communeId: number) => `/metadata/communes/${communeId}/localites`,
      },
    tags: {
      list: '/metadata/tags',
      create: '/metadata/tags',
    },
  },

  // ================================================
  // ŒUVRES
  // ================================================
  oeuvres: {
    // Public
    list: '/oeuvres',
    recent: '/oeuvres/recent',
    popular: '/oeuvres/popular',
    statistics: '/oeuvres/statistics',
    search: '/oeuvres/search',
    detail: (id: number) => `/oeuvres/${id}`,
    shareLinks: (id: number) => `/oeuvres/${id}/share-links`,
    medias: (id: number) => `/oeuvres/${id}/medias`,
    documentation: '/oeuvres/api/documentation',
    
    // Authentifié
    create: '/oeuvres',
    
    update: (id: number) => `/oeuvres/${id}`,
    delete: (id: number) => `/oeuvres/${id}`,
    uploadMedia: (id: number) => `/oeuvres/${id}/medias/upload`,
    deleteMedia: (id: number, mediaId: number) => `/oeuvres/${id}/medias/${mediaId}`,
    myWorks: '/oeuvres/user/my-works',
    myStats: '/oeuvres/user/my-statistics',
    
    // Admin
    validate: (id: number) => `/oeuvres/${id}/validate`,
    pending: '/oeuvres/admin/pending',
    rejected: '/oeuvres/admin/rejected',
  },

  // ================================================
  // ÉVÉNEMENTS
  // ================================================
  evenements: {
    // Public
    list: '/evenements',
    upcoming: '/evenements/upcoming',
    statistics: '/evenements/statistics', // AJOUT
    detail: (id: number) => `/evenements/${id}`,
    shareData: (id: number) => `/evenements/${id}/share-data`,
    medias: (id: number) => `/evenements/${id}/medias`,
    
    // Création/Modification
    create: '/evenements',
    update: (id: number) => `/evenements/${id}`,
    cancel: (id: number) => `/evenements/${id}/cancel`,
    
    // Participation
    inscription: (id: number) => `/evenements/${id}/inscription`,
    desinscription: (id: number) => `/evenements/${id}/inscription`, // DELETE
    participants: (id: number) => `/evenements/${id}/participants`,
    validateParticipation: (id: number, userId: number) => `/evenements/${id}/participants/${userId}/validate`,
    professionnelsEnAttente: (id: number) => `/evenements/${id}/professionnels/en-attente`,
    
    // Médias
    addMedias: (id: number) => `/evenements/${id}/medias`,
    updateMedia: (id: number, mediaId: number) => `/evenements/${id}/medias/${mediaId}`,
    deleteMedia: (id: number, mediaId: number) => `/evenements/${id}/medias/${mediaId}`,
    
    // Notifications
    sendNotification: (id: number) => `/evenements/${id}/notification`,
    
    // Espace professionnel
    mesOeuvres: (id: number) => `/evenements/${id}/mes-oeuvres`,
    addOeuvre: (id: number) => `/evenements/${id}/oeuvres`,
    removeOeuvre: (id: number, oeuvreId: number) => `/evenements/${id}/oeuvres/${oeuvreId}`,
    
    // Export
    export: (id: number) => `/evenements/${id}/export`,
  },

  // ================================================
  // PATRIMOINE
  // ================================================
  patrimoine: {
    // Sites
    sites: '/patrimoine/sites',
    sitesPopulaires: '/patrimoine/sites/populaires',
    siteDetail: (id: number) => `/patrimoine/sites/${id}`,
    recherche: '/patrimoine/recherche',
    monuments: (type: string) => `/patrimoine/monuments/${type}`,
    vestiges: (type: string) => `/patrimoine/vestiges/${type}`,
    galerie: (id: number) => `/patrimoine/sites/${id}/galerie`,
    statistiques: '/patrimoine/statistiques',
    carteVisite: (id: number) => `/patrimoine/sites/${id}/carte-visite`,
    qrcode: (id: number) => `/patrimoine/sites/${id}/qrcode`,
    
    // Parcours
    parcours: '/patrimoine/parcours',
    parcoursEvenement: (evenementId: number) => `/patrimoine/parcours/evenement/${evenementId}`,
    parcoursPersonnalise: '/patrimoine/parcours/personnalise',
    parcoursPopulaires: (wilayaId: number) => `/patrimoine/parcours/populaires/${wilayaId}`,
    
    // Lieux
    lieuxProximite: '/patrimoine/lieux/proximite',
    lieuxStatistiques: '/patrimoine/lieux/statistiques',
    
    // Gestion (auth)
    createSite: '/patrimoine/sites',
    updateSite: (id: number) => `/patrimoine/sites/${id}`,
    deleteSite: (id: number) => `/patrimoine/sites/${id}`,
    noterSite: (id: number) => `/patrimoine/sites/${id}/noter`,
    ajouterFavoris: (id: number) => `/patrimoine/sites/${id}/favoris`,
    retirerFavoris: (id: number) => `/patrimoine/sites/${id}/favoris`,
    uploadMedias: (id: number) => `/patrimoine/sites/${id}/medias`,
    deleteMedia: (id: number, mediaId: number) => `/patrimoine/sites/${id}/medias/${mediaId}`,
    updateHoraires: (id: number) => `/patrimoine/sites/${id}/horaires`,
    
    // Mobile
    nearbyMobile: '/patrimoine/mobile/nearby',
    qrScan: '/patrimoine/mobile/qr-scan',
    offlineData: (wilaya: number) => `/patrimoine/mobile/offline/${wilaya}`,
    
    // Admin
    import: '/patrimoine/admin/import',
    export: '/patrimoine/admin/export',
  },

  // ================================================
  // ARTISANAT
  // ================================================
  artisanat: {
    list: '/artisanat',
    search: '/artisanat/search',
    statistics: '/artisanat/statistics',
    detail: (id: number) => `/artisanat/${id}`,
    artisansByRegion: (wilayaId: number) => `/artisanat/region/${wilayaId}/artisans`,
    create: '/artisanat',
    update: (id: number) => `/artisanat/${id}`,
    delete: (id: number) => `/artisanat/${id}`,
    uploadMedias: (id: number) => `/artisanat/${id}/medias`, // CORRIGÉ
  },

  // ================================================
  // COMMENTAIRES
  // ================================================
  commentaires: {
    oeuvre: (oeuvreId: number) => `/commentaires/oeuvre/${oeuvreId}`,
    evenement: (evenementId: number) => `/commentaires/evenement/${evenementId}`,
    createOeuvre: (oeuvreId: number) => `/commentaires/oeuvre/${oeuvreId}`,
    createEvenement: (evenementId: number) => `/commentaires/evenement/${evenementId}`,
    update: (id: number) => `/commentaires/${id}`,
    delete: (id: number) => `/commentaires/${id}`,
    moderate: (id: number) => `/commentaires/${id}/moderate`,
  },

  // ================================================
  // FAVORIS
  // ================================================
  favoris: {
    list: '/favoris',
    stats: '/favoris/stats',
    popular: '/favoris/popular',
    check: (type: string, id: number) => `/favoris/check/${type}/${id}`,
    add: '/favoris',
    removeById: (id: number) => `/favoris/${id}`,
    removeByEntity: (type: string, id: number) => `/favoris/${type}/${id}`,
  },

  // ================================================
  // NOTIFICATIONS
  // ================================================
  notifications: {
     info: '/notifications',
  list: '/notifications/list',
  summary: '/notifications/summary',
  preferences: '/notifications/preferences',
  updatePreferences: '/notifications/preferences',
  markAsRead: (id: number) => `/notifications/${id}/read`,
  markAllAsRead: '/notifications/read-all',
  markMultipleAsRead: '/notifications/read-multiple',
  delete: (id: number) => `/notifications/${id}`,
  deleteRead: '/notifications/read/all',
  testEmail: '/notifications/test-email',
  wsStatus: '/notifications/ws/status',
},
  // ================================================
  // PARCOURS INTELLIGENT
  // ================================================
  parcours: {
    evenement: (evenementId: number) => `/parcours/evenement/${evenementId}`,
    populaires: (wilayaId: number) => `/parcours/wilaya/${wilayaId}/populaires`,
    personnalise: '/parcours/personnalise',
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
    
    // Réorganiser l'ordre des programmes
    reorder: (evenementId: number) => `/programmes/evenement/${evenementId}/reorder`,
    
    // Dupliquer un programme
    duplicate: (id: number) => `/programmes/${id}/duplicate`,
    
    // Mettre à jour le statut
    updateStatus: (id: number) => `/programmes/${id}/statut`,
    
    // Export des programmes
    export: (evenementId: number) => `/programmes/evenement/${evenementId}/export`
  },

  // ================================================
  // UPLOAD
  // ================================================
  upload: {
    info: '/upload/',
    imagePublic: '/upload/image/public',
    image: '/upload/image',
    document: '/upload/document',
    video: '/upload/video',
    audio: '/upload/audio',
    chunk: '/upload/chunk',
    complete: '/upload/complete',
    chunkStatus: (uploadId: string) => `/upload/chunk/${uploadId}/status`, // AJOUT
    cancelChunk: (uploadId: string) => `/upload/chunk/${uploadId}`, // AJOUT (DELETE)
  },

  // ================================================
  // LIEUX
  // ================================================
  lieux: {
    list: '/lieux',
    proximite: '/lieux/proximite',
    statistiques: '/lieux/statistiques',
    detail: (id: number) => `/lieux/${id}`,
    create: '/lieux',
    update: (id: number) => `/lieux/${id}`,
    delete: (id: number) => `/lieux/${id}`,
  },

  // ================================================
  // ESPACE PROFESSIONNEL
  // ================================================
  professionnel: {
    // Dashboard
    dashboard: '/professionnel/dashboard',
    calendar: '/professionnel/calendar',
    notifications: '/professionnel/notifications',
    
    // Œuvres
    oeuvres: '/professionnel/oeuvres',
    oeuvreStats: (id: number) => `/professionnel/oeuvres/${id}/stats`,
    
    // Artisanats
    artisanats: '/professionnel/artisanats',
    artisanatStats: (id: number) => `/professionnel/artisanats/${id}/stats`,
    
    // Événements
    evenements: '/professionnel/evenements',
    evenementStats: (id: number) => `/professionnel/evenements/${id}/stats`,
    manageParticipants: (id: number) => `/professionnel/evenements/${id}/participants/manage`,
    
    // Profil
    updateProfile: '/professionnel/profile',
    portfolioUpload: '/professionnel/portfolio/upload',
    deletePortfolioMedia: (mediaId: number) => `/professionnel/portfolio/${mediaId}`,
    updatePortfolioMedia: (mediaId: number) => `/professionnel/portfolio/${mediaId}`,
    
    // Export
    export: '/professionnel/export',
    exportOeuvres: '/professionnel/export/oeuvres',
    exportEvenements: '/professionnel/export/evenements',
    exportArtisanats: '/professionnel/export/artisanats',
    exportParticipants: (evenementId: number) => `/professionnel/export/participants/${evenementId}`,
    
    // Analytics
    analyticsOverview: '/professionnel/analytics/overview',
    analyticsTrends: '/professionnel/analytics/trends',
    analyticsDemographics: '/professionnel/analytics/demographics',
    
    // Avancé
    benchmark: '/professionnel/benchmark',
    recommendations: '/professionnel/recommendations',
    collaborationSuggestions: '/professionnel/collaboration/suggestions',
    
    // Support
    createTicket: '/professionnel/support/ticket',
    helpFaq: '/professionnel/help/faq',
  },
  tracking: {
    // Enregistrer une vue
    view: '/tracking/view',
    
    // Mettre à jour la durée d'une vue
    updateDuration: (id: number) => `/tracking/view/${id}`,
    
    // Obtenir les statistiques
    stats: (type: string, id: number) => `/tracking/stats/${type}/${id}`,
    
    // Routes spécifiques par type
    viewOeuvre: (id: number) => `/tracking/oeuvre/${id}/view`,
    viewEvenement: (id: number) => `/tracking/evenement/${id}/view`,
  },

  // ================================================
  // SIGNALEMENTS
  // ================================================
  signalements: {
    // Créer un signalement
    create: '/signalement',
    
    // Obtenir mes signalements
    mesSignalements: '/signalement/mes-signalements',
    
    // Admin/Modération
    moderationQueue: '/signalement/moderation',
    traiter: (id: number) => `/signalement/${id}/traiter`,
    statistics: '/signalement/stats',
  },

  articleBlocks: {
    templates: '/article-blocks/templates',
    getByArticle: (articleId, articleType?) => `/article-blocks/article/${articleId}/${articleType}`,
    create: '/article-blocks',
    createBatch: '/article-blocks/batch',
    update: (blockId) => `/article-blocks/${blockId}`,
    delete: (blockId) => `/article-blocks/${blockId}`,
    reorder: (articleId) => `/article-blocks/article/${articleId}/reorder`,
    duplicate: (blockId) => `/article-blocks/${blockId}/duplicate`,
    uploadImage: (articleId) => `/article-blocks/article/${articleId}/upload-image`,
  },
  // ================================================
  // DASHBOARD ADMIN
  // ================================================
  dashboard: {
    // Principal
    overview: '/dashboard/overview',
    stats: '/dashboard/stats',
    
    // Patrimoine
   
    qrStats: '/dashboard/patrimoine/qr-stats',
    parcours: '/dashboard/patrimoine/parcours',
    
    // Utilisateurs
    pendingUsers: '/dashboard/users/pending',
    usersStats: '/dashboard/users/stats',
    geographic: '/dashboard/users/geographic',
    
    // Contenu
    pendingOeuvres: '/dashboard/content/pending-oeuvres',
    contentStats: '/dashboard/content/stats',
    topContributors: '/dashboard/content/top-contributors',
    
    // Modération
    moderationQueue: '/dashboard/moderation/queue',
    signalements: '/dashboard/moderation/signalements',
    moderationStats: '/dashboard/moderation/stats',
    
    // Actions
    performAction: '/dashboard/actions',
    bulkActions: '/dashboard/actions/bulk',
    validateUser: (id: number) => `/users/${id}/validate`,
    validateOeuvre: (id: number) => `/dashboard/oeuvres/${id}/validate`,
    moderateSignalement: (id: number) => `/dashboard/signalements/${id}/moderate`,
    suspendUser: (id: number) => `/dashboard/users/${id}/suspend`,
    
    // Analytics
    advancedAnalytics: '/dashboard/analytics/advanced',
    retention: '/dashboard/analytics/retention',
    funnel: '/dashboard/analytics/funnel',
    engagement: '/dashboard/analytics/engagement',
    
    // Audit
    auditLogs: '/dashboard/audit/logs',
    userAudit: (userId: number) => `/dashboard/audit/user/${userId}`,
    
    // Rapports
    activityReport: '/dashboard/reports/activity',
    moderationReport: '/dashboard/reports/moderation',
    patrimoineReport: '/dashboard/reports/patrimoine',
    
    // Configuration
    permissions: '/dashboard/config/permissions',
    metrics: '/dashboard/config/metrics',
    
    // Notifications
    notifications: '/dashboard/notifications',
    broadcastNotification: '/dashboard/notifications/broadcast',
    
    // Monitoring (AJOUT)
    monitoring: {
      health: '/dashboard/monitoring/health',
      alerts: '/dashboard/monitoring/alerts',
    },
     users: {
    list: '/admin/users',
    detail: (id: number) => `/admin/users/${id}`,
    update: (id: number) => `/admin/users/${id}`,
    delete: (id: number) => `/admin/users/${id}`,
    validate: (id: number) => `/admin/users/${id}/validate`,
    suspend: (id: number) => `/admin/users/${id}/suspend`,
    reactivate: (id: number) => `/admin/users/${id}/reactivate`,
    changeRole: (id: number) => `/admin/users/${id}/role`,
    resetPassword: (id: number) => `/admin/users/${id}/reset-password`,
    bulkAction: '/admin/users/bulk-action',
    search: '/admin/users/search',
    export: '/admin/users/export',
  },
  
  // Gestion des œuvres
  oeuvres: {
    list: '/admin/oeuvres',
    detail: (id: number) => `/admin/oeuvres/${id}`,
    updateStatus: (id: number) => `/admin/oeuvres/${id}/status`,
    delete: (id: number) => `/admin/oeuvres/${id}`,
    bulkAction: '/admin/oeuvres/bulk-action',
    export: '/admin/oeuvres/export',
    featured: {
      add: (id: number) => `/admin/oeuvres/${id}/featured`,
      remove: (id: number) => `/admin/oeuvres/${id}/featured`,
      list: '/admin/oeuvres/featured',
    },
  },
  
  // Gestion des événements
  evenements: {
    list: '/admin/evenements',
    detail: (id: number) => `/admin/evenements/${id}`,
    updateStatus: (id: number) => `/admin/evenements/${id}/status`,
    delete: (id: number) => `/admin/evenements/${id}`,
    bulkAction: '/admin/evenements/bulk-action',
    export: '/admin/evenements/export',
    participants: {
      list: (id: number) => `/admin/evenements/${id}/participants`,
      export: (id: number) => `/admin/evenements/${id}/participants/export`,
    },
  },
  
  // Gestion du patrimoine
  patrimoine: {
    list: '/admin/patrimoine',
    detail: (id: number) => `/admin/patrimoine/${id}`,
    update: (id: number) => `/admin/patrimoine/${id}`,
    delete: (id: number) => `/admin/patrimoine/${id}`,
    updateStatus: (id: number) => `/admin/patrimoine/${id}/status`,
    bulkAction: '/admin/patrimoine/bulk-action',
    export: '/admin/patrimoine/export',
    unesco: {
      mark: (id: number) => `/admin/patrimoine/${id}/unesco`,
      unmark: (id: number) => `/admin/patrimoine/${id}/unesco`,
      list: '/admin/patrimoine/unesco',
    },
    statistics: '/admin/patrimoine/statistics',
  },
  
  // Gestion des services
  services: {
    list: '/admin/services',
    detail: (id: number) => `/admin/services/${id}`,
    updateStatus: (id: number) => `/admin/services/${id}/status`,
    delete: (id: number) => `/admin/services/${id}`,
    bulkAction: '/admin/services/bulk-action',
    export: '/admin/services/export',
    verify: (id: number) => `/admin/services/${id}/verify`,
    reviews: {
      list: (id: number) => `/admin/services/${id}/reviews`,
      moderate: (serviceId: number, reviewId: number) => `/admin/services/${serviceId}/reviews/${reviewId}/moderate`,
    },
  },
  // Validation du contenu
  content: {
    validateOeuvre: (id: number) => `/dashboard/oeuvres/${id}/validate`,
    moderateSignalement: (id: number) => `/dashboard/signalements/${id}/moderate`,
  },
    
    // Cache (AJOUT)
    cache: {
      clear: '/dashboard/cache/clear',
      status: '/dashboard/cache/status',
    },
  },
} as const;

// ================================================
// CONFIGURATION EXPORTÉE
// ================================================

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  endpoints: API_ENDPOINTS,
  auth: AUTH_CONFIG,
  rateLimits: RATE_LIMITS,
  pagination: PAGINATION_CONFIG,
  httpStatus: HTTP_STATUS,
  errorMessages: ERROR_MESSAGES,
  helpers: {
    buildUrl,
    getApiUrl,
    getAuthHeaders,
    formatDateForApi,
    parseDateFromApi,
  },
} as const;

// Export par défaut
export default API_CONFIG;