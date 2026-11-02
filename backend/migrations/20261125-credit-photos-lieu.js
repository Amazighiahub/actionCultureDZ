// Attention : la descente supprime les colonnes credit et licence, donc les crédits saisis. Seule la sauvegarde d'avant déploiement les conserve.
'use strict';

/**
 * Migration : crédit et droits des photos d'un lieu (lieu_medias).
 * credit  : photographe ou source (« Amina Brahimi », « Wikimedia Commons »…), affiché « © … »
 * licence : tous_droits_reserves | cc_by | cc_by_sa | domaine_public (null = non précisé)
 * Colonnes facultatives ajoutées : aucune donnée existante n'est modifiée. Rejouable.
 */
async function colonnes(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lieu_medias'`);
  return new Set(lignes.map(l => l.c));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const existantes = await colonnes(queryInterface);
    if (!existantes.size) return; // table absente (base vide)
    if (!existantes.has('credit')) {
      await queryInterface.addColumn('lieu_medias', 'credit', { type: Sequelize.STRING(150), allowNull: true });
    }
    if (!existantes.has('licence')) {
      await queryInterface.addColumn('lieu_medias', 'licence', { type: Sequelize.STRING(30), allowNull: true });
    }
  },

  async down(queryInterface) {
    const existantes = await colonnes(queryInterface);
    if (existantes.has('licence')) await queryInterface.removeColumn('lieu_medias', 'licence');
    if (existantes.has('credit')) await queryInterface.removeColumn('lieu_medias', 'credit');
  }
};
