/**
 * Erreurs de la base : même réponse claire par errorMiddleware et par les contrôleurs à try/catch
 * (avant : 500 « Erreur serveur » côté contrôleur). Code d'application gardé sur une erreur 4xx.
 */
const BaseController = require('../../controllers/baseController');
const errorMiddleware = require('../../middlewares/errorMiddleware');
const AppError = require('../../utils/appError');

const reponse = () => {
  const res = { req: { method: 'POST', originalUrl: '/x' }, headersSent: false };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const erreurValidation = () => Object.assign(new Error('notNull Violation: Evenement.nom cannot be null'), {
  name: 'SequelizeValidationError', errors: [{ path: 'nom', validatorKey: 'is_null', message: 'Evenement.nom cannot be null' }]
});
const erreurDoublon = () => Object.assign(new Error('Validation error'), {
  name: 'SequelizeUniqueConstraintError', errors: [{ path: 'email', message: 'email must be unique' }]
});

describe('erreurs de la base, contrôleur et middleware', () => {
  const controleur = new BaseController();

  it.each([
    ['contrôleur', (err, res) => controleur._handleError(res, err)],
    ['middleware', (err, res) => errorMiddleware.errorHandler(err, res.req, res, jest.fn())]
  ])('%s : donnée refusée → 400, doublon → 409, élément lié introuvable → 400', (_nom, repondre) => {
    let res = reponse();
    repondre(erreurValidation(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'DB_VALIDATION_ERROR', details: [expect.objectContaining({ field: 'nom' })] });

    res = reponse();
    repondre(erreurDoublon(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'UNIQUE_CONSTRAINT', error: 'Cette ressource existe déjà' });

    res = reponse();
    repondre(Object.assign(new Error('fk'), { name: 'SequelizeForeignKeyConstraintError' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code: 'FK_CONSTRAINT', error: AppError.MESSAGE_REFERENCE });
  });

  it('middleware : le code d’une erreur 4xx est gardé, pas celui d’une erreur 500', () => {
    let res = reponse();
    errorMiddleware.errorHandler(Object.assign(new Error('Ce lien est déjà ajouté'), { statusCode: 409, code: 'LIEN_DOUBLON' }), res.req, res, jest.fn());
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Ce lien est déjà ajouté', code: 'LIEN_DOUBLON' });

    res = reponse();
    errorMiddleware.errorHandler(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }), res.req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].code).toBeUndefined();
  });
});
