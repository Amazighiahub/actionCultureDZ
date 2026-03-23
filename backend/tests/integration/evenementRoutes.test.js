/**
 * Tests d'intégration — Routes Événement (supertest)
 * Couvre les routes publiques et authentifiées utilisées par EventDetailsPage
 */

const request = require('supertest');
const express = require('express');
const initEvenementRoutes = require('../../routes/evenementRoutes');

// Mock du serviceContainer
const mockEvenementService = {
  findPublished: jest.fn(),
  findUpcoming: jest.fn(),
  findWithFullDetails: jest.fn(),
  findByWilaya: jest.fn(),
  search: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  getPublicParticipants: jest.fn(),
  getParticipants: jest.fn(),
  getMyRegistration: jest.fn(),
  getMesOeuvres: jest.fn(),
  registerParticipant: jest.fn(),
  unregisterParticipant: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  get evenementService() { return mockEvenementService; },
  _initialized: true,
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCK'),
  toString: jest.fn().mockResolvedValue('<svg>mock</svg>'),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock')),
}));

jest.setTimeout(30000);

// Helper DTO mock
const createEventDTO = (data) => ({
  ...data,
  toCardJSON: (lang = 'fr') => ({
    id_evenement: data.id_evenement,
    nom_evenement: data.nom_evenement?.[lang] || data.nom_evenement || '',
    statut: data.statut,
  }),
  toDetailJSON: (lang = 'fr') => ({
    id_evenement: data.id_evenement,
    nom_evenement: data.nom_evenement?.[lang] || data.nom_evenement || '',
    description: data.description?.[lang] || data.description || '',
    statut: data.statut,
    Programmes: data.Programmes || [],
    Medias: data.Medias || [],
  }),
  toJSON: (lang = 'fr') => ({
    id_evenement: data.id_evenement,
    Medias: data.Medias || [],
  }),
});

