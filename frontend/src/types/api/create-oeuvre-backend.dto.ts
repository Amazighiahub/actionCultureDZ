// types/api/create-oeuvre-backend.dto.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  NouvelIntervenant,
  EditeurOeuvre,
  IntervenantExistant,
  ContributeurOeuvre
} from './oeuvre-creation.types';

/**
 * Type DTO pour la création d'œuvre qui correspond exactement
 * à ce que le backend attend
 */
export interface CreateOeuvreBackendDTO {
  // Informations de base de l'œuvre
  titre: string;
  description: string;
  id_type_oeuvre: number;
  id_langue: number;
  annee_creation?: number;
  prix?: number;
  categories: number[];
  tags: string[];
  
  // Contributeurs : utilisateurs inscrits
  utilisateurs_inscrits?: Array<{
    id_user: number;
    id_type_user: number;
    personnage?: string;
    ordre_apparition?: number;
    role_principal?: boolean;
    description_role?: string;
  }>;
  
  // Contributeurs : intervenants existants (non-inscrits)
  intervenants_non_inscrits?: Array<{
    id_intervenant: number;
    id_type_user: number;
    personnage?: string;
    ordre_apparition?: number;
    role_principal?: boolean;
    description_role?: string;
  }>;
  
  // Contributeurs : nouveaux intervenants à créer
  nouveaux_intervenants?: NouvelIntervenant[];
  
  // Éditeurs
  editeurs?: EditeurOeuvre[];
  
  // Détails spécifiques selon le type d'œuvre
  details_specifiques?: any;
}

/**
 * Fonction helper pour mapper les données du frontend vers le backend
 */
export function mapToBackendDTO(
  formData: any,
  contributeurs: ContributeurOeuvre[],
  intervenantsExistants: IntervenantExistant[],
  nouveauxIntervenants: NouvelIntervenant[],
  editeurs: EditeurOeuvre[],
  detailsSpecifiques: any
): CreateOeuvreBackendDTO {
  return {
    // Données de base
    titre: formData.titre,
    description: formData.description,
    id_type_oeuvre: formData.id_type_oeuvre,
    id_langue: formData.id_langue,
    annee_creation: formData.annee_creation,
    prix: formData.prix,
    categories: formData.categories,
    tags: formData.tags,
    
    // Mapper les contributeurs utilisateurs
    utilisateurs_inscrits: contributeurs
      .filter(c => c.id_user)
      .map(c => ({
        id_user: c.id_user,
        id_type_user: c.id_type_user,
        personnage: c.personnage,
        ordre_apparition: c.ordre_apparition,
        role_principal: c.role_principal,
        description_role: c.description_role
      })),
    
    // Mapper les intervenants existants (attention au nom du champ backend)
    intervenants_non_inscrits: intervenantsExistants.map(ie => ({
      id_intervenant: ie.id_intervenant,
      id_type_user: ie.id_type_user,
      personnage: ie.personnage,
      ordre_apparition: ie.ordre_apparition,
      role_principal: ie.role_principal,
      description_role: ie.description_role
    })),
    
    // Nouveaux intervenants (déjà au bon format)
    nouveaux_intervenants: nouveauxIntervenants,
    
    // Éditeurs
    editeurs: editeurs.length > 0 ? editeurs : undefined,
    
    // Détails spécifiques
    details_specifiques: detailsSpecifiques
  };
}