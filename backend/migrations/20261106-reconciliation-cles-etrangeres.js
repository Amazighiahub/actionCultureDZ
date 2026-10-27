'use strict';

/**
 * Migration : une seule clé étrangère, avec la bonne règle, sur les colonnes sensibles.
 *
 * - Valeurs de référence (type d'œuvre, langue, type d'événement, type de membre, matière,
 *   technique, commune) : suppression INTERDITE tant qu'elles sont utilisées. Avant, supprimer
 *   un type effaçait en cascade toutes les œuvres, comptes ou événements de ce type.
 * - Lieu d'un événement ou d'un programme, auteur ou validateur d'une œuvre : mis à vide (SET NULL).
 * - Doublons de clés (restes d'anciennes synchronisations) aux règles contradictoires : retirés.
 *
 * Regarde d'abord l'état réel (information_schema) : ne fait rien si la colonne a déjà une seule
 * clé avec la bonne règle ; s'arrête (sans rien changer) sur une colonne qui a des lignes
 * orphelines, ou une colonne obligatoire pour une règle SET NULL. Rejouable sans risque.
 */
const CIBLES = [
  ['oeuvre', 'id_type_oeuvre', 'type_oeuvre', 'id_type_oeuvre', 'RESTRICT'],
  ['oeuvre', 'id_langue', 'langue', 'id_langue', 'RESTRICT'],
  ['oeuvre', 'saisi_par', 'user', 'id_user', 'SET NULL'],
  ['oeuvre', 'validateur_id', 'user', 'id_user', 'SET NULL'],
  ['user', 'id_type_user', 'type_user', 'id_type_user', 'RESTRICT'],
  ['evenement', 'id_type_evenement', 'type_evenement', 'id_type_evenement', 'RESTRICT'],
  ['evenement', 'id_user', 'user', 'id_user', 'RESTRICT'],
  ['evenement', 'id_lieu', 'lieu', 'id_lieu', 'SET NULL'],
  ['programme', 'id_lieu', 'lieu', 'id_lieu', 'SET NULL'],
  ['artisanat', 'id_materiau', 'materiau', 'id_materiau', 'RESTRICT'],
  ['artisanat', 'id_technique', 'technique', 'id_technique', 'RESTRICT'],
  ['lieu', 'communeId', 'communes', 'id_commune', 'RESTRICT'],
  ['services', 'id_lieu', 'lieu', 'id_lieu', 'CASCADE']
];

// Pour InnoDB, RESTRICT et NO ACTION ont le même effet
const memeRegle = (actuelle, voulue) => actuelle === voulue || (voulue === 'RESTRICT' && actuelle === 'NO ACTION');

module.exports = {
  async up(queryInterface) {
    const q = (sql, replacements) => queryInterface.sequelize.query(sql, { replacements });

    for (const [table, colonne, refTable, refColonne, regle] of CIBLES) {
      const [colonnes] = await q(
        'SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, colonne]
      );
      const [tablesRef] = await q(
        'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [refTable]
      );
      if (!colonnes.length || !tablesRef.length) continue;

      const [cles] = await q(
        `SELECT k.CONSTRAINT_NAME AS nom, r.DELETE_RULE AS regle
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN information_schema.REFERENTIAL_CONSTRAINTS r
           ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
         WHERE k.CONSTRAINT_SCHEMA = DATABASE() AND k.TABLE_NAME = ? AND k.COLUMN_NAME = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
        [table, colonne]
      );
      if (cles.length === 1 && memeRegle(cles[0].regle, regle)) continue;

      if (regle === 'SET NULL' && colonnes[0].nullable !== 'YES') {
        console.warn(`${table}.${colonne} est obligatoire : règle SET NULL impossible, colonne laissée telle quelle`);
        continue;
      }
      const [[{ orphelins }]] = await q(
        `SELECT COUNT(*) AS orphelins FROM \`${table}\` t LEFT JOIN \`${refTable}\` r ON r.\`${refColonne}\` = t.\`${colonne}\`
         WHERE t.\`${colonne}\` IS NOT NULL AND r.\`${refColonne}\` IS NULL`
      );
      if (Number(orphelins) > 0) {
        console.warn(`${table}.${colonne} : ${orphelins} ligne(s) sans ${refTable} correspondant, clé laissée telle quelle`);
        continue;
      }

      const retraits = cles.map(c => `DROP FOREIGN KEY \`${c.nom}\``);
      // Un même nom ne peut pas être retiré et recréé dans la même instruction
      const nom = cles.some(c => c.nom === `fkr_${table}_${colonne}`) ? `fkr2_${table}_${colonne}` : `fkr_${table}_${colonne}`;
      await q(`ALTER TABLE \`${table}\` ${[...retraits,
        `ADD CONSTRAINT \`${nom}\` FOREIGN KEY (\`${colonne}\`) REFERENCES \`${refTable}\` (\`${refColonne}\`) ON DELETE ${regle} ON UPDATE CASCADE`
      ].join(', ')}`);
    }
  },

  // Les anciennes clés (doublons, cascades) ne sont pas recréées
  async down() {}
};
