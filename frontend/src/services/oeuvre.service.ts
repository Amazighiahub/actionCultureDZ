// services/oeuvre.service.ts - Service de gestion des œuvres corrigé

import { apiService, ApiResponse, PaginatedResponse } from './api.service';
import { API_ENDPOINTS } from '../config/api';
import { 
  Oeuvre, 
  OeuvreStatut,
  Livre,
  Film,
  AlbumMusical,
  Article,
  Artisanat,
  OeuvreArt
} from '../types/Oeuvre.types';
import { Media } from '../types/Media.types';

export interface OeuvreForm {
  titre: string;
  idTypeOeuvre: number;
  idLangue: number;
  description?: string;
  anneeCreation?: number;
  categories?: number[];
  tags?: string[];
  // Champs spécifiques selon le type
  isbn?: string;
  dureeMinutes?: number;
  realisateur?: string;
}

export interface OeuvreFilters {
  typeOeuvre?: number;
  langue?: number;
  categorie?: number[];
  tags?: string[];
  statut?: OeuvreStatut;
  anneeMin?: number;
  anneeMax?: number;
  saisiPar?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface OeuvreStats {
  total: number;
  parType: Record<number, number>;
  parStatut: Record<string, number>;
  vuesTotal: number;
  favorisTotal: number;
  commentairesTotal: number;
  noteMoyenne: number;
}

export interface ShareLinks {
  facebook: string;
  twitter: string;
  whatsapp: string;
  telegram: string;
  email: string;
  permalink: string;
}

export interface ApiDocumentation {
  version: string;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    parameters?: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    response?: {
      schema: any;
      example: any;
    };
  }>;
  schemas: Record<string, any>;
  authentication: {
    type: string;
    description: string;
  };
}

export interface SearchParams {
  q?: string;
  type?: string;
  limit?: number;
  page?: number;
}

export class OeuvreService {
  /**
   * Récupérer la liste des œuvres avec pagination et filtres
   */
  static async getAll(filters?: OeuvreFilters): Promise<PaginatedResponse<Oeuvre>> {
    return apiService.getPaginated<Oeuvre>(API_ENDPOINTS.oeuvres.list, filters);
  }

  /**
   * Récupérer une œuvre par son ID
   */
  static async getById(id: number): Promise<ApiResponse<Oeuvre>> {
    return apiService.get<Oeuvre>(API_ENDPOINTS.oeuvres.detail(id));
  }

  /**
   * Créer une nouvelle œuvre
   */
  static async create(data: OeuvreForm): Promise<ApiResponse<Oeuvre>> {
    return apiService.post<Oeuvre>(API_ENDPOINTS.oeuvres.create, data);
  }

  /**
   * Mettre à jour une œuvre
   */
  static async update(id: number, data: Partial<OeuvreForm>): Promise<ApiResponse<Oeuvre>> {
    return apiService.put<Oeuvre>(API_ENDPOINTS.oeuvres.update(id), data);
  }

  /**
   * Supprimer une œuvre
   */
  static async delete(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(API_ENDPOINTS.oeuvres.delete(id));
  }

  /**
   * Rechercher des œuvres
   */
  static async search(params: SearchParams): Promise<ApiResponse<Oeuvre[]>> {
    return apiService.get<Oeuvre[]>(API_ENDPOINTS.oeuvres.search, params);
  }

  /**
   * Récupérer les œuvres récentes
   */
  static async getRecent(limit = 10): Promise<ApiResponse<Oeuvre[]>> {
    return apiService.get<Oeuvre[]>(API_ENDPOINTS.oeuvres.recent, { limit });
  }

  /**
   * Récupérer les œuvres populaires
   */
  static async getPopular(limit = 10): Promise<ApiResponse<Oeuvre[]>> {
    return apiService.get<Oeuvre[]>(API_ENDPOINTS.oeuvres.popular, { limit });
  }

  /**
   * Récupérer les statistiques des œuvres
   */
  static async getStatistics(): Promise<ApiResponse<OeuvreStats>> {
    return apiService.get<OeuvreStats>(API_ENDPOINTS.oeuvres.statistics);
  }

  /**
   * Récupérer les liens de partage pour une œuvre
   */
  static async getShareLinks(id: number): Promise<ApiResponse<ShareLinks>> {
    return apiService.get<ShareLinks>(API_ENDPOINTS.oeuvres.shareLinks(id));
  }

