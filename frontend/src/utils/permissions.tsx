// src/utils/permissions.ts - VERSION FINALE ALIGNÉE AVEC LES TYPES

import { authService } from '../services/auth.service';
import type { 
  User, 
  Organisation, 
  Role,
  Commentaire,
  Signalement 
} from '../types/User.types';
import type { 
  Oeuvre,
  OeuvreUser 
} from '../types/Oeuvre.types';
import type { 
  Evenement,
  EvenementUser,
  EvenementOrganisation 
} from '../types/Evenement.types';
import type { Lieu } from '../types/Geographie.types';

// ==========================================================================
// PERMISSIONS POUR LES ŒUVRES
// ==========================================================================

export const oeuvrePermissions = {
  // Créer une œuvre
  canCreate(user: User | null): boolean {
    return authService.canCreateOeuvre(user);
  },

  // Modifier une œuvre
  canEdit(user: User | null, oeuvre: Oeuvre): boolean {
    if (!user || !oeuvre) return false;
    
    // L'auteur peut modifier sa propre œuvre (saisiPar est optionnel dans le type)
    if (oeuvre.saisiPar && oeuvre.saisiPar === user.idUser) return true;
    
    // Vérifier si l'utilisateur est contributeur avec rôle auteur/co-auteur
    if (oeuvre.contributeurs) {
      const isContributor = oeuvre.contributeurs.some(
        contrib => contrib.idUser === user.idUser
      );
      if (isContributor) return true;
    }
    
    // Les admins peuvent tout modifier
    if (authService.isAdmin(user)) return true;
    
    // Les modérateurs peuvent modifier les œuvres validées
    if (authService.canModerate(user) && oeuvre.statut === 'valide') return true;
    
    return false;
  },

  // Supprimer une œuvre
  canDelete(user: User | null, oeuvre: Oeuvre): boolean {
    if (!user || !oeuvre) return false;
    
    // L'auteur peut supprimer sa propre œuvre si elle n'est pas validée
    if (oeuvre.saisiPar && 
        oeuvre.saisiPar === user.idUser && 
        oeuvre.statut !== 'valide') {
      return true;
    }
    
    // Les admins peuvent tout supprimer
    if (authService.isAdmin(user)) return true;
    
    return false;
  },

  // Valider une œuvre (modération)
  canValidate(user: User | null): boolean {
    return authService.canModerate(user);
  },

  // Voir les œuvres en attente de validation
  canViewPending(user: User | null): boolean {
    return authService.canModerate(user);
  },

  // Commenter une œuvre
  canComment(user: User | null): boolean {
    return !!user; // Tout utilisateur connecté peut commenter
  },

  // Évaluer/noter une œuvre
  canRate(user: User | null, oeuvre: Oeuvre): boolean {
    if (!user || !oeuvre) return false;
    
    // Ne peut pas noter sa propre œuvre
    if (oeuvre.saisiPar && oeuvre.saisiPar === user.idUser) return false;
    
    // Vérifier si l'utilisateur est contributeur
    if (oeuvre.contributeurs) {
      const isContributor = oeuvre.contributeurs.some(
        contrib => contrib.idUser === user.idUser
      );
      if (isContributor) return false;
    }
    
    // L'œuvre doit être validée
    if (oeuvre.statut !== 'valide') return false;
    
    return true;
  }
};

// ==========================================================================
// PERMISSIONS POUR LES ÉVÉNEMENTS
// ==========================================================================

