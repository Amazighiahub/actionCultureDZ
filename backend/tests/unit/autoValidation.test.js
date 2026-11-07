/** Un modérateur ne valide pas son propre contenu ; un vrai administrateur le peut (la plateforme ne se bloque pas) */
const { refuserSiSonPropreContenu } = require('../../utils/estAdministrateur');

const modeles = (typeUser, roleAdmin = false) => ({
  User: { findByPk: jest.fn(async (id) => ({ id_user: id, id_type_user: typeUser })), count: jest.fn(async () => (roleAdmin ? 1 : 0)) },
  Role: {},
});

describe('auto-validation', () => {
  it('modérateur sur son propre contenu : refusé', async () => {
    await expect(refuserSiSonPropreContenu(modeles(2), 5, 5, 'votre propre événement')).rejects.toMatchObject({ statusCode: 403, code: 'AUTO_VALIDATION' });
  });
  it('contenu d’un autre : permis', async () => {
    await expect(refuserSiSonPropreContenu(modeles(2), 5, 6, 'x')).resolves.toBeUndefined();
  });
  it('vrai administrateur (type ou rôle) sur son propre contenu : permis', async () => {
    await expect(refuserSiSonPropreContenu(modeles(29), 5, 5, 'x')).resolves.toBeUndefined();
    await expect(refuserSiSonPropreContenu(modeles(2, true), 5, 5, 'x')).resolves.toBeUndefined();
  });
});

describe('auto-validation : services, comptes', () => {
  jest.mock('../../utils/redisClient', () => ({
    getRedisClient: jest.fn().mockResolvedValue(null), getClient: jest.fn().mockReturnValue(null), isReady: jest.fn().mockReturnValue(false)
  }));
  const ServiceService = require('../../services/service/serviceService');
  const service = (typeUser) => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 9, id_user: 5, statut: 'en_attente', nom: 'Atelier' }),
      findWithFullDetails: jest.fn().mockResolvedValue({ id: 9 }), update: jest.fn().mockResolvedValue([1]),
    };
    return { s: new ServiceService(repository, { models: modeles(typeUser), notificationService: { createNotification: jest.fn() } }), repository };
  };

  it('modérateur : ni valider ni refuser son propre service', async () => {
    const { s, repository } = service(2);
    await expect(s.validate(9, 5)).rejects.toMatchObject({ code: 'AUTO_VALIDATION' });
    await expect(s.reject(9, 5, 'motif')).rejects.toMatchObject({ code: 'AUTO_VALIDATION' });
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('modérateur : le service d’un autre passe', async () => {
    const { s, repository } = service(2);
    await s.validate(9, 6).catch(() => {});
    expect(repository.update).toHaveBeenCalledWith(9, { statut: 'valide' });
  });
});
