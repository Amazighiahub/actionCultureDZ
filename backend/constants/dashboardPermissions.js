/**
 * Permissions dashboard par rôle
 * Utilisé par DashboardController.checkAdminPermission
 * '*' = accès complet à toutes les actions
 */
const DASHBOARD_PERMISSIONS = {
  'Admin': [
    'view_dashboard', 'validate_user', 'validate_oeuvre',
    'moderate_comment', 'moderate_signalement', 'view_reports',
    'manage_events', 'manage_patrimoine'
  ],
  'Super Admin': ['*'],
  'Moderateur': [
    'view_dashboard', 'moderate_comment', 'moderate_signalement',
    'view_reports'
  ]
};

module.exports = { DASHBOARD_PERMISSIONS };
