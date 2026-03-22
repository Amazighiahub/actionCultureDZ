// services/oeuvre.service.wrapper.ts
// Wrapper pour gérer les IDs string | number de manière transparente
import { oeuvreService } from './oeuvre.service';
import { ApiResponse } from '@/config/api';
import type { Oeuvre } from '@/types/models/oeuvre.types';
import type { CreateOeuvreBackendDTO } from '@/types/api/create-oeuvre-backend.dto';
import type { CreateOeuvreCompleteDTO } from '@/types/api/oeuvre-creation.types';

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
  async getOeuvreById(id: string | number): Promise<ApiResponse<Oeuvre>> {
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
  async updateOeuvre(id: string | number, data: Partial<CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO>): Promise<ApiResponse<Oeuvre>> {
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
  (oeuvreService as Record<string, Function>).getOeuvreById = function(id: string | number) {
    return originalGetById.call(this, toNumericId(id));
  };

  (oeuvreService as Record<string, Function>).updateOeuvre = function(id: string | number, data: Partial<CreateOeuvreBackendDTO | CreateOeuvreCompleteDTO>) {
    return originalUpdate.call(this, toNumericId(id), data);
  };

  (oeuvreService as Record<string, Function>).deleteOeuvre = function(id: string | number) {
    return originalDelete.call(this, toNumericId(id));
  };
}
