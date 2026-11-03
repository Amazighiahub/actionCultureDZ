/**
 * Audit V9, lot 3 : modifier une activité garde les données des intervenants, enregistre son statut et
 * ses options, et signale aux inscrits une annulation, un report ou un changement d'horaire.
 */
const ProgrammeService = require('../../services/programmeService');

const contexte = ({ statutEvenement = 'publie', existant = {}, anciens = [] } = {}) => {
  const programme = {
    id_programme: 5, id_evenement: 2, statut: 'planifie', heure_debut: '10:00:00', heure_fin: '11:00:00', date_programme: '2026-12-01',
    Evenement: { id_user: 7, statut: statutEvenement },
    update: jest.fn(async () => true),
    ...existant,
  };
  const transaction = { finished: false, commit: jest.fn(async () => true), rollback: jest.fn(async () => true) };
  const repository = { model: { sequelize: { transaction: jest.fn(async () => transaction) }, findByPk: jest.fn(async () => programme) } };
  const models = {
    Evenement: {},
    ProgrammeIntervenant: {
      findAll: jest.fn(async () => anciens),
      destroy: jest.fn(async () => 1),
      create: jest.fn(async () => ({})),
    },
  };
  const svc = new ProgrammeService(repository, { models });
  svc._getProgrammeComplet = jest.fn(async () => ({ id_programme: 5 }));
  svc._resolveIntervenant = jest.fn(async i => i.id_intervenant);
  return { svc, programme };
};

describe('modifier une activité', () => {
  it('enregistre le statut et les options', async () => {
    const { svc, programme } = contexte();
    await svc.updateProgramme(5, 7, 'fr', { statut: 'en_cours', diffusion_live: true, langue_principale: 'ar', niveau_requis: 'tous_niveaux' });
    expect(programme.update).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'en_cours', diffusion_live: true, langue_principale: 'ar', niveau_requis: null }),
      expect.anything()
    );
  });

  it('un intervenant qui reste garde sa confirmation et ses honoraires', async () => {
    const { svc } = contexte({ anciens: [{ id_intervenant: 3, statut_confirmation: 'confirme', honoraires: '5000.00', frais_deplacement: '200.00' }] });
    await svc.updateProgramme(5, 7, 'fr', { intervenants: [{ id_intervenant: 3 }, { id_intervenant: 4 }] });
    const [garde, nouveau] = svc.models.ProgrammeIntervenant.create.mock.calls.map(c => c[0]);
    expect(garde).toMatchObject({ id_intervenant: 3, statut_confirmation: 'confirme', honoraires: '5000.00', frais_deplacement: '200.00' });
    expect(nouveau).toMatchObject({ id_intervenant: 4, statut_confirmation: 'en_attente' });
    expect(nouveau.honoraires).toBeUndefined();
  });

  it.each([
    ['annulation', { statut: 'annule' }, 'annule'],
    ['report', { statut: 'reporte' }, 'reporte'],
    ['nouvel horaire', { heure_debut: '2026-12-01T14:00:00' }, 'general'],
    ['nouveau jour', { date_programme: '2026-12-02' }, 'general'],
  ])('%s : les inscrits sont prévenus', async (_, donnees, attendu) => {
    const { svc } = contexte();
    const res = await svc.updateProgramme(5, 7, 'fr', donnees);
    expect(res.notifier).toBe(attendu);
  });

  it('un simple changement de titre ne prévient personne', async () => {
    const { svc } = contexte();
    const res = await svc.updateProgramme(5, 7, 'fr', { titre: { fr: 'Autre titre' }, heure_debut: '10:00:00' });
    expect(res.notifier).toBeNull();
  });

  it('un événement en brouillon ne prévient personne', async () => {
    const { svc } = contexte({ statutEvenement: 'brouillon' });
    const res = await svc.updateProgramme(5, 7, 'fr', { statut: 'annule' });
    expect(res.notifier).toBeNull();
  });
});
