'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Transaction pour garantir l'intégrité
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. CORRECTION TABLE SERVICES
      // Ajouter temporairement id_lieu si elle n'existe pas
      const servicesTable = await queryInterface.describeTable('services');
      
      if (!servicesTable.id_lieu) {
        await queryInterface.addColumn('services', 'id_lieu', {
          type: Sequelize.INTEGER,
          references: {
            model: 'lieu',
            key: 'id_lieu'
          }
        }, { transaction });
      }

      // Migrer les données de id_detailLieu vers id_lieu
      await queryInterface.sequelize.query(`
        UPDATE services s
        JOIN detail_lieux dl ON s.id_detailLieu = dl.id_detailLieu
        SET s.id_lieu = dl.id_lieu
        WHERE s.id_lieu IS NULL
      `, { transaction });

      // Rendre id_lieu NOT NULL
      await queryInterface.changeColumn('services', 'id_lieu', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lieu',
          key: 'id_lieu'
        }
      }, { transaction });

      // Supprimer l'ancienne colonne id_detailLieu
      if (servicesTable.id_detailLieu) {
        await queryInterface.removeColumn('services', 'id_detailLieu', { transaction });
      }

      // Ajouter les nouvelles colonnes
      await queryInterface.addColumn('services', 'disponible', {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('services', 'description', {
        type: Sequelize.TEXT
      }, { transaction });

      // 2. CORRECTION TABLE MONUMENTS
      // Renommer detailLieuId en id_detail_lieu
      await queryInterface.renameColumn('monuments', 'detailLieuId', 'id_detail_lieu', { transaction });

      // Corriger l'encodage du type ENUM
      await queryInterface.changeColumn('monuments', 'type', {
        type: Sequelize.ENUM('Mosquée', 'Palais', 'Statue', 'Tour', 'Musée'),
        allowNull: false
      }, { transaction });

      // 3. CORRECTION TABLE VESTIGES
      // Renommer detailLieuId en id_detail_lieu
      await queryInterface.renameColumn('vestiges', 'detailLieuId', 'id_detail_lieu', { transaction });

      // Corriger l'encodage du type ENUM
      await queryInterface.changeColumn('vestiges', 'type', {
        type: Sequelize.ENUM('Ruines', 'Murailles', 'Site archéologique'),
        allowNull: false
      }, { transaction });

      // 4. CORRECTION TABLE LIEU
      // Supprimer les colonnes redondantes wilayaId et dairaId
      const lieuTable = await queryInterface.describeTable('lieu');
      
      if (lieuTable.wilayaId) {
        await queryInterface.removeColumn('lieu', 'wilayaId', { transaction });
      }
      
      if (lieuTable.dairaId) {
        await queryInterface.removeColumn('lieu', 'dairaId', { transaction });
      }

      // Rendre communeId NOT NULL
      await queryInterface.changeColumn('lieu', 'communeId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'communes',
          key: 'id_commune'
        }
      }, { transaction });

      // 5. AJOUTER LES CONTRAINTES CHECK
      // Contraintes GPS sur lieu
      await queryInterface.sequelize.query(`
        ALTER TABLE lieu 
        ADD CONSTRAINT chk_latitude CHECK (latitude BETWEEN -90 AND 90),
        ADD CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180 AND 180)
      `, { transaction });

      // Contrainte sur noteMoyenne dans detail_lieux
      await queryInterface.sequelize.query(`
        ALTER TABLE detail_lieux
        ADD CONSTRAINT chk_note_moyenne CHECK (noteMoyenne IS NULL OR (noteMoyenne >= 0 AND noteMoyenne <= 5))
      `, { transaction });

      // 6. AJOUTER LES INDEX POUR PERFORMANCE
      await queryInterface.addIndex('lieu', ['latitude', 'longitude'], {
        name: 'idx_lieu_coords',
        transaction
      });

      await queryInterface.addIndex('lieu', ['communeId'], {
        name: 'idx_lieu_commune',
        transaction
      });

      await queryInterface.addIndex('services', ['id_lieu'], {
        name: 'idx_services_lieu',
        transaction
      });

      await queryInterface.addIndex('monuments', ['id_detail_lieu'], {
        name: 'idx_monuments_detail',
        transaction
      });

      await queryInterface.addIndex('vestiges', ['id_detail_lieu'], {
        name: 'idx_vestiges_detail',
        transaction
      });

      // 7. SUPPRIMER ParcourIdParcours SI ELLE EXISTE
      const parcoursLieuxTable = await queryInterface.describeTable('parcours_lieux');
      
      if (parcoursLieuxTable.ParcourIdParcours) {
        await queryInterface.removeColumn('parcours_lieux', 'ParcourIdParcours', { transaction });
      }

      await transaction.commit();
      console.log('✅ Toutes les corrections ont été appliquées avec succès !');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Inverser les changements (pour rollback si nécessaire)
      
      // 1. Restaurer services
      await queryInterface.addColumn('services', 'id_detailLieu', {
        type: Sequelize.INTEGER,
        references: {
          model: 'detail_lieux',
          key: 'id_detailLieu'
        }
      }, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE services s
        JOIN lieu l ON s.id_lieu = l.id_lieu
        JOIN detail_lieux dl ON l.id_lieu = dl.id_lieu
        SET s.id_detailLieu = dl.id_detailLieu
      `, { transaction });

      await queryInterface.removeColumn('services', 'id_lieu', { transaction });
      await queryInterface.removeColumn('services', 'disponible', { transaction });
      await queryInterface.removeColumn('services', 'description', { transaction });

      // 2. Restaurer monuments
      await queryInterface.renameColumn('monuments', 'id_detail_lieu', 'detailLieuId', { transaction });

      // 3. Restaurer vestiges
      await queryInterface.renameColumn('vestiges', 'id_detail_lieu', 'detailLieuId', { transaction });

      // 4. Restaurer lieu
      await queryInterface.addColumn('lieu', 'wilayaId', {
        type: Sequelize.INTEGER,
        references: {
          model: 'wilayas',
          key: 'id_wilaya'
        }
      }, { transaction });

      await queryInterface.addColumn('lieu', 'dairaId', {
        type: Sequelize.INTEGER,
        references: {
          model: 'dairas',
          key: 'id_daira'
        }
      }, { transaction });

      // 5. Supprimer les contraintes
      await queryInterface.sequelize.query(`
        ALTER TABLE lieu 
        DROP CONSTRAINT IF EXISTS chk_latitude,
        DROP CONSTRAINT IF EXISTS chk_longitude
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE detail_lieux
        DROP CONSTRAINT IF EXISTS chk_note_moyenne
      `, { transaction });

      // 6. Supprimer les index
      await queryInterface.removeIndex('lieu', 'idx_lieu_coords', { transaction });
      await queryInterface.removeIndex('lieu', 'idx_lieu_commune', { transaction });
      await queryInterface.removeIndex('services', 'idx_services_lieu', { transaction });
      await queryInterface.removeIndex('monuments', 'idx_monuments_detail', { transaction });
      await queryInterface.removeIndex('vestiges', 'idx_vestiges_detail', { transaction });

      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};