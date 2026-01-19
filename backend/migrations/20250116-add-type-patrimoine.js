'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Vérifier si la colonne existe déjà
    const tableInfo = await queryInterface.describeTable('lieu');
    
    if (tableInfo.typePatrimoine) {
      console.log('ℹ️ Colonne typePatrimoine existe déjà, migration ignorée');
      return;
    }

    // Ajouter la colonne typePatrimoine à la table lieu
    await queryInterface.addColumn('lieu', 'typePatrimoine', {
      type: Sequelize.ENUM(
        'ville_village',
        'monument',
        'musee',
        'site_archeologique',
        'site_naturel',
        'edifice_religieux',
        'palais_forteresse',
        'autre'
      ),
      allowNull: false,
      defaultValue: 'monument',
      comment: 'Type de patrimoine pour adapter les fonctionnalités affichées'
    });

    // Ajouter un index pour optimiser les filtres par type
    await queryInterface.addIndex('lieu', ['typePatrimoine'], {
      name: 'idx_lieu_type_patrimoine'
    });

    console.log('✅ Colonne typePatrimoine ajoutée avec succès');
  },

  async down(queryInterface, Sequelize) {
    // Supprimer l'index
    await queryInterface.removeIndex('lieu', 'idx_lieu_type_patrimoine');

    // Supprimer la colonne
    await queryInterface.removeColumn('lieu', 'typePatrimoine');

    // Supprimer le type ENUM (MySQL/PostgreSQL)
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS \"enum_lieu_typePatrimoine\";"
    ).catch(() => {
      // Ignorer si le type n'existe pas (MySQL)
    });

    console.log('✅ Colonne typePatrimoine supprimée');
  }
};
