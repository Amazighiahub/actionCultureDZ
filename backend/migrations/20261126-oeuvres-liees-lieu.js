// Attention : la descente supprime les liens œuvre-lieu de la section oeuvres_liees. Seule la sauvegarde d'avant déploiement les conserve.
'use strict';

/**
 * Migration : section « oeuvres_liees » de lieu_oeuvre. Le propriétaire d'une œuvre peut la relier
 * à un lieu (un livre sur la Casbah, un tapis fabriqué dans cet atelier).
 * Les liens existants ne changent pas. Rejouable.
 */
const AVANT = ['histoire', 'architecture', 'traditions', 'gastronomie', 'artisanat_local', 'personnalites', 'infos_pratiques', 'referencesHistoriques'];
const enumSql = (valeurs) => `ENUM(${valeurs.map(v => `'${v}'`).join(', ')})`;

async function typeColonne(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lieu_oeuvre' AND COLUMN_NAME = 'section_patrimoine'`);
  return lignes[0]?.t || null;
}

module.exports = {
  async up(queryInterface) {
    const type = await typeColonne(queryInterface);
    if (!type || type.includes('oeuvres_liees')) return;
    await queryInterface.sequelize.query(
      `ALTER TABLE lieu_oeuvre MODIFY section_patrimoine ${enumSql([...AVANT, 'oeuvres_liees'])} NOT NULL`
    );
  },

  async down(queryInterface) {
    const type = await typeColonne(queryInterface);
    if (!type || !type.includes('oeuvres_liees')) return;
    await queryInterface.sequelize.query("DELETE FROM lieu_oeuvre WHERE section_patrimoine = 'oeuvres_liees'");
    await queryInterface.sequelize.query(`ALTER TABLE lieu_oeuvre MODIFY section_patrimoine ${enumSql(AVANT)} NOT NULL`);
  }
};
