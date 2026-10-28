/**
 * Avis sur un service : qui peut publier quoi ?
 * Service validé seulement ; pas sur son propre service ; un avis par membre ;
 * une réponse se rattache à un avis du même service et ne porte pas de note.
 */
const CommentaireService = require('../../services/commentaireService');

// Services : 4 (restaurant du pro 37, validé), 5 (en attente)
const services = {
  4: { id: 4, id_user: 37, statut: 'valide' },
  5: { id: 5, id_user: 37, statut: 'en_attente' }
};
// Avis existants : 100 (membre 8 sur le service 4), 200 (membre 9 sur un autre service)
const avisExistants = { 100: { id_commentaire: 100, id_service: 4 }, 200: { id_commentaire: 200, id_service: 6 } };

const makeService = ({ dejaDonne = false } = {}) => {
  const svc = Object.create(CommentaireService.prototype);
  svc.models = { Service: { findByPk: jest.fn(async (id) => services[id] || null) } };
  svc.repository = {
    findById: jest.fn(async (id) => avisExistants[id] || null),
    findAvisServiceDuMembre: jest.fn(async () => (dejaDonne ? { id_commentaire: 1 } : null)),
    createWithAuthor: jest.fn(async (data) => ({ id_commentaire: 999, ...data }))
  };
  return svc;
};

const echec = (promesse) => promesse.then(() => { throw new Error('aurait dû échouer'); }, (e) => e);

describe('CommentaireService.creerAvisService', () => {
  test('un visiteur publie un avis noté sur un service validé', async () => {
    const svc = makeService();
    const avis = await svc.creerAvisService(4, 8, { contenu: 'Très bon accueil', note_qualite: 5 });
    expect(avis).toMatchObject({ id_service: 4, id_user: 8, note_qualite: 5 });
  });

  test('service introuvable ou pas encore validé : 404', async () => {
    expect((await echec(makeService().creerAvisService(999, 8, { contenu: 'abc' }))).statusCode).toBe(404);
    expect((await echec(makeService().creerAvisService(5, 8, { contenu: 'abc' }))).statusCode).toBe(404);
  });

  test('le professionnel ne note pas son propre service : 403', async () => {
    const e = await echec(makeService().creerAvisService(4, 37, { contenu: 'Super', note_qualite: 5 }));
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe('AVIS_PROPRE_SERVICE');
  });

  test('un seul avis par membre : 409', async () => {
    const svc = makeService({ dejaDonne: true });
    const e = await echec(svc.creerAvisService(4, 8, { contenu: 'Encore moi', note_qualite: 1 }));
    expect(e.statusCode).toBe(409);
    expect(svc.repository.createWithAuthor).not.toHaveBeenCalled();
  });

  test('le professionnel répond à un avis de son service, sans note', async () => {
    const svc = makeService();
    const r = await svc.creerAvisService(4, 37, { contenu: 'Merci !', note_qualite: 5, commentaire_parent_id: 100 });
    expect(r).toMatchObject({ commentaire_parent_id: 100, id_service: 4 });
    expect(r.note_qualite).toBeUndefined();
  });

  test('réponse à un avis d’un autre service : 404', async () => {
    const e = await echec(makeService().creerAvisService(4, 37, { contenu: 'Merci', commentaire_parent_id: 200 }));
    expect(e.statusCode).toBe(404);
  });
});
