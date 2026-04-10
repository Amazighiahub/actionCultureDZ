'use strict';

/**
 * Migration : Ajouter un index sur user.refresh_token
 *
 * Pourquoi :
 * 1. Performance : refreshToken() faisait un FULL TABLE SCAN à chaque appel
 *    (lookup par refresh_token sans index)
 * 2. Sécurité : mitigation timing attack — un index B-tree donne un temps
 *    de réponse quasi-constant O(log n) alors qu'un full table scan a
 *    un temps variable selon le nombre d'utilisateurs
 *
 * Voir aussi : backend/services/user/userService.js refreshToken()
 */
module.exports = {
  async up(queryInterface) {
    // Vérifier si l'index existe déjà
    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM `user` WHERE Key_name = 'idx_user_refresh_token'"
    );

    if (indexes.length === 0) {
      await queryInterface.addIndex('user', ['refresh_token'], {
        name: 'idx_user_refresh_token'
      });
      console.log('✅ Index idx_user_refresh_token créé sur user.refresh_token');
    } else {
      console.log('ℹ️ Index idx_user_refresh_token existe déjà');
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('user', 'idx_user_refresh_token');
      console.log('✅ Index idx_user_refresh_token supprimé');
    } catch (e) {
      console.log('ℹ️ Index idx_user_refresh_token déjà supprimé');
    }
  }
};
