/**
 * Données à mettre en cache pour une liste d'entités : les valeurs brutes, avec toutes leurs
 * langues. Un DTO mis en cache perd les siennes : JSON.stringify appelle son toJSON(), qui le
 * traduit en français. Les visiteurs en arabe ou en anglais recevaient alors du français dès
 * le 2e appel (audit V8). Le service reconstruit le DTO après la lecture du cache.
 */
const entitesBrutes = (entites) => (entites || []).map(e => (e?.get ? e.get({ plain: true }) : e));

module.exports = { entitesBrutes };
