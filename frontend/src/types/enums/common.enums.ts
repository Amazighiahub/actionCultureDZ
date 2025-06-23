// types/enums/common.enums.ts

// Commentaire
export type StatutCommentaire = 
  | 'publie' 
  | 'en_attente' 
  | 'rejete' 
  | 'supprime';

// Favori
export type TypeEntiteFavori = 
  | 'oeuvre' 
  | 'evenement' 
  | 'lieu' 
  | 'artisanat';

// Signalement
export type MotifSignalement = 
  | 'spam' 
  | 'contenu_inapproprie' 
  | 'faux_contenu'
  | 'violation_droits' 
  | 'harcelement' 
  | 'incitation_haine'
  | 'contenu_illegal' 
  | 'autre';

export type StatutSignalement = 
  | 'en_attente' 
  | 'en_cours' 
  | 'traite' 
  | 'rejete';

export type PrioriteSignalement = 
  | 'basse' 
  | 'normale' 
  | 'haute' 
  | 'urgente';

// Notification
export type TypeNotification = 
  | 'validation_participation' 
  | 'annulation_evenement'
  | 'modification_programme' 
  | 'nouvel_evenement'
  | 'nouvelle_oeuvre' 
  | 'nouveau_commentaire' 
  | 'bienvenue'
  | 'validation_compte' 
  | 'message_admin' 
  | 'rappel_evenement' 
  | 'autre';

// Article
export type TypeArticle = 
  | 'presse' 
  | 'blog' 
  | 'magazine' 
  | 'newsletter' 
  | 'communique' 
  | 'editorial' 
  | 'interview';

export type StatutArticle = 
  | 'brouillon' 
  | 'publie' 
  | 'archive' 
  | 'supprime';

export type NiveauCredibilite = 
  | 'tres_fiable' 
  | 'fiable' 
  | 'moyen' 
  | 'peu_fiable' 
  | 'non_verifie';

// Editeur
export type TypeEditeur = 
  | 'maison_edition' 
  | 'label_musique' 
  | 'studio_cinema' 
  | 'galerie_art' 
  | 'editeur_web';

export enum StatutCommentaireEnum {
  PUBLIE = 'publie',
  EN_ATTENTE = 'en_attente',
  REJETE = 'rejete',
  SUPPRIME = 'supprime'
}

export enum TypeEntiteFavoriEnum {
  OEUVRE = 'oeuvre',
  EVENEMENT = 'evenement',
  LIEU = 'lieu',
  ARTISANAT = 'artisanat'
}

export enum MotifSignalementEnum {
  SPAM = 'spam',
  CONTENU_INAPPROPRIE = 'contenu_inapproprie',
  FAUX_CONTENU = 'faux_contenu',
  VIOLATION_DROITS = 'violation_droits',
  HARCELEMENT = 'harcelement',
  INCITATION_HAINE = 'incitation_haine',
  CONTENU_ILLEGAL = 'contenu_illegal',
  AUTRE = 'autre'
}

export enum StatutSignalementEnum {
  EN_ATTENTE = 'en_attente',
  EN_COURS = 'en_cours',
  TRAITE = 'traite',
  REJETE = 'rejete'
}

export enum PrioriteSignalementEnum {
  BASSE = 'basse',
  NORMALE = 'normale',
  HAUTE = 'haute',
  URGENTE = 'urgente'
}

export enum TypeNotificationEnum {
  VALIDATION_PARTICIPATION = 'validation_participation',
  ANNULATION_EVENEMENT = 'annulation_evenement',
  MODIFICATION_PROGRAMME = 'modification_programme',
  NOUVEL_EVENEMENT = 'nouvel_evenement',
  NOUVELLE_OEUVRE = 'nouvelle_oeuvre',
  NOUVEAU_COMMENTAIRE = 'nouveau_commentaire',
  BIENVENUE = 'bienvenue',
  VALIDATION_COMPTE = 'validation_compte',
  MESSAGE_ADMIN = 'message_admin',
  RAPPEL_EVENEMENT = 'rappel_evenement',
  AUTRE = 'autre'
}