export const evenementPermissions = {
  // Créer un événement
  canCreate(user: User | null): boolean {
    return authService.canCreateEvenement(user);
  },

  // Modifier un événement
  canEdit(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur principal peut modifier son événement
    if (evenement.idUser === user.idUser) return true;
    
    // Les admins peuvent tout modifier
    if (authService.isAdmin(user)) return true;
    
    // Vérifier si l'utilisateur est co-organisateur via les organisations
    if (evenement.organisations && user.organisations) {
      const userOrgIds = user.organisations.map(org => org.idOrganisation);
      
      const isCoOrganizer = evenement.organisations.some(eventOrg => 
        userOrgIds.includes(eventOrg.idOrganisation) &&
        ['organisateur', 'co-organisateur'].includes(eventOrg.role || '')
      );
      
      if (isCoOrganizer) return true;
    }
    
    return false;
  },

  // Supprimer un événement
  canDelete(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur peut supprimer son événement si pas encore commencé
    if (evenement.idUser === user.idUser && evenement.statut === 'planifie') {
      return true;
    }
    
    // Les admins peuvent tout supprimer
    if (authService.isAdmin(user)) return true;
    
    return false;
  },

  // S'inscrire à un événement
  canRegister(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'événement doit être ouvert aux inscriptions
    if (evenement.statut !== 'planifie') return false;
    
    // Ne peut pas s'inscrire à son propre événement
    if (evenement.idUser === user.idUser) return false;
    
    // Vérifier l'âge minimum
    if (evenement.ageMinimum && user.dateNaissance) {
      const birthDate = new Date(user.dateNaissance);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < evenement.ageMinimum) return false;
    }
    
    // Vérifier si pas déjà inscrit
    if (evenement.participants) {
      const isAlreadyRegistered = evenement.participants.some(
        participant => participant.idUser === user.idUser
      );
      if (isAlreadyRegistered) return false;
    }
    
    // Vérifier la capacité
    if (evenement.estComplet) return false;
    
    // Vérifier la date limite d'inscription
    if (evenement.dateLimiteInscription) {
      const now = new Date();
      const deadline = new Date(evenement.dateLimiteInscription);
      if (now > deadline) return false;
    }
    
    return true;
  },

  // Gérer les participants
  canManageParticipants(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur peut gérer les participants
    if (evenement.idUser === user.idUser) return true;
    
    // Les admins peuvent tout gérer
    if (authService.isAdmin(user)) return true;
    
    return false;
  },

  // Annuler un événement
  canCancel(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur peut annuler son événement
    if (evenement.idUser === user.idUser) return true;
    
    // Les admins peuvent tout annuler
    if (authService.isAdmin(user)) return true;
    
    return false;
  }
};

// ==========================================================================
// PERMISSIONS POUR LE PATRIMOINE
// ==========================================================================

