const request = require('supertest');
const express = require('express');
const initOeuvreRoutes = require('../../routes/oeuvreRoutes');

// Mock du serviceContainer AVANT l'import du controller
const mockOeuvreService = {
  findPublished: jest.fn(),
  findWithFullDetails: jest.fn(),
  findByType: jest.fn(),
  findByCategory: jest.fn(),
  findRecent: jest.fn(),
  findPopular: jest.fn()
};

jest.mock('../../services/serviceContainer', () => ({
  get oeuvreService() { return mockOeuvreService; },
  _initialized: true
}));

jest.setTimeout(30000);

// Helper : crée un DTO mock avec les méthodes toCardJSON / toDetailJSON
const createOeuvreDTO = (data) => ({
  ...data,
  toCardJSON: (lang = 'fr') => ({
    id_oeuvre: data.id_oeuvre,
    titre: data.titre?.[lang] || data.titre?.fr || '',
    description: data.description?.[lang] || data.description?.fr || '',
    statut: data.statut
  }),
  toDetailJSON: (lang = 'fr') => ({
    id_oeuvre: data.id_oeuvre,
    titre: data.titre?.[lang] || data.titre?.fr || '',
    description: data.description?.[lang] || data.description?.fr || '',
    statut: data.statut
  }),
  toJSON: (lang = 'fr') => ({
    id_oeuvre: data.id_oeuvre,
    titre: data.titre?.[lang] || data.titre?.fr || '',
    description: data.description?.[lang] || data.description?.fr || '',
    statut: data.statut
  })
});

describe('OeuvreController', () => {
  let app;

  beforeAll(() => {
    // Mock authMiddleware
    const authMiddleware = {
      authenticate: (req, res, next) => next(),
      optionalAuth: (req, res, next) => next(),
      requireRole: () => (req, res, next) => next()
    };

    app = express();
    app.use(express.json());
    app.use('/api/oeuvres', initOeuvreRoutes({}, authMiddleware));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/oeuvres', () => {
    test('Doit retourner une liste vide par défaut', async () => {
      mockOeuvreService.findPublished.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });

      const response = await request(app)
        .get('/api/oeuvres')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    test('Doit retourner les œuvres publiées', async () => {
      const oeuvrePubliee = createOeuvreDTO({
        id_oeuvre: 1,
        titre: { fr: 'Œuvre Publiée' },
        description: { fr: 'Desc' },
        statut: 'publie'
      });

      mockOeuvreService.findPublished.mockResolvedValue({
        data: [oeuvrePubliee],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
      });

      const response = await request(app)
        .get('/api/oeuvres')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].titre).toBe('Œuvre Publiée');
    });

    test('Doit supporter la pagination', async () => {
      const oeuvres = Array.from({ length: 5 }, (_, i) =>
        createOeuvreDTO({
          id_oeuvre: 11 + i,
          titre: { fr: `Œuvre ${11 + i}` },
          statut: 'publie'
        })
      );

      mockOeuvreService.findPublished.mockResolvedValue({
        data: oeuvres,
        pagination: { page: 2, limit: 10, total: 15, totalPages: 2 }
      });

      const response = await request(app)
        .get('/api/oeuvres?page=2&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.total).toBe(15);
    });
  });

  describe('GET /api/oeuvres/:id', () => {
    test('Doit retourner une œuvre existante', async () => {
      const oeuvre = createOeuvreDTO({
        id_oeuvre: 1,
        titre: { fr: 'Œuvre Test' },
        description: { fr: 'Description test' },
        statut: 'publie'
      });

      mockOeuvreService.findWithFullDetails.mockResolvedValue(oeuvre);

      const response = await request(app)
        .get('/api/oeuvres/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.titre).toBe('Œuvre Test');
      expect(response.body.data.description).toBe('Description test');
    });

    test('Doit retourner 404 pour une œuvre inexistante', async () => {
      const error = new Error('Œuvre non trouvée');
      error.statusCode = 404;
      mockOeuvreService.findWithFullDetails.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/oeuvres/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Œuvre non trouvée');
    });
  });
});
