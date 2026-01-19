const { setupTestDatabase, teardownTestDatabase } = require('../../Setup');

jest.setTimeout(30000);

describe('Modèle Oeuvre', () => {
  let models, sequelize;

  beforeAll(async () => {
    const result = await setupTestDatabase();
    models = result.models;
    sequelize = result.sequelize;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Nettoyer les données avec FK désactivées (plus rapide que sync force)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    try {
      const truncateIfExists = async (modelName) => {
        const model = models && models[modelName];
        if (!model || typeof model.destroy !== 'function') return;
        await model.destroy({ where: {}, truncate: true, force: true });
      };

      // Tables liées à Oeuvre
      await truncateIfExists('OeuvreIntervenant');
      await truncateIfExists('OeuvreUser');
      await truncateIfExists('OeuvreEditeur');
      await truncateIfExists('OeuvreCategorie');
      await truncateIfExists('OeuvreTag');
      await truncateIfExists('EvenementOeuvre');
      await truncateIfExists('Media');
      await truncateIfExists('CritiqueEvaluation');
      await truncateIfExists('Livre');
      await truncateIfExists('Film');
      await truncateIfExists('AlbumMusical');
      await truncateIfExists('Article');
      await truncateIfExists('ArticleScientifique');
      await truncateIfExists('Artisanat');
      await truncateIfExists('OeuvreArt');
      await truncateIfExists('Oeuvre');
      await truncateIfExists('TypeOeuvre');
      await truncateIfExists('Langue');
    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    // Insérer les données de base nécessaires (format i18n JSON)
    await models.TypeOeuvre.create({
      nom_type: { fr: 'Livre', ar: 'كتاب', en: 'Book' },
      description: { fr: 'Œuvres littéraires' }
    });
    
    await models.Langue.create({
      nom: { fr: 'Français', ar: 'الفرنسية', en: 'French' },
      code: 'fr'
    });
  });

  test('Doit créer une œuvre valide', async () => {
    const typeOeuvre = await models.TypeOeuvre.findOne();
    const langue = await models.Langue.findOne();

    const oeuvre = await models.Oeuvre.create({
      titre: { fr: 'Test Livre' },
      id_type_oeuvre: typeOeuvre.id_type_oeuvre,
      id_langue: langue.id_langue,
      annee_creation: 2024,
      description: { fr: 'Livre de test' },
      statut: 'publie'
    });

    expect(oeuvre.titre.fr).toBe('Test Livre');
    expect(oeuvre.statut).toBe('publie');
    expect(oeuvre.id_oeuvre).toBeDefined();
  });

  test('Doit valider les champs obligatoires', async () => {
    await expect(models.Oeuvre.create({
      description: { fr: 'Sans titre' }
    })).rejects.toThrow();
  });

  test('Doit avoir un statut par défaut', async () => {
    const typeOeuvre = await models.TypeOeuvre.findOne();
    const langue = await models.Langue.findOne();

    const oeuvre = await models.Oeuvre.create({
      titre: { fr: 'Test Default Status' },
      id_type_oeuvre: typeOeuvre.id_type_oeuvre,
      id_langue: langue.id_langue
    });

    expect(oeuvre.statut).toBe('brouillon');
  });
});