  /**
   * Récupérer la documentation de l'API des œuvres
   */
  static async getApiDocumentation(): Promise<ApiResponse<ApiDocumentation>> {
    return apiService.get<ApiDocumentation>(API_ENDPOINTS.oeuvres.documentation);
  }

  /**
   * GESTION DES MÉDIAS
   */
  
  /**
   * Récupérer les médias d'une œuvre
   */
  static async getMedias(id: number): Promise<ApiResponse<Media[]>> {
    return apiService.get<Media[]>(API_ENDPOINTS.oeuvres.medias(id));
  }

  /**
   * Uploader un média pour une œuvre
   */
  static async uploadMedia(
    id: number, 
    file: File, 
    data?: { titre?: string; description?: string; ordre?: number }
  ): Promise<ApiResponse<Media>> {
    return apiService.upload<Media>(
      API_ENDPOINTS.oeuvres.uploadMedia(id), 
      file, 
      data
    );
  }

  /**
   * Uploader plusieurs médias
   */
  static async uploadMultipleMedias(
    id: number, 
    files: File[]
  ): Promise<ApiResponse<Media[]>> {
    const results: Media[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const response = await this.uploadMedia(id, file);
        if (response.success && response.data) {
          results.push(response.data);
        }
      } catch (error) {
        console.error('Erreur upload média:', error);
        errors.push(`Erreur pour ${file.name}`);
      }
    }
    
