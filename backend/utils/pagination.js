/**
 * Plafonds des listes paginées (audit V11 BDD-12) : au-delà, MySQL lit puis jette des milliers de lignes
 * (OFFSET) pour une page que personne ne consulte. Utilisés par le dépôt de base et par _paginate des
 * contrôleurs.
 */
const LIMITE_MAX = 100;
const PAGE_MAX = 500;

/**
 * Borne le numéro et la taille de page : entiers, au moins 1, au plus PAGE_MAX et LIMITE_MAX.
 * @returns {{ page: number, limit: number }}
 */
const bornerPagination = (page, limit, limiteParDefaut = 20) => ({
  page: Math.min(PAGE_MAX, Math.max(1, parseInt(page, 10) || 1)),
  limit: Math.min(LIMITE_MAX, Math.max(1, parseInt(limit, 10) || limiteParDefaut))
});

module.exports = { LIMITE_MAX, PAGE_MAX, bornerPagination };
