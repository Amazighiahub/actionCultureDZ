'use strict';

/**
 * Migration: programme_intervenant — id_user → id_intervenant
 *
 * Logique métier : ProgrammeIntervenant lie Programme ↔ Intervenant (pas User).
 * L'Intervenant a un champ optionnel id_user s'il a un compte utilisateur.
 *
 * Changements :
 * - Renommer la colonne id_user → id_intervenant
 * - FK pointe vers intervenant(id_intervenant) au lieu de user(id_user)
 * - Index unique (id_programme, id_intervenant)
 */

module.exports = {
  async up(queryInterface) {
    // Vérifier l'état actuel de la table
    const [cols] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM programme_intervenant"
    );
    const colNames = cols.map(c => c.Field);

    // Si id_intervenant existe déjà, la migration a déjà été appliquée
    if (colNames.includes('id_intervenant') && !colNames.includes('id_user')) {
      console.log('  ⏭ Migration déjà appliquée (id_intervenant existe, id_user absent)');
      return;
    }

    // Si id_user n'existe pas, rien à faire
    if (!colNames.includes('id_user')) {
      console.log('  ⏭ Colonne id_user absente — rien à migrer');
      return;
    }

    // ================================================================
    // ÉTAPE 1 : Supprimer les FK et index existants sur id_user
    // ================================================================
    const [fks] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME " +
      "FROM information_schema.KEY_COLUMN_USAGE " +
      "WHERE TABLE_NAME='programme_intervenant' AND TABLE_SCHEMA=DATABASE() " +
      "AND REFERENCED_TABLE_NAME IS NOT NULL AND COLUMN_NAME='id_user'"
    );

    for (const fk of fks) {
      await queryInterface.sequelize.query(
        `ALTER TABLE programme_intervenant DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`
      );
      console.log(`  ✓ FK ${fk.CONSTRAINT_NAME} supprimée`);
    }

    // Supprimer les index contenant id_user
    const [idxs] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM programme_intervenant WHERE Column_name = 'id_user' AND Key_name != 'PRIMARY'"
    );
    const droppedIndexes = new Set();
    for (const idx of idxs) {
      if (!droppedIndexes.has(idx.Key_name)) {
        try {
          await queryInterface.sequelize.query(
            `DROP INDEX ${idx.Key_name} ON programme_intervenant`
          );
          droppedIndexes.add(idx.Key_name);
          console.log(`  ✓ Index ${idx.Key_name} supprimé`);
        } catch (e) {
          // Index déjà supprimé par le DROP FK
        }
      }
    }

    // ================================================================
    // ÉTAPE 2 : Renommer la colonne id_user → id_intervenant
    // ================================================================
    await queryInterface.sequelize.query(
      'ALTER TABLE programme_intervenant CHANGE COLUMN id_user id_intervenant INT NOT NULL'
    );
    console.log('  ✓ Colonne renommée id_user → id_intervenant');

    // ================================================================
    // ÉTAPE 3 : Ajouter FK vers intervenant + index unique
    // ================================================================
    await queryInterface.sequelize.query(
      'ALTER TABLE programme_intervenant ADD CONSTRAINT fk_pi_intervenant ' +
      'FOREIGN KEY (id_intervenant) REFERENCES intervenant(id_intervenant) ON DELETE CASCADE'
    );
    console.log('  ✓ FK fk_pi_intervenant ajoutée');

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX pi_programme_intervenant_unique ON programme_intervenant (id_programme, id_intervenant)'
    );
    console.log('  ✓ Index unique (id_programme, id_intervenant) créé');

    console.log('✅ Migration terminée : programme_intervenant utilise id_intervenant');
  },

  async down(queryInterface) {
    const [cols] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM programme_intervenant"
    );
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('id_intervenant')) {
      console.log('  ⏭ Rollback non nécessaire');
      return;
    }

    // Supprimer FK et index sur id_intervenant
    const [fks] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE " +
      "WHERE TABLE_NAME='programme_intervenant' AND TABLE_SCHEMA=DATABASE() " +
      "AND REFERENCED_TABLE_NAME='intervenant'"
    );
    for (const fk of fks) {
      await queryInterface.sequelize.query(
        `ALTER TABLE programme_intervenant DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`
      );
    }

    try {
      await queryInterface.sequelize.query(
        'DROP INDEX pi_programme_intervenant_unique ON programme_intervenant'
      );
    } catch (e) { /* index may not exist */ }

    // Renommer la colonne
    await queryInterface.sequelize.query(
      'ALTER TABLE programme_intervenant CHANGE COLUMN id_intervenant id_user INT NOT NULL'
    );

    // Restaurer FK vers user
    await queryInterface.sequelize.query(
      'ALTER TABLE programme_intervenant ADD CONSTRAINT fk_pi_user ' +
      'FOREIGN KEY (id_user) REFERENCES `user`(id_user) ON DELETE CASCADE'
    );

    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX programme_intervenant_id_programme_id_user_unique ON programme_intervenant (id_programme, id_user)'
    );

    console.log('✅ Rollback terminé : programme_intervenant utilise id_user');
  }
};
