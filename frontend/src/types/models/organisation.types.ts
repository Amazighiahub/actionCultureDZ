// types/models/organisation.types.ts

import { TypeOrganisation } from './references.types';
import { User } from './user.types';
import { Evenement } from './evenement.types';

export interface Organisation {
  id_organisation: number;
  nom: string;
  id_type_organisation: number;
  description?: string;
  site_web?: string;
  
  // Relations (optionnelles)
  TypeOrganisation?: TypeOrganisation;
  Users?: User[];
  Evenements?: Evenement[];
}

// Type pour la création d'une organisation
export type CreateOrganisationDTO = Omit<Organisation, 'id_organisation'>;

// Type pour la mise à jour d'une organisation
export type UpdateOrganisationDTO = Partial<CreateOrganisationDTO>;