describe('Evenement Routes Integration', () => {
  let app;

  beforeAll(() => {
    const authMiddleware = {
      authenticate: (req, res, next) => {
        req.user = { id_user: 1, id_type_user: 16 };
        next();
      },
      optionalAuth: (req, res, next) => next(),
      requireRole: () => (req, res, next) => next(),
    };

    app = express();
    app.use(express.json());
    // Inject req.lang and req.t
    app.use((req, res, next) => {
      req.lang = req.headers['accept-language'] || 'fr';
      req.t = (key) => `translated:${key}`;
      next();
    });
    app.use('/api/evenements', initEvenementRoutes({}, authMiddleware));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // PUBLIC ROUTES
  // ========================================================================

  describe('GET /api/evenements', () => {
    it('retourne la liste paginée des événements', async () => {
      const event = createEventDTO({ id_evenement: 1, nom_evenement: { fr: 'Festival' }, statut: 'publie' });
      mockEvenementService.findPublished.mockResolvedValue({
        data: [event],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      });

      const res = await request(app).get('/api/evenements').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('supporte upcoming=true', async () => {
      mockEvenementService.findUpcoming.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });

      await request(app).get('/api/evenements?upcoming=true').expect(200);

      expect(mockEvenementService.findUpcoming).toHaveBeenCalled();
      expect(mockEvenementService.findPublished).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/evenements/:id', () => {
    it('retourne le détail d\'un événement', async () => {
      const event = createEventDTO({
        id_evenement: 9,
        nom_evenement: { fr: 'Exposition' },
        description: { fr: 'Description test' },
        statut: 'publie',
        Programmes: [],
        Medias: [],
      });
      mockEvenementService.findWithFullDetails.mockResolvedValue(event);

      const res = await request(app).get('/api/evenements/9').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id_evenement).toBe(9);
    });

    it('retourne 404 pour un événement inexistant', async () => {
      const error = new Error('Not found');
      error.statusCode = 404;
      mockEvenementService.findWithFullDetails.mockRejectedValue(error);

      await request(app).get('/api/evenements/99999').expect(404);
    });

    it('valide que l\'ID est numérique', async () => {
      await request(app).get('/api/evenements/abc').expect(400);
    });
  });

  describe('GET /api/evenements/:id/medias', () => {
    it('retourne les médias de l\'événement', async () => {
      const event = createEventDTO({
        id_evenement: 9,
        Medias: [{ id_media: 1, type: 'image', url: '/img.jpg' }],
      });
      mockEvenementService.findWithFullDetails.mockResolvedValue(event);

      const res = await request(app).get('/api/evenements/9/medias').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/evenements/:id/participants/public', () => {
    it('retourne les participants publics', async () => {
      mockEvenementService.getPublicParticipants.mockResolvedValue([
        { id_user: 1, nom: 'Benali', prenom: 'Karim' },
      ]);

      const res = await request(app).get('/api/evenements/9/participants/public').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/evenements/:id/qrcode', () => {
    it('retourne un QR code dataURL par défaut', async () => {
      mockEvenementService.findById.mockResolvedValue({ id_evenement: 9 });

      const res = await request(app).get('/api/evenements/9/qrcode').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.qr_data_url).toContain('data:image');
      expect(res.body.data.event_id).toBe(9);
    });

    it('retourne un SVG si format=svg', async () => {
      mockEvenementService.findById.mockResolvedValue({ id_evenement: 9 });

      const res = await request(app).get('/api/evenements/9/qrcode?format=svg');

      expect(res.headers['content-type']).toContain('svg');
    });

    it('retourne 404 si événement inexistant', async () => {
      const error = new Error('Not found');
      error.statusCode = 404;
      mockEvenementService.findById.mockRejectedValue(error);

      await request(app).get('/api/evenements/99999/qrcode').expect(404);
    });
  });

  describe('GET /api/evenements/:id/share-data', () => {
    it('retourne les données de partage', async () => {
      const event = createEventDTO({
        id_evenement: 9,
        nom_evenement: { fr: 'Exposition' },
        statut: 'publie',
      });
      mockEvenementService.findWithFullDetails.mockResolvedValue(event);

      const res = await request(app).get('/api/evenements/9/share-data').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('social_links');
      expect(res.body.data).toHaveProperty('calendar_links');
    });
  });

  // ========================================================================
  // AUTHENTICATED ROUTES
  // ========================================================================

  describe('GET /api/evenements/:id/mon-inscription', () => {
    it('retourne le statut d\'inscription', async () => {
      mockEvenementService.getMyRegistration.mockResolvedValue({
        isRegistered: true,
        statut: 'confirme',
      });

      const res = await request(app).get('/api/evenements/9/mon-inscription').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isRegistered).toBe(true);
    });
  });

  describe('POST /api/evenements/:id/register', () => {
    it('inscrit l\'utilisateur à l\'événement', async () => {
      mockEvenementService.registerParticipant.mockResolvedValue({ success: true });

      const res = await request(app).post('/api/evenements/9/register').send({}).expect(200);

      expect(res.body.success).toBe(true);
      expect(mockEvenementService.registerParticipant).toHaveBeenCalledWith(9, 1);
    });
  });

  describe('DELETE /api/evenements/:id/register', () => {
    it('désinscrit l\'utilisateur', async () => {
      mockEvenementService.unregisterParticipant.mockResolvedValue({ success: true });

      const res = await request(app).delete('/api/evenements/9/register').expect(200);

      expect(res.body.success).toBe(true);
      expect(mockEvenementService.unregisterParticipant).toHaveBeenCalledWith(9, 1);
    });
  });

  describe('GET /api/evenements/:id/mes-oeuvres', () => {
    it('retourne les oeuvres de l\'utilisateur pour cet événement', async () => {
      mockEvenementService.getMesOeuvres.mockResolvedValue([
        { id_oeuvre: 1, titre: 'Mon oeuvre' },
      ]);

      const res = await request(app).get('/api/evenements/9/mes-oeuvres').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
