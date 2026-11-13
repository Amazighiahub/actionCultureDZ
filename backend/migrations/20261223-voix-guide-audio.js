// Attention : la descente supprime les colonnes parler et accord_voix_le, donc les variantes saisies et les dates d'accord. Seule la sauvegarde d'avant déploiement les conserve.
'use strict';

/**
 * Migration : voix enregistrées dans le guide audio d'un lieu (lieu_medias).
 * parler         : variante parlée, texte libre (« chaoui de Ghoufi », « kabyle des Ath Yenni »)
 * accord_voix_le : date où le contributeur a confirmé avoir l'accord de la personne enregistrée
 * Le nom de la personne (facultatif) va dans la colonne credit existante.
 * Colonnes facultatives ajoutées : aucune donnée existante n'est modifiée. Rejouable.
 */
async function colonnes(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lieu_medias'`);
  return new Set(lignes.map(l => l.c));
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const existantes = await colonnes(queryInterface);
    if (!existantes.size) return; // table absente (base vide)
    if (!existantes.has('parler')) {
      await queryInterface.addColumn('lieu_medias', 'parler', { type: Sequelize.STRING(100), allowNull: true });
    }
    if (!existantes.has('accord_voix_le')) {
      await queryInterface.addColumn('lieu_medias', 'accord_voix_le', { type: Sequelize.DATE, allowNull: true });
    }
  },

  async down(queryInterface) {
    const existantes = await colonnes(queryInterface);
    if (existantes.has('accord_voix_le')) await queryInterface.removeColumn('lieu_medias', 'accord_voix_le');
    if (existantes.has('parler')) await queryInterface.removeColumn('lieu_medias', 'parler');
  }
};
