/**
 * _handleError : une erreur 500 est journalisée hors développement (avant : aucune trace),
 * une erreur attendue (404, 400…) ne l'est pas.
 */
jest.mock('../../utils/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }));
const logger = require('../../utils/logger');
const BaseController = require('../../controllers/baseController');

const reponse = () => {
  const res = { req: { method: 'POST', originalUrl: '/api/essai' } };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('BaseController._handleError', () => {
  beforeEach(() => logger.error.mockClear());

  test('erreur 500 : journalisée avec la méthode et l\'adresse', () => {
    const res = reponse();
    new BaseController()._handleError(res, new Error('table introuvable'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Erreur serveur'), 'table introuvable', 'POST', '/api/essai', expect.any(String));
  });

  test('erreur attendue (404) : pas journalisée comme erreur serveur', () => {
    const res = reponse();
    const e = Object.assign(new Error('Introuvable'), { statusCode: 404 });
    new BaseController()._handleError(res, e);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('interblocage MySQL : 409 CONFLIT_SIMULTANE (comme errorMiddleware), pas « Internal server error »', () => {
    const res = reponse();
    const e = Object.assign(new Error('Deadlock found when trying to get lock'), {
      name: 'SequelizeDatabaseError', parent: { code: 'ER_LOCK_DEADLOCK' },
    });
    new BaseController()._handleError(res, e);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'CONFLIT_SIMULTANE' }));
    expect(logger.error).not.toHaveBeenCalled();
  });
});
