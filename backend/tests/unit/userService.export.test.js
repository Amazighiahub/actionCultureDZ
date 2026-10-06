/**
 * Export RGPD (art. 15 / 20) : complet, sans secrets.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const UserService = require('../../services/user/userService');

const section = () => ({ findAll: jest.fn().mockResolvedValue([{ id: 1 }]) });

const makeService = () => {
  const userFindByPk = jest.fn().mockResolvedValue({ id_user: 42, email: 'a@b.dz', ip_acceptation_conditions: '1.2.3.4' });
  const models = {
    User: { unscoped: () => ({ findByPk: userFindByPk }) },
    Oeuvre: section(), Evenement: section(), EvenementUser: section(), Commentaire: section(),
    CritiqueEvaluation: section(), Favori: section(), Notification: section(), Signalement: section(),
    UserOrganisation: section(), UserRole: section(), Intervenant: section(), Service: section(),
    Lieu: section(), Parcours: section(), EmailVerification: section(), Vue: section(), QRScan: section(),
    OeuvreUser: section()
  };
  return { service: new UserService({ models }, {}), models, userFindByPk };
};

describe('UserService.exportMyData', () => {
  it('exclut mot de passe et jetons du profil, inclut les preuves de consentement', async () => {
    const { service, userFindByPk } = makeService();
    const data = await service.exportMyData(42);
    expect(userFindByPk.mock.calls[0][1].attributes.exclude).toEqual(['password', 'refresh_token', 'refresh_token_expires']);
    expect(data.personal_info.ip_acceptation_conditions).toBe('1.2.3.4');
  });

  it('couvre toutes les catégories de données liées', async () => {
    const { service } = makeService();
    const data = await service.exportMyData(42);
    for (const key of ['oeuvres', 'evenements_organises', 'inscriptions_evenements', 'commentaires', 'critiques',
      'favoris', 'notifications', 'signalements_effectues', 'organisations', 'roles', 'fiche_intervenant',
      'services', 'lieux_crees', 'parcours', 'verifications_email', 'consultations', 'scans_qr']) {
      expect(data).toHaveProperty(key);
    }
  });

  it('n\'exporte jamais les jetons de vérification email', async () => {
    const { service, models } = makeService();
    await service.exportMyData(42);
    expect(models.EmailVerification.findAll.mock.calls[0][0].attributes).toEqual({ exclude: ['token'] });
  });

  it('utilisateur inexistant : 404', async () => {
    const { service, userFindByPk } = makeService();
    userFindByPk.mockResolvedValue(null);
    await expect(service.exportMyData(1)).rejects.toMatchObject({ statusCode: 404 });
  });
});
