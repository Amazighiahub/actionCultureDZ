/** Photos envoyées sans compte : effacées après 2 h si aucun compte ne les utilise (Cloudinary simulé) */
const { nettoyerQuarantaine } = require('../../services/nettoyageQuarantaine');

describe('nettoyage de la quarantaine', () => {
  it('efface les vieilles photos sans compte, garde les récentes et celles utilisées', async () => {
    const maintenant = Date.parse('2026-11-07T12:00:00Z');
    const deleteAsset = jest.fn(async () => ({ result: 'ok' }));
    const estUtilisee = jest.fn(async (r) => r.public_id.endsWith('utilisee'));
    const deps = {
      maintenant,
      estUtilisee,
      adopter: async () => true,
      FOLDERS: { quarantaine: 'eventculture/quarantaine' },
      deleteAsset,
      cloudinary: { api: { resources: jest.fn(async () => ({ resources: [
        { public_id: 'eventculture/quarantaine/vieille', created_at: '2026-11-07T08:00:00Z' },
        { public_id: 'eventculture/quarantaine/recente', created_at: '2026-11-07T11:30:00Z' },
        { public_id: 'eventculture/quarantaine/utilisee', created_at: '2026-11-07T07:00:00Z' },
      ] })) } },
    };
    const { Op } = require('sequelize');
    const models = { User: { count: jest.fn(async ({ where }) => (where.photo_url[Op.like].includes('utilisee') ? 1 : 0)) } };
    const bilan = await nettoyerQuarantaine(models, deps);
    expect(bilan).toEqual({ vues: 3, effacees: 1, gardees: 1, echecs: 0, sorties: 1 });
    expect(deleteAsset).toHaveBeenCalledTimes(1);
    expect(deleteAsset).toHaveBeenCalledWith('eventculture/quarantaine/vieille', 'image');
  });
});

describe('quarantaine : pages et échecs', () => {
  it('lit toutes les pages, et un effacement refusé n’est pas compté comme fait', async () => {
    const vieille = (id) => ({ public_id: `eventculture/quarantaine/${id}`, created_at: '2026-11-01T00:00:00Z', secure_url: `https://res.cloudinary.com/x/${id}` });
    const resources = jest.fn()
      .mockResolvedValueOnce({ resources: [vieille('a')], next_cursor: 'suite' })
      .mockResolvedValueOnce({ resources: [vieille('b')] });
    const deleteAsset = jest.fn().mockResolvedValueOnce({ result: 'ok' }).mockResolvedValueOnce(null);
    const bilan = await nettoyerQuarantaine({ User: {} }, {
      maintenant: Date.parse('2026-11-07T12:00:00Z'), FOLDERS: { quarantaine: 'eventculture/quarantaine' },
      deleteAsset, estUtilisee: async () => false, cloudinary: { api: { resources } },
    });
    expect(resources).toHaveBeenCalledTimes(2);
    expect(resources.mock.calls[1][0]).toMatchObject({ next_cursor: 'suite' });
    expect(bilan).toEqual({ vues: 2, effacees: 1, gardees: 0, echecs: 1, sorties: 0 });
  });
});
