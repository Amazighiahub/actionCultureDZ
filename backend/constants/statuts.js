/**
 * Statuts des contenus : source unique des listes « visibles » / « non publiques » (audit V11 COD-18).
 * Avant : ~25 listes littérales recopiées dans les dépôts, services et routes.
 *
 * Chaque type de contenu a ses propres statuts (un événement « planifié » n'existe pas pour une œuvre) :
 * une constante par type, pas une liste commune. Tableaux gelés : un appelant ne peut pas les modifier
 * par erreur (copier avec [...X] pour en ajouter).
 *
 * Constantes sans dépendance (n'importent rien) : utilisables partout, y compris par les modèles.
 */

// ---------------------------------------------------------------------------
// Événements (ENUM de models/events/evenement.js)
// ---------------------------------------------------------------------------

/** Tous les statuts d'un événement, dans l'ordre de l'ENUM */
const EVENEMENT_TOUS = Object.freeze(['brouillon', 'en_attente', 'publie', 'planifie', 'en_cours', 'termine', 'annule', 'reporte']);

/**
 * Publié, pas encore commencé. Sans « en_cours » exprès : ces listes vont avec un filtre « à venir »
 * (date_debut > maintenant) ou avec un cas { statut: 'en_cours' } à part.
 */
const EVENEMENT_PUBLIE = Object.freeze(['publie', 'planifie']);

/** Publié et pas terminé (à venir ou en cours) */
const EVENEMENT_OUVERT = Object.freeze([...EVENEMENT_PUBLIE, 'en_cours']);

/** Visible dans les listes publiques, terminés compris (ils ne sont jamais archivés automatiquement) */
const EVENEMENT_VISIBLE = Object.freeze([...EVENEMENT_OUVERT, 'termine']);

/** Fiche publique : visibles, plus reportés et annulés (la fiche reste consultable pour l'annonce) */
const EVENEMENT_PUBLIC = Object.freeze([...EVENEMENT_VISIBLE, 'reporte', 'annule']);

/** Pas encore public : visible seulement par l'auteur et la modération */
const EVENEMENT_NON_PUBLIC = Object.freeze(['brouillon', 'en_attente']);

// ---------------------------------------------------------------------------
// Œuvres (ENUM de models/oeuvres/oeuvre.js ; seul « publie » est public)
// ---------------------------------------------------------------------------

/** Œuvre en préparation (brouillon ou soumise à la modération) */
const OEUVRE_NON_PUBLIC = Object.freeze(['brouillon', 'en_attente']);

module.exports = {
  EVENEMENT_TOUS,
  EVENEMENT_PUBLIE,
  EVENEMENT_OUVERT,
  EVENEMENT_VISIBLE,
  EVENEMENT_PUBLIC,
  EVENEMENT_NON_PUBLIC,
  OEUVRE_NON_PUBLIC
};
