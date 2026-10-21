/**
 * ProgrammeService — jour d'une activité (événement sur plusieurs jours).
 * Le formulaire envoie « 2026-10-29T10:00:00 » : l'heure va dans la colonne TIME,
 * le jour dans date_programme (auparavant perdu : tout s'affichait « Date non définie »).
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const ProgrammeService = require('../../services/programmeService');

const makeService = ({ evenement = { id_evenement: 5, id_user: 7, statut: 'publie' }, programme } = {}) => {
  const transaction = { commit: jest.fn(), rollback: jest.fn() };
  const repository = {
    model: { sequelize: { transaction: jest.fn().mockResolvedValue(transaction) }, findByPk: jest.fn().mockResolvedValue(programme) },
    create: jest.fn(async (data) => ({ id_programme: 1, ...data })),
    getNextOrdre: jest.fn().mockResolvedValue(1)
  };
  const models = { Evenement: { findByPk: jest.fn().mockResolvedValue(evenement) }, Lieu: { findByPk: jest.fn() } };
  const service = new ProgrammeService(repository, { models });
  service._getProgrammeComplet = jest.fn(async (id) => ({ id_programme: id }));
  return { service, repository };
};

describe('ProgrammeService — jour de l’activité', () => {
  it('création : le jour est tiré de l’horaire envoyé par le formulaire', async () => {
    const { service, repository } = makeService();
    await service.createProgramme(5, 7, 'fr', {
      titre: { fr: 'Cuisson traditionnelle' }, type_activite: 'atelier',
      heure_debut: '2026-10-30T09:00:00', heure_fin: '2026-10-30T10:00:00'
    });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      date_programme: '2026-10-30', heure_debut: '09:00:00', heure_fin: '10:00:00'
    }), expect.anything());
  });

  it('création : date_programme explicite prioritaire, heures seules acceptées', async () => {
    const { service, repository } = makeService();
    await service.createProgramme(5, 7, 'fr', { titre: { fr: 'Ouverture' }, date_programme: '2026-10-29', heure_debut: '10:00' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ date_programme: '2026-10-29', heure_debut: '10:00' }), expect.anything());
  });

  it('création sans aucun jour : date_programme reste vide', async () => {
    const { service, repository } = makeService();
    await service.createProgramme(5, 7, 'fr', { titre: { fr: 'Clôture' }, heure_debut: '17:00:00' });
    expect(repository.create.mock.calls[0][0].date_programme).toBeNull();
  });

  it('modification : le jour suit le nouvel horaire', async () => {
    const programme = { titre: { fr: 'Atelier' }, description: {}, Evenement: { id_user: 7, statut: 'publie' }, update: jest.fn() };
    const { service } = makeService({ programme });
    await service.updateProgramme(1, 7, 'fr', { heure_debut: '2026-10-29T13:00:00', heure_fin: '2026-10-29T15:00:00' });
    expect(programme.update).toHaveBeenCalledWith(expect.objectContaining({
      date_programme: '2026-10-29', heure_debut: '13:00:00', heure_fin: '15:00:00'
    }), expect.anything());
  });
});
