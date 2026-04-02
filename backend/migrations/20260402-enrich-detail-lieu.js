'use strict';

/**
 * Migration : Enrichir detail_lieux avec les champs culturels
 *
 * Ajoute les colonnes :
 * - gastronomie (JSON multilingue)
 * - traditions (JSON multilingue)
 * - artisanat_local (JSON multilingue)
 * - personnalites (JSON multilingue)
 * - architecture (JSON multilingue)
 * - infos_pratiques (JSON multilingue)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('detail_lieux');

    if (!tableInfo.gastronomie) {
      await queryInterface.addColumn('detail_lieux', 'gastronomie', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Gastronomie locale en plusieurs langues { fr: "...", ar: "...", en: "..." }'
      });
    }

    if (!tableInfo.traditions) {
      await queryInterface.addColumn('detail_lieux', 'traditions', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Traditions et coutumes locales en plusieurs langues'
      });
    }

    if (!tableInfo.artisanat_local) {
      await queryInterface.addColumn('detail_lieux', 'artisanat_local', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Artisanat et savoir-faire locaux en plusieurs langues'
      });
    }

    if (!tableInfo.personnalites) {
      await queryInterface.addColumn('detail_lieux', 'personnalites', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Personnalités historiques et figures locales en plusieurs langues'
      });
    }

    if (!tableInfo.architecture) {
      await queryInterface.addColumn('detail_lieux', 'architecture', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Style architectural et patrimoine bâti en plusieurs langues'
      });
    }

    if (!tableInfo.infos_pratiques) {
      await queryInterface.addColumn('detail_lieux', 'infos_pratiques', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Informations pratiques (accès, tarifs, conseils) en plusieurs langues'
      });
    }

    console.log('✅ Migration 20260402-enrich-detail-lieu : 6 colonnes ajoutées');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('detail_lieux', 'gastronomie');
    await queryInterface.removeColumn('detail_lieux', 'traditions');
    await queryInterface.removeColumn('detail_lieux', 'artisanat_local');
    await queryInterface.removeColumn('detail_lieux', 'personnalites');
    await queryInterface.removeColumn('detail_lieux', 'architecture');
    await queryInterface.removeColumn('detail_lieux', 'infos_pratiques');
    console.log('✅ Rollback 20260402-enrich-detail-lieu : colonnes supprimées');
  }
};
