/**
 * Tests unitaires — ProgrammeController
 * Couvre: listing par événement, détail, CRUD, export, réorganisation
 */

const mockProgrammeService = {
  getProgrammesByEvenement: jest.fn(),
  getProgrammeById: jest.fn(),
  getExportData: jest.fn(),
  formatProgrammesToCSV: jest.fn(),
  createProgramme: jest.fn(),
  updateProgramme: jest.fn(),
  deleteProgramme: jest.fn(),
  updateStatut: jest.fn(),
  duplicateProgramme: jest.fn(),
  reorderProgrammes: jest.fn(),
  getProgrammeTranslations: jest.fn(),
  updateProgrammeTranslation: jest.fn(),
};

const mockNotificationService = {
  notifierModificationProgramme: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  programmeService: mockProgrammeService,
  notificationService: mockNotificationService,
}));

const controller = require('../../controllers/programmeController');

describe('ProgrammeController', () => {
  let req, res;

  const mockProgramme = {
    id_programme: 1,
    titre: { fr: 'Cérémonie', ar: 'حفل' },
    date_programme: '2026-03-15',
    heure_debut: '09:00:00',
    heure_fin: '10:30:00',
    type_activite: 'ceremonie',
    statut: 'planifie',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    req = {
      query: {},
      params: {},
      body: {},
      lang: 'fr',
      user: { id_user: 1, isAdmin: false },
      t: jest.fn((key) => `translated:${key}`),
    };
  });

  // ========================================================================
  // CONSULTATION
  // ========================================================================

  describe('getProgrammesByEvenement', () => {
    it('doit retourner les programmes avec byDay', async () => {
      mockProgrammeService.getProgrammesByEvenement.mockResolvedValue({
        programmes: [mockProgramme],
        byDay: { '2026-03-15': [mockProgramme] },
      });
      req.params = { evenementId: '9' };

      await controller.getProgrammesByEvenement(req, res);

      expect(mockProgrammeService.getProgrammesByEvenement).toHaveBeenCalledWith('9', { date: undefined, type_activite: undefined });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            programmes: expect.any(Array),
            byDay: expect.any(Object),
            total: 1,
          }),
        })
      );
    });

    it('doit supporter les filtres date et type_activite', async () => {
      mockProgrammeService.getProgrammesByEvenement.mockResolvedValue({
        programmes: [],
        byDay: {},
      });
      req.params = { evenementId: '9' };
      req.query = { date: '2026-03-15', type_activite: 'atelier' };

      await controller.getProgrammesByEvenement(req, res);

      expect(mockProgrammeService.getProgrammesByEvenement).toHaveBeenCalledWith('9', { date: '2026-03-15', type_activite: 'atelier' });
    });

    it('doit gérer les erreurs', async () => {
      const error = new Error('DB error');
      error.statusCode = 500;
      mockProgrammeService.getProgrammesByEvenement.mockRejectedValue(error);
      req.params = { evenementId: '999' };

      await controller.getProgrammesByEvenement(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProgrammeById', () => {
    it('doit retourner un programme par ID', async () => {
      mockProgrammeService.getProgrammeById.mockResolvedValue(mockProgramme);
      req.params = { id: '1' };

      await controller.getProgrammeById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si non trouvé', async () => {
      mockProgrammeService.getProgrammeById.mockResolvedValue(null);
      req.params = { id: '999' };

      await controller.getProgrammeById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('exportProgramme', () => {
    it('doit exporter en JSON par défaut', async () => {
      mockProgrammeService.getExportData.mockResolvedValue([{ ...mockProgramme, Evenement: { id: 9 } }]);
      req.params = { evenementId: '9' };

      await controller.exportProgramme(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ total: 1 }),
        })
      );
    });

    it('doit exporter en CSV', async () => {
      mockProgrammeService.getExportData.mockResolvedValue([mockProgramme]);
      mockProgrammeService.formatProgrammesToCSV.mockReturnValue('titre;heure\nCérémonie;09:00');
      req.params = { evenementId: '9' };
      req.query = { format: 'csv' };

      await controller.exportProgramme(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });

    it('doit retourner 404 si aucun programme', async () => {
      mockProgrammeService.getExportData.mockResolvedValue([]);
      req.params = { evenementId: '999' };

      await controller.exportProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ========================================================================
  // CRUD
  // ========================================================================

  describe('createProgramme', () => {
    it('doit créer un programme avec succès', async () => {
      mockProgrammeService.createProgramme.mockResolvedValue({ programme: mockProgramme });
      req.params = { evenementId: '9' };
      req.body = { titre: 'Nouveau', heure_debut: '10:00', heure_fin: '11:00' };

      await controller.createProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('doit retourner 404 si événement non trouvé', async () => {
      mockProgrammeService.createProgramme.mockResolvedValue({ error: 'evenementNotFound' });
      req.params = { evenementId: '999' };

      await controller.createProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('doit retourner 403 si non autorisé', async () => {
      mockProgrammeService.createProgramme.mockResolvedValue({ error: 'forbidden' });
      req.params = { evenementId: '9' };

      await controller.createProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateProgramme', () => {
    it('doit mettre à jour un programme', async () => {
      mockProgrammeService.updateProgramme.mockResolvedValue({ programme: mockProgramme });
      req.params = { id: '1' };
      req.body = { titre: 'Modifié' };

      await controller.updateProgramme(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si non trouvé', async () => {
      mockProgrammeService.updateProgramme.mockResolvedValue({ error: 'notFound' });
      req.params = { id: '999' };

      await controller.updateProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('doit retourner 403 si non autorisé', async () => {
      mockProgrammeService.updateProgramme.mockResolvedValue({ error: 'forbidden' });
      req.params = { id: '1' };

      await controller.updateProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteProgramme', () => {
    it('doit supprimer un programme', async () => {
      mockProgrammeService.deleteProgramme.mockResolvedValue({ success: true });
      req.params = { id: '1' };

      await controller.deleteProgramme(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si non trouvé', async () => {
      mockProgrammeService.deleteProgramme.mockResolvedValue({ error: 'notFound' });
      req.params = { id: '999' };

      await controller.deleteProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateStatut', () => {
    it('doit mettre à jour le statut', async () => {
      mockProgrammeService.updateStatut.mockResolvedValue({ programme: { ...mockProgramme, statut: 'en_cours' } });
      req.params = { id: '1' };
      req.body = { statut: 'en_cours' };

      await controller.updateStatut(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit notifier si annulation', async () => {
      mockProgrammeService.updateStatut.mockResolvedValue({
        programme: { ...mockProgramme, statut: 'annule' },
        shouldNotify: true,
      });
      req.params = { id: '1' };
      req.body = { statut: 'annule' };

      await controller.updateStatut(req, res);

      expect(mockNotificationService.notifierModificationProgramme).toHaveBeenCalledWith('1', 'annule');
    });
  });

  describe('duplicateProgramme', () => {
    it('doit dupliquer un programme', async () => {
      mockProgrammeService.duplicateProgramme.mockResolvedValue({ programme: { ...mockProgramme, id_programme: 2 } });
      req.params = { id: '1' };

      await controller.duplicateProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('doit retourner 404 si non trouvé', async () => {
      mockProgrammeService.duplicateProgramme.mockResolvedValue({ error: 'notFound' });
      req.params = { id: '999' };

      await controller.duplicateProgramme(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('reorderProgrammes', () => {
    it('doit réorganiser les programmes', async () => {
      mockProgrammeService.reorderProgrammes.mockResolvedValue({ success: true });
      req.params = { evenementId: '9' };
      req.body = { programmes: [{ id: 1, ordre: 2 }, { id: 2, ordre: 1 }] };

      await controller.reorderProgrammes(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si événement non trouvé', async () => {
      mockProgrammeService.reorderProgrammes.mockResolvedValue({ error: 'evenementNotFound' });
      req.params = { evenementId: '999' };
      req.body = { programmes: [] };

      await controller.reorderProgrammes(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ========================================================================
  // TRADUCTIONS
  // ========================================================================

  describe('getProgrammeTranslations', () => {
    it('doit retourner les traductions', async () => {
      mockProgrammeService.getProgrammeTranslations.mockResolvedValue({ fr: { titre: 'Cérémonie' }, ar: { titre: 'حفل' } });
      req.params = { id: '1' };

      await controller.getProgrammeTranslations(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si non trouvé', async () => {
      mockProgrammeService.getProgrammeTranslations.mockResolvedValue(null);
      req.params = { id: '999' };

      await controller.getProgrammeTranslations(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateProgrammeTranslation', () => {
    it('doit mettre à jour une traduction', async () => {
      mockProgrammeService.updateProgrammeTranslation.mockResolvedValue({ success: true });
      req.params = { id: '1', lang: 'ar' };
      req.body = { titre: 'حفل الافتتاح' };

      await controller.updateProgrammeTranslation(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('doit retourner 404 si non trouvé', async () => {
      mockProgrammeService.updateProgrammeTranslation.mockResolvedValue(null);
      req.params = { id: '999', lang: 'ar' };

      await controller.updateProgrammeTranslation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('doit retourner 400 si body vide', async () => {
      mockProgrammeService.updateProgrammeTranslation.mockResolvedValue({ empty: true });
      req.params = { id: '1', lang: 'ar' };
      req.body = {};

      await controller.updateProgrammeTranslation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
