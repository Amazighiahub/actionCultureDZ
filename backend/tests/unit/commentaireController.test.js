/**
 * Unit tests for CommentaireController
 */

const mockCommentaireService = {
  getCommentairesOeuvre: jest.fn(),
  getCommentairesEvenement: jest.fn(),
  findOeuvre: jest.fn(),
  findEvenement: jest.fn(),
  createCommentaire: jest.fn(),
  updateCommentaire: jest.fn(),
  deleteCommentaire: jest.fn(),
  moderateCommentaire: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  commentaireService: mockCommentaireService,
}));

jest.mock('../../helpers/i18n', () => ({
  translateDeep: jest.fn((data) => data),
}));

const CommentaireController = require('../../controllers/commentaireController');

describe('CommentaireController', () => {
  let controller;
  let req, res;

  beforeEach(() => {
    controller = CommentaireController;
    req = {
      t: jest.fn((key) => 'translated:' + key),
      lang: 'fr',
      params: {},
      query: {},
      body: {},
      user: { id_user: 1 },
      resource: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  // =========================================================================
  // getCommentairesOeuvre
  // =========================================================================

  describe('getCommentairesOeuvre', () => {
    it('should return paginated comments for an oeuvre', async () => {
      req.params.oeuvreId = '5';
      const mockRows = [{ id: 1, contenu: 'Nice' }];
      mockCommentaireService.getCommentairesOeuvre.mockResolvedValue({
        rows: mockRows,
        count: 1,
      });

      await controller.getCommentairesOeuvre(req, res);

      expect(mockCommentaireService.getCommentairesOeuvre).toHaveBeenCalledWith(
        '5',
        expect.objectContaining({ limit: expect.any(Number), offset: expect.any(Number) })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors', async () => {
      req.params.oeuvreId = '5';
      const error = new Error('DB error');
      error.statusCode = 500;
      mockCommentaireService.getCommentairesOeuvre.mockRejectedValue(error);

      await controller.getCommentairesOeuvre(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // createCommentaireOeuvre
  // =========================================================================

  describe('createCommentaireOeuvre', () => {
    it('should return 404 when oeuvre not found', async () => {
      req.params.oeuvreId = '999';
      req.body = { contenu: 'Great!' };
      mockCommentaireService.findOeuvre.mockResolvedValue(null);

      await controller.createCommentaireOeuvre(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'translated:oeuvre.notFound',
      });
    });

    it('should create a comment and return 201', async () => {
      req.params.oeuvreId = '5';
      req.body = { contenu: 'Great work!', note_qualite: 5 };
      mockCommentaireService.findOeuvre.mockResolvedValue({ id: 5 });
      const mockComment = { id: 10, contenu: 'Great work!' };
      mockCommentaireService.createCommentaire.mockResolvedValue(mockComment);

      await controller.createCommentaireOeuvre(req, res);

      expect(mockCommentaireService.createCommentaire).toHaveBeenCalledWith(
        expect.objectContaining({
          contenu: 'Great work!',
          note_qualite: 5,
          id_user: 1,
          id_oeuvre: '5',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // =========================================================================
  // moderateCommentaire
  // =========================================================================

  describe('moderateCommentaire', () => {
    it('should moderate a comment successfully', async () => {
      req.params.id = '10';
      req.body = { statut: 'approved' };
      mockCommentaireService.moderateCommentaire.mockResolvedValue({ id: 10, statut: 'approved' });

      await controller.moderateCommentaire(req, res);

      expect(mockCommentaireService.moderateCommentaire).toHaveBeenCalledWith('10', 'approved');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'translated:comment.statusUpdated',
      });
    });

    it('should return 404 when comment not found', async () => {
      req.params.id = '999';
      req.body = { statut: 'approved' };
      mockCommentaireService.moderateCommentaire.mockResolvedValue(null);

      await controller.moderateCommentaire(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
