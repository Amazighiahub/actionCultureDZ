/**
 * ProgrammeService — intervenants d'une activité (avec ou sans compte sur le site).
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const ProgrammeService = require('../../services/programmeService');

const makeService = ({ existants = [], programme } = {}) => {
  const transaction = { commit: jest.fn(), rollback: jest.fn() };
  const sequelize = {
    transaction: jest.fn().mockResolvedValue(transaction),
    where: jest.fn((a, b) => ({ a, b })), fn: jest.fn((...x) => x), col: jest.fn(c => c)
  };
  const models = {
    Evenement: { findByPk: jest.fn().mockResolvedValue({ id_evenement: 5, id_user: 7, statut: 'publie' }) },
    Lieu: { findByPk: jest.fn() },
    Intervenant: {
      findByPk: jest.fn(async (id) => existants.find(i => i.id_intervenant === id) || null),
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(async () => existants),
      create: jest.fn(async (d) => ({ id_intervenant: 99, ...d }))
    },
    ProgrammeIntervenant: { create: jest.fn(), destroy: jest.fn() },
    User: { findOne: jest.fn() }
  };
  const repository = {
    model: { sequelize, findByPk: jest.fn().mockResolvedValue(programme) },
    create: jest.fn(async (d) => ({ id_programme: 1, ...d })),
    getNextOrdre: jest.fn().mockResolvedValue(1)
  };
  const service = new ProgrammeService(repository, { models });
  service._getProgrammeComplet = jest.fn(async (id) => ({ id_programme: id }));
  return { service, models };
};

describe('ProgrammeService — intervenants', () => {
  it('noms de champs du formulaire (role_intervenant, sujet_intervention…) enregistrés', async () => {
    const { service, models } = makeService({ existants: [{ id_intervenant: 13, nom: { fr: 'Hammouche' }, prenom: { fr: 'Noureddine' } }] });
    await service.createProgramme(5, 7, 'fr', {
      titre: { fr: 'Conférence' }, description: { fr: 'Débat' },
      intervenants: [{ id_intervenant: 13, role_intervenant: 'principal', sujet_intervention: 'Symboles', biographie_courte: 'Artiste peintre' }]
    });
    expect(models.ProgrammeIntervenant.create).toHaveBeenCalledWith(expect.objectContaining({
      id_programme: 1, id_intervenant: 13, role_intervenant: 'principal', sujet_intervention: 'Symboles', biographie_courte: 'Artiste peintre'
    }), expect.anything());
  });

  it('même prénom + nom qu’un intervenant existant : réutilisé, pas de doublon', async () => {
    const { service, models } = makeService({ existants: [{ id_intervenant: 13, nom: { fr: 'Hammouche' }, prenom: { fr: 'Noureddine' } }] });
    await service.createProgramme(5, 7, 'fr', { titre: { fr: 'Atelier' }, description: { fr: 'x' }, intervenants: [{ prenom: 'noureddine', nom: 'Hammouche', role_intervenant: 'animateur' }] });
    expect(models.Intervenant.create).not.toHaveBeenCalled();
    expect(models.ProgrammeIntervenant.create).toHaveBeenCalledWith(expect.objectContaining({ id_intervenant: 13, role_intervenant: 'animateur' }), expect.anything());
  });

  it('nouvel intervenant sans compte : fiche créée avec son nom', async () => {
    const { service, models } = makeService();
    await service.createProgramme(5, 7, 'fr', { titre: { fr: 'Atelier' }, description: { fr: 'x' }, intervenants: [{ prenom: 'Mina', nom: 'Benmihoub' }] });
    expect(models.Intervenant.create).toHaveBeenCalledWith(expect.objectContaining({ nom: { fr: 'Benmihoub' }, prenom: { fr: 'Mina' } }), expect.anything());
  });

  it('ligne sans nom ni fiche : refusée', async () => {
    const { service } = makeService();
    await expect(service.createProgramme(5, 7, 'fr', { titre: { fr: 'A' }, description: { fr: 'x' }, intervenants: [{ prenom: ' ', nom: '' }] }))
      .rejects.toThrow(/nom/);
  });

  it('modification : la liste envoyée remplace celle de l’activité ; absente, rien ne change', async () => {
    const programme = { titre: {}, description: {}, Evenement: { id_user: 7, statut: 'publie' }, update: jest.fn() };
    const a = makeService({ programme, existants: [{ id_intervenant: 12, nom: { fr: 'Abdoune' }, prenom: { fr: 'Soltana' } }] });
    await a.service.updateProgramme(2, 7, 'fr', { intervenants: [{ id_intervenant: 12, role_intervenant: 'animateur' }] });
    expect(a.models.ProgrammeIntervenant.destroy).toHaveBeenCalledWith({ where: { id_programme: 2 }, transaction: expect.anything() });
    expect(a.models.ProgrammeIntervenant.create).toHaveBeenCalledWith(expect.objectContaining({ id_programme: 2, id_intervenant: 12 }), expect.anything());

    const b = makeService({ programme });
    await b.service.updateProgramme(2, 7, 'fr', { heure_debut: '10:00' });
    expect(b.models.ProgrammeIntervenant.destroy).not.toHaveBeenCalled();
  });
});
