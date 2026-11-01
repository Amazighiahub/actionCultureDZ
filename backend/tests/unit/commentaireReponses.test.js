/**
 * Réponses aux commentaires : même contenu, commentaire publié, un seul niveau ;
 * pas de commentaire sur une œuvre non publiée.
 */
const CommentaireService = require('../../services/commentaireService');

const service = (parent) => {
  const repository = {
    findById: jest.fn(async () => parent),
    createWithAuthor: jest.fn(async (d) => d)
  };
  const s = Object.create(CommentaireService.prototype);
  s.repository = repository;
  s.models = { Oeuvre: { findByPk: jest.fn(async (id) => ({ id_oeuvre: id, statut: id === 1 ? 'publie' : 'brouillon' })) } };
  return { s, repository };
};

describe('createCommentaire avec réponse', () => {
  test('réponse à une réponse : rattachée au commentaire de départ, sans note', async () => {
    const { s, repository } = service({ id_commentaire: 12, commentaire_parent_id: 10, statut: 'publie', id_oeuvre: 1 });
    await s.createCommentaire({ contenu: 'ok', note_qualite: 5, commentaire_parent_id: 12, id_oeuvre: 1, id_user: 3 });
    expect(repository.createWithAuthor).toHaveBeenCalledWith(expect.objectContaining({ commentaire_parent_id: 10, note_qualite: null }));
  });

  test('commentaire d\'une autre œuvre ou masqué : 404', async () => {
    for (const parent of [
      { id_commentaire: 12, statut: 'publie', id_oeuvre: 2 },
      { id_commentaire: 12, statut: 'en_attente', id_oeuvre: 1 },
      null
    ]) {
      const { s, repository } = service(parent);
      await expect(s.createCommentaire({ contenu: 'x', commentaire_parent_id: 12, id_oeuvre: 1, id_user: 3 }))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(repository.createWithAuthor).not.toHaveBeenCalled();
    }
  });

  test('œuvre non publiée : introuvable pour commenter', async () => {
    const { s } = service(null);
    expect(await s.findOeuvre(2)).toBeNull();
    expect(await s.findOeuvre(1)).toMatchObject({ id_oeuvre: 1 });
  });
});
