/**
 * Tests unitaires pour UserRepository
 */

const UserRepository = require("../../repositories/UserRepository");

describe("UserRepository", () => {
  let userRepository;
  let mockModels;

  beforeEach(() => {
    // Mock des modeles Sequelize
    mockModels = {
      User: {
        findByPk: jest.fn(),
        findOne: jest.fn(),
        findAndCountAll: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      Role: {},
      Oeuvre: {},
      Evenement: {}
    };

    userRepository = new UserRepository(mockModels);
  });

  describe("findByEmail", () => {
    it("should find user by email", async () => {
      const mockUser = global.createTestUser();
      mockModels.User.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail("test@example.com");

      expect(mockModels.User.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        include: [],
        attributes: undefined
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null if user not found", async () => {
      mockModels.User.findOne.mockResolvedValue(null);

      const result = await userRepository.findByEmail("notfound@example.com");

      expect(result).toBeNull();
    });
  });

  describe("findPendingValidation", () => {
    it("should find users pending validation", async () => {
      const mockUsers = [
        global.createTestUser({ statut_validation: "en_attente" })
      ];
      mockModels.User.findAndCountAll.mockResolvedValue({
        rows: mockUsers,
        count: 1
      });

      const result = await userRepository.findPendingValidation();

      expect(mockModels.User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statut_validation: "en_attente"
          })
        })
      );
      expect(result.data).toEqual(mockUsers);
    });
  });

  describe("validate", () => {
    it("should validate a user", async () => {
      const mockUser = {
        ...global.createTestUser(),
        update: jest.fn().mockResolvedValue(true)
      };
      mockModels.User.findByPk.mockResolvedValue(mockUser);

      await userRepository.validate(1, 2);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          statut_validation: "valide",
          valide_par: 2
        }),
        {}
      );
    });
  });

  describe("getStats", () => {
    it("should return user statistics", async () => {
      mockModels.User.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(90)  // active
        .mockResolvedValueOnce(3);  // suspended
      mockModels.User.findAll = jest.fn().mockResolvedValue([
        { type_user: "visiteur", count: "50" },
        { type_user: "artiste", count: "30" }
      ]);

      const stats = await userRepository.getStats();

      expect(stats.total).toBe(100);
      expect(stats.pending).toBe(5);
      expect(stats.active).toBe(90);
      expect(stats.suspended).toBe(3);
    });
  });
});

