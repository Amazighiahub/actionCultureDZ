/**
 * Tests unitaires pour DashboardUserManagementService
 */

const DashboardUserManagementService = require('../../services/dashboard/userManagementService');

describe('DashboardUserManagementService', () => {
  let service;
  let mockModels;
  let mockUserRepo;

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn(),
      findWithRoles: jest.fn(),
      findAllFiltered: jest.fn(),
      findPendingNonVisiteurs: jest.fn(),
      findDetailsWithRoles: jest.fn(),
      findForExport: jest.fn(),
      searchFiltered: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      hardDeleteUser: jest.fn(),
      count: jest.fn(),
      withTransaction: jest.fn(async (cb) => cb({}))
    };

    mockModels = {
      Role: { findByPk: jest.fn() },
      UserRole: {
        destroy: jest.fn(),
        create: jest.fn(),
        bulkCreate: jest.fn()
      },
      Notification: { create: jest.fn() }
    };

    service = new DashboardUserManagementService(mockModels, { user: mockUserRepo });
  });

  // =========================================================================
  // deleteUser
  // =========================================================================
  describe('deleteUser', () => {
    it('should throw if user not found', async () => {
      mockUserRepo.findWithRoles.mockResolvedValue(null);
      await expect(service.deleteUser(99, 1)).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should throw CANNOT_DELETE_ADMIN for admin user', async () => {
      mockUserRepo.findWithRoles.mockResolvedValue({
        id_user: 2,
        Roles: [{ nom_role: 'Admin' }]
      });
      await expect(service.deleteUser(2, 1)).rejects.toThrow('CANNOT_DELETE_ADMIN');
    });

    it('should throw CANNOT_DELETE_ADMIN for super admin user', async () => {
      mockUserRepo.findWithRoles.mockResolvedValue({
        id_user: 2,
        Roles: [{ nom_role: 'Super Admin' }]
      });
      await expect(service.deleteUser(2, 1)).rejects.toThrow('CANNOT_DELETE_ADMIN');
    });

    it('should throw CANNOT_DELETE_SELF', async () => {
      mockUserRepo.findWithRoles.mockResolvedValue({
        id_user: 1,
        Roles: [{ nom_role: 'User' }]
      });
      await expect(service.deleteUser(1, 1)).rejects.toThrow('CANNOT_DELETE_SELF');
    });

    it('should perform soft delete by default', async () => {
      mockUserRepo.findWithRoles.mockResolvedValue({
        id_user: 5, email: 'u@test.com', Roles: []
      });
      mockUserRepo.update.mockResolvedValue(true);

      const result = await service.deleteUser(5, 1);

      expect(result.type).toBe('soft');
      expect(mockUserRepo.update).toHaveBeenCalledWith(5, { statut: 'inactif' });
      expect(mockUserRepo.hardDeleteUser).not.toHaveBeenCalled();
    });

    it('should perform hard delete when option is set', async () => {
      mockUserRepo.findWithRoles.mockResolvedValue({
        id_user: 5, email: 'u@test.com', nom: 'Test', prenom: 'User',
        type_user: 'artiste', Roles: []
      });
      mockUserRepo.hardDeleteUser.mockResolvedValue(true);

      const result = await service.deleteUser(5, 1, { hardDelete: true });

      expect(result.type).toBe('hard');
      expect(result.deleted).toBe(true);
      expect(result.userId).toBe(5);
      expect(mockUserRepo.hardDeleteUser).toHaveBeenCalledWith(5, expect.objectContaining({ adminId: 1 }));
    });
  });

  // =========================================================================
  // changeUserRole
  // =========================================================================
  describe('changeUserRole', () => {
    it('should throw if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.changeUserRole(99, 1, 1)).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should throw if role not found', async () => {
      mockUserRepo.findById.mockResolvedValue({ id_user: 1 });
      mockModels.Role.findByPk.mockResolvedValue(null);
      await expect(service.changeUserRole(1, 99, 1)).rejects.toThrow('Rôle non trouvé');
    });

    it('should destroy old roles and create new one in transaction', async () => {
      mockUserRepo.findById.mockResolvedValue({ id_user: 5 });
      mockModels.Role.findByPk.mockResolvedValue({ id_role: 2, nom_role: 'Admin' });

      const result = await service.changeUserRole(5, 2, 1);

      expect(mockUserRepo.withTransaction).toHaveBeenCalled();
      expect(mockModels.UserRole.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_user: 5 } })
      );
      expect(mockModels.UserRole.create).toHaveBeenCalledWith(
        expect.objectContaining({ id_user: 5, id_role: 2, attribue_par: 1 }),
        expect.any(Object)
      );
      expect(result.role.nom_role).toBe('Admin');
    });
  });

  // =========================================================================
  // resetUserPassword
  // =========================================================================
  describe('resetUserPassword', () => {
    it('should throw if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.resetUserPassword(99)).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should generate temp password and hash it', async () => {
      mockUserRepo.findById.mockResolvedValue({ id_user: 1 });
      mockUserRepo.update.mockResolvedValue(true);

      const result = await service.resetUserPassword(1);

      expect(result.success).toBe(true);
      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword.length).toBe(16); // 8 bytes hex = 16 chars
      expect(mockUserRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        doit_changer_mdp: true
      }));
    });
  });

  // =========================================================================
  // bulkUserAction
  // =========================================================================
  describe('bulkUserAction', () => {
    it('should validate users in batch with updateMany', async () => {
      mockUserRepo.updateMany.mockResolvedValue(true);

      const result = await service.bulkUserAction('validate', [1, 2, 3], {}, 10);

      expect(mockUserRepo.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ id_user: expect.any(Object) }),
        expect.objectContaining({ statut: 'actif', id_user_validate: 10 })
      );
      expect(result.success).toEqual([1, 2, 3]);
    });

    it('should change roles in transaction', async () => {
      const result = await service.bulkUserAction('change_role', [1, 2], { role_id: 5 }, 10);

      expect(mockUserRepo.withTransaction).toHaveBeenCalled();
      expect(mockModels.UserRole.destroy).toHaveBeenCalled();
      expect(mockModels.UserRole.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id_user: 1, id_role: 5 }),
          expect.objectContaining({ id_user: 2, id_role: 5 })
        ]),
        expect.any(Object)
      );
      expect(result.success).toEqual([1, 2]);
    });

    it('should deactivate users one by one', async () => {
      mockUserRepo.update.mockResolvedValue(true);

      const result = await service.bulkUserAction('deactivate', [1, 2], {}, 10);

      expect(mockUserRepo.update).toHaveBeenCalledTimes(2);
      expect(result.success).toEqual([1, 2]);
    });

    it('should collect errors for failed individual actions', async () => {
      mockUserRepo.update
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await service.bulkUserAction('deactivate', [1, 2], {}, 10);

      expect(result.success).toEqual([1]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe(2);
    });
  });

  // =========================================================================
  // getUserDetails
  // =========================================================================
  describe('getUserDetails', () => {
    it('should return user details', async () => {
      const mockUser = { id_user: 1, nom: 'Test', Roles: [] };
      mockUserRepo.findDetailsWithRoles.mockResolvedValue(mockUser);

      const result = await service.getUserDetails(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw if user not found', async () => {
      mockUserRepo.findDetailsWithRoles.mockResolvedValue(null);
      await expect(service.getUserDetails(99)).rejects.toThrow('Utilisateur non trouvé');
    });
  });

  // =========================================================================
  // validateUserAction
  // =========================================================================
  describe('validateUserAction', () => {
    it('should throw for visitor users', async () => {
      mockUserRepo.findById.mockResolvedValue({ id_user: 1, id_type_user: 1, statut: 'en_attente_validation' });
      await expect(service.validateUserAction(1, { valide: true, validateur_id: 2 }))
        .rejects.toThrow('Les visiteurs n\'ont pas besoin de validation');
    });

    it('should throw if user already processed', async () => {
      mockUserRepo.findById.mockResolvedValue({ id_user: 1, id_type_user: 2, statut: 'actif' });
      await expect(service.validateUserAction(1, { valide: true, validateur_id: 2 }))
        .rejects.toThrow('Cet utilisateur a déjà été traité');
    });

    it('should validate user and create notification', async () => {
      const mockUser = { id_user: 1, id_type_user: 2, statut: 'en_attente_validation', nom: 'A', prenom: 'B', email: 'a@b.c', reload: jest.fn() };
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue(true);

      const result = await service.validateUserAction(1, { valide: true, validateur_id: 2 });

      expect(mockUserRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ statut: 'actif' }));
      expect(mockModels.Notification.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'validation_acceptee' }));
      expect(result.success).toBe(true);
    });

    it('should reject user with reason', async () => {
      const mockUser = { id_user: 1, id_type_user: 2, statut: 'en_attente_validation', nom: 'A', prenom: 'B', email: 'a@b.c', reload: jest.fn() };
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue(true);

      const result = await service.validateUserAction(1, { valide: false, validateur_id: 2, raison: 'Documents manquants' });

      expect(mockUserRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ statut: 'rejete', raison_rejet: 'Documents manquants' }));
      expect(mockModels.Notification.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'validation_refusee' }));
      expect(result.message).toContain('rejeté');
    });
  });

  // =========================================================================
  // suspendUserAction
  // =========================================================================
  describe('suspendUserAction', () => {
    it('should throw if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.suspendUserAction(99, { raison: 'test' })).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should suspend user with reason', async () => {
      const mockUser = { id_user: 1, reload: jest.fn() };
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue(mockUser);

      const result = await service.suspendUserAction(1, { raison: 'Abus', duree: 30 });

      expect(mockUserRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        statut: 'suspendu', raison_suspension: 'Abus', duree_suspension: 30
      }));
      expect(result.message).toBe('Utilisateur suspendu');
    });
  });
});
