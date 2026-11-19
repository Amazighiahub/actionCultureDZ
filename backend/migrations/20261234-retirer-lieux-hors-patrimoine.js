'use strict';

/**
 * Lieux importés (migration 20261233) qui ne sont pas du patrimoine, repérés après la mise en ligne : salles des
 * fêtes classées « château » dans OpenStreetMap, siège d'APC, complexe (2026-11-19). Même règle que l'import
 * (importGeoAlgeria.pasPatrimoine). Ils sont archivés, pas effacés : la descente les republie. Rejouable.
 */
const g = require('../services/patrimoine/importGeoAlgeria');

async function cibles(qi) {
  const [table] = await qi.sequelize.query("SHOW TABLES LIKE 'import_lieux_osm'");
  if (!table.length) return [];
  const lignes = await qi.sequelize.query('SELECT l.id_lieu, l.nom FROM lieu l JOIN import_lieux_osm i ON i.id_lieu = l.id_lieu',
    { type: qi.sequelize.QueryTypes.SELECT });
  return lignes.filter((l) => g.pasPatrimoine(typeof l.nom === 'string' ? JSON.parse(l.nom) : l.nom)).map((l) => l.id_lieu);
}

module.exports = {
  async up(queryInterface) {
    const ids = await cibles(queryInterface);
    if (ids.length) {
      await queryInterface.sequelize.query("UPDATE lieu SET statut = 'archive', updatedAt = NOW() WHERE id_lieu IN (:ids) AND statut = 'publie'",
        { replacements: { ids } });
    }
    console.log(`[retirer-lieux-hors-patrimoine] ${ids.length} lieux archivés`);
  },
  async down(queryInterface) {
    const ids = await cibles(queryInterface);
    if (ids.length) {
      await queryInterface.sequelize.query("UPDATE lieu SET statut = 'publie', updatedAt = NOW() WHERE id_lieu IN (:ids) AND statut = 'archive'",
        { replacements: { ids } });
    }
  }
};
