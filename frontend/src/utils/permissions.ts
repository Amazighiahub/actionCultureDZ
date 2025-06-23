// src/utils/permissions.ts - Utilitaires de permissions centralisés (VERSION CORRIGÉE)
import { authService } from '../services/auth.service';
import type { User } from '../types/User.types';
import type { Oeuvre } from '../types/Oeuvre.types';
import type { Evenement } from '../types/Evenement.types';

// ==========================================================================
// PERMISSIONS POUR LES ŒUVRES
// ==========================================================================

export const oeuvrePermissions = {
  // Créer une œuvre
  canCreate(user: User | null): boolean {
    return authService.
  },

  // Modifier une œuvre
  canEdit(user: User | null, oeuvre: Oeuvre): boolean {
    if (!user || !oeuvre) return false;
    
    // L'auteur peut modifier sa propre œuvre
    if (oeuvre.saisi_par === user.id_user) return true;
    
    // Les admins peuvent tout modifier
    if (authService.isAdmin(user)) return true;
    
    // Les modérateurs peuvent modifier les œuvres validées
    if (authService.canModerate(user) && oeuvre.statut === 'publie') return true;
    
    return false;
  },

  // Supprimer une œuvre
  canDelete(user: User | null, oeuvre: Oeuvre): boolean {
    if (!user || !oeuvre) return false;
    
    // L'auteur peut supprimer sa propre œuvre si elle n'est pas publiée
    if (oeuvre.saisi_par === user.id_user && oeuvre.statut !== 'publie') return true;
    
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
    if (oeuvre.saisi_par === user.id_user) return false;
    
    // L'œuvre doit être publiée
    if (oeuvre.statut !== 'publie') return false;
    
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
    if (evenement.id_user === user.id_user) return true;
    
    // Les admins peuvent tout modifier
    if (authService.isAdmin(user)) return true;
    
    // Vérifier si l'utilisateur est co-organisateur via les organisations
    if (evenement.Organisations && user.Organisations) {
      const isCoOrganizer = evenement.Organisations.some(orgEvent => 
        user.Organisations!.some(userOrg => 
          userOrg.id_organisation === orgEvent.id_organisation &&
          (orgEvent.TypeOrganisation?.nom === 'organisateur_principal' || orgEvent.TypeOrganisation?.nom === 'co_organisateur')
        )
      );
      if (isCoOrganizer) return true;
    }
    
    return false;
  },

  // Supprimer un événement
  canDelete(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur peut supprimer son événement si pas encore commencé
    if (evenement.id_user === user.id_user && evenement.statut === 'planifie') return true;
    
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
    if (evenement.id_user === user.id_user) return false;
    
    // Vérifier l'âge minimum
    if (evenement.age_minimum && user.date_naissance) {
      const age = new Date().getFullYear() - new Date(user.date_naissance).getFullYear();
      if (age < evenement.age_minimum) return false;
    }
    
    // Vérifier si pas déjà inscrit
    if (evenement.Users) {
      const isAlreadyRegistered = evenement.Users.some(participant => 
        participant.id_user === user.id_user
      );
      if (isAlreadyRegistered) return false;
    }
    
    // Vérifier la capacité
    if (evenement.est_complet) return false;
    
    // Vérifier la date limite d'inscription
    if (evenement.date_limite_inscription) {
      const now = new Date();
      const deadline = new Date(evenement.date_limite_inscription);
      if (now > deadline) return false;
    }
    
    return true;
  },

  // Gérer les participants
  canManageParticipants(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur peut gérer les participants
    if (evenement.id_user === user.id_user) return true;
    
    // Les admins peuvent tout gérer
    if (authService.isAdmin(user)) return true;
    
    return false;
  },

  // Annuler un événement
  canCancel(user: User | null, evenement: Evenement): boolean {
    if (!user || !evenement) return false;
    
    // L'organisateur peut annuler son événement
    if (evenement.id_user === user.id_user) return true;
    
    // Les admins peuvent tout annuler
    if (authService.isAdmin(user)) return true;
    
    return false;
  }
};

// ==========================================================================
// PERMISSIONS POUR LE PATRIMOINE
// ==========================================================================

