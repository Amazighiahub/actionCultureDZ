// services/permissions.service.ts
import { authService } from './auth.service';
import type { CurrentUser } from './auth.service';

export type PermissionCheck = string;

export const PERMISSIONS = {
  // Permissions générales
  ADMIN_ACCESS: 'admin.access',
  
  // Permissions œuvres
  OEUVRE_CREATE: 'oeuvre.create',
  OEUVRE_EDIT: 'oeuvre.edit',
  OEUVRE_DELETE: 'oeuvre.delete',
  OEUVRE_EDIT_OWN: 'oeuvre.edit.own',
  OEUVRE_DELETE_OWN: 'oeuvre.delete.own',
  OEUVRE_VALIDATE: 'oeuvre.validate',
  
  // Permissions événements
  EVENT_CREATE: 'event.create',
  EVENT_EDIT: 'event.edit',
  EVENT_DELETE: 'event.delete',
  EVENT_EDIT_OWN: 'event.edit.own',
  EVENT_DELETE_OWN: 'event.delete.own',
  EVENT_VALIDATE: 'event.validate',
  
  // Permissions médias
  MEDIA_UPLOAD: 'media.upload',
  
  // Permissions commentaires
  COMMENT_CREATE: 'comment.create',
  COMMENT_EDIT_OWN: 'comment.edit.own',
  COMMENT_DELETE_OWN: 'comment.delete.own',
  COMMENT_MODERATE: 'comment.moderate',
  
  // Permissions utilisateurs
  USER_VALIDATE: 'user.validate',
  USER_MANAGE: 'user.manage',
  USER_SUSPEND: 'user.suspend',
  
  // Permissions métadonnées
  METADATA_MANAGE: 'metadata.manage',
  
  // Permissions patrimoine
  PATRIMOINE_CREATE: 'patrimoine.create',
  PATRIMOINE_EDIT: 'patrimoine.edit',
  PATRIMOINE_DELETE: 'patrimoine.delete',
  PATRIMOINE_MANAGE: 'patrimoine.manage',
} as const;

class PermissionsService {
  private currentUser: CurrentUser | null = null;
  private permissions: Set<string> = new Set();

  /**
   * Initialise le service
   */
  async init(): Promise<void> {
    if (authService.isAuthenticated()) {
      try {
        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          this.setCurrentUser(response.data);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des permissions:', error);
      }
    }
  }

  /**
   * Définit l'utilisateur courant et met à jour les permissions
   */
  setCurrentUser(user: CurrentUser | null): void {
    this.currentUser = user;
    this.updatePermissions();
  }

  /**
   * Met à jour les permissions basées sur l'utilisateur actuel
   */
  private updatePermissions(): void {
    this.permissions.clear();
    
    if (!this.currentUser) return;
    
    // 1. PERMISSIONS POUR LES VISITEURS
    if (this.currentUser.id_type_user === 1) {
      // Les visiteurs peuvent seulement commenter et gérer leurs favoris
      this.permissions.add(PERMISSIONS.COMMENT_CREATE);
      this.permissions.add(PERMISSIONS.COMMENT_EDIT_OWN);
      this.permissions.add(PERMISSIONS.COMMENT_DELETE_OWN);
      // Pas de permissions de création de contenu pour les visiteurs
      return; // Important : on arrête ici pour les visiteurs
    }
    
    // 2. VÉRIFIER SI C'EST UN ADMIN
    const isAdmin = this.currentUser.Roles?.some(role => 
      role.nom_role === 'Administrateur' || role.nom_role === 'Super Admin'
    );
    
    if (isAdmin) {
      // Admin a TOUTES les permissions
      Object.values(PERMISSIONS).forEach(perm => this.permissions.add(perm));
      return; // On arrête ici pour les admins
    }
    
    // 3. PERMISSIONS POUR LES PROFESSIONNELS
    if (this.currentUser.id_type_user !== 1) {
      // MAIS seulement s'ils sont validés !
      if (this.currentUser.statut_validation === "valide") {
        // Permissions de création pour les professionnels VALIDÉS
        this.permissions.add(PERMISSIONS.OEUVRE_CREATE);
        this.permissions.add(PERMISSIONS.EVENT_CREATE);
        this.permissions.add(PERMISSIONS.MEDIA_UPLOAD);
        this.permissions.add(PERMISSIONS.PATRIMOINE_CREATE);
        
        // Permissions d'édition/suppression de leurs propres contenus
        this.permissions.add(PERMISSIONS.OEUVRE_EDIT_OWN);
        this.permissions.add(PERMISSIONS.OEUVRE_DELETE_OWN);
        this.permissions.add(PERMISSIONS.EVENT_EDIT_OWN);
        this.permissions.add(PERMISSIONS.EVENT_DELETE_OWN);
      }
      // Si professionnel non validé, ils n'ont que les permissions de base
    }
    
    // 4. PERMISSIONS COMMUNES À TOUS LES UTILISATEURS CONNECTÉS
    this.permissions.add(PERMISSIONS.COMMENT_CREATE);
    this.permissions.add(PERMISSIONS.COMMENT_EDIT_OWN);
    this.permissions.add(PERMISSIONS.COMMENT_DELETE_OWN);
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }

  /**
   * Récupère l'utilisateur actuel
   */
  getCurrentUser(): CurrentUser | null {
    return this.currentUser;
  }

  /**
   * Vérifie si l'utilisateur a une permission
   */
  hasPermission(permission: PermissionCheck): boolean {
    if (!this.currentUser) return false;
    return this.permissions.has(permission);
  }

  /**
   * Vérifie si l'utilisateur a au moins une des permissions
   */
  hasAnyPermission(...permissions: PermissionCheck[]): boolean {
    return permissions.some(perm => this.hasPermission(perm));
  }

  /**
   * Vérifie si l'utilisateur a toutes les permissions
   */
  hasAllPermissions(...permissions: PermissionCheck[]): boolean {
    return permissions.every(perm => this.hasPermission(perm));
  }

  /**
   * Vérifie si l'utilisateur est admin
   */
  isAdmin(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.Roles?.some(r => 
      r.nom_role === 'Administrateur' || r.nom_role === 'Super Admin'
    ) || false;
  }

  /**
   * Vérifie si l'utilisateur est un professionnel
   */
  isProfessional(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.id_type_user !== 1;
  }

  /**
   * Vérifie si l'utilisateur est un professionnel validé
   */
  isValidatedProfessional(): boolean {
    if (!this.currentUser) return false;
    return this.isProfessional() && this.currentUser.statut_validation === "valide";
  }

  /**
   * Vérifie si l'utilisateur est un visiteur
   */
  isVisitor(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.id_type_user === 1;
  }

  /**
   * Vérifie si l'utilisateur a besoin de validation
   */
  needsValidation(): boolean {
    if (!this.currentUser) return false;
    return this.isProfessional() && this.currentUser.statut_validation === "en_attente";
  }