export const patrimoinePermissions = {
  // Créer un site patrimonial/lieu
  canCreate(user: User | null): boolean {
    if (!user) return false;
    
    // Les professionnels validés peuvent créer des sites
    if (authService.isValidatedProfessional(user)) return true;
    
    // Les admins et modérateurs peuvent créer
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Modifier un site/lieu
  canEdit(user: User | null, lieu: Lieu): boolean {
    if (!user || !lieu) return false;
    
    // Les admins peuvent tout modifier
    if (authService.isAdmin(user)) return true;
    
    // Les modérateurs peuvent modifier
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Ajouter des médias à un site
  canAddMedia(user: User | null, lieu: Lieu): boolean {
    if (!user) return false;
    
    // Tout utilisateur connecté peut suggérer des médias (soumis à modération)
    return true;
  },

  // Modérer les médias
  canModerateMedia(user: User | null): boolean {
    return authService.canModerate(user);
  },

  // Créer des parcours
  canCreateParcours(user: User | null): boolean {
    if (!user) return false;
    
    // Les professionnels validés peuvent créer des parcours
    if (authService.isValidatedProfessional(user)) return true;
    
    // Les admins et modérateurs peuvent créer
    if (authService.canModerate(user)) return true;
    
    return false;
  }
};

// ==========================================================================
// PERMISSIONS POUR LES UTILISATEURS
// ==========================================================================

export const userPermissions = {
  // Voir le profil d'un utilisateur
  canViewProfile(currentUser: User | null, targetUser: User): boolean {
    if (!currentUser) return false;
    
    // Peut voir son propre profil
    if (currentUser.idUser === targetUser.idUser) return true;
    
    // Les admins peuvent voir tous les profils
    if (authService.isAdmin(currentUser)) return true;
    
    // Peut voir les profils publics
    if (targetUser.profilPublic) return true;
    
    // Peut voir les profils des professionnels validés
    if (authService.isValidatedProfessional(targetUser)) return true;
    
    return false;
  },

  // Modifier le profil d'un utilisateur
  canEditProfile(currentUser: User | null, targetUser: User): boolean {
    if (!currentUser) return false;
    
    // Peut modifier son propre profil
    if (currentUser.idUser === targetUser.idUser) return true;
    
    // Les admins peuvent modifier tous les profils
    if (authService.isAdmin(currentUser)) return true;
    
    return false;
  },

  // Valider un professionnel
  canValidateProfessional(user: User | null): boolean {
    return authService.canValidateProfessionals(user);
  },

  // Gérer les rôles des utilisateurs
  canManageRoles(user: User | null): boolean {
    return authService.isAdmin(user);
  },

  // Suspendre un utilisateur
  canSuspendUser(currentUser: User | null, targetUser: User): boolean {
    if (!currentUser || !targetUser) return false;
    
    // Les admins peuvent suspendre (sauf d'autres admins)
    if (authService.isAdmin(currentUser) && !authService.isAdmin(targetUser)) {
      return true;
    }
    
    return false;
  }
};

// ==========================================================================
// PERMISSIONS POUR LES COMMENTAIRES
// ==========================================================================

export const commentPermissions = {
  // Créer un commentaire
  canCreate(user: User | null): boolean {
    return !!user && user.statut === 'actif';
  },

  // Modifier un commentaire
  canEdit(user: User | null, comment: Commentaire): boolean {
    if (!user || !comment) return false;
    
    // L'auteur peut modifier son commentaire dans les 30 minutes
    if (comment.idUser === user.idUser && comment.createdAt) {
      const createdTime = new Date(comment.createdAt).getTime();
      const now = new Date().getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (now - createdTime < thirtyMinutes) {
        return true;
      }
    }
    
    // Les admins peuvent modifier tous les commentaires
    if (authService.isAdmin(user)) return true;
    
    return false;
  },

  // Supprimer un commentaire
  canDelete(user: User | null, comment: Commentaire): boolean {
    if (!user || !comment) return false;
    
    // L'auteur peut supprimer son commentaire
    if (comment.idUser === user.idUser) return true;
    
    // Les modérateurs peuvent supprimer les commentaires
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Modérer les commentaires
  canModerate(user: User | null): boolean {
    return authService.canModerate(user);
  },

  // Signaler un commentaire
  canReport(user: User | null, comment: Commentaire): boolean {
    if (!user || !comment) return false;
    
    // Ne peut pas signaler son propre commentaire
    if (comment.idUser === user.idUser) return false;
    
    // Utilisateur doit être actif
    if (user.statut !== 'actif') return false;
    
    return true;
  }
};

// ==========================================================================
// PERMISSIONS POUR LES SIGNALEMENTS
// ==========================================================================

export const signalementPermissions = {
  // Créer un signalement
  canCreate(user: User | null): boolean {
    return !!user && user.statut === 'actif';
  },

  // Voir les signalements (modération)
  canView(user: User | null): boolean {
    return authService.canModerate(user);
  },

  // Traiter un signalement
  canProcess(user: User | null, signalement: Signalement): boolean {
    if (!user || !signalement) return false;
    
    // Les modérateurs peuvent traiter
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Prendre une action sur un signalement
  canTakeAction(user: User | null, signalement: Signalement): boolean {
    if (!user || !signalement) return false;
    
    // Seuls les admins peuvent prendre des actions graves
    const graveActions = ['suspension_temporaire', 'suspension_permanente', 'signalement_autorites'];
    
    if (signalement.actionPrise && graveActions.includes(signalement.actionPrise)) {
      return authService.isAdmin(user);
    }
    
    // Les modérateurs peuvent prendre des actions légères
    return authService.canModerate(user);
  }
};

// ==========================================================================
// FONCTION UTILITAIRE PRINCIPALE
// ==========================================================================

export const permissions = {
  oeuvre: oeuvrePermissions,
  evenement: evenementPermissions,
  patrimoine: patrimoinePermissions,
  user: userPermissions,
  comment: commentPermissions,
  signalement: signalementPermissions,
  
  // Méthode générale pour vérifier une permission
  check(
    resource: 'oeuvre' | 'evenement' | 'patrimoine' | 'user' | 'comment' | 'signalement',
    action: string,
    user: User | null,
    target?: any
  ): boolean {
    const resourcePermissions = this[resource];
    const permissionMethod = (resourcePermissions as any)[`can${action.charAt(0).toUpperCase() + action.slice(1)}`];
    
    if (typeof permissionMethod === 'function') {
      return permissionMethod(user, target);
    }
    
    console.warn(`Permission ${resource}:${action} not found`);
    return false;
  }
};

// ==========================================================================
// MESSAGES D'ERREUR PERSONNALISÉS
// ==========================================================================

export const permissionMessages = {
  oeuvre: {
    create: 'Vous devez être un professionnel validé pour créer des œuvres.',
    edit: 'Vous ne pouvez modifier que vos propres œuvres ou celles où vous êtes contributeur.',
    delete: 'Vous ne pouvez supprimer que vos propres œuvres non validées.',
    validate: 'Seuls les modérateurs peuvent valider les œuvres.',
    rate: 'Vous ne pouvez pas évaluer votre propre œuvre.',
    comment: 'Vous devez être connecté pour commenter.',
  },
  evenement: {
    create: 'Vous devez être un professionnel validé et appartenir à une organisation.',
    edit: 'Vous ne pouvez modifier que vos propres événements ou ceux de votre organisation.',
    delete: 'Vous ne pouvez supprimer que vos événements non commencés.',
    register: 'Inscription impossible à cet événement.',
    manageParticipants: 'Seul l\'organisateur peut gérer les participants.',
    cancel: 'Vous ne pouvez annuler que vos propres événements.',
  },
  patrimoine: {
    create: 'Vous devez être un professionnel validé pour ajouter des sites patrimoniaux.',
    edit: 'Seuls les modérateurs peuvent modifier les sites patrimoniaux.',
    addMedia: 'Vous devez être connecté pour ajouter des médias.',
    moderateMedia: 'Seuls les modérateurs peuvent valider les médias.',
    createParcours: 'Vous devez être un professionnel validé pour créer des parcours.',
  },
  user: {
    viewProfile: 'Vous ne pouvez pas voir ce profil.',
    editProfile: 'Vous ne pouvez modifier que votre propre profil.',
    validateProfessional: 'Seuls les administrateurs peuvent valider les professionnels.',
    manageRoles: 'Seuls les administrateurs peuvent gérer les rôles.',
    suspendUser: 'Seuls les administrateurs peuvent suspendre des utilisateurs.',
  },
  comment: {
    create: 'Vous devez être connecté et actif pour commenter.',
    edit: 'Vous ne pouvez modifier votre commentaire que dans les 30 minutes.',
    delete: 'Vous ne pouvez supprimer que vos propres commentaires.',
    moderate: 'Seuls les modérateurs peuvent modérer les commentaires.',
    report: 'Vous ne pouvez pas signaler votre propre commentaire.',
  },
  signalement: {
    create: 'Vous devez être connecté et actif pour signaler du contenu.',
    view: 'Seuls les modérateurs peuvent voir les signalements.',
    process: 'Seuls les modérateurs peuvent traiter les signalements.',
    takeAction: 'Action non autorisée sur ce signalement.',
  }
};

// ==========================================================================
// HOOK REACT POUR UTILISER LES PERMISSIONS
// ==========================================================================

import { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

export function usePermissions() {
  const { user } = useAuth();
  
  return useMemo(() => ({
    // Œuvres
    canCreateOeuvre: () => oeuvrePermissions.canCreate(user),
    canEditOeuvre: (oeuvre: Oeuvre) => oeuvrePermissions.canEdit(user, oeuvre),
    canDeleteOeuvre: (oeuvre: Oeuvre) => oeuvrePermissions.canDelete(user, oeuvre),
    canValidateOeuvre: () => oeuvrePermissions.canValidate(user),
    canCommentOeuvre: () => oeuvrePermissions.canComment(user),
    canRateOeuvre: (oeuvre: Oeuvre) => oeuvrePermissions.canRate(user, oeuvre),
    
    // Événements
    canCreateEvenement: () => evenementPermissions.canCreate(user),
    canEditEvenement: (evenement: Evenement) => evenementPermissions.canEdit(user, evenement),
    canDeleteEvenement: (evenement: Evenement) => evenementPermissions.canDelete(user, evenement),
    canRegisterToEvent: (evenement: Evenement) => evenementPermissions.canRegister(user, evenement),
    canManageParticipants: (evenement: Evenement) => evenementPermissions.canManageParticipants(user, evenement),
    canCancelEvenement: (evenement: Evenement) => evenementPermissions.canCancel(user, evenement),
    
    // Patrimoine
    canCreatePatrimoine: () => patrimoinePermissions.canCreate(user),
    canEditPatrimoine: (lieu: Lieu) => patrimoinePermissions.canEdit(user, lieu),
    canAddMedia: (lieu: Lieu) => patrimoinePermissions.canAddMedia(user, lieu),
    canModerateMedia: () => patrimoinePermissions.canModerateMedia(user),
    canCreateParcours: () => patrimoinePermissions.canCreateParcours(user),
    
    // Utilisateurs
    canViewProfile: (targetUser: User) => userPermissions.canViewProfile(user, targetUser),
    canEditProfile: (targetUser: User) => userPermissions.canEditProfile(user, targetUser),
    canValidateProfessional: () => userPermissions.canValidateProfessional(user),
    canManageRoles: () => userPermissions.canManageRoles(user),
    canSuspendUser: (targetUser: User) => userPermissions.canSuspendUser(user, targetUser),
    
    // Commentaires
    canCreateComment: () => commentPermissions.canCreate(user),
    canEditComment: (comment: Commentaire) => commentPermissions.canEdit(user, comment),
    canDeleteComment: (comment: Commentaire) => commentPermissions.canDelete(user, comment),
    canModerateComments: () => commentPermissions.canModerate(user),
    canReportComment: (comment: Commentaire) => commentPermissions.canReport(user, comment),
    
    // Signalements
    canCreateSignalement: () => signalementPermissions.canCreate(user),
    canViewSignalements: () => signalementPermissions.canView(user),
    canProcessSignalement: (signalement: Signalement) => signalementPermissions.canProcess(user, signalement),
    canTakeActionOnSignalement: (signalement: Signalement) => signalementPermissions.canTakeAction(user, signalement),
    
    // Méthode générique
    check: (resource: string, action: string, target?: any) => 
      permissions.check(resource as any, action, user, target),
    
    // État général
    isAdmin: authService.isAdmin(user),
    isModerator: authService.canModerate(user),
    isProfessional: authService.isValidatedProfessional(user),
    isAuthenticated: !!user,
    
    // Informations utilisateur
    user
  }), [user]);
}

// ==========================================================================
// COMPOSANT DE PROTECTION DE ROUTE
// ==========================================================================

import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: () => boolean;
  fallbackPath?: string;
  fallbackComponent?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  permission,
  fallbackPath = '/connexion',
  fallbackComponent
}) => {
  const { isAuthenticated } = usePermissions();
  
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  if (permission && !permission()) {
    return fallbackComponent || <Navigate to="/403" replace />;
  }
  
  return <>{children}</>;
};

export default permissions;