/**
 * Contrôles d'accès (audit V3, gravité moyenne) : organisation, œuvres d'événement,
 * artisanat, statut d'intervenant, statut de parcours, liaison d'intervenant.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const OrganisationService = require('../../services/organisations/organisationService');
const EvenementService = require('../../services/evenement/evenementService');
const ArtisanatService = require('../../services/artisanat/artisanatService');
const ProgrammeService = require('../../services/programmeService');
const ParcoursService = require('../../services/parcours/parcoursService');

describe('Organisation : plus d\'adhésion automatique', () => {
  it('nom déjà existant : 409, aucun rattachement', async () => {
    const repository = { findByName: jest.fn().mockResolvedValue({ id_organisation: 3 }), linkUser: jest.fn(), create: jest.fn() };
    const svc = new OrganisationService(repository, {});
    await expect(svc.create({ nom: 'Maison de la culture' }, 7)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.linkUser).not.toHaveBeenCalled();
  });
});

describe('Événement : organisation et œuvres', () => {
  const makeEventService = ({ membership = null, evenement = { id_evenement: 5, id_user: 1, statut: 'planifie' }, participation = null } = {}) => {
    const repository = {
      findById: jest.fn().mockResolvedValue(evenement),
      findOeuvreByOwner: jest.fn().mockResolvedValue({ id_oeuvre: 9 }),
      findEvenementOeuvre: jest.fn().mockResolvedValue(null),
      addOeuvreToEvent: jest.fn().mockResolvedValue({ ok: true })
    };
    const models = {
      UserOrganisation: { findOne: jest.fn().mockResolvedValue(membership) },
      EvenementUser: { findOne: jest.fn().mockResolvedValue(participation) }
    };
    return { svc: new EvenementService(repository, { models }), repository, models };
  };

  it('non membre de l\'organisation : refusé', async () => {
    const { svc } = makeEventService();
    await expect(svc._assertOrganisationMember(3, 7, false)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('membre désactivé : refusé ; membre actif ou admin : accepté', async () => {
    await expect(makeEventService({ membership: { actif: false } }).svc._assertOrganisationMember(3, 7, false))
      .rejects.toMatchObject({ statusCode: 403 });
    await expect(makeEventService({ membership: { actif: true } }).svc._assertOrganisationMember(3, 7, false)).resolves.toBeUndefined();
    await expect(makeEventService().svc._assertOrganisationMember(3, 7, true)).resolves.toBeUndefined();
  });

  it('ajouter son œuvre à l\'événement d\'un autre sans y participer : refusé', async () => {
    const { svc, repository } = makeEventService();
    await expect(svc.addOeuvreToEvent(5, 9, 7)).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.addOeuvreToEvent).not.toHaveBeenCalled();
  });
  it('participant confirmé ou organisateur : accepté', async () => {
    await expect(makeEventService({ participation: { statut_participation: 'confirme' } }).svc.addOeuvreToEvent(5, 9, 7)).resolves.toBeDefined();
    await expect(makeEventService().svc.addOeuvreToEvent(5, 9, 1)).resolves.toBeDefined();
  });
  it('événement annulé : refusé', async () => {
    const { svc } = makeEventService({ evenement: { id_evenement: 5, id_user: 1, statut: 'annule' } });
    await expect(svc.addOeuvreToEvent(5, 9, 1)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Artisanat : œuvre parente', () => {
  const makeSvc = ({ owner = 7, existing = 0 } = {}) => {
    const repository = { create: jest.fn().mockResolvedValue({ id_artisanat: 1 }), findWithFullDetails: jest.fn().mockResolvedValue({ id_artisanat: 1 }) };
    const models = {
      Oeuvre: { findByPk: jest.fn().mockResolvedValue({ id_oeuvre: 9, saisi_par: owner }) },
      Artisanat: { count: jest.fn().mockResolvedValue(existing) }
    };
    return { svc: new ArtisanatService(repository, { models }), repository };
  };
  it('œuvre d\'un autre : refusé', async () => {
    const { svc, repository } = makeSvc({ owner: 8 });
    await expect(svc.create({ id_oeuvre: 9 }, 7)).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('œuvre ayant déjà un artisanat : 409', async () => {
    const { svc } = makeSvc({ existing: 1 });
    await expect(svc.create({ id_oeuvre: 9 }, 7)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('Programme : statut d\'un intervenant', () => {
  const makeSvc = (intervenantUserId) => {
    const pi = { update: jest.fn() };
    const repository = { model: { findByPk: jest.fn().mockResolvedValue({ Evenement: { id_user: 1 } }) } };
    const models = {
      Evenement: {},
      Intervenant: { findByPk: jest.fn().mockResolvedValue({ id_intervenant: 4, id_user: intervenantUserId }) },
      ProgrammeIntervenant: { findOne: jest.fn().mockResolvedValue(pi) }
    };
    return { svc: new ProgrammeService(repository, { models }), pi };
  };
  it('utilisateur dont l\'id_user égale par hasard l\'id_intervenant : refusé', async () => {
    const { svc, pi } = makeSvc(99); // l'intervenant 4 appartient au compte 99
    const res = await svc.updateIntervenantStatus(10, 4, 4, 'decline');
    expect(res.error).toBe('forbidden');
    expect(pi.update).not.toHaveBeenCalled();
  });
  it('le vrai intervenant peut confirmer', async () => {
    const { svc, pi } = makeSvc(99);
    const res = await svc.updateIntervenantStatus(10, 4, 99, 'confirme');
    expect(res.success).toBe(true);
    expect(pi.update).toHaveBeenCalled();
  });
});

describe('Parcours : statut réservé à la modération', () => {
  const makeSvc = () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id_parcours: 1, id_createur: 7 }),
      update: jest.fn().mockResolvedValue([1]),
      findWithFullDetails: jest.fn().mockResolvedValue({ id_parcours: 1 })
    };
    return { svc: new ParcoursService(repository, {}), repository };
  };
  it('le créateur ne peut pas réactiver un parcours', async () => {
    const { svc, repository } = makeSvc();
    await svc.update(1, { statut: 'actif', theme: 'x' }, 7, false);
    expect(repository.update.mock.calls[0][1]).not.toHaveProperty('statut');
  });
  it('l\'admin peut changer le statut', async () => {
    const { svc, repository } = makeSvc();
    await svc.update(1, { statut: 'inactif' }, 1, true);
    expect(repository.update.mock.calls[0][1].statut).toBe('inactif');
  });
});
