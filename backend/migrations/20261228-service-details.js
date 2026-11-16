// Attention : la descente supprime les colonnes ajoutées, donc les équipements, langues, capacité et liens de réservation saisis.
'use strict';

/**
 * Migration : services « comme TripAdvisor », lot 2 (accord de la responsable, 2026-11-16).
 * Sur chaque service : équipements (liste fermée), langues parlées, capacité, lien de réservation et
 * numéro WhatsApp (bouton « Réserver »). Colonnes vides par défaut : aucune donnée existante n'est
 * modifiée. Rejouable.
 */
const COLONNES = (Sequelize) => ({
  equipements: { type: Sequelize.JSON, allowNull: true },
  langues: { type: Sequelize.JSON, allowNull: true },
  capacite: { type: Sequelize.INTEGER, allowNull: true },
  lien_reservation: { type: Sequelize.STRING(500), allowNull: true },
  whatsapp: { type: Sequelize.STRING(20), allowNull: true }
});

async function colonnes(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'services'`);
  return new Set(lignes.map((l) => l.COLUMN_NAME));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const existantes = await colonnes(queryInterface);
    for (const [nom, def] of Object.entries(COLONNES(Sequelize))) {
      if (!existantes.has(nom)) await queryInterface.addColumn('services', nom, def);
    }
  },

  async down(queryInterface, Sequelize) {
    const existantes = await colonnes(queryInterface);
    for (const nom of Object.keys(COLONNES(Sequelize))) {
      if (existantes.has(nom)) await queryInterface.removeColumn('services', nom);
    }
  }
};
