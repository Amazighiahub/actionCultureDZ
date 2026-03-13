'use strict';

/**
 * Migration Models Audit Phase 2 - 2026-03-13
 *
 * Corrections identifiées par l'audit complet des modèles Sequelize :
 *
 * 1. INDEX FK MANQUANTS (~20 index)
 *    - user.id_type_user, user.id_user_validate
 *    - programme.id_lieu
 *    - parcours.difficulte, parcours.id_createur
 *    - signalements.type_entite
 *    - audit_logs.date_action
 *    - dairas.wilayaId, communes.dairaId
 *    - categorie.ordre_affichage, genre.ordre_affichage
 *    - specialites.categorie
 *    - role.nom_role
 *    - lieu_medias.type_media, monument.type, vestiges.type
 *    - qr_scans.id_qr_code, qr_scans.date_scan
 *    - lieu.typePatrimoine
 *    - services.statut
 *    - oeuvre.statut (single-field, complements composite idx)
 *
 * 2. FLOAT → DECIMAL
 *    - parcours_lieux.distance_precedent FLOAT → DECIMAL(7,3)
 *
 * 3. CASCADE RULES sur tables pivot
 *    - evenement_oeuvre, user_specialite
 *
 * Note: les index composites prioritaires étaient déjà dans la migration précédente
 */

