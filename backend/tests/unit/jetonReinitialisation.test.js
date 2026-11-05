/**
 * Faille corrigée : un jeton qui n'est pas un texte était comparé numériquement par MySQL et pouvait
 * correspondre à un jeton inconnu de la personne. Seul un texte au format exact doit atteindre la base.
 */
const crypto = require('crypto');
const { body } = require('express-validator');
const initModele = require('../../models/misc/emailVerification');
const { FORMAT_JETON } = initModele;
const UserRepository = require('../../repositories/userRepository');

const modele = () => {
  const define = jest.fn(() => ({ findOne: jest.fn(async () => null) }));
  const EmailVerification = initModele({ define, models: {} });
  return EmailVerification;
};

const PIEGES = [[[0]], [[0, 1, 2]], [0], 0, 1, true, { a: 1 }, null, undefined, '', 'court', `${'a'.repeat(64)}x`, `${'A'.repeat(64)}`, `${'g'.repeat(64)}`, `${'a'.repeat(64)}\n`];

describe('jeton de réinitialisation', () => {
  test.each(PIEGES.map((p) => [JSON.stringify(p), p]))('%s : refusé sans interroger la base', async (_, jeton) => {
    const m = modele();
    const r = await m.verifyToken(jeton, 'password_reset');
    expect(r.success).toBe(false);
    expect(m.findOne).not.toHaveBeenCalled();
  });

  test('un vrai jeton atteint bien la base', async () => {
    const m = modele();
    const jeton = crypto.randomBytes(32).toString('hex');
    expect(FORMAT_JETON.test(jeton)).toBe(true);
    await m.verifyToken(jeton, 'password_reset');
    expect(m.findOne).toHaveBeenCalledTimes(1);
    expect(m.findOne.mock.calls[0][0].where.token).toBe(jeton);
  });
});

describe('validation de la route', () => {
  const valide = (chaine, valeur, champ) => chaine.run({ body: { [champ]: valeur } })
    .then((r) => r.isEmpty());
  const regleJeton = () => body('token').custom((v) => FORMAT_JETON.test(typeof v === 'string' ? v : ''));
  const regleEmail = () => body('email').isString().bail().isEmail();

  test.each(PIEGES.map((p) => [JSON.stringify(p), p]))('jeton %s : refusé', async (_, jeton) => {
    expect(await valide(regleJeton(), jeton, 'token')).toBe(false);
  });

  test('vrai jeton : accepté', async () => {
    expect(await valide(regleJeton(), crypto.randomBytes(32).toString('hex'), 'token')).toBe(true);
  });

  test.each([[[['a@example.com', 0]]], [['a@example.com']], [0], [{ a: 1 }]])('e-mail %j : refusé', async (email) => {
    expect(await valide(regleEmail(), email, 'email')).toBe(false);
  });

  test('vraie adresse : acceptée', async () => {
    expect(await valide(regleEmail(), 'a@example.com', 'email')).toBe(true);
  });
});

describe('recherche par e-mail', () => {
  test.each([[[['a@example.com', 0]]], [[0]], [0], [null]])('%j : aucun compte, sans requête', async (email) => {
    const depot = Object.create(UserRepository.prototype);
    depot.findOne = jest.fn();
    depot.model = { unscoped: jest.fn() };
    expect(await depot.findByEmail(email, { includeAuth: true })).toBeNull();
    expect(depot.findOne).not.toHaveBeenCalled();
    expect(depot.model.unscoped).not.toHaveBeenCalled();
  });
});

test('les routes appliquent bien ces règles', () => {
  const fs = require('fs');
  const path = require('path');
  const routes = fs.readFileSync(path.join(__dirname, '../../routes/emailVerificationRoutes.js'), 'utf8');
  expect(routes).toContain('FORMAT_JETON.test(typeof valeur');
  expect(routes).toContain('.isString()');
});
