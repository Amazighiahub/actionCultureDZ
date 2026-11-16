/**
 * Statistiques d'un service : une action connue seulement, rien pour un service non publié ni pour son
 * propre professionnel ; lecture réservée au professionnel du service et à la modération.
 */
const { compter, statistiques } = require('../../services/service/statsService');

function modeles(service = { id: 5, id_user: 12, statut: 'valide' }) {
  const query = jest.fn(async (sql) => (sql.startsWith('SELECT jour') ? [[{ jour: '2026-11-16', vues: 3, whatsapp: 1, reservation: 0, appel: 2 }]] : [[{ vues: '7', whatsapp: '2', reservation: '0', appel: '3' }]]));
  return { Service: { findByPk: jest.fn().mockResolvedValue(service) }, sequelize: { query } };
}

describe('statistiques d’un service', () => {
  it('compte une vue ; la colonne vient d’une liste fermée', async () => {
    const m = modeles();
    await expect(compter(m, 5, 'whatsapp', null)).resolves.toBe(true);
    expect(m.sequelize.query.mock.calls[0][0]).toMatch(/whatsapp = whatsapp \+ 1/);
    expect(m.sequelize.query.mock.calls[0][1].replacements.id).toBe(5);
    await expect(compter(m, 5, 'vues; DROP TABLE x', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('pas compté : service non publié, ou son propre professionnel', async () => {
    await expect(compter(modeles({ id: 5, id_user: 12, statut: 'en_attente' }), 5, 'vue')).resolves.toBe(false);
    const m = modeles();
    await expect(compter(m, 5, 'vue', { id_user: '12' })).resolves.toBe(false);
    expect(m.sequelize.query).not.toHaveBeenCalled();
  });

  it('lecture : professionnel ou modération ; un autre compte refusé', async () => {
    const r = await statistiques(modeles(), 5, { id_user: 12 });
    expect(r.total).toEqual({ vues: 7, whatsapp: 2, reservation: 0, appel: 3 });
    expect(r.par_jour[0]).toEqual({ jour: '2026-11-16', vues: 3, whatsapp: 1, reservation: 0, appel: 2 });
    await expect(statistiques(modeles(), 5, { id_user: 99 })).rejects.toMatchObject({ statusCode: 403 });
    await expect(statistiques(modeles(), 5, { id_user: 1, isModerateur: true })).resolves.toBeTruthy();
  });
});
