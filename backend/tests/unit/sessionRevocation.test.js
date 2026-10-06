/**
 * Révocation des sessions après changement / réinitialisation du mot de passe.
 */
const mockDel = jest.fn();
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn(() => ({ del: mockDel })),
  isReady: jest.fn().mockReturnValue(true)
}));
jest.mock('../../services/emailService', () => ({
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(true)
}));

const { issuedBeforePasswordChange } = require('../../utils/jwtHelper');

describe('issuedBeforePasswordChange', () => {
  const changedAt = new Date('2026-10-05T10:00:00Z');
  const changedSec = Math.floor(changedAt.getTime() / 1000);

  it('aucun changement de mot de passe : token valide', () => {
    expect(issuedBeforePasswordChange({ iat: 1 }, null)).toBe(false);
  });

  it('token sans pwdAt émis avant le changement : refusé', () => {
    expect(issuedBeforePasswordChange({ iat: changedSec - 3600 }, changedAt)).toBe(true);
  });

  it('token sans pwdAt émis à la même seconde ou 1 s avant : accepté (arrondi DATETIME)', () => {
    expect(issuedBeforePasswordChange({ iat: changedSec }, changedAt)).toBe(false);
    expect(issuedBeforePasswordChange({ iat: changedSec - 1 }, changedAt)).toBe(false);
  });

  it('pwdAt présent : comportement inchangé', () => {
    expect(issuedBeforePasswordChange({ pwdAt: changedSec - 10, iat: changedSec + 100 }, changedAt)).toBe(true);
    expect(issuedBeforePasswordChange({ pwdAt: changedSec, iat: changedSec - 100 }, changedAt)).toBe(false);
  });
});

describe('EmailVerificationService.resetPassword', () => {
  const EmailVerificationService = require('../../services/emailVerificationService');

  const makeService = (verifyResult) => {
    const user = { id_user: 42, email: 'a@b.dz', update: jest.fn().mockResolvedValue(true) };
    const models = {
      EmailVerification: {
        verifyToken: jest.fn().mockResolvedValue(verifyResult ?? { success: true, user }),
        invalidateUserTokens: jest.fn().mockResolvedValue(true)
      }
    };
    const service = new EmailVerificationService(models);
    service.models = models;
    return { service, user, models };
  };

  beforeEach(() => mockDel.mockClear());

  it('efface le refresh token et invalide le cache de session', async () => {
    const { service, user } = makeService();
    await service.resetPassword('tok', 'Azerty123456!', '127.0.0.1');
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      refresh_token: null,
      refresh_token_expires: null,
      password_changed_at: expect.any(Date)
    }));
    expect(mockDel).toHaveBeenCalledWith(['user:session:42']);
  });

  it('token invalide : rien n\'est modifié', async () => {
    const { service, user } = makeService({ success: false, error: 'bad' });
    await expect(service.resetPassword('tok', 'Azerty123456!', '127.0.0.1')).rejects.toMatchObject({ statusCode: 400 });
    expect(user.update).not.toHaveBeenCalled();
    expect(mockDel).not.toHaveBeenCalled();
  });
});
