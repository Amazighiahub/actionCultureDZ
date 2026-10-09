'use strict';

/**
 * Migration : colonne detail_lieux.nb_notations (nombre de votes du site).
 *
 * Ajoutée au modèle DetailLieu le 2026-06-22 sans migration : en production la colonne
 * manquait, et toute requête lisant DetailLieu en entier (fiche d'un site patrimonial,
 * galerie, carte de visite) échouait. Le compteur est initialisé depuis les votes
 * déjà enregistrés dans lieu_notation.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('detail_lieux');
    if (columns.nb_notations) {
      console.log('ℹ️  detail_lieux.nb_notations existe déjà — ignoré');
      return;
    }
    await queryInterface.addColumn('detail_lieux', 'nb_notations', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Nombre de votes pour calculer la vraie moyenne pondérée'
    });

    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (names.includes('lieu_notation')) {
      await queryInterface.sequelize.query(`
        UPDATE detail_lieux d
        SET d.nb_notations = (SELECT COUNT(*) FROM lieu_notation n WHERE n.id_lieu = d.id_lieu)
      `);
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('detail_lieux');
    if (columns.nb_notations) {
      await queryInterface.removeColumn('detail_lieux', 'nb_notations');
    }
  }
};
