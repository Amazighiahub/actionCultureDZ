/**
 * Suppression d'un avis : son auteur, ou l'administration et la modération (avant : l'administration
 * était refusée par le service, puis erreur 500).
 */
const CommentaireService = require('../../services/commentaireService');

const creer = () => {
  const s = Object.create(CommentaireService.prototype);
  s.repository = { softDelete: jest.fn().mockResolvedValue(true) };
  return s;
};

describe('deleteCommentaire', () => {
  test("l'auteur supprime son avis", async () => {
    const s = creer();
    await s.deleteCommentaire({ id_user: 5 }, 5);
    expect(s.repository.softDelete).toHaveBeenCalled();
  });
  test('sans contrôle de l’auteur (administration) : supprimé', async () => {
    const s = creer();
    await s.deleteCommentaire({ id_user: 5 }, undefined);
    expect(s.repository.softDelete).toHaveBeenCalled();
  });
  test('un autre membre : 403 (et non 500)', async () => {
    await expect(creer().deleteCommentaire({ id_user: 5 }, 9)).rejects.toMatchObject({ statusCode: 403 });
  });
});
