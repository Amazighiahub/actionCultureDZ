import type { TagMotCle, Editeur, TypeOeuvre, Langue, Categorie, Materiau, Technique } from '@/types/models/references.types';
import type { ArticleBlock, ArticleFormData } from '@/types/models/articles.types';
import type {
  IntervenantExistant,
  NouvelIntervenant,
  ContributeurOeuvre,
  EditeurOeuvre,
} from '@/types/api/oeuvre-creation.types';
import { TypeUser } from '@/types/models/type-user.types';

// Type pour les médias
export interface MediaUpload {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  isPrincipal: boolean;
  titre?: string;
  description?: string;
  uploadProgress?: number;
}

// Type pour les métadonnées étendues
export interface ExtendedMetadata {
  types_oeuvres?: TypeOeuvre[];
  langues?: Langue[];
  categories?: Categorie[];
  materiaux?: Materiau[];
  techniques?: Technique[];
  editeurs?: Editeur[];
  tags?: TagMotCle[];
  types_users?: TypeUser[];
}

// Type pour le formulaire
export interface FormData {
  // Champs généraux
  titre: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  description: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  categories: number[];
  tags: string[];

  // Auteur
  je_suis_auteur?: boolean;

  // Traduction
  is_traduction?: boolean;
  id_oeuvre_originale?: number;
  oeuvre_originale_titre?: string;

  // Champs spécifiques selon le type
  isbn?: string;
  nb_pages?: number;
  duree_minutes?: number;
  realisateur?: string;
  duree_album?: string;
  label?: string;
  nb_pistes?: number;
  auteur?: string;
  source?: string;
  resume_article?: string;
  url_source?: string;
  journal?: string;
  doi?: string;
  pages?: string;
  volume?: string;
  numero?: string;
  peer_reviewed?: boolean;
  id_materiau?: number;
  id_technique?: number;
  dimensions?: string;
  poids?: number;
  technique_art?: string;
  dimensions_art?: string;
  support?: string;
}

// Type for the article editor save response
export interface ArticleEditorSavePayload {
  article: {
    formData: ArticleFormData;
    blocks: ArticleBlock[];
    contributeurs?: {
      existants?: IntervenantExistant[];
      contributeurs?: ContributeurOeuvre[];
      nouveaux?: NouvelIntervenant[];
    };
    editeurs?: Array<EditeurOeuvre | number>;
    id_oeuvre?: number;
    titre?: string;
    [key: string]: unknown;
  };
  blocks?: ArticleBlock[];
}

// Type for the media upload response
export interface MediaUploadResult {
  id_media: number;
  url?: string;
  [key: string]: unknown;
}

// Type for an article block as saved to the backend
export interface ArticleBlockToSave {
  type_block: string;
  contenu?: string;
  contenu_json?: Record<string, unknown> | unknown[] | null;
  metadata?: Record<string, string | number | boolean | null>;
  id_media?: number | null;
  ordre: number;
  visible: boolean;
  id_article?: number;
}

// État initial du formulaire
export const INITIAL_FORM_DATA: FormData = {
  titre: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  description: { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' },
  id_type_oeuvre: 0,
  id_langue: 0,
  categories: [],
  tags: []
};

// Constantes pour les champs Art
export const TECHNIQUES_ART = [
  "Peinture à l'huile", "Aquarelle", "Acrylique", "Gouache", "Pastel",
  "Fusain", "Encre", "Gravure", "Sérigraphie", "Lithographie",
  "Sculpture", "Céramique", "Mosaïque", "Calligraphie",
  "Art numérique", "Photographie", "Art mixte"
];

export const SUPPORTS_ART = [
  "Toile", "Papier", "Bois", "Métal", "Verre",
  "Pierre", "Argile", "Tissu", "Cuir", "Numérique"
];
