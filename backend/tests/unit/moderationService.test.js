/**
 * Tests unitaires pour DashboardModerationService
 */

const DashboardModerationService = require('../../services/dashboard/moderationService');

describe('DashboardModerationService', () => {
  let service;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      User: {
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        count: jest.fn()
      },
      Oeuvre: {
        findByPk: jest.fn(),
        findAndCountAll: jest.fn(),
        count: jest.fn()
      },
      Signalement: {
        findByPk: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn(),
        count: jest.fn()
      },
      Media: {}
    };

    service = new DashboardModerationService(mockModels);
  });

  // =========================================================================
  // validateOeuvreAction
  // =========================================================================
  describe('validateOeuvreAction', () => {
    it('should throw if oeuvre not found', async () => {
      mockModels.Oeuvre.findByPk.mockResolvedValue(null);
      await expect(service.validateOeuvreAction(99, { valide: true }))
        .rejects.toThrow('Œuvre non trouvée');
    });

    it('should validate (publish) oeuvre', async () => {
      const mockOeuvre = { id_oeuvre: 1, update: jest.fn().mockResolvedValue(true) };
      mockModels.Oeuvre.findByPk.mockResolvedValue(mockOeuvre);

      const result = await service.validateOeuvreAction(1, { valide: true, validateur_id: 10 });

      expect(mockOeuvre.update).toHaveBeenCalledWith(expect.objectContaining({
        statut: 'publie', validateur_id: 10, raison_rejet: null
      }));
      expect(result.message).toContain('validée');
    });

    it('should reject oeuvre with reason', async () => {
      const mockOeuvre = { id_oeuvre: 1, update: jest.fn().mockResolvedValue(true) };
      mockModels.Oeuvre.findByPk.mockResolvedValue(mockOeuvre);

      const result = await service.validateOeuvreAction(1, { valide: false, raison_rejet: 'Contenu inapproprié' });

      expect(mockOeuvre.update).toHaveBeenCalledWith(expect.objectContaining({
        statut: 'rejete', raison_rejet: 'Contenu inapproprié'
      }));
      expect(result.message).toContain('rejetée');
    });
  });

  // =========================================================================
  // getPendingOeuvres
  // =========================================================================
  describe('getPendingOeuvres', () => {
    it('should return paginated pending oeuvres', async () => {
      mockModels.Oeuvre.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: [
          { id_oeuvre: 1, titre: 'A', description: 'D', statut: 'en_attente', id_type_oeuvre: 1, date_creation: new Date(), Saiseur: { id_user: 1, nom: 'X', prenom: 'Y' }, Media: [] },
          { id_oeuvre: 2, titre: 'B', description: 'E', statut: 'brouillon', id_type_oeuvre: 2, date_creation: new Date(), Saiseur: null, Media: [] }
        ]
      });

      const result = await service.getPendingOeuvres({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.items[0].auteur).toEqual(expect.objectContaining({ nom: 'X' }));
      expect(result.items[1].auteur).toBeNull();
    });
  });

  // =========================================================================
  // getModerationQueue
  // =========================================================================
  describe('getModerationQueue', () => {
    it('should aggregate counts from all sources', async () => {
      mockModels.User.count.mockResolvedValue(5);
      mockModels.Oeuvre.count.mockResolvedValue(3);
      mockModels.Signalement.count.mockResolvedValue(2);

      const result = await service.getModerationQueue();

      expect(result.pendingUsers).toBe(5);
      expect(result.pendingOeuvres).toBe(3);
      expect(result.reportedContent).toBe(2);
      expect(result.total).toBe(10);
    });
  });

  // =========================================================================
  // moderateSignalement
  // =========================================================================
  describe('moderateSignalement', () => {
    it('should throw if signalement not found', async () => {
      mockModels.Signalement.findByPk.mockResolvedValue(null);
      await expect(service.moderateSignalement(99, { action: 'approve' }, 1))
        .rejects.toThrow('Signalement non trouvé');
    });

    it('should mark signalement as traite on approve', async () => {
      const mockSignalement = { update: jest.fn().mockResolvedValue(true) };
      mockModels.Signalement.findByPk.mockResolvedValue(mockSignalement);

      await service.moderateSignalement(1, { action: 'approve', motif: 'OK' }, 10);

      expect(mockSignalement.update).toHaveBeenCalledWith(expect.objectContaining({
        statut: 'traite', traite_par: 10
      }));
    });
  });
});
