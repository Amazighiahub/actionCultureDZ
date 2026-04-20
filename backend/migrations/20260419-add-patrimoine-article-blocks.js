'use strict';

/**
 * Migration : Support des articles patrimoine dans article_block
 *
 * Ajoute :
 * 1. 'patrimoine' à l'ENUM article_type (polymorphique : id_article → id_lieu)
 * 2. section_patrimoine VARCHAR(50) — quelle section du lieu (histoire, gastronomie, etc.)
 *
 * Quand article_type = 'patrimoine' :
 * - id_article = id_lieu (lieu patrimonial)
 * - section_patrimoine = 'histoire' | 'architecture' | 'traditions' | etc.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Modifier l'ENUM article_type pour ajouter 'patrimoine'
    // MySQL ne permet pas ALTER ENUM directement, on doit modifier la colonne
    await queryInterface.changeColumn('article_block', 'article_type', {
      type: Sequelize.ENUM('article', 'article_scientifique', 'patrimoine'),
      allowNull: false,
      comment: 'Type d\'article : article, article_scientifique, ou patrimoine (id_article = id_lieu)'
    });

    // 2. Ajouter section_patrimoine (nullable, utilisé seulement quand article_type = 'patrimoine')
    const [columns] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM `article_block` WHERE Field = 'section_patrimoine'"
    );

    if (columns.length === 0) {
      await queryInterface.addColumn('article_block', 'section_patrimoine', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Section du lieu patrimoine : histoire, gastronomie, traditions, architecture, artisanat_local, personnalites, infos_pratiques, referencesHistoriques'
      });

      // Index pour rechercher les blocs d'un lieu par section
      await queryInterface.addIndex('article_block', ['id_article', 'article_type', 'section_patrimoine'], {
        name: 'idx_patrimoine_section',
        where: { article_type: 'patrimoine' }
      });

      console.log('✅ article_block : article_type ENUM étendu + section_patrimoine ajouté');
    } else {
      console.log('ℹ️ section_patrimoine existe déjà');
    }
  },

  async down(queryInterface, Sequelize) {
    // Supprimer les blocs patrimoine avant de restreindre l'ENUM
    await queryInterface.sequelize.query(
      "DELETE FROM article_block WHERE article_type = 'patrimoine'"
    );

    try {
      await queryInterface.removeIndex('article_block', 'idx_patrimoine_section');
    } catch (e) { /* index peut ne pas exister */ }

    try {
      await queryInterface.removeColumn('article_block', 'section_patrimoine');
    } catch (e) { /* colonne peut ne pas exister */ }

    // Revenir à l'ENUM original
    await queryInterface.changeColumn('article_block', 'article_type', {
      type: Sequelize.ENUM('article', 'article_scientifique'),
      allowNull: false
    });

    console.log('✅ Rollback patrimoine article_block effectué');
  }
};
