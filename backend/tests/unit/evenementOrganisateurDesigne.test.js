/**
 * L'administration ajoute un événement au nom d'un compte (id_organisateur) : ce compte en devient
 * l'organisateur. Il doit être un professionnel actif, membre de l'organisation. Un professionnel ne
 * peut pas s'en servir.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const EvenementService = require('../../services/evenement/evenementService');

const service = (compte, { membre = true, roles = [] } = {}) => {
  const s = Object.create(EvenementService.prototype);
  s.models = {
    User: { findByPk: jest.fn().mockResolvedValue(compte), sequelize: { query: jest.fn().mockResolvedValue([roles]) } },
    UserOrganisation: { findOne: jest.fn().mockResolvedValue(membre ? { id_user: 9 } : null) }
  };
  return s;
};
const pro = { id_user: 9, statut: 'actif', id_type_user: 5 };

describe('organisateur désigné par l\'administration', () => {
  it('sans numéro, ou pour un professionnel : la personne connectée', async () => {
    const s = service(pro);
    await expect(s._auteurDesigne(undefined, 75, true, 5)).resolves.toBe(75);
    await expect(s._auteurDesigne('', 75, true, 5)).resolves.toBe(75);
    await expect(s._auteurDesigne('9', 12, false, 5)).resolves.toBe(12);
    expect(s.models.User.findByPk).not.toHaveBeenCalled();
  });

  it('administration : le professionnel actif membre de l\'organisation devient l\'organisateur', async () => {
    const s = service(pro);
    await expect(s._auteurDesigne('9', 75, true, 5)).resolves.toBe(9);
    expect(s.models.UserOrganisation.findOne).toHaveBeenCalledWith({ where: { id_user: 9, id_organisation: 5, actif: true } });
    // Professionnel par son rôle (type visiteur)
    await expect(service({ ...pro, id_type_user: 1 }, { roles: [{ 1: 1 }] })._auteurDesigne('9', 75, true, 5)).resolves.toBe(9);
  });

  it('refusé (400) : numéro invalide, compte absent ou inactif, visiteur, non membre', async () => {
    await expect(service(pro)._auteurDesigne('abc', 75, true, 5)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service(null)._auteurDesigne('9', 75, true, 5)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service({ ...pro, statut: 'suspendu' })._auteurDesigne('9', 75, true, 5)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service({ ...pro, id_type_user: 1 })._auteurDesigne('9', 75, true, 5)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service(pro, { membre: false })._auteurDesigne('9', 75, true, 5)).rejects.toMatchObject({ statusCode: 400 });
  });
});
