/** Contenu déjà publié modifié par son auteur : la modération est prévenue (une fois par période) */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null }));
const mockSignaler = jest.fn(async () => {});
jest.mock('../../services/serviceContainer', () => ({ oeuvreService: { _signalerModificationPubliee: (...a) => mockSignaler(...a) } }));
const ArticleBlockService = require('../../services/articleBlockService');

describe('article publié modifié par son auteur', () => {
  const s = Object.create(ArticleBlockService.prototype);
  beforeEach(() => mockSignaler.mockClear());

  it('article publié : l’équipe est prévenue, une seule fois dans l’heure', async () => {
    const access = { oeuvre: { id_oeuvre: 41, statut: 'publie', titre: { fr: 'Exemple' } } };
    await s._signalerTexteModifie(access, { id_user: 7 });
    await s._signalerTexteModifie(access, { id_user: 7 });
    expect(mockSignaler).toHaveBeenCalledTimes(1);
    expect(mockSignaler).toHaveBeenCalledWith(access.oeuvre, 7, 'a modifié le texte de');
  });

  it('brouillon, ou modification par l’administration : personne n’est dérangé', async () => {
    await s._signalerTexteModifie({ oeuvre: { id_oeuvre: 42, statut: 'brouillon' } }, { id_user: 7 });
    await s._signalerTexteModifie({ oeuvre: { id_oeuvre: 43, statut: 'publie' } }, { id_user: 1, isAdmin: true });
    expect(mockSignaler).not.toHaveBeenCalled();
  });
});
