'use strict';

/**
 * Migration : les commandes ne disparaissent plus avec un compte (audit V11 BDD-21).
 *
 * Les clés id_vendeur et id_acheteur de `commande` étaient en ON DELETE CASCADE (constaté en
 * production le 2026-11-12) : supprimer un compte directement dans la base effaçait aussi l'historique
 * des commandes de l'autre partie. Le site, lui, rattache déjà ces commandes au compte « Utilisateur
 * supprimé » avant de supprimer le compte (repositories/userRepository.js) : RESTRICT ne gêne donc
 * aucun chemin du site, il protège seulement contre une suppression faite à la main.
 *
 * Les noms réels des clés sont lus dans information_schema (ils peuvent différer d'une base à l'autre).
 * Aucune donnée modifiée. Rejouable ; down remet CASCADE.
 */
const COLONNES = ['id_vendeur', 'id_acheteur'];

async function cles(q) {
  const [lignes] = await q.query(
    `SELECT k.CONSTRAINT_NAME AS nom, k.COLUMN_NAME AS colonne, r.DELETE_RULE AS regle
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'commande'
        AND k.REFERENCED_TABLE_NAME = 'user' AND k.COLUMN_NAME IN (:colonnes)`,
    { replacements: { colonnes: COLONNES } }
  );
  return lignes;
}

async function changerRegle(q, regle) {
  for (const { nom, colonne, regle: actuelle } of await cles(q)) {
    if (actuelle === regle) continue;
    // Même nom de clé, en deux temps (MySQL refuse de retirer et recréer un même nom en une commande) ;
    // l'index qui porte la clé reste en place entre les deux
    await q.query(`ALTER TABLE \`commande\` DROP FOREIGN KEY \`${nom}\``);
    await q.query(`ALTER TABLE \`commande\` ADD CONSTRAINT \`${nom}\`
      FOREIGN KEY (\`${colonne}\`) REFERENCES \`user\` (\`id_user\`) ON DELETE ${regle} ON UPDATE CASCADE`);
  }
}

module.exports = {
  async up(queryInterface) {
    await changerRegle(queryInterface.sequelize, 'RESTRICT');
  },

  async down(queryInterface) {
    await changerRegle(queryInterface.sequelize, 'CASCADE');
  }
};
