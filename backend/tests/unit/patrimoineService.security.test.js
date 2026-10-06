/**
 * PatrimoineService — la création ne doit jamais écraser un site existant
 * et la suppression d'un média doit être limitée au site visé.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const PatrimoineService = require('../../services/patrimoine/patrimoineService');

const baseData = {
  nom: { fr: 'Nouveau site' },
  latitude: 36.7,
  longitude: 3.05,
  communeId: 1,
  description: { fr: '', ar: '', en: '' },
  typePatrimoine: 'monument'
};

const makeService = ({ existingByCoords = null, existingDetail = null } = {}) => {
  const detail = existingDetail && { ...existingDetail, update: jest.fn() };
  const models = {
    Lieu: {
      findByPk: jest.fn(),
      // 1er appel : recherche par nom (aucun) ; 2e appel : recherche par coordonnées
      findOne: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingByCoords),
      create: jest.fn().mockResolvedValue({ id_lieu: 100 })
    },
    DetailLieu: {
      findOne: jest.fn().mockResolvedValue(detail),
      create: jest.fn().mockResolvedValue({ id_detailLieu: 1 })
    },
    Monument: { destroy: jest.fn(), bulkCreate: jest.fn() },
    Vestige: { destroy: jest.fn(), bulkCreate: jest.fn() },
    Service: { destroy: jest.fn(), bulkCreate: jest.fn() },
    LieuMedia: { destroy: jest.fn(), bulkCreate: jest.fn(), findOne: jest.fn() }
  };
  const repository = { withTransaction: jest.fn(async (cb) => cb({})) };
  const service = new PatrimoineService(repository, { models });
  return { service, models, detail };
};

describe('PatrimoineService.create - non destructif', () => {
  it('un non-modérateur ne peut pas cibler un lieu existant via lieuId', async () => {
    const { service, models } = makeService();
    await expect(service.create({ ...baseData, lieuId: 12 }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(models.Lieu.findByPk).not.toHaveBeenCalled();
  });

  it('site voisin retrouvé par coordonnées : fiche existante non écrasée', async () => {
    const existing = { id_lieu: 12, typePatrimoine: 'musee', update: jest.fn() };
    const { service, models, detail } = makeService({
      existingByCoords: existing,
      existingDetail: {
        id_detailLieu: 5,
        description: { fr: 'Description existante' },
        histoire: { fr: 'Histoire existante' },
        horaires: {},
        referencesHistoriques: {}
      }
    });

    const result = await service.create({
      ...baseData,
      horaires: { fr: '9h-17h' },
      services: [], medias: [], monuments: [], vestiges: []
    });

    expect(result.id_lieu).toBe(12);
    expect(existing.update).not.toHaveBeenCalled(); // typePatrimoine conservé
    // seul le champ vide (horaires) est complété
    expect(detail.update).toHaveBeenCalledWith({ horaires: { fr: '9h-17h' } }, expect.anything());
    for (const m of ['Monument', 'Vestige', 'Service', 'LieuMedia']) {
      expect(models[m].destroy).not.toHaveBeenCalled();
    }
  });

  it('nouveau site : création normale, statut du body ignoré pour un non-modérateur', async () => {
    const { service, models } = makeService();
    await service.create({ ...baseData, statut: 'brouillon' });
    expect(models.Lieu.create).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'publie' }), expect.anything()
    );
  });

  it('modérateur avec lieuId : seuls les équipements sans propriétaire sont supprimés', async () => {
    const { service, models } = makeService({
      existingDetail: { id_detailLieu: 5, description: {}, histoire: {}, horaires: {}, referencesHistoriques: {} }
    });
    models.Lieu.findByPk.mockResolvedValue({ id_lieu: 12, update: jest.fn() });
    await service.create({ ...baseData, lieuId: 12, services: [] }, { isModerator: true });
    expect(models.Service.destroy).toHaveBeenCalledWith(
      { where: { id_lieu: 12, id_user: null }, transaction: expect.anything() }
    );
  });
});

describe('PatrimoineService.deleteMedia - limité au site', () => {
  it('cherche le média dans le site demandé uniquement', async () => {
    const { service, models } = makeService();
    models.LieuMedia.findOne.mockResolvedValue(null);
    await expect(service.deleteMedia('1', '777')).rejects.toMatchObject({ statusCode: 404 });
    expect(models.LieuMedia.findOne).toHaveBeenCalledWith({ where: { id: 777, id_lieu: 1 } });
  });
});

describe('PatrimoineService.noter - une note par utilisateur', () => {
  const makeRating = (existing) => {
    const detail = { update: jest.fn() };
    const created = [];
    const models = {
      DetailLieu: { findOne: jest.fn().mockResolvedValue(detail) },
      LieuNotation: {
        findOne: jest.fn()
          .mockResolvedValueOnce(existing)                       // vote existant de l'utilisateur
          .mockResolvedValueOnce({ moyenne: '4.0000', total: 3 }), // statistiques recalculées
        create: jest.fn(async (v) => { created.push(v); return v; })
      }
    };
    const repository = { withTransaction: jest.fn(async (cb) => cb({})) };
    return { service: new PatrimoineService(repository, { models }), models, detail, created };
  };

  it('premier vote : enregistré et moyenne recalculée depuis les votes', async () => {
    const { service, detail, created } = makeRating(null);
    const res = await service.noter(12, 5, 7);
    expect(created).toEqual([{ id_lieu: 12, id_user: 7, note: 5 }]);
    expect(detail.update).toHaveBeenCalledWith({ noteMoyenne: 4, nb_notations: 3 }, expect.anything());
    expect(res).toMatchObject({ noteMoyenne: 4, nb_notations: 3, maNote: 5 });
  });

  it('nouveau vote du même utilisateur : remplace l\'ancien au lieu de s\'ajouter', async () => {
    const existing = { update: jest.fn() };
    const { service, models } = makeRating(existing);
    await service.noter(12, 2, 7);
    expect(existing.update).toHaveBeenCalledWith({ note: 2 }, expect.anything());
    expect(models.LieuNotation.create).not.toHaveBeenCalled();
  });

  it('note hors bornes : refusée', async () => {
    const { service } = makeRating(null);
    await expect(service.noter(12, 9, 7)).rejects.toMatchObject({ statusCode: 400 });
  });
});
