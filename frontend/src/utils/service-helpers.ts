// utils/service-helpers.ts
import { ApiResponse } from '@/config/api';

/**
 * Convertit un ID string | number en number
 * Throw une erreur si la conversion échoue
 */
export function toNumericId(id: string | number | undefined): number {
  if (id === undefined || id === null) {
    throw new Error('ID manquant');
  }
  
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (isNaN(numericId)) {
    throw new Error(`ID invalide: ${id}`);
  }
  
  return numericId;
}

/**
 * Convertit un ID string | number en number de manière sûre
 * Retourne null si la conversion échoue
 */
export function toNumericIdSafe(id: string | number | undefined): number | null {
  if (id === undefined || id === null) {
    return null;
  }
  
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (isNaN(numericId)) {
    return null;
  }
  
  return numericId;
}

/**
 * Wrapper générique pour les méthodes de service qui nécessitent un ID numérique
 */
export async function withNumericId<T>(
  id: string | number | undefined,
  callback: (numericId: number) => Promise<ApiResponse<T>>
): Promise<ApiResponse<T>> {
  try {
    const numericId = toNumericId(id);
    return await callback(numericId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ID invalide'
    };
  }
}

/**
 * Wrapper pour les méthodes qui retournent une Promise simple
 */
export async function withNumericIdSimple<T>(
  id: string | number | undefined,
  callback: (numericId: number) => Promise<T>
): Promise<T> {
  const numericId = toNumericId(id);
  return await callback(numericId);
}