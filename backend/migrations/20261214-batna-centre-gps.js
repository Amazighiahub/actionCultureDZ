'use strict';

/**
 * Migration : position de « Batna centre », placée à environ 25 km au sud de la ville (35.3384, 6.2037).
 * Nouvelle position : centre-ville, allées Ben Boulaïd (OpenStreetMap). Demande de la responsable du site.
 * Ne change que ce lieu, et seulement s'il est encore à l'ancienne position (un déplacement fait à la main
 * depuis est gardé). Descente : remet l'ancienne position.
 */
const NOM = 'Batna centre';
const AVANT = { latitude: 35.3383865, longitude: 6.2036976 };
const APRES = { latitude: 35.5559, longitude: 6.1741 };
const TOLERANCE = 0.0005;

const deplacer = (queryInterface, de, vers) => queryInterface.sequelize.query(
  `UPDATE lieu SET latitude = ?, longitude = ?, updatedAt = NOW()
    WHERE id_lieu_parent IS NULL AND JSON_UNQUOTE(JSON_EXTRACT(nom, '$.fr')) = ?
      AND ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?`,
  { replacements: [vers.latitude, vers.longitude, NOM, de.latitude, TOLERANCE, de.longitude, TOLERANCE] }
);

module.exports = {
  up: (queryInterface) => deplacer(queryInterface, AVANT, APRES),
  down: (queryInterface) => deplacer(queryInterface, APRES, AVANT),
};
