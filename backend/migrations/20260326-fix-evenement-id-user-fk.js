'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [constraints] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'evenement'
           AND COLUMN_NAME = 'id_user'
           AND REFERENCED_TABLE_NAME = 'user'`,
        { transaction }
      );

      for (const row of constraints) {
        try {
          await queryInterface.removeConstraint('evenement', row.CONSTRAINT_NAME, { transaction });
        } catch (error) {
          console.warn(`⚠️ Suppression contrainte ${row.CONSTRAINT_NAME} ignorée: ${error.message}`);
        }
      }

      await queryInterface.changeColumn('evenement', 'id_user', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id_user'
        }
      }, { transaction });

      await queryInterface.addConstraint('evenement', {
        fields: ['id_user'],
        type: 'foreign key',
        name: 'fk_evenement_id_user_restrict',
        references: {
          table: 'user',
          field: 'id_user'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction
      });

      await transaction.commit();
      console.log('✅ FK evenement.id_user corrigée avec ON DELETE RESTRICT');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Échec migration FK evenement.id_user:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      try {
        await queryInterface.removeConstraint('evenement', 'fk_evenement_id_user_restrict', { transaction });
      } catch (error) {
        console.warn(`⚠️ Contrainte fk_evenement_id_user_restrict déjà absente: ${error.message}`);
      }

      await queryInterface.changeColumn('evenement', 'id_user', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'user',
          key: 'id_user'
        }
      }, { transaction });

      await queryInterface.addConstraint('evenement', {
        fields: ['id_user'],
        type: 'foreign key',
        name: 'fk_evenement_id_user_restrict_prev',
        references: {
          table: 'user',
          field: 'id_user'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction
      });

      await transaction.commit();
      console.log('✅ Rollback FK evenement.id_user rétabli sans incohérence de contrainte');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Échec rollback FK evenement.id_user:', error.message);
      throw error;
    }
  }
};