  /**
   * Vérifie si l'utilisateur est propriétaire d'une ressource
   */
  isOwner(resourceUserId: number): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.id_user === resourceUserId;
  }

  /**
   * Récupère le message de statut de l'utilisateur
   */
  getUserStatusMessage(): string | null {
    if (!this.currentUser) return null;
    
    if (this.currentUser.statut_validation === "en_attente" && this.isProfessional()) {
      return 'Votre compte professionnel est en attente de validation. Vous ne pouvez pas encore créer de contenu.';
    }
    
    if (this.currentUser.statut === 'suspendu') {
      return 'Votre compte a été suspendu. Veuillez contacter l\'administration.';
    }
    
    return null;
  }

  /**
   * Vérifie si l'utilisateur peut créer une œuvre
   */
  canCreateOeuvre(): boolean {
    // Seulement les professionnels validés ou les admins
    return this.hasPermission(PERMISSIONS.OEUVRE_CREATE);
  }

  /**
   * Vérifie si l'utilisateur peut créer un événement
   */
  canCreateEvent(): boolean {
    // Seulement les professionnels validés ou les admins
    return this.hasPermission(PERMISSIONS.EVENT_CREATE);
  }

  /**
   * Vérifie si l'utilisateur peut accéder au dashboard professionnel
   */
  canAccessProfessionalDashboard(): boolean {
    return this.isAdmin() || this.isValidatedProfessional();
  }

  /**
   * Vérifie si l'utilisateur peut éditer une œuvre
   */
  canEditOeuvre(oeuvre: { id_user: number }): boolean {
    return this.hasPermission(PERMISSIONS.OEUVRE_EDIT) || 
           (this.hasPermission(PERMISSIONS.OEUVRE_EDIT_OWN) && this.isOwner(oeuvre.id_user));
  }

  /**
   * Vérifie si l'utilisateur peut supprimer une œuvre
   */
  canDeleteOeuvre(oeuvre: { id_user: number }): boolean {
    return this.hasPermission(PERMISSIONS.OEUVRE_DELETE) || 
           (this.hasPermission(PERMISSIONS.OEUVRE_DELETE_OWN) && this.isOwner(oeuvre.id_user));
  }

  /**
   * Vérifie si l'utilisateur peut éditer un événement
   */
  canEditEvent(event: { id_user: number }): boolean {
    return this.hasPermission(PERMISSIONS.EVENT_EDIT) || 
           (this.hasPermission(PERMISSIONS.EVENT_EDIT_OWN) && this.isOwner(event.id_user));
  }

  /**
   * Vérifie si l'utilisateur peut supprimer un événement
   */
  canDeleteEvent(event: { id_user: number }): boolean {
    return this.hasPermission(PERMISSIONS.EVENT_DELETE) || 
           (this.hasPermission(PERMISSIONS.EVENT_DELETE_OWN) && this.isOwner(event.id_user));
  }

  /**
   * Vérifie si l'utilisateur peut créer un événement pour une organisation
   */
  canCreateEventForOrganisation(organisationId?: number): boolean {
    if (!this.currentUser) return false;
    
    // Admin peut créer pour n'importe quelle organisation
    if (this.isAdmin()) return true;
    
    // Les professionnels VALIDÉS peuvent créer des événements
    return this.hasPermission(PERMISSIONS.EVENT_CREATE);
  }

  /**
   * Vérifie si l'utilisateur peut éditer un commentaire
   */
  canEditComment(comment: { id_user: number }): boolean {
    return this.hasPermission(PERMISSIONS.COMMENT_MODERATE) || 
           (this.hasPermission(PERMISSIONS.COMMENT_EDIT_OWN) && this.isOwner(comment.id_user));
  }

  /**
   * Vérifie si l'utilisateur peut supprimer un commentaire
   */
  canDeleteComment(comment: { id_user: number }): boolean {
    return this.hasPermission(PERMISSIONS.COMMENT_MODERATE) || 
           (this.hasPermission(PERMISSIONS.COMMENT_DELETE_OWN) && this.isOwner(comment.id_user));
  }

  /**
   * Vérifie si l'utilisateur peut modérer les commentaires
   */
  canModerateComment(): boolean {
    return this.hasPermission(PERMISSIONS.COMMENT_MODERATE);
  }

  /**
   * Vérifie si l'utilisateur peut valider des utilisateurs
   */
  canValidateUsers(): boolean {
    return this.hasPermission(PERMISSIONS.USER_VALIDATE);
  }

  /**
   * Vérifie si l'utilisateur peut gérer les métadonnées
   */
  canManageMetadata(): boolean {
    return this.hasPermission(PERMISSIONS.METADATA_MANAGE);
  }

  /**
   * Nettoie le cache des permissions
   */
  clearCache(): void {
    this.currentUser = null;
    this.permissions.clear();
  }
}

// Export singleton
export const permissionsService = new PermissionsService();