/** Page d'une wilaya et lien entre une œuvre et un lieu */
const { Op } = require('sequelize');
const PatrimoineService = require('../../services/patrimoine/patrimoineService');
const { vitrineWilaya } = require('../../services/wilayaVitrine');

describe('relier une œuvre à un lieu', () => {
  const service = ({ oeuvre, contributions = 0, nombre = 0, lieu = { id_lieu: 3, statut: 'publie', id_createur: 50 } }) => {
    const s = Object.create(PatrimoineService.prototype);
    const LieuOeuvre = {
      count: jest.fn(async () => nombre),
      max: jest.fn(async () => 2),
      findOrCreate: jest.fn(async ({ where, defaults }) => [{ ...where, ...defaults }]),
      findOne: jest.fn(),
      findAll: jest.fn(async () => [])
    };
    s.models = {
      LieuOeuvre,
      Lieu: { findByPk: jest.fn(async () => lieu) },
      Oeuvre: { findByPk: jest.fn(async () => oeuvre) },
      OeuvreUser: { count: jest.fn(async () => contributions) }
    };
    return s;
  };
  const LIVRE = { id_oeuvre: 7, id_type_oeuvre: 1, statut: 'publie', saisi_par: 10 };

  test('le propriétaire relie son œuvre', async () => {
    const s = service({ oeuvre: LIVRE });
    const lien = await s.lierOeuvre(3, 7, { userId: 10 });
    expect(lien).toMatchObject({ id_lieu: 3, id_oeuvre: 7, section_patrimoine: 'oeuvres_liees', id_contributeur: 10 });
  });

  test('une personne qui a contribué à l’œuvre peut aussi la relier', async () => {
    await expect(service({ oeuvre: LIVRE, contributions: 1 }).lierOeuvre(3, 7, { userId: 22 })).resolves.toBeTruthy();
  });

  test('une autre personne est refusée, rien n’est créé', async () => {
    const s = service({ oeuvre: LIVRE });
    await expect(s.lierOeuvre(3, 7, { userId: 22 })).rejects.toMatchObject({ statusCode: 403 });
    expect(s.models.LieuOeuvre.findOrCreate).not.toHaveBeenCalled();
  });

  test('un article se relie depuis la section du lieu', async () => {
    await expect(service({ oeuvre: { ...LIVRE, id_type_oeuvre: 4 } }).lierOeuvre(3, 7, { userId: 10 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('un lieu non publié est refusé, sauf pour la modération', async () => {
    const lieu = { id_lieu: 3, statut: 'brouillon' };
    await expect(service({ oeuvre: LIVRE, lieu }).lierOeuvre(3, 7, { userId: 10 })).rejects.toMatchObject({ statusCode: 404 });
    await expect(service({ oeuvre: LIVRE, lieu }).lierOeuvre(3, 7, { userId: 1, isModerator: true })).resolves.toBeTruthy();
  });

  test('10 lieux au plus par œuvre', async () => {
    await expect(service({ oeuvre: LIVRE, nombre: 10 }).lierOeuvre(3, 7, { userId: 10 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('les pages « En savoir plus » ne mélangent pas ces liens', async () => {
    const s = service({ oeuvre: LIVRE });
    await s.pagesDetaillees(3).catch(() => {});
    expect(s.models.LieuOeuvre.findAll.mock.calls[0][0].where.section_patrimoine).toEqual({ [Op.ne]: 'oeuvres_liees' });
  });

  test('le propriétaire de l’œuvre peut la détacher du lieu ; un tiers non', async () => {
    const lien = { id_oeuvre: 7, id_contributeur: 99, section_patrimoine: 'oeuvres_liees', destroy: jest.fn() };
    const s = service({ oeuvre: LIVRE });
    s.models.LieuOeuvre.findOne.mockResolvedValue(lien);
    await expect(s.retirerPage(3, 1, { userId: 22 })).resolves.toBe('interdit');
    expect(lien.destroy).not.toHaveBeenCalled();
    await expect(s.retirerPage(3, 1, { userId: 10 })).resolves.toBe('ok');
    expect(lien.destroy).toHaveBeenCalled();
  });
});

describe('page d’une wilaya', () => {
  const modeles = (personnes = []) => ({
    Wilaya: { findByPk: jest.fn(async (id) => (id === 15 ? { get: () => ({ id_wilaya: 15, wilaya_name_ascii: 'Tizi Ouzou' }) } : null)) },
    Commune: { findAll: jest.fn(async () => [{ id_commune: 100 }]) },
    Daira: {},
    TypeUser: {},
    User: {
      findAll: jest.fn(async ({ attributes }) => (attributes.length === 1
        ? personnes.map(id_user => ({ id_user }))
        : personnes.map(id_user => ({ get: () => ({ id_user, id_type_user: 14 }) }))))
    },
    OeuvreUser: { findAll: jest.fn(async () => []), getTableName: () => 'oeuvre_user' },
    Oeuvre: { findAll: jest.fn(async () => []), count: jest.fn(async () => 0) },
    Article: {},
    Media: {},
    Artisanat: {},
    Lieu: { count: jest.fn(async () => 0), findAll: jest.fn(async () => []), primaryKeyAttribute: 'id_lieu' },
    LieuMedia: {},
    Evenement: { count: jest.fn(async () => 0), findAll: jest.fn(async () => []), primaryKeyAttribute: 'id_evenement' }
  });
  const organisations = { annuaire: jest.fn(async () => ({ organisations: [] })) };

  test('wilaya inconnue : rien', async () => {
    await expect(vitrineWilaya(modeles(), 999, organisations)).resolves.toBeNull();
  });

  test('seuls les profils publics, actifs et ayant accepté les conditions, sans e-mail ni téléphone', async () => {
    const m = modeles([9]);
    const v = await vitrineWilaya(m, 15, organisations);
    expect(v.professionnels.total).toBe(1);
    const appel = m.User.findAll.mock.calls.find(([o]) => o.attributes.length > 1)[0];
    expect(appel.where).toMatchObject({ statut: 'actif', profil_public: true, accepte_conditions: true });
    expect(appel.attributes).not.toEqual(expect.arrayContaining(['email']));
    expect(appel.attributes).not.toEqual(expect.arrayContaining(['telephone']));
  });

  test('par la wilaya indiquée ou par la commune de la personne', async () => {
    const m = modeles([9]);
    await vitrineWilaya(m, 15, organisations);
    const ou = m.User.findAll.mock.calls[0][0].where[Op.or];
    expect(ou[0]).toEqual({ wilaya_residence: 15 });
    expect(ou[1].id_commune[Op.in]).toEqual([100]);
  });

  test('sans professionnel : pas de requête d’œuvres, le reste de la page répond', async () => {
    const m = modeles([]);
    const v = await vitrineWilaya(m, 15, organisations);
    expect(m.Oeuvre.findAll).not.toHaveBeenCalled();
    expect(v.oeuvres).toEqual({ liste: [], total: 0 });
    // Compte léger puis page (compterPuisLister, audit V11 BDD-12)
    expect(m.Evenement.count).toHaveBeenCalled();
  });
});
