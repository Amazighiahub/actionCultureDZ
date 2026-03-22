/**
 * Unit tests for NotificationController
 */

const mockNotificationService = {
  getUserNotificationsPaginated: jest.fn(),
  getUnreadCount: jest.fn(),
  getNotificationsSummary: jest.fn(),
  markOneAsRead: jest.fn(),
  markAllAsReadForUser: jest.fn(),
  markMultipleAsReadForUser: jest.fn(),
  deleteUserNotification: jest.fn(),
  deleteReadNotificationsForUser: jest.fn(),
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  sendToUser: jest.fn(),
  broadcastToAllActive: jest.fn(),
};

jest.mock('../../services/serviceContainer', () => ({
  notificationService: mockNotificationService,
}));

jest.mock('../../helpers/i18n', () => ({
  translate: jest.fn((data) => data),
  translateDeep: jest.fn((data) => data),
}));

const NotificationController = require('../../controllers/notificationController');

describe('NotificationController', () => {
  let controller;
  let req, res;

  beforeEach(() => {
    controller = NotificationController;
    req = {
      t: jest.fn((key) => 'translated:' + key),
      lang: 'fr',
      params: {},
      query: {},
      body: {},
      user: { id_user: 1 },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  // =========================================================================
  // getMyNotifications
  // =========================================================================

  describe('getMyNotifications', () => {
    it('should return paginated notifications with unread count', async () => {
      mockNotificationService.getUserNotificationsPaginated.mockResolvedValue({
        data: [{ id: 1, titre: 'Notif' }],
        pagination: { page: 1, pages: 1 },
        total: 1,
      });
      mockNotificationService.getUnreadCount.mockResolvedValue(3);

      await controller.getMyNotifications(req, res);

      expect(mockNotificationService.getUserNotificationsPaginated).toHaveBeenCalled();
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('DB error');
      error.statusCode = 500;
      mockNotificationService.getUserNotificationsPaginated.mockRejectedValue(error);

      await controller.getMyNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // markAsRead
  // =========================================================================

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      req.params.id = '5';
      mockNotificationService.markOneAsRead.mockResolvedValue({ id: 5 });

      await controller.markAsRead(req, res);

      expect(mockNotificationService.markOneAsRead).toHaveBeenCalledWith('5', 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'translated:notification.markedAsRead',
      });
    });

    it('should return 404 when notification not found', async () => {
      req.params.id = '999';
      mockNotificationService.markOneAsRead.mockResolvedValue(null);

      await controller.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // deleteNotification
  // =========================================================================

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      req.params.id = '5';
      mockNotificationService.deleteUserNotification.mockResolvedValue(1);

      await controller.deleteNotification(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'translated:notification.deleted',
      });
    });

    it('should return 404 when notification not found', async () => {
      req.params.id = '999';
      mockNotificationService.deleteUserNotification.mockResolvedValue(0);

      await controller.deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // sendNotification
  // =========================================================================

  describe('sendNotification', () => {
    it('should return 400 when missing required fields', async () => {
      req.body = { titre: 'Test' };

      await controller.sendNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should send notification and return 201', async () => {
      req.body = { titre: 'Hello', message: 'World', destinataire_id: 2 };
      const mockNotif = { id: 1, titre: 'Hello' };
      mockNotificationService.sendToUser.mockResolvedValue(mockNotif);

      await controller.sendNotification(req, res);

      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(2, req.body);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
