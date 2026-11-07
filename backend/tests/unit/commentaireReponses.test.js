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

describe('notes des œuvres et des événements', () => {
  const avecNote = (dejaNote) => {
    const repository = { createWithAuthor: jest.fn(async (d) => d), dejaNote: jest.fn(async () => dejaNote) };
    const s = Object.create(CommentaireService.prototype);
    s.repository = repository;
    return { s, repository };
  };
  test('première note : gardée, propriétaire jamais enregistré', async () => {
    const { s, repository } = avecNote(false);
    await s.createCommentaire({ contenu: 'bien', note_qualite: 4, id_oeuvre: 1, id_user: 3, id_proprietaire: 9 });
    expect(repository.createWithAuthor).toHaveBeenCalledWith({ contenu: 'bien', note_qualite: 4, id_oeuvre: 1, id_user: 3 });
  });
  test('deuxième note de la même personne : commentaire gardé, sans note', async () => {
    const { s, repository } = avecNote(true);
    await s.createCommentaire({ contenu: 'encore', note_qualite: 5, id_evenement: 2, id_user: 3, id_proprietaire: 9 });
    expect(repository.dejaNote).toHaveBeenCalledWith('id_evenement', 2, 3);
    expect(repository.createWithAuthor).toHaveBeenCalledWith(expect.objectContaining({ note_qualite: null }));
  });
  test('l’auteur ne note pas sa propre œuvre', async () => {
    const { s, repository } = avecNote(false);
    await s.createCommentaire({ contenu: 'merci', note_qualite: 5, id_oeuvre: 1, id_user: 9, id_proprietaire: 9 });
    expect(repository.createWithAuthor).toHaveBeenCalledWith(expect.objectContaining({ note_qualite: null }));
  });
  test('modifier : pas de note ajoutée à un commentaire qui n’en avait pas', async () => {
    const s = Object.create(CommentaireService.prototype);
    const inst = { note_qualite: null, commentaire_parent_id: null, update: jest.fn() };
    await s.updateCommentaire(inst, { contenu: 'x', note_qualite: 5 });
    expect(inst.update).toHaveBeenCalledWith(expect.not.objectContaining({ note_qualite: 5 }));
    const note = { note_qualite: 2, commentaire_parent_id: null, update: jest.fn() };
    await s.updateCommentaire(note, { note_qualite: 4 });
    expect(note.update).toHaveBeenCalledWith(expect.objectContaining({ note_qualite: 4 }));
  });
});
