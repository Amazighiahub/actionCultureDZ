'use strict';

/**
 * Migration : règles de suppression des clés étrangères (audit V7 base de données : V6-2, V6-5, V6-6, V6-15,
 * N3, N10-a, N15, N35). Aucune donnée n'est supprimée par la migration elle-même.
 *
 * - Notifications : un événement, une activité ou une œuvre supprimés n'empêchent plus la suppression
 *   (NO ACTION → SET NULL : la notification reste, son lien disparaît). L'admin ne pouvait supprimer
 *   aucun événement qui avait eu des participants (erreur 500).
 * - Genres : supprimer un genre effaçait les fiches album, livre et film (CASCADE) → SET NULL ;
 *   albummusical.id_genre devient facultatif.
 * - Données de référence : supprimer une wilaya, une daïra, une commune ou un type d'organisation effaçait
 *   en cascade communes, localités, lieux et organisations → RESTRICT (refusé tant qu'elles servent) ;
 *   une localité supprimée laisse le lieu (SET NULL).
 * - Organisations : membres retirés avec l'organisation (CASCADE, comme le modèle) ; superviseur et
 *   validateur d'inscription supprimés → SET NULL.
 * - genre_categorie, type_oeuvre_genre : clés étrangères ajoutées (les liens suivent le genre, la catégorie
 *   ou le type supprimés) et index inverse sur id_categorie. S'il existe des liens orphelins, la clé
 *   n'est PAS ajoutée (rien n'est effacé) et un avertissement est écrit.
 * - qr_scans.ip_address devient facultatif : la purge RGPD (mise à NULL après 12 mois) échouait.
 *
 * Les contraintes sont retrouvées par colonne et table référencée (leurs noms diffèrent selon les bases).
 * Rejouable.
 */

const REGLES = [
  // table, colonne, table référencée, champ référencé, règle à la montée, règle à la descente
  ['notification', 'id_evenement', 'evenement', 'id_evenement', 'SET NULL', 'NO ACTION'],
  ['notification', 'id_programme', 'programme', 'id_programme', 'SET NULL', 'NO ACTION'],
  ['notification', 'id_oeuvre', 'oeuvre', 'id_oeuvre', 'SET NULL', 'NO ACTION'],
  ['albummusical', 'id_genre', 'genre', 'id_genre', 'SET NULL', 'CASCADE'],
  ['livre', 'id_genre', 'genre', 'id_genre', 'SET NULL', 'CASCADE'],
  ['film', 'id_genre', 'genre', 'id_genre', 'SET NULL', 'CASCADE'],
  ['organisation', 'id_type_organisation', 'typeorganisation', 'id_type_organisation', 'RESTRICT', 'CASCADE'],
  ['dairas', 'wilayaId', 'wilayas', 'id_wilaya', 'RESTRICT', 'CASCADE'],
  ['communes', 'dairaId', 'dairas', 'id_daira', 'RESTRICT', 'CASCADE'],
  ['localite', 'id_commune', 'communes', 'id_commune', 'RESTRICT', 'CASCADE'],
  ['lieu', 'localiteId', 'localite', 'id_localite', 'SET NULL', 'CASCADE'],
  ['userorganisation', 'id_organisation', 'organisation', 'id_organisation', 'CASCADE', 'NO ACTION'],
  ['userorganisation', 'id_superviseur', 'user', 'id_user', 'SET NULL', 'NO ACTION'],
  ['evenementusers', 'valide_par', 'user', 'id_user', 'SET NULL', 'NO ACTION'],
];

// Liens sans clé étrangère : [table, colonne, table référencée, champ référencé, nom de la contrainte]
const NOUVELLES = [
  ['genre_categorie', 'id_genre', 'genre', 'id_genre', 'fk_genre_categorie_genre'],
  ['genre_categorie', 'id_categorie', 'categorie', 'id_categorie', 'fk_genre_categorie_categorie'],
  ['type_oeuvre_genre', 'id_type_oeuvre', 'type_oeuvre', 'id_type_oeuvre', 'fk_type_oeuvre_genre_type'],
  ['type_oeuvre_genre', 'id_genre', 'genre', 'id_genre', 'fk_type_oeuvre_genre_genre'],
];

