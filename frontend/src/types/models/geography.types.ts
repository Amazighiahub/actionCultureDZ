// types/models/geography.types.ts

export interface Wilaya {
  id_wilaya: number;
  codeW: string;  // Code de la wilaya (01, 02, etc.)
  wilaya_name_ascii: string;  // Nom en ASCII
  wilaya_name?: string;  // Nom en arabe (optionnel)
}

export interface Daira {
  id_daira: number;
  id_wilaya: number;
  nom_daira: string;
  nom_daira_ar?: string;
  code_daira?: string;
  wilaya?: Wilaya;
}

export interface Commune {
  id_commune: number;
  id_daira: number;
  nom_commune: string;
  nom_commune_ar?: string;
  code_commune?: string;
  code_postal?: string;
  daira?: Daira;
}

export interface Localite {
  id_localite: number;
  id_commune: number;
  nom_localite: string;
  nom_localite_ar?: string;
  type_localite?: 'village' | 'quartier' | 'cite' | 'autre';
  commune?: Commune;
}

// Types pour les réponses API
export interface GeographicLocation {
  wilaya?: Wilaya;
  daira?: Daira;
  commune?: Commune;
  localite?: Localite;
  fullAddress?: string;
}

// Types pour les sélections
export interface GeographicSelection {
  wilayaId?: number;
  dairaId?: number;
  communeId?: number;
  localiteId?: number;
}

// Helper pour formater une adresse complète
export function formatGeographicAddress(location: GeographicLocation): string {
  const parts: string[] = [];
  
  if (location.localite) {
    parts.push(location.localite.nom_localite);
  }
  if (location.commune) {
    parts.push(location.commune.nom_commune);
  }
  if (location.daira) {
    parts.push(location.daira.nom_daira);
  }
  if (location.wilaya) {
    parts.push(`${location.wilaya.codeW} - ${location.wilaya.wilaya_name_ascii}`);
  }
  
  return parts.join(', ');
}

// Helper pour obtenir le nom complet d'une wilaya
export function getWilayaFullName(wilaya: Wilaya): string {
  return `${wilaya.codeW} - ${wilaya.wilaya_name_ascii}`;
}

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