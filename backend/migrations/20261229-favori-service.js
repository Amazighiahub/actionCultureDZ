// Attention : la descente supprime les favoris de services (type « service »), puis retire ce type.
'use strict';

/**
 * Migration : favoris des services (accord de la responsable, 2026-11-16). Le type « service » s'ajoute
 * aux types de favoris (œuvre, événement, lieu, artisanat). Aucune donnée existante n'est modifiée.
 * Rejouable.
 */
const AVANT = ['oeuvre', 'evenement', 'lieu', 'artisanat'];
const APRES = [...AVANT, 'service'];

async function typeActuel(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favoris' AND COLUMN_NAME = 'type_entite'`);
  return lignes[0]?.t || '';
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await typeActuel(queryInterface);
    if (!t || t.includes("'service'")) return;
    await queryInterface.changeColumn('favoris', 'type_entite', { type: Sequelize.ENUM(...APRES), allowNull: false });
  },

  async down(queryInterface, Sequelize) {
    const t = await typeActuel(queryInterface);
    if (!t.includes("'service'")) return;
    await queryInterface.sequelize.query("DELETE FROM favoris WHERE type_entite = 'service'");
    await queryInterface.changeColumn('favoris', 'type_entite', { type: Sequelize.ENUM(...AVANT), allowNull: false });
  }
};
