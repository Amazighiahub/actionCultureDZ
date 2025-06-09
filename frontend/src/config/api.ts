// config/api.ts - Configuration de l'API alignée avec les routes backend

import { API_BASE_URL as ENV_API_URL } from './env';

// Base URL de l'API (utilise la configuration d'environnement)
export const API_BASE_URL = ENV_API_URL;

// Configuration de l'authentification
export const AUTH_CONFIG = {
  type: 'JWT Bearer Token',
  header: 'Authorization',
  headerPrefix: 'Bearer',
  tokenKey: 'auth_token',
  expiration: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
};

// Limites de taux
export const RATE_LIMITS = {
  general: 100, // requêtes par minute
  creation: 20, // requêtes par minute
  sensitiveActions: 5, // requêtes par minute
  auth: 10, // tentatives par heure
};

// Configuration de la pagination
export const PAGINATION_CONFIG = {
  defaultLimit: 10,
  maxLimit: 100,
  defaultPage: 1,
};

// Types pour les paramètres d'API
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  q?: string;
  search?: string;
}

export interface FilterParams extends PaginationParams {
  [key: string]: any;
}

// Helper pour construire les URLs avec paramètres
export const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
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

// Configuration des endpoints de l'API - ALIGNÉE AVEC index.js
export const API_ENDPOINTS = {
  // Santé et documentation
  health: '/health',
  root: '/', // Documentation complète de l'API

  // ================================================
  // AUTHENTIFICATION & UTILISATEURS
  // ================================================
  users: {
    // Authentification
    register: '/users/register',
    login: '/users/login',
    logout: '/users/logout', // AJOUT
    verifyEmail: (token: string) => `/users/verify-email/${token}`, // AJOUT
    forgotPassword: '/users/password/forgot', // CORRECTION
    resetPassword: '/users/password/reset', // CORRECTION
    
    // Profil
    profile: '/users/profile',
    updateProfile: '/users/profile',
    updatePhoto: '/users/profile/photo', // AJOUT
    deletePhoto: '/users/profile/photo', // AJOUT
    changePassword: '/users/change-password',
    
    // Professionnel
    submitProfessional: '/users/professional/submit', // AJOUT
    professionalStatus: '/users/professional/status', // AJOUT
    
    // Préférences
    updatePreferences: '/users/preferences', // AJOUT
    updatePrivacy: '/users/privacy', // AJOUT
    
    // Autres
    sendVerificationEmail: '/users/send-verification-email', // AJOUT
    statistics: '/users/statistics', // AJOUT
    typesUtilisateurs: '/users/types-utilisateurs',
    
    // Administration
    admin: {
      getAllUsers: '/users/admin/users', // AJOUT
      getUserById: (id: number) => `/users/admin/users/${id}`, // AJOUT
      getPendingProfessionals: '/users/admin/professionals/pending', // AJOUT
      validateProfessional: (id: number) => `/users/admin/users/${id}/validate`, // AJOUT
      updateUserStatus: (id: number) => `/users/admin/users/${id}/status`, // AJOUT
      assignRole: (id: number) => `/users/admin/users/${id}/roles`, // AJOUT
      removeRole: (id: number) => `/users/admin/users/${id}/roles`, // AJOUT
      globalStatistics: '/users/admin/statistics', // AJOUT
    }
  },

  // ================================================
  // METADATA (Données de référence)
  // ================================================
  metadata: {
    all: '/metadata/all',
    statistics: '/metadata/statistics',
    
    materiaux: {
      list: '/metadata/materiaux',
      create: '/metadata/materiaux',
      update: (id: number) => `/metadata/materiaux/${id}`,
      delete: (id: number) => `/metadata/materiaux/${id}`,
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
    
    typesOeuvres: '/metadata/types-oeuvres',
    genres: '/metadata/genres',
    editeurs: '/metadata/editeurs',
    typesOrganisations: '/metadata/types-organisations',
    
    geographie: {
      wilayas: '/metadata/wilayas',
      searchWilayas: '/metadata/wilayas/search',
      dairasByWilaya: (id: number) => `/metadata/wilayas/${id}/dairas`,
      communesByDaira: (id: number) => `/metadata/dairas/${id}/communes`,
      localitesByCommune: (id: number) => `/metadata/communes/${id}/localites`,
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
    documentation: '/oeuvres/api/documentation', // AJOUT
    
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
    statistics: '/evenements/statistics',
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
    uploadMedias: (id: number) => `/patrimoine/sites/${id}/medias`, // AJOUT
    deleteMedia: (id: number, mediaId: number) => `/patrimoine/sites/${id}/medias/${mediaId}`, // AJOUT
    updateHoraires: (id: number) => `/patrimoine/sites/${id}/horaires`, // AJOUT
    
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
    uploadMedias: (id: number) => `/artisanat/${id}/medias`,
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
    list: '/notifications',
    summary: '/notifications/summary',
    markAsRead: (id: number) => `/notifications/${id}/read`,
    markAllAsRead: '/notifications/read-all',
    markMultipleAsRead: '/notifications/read-multiple', // CORRECTION
    delete: (id: number) => `/notifications/${id}`,
    deleteRead: '/notifications/read/all',
    preferences: '/notifications/preferences',
    updatePreferences: '/notifications/preferences', // PUT
    testEmail: '/notifications/test-email',
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
    detail: (id: number) => `/programmes/${id}`,
    export: (evenementId: number) => `/programmes/evenement/${evenementId}/export`,
    create: (evenementId: number) => `/programmes/evenement/${evenementId}`,
    update: (id: number) => `/programmes/${id}`,
    delete: (id: number) => `/programmes/${id}`,
    reorder: (evenementId: number) => `/programmes/evenement/${evenementId}/reorder`,
    duplicate: (id: number) => `/programmes/${id}/duplicate`,
    updateStatus: (id: number) => `/programmes/${id}/statut`,
  },

  // ================================================
  // UPLOAD
  // ================================================
  upload: {
    info: '/upload/', // CORRECTION
    imagePublic: '/upload/image/public',
    image: '/upload/image',
    // Note: document et video ne sont pas dans les routes backend
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
    deletePortfolioMedia: (mediaId: number) => `/professionnel/portfolio/${mediaId}`, // AJOUT
    updatePortfolioMedia: (mediaId: number) => `/professionnel/portfolio/${mediaId}`, // AJOUT
    
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
    
    // Avancé (à implémenter)
    benchmark: '/professionnel/benchmark', // AJOUT
    recommendations: '/professionnel/recommendations', // AJOUT
    collaborationSuggestions: '/professionnel/collaboration/suggestions', // AJOUT
    
    // Support
    createTicket: '/professionnel/support/ticket', // AJOUT
    helpFaq: '/professionnel/help/faq',
  },

  // ================================================
  // DASHBOARD ADMIN
  // ================================================
  dashboard: {
    // Principal
    overview: '/dashboard/overview',
    stats: '/dashboard/stats',
    
    // Patrimoine
    patrimoine: '/dashboard/patrimoine',
    qrStats: '/dashboard/patrimoine/qr-stats',
    parcours: '/dashboard/patrimoine/parcours', // AJOUT
    
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
    validateUser: (id: number) => `/dashboard/users/${id}/validate`,
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
    patrimoineReport: '/dashboard/reports/patrimoine', // AJOUT
    
    // Configuration
    permissions: '/dashboard/config/permissions',
    metrics: '/dashboard/config/metrics',
    
    // Notifications
    notifications: '/dashboard/notifications', // AJOUT
    broadcastNotification: '/dashboard/notifications/broadcast', // AJOUT
    
    // Monitoring
    health: '/dashboard/monitoring/health',
    alerts: '/dashboard/monitoring/alerts', // AJOUT
    
    // Cache
    clearCache: '/dashboard/cache/clear', // AJOUT
    cacheStatus: '/dashboard/cache/status', // AJOUT
  },
};

// Helper pour créer l'URL complète
export const getApiUrl = (endpoint: string | ((id: number) => string) | ((id1: number, id2: number) => string), ...ids: number[]): string => {
  let path: string;
  
  if (typeof endpoint === 'function') {
    // Gestion des fonctions avec un ou plusieurs paramètres
    path = (endpoint as any)(...ids);
  } else {
    path = endpoint;
  }
  
  return `${API_BASE_URL}${path}`;
};

// Helper pour les headers d'authentification
export const getAuthHeaders = (token?: string | undefined): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers[AUTH_CONFIG.header] = `${AUTH_CONFIG.headerPrefix} ${token}`;
  }
  
  return headers;
};

// Types pour les permissions
export type UserRole = 'Admin' | 'Professionnel' | 'Visiteur' | 'Moderateur' | 'Super Admin';

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

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: ValidationError[];
  details?: ValidationError[];
  timestamp?: string;
  path?: string;
}
// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  data: T[];
  pagination: PaginationInfo;
}
// Configuration API exportée
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
  },
};

// Export par défaut
export default API_CONFIG;