export const patrimoinePermissions = {
  // Créer un site patrimonial
  canCreate(user: User | null): boolean {
    if (!user) return false;
    
    // Les professionnels validés peuvent créer des sites
    if (authService.isValidatedProfessional(user)) return true;
    
    // Les admins et modérateurs peuvent créer
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Modifier un site
  canEdit(user: User | null, site: any): boolean {
    if (!user || !site) return false;
    
    // Le créateur peut modifier son site (si l'info est disponible)
    if (site.created_by === user.id_user) return true;
    
    // Les admins peuvent tout modifier
    if (authService.isAdmin(user)) return true;
    
    // Les modérateurs peuvent modifier les sites validés
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Ajouter des médias à un site
  canAddMedia(user: User | null, site: any): boolean {
    if (!user) return false;
    
    // Tout utilisateur connecté peut ajouter des médias (soumis à modération)
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
    if (currentUser.id_user === targetUser.id_user) return true;
    
    // Les admins peuvent voir tous les profils
    if (authService.isAdmin(currentUser)) return true;
    
    // Peut voir les profils publics des professionnels validés
    if (authService.isValidatedProfessional(targetUser)) return true;
    
    return false;
  },

  // Modifier le profil d'un utilisateur
  canEditProfile(currentUser: User | null, targetUser: User): boolean {
    if (!currentUser) return false;
    
    // Peut modifier son propre profil
    if (currentUser.id_user === targetUser.id_user) return true;
    
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
    if (authService.isAdmin(currentUser) && !authService.isAdmin(targetUser)) return true;
    
    return false;
  }
};

// ==========================================================================
// PERMISSIONS POUR LES COMMENTAIRES
// ==========================================================================

export const commentPermissions = {
  // Créer un commentaire
  canCreate(user: User | null): boolean {
    return !!user; // Tout utilisateur connecté peut commenter
  },

  // Modifier un commentaire
  canEdit(user: User | null, comment: any): boolean {
    if (!user || !comment) return false;
    
    // L'auteur peut modifier son commentaire
    if (comment.id_user === user.id_user) return true;
    
    // Les admins peuvent modifier tous les commentaires
    if (authService.isAdmin(user)) return true;
    
    return false;
  },

  // Supprimer un commentaire
  canDelete(user: User | null, comment: any): boolean {
    if (!user || !comment) return false;
    
    // L'auteur peut supprimer son commentaire
    if (comment.id_user === user.id_user) return true;
    
    // Les modérateurs peuvent supprimer les commentaires
    if (authService.canModerate(user)) return true;
    
    return false;
  },

  // Modérer les commentaires
  canModerate(user: User | null): boolean {
    return authService.canModerate(user);
  },

  // Signaler un commentaire
  canReport(user: User | null, comment: any): boolean {
    if (!user || !comment) return false;
    
    // Ne peut pas signaler son propre commentaire
    if (comment.id_user === user.id_user) return false;
    
    return true;
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
  
  // Méthode générale pour vérifier une permission
  check(
    resource: 'oeuvre' | 'evenement' | 'patrimoine' | 'user' | 'comment',
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
    edit: 'Vous ne pouvez modifier que vos propres œuvres.',
    delete: 'Vous ne pouvez supprimer que vos propres œuvres non publiées.',
    validate: 'Seuls les modérateurs peuvent valider les œuvres.',
    rate: 'Vous ne pouvez pas évaluer votre propre œuvre.',
  },
  evenement: {
    create: 'Vous devez être un professionnel validé et appartenir à une organisation.',
    edit: 'Vous ne pouvez modifier que vos propres événements.',
    delete: 'Vous ne pouvez supprimer que vos événements non commencés.',
    register: 'Inscription impossible à cet événement.',
    cancel: 'Vous ne pouvez annuler que vos propres événements.',
  },
  patrimoine: {
    create: 'Vous devez être un professionnel validé pour ajouter des sites.',
    edit: 'Vous ne pouvez modifier que les sites que vous avez créés.',
    addMedia: 'Vous devez être connecté pour ajouter des médias.',
  },
  user: {
    viewProfile: 'Vous ne pouvez pas voir ce profil.',
    editProfile: 'Vous ne pouvez modifier que votre propre profil.',
    validateProfessional: 'Seuls les administrateurs peuvent valider les professionnels.',
    manageRoles: 'Seuls les administrateurs peuvent gérer les rôles.',
  },
  comment: {
    create: 'Vous devez être connecté pour commenter.',
    edit: 'Vous ne pouvez modifier que vos propres commentaires.',
    delete: 'Vous ne pouvez supprimer que vos propres commentaires.',
    moderate: 'Seuls les modérateurs peuvent modérer les commentaires.',
  }
};

export default permissions;