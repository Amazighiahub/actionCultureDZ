/**
 * Artisanat créé depuis le formulaire (sans œuvre parente) et lecture « toutes les langues »
 * pour les formulaires de modification (?i18n=all), sans perte de traductions à l'enregistrement.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const mockOeuvreService = { create: jest.fn(), submitForValidation: jest.fn() };
jest.mock('../../services/serviceContainer', () => ({ oeuvreService: mockOeuvreService }));

const ArtisanatService = require('../../services/artisanat/artisanatService');
const BaseDTO = require('../../dto/baseDTO');
const { translateDeep } = require('../../helpers/i18n');
const { languageMiddleware } = require('../../middlewares/language');

const makeService = ({ fiche = { id_artisanat: 9 }, existing = null } = {}) => {
  const models = {
    Langue: { findOne: jest.fn().mockResolvedValue({ id_langue: 5 }) },
    Artisanat: { findOne: jest.fn().mockResolvedValue(fiche), count: jest.fn().mockResolvedValue(0) },
    Oeuvre: { update: jest.fn(), findByPk: jest.fn() }
  };
  const repository = {
    findWithFullDetails: jest.fn().mockResolvedValue({ id_artisanat: 9, Oeuvre: { statut: 'en_attente' } }),
    findById: jest.fn().mockResolvedValue(existing),
    update: jest.fn(),
    create: jest.fn()
  };
  return { service: new ArtisanatService(repository, { models }), models, repository };
};

describe('ArtisanatService.create sans œuvre parente (formulaire « Ajouter un artisanat »)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOeuvreService.create.mockResolvedValue({ oeuvre: { id_oeuvre: 53 } });
    mockOeuvreService.submitForValidation.mockResolvedValue({});
  });

  it('crée l\'œuvre de type Artisanat avec la fiche, puis la soumet à la modération', async () => {
    const { service } = makeService();
    await service.create({
      nom: JSON.stringify({ fr: 'Poterie' }), description: JSON.stringify({ fr: 'Pot' }),
      id_materiau: 1, id_technique: 2, prix_min: 1500, prix_max: 3000, delai_fabrication: 7, sur_commande: true, en_stock: 2, tags: ['poterie']
    }, 8);

    expect(mockOeuvreService.create).toHaveBeenCalledWith(expect.objectContaining({
      id_type_oeuvre: 7,
      id_langue: 5,
      tags: ['poterie'],
      details_specifiques: { artisanat: expect.objectContaining({ id_materiau: 1, id_technique: 2, prix: 1500, prix_max: 3000, delai_fabrication: 7, sur_commande: true, en_stock: 2 }) }
    }), 8);
    expect(mockOeuvreService.submitForValidation).toHaveBeenCalledWith(53, 8);
  });

  it('avec id_oeuvre : comportement inchangé (rattachement à une œuvre de l\'utilisateur)', async () => {
    const { service, models, repository } = makeService();
    models.Oeuvre.findByPk.mockResolvedValue({ id_oeuvre: 12, saisi_par: 8 });
    repository.create.mockResolvedValue({ id_artisanat: 9 });
    await service.create({ id_oeuvre: 12, id_materiau: 1 }, 8);
    expect(mockOeuvreService.create).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ id_oeuvre: 12 }));
  });
});

describe('ArtisanatService.update : nom et description sans perte de langues', () => {
  it('le français modifié, l\'arabe laissé vide est conservé', async () => {
    const existing = { id_artisanat: 9, id_oeuvre: 53, Oeuvre: { saisi_par: 8, titre: { fr: 'Ancien', ar: 'قديم' }, description: { fr: 'D', ar: 'و' } } };
    const { service, models } = makeService({ existing });
    await service.update(9, { nom: JSON.stringify({ fr: 'Nouveau', ar: '' }), prix_min: 1800 }, 8);
    const titre = models.Oeuvre.update.mock.calls[0][0].titre;
    expect(titre.fr).toBe('Nouveau');
    expect(titre.ar).toBe('قديم');
  });
});

describe('Lecture « toutes les langues » (?i18n=all)', () => {
  const brut = { id: 1, nom: { fr: 'Timgad', ar: 'تيمقاد' }, Points: [{ nom: { fr: 'Arc', ar: 'قوس' } }] };

  it('translateRaw et translateDeep renvoient les champs multilingues bruts', () => {
    expect(BaseDTO.translateRaw(brut, 'all')).toEqual(brut);
    expect(translateDeep(brut, 'all')).toEqual(brut);
    expect(BaseDTO.translateRaw(brut, 'ar').nom).toBe('تيمقاد');
  });

  it('le middleware active ce mode seulement avec ?i18n=all, sans toucher la langue des messages', () => {
    const run = (query) => { const req = { query, headers: {}, cookies: {} }; languageMiddleware(req, { setHeader: jest.fn() }, jest.fn()); return req; };
    const req = run({ i18n: 'all', lang: 'ar' });
    expect(req.lang).toBe('all');
    expect(req.language).toBe('ar');
    expect(run({ lang: 'ar' }).lang).toBe('ar');
  });
});
