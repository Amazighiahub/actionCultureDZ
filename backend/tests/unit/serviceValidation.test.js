/**
 * Services des professionnels : champs facultatifs vides acceptés, validation par l'équipe
 * (notifications), un service refusé et corrigé repart en validation, et seuls les services
 * validés (ou les équipements d'un site) sont montrés au public.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const ServiceService = require('../../services/service/serviceService');
const { whereServicesVisibles } = require('../../utils/servicesVisibles');

const makeSvc = (existing = {}) => {
  const svc = Object.create(ServiceService.prototype);
  svc.models = { User: { findAll: jest.fn().mockResolvedValue([{ id_user: 1 }]) } };
  svc.repository = {
    findById: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue({ id: 9 }),
    update: jest.fn(),
    findWithFullDetails: jest.fn().mockResolvedValue({ id: 9 })
  };
  svc.notificationService = { sendToUser: jest.fn() };
  svc.logger = { info: jest.fn() };
  return svc;
};

describe('Formulaire : champs facultatifs laissés vides', () => {
  it('email, téléphone, site web et tarifs vides ne bloquent plus l’envoi', async () => {
    const regles = [
      body('email').optional({ values: 'falsy' }).isEmail(),
      body('telephone').optional({ values: 'falsy' }).matches(/^[0-9+\-\s()]{8,20}$/),
      body('site_web').optional({ values: 'falsy' }).isURL(),
      body('tarif_min').optional({ values: 'falsy' }).isFloat({ min: 0 })
    ];
    const req = { body: { email: '', telephone: '', site_web: '', tarif_min: null } };
    for (const r of regles) await r.run(req);
    expect(validationResult(req).isEmpty()).toBe(true);
    const faux = { body: { email: 'pas-un-email' } };
    await regles[0].run(faux);
    expect(validationResult(faux).isEmpty()).toBe(false);
  });
});

describe('Création et décision', () => {
  it('création : en attente, les administrateurs sont prévenus', async () => {
    const svc = makeSvc();
    await svc.create({ nom: { fr: 'Gîte de la Casbah' }, type_service: 'hotel' }, 37);
    expect(svc.repository.create).toHaveBeenCalledWith(expect.objectContaining({ statut: 'en_attente', id_user: 37 }));
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(1, expect.objectContaining({ titre: 'Service à valider' }));
  });

  it('validation : le professionnel est prévenu avec le lien de son service', async () => {
    const svc = makeSvc({ id: 9, id_user: 37, statut: 'en_attente', nom: { fr: 'Gîte' } });
    await svc.validate(9, 1);
    expect(svc.repository.update).toHaveBeenCalledWith(9, { statut: 'valide' });
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(37, expect.objectContaining({ titre: 'Service publié', url_action: '/services/9' }));
  });

  it('refus : motif obligatoire et transmis au professionnel', async () => {
    const svc = makeSvc({ id: 9, id_user: 37, statut: 'en_attente', nom: { fr: 'Gîte' } });
    await expect(svc.reject(9, 1, ' ')).rejects.toThrow(/motif/);
    await svc.reject(9, 1, 'Photo floue');
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(37, expect.objectContaining({
      titre: 'Service à corriger', message: expect.stringContaining('Photo floue')
    }));
  });

  it('un service refusé, corrigé par son propriétaire, repart en validation', async () => {
    const svc = makeSvc({ id: 9, id_user: 37, statut: 'rejete', nom: { fr: 'Gîte' } });
    await svc.update(9, { telephone: '0555 12 34 56' }, 37);
    expect(svc.repository.update.mock.calls[0][1].statut).toBe('en_attente');
    expect(svc.notificationService.sendToUser).toHaveBeenCalledWith(1, expect.objectContaining({ titre: 'Service à valider' }));
  });
});

describe('Visibilité publique', () => {
  it('services validés, ou équipements d’un site (sans propriétaire)', () => {
    expect(whereServicesVisibles()).toEqual({ [Op.or]: [{ statut: 'valide' }, { id_user: null }] });
  });
});

describe('Annuaire des services aux visiteurs', () => {
  const ligne = (id, type, nom, wilaya, lieu = 'Casbah') => ({
    get: () => ({
      id, type_service: type, nom: { fr: nom }, description: {}, statut: 'valide',
      Lieu: { id_lieu: id, nom: { fr: lieu }, Commune: { id_commune: 1, nom: 'Casbah', Daira: { Wilaya: wilaya } } },
      Professionnel: { id_user: 37 }
    })
  });
  const alger = { id_wilaya: 16, nom: 'الجزائر', wilaya_name_ascii: 'Alger' };
  const bejaia = { id_wilaya: 6, nom: 'بجاية', wilaya_name_ascii: 'Bejaia' };
  const svc = () => {
    const s = makeSvc();
    s.repository.findAnnuaire = jest.fn().mockResolvedValue([
      ligne(1, 'hotel', 'Gîte Dar Yemma', alger),
      ligne(2, 'guide', 'Guide de la Casbah', alger),
      ligne(3, 'restaurant', 'Le Gouraya', bejaia, 'Yemma Gouraya')
    ]);
    return s;
  };

  it('wilayas proposées triées, lieu et wilaya joints à chaque service', async () => {
    const { services, wilayas } = await svc().annuaire();
    expect(wilayas.map(w => w.id_wilaya)).toEqual([16, 6]);
    expect(services[0]).toMatchObject({ lieu: { id_lieu: 1, nom: { fr: 'Casbah' } }, wilaya: { id_wilaya: 16 }, professionnel: { id_user: 37 } });
    expect(services[0].Lieu).toBeUndefined();
  });

  it('filtres type, wilaya et texte (sans accents)', async () => {
    expect((await svc().annuaire({ type: 'guide' })).services.map(s => s.id)).toEqual([2]);
    expect((await svc().annuaire({ wilaya: 6 })).services.map(s => s.id)).toEqual([3]);
    expect((await svc().annuaire({ q: 'gite' })).services.map(s => s.id)).toEqual([1]);
    expect((await svc().annuaire({ q: 'gouraya' })).services.map(s => s.id)).toEqual([3]);
  });
});