    return { 
      success: errors.length === 0, 
      data: results,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * Supprimer un média
   */
  static async deleteMedia(oeuvreId: number, mediaId: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(
      API_ENDPOINTS.oeuvres.deleteMedia(oeuvreId, mediaId)
    );
  }

  /**
   * ROUTES UTILISATEUR
   */
  
  /**
   * Récupérer mes œuvres
   */
  static async getMyWorks(filters?: OeuvreFilters): Promise<PaginatedResponse<Oeuvre>> {
    return apiService.getPaginated<Oeuvre>(API_ENDPOINTS.oeuvres.myWorks, filters);
  }

  /**
   * Récupérer mes statistiques
   */
  static async getMyStatistics(): Promise<ApiResponse<OeuvreStats>> {
    return apiService.get<OeuvreStats>(API_ENDPOINTS.oeuvres.myStats);
  }

  /**
   * ROUTES ADMIN
   */
  
  /**
   * Valider ou rejeter une œuvre
   */
  static async validate(
    id: number, 
    validated: boolean, 
    reason?: string
  ): Promise<ApiResponse<Oeuvre>> {
    return apiService.patch<Oeuvre>(
      API_ENDPOINTS.oeuvres.validate(id), 
      { validated, reason }
    );
  }

  /**
   * Récupérer les œuvres en attente de validation
   */
  static async getPending(page = 1, limit = 10): Promise<PaginatedResponse<Oeuvre>> {
    return apiService.getPaginated<Oeuvre>(
      API_ENDPOINTS.oeuvres.pending, 
      { page, limit }
    );
  }

  /**
   * Récupérer les œuvres rejetées
   */
  static async getRejected(page = 1, limit = 10): Promise<PaginatedResponse<Oeuvre>> {
    return apiService.getPaginated<Oeuvre>(
      API_ENDPOINTS.oeuvres.rejected, 
      { page, limit }
    );
  }

  /**
   * MÉTHODES SPÉCIFIQUES PAR TYPE
   */

  /**
   * Créer un livre
   */
  static async createLivre(data: OeuvreForm & Partial<Livre>): Promise<ApiResponse<Oeuvre>> {
    return this.create({ ...data, idTypeOeuvre: 1 }); // Assumant que 1 = Livre
  }

  /**
   * Créer un film
   */
  static async createFilm(data: OeuvreForm & Partial<Film>): Promise<ApiResponse<Oeuvre>> {
    return this.create({ ...data, idTypeOeuvre: 2 }); // Assumant que 2 = Film
  }

  /**
   * Créer un album musical
   */
  static async createAlbumMusical(data: OeuvreForm & Partial<AlbumMusical>): Promise<ApiResponse<Oeuvre>> {
    return this.create({ ...data, idTypeOeuvre: 3 }); // Assumant que 3 = Album Musical
  }

  /**
   * Créer un article
   */
  static async createArticle(data: OeuvreForm & Partial<Article>): Promise<ApiResponse<Oeuvre>> {
    return this.create({ ...data, idTypeOeuvre: 4 }); // Assumant que 4 = Article
  }

  /**
   * HELPERS
   */

  /**
   * Vérifier si une œuvre appartient à l'utilisateur connecté
   */
  static isOwner(oeuvre: Oeuvre, userId: number): boolean {
    return oeuvre.saisiPar === userId;
  }

  /**
   * Vérifier si une œuvre peut être modifiée
   */
  static canEdit(oeuvre: Oeuvre, userId: number, isAdmin: boolean): boolean {
    return this.isOwner(oeuvre, userId) || isAdmin;
  }

  /**
   * Vérifier si une œuvre peut être supprimée
   */
  static canDelete(oeuvre: Oeuvre, userId: number, isAdmin: boolean): boolean {
    return (this.isOwner(oeuvre, userId) && oeuvre.statut === 'brouillon') || isAdmin;
  }

  /**
   * Formater une œuvre pour l'affichage
   */
  static formatForDisplay(oeuvre: Oeuvre): any {
    return {
      ...oeuvre,
      typeLabel: oeuvre.typeOeuvre?.nomType || 'Non défini',
      langueLabel: oeuvre.langue?.nom || 'Non définie',
      statutLabel: this.getStatutLabel(oeuvre.statut),
      canBeEdited: oeuvre.statut === 'brouillon' || oeuvre.statut === 'refuse'
    };
  }

  /**
   * Obtenir le label d'un statut
   */
  static getStatutLabel(statut: OeuvreStatut): string {
    const labels: Record<OeuvreStatut, string> = {
      brouillon: 'Brouillon',
      en_attente: 'En attente de validation',
      valide: 'Validée',
      refuse: 'Refusée',
      archive: 'Archivée'
    };
    return labels[statut] || statut;
  }

  /**
   * Obtenir la couleur d'un statut
   */
  static getStatutColor(statut: OeuvreStatut): string {
    const colors: Record<OeuvreStatut, string> = {
      brouillon: 'gray',
      en_attente: 'orange',
      valide: 'green',
      refuse: 'red',
      archive: 'blue'
    };
    return colors[statut] || 'gray';
  }

  /**
   * Obtenir l'icône selon le type d'œuvre
   */
  static getTypeIcon(typeId?: number): string {
    const icons: Record<number, string> = {
      1: '📚', // Livre
      2: '🎬', // Film
      3: '🎵', // Album Musical
      4: '📰', // Article
      5: '🎨', // Œuvre d'Art
      6: '🏺'  // Artisanat
    };
    return icons[typeId || 0] || '📄';
  }

  /**
   * Vérifier si une œuvre est publique
   */
  static isPublic(oeuvre: Oeuvre): boolean {
    return oeuvre.statut === 'valide';
  }

  /**
   * Obtenir un résumé de l'œuvre
   */
  static getSummary(oeuvre: Oeuvre): string {
    const parts = [];
    
    if (oeuvre.typeOeuvre) {
      parts.push(oeuvre.typeOeuvre.nomType);
    }
    
    if (oeuvre.langue) {
      parts.push(oeuvre.langue.nom);
    }
    
    if (oeuvre.anneeCreation) {
      parts.push(oeuvre.anneeCreation.toString());
    }
    
    return parts.join(' • ');
  }

  /**
   * Filtrer les œuvres par statut
   */
  static filterByStatus(oeuvres: Oeuvre[], statut: OeuvreStatut): Oeuvre[] {
    return oeuvres.filter(o => o.statut === statut);
  }

  /**
   * Grouper les œuvres par type
   */
  static groupByType(oeuvres: Oeuvre[]): Record<string, Oeuvre[]> {
    return oeuvres.reduce((acc, oeuvre) => {
      const type = oeuvre.typeOeuvre?.nomType || 'Sans type';
      if (!acc[type]) acc[type] = [];
      acc[type].push(oeuvre);
      return acc;
    }, {} as Record<string, Oeuvre[]>);
  }

  /**
   * Exporter les œuvres en format JSON
   */
  static exportToJSON(oeuvres: Oeuvre[]): string {
    return JSON.stringify(oeuvres, null, 2);
  }

  /**
   * Exporter les œuvres en format CSV
   */
  static exportToCSV(oeuvres: Oeuvre[]): string {
    const headers = ['ID', 'Titre', 'Type', 'Langue', 'Année', 'Statut'];
    const rows = oeuvres.map(o => [
      o.idOeuvre,
      o.titre,
      o.typeOeuvre?.nomType || '',
      o.langue?.nom || '',
      o.anneeCreation || '',
      o.statut
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csv;
  }
}

export default OeuvreService;