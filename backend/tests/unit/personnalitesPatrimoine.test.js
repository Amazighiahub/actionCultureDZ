/**
 * Personnalités d'un site patrimonial : création d'une fiche rattachée au site, droits de
 * modification de son auteur, retrait protégé.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const PatrimoineService = require('../../services/patrimoine/patrimoineService');
const IntervenantService = require('../../services/intervenantService');

const sequelize = { literal: jest.fn(s => ({ literal: s })), escape: (v) => `'${v}'` };

const makePatrimoine = ({ memes = [], lien = null, site = { id_createur: 5 } } = {}) => {
  const models = {
    Lieu: { findByPk: jest.fn().mockResolvedValue({ id_lieu: 39, ...site }) },
    Intervenant: {
      sequelize,
      findAll: jest.fn().mockResolvedValue(memes),
      create: jest.fn(async (d) => ({ id_intervenant: 77, ...d, toJSON() { return { id_intervenant: 77, ...d }; } }))
    },
    LieuIntervenant: {
      max: jest.fn().mockResolvedValue(2),
      create: jest.fn(async (d) => ({ toJSON: () => ({ id_lieu_intervenant: 9, ...d }) })),
      findOne: jest.fn().mockResolvedValue(lien)
    }
  };
  const repository = { withTransaction: jest.fn(async (cb) => cb({})) };
  return { service: new PatrimoineService(repository, { models }), models };
};

describe('PatrimoineService.creerPersonnalite', () => {
  it('fiche créée (nom, dates, biographie) et rattachée au site, à la suite, avec son contributeur', async () => {
    const { service, models } = makePatrimoine();
    const res = await service.creerPersonnalite(39, {
      prenom: 'Mohand', nom: 'Ouhammou', titre_professionnel: 'Potier', date_naissance: '1902-03-01',
      biographie: { fr: 'Maître potier d’Aït Smaïl.' }, role_sur_site: 'artisan', periode: 'XXe siècle'
    }, { userId: 60 });
    expect(models.Intervenant.create).toHaveBeenCalledWith(expect.objectContaining({
      nom: { fr: 'Ouhammou' }, prenom: { fr: 'Mohand' }, titre_professionnel: 'Potier',
      date_naissance: '1902-03-01', biographie: { fr: 'Maître potier d’Aït Smaïl.' }
    }), expect.anything());
    expect(models.LieuIntervenant.create).toHaveBeenCalledWith(expect.objectContaining({
      id_lieu: 39, id_intervenant: 77, role_sur_site: 'artisan', periode: 'XXe siècle', ordre: 3, id_contributeur: 60
    }), expect.anything());
    expect(res.Intervenant.id_intervenant).toBe(77);
  });

  it('même prénom et nom (accents ignorés) : 409, rien n’est créé', async () => {
    const { service, models } = makePatrimoine({ memes: [{ id_intervenant: 12, prenom: { fr: 'Mohand' } }] });
    await expect(service.creerPersonnalite(39, { prenom: 'MOHAND', nom: 'Ouhammou' }, { userId: 60 }))
      .rejects.toMatchObject({ statusCode: 409, code: 'PERSONNALITE_EXISTANTE' });
    expect(models.Intervenant.create).not.toHaveBeenCalled();
  });

  it('sans nom : refusé', async () => {
    const { service } = makePatrimoine();
    await expect(service.creerPersonnalite(39, { prenom: 'Mohand' }, { userId: 60 })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('PatrimoineService.retirerPersonnalite', () => {
  const lien = (contributeur) => ({ id_contributeur: contributeur, destroy: jest.fn() });

  it('contributeur, créateur du site ou modération : retiré ; autre compte : interdit', async () => {
    expect(await makePatrimoine({ lien: lien(60) }).service.retirerPersonnalite(39, 9, { userId: 60 })).toBe('ok');
    expect(await makePatrimoine({ lien: lien(60), site: { id_createur: 5 } }).service.retirerPersonnalite(39, 9, { userId: 5 })).toBe('ok');
    expect(await makePatrimoine({ lien: lien(60) }).service.retirerPersonnalite(39, 9, { userId: 1, isModerator: true })).toBe('ok');
    const autre = makePatrimoine({ lien: lien(60) });
    expect(await autre.service.retirerPersonnalite(39, 9, { userId: 99 })).toBe('interdit');
    expect(await makePatrimoine({ lien: null }).service.retirerPersonnalite(39, 9, { userId: 60 })).toBe('introuvable');
  });
});

describe('IntervenantService — personnalités', () => {
  const makeIntervenant = ({ programmes = [], sites = [], idUser = null } = {}) => {
    const svc = Object.create(IntervenantService.prototype);
    svc.models = {
      Intervenant: { findByPk: jest.fn().mockResolvedValue({ id_intervenant: 77, id_user: idUser }) },
      ProgrammeIntervenant: { findAll: jest.fn().mockResolvedValue(programmes.map((_, i) => ({ id_programme: i + 1 }))) },
      Programme: { findAll: jest.fn().mockResolvedValue(programmes.map(e => ({ id_evenement: e }))) },
      Evenement: { findAll: jest.fn().mockResolvedValue(programmes.map(() => ({ id_user: 60 }))) },
      LieuIntervenant: { findAll: jest.fn().mockResolvedValue(sites.map(c => ({ id_contributeur: c }))) },
      Oeuvre: { findByPk: jest.fn() },
      TypeUser: { findByPk: jest.fn() },
      OeuvreIntervenant: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() }
    };
    return svc;
  };

  it('personnalité rattachée par ce compte seulement : il peut modifier sa fiche', async () => {
    expect((await makeIntervenant({ sites: [60] }).droitsEdition(77, { id_user: 60 })).peutModifier).toBe(true);
    expect((await makeIntervenant({ sites: [60, 99] }).droitsEdition(77, { id_user: 60 })).peutModifier).toBe(false);
    expect((await makeIntervenant({ sites: [60], programmes: [1] }).droitsEdition(77, { id_user: 60 })).peutModifier).toBe(true);
    expect((await makeIntervenant({}).droitsEdition(77, { id_user: 60 })).peutModifier).toBe(false);
  });
});
