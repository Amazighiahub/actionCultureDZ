// hooks/usePermissions.ts
import { usePermissionsContext } from '@/providers/PermissionsProvider';
import { permissionsService, PERMISSIONS, type PermissionCheck } from '@/services/permissions.service';

/**
 * Hook pour accéder aux permissions
 * Utilise le contexte pour l'état utilisateur et le service pour les vérifications
 */
export function usePermissions() {
  const context = usePermissionsContext();

  // Méthodes de vérification des permissions
  const hasPermission = (permission: PermissionCheck): boolean => {
    return permissionsService.hasPermission(permission);
  };

  const hasAnyPermission = (...permissions: PermissionCheck[]): boolean => {
    return permissionsService.hasAnyPermission(...permissions);
  };

  const hasAllPermissions = (...permissions: PermissionCheck[]): boolean => {
    return permissionsService.hasAllPermissions(...permissions);
  };

  // Méthodes de vérification par ressource
  const canEditOeuvre = (oeuvre: { id_user: number }): boolean => {
    return permissionsService.canEditOeuvre(oeuvre);
  };

  const canDeleteOeuvre = (oeuvre: { id_user: number }): boolean => {
    return permissionsService.canDeleteOeuvre(oeuvre);
  };

  const canEditEvent = (event: { id_user: number }): boolean => {
    return permissionsService.canEditEvent(event);
  };

  const canDeleteEvent = (event: { id_user: number }): boolean => {
    return permissionsService.canDeleteEvent(event);
  };

  const canCreateEventForOrganisation = (organisationId?: number): boolean => {
    return permissionsService.canCreateEventForOrganisation(organisationId);
  };

  const canEditComment = (comment: { id_user: number }): boolean => {
    return permissionsService.canEditComment(comment);
  };

  const canDeleteComment = (comment: { id_user: number }): boolean => {
    return permissionsService.canDeleteComment(comment);
  };

  const canModerateComment = (): boolean => {
    return permissionsService.canModerateComment();
  };

  // Helpers pour les permissions communes
  const canCreateOeuvre = (): boolean => {
    return permissionsService.hasPermission(PERMISSIONS.OEUVRE_CREATE);
  };

  const canCreateEvent = (): boolean => {
    return permissionsService.hasPermission(PERMISSIONS.EVENT_CREATE);
  };

  const canUploadMedia = (): boolean => {
    return permissionsService.hasPermission(PERMISSIONS.MEDIA_UPLOAD);
  };

  const canAccessAdmin = (): boolean => {
    return permissionsService.hasPermission(PERMISSIONS.ADMIN_ACCESS);
  };

  const canAccessProfessionalDashboard = (): boolean => {
    return permissionsService.canAccessProfessionalDashboard();
  };

  const isValidatedProfessional = (): boolean => {
    return permissionsService.isValidatedProfessional();
  };

  const canValidateUsers = (): boolean => {
    return permissionsService.canValidateUsers();
  };

  const canManageMetadata = (): boolean => {
    return permissionsService.canManageMetadata();
  };

  return {
    // État depuis le contexte
    ...context,
    
    // État supplémentaire du service
    isValidatedProfessional,
    
    // Méthodes de vérification génériques
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Méthodes par ressource
    canEditOeuvre,
    canDeleteOeuvre,
    canEditEvent,
    canDeleteEvent,
    canCreateEventForOrganisation,
    canEditComment,
    canDeleteComment,
    canModerateComment,
    
    // Helpers supplémentaires
    canCreateOeuvre,
    canCreateEvent,
    canUploadMedia,
    canAccessAdmin,
    canAccessProfessionalDashboard,
    canValidateUsers,
    canManageMetadata,
    
    // Export des constantes de permissions
    PERMISSIONS,
  };
}