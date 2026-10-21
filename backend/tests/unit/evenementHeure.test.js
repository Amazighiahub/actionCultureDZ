/**
 * EvenementService — jour et heure envoyés séparément par le formulaire,
 * combinés à l'heure de l'Algérie (auparavant l'heure était perdue).
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const EvenementService = require('../../services/evenement/evenementService');

describe('EvenementService._avecHeure', () => {
  const svc = Object.create(EvenementService.prototype);
  it('jour + heure → instant à UTC+1', () => {
    expect(svc._avecHeure('2026-10-29', '10:00')).toBe('2026-10-29T10:00:00+01:00');
    expect(new Date(svc._avecHeure('2026-10-29', '10:00')).toISOString()).toBe('2026-10-29T09:00:00.000Z');
  });
  it('sans heure, ou date déjà complète : inchangé', () => {
    expect(svc._avecHeure('2026-10-29', '')).toBe('2026-10-29');
    expect(svc._avecHeure('2026-10-29T10:00:00+01:00', '11:00')).toBe('2026-10-29T10:00:00+01:00');
    expect(svc._avecHeure(undefined, '10:00')).toBeUndefined();
  });
});
