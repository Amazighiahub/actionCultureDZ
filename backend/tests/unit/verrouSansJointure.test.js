/**
 * Lecture verrouillée (FOR UPDATE) : seulement la ligne demandée. Avec les jointures par défaut, MySQL
 * verrouillait aussi le type d'événement, le lieu et le compte de l'organisateur (audit V11 BDD-2).
 */
const BaseRepository = require('../../repositories/baseRepository');

const depot = () => {
  const model = { findByPk: jest.fn().mockResolvedValue({ id: 1 }), name: 'Evenement' };
  const repo = new BaseRepository(model);
  repo._defaultIncludes = () => [{ as: 'TypeEvenement' }, { as: 'Lieu' }, { as: 'Organisateur' }];
  return { repo, model };
};

describe('lecture verrouillée sans jointure (audit V11 BDD-2)', () => {
  it('verrou : aucune jointure', async () => {
    const { repo, model } = depot();
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    await repo.findById(1, { transaction, lock: 'UPDATE' });
    expect(model.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: [], lock: 'UPDATE', transaction }));
  });

  it('lecture ordinaire : jointures par défaut gardées', async () => {
    const { repo, model } = depot();
    await repo.findById(1);
    expect(model.findByPk.mock.calls[0][1].include.map((i) => i.as)).toEqual(['TypeEvenement', 'Lieu', 'Organisateur']);
  });

  it('verrou avec jointures demandées explicitement : respectées', async () => {
    const { repo, model } = depot();
    await repo.findById(1, { lock: 'UPDATE', include: [{ as: 'Lieu' }] });
    expect(model.findByPk.mock.calls[0][1].include).toEqual([{ as: 'Lieu' }]);
  });
});
