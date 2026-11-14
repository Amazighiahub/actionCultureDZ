/**
 * Noms des rôles et comparaison sans accent ni majuscule (audit V11 COD-B7).
 *
 * Le rôle de modération s'appelle « Moderateur » dans models/index.js et « Modérateur » dans le
 * jeu de données SQL ; la base n'en garde qu'un. Avant, une route qui demandait « Modérateur »
 * refusait un modérateur enregistré « Moderateur » (et l'inverse).
 *
 * Côté route, les noms courts restent acceptés (Admin, Pro). Côté compte, seul le nom exact compte
 * (aux accents et majuscules près) : un rôle « Admin » en base ne donne pas les droits d'administrateur.
 */
const ROLES = Object.freeze({
  ADMIN: 'Administrateur',
  MODERATEUR: 'Modérateur',
  PROFESSIONNEL: 'Professionnel',
  CONTRIBUTEUR: 'Contributeur',
  UTILISATEUR: 'User'
});

/** « Modérateur », « moderateur », « MODERATEUR » → « moderateur » */
const normaliserRole = (nom) => String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Noms courts écrits dans les routes
const ALIAS_ROUTE = Object.freeze({ admin: 'administrateur', pro: 'professionnel' });
const roleDemande = (nom) => { const n = normaliserRole(nom); return ALIAS_ROUTE[n] || n; };

/** Le compte (liste de noms de rôles) a-t-il l'un des rôles demandés par la route ? */
function aUnDesRoles(rolesDuCompte, ...demandes) {
  const siens = new Set((rolesDuCompte || []).map(normaliserRole));
  // Nom exact (aux accents près) ou nom court de route : rien de ce qui passait avant n'est refusé
  return demandes.flat().some((r) => siens.has(normaliserRole(r)) || siens.has(roleDemande(r)));
}

const estRole = (nom, role) => normaliserRole(nom) === normaliserRole(role);

// Protection d'un compte (ne pas le supprimer, le désactiver, le sanctionner) : on reste LARGE et on
// reconnaît aussi les anciens noms « Admin » et « Super Admin ». Pour DONNER un droit, utiliser estRole.
const NOMS_ADMIN_PROTEGES = Object.freeze([ROLES.ADMIN, 'Admin', 'Super Admin']);
/** Le compte (objets { nom_role }) a-t-il un rôle d'administration à protéger ? */
const aRoleAdministration = (roles) => (roles || []).some((r) => NOMS_ADMIN_PROTEGES.some((n) => estRole(r?.nom_role, n)));
/** Administration ou modération (protection d'un compte) */
const aRoleEquipe = (roles) => aRoleAdministration(roles) || (roles || []).some((r) => estRole(r?.nom_role, ROLES.MODERATEUR));

module.exports = { ROLES, normaliserRole, roleDemande, aUnDesRoles, estRole, aRoleAdministration, aRoleEquipe };
