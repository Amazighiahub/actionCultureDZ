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

// =====================================================
// HELPERS POUR LA NAVIGATION HIÉRARCHIQUE
// =====================================================

/**
 * Obtenir la wilaya depuis une commune
 */
export function getWilayaFromCommune(commune: Commune): Wilaya | undefined {
  return commune.Daira?.Wilaya;
}

/**
 * Obtenir la daira depuis une commune
 */
export function getDairaFromCommune(commune: Commune): Daira | undefined {
  return commune.Daira;
}

/**
 * Aplatir la hiérarchie géographique pour l'API
 */
export function flattenGeographicHierarchy(
  commune?: Commune,
  localite?: Localite
): FlatGeographicHierarchy | null {
  if (!commune?.Daira?.Wilaya) return null;
  
  return {
    wilaya: {
      id: commune.Daira.Wilaya.id_wilaya,
      code: commune.Daira.Wilaya.codeW,
      nom: commune.Daira.Wilaya.wilaya_name_ascii
    },
    daira: {
      id: commune.Daira.id_daira,
      nom: commune.Daira.daira_name_ascii
    },
    commune: {
      id: commune.id_commune,
      nom: commune.commune_name_ascii
    },
    localite: localite ? {
      id: localite.id_localite,
      nom: localite.localite_name_ascii || localite.nom
    } : undefined
  };
}

/**
 * Formater une adresse complète depuis la hiérarchie
 */
export function formatGeographicAddress(
  hierarchy: FlatGeographicHierarchy | null,
  adresse?: string
): string {
  if (!hierarchy) return adresse || '';
  
  const parts: string[] = [];
  
  if (adresse) {
    parts.push(adresse);
  }
  
  if (hierarchy.localite) {
    parts.push(hierarchy.localite.nom);
  }
  
  parts.push(hierarchy.commune.nom);
  parts.push(hierarchy.daira.nom);
  parts.push(`${hierarchy.wilaya.code} - ${hierarchy.wilaya.nom}`);
  
  return parts.join(', ');
}

/**
 * Helper pour obtenir le nom complet d'une wilaya
 */
export function getWilayaFullName(wilaya: Wilaya): string {
  return `${wilaya.codeW} - ${wilaya.wilaya_name_ascii}`;
}

// =====================================================
// CONSTANTES
// =====================================================

// Mapping des codes de wilaya vers les noms
export const WILAYA_CODES: Record<string, string> = {
  '01': 'Adrar',
  '02': 'Chlef',
  '03': 'Laghouat',
  '04': 'Oum El Bouaghi',
  '05': 'Batna',
  '06': 'Béjaïa',
  '07': 'Biskra',
  '08': 'Béchar',
  '09': 'Blida',
  '10': 'Bouira',
  '11': 'Tamanrasset',
  '12': 'Tébessa',
  '13': 'Tlemcen',
  '14': 'Tiaret',
  '15': 'Tizi Ouzou',
  '16': 'Alger',
  '17': 'Djelfa',
  '18': 'Jijel',
  '19': 'Sétif',
  '20': 'Saïda',
  '21': 'Skikda',
  '22': 'Sidi Bel Abbès',
  '23': 'Annaba',
  '24': 'Guelma',
  '25': 'Constantine',
  '26': 'Médéa',
  '27': 'Mostaganem',
  '28': 'M\'Sila',
  '29': 'Mascara',
  '30': 'Ouargla',
  '31': 'Oran',
  '32': 'El Bayadh',
  '33': 'Illizi',
  '34': 'Bordj Bou Arreridj',
  '35': 'Boumerdès',
  '36': 'El Tarf',
  '37': 'Tindouf',
  '38': 'Tissemsilt',
  '39': 'El Oued',
  '40': 'Khenchela',
  '41': 'Souk Ahras',
  '42': 'Tipaza',
  '43': 'Mila',
  '44': 'Aïn Defla',
  '45': 'Naâma',
  '46': 'Aïn Témouchent',
  '47': 'Ghardaïa',
  '48': 'Relizane',
  '49': 'El M\'Ghair',
  '50': 'El Menia',
  '51': 'Ouled Djellal',
  '52': 'Bordj Badji Mokhtar',
  '53': 'Béni Abbès',
  '54': 'Timimoun',
  '55': 'Touggourt',
  '56': 'Djanet',
  '57': 'In Salah',
  '58': 'In Guezzam'
};

// Nombre total de wilayas, dairas et communes
export const GEOGRAPHY_STATS = {
  TOTAL_WILAYAS: 58,
  TOTAL_DAIRAS: 548,
  TOTAL_COMMUNES: 1541
};