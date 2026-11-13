/**
 * Rattacher à un événement l'article publié d'un autre auteur (accord de la responsable, 2026-11-13) :
 * organisateur ou administration seulement ; articles (types 4 et 5) publiés seulement ; l'organisateur
 * voit et retire toutes les œuvres rattachées.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const EvenementService = require('../../services/evenement/evenementService');

const service = ({ organisateur = 37, propre = null, article = { id_oeuvre: 50 }, participant = null } = {}) => {
  const s = Object.create(EvenementService.prototype);
  s.repository = {
    findById: jest.fn().mockResolvedValue({ id_evenement: 2, id_user: organisateur, statut: 'planifie' }),
    findOeuvreByOwner: jest.fn().mockResolvedValue(propre),
    findEvenementOeuvre: jest.fn().mockResolvedValue(null),
    addOeuvreToEvent: jest.fn().mockResolvedValue({ id: 1 }),
    removeOeuvreFromEvent: jest.fn().mockResolvedValue(1),
    getOeuvresForUser: jest.fn().mockResolvedValue({ oeuvresAjoutees: [], toutesOeuvres: [] })
  };
  s.models = {
    Oeuvre: { findOne: jest.fn().mockResolvedValue(article), findAll: jest.fn().mockResolvedValue([]) },
    EvenementUser: { findOne: jest.fn().mockResolvedValue(participant) },
    EvenementOeuvre: { findAll: jest.fn().mockResolvedValue([{ id_oeuvre: 7 }]) }
  };
  return s;
};

describe('articles d’autres auteurs dans un événement', () => {
  it('l’organisateur rattache un article publié d’un autre auteur (types 4 et 5, publié)', async () => {
    const s = service();
    await s.addOeuvreToEvent(2, 50, 37);
    expect(s.models.Oeuvre.findOne.mock.calls[0][0].where).toMatchObject({ id_oeuvre: 50, statut: 'publie', id_type_oeuvre: [4, 5] });
    expect(s.repository.addOeuvreToEvent).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 50, id_presentateur: 37 }));
  });

  it('un participant confirmé ne rattache que ses propres œuvres ; livre d’un autre : introuvable', async () => {
    const s = service({ participant: { statut_participation: 'confirme' } });
    await expect(s.addOeuvreToEvent(2, 50, 71)).rejects.toMatchObject({ statusCode: 404 });
    expect(s.models.Oeuvre.findOne).not.toHaveBeenCalled();
    await expect(service({ article: null }).addOeuvreToEvent(2, 51, 37)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('l’organisateur voit et retire toutes les œuvres rattachées ; un participant seulement les siennes', async () => {
    const s = service();
    await s.getMesOeuvres(2, 37);
    expect(s.repository.getOeuvresForUser).toHaveBeenCalledWith(2, 37, { toutesAjoutees: true });
    await s.removeOeuvreFromEvent(2, 50, 37);
    expect(s.repository.removeOeuvreFromEvent).toHaveBeenCalledWith(2, 50, null);
    await s.removeOeuvreFromEvent(2, 50, 71);
    expect(s.repository.removeOeuvreFromEvent).toHaveBeenLastCalledWith(2, 50, 71);
  });

  it('recherche : organisateur seulement, articles publiés, déjà rattachés exclus, % et _ échappés', async () => {
    const s = service();
    await expect(s.articlesARattacher(2, 71, 'chantier')).rejects.toMatchObject({ statusCode: 403 });
    await s.articlesARattacher(2, 37, 'Ghoufi_50%');
    const where = s.models.Oeuvre.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ statut: 'publie', id_type_oeuvre: [4, 5] });
    const { Op } = require('sequelize');
    const bs = String.fromCharCode(92);
    expect(where.texte_recherche[Op.like]).toBe(`%Ghoufi${bs}_50${bs}%%`);
    expect(where.id_oeuvre[Op.notIn]).toEqual([7]);
    await expect(s.articlesARattacher(2, 37, 'a')).resolves.toEqual([]);
  });
});
