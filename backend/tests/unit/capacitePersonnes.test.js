/**
 * Capacité d'un événement en personnes (« 4 personnes » prend 4 places) ; une personne déjà inscrite
 * n'est pas refusée pour « complet » (avant : capacité en lignes, contrôle « complet » avant « déjà inscrit »).
 */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null, isReady: () => false }));
const EvenementService = require('../../services/evenement/evenementService');

const inscrire = async ({ prises, capacite = 5, existante = null, data = {} }) => {
  const svc = Object.create(EvenementService.prototype);
  svc.models = {
    TypeEvenement: { findByPk: jest.fn().mockResolvedValue(null) },
    EvenementUser: { findOne: jest.fn().mockResolvedValue(existante) }
  };
  svc.repository = {
    findById: jest.fn().mockResolvedValue({ id_evenement: 9, statut: 'publie', id_type_evenement: 3, capacite_max: capacite, date_debut: '2099-01-01T10:00:00Z' }),
    countParticipants: jest.fn().mockResolvedValue(prises),
    registerParticipant: jest.fn().mockResolvedValue({ ok: true })
  };
  svc.withTransaction = async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } });
  svc.logger = { info: jest.fn() };
  await svc.registerParticipant(9, 38, data);
  return svc;
};

describe('capacité en personnes', () => {
  test('4 personnes, 2 places restantes : refusé avec le nombre de places', async () => {
    await expect(inscrire({ prises: 3, data: { nombre_personnes: 4 } })).rejects.toThrow('Il reste 2 place(s)');
  });
  test('2 personnes, 2 places restantes : accepté', async () => {
    const svc = await inscrire({ prises: 3, data: { nombre_personnes: 2 } });
    expect(svc.repository.registerParticipant).toHaveBeenCalled();
  });
  test('complet : refusé', async () => {
    await expect(inscrire({ prises: 5 })).rejects.toThrow('complet');
  });
  test('déjà inscrit : pas de « complet », inscription existante renvoyée', async () => {
    const svc = await inscrire({ prises: 5, existante: { statut_participation: 'inscrit' } });
    expect(svc.repository.countParticipants).not.toHaveBeenCalled();
    expect(svc.repository.registerParticipant).toHaveBeenCalled();
  });
});
