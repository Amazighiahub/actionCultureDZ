// types/models/tracking.types.ts

import { 
  StatutCommentaire, 
  TypeEntiteFavori, 
  MotifSignalement, 
  StatutSignalement, 
  PrioriteSignalement,
  TypeNotification 
} from '../enums/common.enums';
import { User } from './user.types';
import { Oeuvre } from './oeuvre.types';
import { Evenement } from './evenement.types';
import { Programme } from './programme.types';
import { AuditDetails, DynamicFilters } from './specific-types';

export interface Commentaire {
  id_commentaire: number;
  contenu: string;
  id_user: number;
  id_oeuvre?: number;
  id_evenement?: number;
  commentaire_parent_id?: number;
  statut: StatutCommentaire;
  note_qualite?: number;
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  User?: User;
  Oeuvre?: Oeuvre;
  Evenement?: Evenement;
  CommentaireParent?: Commentaire;
  Reponses?: Commentaire[];
}

export interface CritiqueEvaluation {
  id_critique: number;
  id_oeuvre: number;
  id_user: number;
  note?: number;
  commentaire?: string;
  date_creation?: string;
  date_modification: string;
  
  // Relations (optionnelles)
  Oeuvre?: Oeuvre;
  User?: User;
}

export interface Favori {
  id_favori: number;
  id_user: number;
  type_entite: TypeEntiteFavori;
  id_entite: number;
  date_ajout: string;
  notes?: string;
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  User?: User;
}

export interface Notification {
  id_notification: number;
  id_user: number;
  type_notification: TypeNotification;
  titre: string;
  message: string;
  id_evenement?: number;
  id_programme?: number;
  id_oeuvre?: number;
  url_action?: string;
  email_envoye: boolean;
  sms_envoye: boolean;
  lu: boolean;
  date_lecture?: string;
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  expire_le?: string;
  date_creation: string;
  date_modification: string;
  
  // Relations (optionnelles)
  Utilisateur?: User;
  Evenement?: Evenement;
  Programme?: Programme;
  Oeuvre?: Oeuvre;
}

export interface Signalement {
  id_signalement: number;
  type_entite: 'commentaire' | 'oeuvre' | 'evenement' | 'user' | 'artisanat';
  id_entite: number;
  id_user_signalant: number;
  motif: MotifSignalement;
  description?: string;
  url_screenshot?: string;
  statut: StatutSignalement;
  priorite: PrioriteSignalement;
  id_moderateur?: number;
  date_traitement?: string;
  action_prise?: 'aucune' | 'avertissement' | 'suppression_contenu' | 'suspension_temporaire' | 'suspension_permanente' | 'bannissement';
  notes_moderation?: string;
  date_signalement: string;
  date_modification: string;
  
  // Relations (optionnelles)
  Signalant?: User;
  Moderateur?: User;
}

export interface Vue {
  id_vue: number;
  type_entite: 'oeuvre' | 'evenement' | 'lieu' | 'artisanat' | 'article';
  id_entite: number;
  id_user?: number;
  ip_address: string;
  user_agent?: string;
  referer?: string;
  session_id?: string;
  duree_secondes?: number;
  pays?: string;
  ville?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'bot';
  is_unique: boolean;
  date_vue: string;
  
  // Relations (optionnelles)
  Utilisateur?: User;
}

export interface AuditLog {
  id_log: number;
  id_admin?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: AuditDetails;
  ip_address?: string;
  user_agent?: string;
  date_action: string;
  
  // Relations (optionnelles)
  Admin?: User;
}

export interface QRCode {
  id_qr_code: number;
  id_lieu: number;
  code_unique: string;
  url_destination: string;
  qr_image_url?: string;
  actif: boolean;
  date_creation: string;
  date_expiration?: string;
}

export interface QRScan {
  id_scan: number;
  id_qr_code: number;
  id_user?: number;
  ip_address: string;
  user_agent?: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  pays?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  is_unique: boolean;
  date_scan: string;
}