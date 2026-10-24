/**
 * PatrimoineService — points de visite d'un site (Timgad › Arc de Trajan, Musée › Salle 3)
 * et audio multilingue.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const PatrimoineService = require('../../services/patrimoine/patrimoineService');

const TIMGAD = { id_lieu: 10, id_lieu_parent: null, latitude: 35.4842, longitude: 6.4675, communeId: 7, localiteId: null };

const makeService = ({ parent = TIMGAD, ancetres = [], maxOrdre = 2 } = {}) => {
  const models = {
    Lieu: {
      findByPk: jest.fn().mockResolvedValue(parent),
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      create: jest.fn().mockResolvedValue({ id_lieu: 100 }),
      max: jest.fn().mockResolvedValue(maxOrdre),
      update: jest.fn()
    },
    DetailLieu: {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id_detailLieu: 1 })
    },
    LieuMedia: { create: jest.fn(async (v) => v) }
  };
  const repository = {
    withTransaction: jest.fn(async (cb) => cb({})),
    findAncetres: jest.fn().mockResolvedValue(ancetres),
    findPointsDuSite: jest.fn().mockResolvedValue([])
  };
  return { service: new PatrimoineService(repository, { models }), models, repository };
};

describe('PatrimoineService.create - point de visite', () => {
  it('point extérieur : GPS propre, commune du site, à la suite des autres points', async () => {
    const { service, models } = makeService();
    await service.create({ nom: { fr: 'Arc de Trajan' }, id_lieu_parent: 10, latitude: 35.4850, longitude: 6.4690 });

    expect(models.Lieu.create).toHaveBeenCalledWith(expect.objectContaining({
      id_lieu_parent: 10,
      latitude: 35.4850,
      longitude: 6.4690,
      communeId: 7,
      ordre_visite: 3,
      repere: null
    }), expect.anything());
  });

  it('point intérieur sans GPS : reprend la position du site et garde son repère', async () => {
    const { service, models } = makeService();
    await service.create({ nom: { fr: 'Salle 3' }, id_lieu_parent: 10, repere: { fr: '1er étage, salle 3' } });

    expect(models.Lieu.create).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 35.4842,
      longitude: 6.4675,
      repere: { fr: '1er étage, salle 3' }
    }), expect.anything());
  });

  it('à moins de 100 m du site : créé quand même, pas fusionné avec le site', async () => {
    const { service, models } = makeService();
    await service.create({ nom: { fr: 'Marché de Sertius' }, id_lieu_parent: 10, latitude: 35.4843, longitude: 6.4676 });

    // une seule recherche : le doublon par nom parmi les points du site, pas par coordonnées
    expect(models.Lieu.findOne).toHaveBeenCalledTimes(1);
    expect(models.Lieu.findOne.mock.calls[0][0].where).toMatchObject({ communeId: 7, id_lieu_parent: 10 });
    expect(models.Lieu.create).toHaveBeenCalled();
  });

  it('lieu principal : doublon de nom cherché parmi les lieux principaux seulement', async () => {
    const { service, models } = makeService();
    await service.create({ nom: { fr: 'Timgad' }, latitude: 35.48, longitude: 6.46, communeId: 7 });
    expect(models.Lieu.findOne.mock.calls[0][0].where).toMatchObject({ id_lieu_parent: null });
    expect(models.Lieu.create).toHaveBeenCalledWith(expect.objectContaining({ id_lieu_parent: null, ordre_visite: null }), expect.anything());
  });

  it('site parent inexistant : refusé', async () => {
    const { service, models } = makeService({ parent: null });
    await expect(service.create({ nom: { fr: 'X' }, id_lieu_parent: 999 })).rejects.toMatchObject({ statusCode: 400 });
    expect(models.Lieu.create).not.toHaveBeenCalled();
  });

  it('4 niveaux acceptés (Timgad › Musée › Salle 3 › Vitrine 12), le 5e refusé', async () => {
    const quatre = makeService({
      parent: { ...TIMGAD, id_lieu: 30, id_lieu_parent: 20 },
      ancetres: [{ id_lieu: 10 }, { id_lieu: 20 }]
    });
    await quatre.service.create({ nom: { fr: 'Vitrine 12' }, id_lieu_parent: 30 });
    expect(quatre.models.Lieu.create).toHaveBeenCalled();

    const cinq = makeService({
      parent: { ...TIMGAD, id_lieu: 40, id_lieu_parent: 30 },
      ancetres: [{ id_lieu: 10 }, { id_lieu: 20 }, { id_lieu: 30 }]
    });
    await expect(cinq.service.create({ nom: { fr: 'Objet' }, id_lieu_parent: 40 }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(cinq.models.Lieu.create).not.toHaveBeenCalled();
  });
});

describe('PatrimoineService.update - rattachement', () => {
  const makeUpdate = (ancetres) => {
    const existing = { id_lieu: 10, get: () => ({ id_lieu: 10 }), update: jest.fn() };
    const ctx = makeService({ parent: { ...TIMGAD, id_lieu: 40, id_lieu_parent: 30 }, ancetres });
    ctx.repository.findById = jest.fn().mockResolvedValue(existing);
    ctx.repository.findWithFullDetails = jest.fn().mockResolvedValue({ id_lieu: 10 });
    return { ...ctx, existing };
  };

  it('refuse de rattacher un site à l\'un de ses propres points (boucle)', async () => {
    const { service, existing } = makeUpdate([{ id_lieu: 10 }, { id_lieu: 30 }]);
    await expect(service.update(10, { id_lieu_parent: 40 })).rejects.toMatchObject({ statusCode: 400 });
    expect(existing.update).not.toHaveBeenCalled();
  });

  it('refuse qu\'un lieu soit son propre parent', async () => {
    const { service } = makeUpdate([]);
    await expect(service.update(10, { id_lieu_parent: 10 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('id_lieu_parent null : le point redevient un lieu principal', async () => {
    const { service, existing } = makeUpdate([]);
    await service.update(10, { id_lieu_parent: null });
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ id_lieu_parent: null }), expect.anything());
  });

  it('un lieu principal devient point d’un site : à la fin de la visite (musée de Tergregt › Aït Smaïl)', async () => {
    const { service, existing, models } = makeUpdate([]);
    models.Lieu.max.mockResolvedValue(4);
    await service.update(10, { id_lieu_parent: 40 });
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ id_lieu_parent: 40, ordre_visite: 5 }), expect.anything());
  });
});

describe('PatrimoineService.reordonnerPoints', () => {
  const setup = ({ createur = 5 } = {}) => {
    const ctx = makeService({ parent: { id_lieu: 10, id_createur: createur } });
    ctx.models.Lieu.findAll.mockResolvedValue([{ id_lieu: 11 }, { id_lieu: 12 }, { id_lieu: 13 }]);
    return ctx;
  };

  it('créateur du site : applique le nouvel ordre', async () => {
    const { service, models } = setup();
    await service.reordonnerPoints(10, [13, 11, 12], { userId: 5 });
    expect(models.Lieu.update.mock.calls.map(c => [c[1].where.id_lieu, c[0].ordre_visite]))
      .toEqual([[13, 1], [11, 2], [12, 3]]);
  });

  it('autre utilisateur : interdit', async () => {
    const { service, models } = setup();
    await expect(service.reordonnerPoints(10, [11, 12, 13], { userId: 99 })).rejects.toMatchObject({ statusCode: 403 });
    expect(models.Lieu.update).not.toHaveBeenCalled();
  });

  it('liste incomplète ou avec un point d\'un autre site : refusée', async () => {
    const { service } = setup();
    await expect(service.reordonnerPoints(10, [11, 12], { userId: 5 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.reordonnerPoints(10, [11, 12, 77], { userId: 5 })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('PatrimoineService.uploadMedias - audio multilingue', () => {
  const files = [
    { path: 'https://cdn/guide.mp3', mimetype: 'audio/mpeg' },
    { path: 'https://cdn/photo.jpg', mimetype: 'image/jpeg' }
  ];

  it('audio enregistré comme audio avec sa langue ; la photo sans langue', async () => {
    const { service, models } = makeService({ parent: { id_lieu: 10 } });
    await service.uploadMedias(10, files, { langue: 'tz-tfng' });
    expect(models.LieuMedia.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'audio', langue: 'tz-tfng' }));
    expect(models.LieuMedia.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'image', langue: null }));
  });

  it('m4a Android (en-tête MP4) : classé audio grâce à son extension', async () => {
    const { service, models } = makeService({ parent: { id_lieu: 10 } });
    await service.uploadMedias(10, [{ path: 'https://cdn/conte.m4a', mimetype: 'video/mp4', originalname: 'conte.m4a' }], { langue: 'ar' });
    expect(models.LieuMedia.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'audio', langue: 'ar' }));
  });

  it('langue inconnue : refusée', async () => {
    const { service, models } = makeService({ parent: { id_lieu: 10 } });
    await expect(service.uploadMedias(10, files, { langue: 'xx' })).rejects.toMatchObject({ statusCode: 400 });
    expect(models.LieuMedia.create).not.toHaveBeenCalled();
  });
});
