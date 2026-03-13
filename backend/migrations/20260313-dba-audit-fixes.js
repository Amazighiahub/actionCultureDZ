'use strict';

/**
 * Migration DBA Audit - 2026-03-13
 *
 * Corrections identifiées par l'audit DBA :
 * - CRIT-02 : artisanat.prix FLOAT → DECIMAL(10,2)
 * - MAJ-09 : Booleans user allowNull → false
 * - MIN-05 : lieu coordonnées FLOAT → DECIMAL
 * - MIN-04 : URLs VARCHAR(500) → VARCHAR(2048)
 * - Index composites manquants pour queries fréquentes
 * - Index FK manquants
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ================================================================
      // 1. FIXES SCHEMA
      // ================================================================

      // CRIT-02 : artisanat.prix FLOAT → DECIMAL(10,2)
      await queryInterface.changeColumn('artisanat', 'prix', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      }, { transaction });

      // artisanat.poids aussi FLOAT → DECIMAL
      await queryInterface.changeColumn('artisanat', 'poids', {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true
      }, { transaction });

      // MIN-05 : lieu coordonnées GPS → DECIMAL haute précision
      await queryInterface.changeColumn('lieu', 'latitude', {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('lieu', 'longitude', {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      }, { transaction });

      // MAJ-09 : Booleans user — allowNull false + default
      const userBooleans = [
        'notifications_email', 'notifications_push', 'notifications_sms',
        'newsletter', 'theme_sombre', 'email_verifie'
      ];

      for (const col of userBooleans) {
        try {
          await queryInterface.changeColumn('user', col, {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          }, { transaction });
        } catch (e) {
          // Colonne peut ne pas exister selon l'état de la base
          console.warn(`⚠️ Colonne user.${col} non modifiable: ${e.message}`);
        }
      }

      // ================================================================
      // 2. INDEX COMPOSITES — PRIORITÉ 1 (Performance critique)
      // ================================================================

      // Evenement : "événements à venir publiés" — ORDER BY date_debut WHERE statut = 'publie'
      await safeAddIndex(queryInterface, 'evenement',
        ['statut', 'date_debut'],
        { name: 'idx_evenement_statut_date_debut', transaction }
      );

      // Oeuvre : "oeuvres récentes publiées" — ORDER BY date_creation WHERE statut = 'publie'
      await safeAddIndex(queryInterface, 'oeuvre',
        ['statut', 'date_creation'],
        { name: 'idx_oeuvre_statut_date_creation', transaction }
      );

      // User : "professionnels actifs" — WHERE id_type_user IN (...) AND statut = 'actif'
      await safeAddIndex(queryInterface, 'user',
        ['id_type_user', 'statut'],
        { name: 'idx_user_type_statut', transaction }
      );

      // Commentaire : "commentaires récents d'une oeuvre" — WHERE id_oeuvre = ? ORDER BY date_creation
      await safeAddIndex(queryInterface, 'commentaire',
        ['id_oeuvre', 'date_creation'],
        { name: 'idx_commentaire_oeuvre_date', transaction }
      );

      // Commentaire : threads (réponses) — WHERE commentaire_parent_id = ?
      await safeAddIndex(queryInterface, 'commentaire',
        ['commentaire_parent_id'],
        { name: 'idx_commentaire_parent', transaction }
      );

      // Signalement : modérateur assigné — WHERE id_moderateur = ?
      await safeAddIndex(queryInterface, 'signalements',
        ['id_moderateur'],
        { name: 'idx_signalement_moderateur', transaction }
      );

      // ================================================================
      // 3. INDEX COMPOSITES — PRIORITÉ 2 (Optimisation)
      // ================================================================

      // Media : médias publics d'une oeuvre — WHERE id_oeuvre = ? AND visible_public = true
      await safeAddIndex(queryInterface, 'media',
        ['id_oeuvre', 'visible_public'],
        { name: 'idx_media_oeuvre_visible', transaction }
      );

      // Evenement : par type + date — WHERE id_type_evenement = ? ORDER BY date_debut
      await safeAddIndex(queryInterface, 'evenement',
        ['id_type_evenement', 'date_debut'],
        { name: 'idx_evenement_type_date', transaction }
      );

      // Vue : analytics par entité — WHERE type_entite = ? AND id_entite = ? ORDER BY date_vue
      await safeAddIndex(queryInterface, 'vues',
        ['type_entite', 'id_entite', 'date_vue'],
        { name: 'idx_vue_entite_date', transaction }
      );

      // Signalement : file de modération — WHERE statut = ? ORDER BY priorite, date_signalement
      await safeAddIndex(queryInterface, 'signalements',
        ['statut', 'priorite', 'date_signalement'],
        { name: 'idx_signalement_moderation_queue', transaction }
      );

      // EvenementUser : événements d'un utilisateur — WHERE id_user = ? AND statut_participation = ?
      await safeAddIndex(queryInterface, 'evenementusers',
        ['id_user', 'statut_participation'],
        { name: 'idx_evenementuser_user_statut', transaction }
      );

      // ================================================================
      // 4. INDEX FK MANQUANTS
      // ================================================================

      // evenement_oeuvre.id_presentateur — FK join
      await safeAddIndex(queryInterface, 'evenement_oeuvre',
        ['id_presentateur'],
        { name: 'idx_evenement_oeuvre_presentateur', transaction }
      );

      // notification.id_evenement — FK lookup
      await safeAddIndex(queryInterface, 'notification',
        ['id_evenement'],
        { name: 'idx_notification_evenement', transaction }
      );

      // notification.id_oeuvre — FK lookup
      await safeAddIndex(queryInterface, 'notification',
        ['id_oeuvre'],
        { name: 'idx_notification_oeuvre', transaction }
      );

      await transaction.commit();
      console.log('✅ Migration DBA audit appliquée avec succès');
      console.log('   → Schema fixes: artisanat.prix DECIMAL, lieu coords DECIMAL, user booleans NOT NULL');
      console.log('   → 14 index ajoutés (6 composites P1, 5 composites P2, 3 FK)');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration DBA audit échouée:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Supprimer les index ajoutés
      const indexes = [
        ['evenement', 'idx_evenement_statut_date_debut'],
        ['oeuvre', 'idx_oeuvre_statut_date_creation'],
        ['user', 'idx_user_type_statut'],
        ['commentaire', 'idx_commentaire_oeuvre_date'],
        ['commentaire', 'idx_commentaire_parent'],
        ['signalements', 'idx_signalement_moderateur'],
        ['media', 'idx_media_oeuvre_visible'],
        ['evenement', 'idx_evenement_type_date'],
        ['vues', 'idx_vue_entite_date'],
        ['signalements', 'idx_signalement_moderation_queue'],
        ['evenementusers', 'idx_evenementuser_user_statut'],
        ['evenement_oeuvre', 'idx_evenement_oeuvre_presentateur'],
        ['notification', 'idx_notification_evenement'],
        ['notification', 'idx_notification_oeuvre'],
      ];

      for (const [table, indexName] of indexes) {
        try {
          await queryInterface.removeIndex(table, indexName, { transaction });
        } catch (e) {
          console.warn(`⚠️ Index ${indexName} déjà supprimé ou inexistant`);
        }
      }

      // Remettre les types originaux
      await queryInterface.changeColumn('artisanat', 'prix', {
        type: Sequelize.FLOAT, allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('artisanat', 'poids', {
        type: Sequelize.FLOAT, allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('lieu', 'latitude', {
        type: Sequelize.FLOAT, allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('lieu', 'longitude', {
        type: Sequelize.FLOAT, allowNull: true
      }, { transaction });

      await transaction.commit();
      console.log('✅ Migration DBA audit rollback réussi');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

/**
 * Ajoute un index en ignorant l'erreur si l'index existe déjà
 */
async function safeAddIndex(queryInterface, table, columns, options) {
  try {
    await queryInterface.addIndex(table, columns, options);
  } catch (error) {
    if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
      console.warn(`⚠️ Index ${options.name} existe déjà sur ${table}`);
    } else {
      throw error;
    }
  }
}
