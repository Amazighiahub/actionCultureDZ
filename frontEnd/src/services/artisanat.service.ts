// services/artisanat.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_ENDPOINTS, ApiResponse, PaginatedResponse, FilterParams } from '@/config/api';
import { BaseService } from './base.service';
import { httpClient } from './httpClient';

interface Artisanat {
  id: number;
  nom: string;
  description: string;
  id_materiau: number;
  id_technique: number;
  artisan_id: number;
  wilaya_id: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande: boolean;
  en_stock?: number;
  medias?: MediaArtisanat[];
  tags?: string[];
  note_moyenne?: number;
  nombre_avis?: number;
  created_at: string;
  updated_at: string;
  // Données étendues pour la page détail
  Oeuvre?: {
    id_oeuvre: number;
    titre: { fr: string; ar: string; en: string };
    description?: { fr: string; ar: string; en: string };
    annee_creation?: number;
    statut: string;
    date_creation: string;
    Saiseur?: {
      id_user: number;
      nom: string;
      prenom: string;
      photo_url?: string;
      email?: string;
      telephone?: string;
      biographie?: string;
      role?: string;
      Wilaya?: { nom: string; code: string };
    };
    Media?: Array<{
      id_media: number;
      url: string;
      type_media: string;
      thumbnail_url?: string;
      ordre?: number;
    }>;
    TypeOeuvre?: { id_type_oeuvre: number; nom_type: string };
    Commentaires?: Array<{
      id_commentaire: number;
      id_user: number;
      nom_user: string;
      prenom_user: string;
      photo_url?: string;
      commentaire: string;
      note?: number;
      date_creation: string;
    }>;
  };
  Materiau?: { id_materiau: number; nom: string; description?: string };
  Technique?: { id_technique: number; nom: string; description?: string };
  statistiques?: {
    vues: number;
    favoris: number;
    commentaires: number;
  };
  similaires?: Artisanat[];
  autres_oeuvres_artisan?: Artisanat[];
}

interface CreateArtisanatData {
  nom: string;
  description: string;
  id_materiau: number;
  id_technique: number;
  prix_min?: number;
  prix_max?: number;
  delai_fabrication?: number;
  sur_commande?: boolean;
  en_stock?: number;
  tags?: string[];
}

type UpdateArtisanatData = Partial<CreateArtisanatData>;

interface MediaArtisanat {
  id: number;
  url: string;
  type: string;
  titre?: string;
  ordre: number;
  is_principale: boolean;
}

interface Artisan {
  id: number;
  user_id: number;
  nom: string;
  prenom: string;
  specialites: string[];
  wilaya: string;
  experience_annees: number;
  certifications?: string[];
  photo_url?: string;
}

interface SearchArtisanatParams extends FilterParams {
  q?: string;
  materiau_id?: number;
  technique_id?: number;
  wilaya_id?: number;
  prix_min?: number;
  prix_max?: number;
  sur_commande?: boolean;
  en_stock?: boolean;
  artisan_id?: number;
}

interface ArtisanatStatistics {
  total_produits: number;
  total_artisans: number;
  produits_par_materiau: Record<string, number>;
  produits_par_technique: Record<string, number>;
  artisans_par_wilaya: Array<{ wilaya: string; count: number }>;
  moyenne_prix: number;
}

class ArtisanatService extends BaseService<Artisanat, CreateArtisanatData, UpdateArtisanatData> {
  constructor() {
    super(API_ENDPOINTS.artisanat.list);
  }

  // Recherche et listing
  async search(params: SearchArtisanatParams): Promise<ApiResponse<PaginatedResponse<Artisanat>>> {
    return httpClient.getPaginated<Artisanat>(API_ENDPOINTS.artisanat.search, params);
  }

  async getArtisansByRegion(wilayaId: number): Promise<ApiResponse<Artisan[]>> {
    return httpClient.get<Artisan[]>(API_ENDPOINTS.artisanat.artisansByRegion(wilayaId));
  }

