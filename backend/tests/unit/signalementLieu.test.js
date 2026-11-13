/**
 * Signaler une erreur sur un site du patrimoine (type « lieu », migration 20261222) : seulement un site
 * publié, aperçu pour la modération, auteur = créateur du site, retrait = brouillon.
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const SignalementRepository = require('../../repositories/signalementRepository');
const { apercuSignale } = require('../../services/signalement/apercuSignale');

const lieu = { id_lieu: 4, nom: { fr: 'Kalâa des Béni Hammad' }, adresse: { fr: 'Maadid, Msila' }, statut: 'publie', id_createur: 9, update: jest.fn() };
const models = () => ({
  Lieu: { findOne: jest.fn().mockResolvedValue({ id_lieu: 4 }), findByPk: jest.fn().mockResolvedValue(lieu) },
  User: { findByPk: jest.fn().mockResolvedValue({ id_user: 9, prenom: 'Rayan', nom: 'Yacine' }) },
  Signalement: { sequelize: {} }
});

describe('signalement d’un site du patrimoine', () => {
  it('un site publié seulement', async () => {
    const m = models();
    const repo = Object.create(SignalementRepository.prototype);
    repo.models = m;
    await expect(repo.entityExists('lieu', 4)).resolves.toBe(true);
    expect(m.Lieu.findOne.mock.calls[0][0].where).toMatchObject({ id_lieu: 4, statut: 'publie' });
  });

  it('auteur = créateur du site ; retrait = brouillon (rien d’effacé)', async () => {
    const m = models();
    const repo = Object.create(SignalementRepository.prototype);
    repo.models = m;
    await expect(repo.auteurSignale({ type_entite: 'lieu', id_entite: 4 })).resolves.toBe(9);
    await repo._retirerContenu('lieu', 4);
    expect(lieu.update).toHaveBeenCalledWith({ statut: 'brouillon' });
  });

  it('aperçu pour la modération : nom, adresse, lien de la fiche', async () => {
    const a = await apercuSignale(models(), 'lieu', 4);
    expect(a).toMatchObject({ lien: '/patrimoine/4', statut: 'publie' });
    expect(a.titre).toMatch(/Kalâa/);
  });
});
