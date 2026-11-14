// Attention : la descente supprime les colonnes exclu_accueil, donc les choix « ne pas mettre à l'accueil ». Seule la sauvegarde d'avant déploiement les conserve.
'use strict';

/**
 * Migration : « Ne pas mettre à l'accueil » (décision de la responsable, 2026-11-14).
 * Une case sur les œuvres et les lieux : l'équipe écarte une photo qui ne convient pas au grand
 * format de l'accueil (texte, flou…). Le contenu reste publié sur sa page.
 * Colonnes ajoutées avec la valeur « non » : aucune donnée existante n'est modifiée. Rejouable.
 */
const TABLES = ['oeuvre', 'lieu'];

async function aColonne(queryInterface, table) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = 'exclu_accueil'`, { replacements: { table } });
  return lignes.length > 0;
}

async function tableExiste(queryInterface, table) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table`, { replacements: { table } });
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      if (!(await tableExiste(queryInterface, table)) || await aColonne(queryInterface, table)) continue;
      await queryInterface.addColumn(table, 'exclu_accueil', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      if (await aColonne(queryInterface, table)) await queryInterface.removeColumn(table, 'exclu_accueil');
    }
  }
};
