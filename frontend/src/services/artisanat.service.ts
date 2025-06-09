// services/artisanat.service.ts - Service de gestion de l'artisanat corrigé

import { apiService, ApiResponse, PaginatedResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { Artisanat } from '../types/Oeuvre.types';
import { Media } from '../types/Media.types';
import { User } from '../types/User.types';

export interface ArtisanatFilters {
  materiau?: number;
  technique?: number;
  wilaya?: number;
  prixMin?: number;
  prixMax?: number;
  artisan?: number;
  disponible?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ArtisanatStats {
  total: number;
  parMateriau: Record<number, number>;
  parTechnique: Record<number, number>;
  parWilaya: Record<number, number>;
  prixMoyen: number;
  artisansActifs: number;
  produitsVendus: number;
  chiffreAffaires: number;
}

export interface ArtisanInfo {
  user: User;
  specialites: string[];
  produits: number;
  notesMoyenne: number;
  ventesMois: number;
  anciennete: number;
}

export interface SearchParams {
  q?: string;
  page?: number;
  limit?: number;
}

export class ArtisanatService {
  /**
   * Récupérer la liste des produits artisanaux
   */
  static async getAll(filters?: ArtisanatFilters): Promise<PaginatedResponse<Artisanat>> {
    return apiService.getPaginated<Artisanat>(API_ENDPOINTS.artisanat.list, filters);
  }

  /**
   * Rechercher des produits artisanaux
   */
  static async search(params: SearchParams & ArtisanatFilters): Promise<ApiResponse<Artisanat[]>> {
    return apiService.get<Artisanat[]>(
      API_ENDPOINTS.artisanat.search, 
      params
    );
  }

  /**
   * Récupérer les statistiques
   */
  static async getStatistics(): Promise<ApiResponse<ArtisanatStats>> {
    return apiService.get<ArtisanatStats>(
      API_ENDPOINTS.artisanat.statistics
    );
  }

  /**
   * Récupérer le détail d'un produit
   */
  static async getById(id: number): Promise<ApiResponse<Artisanat>> {
    return apiService.get<Artisanat>(
      API_ENDPOINTS.artisanat.detail(id)
    );
  }

  /**
   * Récupérer les artisans d'une région
   */
  static async getArtisansByRegion(wilayaId: number): Promise<ApiResponse<ArtisanInfo[]>> {
    return apiService.get<ArtisanInfo[]>(
      API_ENDPOINTS.artisanat.artisansByRegion(wilayaId)
    );
  }

  /**
   * Créer un nouveau produit artisanal
   */
  static async create(data: Partial<Artisanat>): Promise<ApiResponse<Artisanat>> {
    return apiService.post<Artisanat>(
      API_ENDPOINTS.artisanat.create, 
      data
    );
  }

  /**
   * Mettre à jour un produit
   */
  static async update(id: number, data: Partial<Artisanat>): Promise<ApiResponse<Artisanat>> {
    return apiService.put<Artisanat>(
      API_ENDPOINTS.artisanat.update(id), 
      data
    );
  }

  /**
   * Supprimer un produit
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.artisanat.delete(id)
    );
  }

  /**
   * Uploader des médias pour un produit
   */
  static async uploadMedias(id: number, files: File[]): Promise<ApiResponse<Media[]>> {
    const results: Media[] = [];
    
    for (const file of files) {
      try {
        const response = await apiService.upload<Media>(
          API_ENDPOINTS.artisanat.uploadMedias(id),
          file
        );
        if (response.success && response.data) {
          results.push(response.data);
        }
      } catch (error) {
        console.error('Erreur upload média:', error);
      }
    }
    
    return { success: true, data: results };
  }

  /**
   * HELPERS
   */

  /**
   * Calculer le prix avec remise
   */
  static calculateDiscountedPrice(price: number, discount: number): number {
    return price - (price * discount / 100);
  }

  /**
   * Formater le prix
   */
  static formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  /**
   * Obtenir les catégories d'artisanat
   */
  static getCategories(): Array<{ value: string; label: string }> {
    return [
      { value: 'poterie', label: 'Poterie' },
      { value: 'tissage', label: 'Tissage' },
      { value: 'bijouterie', label: 'Bijouterie' },
      { value: 'maroquinerie', label: 'Maroquinerie' },
      { value: 'dinanderie', label: 'Dinanderie' },
      { value: 'vannerie', label: 'Vannerie' },
      { value: 'broderie', label: 'Broderie' },
      { value: 'sculpture', label: 'Sculpture sur bois' },
      { value: 'calligraphie', label: 'Calligraphie' },
      { value: 'autre', label: 'Autre' }
    ];
  }

  /**
   * Grouper les produits par artisan
   */
  static groupByArtisan(products: Artisanat[]): Record<number, Artisanat[]> {
    return products.reduce((acc, product) => {
      const artisanId = product.oeuvre?.saisiPar || 0;
      if (!acc[artisanId]) acc[artisanId] = [];
      acc[artisanId].push(product);
      return acc;
    }, {} as Record<number, Artisanat[]>);
  }

  /**
   * Filtrer les produits disponibles
   */
  static filterAvailable(products: Artisanat[]): Artisanat[] {
    return products.filter(p => {
      // Logique pour déterminer si un produit est disponible
      // Par exemple, basé sur le stock, le statut, etc.
      return p.oeuvre?.statut === 'valide';
    });
  }

  /**
   * Calculer les statistiques d'un artisan
   */
  static calculateArtisanStats(products: Artisanat[]): {
    totalProduits: number;
    prixMoyen: number;
    materiaux: string[];
    techniques: string[];
  } {
    const totalProduits = products.length;
    const prixTotal = products.reduce((sum, p) => sum + (p.prix || 0), 0);
    const prixMoyen = totalProduits > 0 ? prixTotal / totalProduits : 0;
    
    const materiaux = [...new Set(products.map(p => p.materiau?.nom).filter(Boolean))];
    const techniques = [...new Set(products.map(p => p.technique?.nom).filter(Boolean))];
    
    return {
      totalProduits,
      prixMoyen,
      materiaux: materiaux as string[],
      techniques: techniques as string[]
    };
  }

  /**
   * Valider les dimensions
   */
  static validateDimensions(dimensions: string): boolean {
    // Format attendu: "L x l x H cm" ou "Ø x H cm"
    const pattern = /^\d+(\.\d+)?(\s*x\s*\d+(\.\d+)?)*\s*(cm|mm|m)$/i;
    return pattern.test(dimensions);
  }

  /**
   * Formater les dimensions
   */
  static formatDimensions(dimensions: string): string {
    // Nettoyer et formater les dimensions
    return dimensions.trim()
      .replace(/\s+/g, ' ')
      .replace(/x/gi, ' × ')
      .replace(/\s+/g, ' ');
  }
}

export default ArtisanatService;