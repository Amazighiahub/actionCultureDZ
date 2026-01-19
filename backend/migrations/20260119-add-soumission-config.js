'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('type_evenement');
    
    // Ajouter config_soumission si n'existe pas
    if (!tableInfo.config_soumission) {
      await queryInterface.addColumn('type_evenement', 'config_soumission', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Configuration du formulaire de soumission'
      });
      console.log('✅ Colonne config_soumission ajoutée');
    }
    
    // Ajouter accepte_soumissions si n'existe pas
    if (!tableInfo.accepte_soumissions) {
      await queryInterface.addColumn('type_evenement', 'accepte_soumissions', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Indique si les participants peuvent soumettre des œuvres'
      });
      console.log('✅ Colonne accepte_soumissions ajoutée');
    }

    // Configurer les types d'événements existants avec leurs soumissions
    const configs = [
      {
        nom_type_fr: 'Festival',
        accepte_soumissions: true,
        config_soumission: JSON.stringify({
          type_oeuvre: ['livre', 'film', 'musique', 'oeuvre_art'],
          requis: false,
          max_soumissions: 5,
          label: { fr: 'Œuvres à présenter', ar: 'الأعمال للعرض', en: 'Works to present' }
        })
      },
      {
        nom_type_fr: 'Exposition',
        accepte_soumissions: true,
        config_soumission: JSON.stringify({
          type_oeuvre: ['oeuvre_art', 'artisanat'],
          requis: true,
          max_soumissions: 10,
          label: { fr: 'Œuvres à exposer', ar: 'الأعمال للعرض', en: 'Works to exhibit' }
        })
      },
      {
        nom_type_fr: 'Concert',
        accepte_soumissions: true,
        config_soumission: JSON.stringify({
          type_oeuvre: ['musique'],
          requis: false,
          max_soumissions: 20,
          label: { fr: 'Morceaux à jouer', ar: 'المقطوعات للعزف', en: 'Pieces to perform' }
        })
      },
      {
        nom_type_fr: 'Projection',
        accepte_soumissions: true,
        config_soumission: JSON.stringify({
          type_oeuvre: ['film'],
          requis: true,
          max_soumissions: 3,
          label: { fr: 'Films à projeter', ar: 'الأفلام للعرض', en: 'Films to screen' }
        })
      },
      {
        nom_type_fr: 'Atelier',
        accepte_soumissions: false,
        config_soumission: null
      },
      {
        nom_type_fr: 'Conférence',
        accepte_soumissions: false,
        config_soumission: null
      },
      {
        nom_type_fr: 'Salon du livre',
        accepte_soumissions: true,
        config_soumission: JSON.stringify({
          type_oeuvre: ['livre'],
          requis: true,
          max_soumissions: 10,
          label: { fr: 'Livres à présenter', ar: 'الكتب للعرض', en: 'Books to present' }
        })
      },
      {
        nom_type_fr: 'Concours',
        accepte_soumissions: true,
        config_soumission: JSON.stringify({
          type_oeuvre: ['poeme', 'oeuvre_art', 'musique'],
          requis: true,
          max_soumissions: 3,
          label: { fr: 'Œuvres en compétition', ar: 'الأعمال في المسابقة', en: 'Works in competition' }
        })
      }
    ];

    // Mettre à jour les types existants
    for (const config of configs) {
      await queryInterface.sequelize.query(`
        UPDATE type_evenement 
        SET accepte_soumissions = ${config.accepte_soumissions ? 1 : 0},
            config_soumission = ${config.config_soumission ? `'${config.config_soumission}'` : 'NULL'}
        WHERE JSON_UNQUOTE(JSON_EXTRACT(nom_type, '$.fr')) LIKE '%${config.nom_type_fr}%'
      `);
    }

    console.log('✅ Configuration des soumissions mise à jour');
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('type_evenement');
    
    if (tableInfo.config_soumission) {
      await queryInterface.removeColumn('type_evenement', 'config_soumission');
    }
    if (tableInfo.accepte_soumissions) {
      await queryInterface.removeColumn('type_evenement', 'accepte_soumissions');
    }
  }
};
