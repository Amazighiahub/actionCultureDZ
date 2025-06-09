// types/api.types.ts - Types pour les réponses API

// Type pour la pagination
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Type de base pour toutes les réponses API
export interface BaseApiResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// Type pour une réponse avec données simples
export interface ApiResponse<T> extends BaseApiResponse {
  data?: T;
}

// Type pour une réponse avec données paginées
export interface PaginatedApiResponse<T> extends BaseApiResponse {
  data?: T[];
  pagination?: PaginationInfo;
}

// Type guards pour vérifier les réponses
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}

export function isPaginatedSuccessResponse<T>(response: PaginatedApiResponse<T>): response is PaginatedApiResponse<T> & { data: T[]; pagination: PaginationInfo } {
  return response.success === true && response.data !== undefined && response.pagination !== undefined;
}

// Helper pour extraire l'erreur d'une réponse
export function getErrorMessage(response: BaseApiResponse, defaultMessage: string = 'Une erreur est survenue'): string {
  return response.error || response.message || defaultMessage;
}