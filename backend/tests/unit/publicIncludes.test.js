/**
 * Les includes utilisés par les routes publiques ne doivent contenir
 * ni email, ni téléphone, ni notes internes.
 */
const EvenementRepository = require('../../repositories/evenementRepository');
const ProgrammeRepository = require('../../repositories/programmeRepository');
const IntervenantRepository = require('../../repositories/intervenantRepository');

const PRIVATE_KEYS = ['email', 'telephone', 'date_naissance', 'lieu_naissance', 'notes_organisateur'];

// Parcourt récursivement des includes Sequelize et collecte les attributs demandés
const collectAttributes = (includes, acc = []) => {
  for (const inc of includes || []) {
    if (Array.isArray(inc.attributes)) acc.push(...inc.attributes);
    if (inc.include) collectAttributes(inc.include, acc);
  }
  return acc;
};

const fakeModel = () => ({ sequelize: {}, findAll: jest.fn().mockResolvedValue([]), findByPk: jest.fn().mockResolvedValue(null), findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) });

describe('Includes publics', () => {
  it('événement : Organisateur sans email', () => {
    const models = { Evenement: fakeModel(), User: {}, Lieu: {}, TypeEvenement: {} };
    const repo = new EvenementRepository(models);
    const attrs = collectAttributes(repo._defaultIncludes());
    for (const k of PRIVATE_KEYS) expect(attrs).not.toContain(k);
  });

  it('programme : intervenants et compte lié sans email ni téléphone, sans notes internes', async () => {
    const models = { Programme: fakeModel(), Lieu: {}, Intervenant: {}, ProgrammeIntervenant: {}, User: {} };
    const repo = new ProgrammeRepository(models);
    const attrs = collectAttributes(repo._defaultIncludes());
    for (const k of PRIVATE_KEYS) expect(attrs).not.toContain(k);
    await repo.findByEvenement(5);
    expect(models.Programme.findAll.mock.calls[0][0].attributes).toEqual({ exclude: ['notes_organisateur'] });
  });

  it('intervenants : liste et détail limités à la fiche publique, actifs par défaut', async () => {
    const models = { Intervenant: fakeModel(), User: {}, Programme: {} };
    const repo = new IntervenantRepository(models);
    await repo.findFiltered({ order: 'date_creation' });
    const listQuery = models.Intervenant.findAndCountAll.mock.calls[0][0];
    for (const k of PRIVATE_KEYS) expect(listQuery.attributes).not.toContain(k);
    expect(listQuery.where.actif).toBe(true);
    for (const k of PRIVATE_KEYS) expect(collectAttributes(listQuery.include)).not.toContain(k);

    await repo.findWithProgrammes(3);
    const detail = models.Intervenant.findByPk.mock.calls[0][1];
    for (const k of PRIVATE_KEYS) expect(detail.attributes).not.toContain(k);
  });
});
