/**
 * Mots-clés des événements (même table que les œuvres) : lecture du champ du formulaire
 * et remplacement des mots-clés d'un événement.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const { lireTags, resolveTagIds } = require('../../helpers/tags');
const EvenementService = require('../../services/evenement/evenementService');

describe('helpers/tags', () => {
  it('lireTags : tableau, JSON du formulaire, texte à virgules, absent', () => {
    expect(lireTags(['Poterie', 'Conte'])).toEqual(['Poterie', 'Conte']);
    expect(lireTags('["Poterie","Béjaïa"]')).toEqual(['Poterie', 'Béjaïa']);
    expect(lireTags('poterie, conte')).toEqual(['poterie', 'conte']);
    expect(lireTags('')).toEqual([]);
    expect(lireTags(undefined)).toBeNull();
  });

  it('resolveTagIds : réutilise un mot-clé existant (sans casse, toute langue), crée les autres', async () => {
    const TagMotCle = fausseTable([{ id_tag: 3, nom: { fr: 'Poterie', ar: 'فخار' } }]);
    const ids = await resolveTagIds({ TagMotCle }, ['فخار', 'POTERIE', 'Conte', 3], null);
    expect(ids.sort((a, b) => a - b)).toEqual([3, 4]);
    expect(TagMotCle.create).toHaveBeenCalledTimes(1);
    expect(TagMotCle.create).toHaveBeenCalledWith({ nom: { fr: 'Conte' } }, expect.anything());
  });

  it('resolveTagIds : mot-clé créé au même moment par une autre requête → on reprend celui-là', async () => {
    const TagMotCle = fausseTable([]);
    TagMotCle.create.mockImplementationOnce(async () => {
      TagMotCle.lignes.push({ id_tag: 7, nom: { fr: 'conte' } });
      const e = new Error('Duplicate'); e.name = 'SequelizeUniqueConstraintError'; throw e;
    });
    expect(await resolveTagIds({ TagMotCle }, ['Conte'], null)).toEqual([7]);
  });
});

/** Table tagmotcle simulée : renvoie tous les mots-clés (la fonction recalcule la clé depuis le nom),
 *  recherche exacte dans toutes les langues pour findOne */
function fausseTable(lignes) {
  const table = {
    lignes,
    findAll: jest.fn(async () => table.lignes),
    findOne: jest.fn(async ({ where }) => {
      const valeur = where.attribute.args[2];
      return table.lignes.find((l) => Object.values(l.nom).some((v) => String(v).toLowerCase() === valeur)) || null;
    }),
    create: jest.fn(async ({ nom }) => {
      const ligne = { id_tag: Math.max(0, ...table.lignes.map((l) => l.id_tag)) + 1, nom };
      table.lignes.push(ligne);
      return ligne;
    })
  };
  return table;
}

describe('EvenementService._syncTags', () => {
  const makeSvc = () => {
    const svc = Object.create(EvenementService.prototype);
    svc.models = {
      EvenementTag: { destroy: jest.fn(), bulkCreate: jest.fn() },
      TagMotCle: fausseTable([{ id_tag: 3, nom: { fr: 'Poterie' } }])
    };
    return svc;
  };

  it('remplace les mots-clés de l’événement', async () => {
    const svc = makeSvc();
    await svc._syncTags(1, '["Poterie"]', 'tx');
    expect(svc.models.EvenementTag.destroy).toHaveBeenCalledWith({ where: { id_evenement: 1 }, transaction: 'tx' });
    expect(svc.models.EvenementTag.bulkCreate).toHaveBeenCalledWith([{ id_evenement: 1, id_tag: 3 }], expect.anything());
  });

  it('champ absent : les mots-clés existants ne sont pas touchés', async () => {
    const svc = makeSvc();
    await svc._syncTags(1, undefined, 'tx');
    expect(svc.models.EvenementTag.destroy).not.toHaveBeenCalled();
  });
});
