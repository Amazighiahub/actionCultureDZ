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

/** Nombre de lignes à sauter avant la page `page` (OFFSET SQL) */
const decalage = (page, limit) => (page - 1) * limit;

/**
 * Bloc `pagination` des réponses de liste, construit au même endroit pour toutes (audit V11 COD-B11).
 * Les deux noms du nombre de pages sont gardés : `totalPages` (forme du dépôt de base) et `pages`
 * (lu par 9 écrans du site : listes de l'administration, commentaires, artisanat, œuvres).
 * page et limit sont repris tels quels : l'appelant les a déjà lus et bornés.
 * @param {number} total - nombre total d'éléments
 * @param {number} page
 * @param {number} limit
 * @returns {{ page: number, limit: number, total: number, totalPages: number, pages: number, hasNext: boolean, hasPrev: boolean }}
 */
const construirePagination = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    pages: totalPages,
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
};

module.exports = { LIMITE_MAX, PAGE_MAX, bornerPagination, decalage, construirePagination };