async function contraintes(q, table, colonne, reference) {
  const [lignes] = await q.query(`SELECT k.CONSTRAINT_NAME AS nom, r.DELETE_RULE AS regle, k.REFERENCED_COLUMN_NAME AS champ
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ? AND k.COLUMN_NAME = ? AND k.REFERENCED_TABLE_NAME = ?`,
  { replacements: [table, colonne, reference] });
  return lignes;
}

async function colonneExiste(queryInterface, table, colonne) {
  const desc = await queryInterface.describeTable(table).catch(() => null);
  return Boolean(desc && desc[colonne]);
}

/** Remplace la clé de (table, colonne) par une seule clé avec la règle voulue ; ne crée rien si elle n'existait pas. */
async function regler(queryInterface, [table, colonne, reference, champDefaut], regle) {
  const q = queryInterface.sequelize;
  if (!(await colonneExiste(queryInterface, table, colonne))) return;
  const actuelles = await contraintes(q, table, colonne, reference);
  if (!actuelles.length) return;
  if (actuelles.length === 1 && actuelles[0].regle === regle) return;
  const champ = actuelles[0].champ || champDefaut;
  for (const { nom } of actuelles) await q.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${nom}\``);
  await q.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`fk_${table}_${colonne}\` FOREIGN KEY (\`${colonne}\`)
    REFERENCES \`${reference}\` (\`${champ}\`) ON DELETE ${regle} ON UPDATE CASCADE`);
}

async function rendreFacultative(q, table, colonne, definition) {
  const [[col]] = await q.query(
    'SELECT IS_NULLABLE AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    { replacements: [table, colonne] });
  if (col && col.n === 'NO') await q.query(`ALTER TABLE \`${table}\` MODIFY \`${colonne}\` ${definition} NULL`);
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;

    // Colonnes qui doivent accepter NULL avant de passer en SET NULL
    await rendreFacultative(q, 'albummusical', 'id_genre', 'INT');
    if (await colonneExiste(queryInterface, 'qr_scans', 'ip_address')) await rendreFacultative(q, 'qr_scans', 'ip_address', 'VARCHAR(45)');

    for (const r of REGLES) await regler(queryInterface, r, r[4]);

    // Index inverse de genre_categorie (la clé primaire commence par id_genre)
    const [index] = await q.query("SHOW INDEX FROM genre_categorie WHERE Column_name = 'id_categorie' AND Seq_in_index = 1");
    if (!index.length) await q.query('ALTER TABLE genre_categorie ADD INDEX idx_genre_categorie_categorie (id_categorie)');

    for (const [table, colonne, reference, champ, nom] of NOUVELLES) {
      if ((await contraintes(q, table, colonne, reference)).length) continue;
      const [[orphelins]] = await q.query(
        `SELECT COUNT(*) AS n FROM \`${table}\` t LEFT JOIN \`${reference}\` r ON r.\`${champ}\` = t.\`${colonne}\` WHERE r.\`${champ}\` IS NULL`);
      if (Number(orphelins.n) > 0) {
        console.warn(`[20261117] ${table}.${colonne} : ${orphelins.n} lien(s) orphelin(s), clé étrangère non ajoutée (rien n'est supprimé)`);
        continue;
      }
      await q.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${nom}\` FOREIGN KEY (\`${colonne}\`)
        REFERENCES \`${reference}\` (\`${champ}\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    for (const [table, colonne, reference, , nom] of NOUVELLES) {
      if ((await contraintes(q, table, colonne, reference)).some((c) => c.nom === nom)) {
        await q.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${nom}\``);
      }
    }
    for (const r of REGLES) await regler(queryInterface, r, r[5]);
    // id_genre et ip_address restent facultatifs : les rendre obligatoires échouerait s'il existe des NULL.
  }
};
