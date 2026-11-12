// types/models/type-user.types.ts

import { User } from './user.types';
import { OeuvreUser, OeuvreIntervenant } from './associations.types';

export interface TypeUser {
  id_type_user: number;
  nom_type: string;
  description?: string;
  
  // Relations (optionnelles)
  Users?: User[];
  OeuvreUsers?: OeuvreUser[];
  OeuvreIntervenants?: OeuvreIntervenant[];
}

// Type pour la création d'un type user
export type CreateTypeUserDTO = Omit<TypeUser, 'id_type_user' | 'Users' | 'OeuvreUsers' | 'OeuvreIntervenants'>;

// Type pour la mise à jour d'un type user
export type UpdateTypeUserDTO = Partial<CreateTypeUserDTO>;

// Types prédéfinis pour les intervenants (à adapter selon vos besoins)
export enum TypeUserIntervenant {
  // Pour les livres
  AUTEUR = 'auteur',
  TRADUCTEUR = 'traducteur',
  ILLUSTRATEUR = 'illustrateur',
  PREFACIER = 'prefacier',
  
  // Pour les films
  REALISATEUR = 'realisateur',
  ACTEUR = 'acteur',
  PRODUCTEUR = 'producteur',
  SCENARISTE = 'scenariste',
  DIRECTEUR_PHOTO = 'directeur_photo',
  MONTEUR = 'monteur',
  
  // Pour la musique
  COMPOSITEUR = 'compositeur',
  INTERPRETE = 'interprete',
  ARRANGEUR = 'arrangeur',
  PAROLIER = 'parolier',
  
  // Pour les articles
  JOURNALISTE = 'journaliste',
  REDACTEUR = 'redacteur',
  CHERCHEUR = 'chercheur',
  
  // Pour l'art et artisanat
  ARTISTE = 'artiste',
  ARTISAN = 'artisan',
  DESIGNER = 'designer',
  
  // Rôles généraux
  COLLABORATEUR = 'collaborateur',
  CONSULTANT = 'consultant',
  COORDINATEUR = 'coordinateur'
}

// Helper pour vérifier les permissions d'un type
export function hasPermission(typeUser: TypeUser, permission: string): boolean {
  // Logique à implémenter selon vos besoins
  // Exemple simple :
  const permissions: Record<string, string[]> = {
    'admin': ['*'], // Toutes les permissions
    'moderateur': ['read', 'write', 'moderate'],
    'contributeur': ['read', 'write'],
    'membre': ['read'],
    'invite': ['read_limited']
  };
  
  const userPermissions = permissions[typeUser.nom_type.toLowerCase()] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
}