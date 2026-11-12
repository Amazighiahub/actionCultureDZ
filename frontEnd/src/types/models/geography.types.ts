// types/models/geography.types.ts

export interface Wilaya {
  id_wilaya: number;
  codeW: string;  // Code de la wilaya (01, 02, etc.)
  nom: string;     // Nom en arabe
  wilaya_name_ascii: string;  // Nom en ASCII
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  Dairas?: Daira[];
}

export interface Daira {
  id_daira: number;
  wilayaId: number;  // FK vers Wilaya
  nom: string;       // Nom en arabe
  daira_name_ascii: string;  // Nom en ASCII
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  Wilaya?: Wilaya;
  Communes?: Commune[];
}

export interface Commune {
  id_commune: number;
  dairaId: number;  // FK vers Daira
  nom: string;      // Nom en arabe
  commune_name_ascii: string;  // Nom en ASCII
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  Daira?: Daira;
  Localites?: Localite[];
  Lieux?: any[]; // Import circulaire évité
}

export interface Localite {
  id_localite: number;
  id_commune: number;  // FK vers Commune
  nom: string;
  localite_name_ascii?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Relations
  Commune?: Commune;
}

// =====================================================
// TYPES POUR LA HIÉRARCHIE GÉOGRAPHIQUE
// =====================================================

/**
 * Type pour la hiérarchie géographique complète
 * Utilisé quand on navigue depuis Commune vers Wilaya
 */
export interface GeographicHierarchy {
  localite?: Localite;
  commune: Commune & {
    Daira: Daira & {
      Wilaya: Wilaya;
    };
  };
}

/**
 * Type pour la réponse API avec hiérarchie aplatie
 * Plus facile à utiliser côté frontend
 */
export interface FlatGeographicHierarchy {
  wilaya: {
    id: number;
    code: string;
    nom: string;
  };
  daira: {
    id: number;
    nom: string;
  };
  commune: {
    id: number;
    nom: string;
  };
  localite?: {
    id: number;
    nom: string;
  };
}