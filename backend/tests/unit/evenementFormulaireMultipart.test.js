/**
 * Formulaire d'événement envoyé en multipart (affiche) : nom et description arrivent en texte JSON.
 * Ils doivent être enregistrés en objet { fr, ar, … }, pas recopiés tels quels dans « fr ».
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../middlewares/cacheMiddleware', () => ({ clearCache: jest.fn() }));
const EvenementService = require('../../services/evenement/evenementService');
const { lireMultiLang, mergeTranslations } = require('../../helpers/i18n');

describe('lireMultiLang', () => {
  it('texte JSON → objet ; texte simple, objet, tableau JSON ou JSON invalide → inchangés', () => {
    expect(lireMultiLang('{"fr":"Salon","ar":"صالون"}')).toEqual({ fr: 'Salon', ar: 'صالون' });
    expect(lireMultiLang('Salon de la poterie')).toBe('Salon de la poterie');
    expect(lireMultiLang({ fr: 'Salon' })).toEqual({ fr: 'Salon' });
    expect(lireMultiLang('["a"]')).toBe('["a"]');
    expect(lireMultiLang('{pas du json')).toBe('{pas du json');
  });

  it('mergeTranslations accepte le texte JSON du formulaire', () => {
    expect(mergeTranslations({ fr: 'Ancien', ar: 'قديم' }, '{"fr":"Nouveau","ar":""}')).toEqual({ fr: 'Nouveau', ar: 'قديم' });
  });
});

describe('EvenementService.update — formulaire multipart', () => {
  it('nom et description en texte JSON : enregistrés en objet', async () => {
    const svc = Object.create(EvenementService.prototype);
    svc.models = { EvenementOrganisation: { count: jest.fn().mockResolvedValue(1) } };
    svc.repository = {
      findById: jest.fn().mockResolvedValue({
        id_evenement: 1, id_user: 60, statut: 'publie',
        nom_evenement: { fr: 'Salon', ar: 'صالون' }, description: { fr: 'Ancienne' }
      }),
      update: jest.fn(),
      findWithFullDetails: jest.fn().mockResolvedValue({ id_evenement: 1 })
    };
    svc.withTransaction = async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } });
    svc.cache = { invalidate: jest.fn() };
    svc.logger = { info: jest.fn() };

    await svc.update(1, {
      nom_evenement: JSON.stringify({ fr: 'Salon de la poterie', ar: 'صالون', en: '' }),
      description: JSON.stringify({ fr: 'Nouvelle description' })
    }, 60);

    const maj = svc.repository.update.mock.calls[0][1];
    expect(maj.nom_evenement).toEqual({ fr: 'Salon de la poterie', ar: 'صالون' });
    expect(maj.description).toEqual({ fr: 'Nouvelle description' });
  });
});
