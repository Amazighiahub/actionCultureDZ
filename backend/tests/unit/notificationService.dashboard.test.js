/**
 * Tests unitaires pour les méthodes dashboard de NotificationService
 * (getAdminNotifications, broadcastNotification)
 */

jest.mock('../../services/emailService', () => ({
  sendEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn()
}));
jest.mock('../../services/smsService', () => ({ sendSMS: jest.fn() }));
jest.mock('../../services/whatsappService', () => ({ sendWhatsApp: jest.fn() }));

const NotificationService = require('../../services/notificationService');

describe('NotificationService — dashboard methods', () => {
  let service;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      User: {
        count: jest.fn(),
        findAll: jest.fn()
      },
      Notification: {
        findAndCountAll: jest.fn(),
        bulkCreate: jest.fn()
      },
      AuditLog: {
        create: jest.fn()
      }
    };

    service = new NotificationService(mockModels);
  });

  // =========================================================================
  // getAdminNotifications
  // =========================================================================
  describe('getAdminNotifications', () => {
    it('should return paginated admin notifications', async () => {
      mockModels.Notification.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: [{ id: 1, titre: 'Alert 1' }, { id: 2, titre: 'Alert 2' }]
      });

      const result = await service.getAdminNotifications(1, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(mockModels.Notification.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_user: 1 })
        })
      );
    });

    it('should filter unread only when requested', async () => {
      mockModels.Notification.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await service.getAdminNotifications(1, { unreadOnly: true });

      expect(mockModels.Notification.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lu: false })
        })
      );
    });

    it('should handle null Notification model', async () => {
      mockModels.Notification = null;

      const result = await service.getAdminNotifications(1);

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // =========================================================================
  // broadcastNotification
  // =========================================================================
  describe('broadcastNotification', () => {
    it('should throw MISSING_TITLE_OR_MESSAGE when title is missing', async () => {
      await expect(service.broadcastNotification({ message: 'test' }, 1))
        .rejects.toThrow('MISSING_TITLE_OR_MESSAGE');
    });

    it('should throw MISSING_TITLE_OR_MESSAGE when message is missing', async () => {
      await expect(service.broadcastNotification({ title: 'test' }, 1))
        .rejects.toThrow('MISSING_TITLE_OR_MESSAGE');
    });

    it('should throw NO_TARGET_USERS when no matching users', async () => {
      mockModels.User.count.mockResolvedValue(0);

      await expect(service.broadcastNotification({ title: 'T', message: 'M' }, 1))
        .rejects.toThrow('NO_TARGET_USERS');
    });

    it('should create notifications in batch and audit log', async () => {
      mockModels.User.count.mockResolvedValue(2);
      mockModels.User.findAll.mockResolvedValueOnce([
        { id_user: 10, email: 'a@b.c', preferences_notification: null },
        { id_user: 11, email: 'd@e.f', preferences_notification: null }
      ]).mockResolvedValueOnce([]); // end of batch

      const result = await service.broadcastNotification(
        { title: 'Hello', message: 'World', target: 'all', type: 'info' }, 1
      );

      expect(result.notified).toBe(2);
      expect(result.total_users).toBe(2);
      expect(mockModels.Notification.bulkCreate).toHaveBeenCalledTimes(1);
      expect(mockModels.AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BROADCAST_NOTIFICATION' })
      );
    });

    it('should skip users who opted out of admin notifications', async () => {
      mockModels.User.count.mockResolvedValue(2);
      mockModels.User.findAll.mockResolvedValueOnce([
        { id_user: 10, email: 'a@b.c', preferences_notification: JSON.stringify({ admin_notifications: false }) },
        { id_user: 11, email: 'd@e.f', preferences_notification: null }
      ]).mockResolvedValueOnce([]);

      const result = await service.broadcastNotification(
        { title: 'T', message: 'M' }, 1
      );

      expect(result.notified).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });
});
