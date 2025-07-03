// services/oeuvre.service.wrapper.ts
// Wrapper pour gérer les IDs string | number de manière transparente
/* eslint-disable @typescript-eslint/no-explicit-any */
import { oeuvreService } from './oeuvre.service';
import { ApiResponse } from '@/config/api';

/**
 * Convertit un ID string | number en number
 */
function toNumericId(id: string | number): number {
  return typeof id === 'string' ? parseInt(id, 10) : id;
}

/**
 * Wrapper pour oeuvreService qui accepte des IDs flexibles
 */
export const oeuvreServiceWrapper = {
  /**
   * Récupérer une œuvre par ID (accepte string ou number)
   */
  async getOeuvreById(id: string | number): Promise<ApiResponse<any>> {
    const numericId = toNumericId(id);
    
    // Vérifier que la conversion est valide
    if (isNaN(numericId)) {
      return {
        success: false,
        error: 'ID invalide'
      };
    }
    
    return oeuvreService.getOeuvreById(numericId);
  },

  /**
   * Mettre à jour une œuvre (accepte string ou number pour l'ID)
   */
  async updateOeuvre(id: string | number, data: any): Promise<ApiResponse<any>> {
    const numericId = toNumericId(id);
    
    if (isNaN(numericId)) {
      return {
        success: false,
        error: 'ID invalide'
      };
    }
    
    return oeuvreService.updateOeuvre(numericId, data);
  },

  /**
   * Supprimer une œuvre (accepte string ou number pour l'ID)
   */
  async deleteOeuvre(id: string | number): Promise<ApiResponse<void>> {
    const numericId = toNumericId(id);
    
    if (isNaN(numericId)) {
      return {
        success: false,
        error: 'ID invalide'
      };
    }
    
    return oeuvreService.deleteOeuvre(numericId);
  },

  // Exposer toutes les autres méthodes qui n'ont pas besoin de conversion
  ...oeuvreService
};

// Alternative : Monkey patch du service existant
export function patchOeuvreService() {
  const originalGetById = oeuvreService.getOeuvreById;
  const originalUpdate = oeuvreService.updateOeuvre;
  const originalDelete = oeuvreService.deleteOeuvre;

  // Override des méthodes
  (oeuvreService as any).getOeuvreById = function(id: string | number) {
    return originalGetById.call(this, toNumericId(id));
  };

  (oeuvreService as any).updateOeuvre = function(id: string | number, data: any) {
    return originalUpdate.call(this, toNumericId(id), data);
  };

  (oeuvreService as any).deleteOeuvre = function(id: string | number) {
    return originalDelete.call(this, toNumericId(id));
  };
}