// Helper : ajouter un index de façon idempotente
async function safeAddIndex(qi, table, fields, options) {
  try {
    await qi.addIndex(table, fields, options);
  } catch (e) {
    if (e.message && (e.message.includes('Duplicate') || e.message.includes('already exists') || e.message.includes('ER_DUP_KEYNAME'))) {
      console.log(`  ⏭️  Index ${options.name} existe déjà — ignoré`);
    } else {
      console.warn(`  ⚠️  Index ${options.name}: ${e.message}`);
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ================================================================
      // 1. INDEX FK — Tables principales
      // ================================================================

      // user.id_type_user — FK JOIN fréquent
      await safeAddIndex(queryInterface, 'user',
        ['id_type_user'],
        { name: 'idx_user_id_type_user', transaction }
      );

      // user.id_user_validate — self-referential FK
      await safeAddIndex(queryInterface, 'user',
        ['id_user_validate'],
        { name: 'idx_user_id_user_validate', transaction }
      );

      // programme.id_lieu — FK JOIN
      await safeAddIndex(queryInterface, 'programme',
        ['id_lieu'],
        { name: 'idx_programme_id_lieu', transaction }
      );

      // parcours.id_createur — FK JOIN/WHERE
      await safeAddIndex(queryInterface, 'parcours',
        ['id_createur'],
        { name: 'idx_parcours_id_createur', transaction }
      );

      // parcours.difficulte — WHERE filter
      await safeAddIndex(queryInterface, 'parcours',
        ['difficulte'],
        { name: 'idx_parcours_difficulte', transaction }
      );

      // lieu.typePatrimoine — WHERE filter
      await safeAddIndex(queryInterface, 'lieu',
        ['typePatrimoine'],
        { name: 'idx_lieu_type_patrimoine', transaction }
      );

      // services.statut — admin queries
      await safeAddIndex(queryInterface, 'services',
        ['statut'],
        { name: 'idx_services_statut', transaction }
      );

      // signalements.type_entite — modération filter
      await safeAddIndex(queryInterface, 'signalements',
        ['type_entite'],
        { name: 'idx_signalement_type_entite', transaction }
      );

      // audit_logs.date_action — time-range queries
      await safeAddIndex(queryInterface, 'audit_logs',
        ['date_action'],
        { name: 'idx_audit_logs_date_action', transaction }
      );

      // ================================================================
      // 2. INDEX FK — Tables géographiques
      // ================================================================

      // dairas.wilayaId — FK JOIN cascade géo
      await safeAddIndex(queryInterface, 'dairas',
        ['wilayaId'],
        { name: 'idx_dairas_wilaya_id', transaction }
      );

      // communes.dairaId — FK JOIN cascade géo
      await safeAddIndex(queryInterface, 'communes',
        ['dairaId'],
        { name: 'idx_communes_daira_id', transaction }
      );

      // ================================================================
      // 3. INDEX — Tables de référence (lookups fréquents)
      // ================================================================

      // role.nom_role — permission checks
      await safeAddIndex(queryInterface, 'role',
        ['nom_role'],
        { name: 'idx_role_nom_role', unique: true, transaction }
      );

      // categorie.ordre_affichage — ORDER BY
      await safeAddIndex(queryInterface, 'categorie',
        ['ordre_affichage'],
        { name: 'idx_categorie_ordre', transaction }
      );

      // genre.ordre_affichage — ORDER BY
      await safeAddIndex(queryInterface, 'genre',
        ['ordre_affichage'],
        { name: 'idx_genre_ordre', transaction }
      );

      // specialites.categorie — WHERE filter
      await safeAddIndex(queryInterface, 'specialites',
        ['categorie'],
        { name: 'idx_specialites_categorie', transaction }
      );

      // langue.code — lookup by ISO code
      await safeAddIndex(queryInterface, 'langue',
        ['code'],
        { name: 'idx_langue_code', unique: true, transaction }
      );

      // ================================================================
      // 4. INDEX — Tables secondaires
      // ================================================================

      // lieu_medias.type — WHERE filter
      await safeAddIndex(queryInterface, 'lieu_medias',
        ['type'],
        { name: 'idx_lieu_medias_type', transaction }
      );

      // monuments.type — WHERE filter
      await safeAddIndex(queryInterface, 'monuments',
        ['type'],
        { name: 'idx_monuments_type', transaction }
      );

      // vestiges.type — WHERE filter
      await safeAddIndex(queryInterface, 'vestiges',
        ['type'],
        { name: 'idx_vestiges_type', transaction }
      );

      // qr_scans.id_qr_code — FK JOIN
      await safeAddIndex(queryInterface, 'qr_scans',
        ['id_qr_code'],
        { name: 'idx_qr_scans_qr_code', transaction }
      );

      // qr_scans.date_scan — time-range queries
      await safeAddIndex(queryInterface, 'qr_scans',
        ['date_scan'],
        { name: 'idx_qr_scans_date_scan', transaction }
      );

      // oeuvre.statut (single-field index, complémente le composite)
      await safeAddIndex(queryInterface, 'oeuvre',
        ['statut'],
        { name: 'idx_oeuvre_statut', transaction }
      );

      // ================================================================
      // 5. SCHEMA FIX — FLOAT → DECIMAL
      // ================================================================

      // parcours_lieux.distance_precedent FLOAT → DECIMAL(7,3)
      try {
        await queryInterface.changeColumn('parcours_lieux', 'distance_precedent', {
          type: Sequelize.DECIMAL(7, 3),
          allowNull: true
        }, { transaction });
      } catch (e) {
        console.warn(`  ⚠️  parcours_lieux.distance_precedent: ${e.message}`);
      }

      // ================================================================
      // 6. CASCADE RULES — Tables pivot
      // ================================================================

      // evenement_oeuvre — CASCADE on delete Evenement or Oeuvre
      const cascadeFKs = [
        { table: 'evenement_oeuvre', column: 'id_evenement', ref: 'evenement', refCol: 'id_evenement', name: 'fk_evtoeuvre_evenement' },
        { table: 'evenement_oeuvre', column: 'id_oeuvre', ref: 'oeuvre', refCol: 'id_oeuvre', name: 'fk_evtoeuvre_oeuvre' },
        { table: 'user_specialite', column: 'id_user', ref: 'user', refCol: 'id_user', name: 'fk_userspec_user' },
        { table: 'user_specialite', column: 'id_specialite', ref: 'specialites', refCol: 'id_specialite', name: 'fk_userspec_specialite' },
      ];

      for (const fk of cascadeFKs) {
        try {
          // Supprimer l'ancienne FK (nom auto-généré par Sequelize)
          const [constraints] = await queryInterface.sequelize.query(
            `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = '${fk.table}'
             AND COLUMN_NAME = '${fk.column}'
             AND REFERENCED_TABLE_NAME IS NOT NULL`,
            { transaction }
          );

          for (const row of constraints) {
            await queryInterface.sequelize.query(
              `ALTER TABLE \`${fk.table}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
              { transaction }
            );
          }

          // Recréer avec CASCADE
          await queryInterface.sequelize.query(
            `ALTER TABLE \`${fk.table}\` ADD CONSTRAINT \`${fk.name}\`
             FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.ref}\` (\`${fk.refCol}\`)
             ON DELETE CASCADE ON UPDATE CASCADE`,
            { transaction }
          );
        } catch (e) {
          console.warn(`  ⚠️  CASCADE ${fk.name}: ${e.message}`);
        }
      }

      await transaction.commit();
      console.log('✅ Migration Models Audit Phase 2 appliquée');
      console.log('   → 22 index ajoutés (9 FK principales, 2 géo, 5 référence, 6 secondaires)');
      console.log('   → 1 schema fix (FLOAT → DECIMAL)');
      console.log('   → 4 CASCADE rules (evenement_oeuvre, user_specialite)');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration Phase 2 échouée:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer tous les index ajoutés
      const indexes = [
        ['user', 'idx_user_id_type_user'],
        ['user', 'idx_user_id_user_validate'],
        ['programme', 'idx_programme_id_lieu'],
        ['parcours', 'idx_parcours_id_createur'],
        ['parcours', 'idx_parcours_difficulte'],
        ['lieu', 'idx_lieu_type_patrimoine'],
        ['services', 'idx_services_statut'],
        ['signalements', 'idx_signalement_type_entite'],
        ['audit_logs', 'idx_audit_logs_date_action'],
        ['dairas', 'idx_dairas_wilaya_id'],
        ['communes', 'idx_communes_daira_id'],
        ['role', 'idx_role_nom_role'],
        ['categorie', 'idx_categorie_ordre'],
        ['genre', 'idx_genre_ordre'],
        ['specialites', 'idx_specialites_categorie'],
        ['langue', 'idx_langue_code'],
        ['lieu_medias', 'idx_lieu_medias_type'],
        ['monuments', 'idx_monuments_type'],
        ['vestiges', 'idx_vestiges_type'],
        ['qr_scans', 'idx_qr_scans_qr_code'],
        ['qr_scans', 'idx_qr_scans_date_scan'],
        ['oeuvre', 'idx_oeuvre_statut'],
      ];

      for (const [table, indexName] of indexes) {
        try {
          await queryInterface.removeIndex(table, indexName, { transaction });
        } catch (e) {
          console.warn(`  ⚠️  ${indexName} déjà supprimé`);
        }
      }

      // Remettre FLOAT
      try {
        await queryInterface.changeColumn('parcours_lieux', 'distance_precedent', {
          type: Sequelize.FLOAT,
          allowNull: true
        }, { transaction });
      } catch (e) {
        console.warn(`  ⚠️  Rollback distance_precedent: ${e.message}`);
      }

      // Supprimer les FK CASCADE et laisser Sequelize recréer au sync
      const cascadeNames = ['fk_evtoeuvre_evenement', 'fk_evtoeuvre_oeuvre', 'fk_userspec_user', 'fk_userspec_specialite'];
      for (const fkName of cascadeNames) {
        try {
          const [rows] = await queryInterface.sequelize.query(
            `SELECT TABLE_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_NAME = '${fkName}' AND TABLE_SCHEMA = DATABASE()`
          );
          if (rows.length > 0) {
            await queryInterface.sequelize.query(
              `ALTER TABLE \`${rows[0].TABLE_NAME}\` DROP FOREIGN KEY \`${fkName}\``,
              { transaction }
            );
          }
        } catch (e) {
          console.warn(`  ⚠️  Drop FK ${fkName}: ${e.message}`);
        }
      }

      await transaction.commit();
      console.log('✅ Migration Phase 2 rollback réussi');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
