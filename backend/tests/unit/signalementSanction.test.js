/**
 * Sanction prononcée depuis un signalement : session coupée tout de suite (cache et renouvellement),
 * jamais contre un administrateur.
 */
jest.mock('../../utils/sessionCache', () => ({ invalidateUserSession: jest.fn() }));
const { invalidateUserSession } = require('../../utils/sessionCache');
const SignalementRepository = require('../../repositories/signalementRepository');

const repo = (cible) => new SignalementRepository({
  Signalement: {},
  Role: {},
  User: { findByPk: jest.fn().mockResolvedValue(cible), update: jest.fn().mockResolvedValue([1]) }
});

describe('sanction depuis un signalement', () => {
  beforeEach(() => invalidateUserSession.mockClear());

  test('suspension : statut, renouvellement effacé, session coupée', async () => {
    const r = repo({ id_user: 12, id_type_user: 1, Roles: [] });
    await r.applyModerationAction({ type_entite: 'user', id_entite: 12 }, 'suspension_temporaire');
    expect(r.models.User.update).toHaveBeenCalledWith(
      { statut: 'suspendu', refresh_token: null, refresh_token_expires: null }, { where: { id_user: 12 } });
    expect(invalidateUserSession).toHaveBeenCalledWith(12);
  });

  test('compte administrateur : refusé (403), rien de modifié', async () => {
    const r = repo({ id_user: 8, id_type_user: 1, Roles: [{ nom_role: 'Administrateur' }] });
    await expect(r.applyModerationAction({ type_entite: 'user', id_entite: 8 }, 'suspension_permanente'))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(r.models.User.update).not.toHaveBeenCalled();
  });
});
