/**
 * Familles d'organisations de l'annuaire, d'après le code du type (typeorganisation.code).
 * Un type sans code connu tombe dans « autres ».
 */
const CATEGORIES = {
  associations: ['association', 'association_culturelle', 'ong', 'fondation'],
  edition: ['maison_edition'],
  culture: ['musee', 'bibliotheque'],
  institutions: ['ministere', 'collectivite', 'institution', 'universite', 'ecole'],
  entreprises: ['entreprise', 'entreprise_privee']
};

const categorieDuType = (code) =>
  Object.keys(CATEGORIES).find(c => CATEGORIES[c].includes(code)) || 'autres';

module.exports = { CATEGORIES, categorieDuType };
