const request = require('supertest');
const express = require('express');
const initOeuvreRoutes = require('../../routes/oeuvreRoutes');
const { setupTestDatabase, teardownTestDatabase } = require('../Setup');

jest.setTimeout(30000);

describe('OeuvreController', () => {
  let app, models, sequelize;

  beforeAll(async () => {
    const result = await setupTestDatabase();
    models = result.models;
    sequelize = result.sequelize;

    app = express();
    app.use(express.json());
    app.use('/api/oeuvres', initOeuvreRoutes(models, null));
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    try {
      const truncateIfExists = async (modelName) => {
        const model = models && models[modelName];
        if (!model || typeof model.destroy !== 'function') return;
        await model.destroy({ where: {}, truncate: true, force: true });
      };

      // Tables "enfants" / pivots qui référencent Oeuvre
      await truncateIfExists('OeuvreIntervenant');
      await truncateIfExists('OeuvreUser');
      await truncateIfExists('OeuvreEditeur');
      await truncateIfExists('OeuvreCategorie');
      await truncateIfExists('OeuvreTag');
      await truncateIfExists('EvenementOeuvre');
      await truncateIfExists('Media');
      await truncateIfExists('CritiqueEvaluation');

      // Sous-types éventuels
      await truncateIfExists('Livre');
      await truncateIfExists('Film');
      await truncateIfExists('AlbumMusical');
      await truncateIfExists('Article');
      await truncateIfExists('ArticleScientifique');
      await truncateIfExists('Artisanat');
      await truncateIfExists('OeuvreArt');

      // Table principale
      await truncateIfExists('Oeuvre');

      // Référentiels utilisés par ces tests
      await truncateIfExists('TypeOeuvre');
      await truncateIfExists('Langue');
    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Créer les données de base (format i18n JSON)
    await models.TypeOeuvre.create({
      nom_type: { fr: 'Livre', ar: 'كتاب', en: 'Book' },
      description: { fr: 'Œuvres littéraires' }
    });
    
    await models.Langue.create({
      nom: { fr: 'Français', ar: 'الفرنسية', en: 'French' },
      code: 'fr'
    });
  });

  describe('GET /api/oeuvres', () => {
    test('Doit retourner une liste vide par défaut', async () => {
      const response = await request(app)
        .get('/api/oeuvres')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.oeuvres).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    test('Doit retourner les œuvres publiées', async () => {
      const typeOeuvre = await models.TypeOeuvre.findOne();
      const langue = await models.Langue.findOne();

      await models.Oeuvre.create({
        titre: { fr: 'Œuvre Publiée' },
        id_type_oeuvre: typeOeuvre.id_type_oeuvre,
        id_langue: langue.id_langue,
        statut: 'publie'
      });

      await models.Oeuvre.create({
        titre: { fr: 'Œuvre Brouillon' },
        id_type_oeuvre: typeOeuvre.id_type_oeuvre,
        id_langue: langue.id_langue,
        statut: 'brouillon'
      });

      const response = await request(app)
        .get('/api/oeuvres')
        .expect(200);

      expect(response.body.data.oeuvres).toHaveLength(1);
      expect(response.body.data.oeuvres[0].titre).toBe('Œuvre Publiée'); // translateDeep extrait la valeur fr
    });

    test('Doit supporter la pagination', async () => {
      const typeOeuvre = await models.TypeOeuvre.findOne();
      const langue = await models.Langue.findOne();

      // Créer 15 œuvres
      for (let i = 1; i <= 15; i++) {
        await models.Oeuvre.create({
          titre: { fr: `Œuvre ${i}` },
          id_type_oeuvre: typeOeuvre.id_type_oeuvre,
          id_langue: langue.id_langue,
          statut: 'publie'
        });
      }

      const response = await request(app)
        .get('/api/oeuvres?page=2&limit=10')
        .expect(200);

      expect(response.body.data.oeuvres).toHaveLength(5);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.total).toBe(15);
    });
  });

  describe('GET /api/oeuvres/:id', () => {
    test('Doit retourner une œuvre existante', async () => {
      const typeOeuvre = await models.TypeOeuvre.findOne();
      const langue = await models.Langue.findOne();

      const oeuvre = await models.Oeuvre.create({
        titre: { fr: 'Œuvre Test' },
        id_type_oeuvre: typeOeuvre.id_type_oeuvre,
        id_langue: langue.id_langue,
        description: { fr: 'Description test' },
        statut: 'publie'
      });

      const response = await request(app)
        .get(`/api/oeuvres/${oeuvre.id_oeuvre}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.titre).toBe('Œuvre Test');
      expect(response.body.data.description).toBe('Description test');
    });

    test('Doit retourner 404 pour une œuvre inexistante', async () => {
      const response = await request(app)
        .get('/api/oeuvres/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Œuvre non trouvée');
    });
  });
});