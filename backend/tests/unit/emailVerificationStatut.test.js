/**
 * Vérification de l'e-mail : ne doit pas remettre « en attente » un professionnel déjà
 * validé par l'administration (cas du compte de l'ACAF, validé à 9 h 06, remis en attente
 * à 10 h 56 au clic sur le lien), ni réactiver un compte suspendu.
 */
const { Sequelize } = require('sequelize');
const defineEmailVerification = require('../../models/misc/emailVerification');

// lignesPrises : 1 = le jeton est pris par cette demande ; 0 = une autre demande l'a pris juste avant
const verifier = async (user, lignesPrises = 1) => {
  const sequelize = new Sequelize('mysql://test:test@127.0.0.1:3306/test', { logging: false });
  sequelize.models.User = {};
  const EV = defineEmailVerification(sequelize);
  const verification = { id: 7, User: user, metadata: {}, update: jest.fn() };
  EV.findOne = jest.fn().mockResolvedValue(verification);
  EV.update = jest.fn().mockResolvedValue([lignesPrises]);
  const res = await EV.verifyToken('a'.repeat(64), 'email_verification');
  return { res, verification, EV };
};

describe('EmailVerification.verifyToken — usage unique', () => {
  it('jeton marqué utilisé seulement s’il ne l’était pas encore', async () => {
    const { EV } = await verifier(compte({ id_type_user: 1, statut: 'actif' }));
    expect(EV.update).toHaveBeenCalledWith(expect.objectContaining({ used_at: expect.any(Date) }), { where: { id: 7, used_at: null } });
  });
  it('deux demandes en même temps : la seconde est refusée et ne touche pas au compte', async () => {
    const user = compte({ id_type_user: 1, statut: 'en_attente_validation' });
    const { res } = await verifier(user, 0);
    expect(res.success).toBe(false);
    expect(user.update).not.toHaveBeenCalled();
  });
});
const compte = (champs) => ({ ...champs, update: jest.fn() });

describe('EmailVerification.verifyToken — statut du compte', () => {
  it('professionnel déjà validé : reste actif', async () => {
    const user = compte({ id_type_user: 13, statut: 'actif' });
    const { res } = await verifier(user);
    expect(res.success).toBe(true);
    expect(user.update).toHaveBeenCalledWith({ email_verifie: true });
  });

  it('professionnel en attente : reste en attente de validation', async () => {
    const user = compte({ id_type_user: 2, statut: 'en_attente_validation' });
    await verifier(user);
    expect(user.update).toHaveBeenCalledWith({ email_verifie: true });
  });

  it('visiteur en attente : devient actif ; visiteur suspendu : reste suspendu', async () => {
    const enAttente = compte({ id_type_user: 1, statut: 'en_attente_validation' });
    await verifier(enAttente);
    expect(enAttente.update).toHaveBeenCalledWith({ email_verifie: true, statut: 'actif' });
    const suspendu = compte({ id_type_user: 1, statut: 'suspendu' });
    await verifier(suspendu);
    expect(suspendu.update).toHaveBeenCalledWith({ email_verifie: true });
  });
});
