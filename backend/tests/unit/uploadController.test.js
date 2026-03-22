/**
 * Unit tests for UploadController
 */

const mockUploadService = {
  createPublicMedia: jest.fn(),
  hasMediaModel: jest.fn(),
  getDownloadData: jest.fn(),
  updateProfilePhoto: jest.fn(),
  createAuthenticatedMedia: jest.fn(),
  getMediaInfo: jest.fn(),
  deleteMedia: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  uploadService: mockUploadService,
}));

const UploadController = require('../../controllers/uploadController');

describe('UploadController', () => {
  let controller;
  let req, res;

  beforeEach(() => {
    controller = UploadController;
    req = {
      t: jest.fn((key) => 'translated:' + key),
      lang: 'fr',
      params: {},
      query: {},
      body: {},
      user: { id_user: 1, isAdmin: false },
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
      sendFile: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // =========================================================================
  // uploadPublicImage
  // =========================================================================

  describe('uploadPublicImage', () => {
    it('should return 400 when no file is provided', async () => {
      req.file = null;
      await controller.uploadPublicImage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'translated:upload.noFile',
      });
    });

    it('should return 201 with data on success', async () => {
      req.file = { originalname: 'photo.jpg' };
      const mockData = { id: 1, url: '/uploads/photo.jpg' };
      mockUploadService.createPublicMedia.mockResolvedValue(mockData);

      await controller.uploadPublicImage(req, res);

      expect(mockUploadService.createPublicMedia).toHaveBeenCalledWith(req.file);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'translated:upload.imageSuccess',
        data: mockData,
      });
    });

    it('should handle service errors', async () => {
      req.file = { originalname: 'photo.jpg' };
      const error = new Error('Upload failed');
      error.statusCode = 500;
      mockUploadService.createPublicMedia.mockRejectedValue(error);

      await controller.uploadPublicImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // downloadMedia
  // =========================================================================

  describe('downloadMedia', () => {
    it('should return 501 when media model not available', async () => {
      req.params.id = '10';
      mockUploadService.hasMediaModel.mockReturnValue(false);

      await controller.downloadMedia(req, res);

      expect(res.status).toHaveBeenCalledWith(501);
    });

    it('should return 404 when media not found', async () => {
      req.params.id = '10';
      mockUploadService.hasMediaModel.mockReturnValue(true);
      mockUploadService.getDownloadData.mockResolvedValue({ media: null });

      await controller.downloadMedia(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should redirect for cloudinary URLs', async () => {
      req.params.id = '10';
      mockUploadService.hasMediaModel.mockReturnValue(true);
      mockUploadService.getDownloadData.mockResolvedValue({
        media: { id: 10 },
        isPublic: true,
        isCloudinaryUrl: true,
        redirectUrl: 'https://cloudinary.com/img.jpg',
      });

      await controller.downloadMedia(req, res);

      expect(res.redirect).toHaveBeenCalledWith('https://cloudinary.com/img.jpg');
    });
  });

  // =========================================================================
  // uploadProfilePhoto
  // =========================================================================

  describe('uploadProfilePhoto', () => {
    it('should return 400 when no file is provided', async () => {
      req.file = null;
      await controller.uploadProfilePhoto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should update profile photo on success', async () => {
      req.file = { originalname: 'avatar.jpg' };
      const mockData = { url: '/avatar.jpg' };
      mockUploadService.updateProfilePhoto.mockResolvedValue(mockData);

      await controller.uploadProfilePhoto(req, res);

      expect(mockUploadService.updateProfilePhoto).toHaveBeenCalledWith(1, req.file);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });
});