  // Détails
  async getDetail(id: number): Promise<ApiResponse<Artisanat>> {
    console.log(`🔍 Appel API: GET ${API_ENDPOINTS.artisanat.detail(id)}`);
    
    // Données de test pour l'artisanat ID 2
    if (id === 2) {
      console.log('📝 Utilisation des données de test pour l\'artisanat ID 2');
      return {
        success: true,
        data: {
          id: 2,
          nom: 'Vase Berbère Traditionnel',
          description: 'Magnifique vase en céramique artisanale décoré avec des motifs berbères traditionnels.',
          id_materiau: 1,
          id_technique: 1,
          artisan_id: 2,
          wilaya_id: 15,
          prix_min: 7000,
          prix_max: 8000,
          sur_commande: true,
          en_stock: 2,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T15:30:00Z',
          // Ajout des données étendues pour la page détail
          Oeuvre: {
            id_oeuvre: 2,
            titre: { 
              fr: 'Vase Berbère Traditionnel', 
              ar: 'أمازيغي تقليدي', 
              en: 'Traditional Berber Vase' 
            },
            description: {
              fr: 'Magnifique vase en céramique artisanale décoré avec des motifs berbères traditionnels. Pièce unique réalisée à la main par Karim Benali, artisan professionnel spécialisé dans l\'art berbère.',
              ar: 'إزهار خزفي يدوي مزين بزخارف أمازيغية تقليدية. قطعة فريدة من صنع كريم بن علي، حرفي محترف متخصص في الفن الأمازيغي.',
              en: 'Magnificent handmade ceramic vase decorated with traditional Berber patterns. Unique piece created by Karim Benali, professional artisan specializing in Berber art.'
            },
            statut: 'disponible',
            date_creation: '2024-01-15T10:00:00Z',
            Saiseur: {
              id_user: 2,
              nom: 'Benali',
              prenom: 'Karim',
              photo_url: '/images/karim-benali.jpg',
              email: 'karim.benali@email.com',
              telephone: '+213123456789',
              biographie: 'Artisan professionnel depuis 15 ans, spécialisé dans l\'art berbère traditionnel. Formé à Tizi-Ouzou, je perpétue les techniques ancestrales de mes ancêtres tout en y apportant ma touche personnelle. Mes œuvres sont exposées dans plusieurs galeries en Algérie et à l\'étranger.',
              role: 'professionnel',
              Wilaya: { nom: 'Tizi-Ouzou', code: '15' }
            },
            Media: [
              {
                id_media: 1,
                url: '/images/vase-berbere-1.jpg',
                type_media: 'image/jpeg',
                thumbnail_url: '/images/vase-berbere-1-thumb.jpg',
                ordre: 1
              },
              {
                id_media: 2,
                url: '/images/vase-berbere-2.jpg',
                type_media: 'image/jpeg',
                thumbnail_url: '/images/vase-berbere-2-thumb.jpg',
                ordre: 2
              },
              {
                id_media: 3,
                url: '/images/vase-berbere-3.jpg',
                type_media: 'image/jpeg',
                thumbnail_url: '/images/vase-berbere-3-thumb.jpg',
                ordre: 3
              }
            ],
            TypeOeuvre: { 
              id_type_oeuvre: 1, 
              nom_type: 'Artisanat' 
            },
            Commentaires: [
              {
                id_commentaire: 1,
                id_user: 3,
                nom_user: 'Dupont',
                prenom_user: 'Marie',
                photo_url: '/images/marie-dupont.jpg',
                commentaire: 'Magnifique œuvre ! La qualité est exceptionnelle et les motifs berbères sont magnifiques.',
                note: 5,
                date_creation: '2024-01-20T14:30:00Z'
              },
              {
                id_commentaire: 2,
                id_user: 4,
                nom_user: 'Martin',
                prenom_user: 'Paul',
                photo_url: '/images/paul-martin.jpg',
                commentaire: 'Très beau travail. J\'apprécie particulièrement la finesse des détails.',
                note: 4,
                date_creation: '2024-01-21T09:15:00Z'
              },
              {
                id_commentaire: 3,
                id_user: 5,
                nom_user: 'Leila',
                prenom_user: 'Fatima',
                photo_url: '/images/leila-fatima.jpg',
                commentaire: 'Cet artisanat mérite vraiment d\'être reconnu. Bravo Karim !',
                note: 5,
                date_creation: '2024-01-22T11:20:00Z'
              }
            ]
          },
          Materiau: {
            id_materiau: 1,
            nom: 'Céramique',
            description: 'Argile locale de haute qualité, cuite à haute température pour une durabilité exceptionnelle.'
          },
          Technique: {
            id_technique: 1,
            nom: 'Tournage',
            description: 'Technique traditionnelle de tournage sur tour de potier.'
          },
          statistiques: {
            vues: 156,
            favoris: 42,
            commentaires: 3
          },
          similaires: [
            {
              id: 3,
              nom: 'Plat Berbère',
              description: 'Plat en céramique artisanale',
              id_materiau: 1,
              id_technique: 1,
              artisan_id: 3,
              wilaya_id: 15,
              prix_min: 5500,
              prix_max: 6500,
              sur_commande: false,
              en_stock: 3,
              created_at: '2024-01-10T10:00:00Z',
              updated_at: '2024-01-15T12:00:00Z',
              Oeuvre: {
                id_oeuvre: 3,
                titre: { fr: 'Plat Berbère', ar: 'صحن أمازيغي', en: 'Berber Plate' },
                statut: 'disponible',
                date_creation: '2024-01-10T10:00:00Z'
              }
            },
            {
              id: 4,
              nom: 'Bijou Berbère',
              description: 'Bijou traditionnel berbère en argent massif',
              id_materiau: 2,
              id_technique: 2,
              artisan_id: 3,
              wilaya_id: 16,
              prix_min: 4000,
              prix_max: 5000,
              sur_commande: false,
              en_stock: 1,
              created_at: '2024-01-12T14:00:00Z',
              updated_at: '2024-01-18T16:00:00Z',
              Oeuvre: {
                id_oeuvre: 4,
                titre: { fr: 'Bijou Berbère', ar: 'حلي أمازيغي', en: 'Berber Jewelry' },
                statut: 'disponible',
                date_creation: '2024-01-12T14:00:00Z'
              }
            }
          ],
          autres_oeuvres_artisan: [
            {
              id: 6,
              nom: 'Plat Berbère Céramique',
              description: 'Plat en céramique avec motifs berbères',
              id_materiau: 1,
              id_technique: 1,
              artisan_id: 2,
              wilaya_id: 15,
              prix_min: 2500,
              prix_max: 3000,
              sur_commande: false,
              en_stock: 2,
              created_at: '2024-01-05T09:00:00Z',
              updated_at: '2024-01-10T11:00:00Z',
              Oeuvre: {
                id_oeuvre: 6,
                titre: { fr: 'Plat Berbère Céramique', ar: 'صحن أمازيغي خزفي', en: 'Berber Ceramic Plate' },
                statut: 'disponible',
                date_creation: '2024-01-05T09:00:00Z'
              }
            },
            {
              id: 7,
              nom: 'Coussin Berbère',
              description: 'Coussin avec broderie berbère traditionnelle',
              id_materiau: 3,
              id_technique: 3,
              artisan_id: 2,
              wilaya_id: 15,
              prix_min: 5000,
              prix_max: 6000,
              sur_commande: true,
              en_stock: 1,
              created_at: '2024-01-08T14:00:00Z',
              updated_at: '2024-01-13T16:00:00Z',
              Oeuvre: {
                id_oeuvre: 7,
                titre: { fr: 'Coussin Berbère', ar: 'وسادة أمازيغية', en: 'Berber Cushion' },
                statut: 'disponible',
                date_creation: '2024-01-08T14:00:00Z'
              }
            }
          ]
        }
      };
    }
    
    const response = await httpClient.get<Artisanat>(API_ENDPOINTS.artisanat.detail(id));
    console.log('📡 Réponse getDetail:', response);
    return response;
  }

  // Médias
  async uploadMedias(
    artisanatId: number, 
    files: File[]
  ): Promise<ApiResponse<MediaArtisanat[]>> {
    // TODO: Implémenter l'upload des médias
    console.log('Upload médias pour artisanat:', artisanatId, files);
    return { success: false, error: 'Non implémenté' };
  }

  // Œuvres d'un artisan
  async getArtisanWorks(artisanId: number): Promise<ApiResponse<any[]>> {
    // TODO: Implémenter la récupération des œuvres de l'artisan
    console.log('Récupération œuvres artisan:', artisanId);
    return { success: true, data: [] };
  }

  // Statistiques
  async getStatistics(): Promise<ApiResponse<ArtisanatStatistics>> {
    return httpClient.get<ArtisanatStatistics>(API_ENDPOINTS.artisanat.statistics);
  }
}

export const artisanatService = new ArtisanatService();
export type { 
  Artisanat, CreateArtisanatData, UpdateArtisanatData, 
  MediaArtisanat, Artisan, SearchArtisanatParams, ArtisanatStatistics 
};