// Attention : la descente supprime les colonnes ci-dessous, donc la variante, l'accord de partage et la relecture
// « données ouvertes » des œuvres en tamazight.
'use strict';

/**
 * Section Tamazight (2026-11-20) : champs d'une œuvre pour les textes et voix en tamazight partagés librement.
 * - variante_amazighe : kabyle, chaoui, mozabite… (constants/tamazight.js) ;
 * - ecrit_par_humain : l'auteur déclare un texte écrit par une personne (pas une traduction automatique) ;
 * - partage_ouvert, partage_ouvert_le, licence : accord de l'auteur pour le partage sous CC BY-SA 4.0 ;
 * - donnees_ouvertes_valide, _par, _le : relecture d'un modérateur avant la page « Données ouvertes ».
 * Colonnes ajoutées vides ou à « non » : aucune donnée existante n'est modifiée. Rejouable.
 */
const TABLE = 'oeuvre';
const INDEX = 'idx_oeuvre_donnees_ouvertes';

const colonnes = (Sequelize) => ({
  variante_amazighe: { type: Sequelize.STRING(20), allowNull: true },
  ecrit_par_humain: { type: Sequelize.BOOLEAN, allowNull: true },
  partage_ouvert: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  partage_ouvert_le: { type: Sequelize.DATE, allowNull: true },
  licence: { type: Sequelize.STRING(20), allowNull: true },
  donnees_ouvertes_valide: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
  donnees_ouvertes_par: { type: Sequelize.INTEGER, allowNull: true },
  donnees_ouvertes_le: { type: Sequelize.DATE, allowNull: true }
});

async function existantes(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${TABLE}'`);
  return new Set(lignes.map((l) => l.COLUMN_NAME));
}

async function aIndex(queryInterface) {
  const [lignes] = await queryInterface.sequelize.query(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${TABLE}' AND INDEX_NAME = '${INDEX}'`);
  return lignes.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const deja = await existantes(queryInterface);
    for (const [nom, def] of Object.entries(colonnes(Sequelize))) {
      if (!deja.has(nom)) await queryInterface.addColumn(TABLE, nom, def);
    }
    // Page « Données ouvertes » et liste de la section : textes partagés, relus, par langue
    if (!(await aIndex(queryInterface))) {
      await queryInterface.addIndex(TABLE, ['partage_ouvert', 'donnees_ouvertes_valide', 'id_langue'], { name: INDEX });
    }
  },

  async down(queryInterface, Sequelize) {
    if (await aIndex(queryInterface)) await queryInterface.removeIndex(TABLE, INDEX);
    const deja = await existantes(queryInterface);
    for (const nom of Object.keys(colonnes(Sequelize))) {
      if (deja.has(nom)) await queryInterface.removeColumn(TABLE, nom);
    }
  }
};
