// components/permissions/PermissionGuard.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCheck } from '@/services/permissions.service';import { useTranslation } from "react-i18next";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: PermissionCheck;
  permissions?: PermissionCheck[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showMessage?: boolean;
}

// Composant pour protéger du contenu basé sur les permissions
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  redirectTo,
  showMessage = true
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, loading, statusMessage } = usePermissions();const { t } = useTranslation();

  if (loading) {
    return <div>{t("permissions_permissionguard.chargement_des_permissions")}</div>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll ?
    hasAllPermissions(...permissions) :
    hasAnyPermission(...permissions);
  }

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    if (showMessage && statusMessage) {
      return (
        <div className="alert alert-warning">
          {statusMessage}
        </div>);

    }

    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Composant pour afficher conditionnellement du contenu
export function Can({
  children,
  permission,
  fallback = null




}: {children: React.ReactNode;permission: PermissionCheck;fallback?: React.ReactNode;}) {
  const { hasPermission, loading } = usePermissions();const { t } = useTranslation();

  if (loading || !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Composant pour protéger les routes (Admin)
export function AdminRoute({ children }: {children: React.ReactNode;}) {
  const { isAdmin, loading } = usePermissions();const { t } = useTranslation();

  if (loading) {
    return <div>{t("permissions_permissionguard.chargement_2")}</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Composant pour protéger les routes (Professionnel)
export function ProfessionalRoute({ children }: {children: React.ReactNode;}) {
  const { isProfessional, needsValidation, statusMessage, loading } = usePermissions();const { t } = useTranslation();

  if (loading) {
    return <div>{t("permissions_permissionguard.chargement_2")}</div>;
  }

  if (needsValidation) {
    return (
      <div className="container mt-5">
        <div className="alert alert-info">
          <h4>{t("permissions_permissionguard.validation_attente")}</h4>
          <p>{statusMessage || 'Votre compte professionnel est en attente de validation par un administrateur.'}</p>
        </div>
      </div>);

  }

  if (!isProfessional) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Composant pour protéger les routes (Authentifié)
export function AuthenticatedRoute({ children }: {children: React.ReactNode;}) {
  const { isAuthenticated, loading } = usePermissions();const { t } = useTranslation();

  if (loading) {
    return <div>{t("permissions_permissionguard.chargement_2")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Composant pour afficher le statut de l'utilisateur
export function UserStatusBanner() {
  const { statusMessage, needsValidation } = usePermissions();const { t } = useTranslation();

  if (!statusMessage) return null;

  return (
    <div className={`alert ${needsValidation ? 'alert-info' : 'alert-warning'} mb-3`}>
      {statusMessage}
    </div>);

}

// Composant bouton avec vérification de permission
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: PermissionCheck;
  fallback?: React.ReactNode;
  showDisabled?: boolean;
}

export function PermissionButton({
  permission,
  children,
  fallback,
  showDisabled = false,
  ...props
}: PermissionButtonProps) {
  const { hasPermission } = usePermissions();const { t } = useTranslation();
  const canPerformAction = hasPermission(permission);

  if (!canPerformAction && !showDisabled) {
    return <>{fallback}</>;
  }

  return (
    <button {...props} disabled={!canPerformAction || props.disabled}>
      {children}
    </button>);

}

// Hook pour les boutons d'action sur les ressources
export function ResourceActions({
  resource,
  onEdit,
  onDelete,
  type = 'oeuvre'





}: {resource: {id_user: number;id: number;};onEdit?: () => void;onDelete?: () => void;type?: 'oeuvre' | 'evenement' | 'programme';}) {
  const { isAdmin, isOwner } = usePermissions();const { t } = useTranslation();
  const canEdit = isAdmin || isOwner(resource.id_user);
  const canDelete = isAdmin || isOwner(resource.id_user);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="btn-group" role="group">
      {canEdit && onEdit &&
      <button
        className="btn btn-sm btn-outline-primary"
        onClick={onEdit}
        title={t("permissions_permissionguard.title_modifier")}>

          <i className="bi bi-pencil"></i>
        </button>
      }
      {canDelete && onDelete &&
      <button
        className="btn btn-sm btn-outline-danger"
        onClick={onDelete}
        title={t("permissions_permissionguard.title_supprimer")}>

          <i className="bi bi-trash"></i>
        </button>
      }
    </div>);

}