/**
 * Messages des gestionnaires d'erreurs généraux : jamais de nom de colonne, de paramètre ou de jargon
 * (« ID userId invalide », « email doit être unique », « Token expiré »), et traduits à l'envoi (audit V11 FRM-17).
 */
const AppError = require('../../utils/appError');
const validationMiddleware = require('../../middlewares/validationMiddleware');
const errorMiddleware = require('../../middlewares/errorMiddleware');
const { traduireTexteServeur } = require('../../utils/traductionServeur');

const reponse = () => {
  const res = { headersSent: false };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const requete = (extra = {}) => ({ method: 'POST', originalUrl: '/api/x', path: '/api/x', params: {}, body: {}, ...extra });

describe('messages des erreurs générales (audit V11 FRM-17)', () => {
  it('identifiant invalide : phrase sans nom de paramètre', () => {
    const res = reponse();
    validationMiddleware.validateId('userId')(requete({ params: { userId: 'abc' } }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Ce lien est incomplet ou erroné', code: 'INVALID_ID' });
  });

  it('texte trop long : la limite est donnée, le champ est dans le détail', () => {
    const res = reponse();
    const t = jest.fn((cle, p) => `${cle}:${p.max}`);
    validationMiddleware.validateStringLengths(requete({ body: { nom_evenement: 'a'.repeat(10001) }, t }), res, jest.fn());
    const corps = res.json.mock.calls[0][0];
    expect(t).toHaveBeenCalledWith('validation.texteTropLong', { max: 10000 });
    expect(corps.error).not.toMatch(/nom_evenement/);
    expect(corps.details).toEqual([{ field: 'nom_evenement', message: 'validation.texteTropLong:10000' }]);
  });

  it('doublon en base : pas de nom de colonne dans le message', () => {
    const res = reponse();
    const erreur = Object.assign(new Error('Unique'), { name: 'SequelizeUniqueConstraintError', errors: [{ path: 'email', value: 'x@example.com' }] });
    errorMiddleware.errorHandler(erreur, requete(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].details[0]).toMatchObject({ field: 'email', message: 'Cette valeur est déjà utilisée' });
  });

  it('jeton refusé : message de session, codes inchangés', () => {
    for (const [name, code] of [['JsonWebTokenError', 'INVALID_TOKEN'], ['TokenExpiredError', 'TOKEN_EXPIRED']]) {
      const res = reponse();
      errorMiddleware.errorHandler(Object.assign(new Error('jwt'), { name }), requete(), res, jest.fn());
      expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Votre session a expiré : reconnectez-vous.', code });
    }
  });

  it('AppError.fromError : validation, doublon et clé étrangère (faute de frappe corrigée)', () => {
    const validation = AppError.fromError(Object.assign(new Error('v'), {
      name: 'SequelizeValidationError',
      errors: [{ path: 'titre', validatorKey: 'len' }, { path: 'nom', type: 'notNull Violation' }, { path: 'x', validatorKey: 'isUrl' }],
    }));
    expect(validation).toMatchObject({ statusCode: 400, message: 'Données invalides' });
    expect(validation.details).toEqual([
      { field: 'titre', message: 'Texte trop long' },
      { field: 'nom', message: 'Ce champ est requis' },
      { field: 'x', message: 'Valeur invalide' },
    ]);
    const doublon = AppError.fromError(Object.assign(new Error('u'), { name: 'SequelizeUniqueConstraintError', fields: { slug: 'a' } }));
    expect(doublon).toMatchObject({ statusCode: 409, message: 'Cette valeur est déjà utilisée' });
    expect(doublon.details).toEqual([{ field: 'slug', message: 'Cette valeur est déjà utilisée' }]);
    const reference = AppError.fromError(Object.assign(new Error('fk'), { name: 'SequelizeForeignKeyConstraintError' }));
    expect(reference).toMatchObject({ statusCode: 400, code: 'FK_CONSTRAINT' });
  });

  it('toutes ces phrases sont traduites en arabe et en anglais', () => {
    const phrases = [
      'Cette valeur est déjà utilisée', 'Cette ressource existe déjà', 'Texte trop long',
      'Ce champ est requis', 'Valeur invalide', AppError.MESSAGE_SESSION, AppError.MESSAGE_REFERENCE,
      'Le serveur met trop de temps à répondre. Réessayez.', 'Votre session a expiré : rechargez la page, puis réessayez.',
      'Ce lien n’est plus valable : il a déjà servi ou il est trop ancien.', 'Erreur serveur',
    ];
    for (const p of phrases) {
      expect([p, traduireTexteServeur(p, 'ar')]).not.toEqual([p, p]);
      expect([p, traduireTexteServeur(p, 'en')]).not.toEqual([p, p]);
    }
  });
});
