'use strict';

/**
 * Migration pour ajouter les colonnes professionnelles à la table services
 * - id_user: Professionnel propriétaire du service
 * - type_service: Type de service proposé
 * - latitude, longitude: Coordonnées GPS
 * - adresse: Adresse multilingue
 * - telephone, email, site_web: Contact
 * - horaires: Horaires d'ouverture
 * - tarif_min, tarif_max: Tarifs
 * - statut: Statut de validation
 * - photo_url: Photo principale
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('services');

    // id_user - Professionnel propriétaire
    if (!tableInfo.id_user) {
      // Ajouter d'abord la colonne sans contrainte FK
      await queryInterface.addColumn('services', 'id_user', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Professionnel propriétaire du service'
      });
      console.log('✅ Colonne id_user ajoutée à services');

      // Tenter d'ajouter la contrainte FK séparément (peut échouer si types incompatibles)
      try {
        await queryInterface.addConstraint('services', {
          fields: ['id_user'],
          type: 'foreign key',
          name: 'fk_services_id_user',
          references: {
            table: 'users',
            field: 'id_user'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
        console.log('✅ Contrainte FK fk_services_id_user ajoutée');
      } catch (fkError) {
        console.log('⚠️ Contrainte FK non ajoutée (incompatibilité de types possible):', fkError.message);
      }
    }

    // type_service
    if (!tableInfo.type_service) {
      await queryInterface.addColumn('services', 'type_service', {
        type: Sequelize.ENUM('restaurant', 'hotel', 'guide', 'transport', 'artisanat', 'location', 'autre'),
        allowNull: false,
        defaultValue: 'autre',
        comment: 'Type de service proposé'
      });
      console.log('✅ Colonne type_service ajoutée à services');
    }

    // latitude
    if (!tableInfo.latitude) {
      await queryInterface.addColumn('services', 'latitude', {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitude du service'
      });
      console.log('✅ Colonne latitude ajoutée à services');
    }

    // longitude
    if (!tableInfo.longitude) {
      await queryInterface.addColumn('services', 'longitude', {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude du service'
      });
      console.log('✅ Colonne longitude ajoutée à services');
    }

    // adresse (JSON multilingue)
    if (!tableInfo.adresse) {
      await queryInterface.addColumn('services', 'adresse', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Adresse en plusieurs langues'
      });
      console.log('✅ Colonne adresse ajoutée à services');
    }

    // telephone
    if (!tableInfo.telephone) {
      await queryInterface.addColumn('services', 'telephone', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
      console.log('✅ Colonne telephone ajoutée à services');
    }

    // email
    if (!tableInfo.email) {
      await queryInterface.addColumn('services', 'email', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
      console.log('✅ Colonne email ajoutée à services');
    }

    // site_web
    if (!tableInfo.site_web) {
      await queryInterface.addColumn('services', 'site_web', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
      console.log('✅ Colonne site_web ajoutée à services');
    }

    // horaires (JSON)
    if (!tableInfo.horaires) {
      await queryInterface.addColumn('services', 'horaires', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Horaires en plusieurs langues ou structurés'
      });
      console.log('✅ Colonne horaires ajoutée à services');
    }

    // tarif_min
    if (!tableInfo.tarif_min) {
      await queryInterface.addColumn('services', 'tarif_min', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });
      console.log('✅ Colonne tarif_min ajoutée à services');
    }

    // tarif_max
    if (!tableInfo.tarif_max) {
      await queryInterface.addColumn('services', 'tarif_max', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      });
      console.log('✅ Colonne tarif_max ajoutée à services');
    }

    // statut
    if (!tableInfo.statut) {
      await queryInterface.addColumn('services', 'statut', {
        type: Sequelize.ENUM('en_attente', 'valide', 'rejete'),
        defaultValue: 'en_attente',
        comment: 'Statut de validation par admin'
      });
      console.log('✅ Colonne statut ajoutée à services');
    }

    // photo_url
    if (!tableInfo.photo_url) {
      await queryInterface.addColumn('services', 'photo_url', {
        type: Sequelize.STRING(500),
        allowNull: true
      });
      console.log('✅ Colonne photo_url ajoutée à services');
    }

    // Ajouter un index sur id_user pour les performances
    try {
      await queryInterface.addIndex('services', ['id_user'], {
        name: 'idx_services_id_user'
      });
      console.log('✅ Index idx_services_id_user créé');
    } catch (e) {
      console.log('⚠️ Index idx_services_id_user existe déjà ou erreur:', e.message);
    }

    // Ajouter un index sur type_service
    try {
      await queryInterface.addIndex('services', ['type_service'], {
        name: 'idx_services_type_service'
      });
      console.log('✅ Index idx_services_type_service créé');
    } catch (e) {
      console.log('⚠️ Index idx_services_type_service existe déjà ou erreur:', e.message);
    }

    console.log('✅ Migration services professionnels terminée');
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les index
    try {
      await queryInterface.removeIndex('services', 'idx_services_id_user');
    } catch (e) { /* ignore */ }

    try {
      await queryInterface.removeIndex('services', 'idx_services_type_service');
    } catch (e) { /* ignore */ }

    // Supprimer les colonnes dans l'ordre inverse
    const columnsToRemove = [
      'photo_url', 'statut', 'tarif_max', 'tarif_min', 'horaires',
      'site_web', 'email', 'telephone', 'adresse',
      'longitude', 'latitude', 'type_service', 'id_user'
    ];

    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('services', column);
        console.log(`✅ Colonne ${column} supprimée`);
      } catch (e) {
        console.log(`⚠️ Impossible de supprimer ${column}:`, e.message);
      }
    }
  }
};
