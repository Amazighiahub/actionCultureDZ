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

  it('resolveTagIds : réutilise un mot-clé existant (toute langue), crée les autres', async () => {
    const models = {
      TagMotCle: {
        findAll: jest.fn().mockResolvedValue([{ id_tag: 3, nom: { fr: 'Poterie', ar: 'فخار' } }]),
        bulkCreate: jest.fn().mockResolvedValue([{ id_tag: 9, nom: { fr: 'Conte' } }])
      }
    };
    const ids = await resolveTagIds(models, ['فخار', 'Conte', 3], null);
    expect(ids.sort()).toEqual([3, 9]);
    expect(models.TagMotCle.bulkCreate).toHaveBeenCalledWith([{ nom: { fr: 'Conte' } }], expect.anything());
  });
});

describe('EvenementService._syncTags', () => {
  const makeSvc = () => {
    const svc = Object.create(EvenementService.prototype);
    svc.models = {
      EvenementTag: { destroy: jest.fn(), bulkCreate: jest.fn() },
      TagMotCle: { findAll: jest.fn().mockResolvedValue([{ id_tag: 3, nom: { fr: 'Poterie' } }]), bulkCreate: jest.fn().mockResolvedValue([]) }
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
