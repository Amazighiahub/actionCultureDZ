/**
 * Suppression d'une activité : réservée à l'organisateur de l'événement, et inscrite au journal
 * d'actions avec ce qui permet de la retrouver (titre, événement, horaire, intervenants).
 */
const ProgrammeService = require('../../services/programmeService');

const makeService = (programme) => {
  const transaction = { commit: jest.fn(), rollback: jest.fn() };
  const models = {
    Evenement: {}, Intervenant: {},
    ProgrammeIntervenant: { destroy: jest.fn() },
    AuditLog: { create: jest.fn() }
  };
  const repository = {
    model: { sequelize: { transaction: jest.fn().mockResolvedValue(transaction) }, findByPk: jest.fn().mockResolvedValue(programme) }
  };
  return { service: new ProgrammeService(repository, { models }), models, transaction };
};

const atelier = () => ({
  id_programme: 2, id_evenement: 1,
  titre: { fr: 'Atelier : poterie traditionnelle d’Aït Smaïl' },
  date_programme: '2026-10-29', heure_debut: '13:00:00', heure_fin: '17:00:00',
  Evenement: { id_user: 60, nom_evenement: { fr: 'Salon de la poterie' } },
  Intervenants: [{ prenom: { fr: 'Yamina' }, nom: { fr: 'Khaled' } }],
  destroy: jest.fn()
});

describe('ProgrammeService.deleteProgramme', () => {
  it('organisateur : activité supprimée et inscrite au journal (titre, événement, horaire, intervenants)', async () => {
    const programme = atelier();
    const { service, models, transaction } = makeService(programme);
    expect(await service.deleteProgramme('2', 60, { ip: '1.2.3.4', userAgent: 'Firefox' })).toEqual({ success: true });
    expect(programme.destroy).toHaveBeenCalled();
    expect(models.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      id_admin: 60, action: 'delete_programme', entity_type: 'programme', entity_id: 2, ip_address: '1.2.3.4',
      details: expect.objectContaining({
        titre: 'Atelier : poterie traditionnelle d’Aït Smaïl', evenement: 'Salon de la poterie',
        date_programme: '2026-10-29', heure_debut: '13:00:00', intervenants: ['Yamina Khaled']
      })
    }), { transaction });
    expect(transaction.commit).toHaveBeenCalled();
  });

  it('autre compte : refusé, rien supprimé ni journalisé', async () => {
    const programme = atelier();
    const { service, models } = makeService(programme);
    expect(await service.deleteProgramme('2', 12)).toEqual({ error: 'forbidden' });
    expect(programme.destroy).not.toHaveBeenCalled();
    expect(models.AuditLog.create).not.toHaveBeenCalled();
  });
});
