/**
 * Composants pour la création d'œuvres
 * Extraits de AjouterOeuvre.tsx pour une meilleure modularité
 */

export { default as CategorySelection } from './CategorySelection';
export { default as EditorModeSelector } from './EditorModeSelector';

// Types réutilisables
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

export interface OeuvreFormData {
  titre: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  description: { fr: string; ar: string; en: string; 'tz-ltn'?: string; 'tz-tfng'?: string };
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  categories: number[];
  tags: string[];
  // Champs spécifiques selon le type
  isbn?: string;
  nb_pages?: number;
  duree_minutes?: number;
  realisateur?: string;
  producteur?: string;
  studio?: string;
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
  dimensions?: string;
  id_materiau?: number;
  id_technique?: number;
  poids?: string;
  provenance?: string;
  etat_conservation?: string;
}

export const INITIAL_FORM_DATA: OeuvreFormData = {
  titre: { fr: '', ar: '', en: '' },
  description: { fr: '', ar: '', en: '' },
  id_type_oeuvre: 0,
  id_langue: 0,
  categories: [],
  tags: []
};
