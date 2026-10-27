'use strict';

/**
 * Migration : retire la colonne « OrganisationIdOrganisation » de userorganisation.
 * Elle venait d'une association sans otherKey (models/users/user.js) : toujours vide, elle faisait
 * croire qu'un membre n'avait aucune organisation. Seulement si la colonne existe et ne contient
 * aucune valeur ; ses clés étrangères et index sont retirés d'abord.
 */
module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    const [colonnes] = await q.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userorganisation' AND COLUMN_NAME = 'OrganisationIdOrganisation'"
    );
    if (!colonnes.length) return;
    const [[{ remplies }]] = await q.query('SELECT COUNT(OrganisationIdOrganisation) AS remplies FROM userorganisation');
    if (Number(remplies) > 0) {
      console.warn(`userorganisation.OrganisationIdOrganisation contient ${remplies} valeur(s) : colonne gardée, à vérifier`);
      return;
    }
    const [cles] = await q.query(
      "SELECT DISTINCT CONSTRAINT_NAME AS nom FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userorganisation' AND COLUMN_NAME = 'OrganisationIdOrganisation' AND REFERENCED_TABLE_NAME IS NOT NULL"
    );
    for (const { nom } of cles) await q.query(`ALTER TABLE userorganisation DROP FOREIGN KEY \`${nom}\``);
    const [index] = await q.query(
      "SELECT DISTINCT INDEX_NAME AS nom FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userorganisation' AND COLUMN_NAME = 'OrganisationIdOrganisation'"
    );
    for (const { nom } of index) await q.query(`ALTER TABLE userorganisation DROP INDEX \`${nom}\``);
    await q.query('ALTER TABLE userorganisation DROP COLUMN OrganisationIdOrganisation');
  },

  // Rien à recréer : la colonne était inutilisée
  async down() {}
};
