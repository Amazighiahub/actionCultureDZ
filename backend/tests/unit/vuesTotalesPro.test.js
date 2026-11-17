/**
 * Anti-retour (2026-11-17) : la carte « Vues totales » du tableau de bord du professionnel restait à 0,
 * le serveur n'envoyait jamais ce chiffre. getDashboard doit renvoyer statistiques.vues_total,
 * somme des vues de ses œuvres, événements, artisanat (table vues) et de ses services (service_stat).
 */
const { Op } = require('sequelize');
const ProfessionnelService = require('../../services/professionnelService');

function modeles({ vues = 0, vuesServices = 0, sansContenu = false } = {}) {
  const liste = (cle, n) => (sansContenu ? [] : Array.from({ length: n }, (_, i) => ({ [cle]: i + 1 })));
  const query = jest.fn().mockResolvedValue([[{ n: vuesServices }]]);
  return {
    query,
    models: {
      Vue: { count: jest.fn().mockResolvedValue(vues) },
      Oeuvre: { findAll: jest.fn().mockResolvedValue(liste('id_oeuvre', 2)), count: jest.fn().mockResolvedValue(0) },
      Evenement: { findAll: jest.fn().mockResolvedValue(liste('id_evenement', 1)), count: jest.fn().mockResolvedValue(0) },
      Artisanat: { findAll: jest.fn().mockResolvedValue(liste('id_artisanat', 1)), count: jest.fn().mockResolvedValue(0) },
      Service: { findAll: jest.fn().mockResolvedValue(liste('id', 1)), sequelize: { query } }
    }
  };
}

describe('Vues totales du professionnel', () => {
  test('additionne les vues des contenus et des services', async () => {
    const { models, query } = modeles({ vues: 36, vuesServices: 2 });
    const service = new ProfessionnelService(models);
    await expect(service._vuesTotales(37)).resolves.toBe(38);
    const where = models.Vue.count.mock.calls[0][0].where;
    expect(where[Op.or]).toEqual([
      { type_entite: 'oeuvre', id_entite: [1, 2] },
      { type_entite: 'evenement', id_entite: [1] },
      { type_entite: 'artisanat', id_entite: [1] }
    ]);
    expect(query.mock.calls[0][0]).toMatch(/service_stat/);
  });

  test('aucun contenu : 0 sans requête inutile', async () => {
    const { models, query } = modeles({ sansContenu: true });
    const service = new ProfessionnelService(models);
    await expect(service._vuesTotales(37)).resolves.toBe(0);
    expect(models.Vue.count).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  test('getDashboard renvoie vues_total au premier niveau des statistiques', () => {
    const source = require('fs').readFileSync(require.resolve('../../services/professionnelService'), 'utf8');
    expect(source).toMatch(/statistiques:\s*\{\s*vues_total:\s*vuesTotal/);
    expect(source).toMatch(/this\._vuesTotales\(userId\)\.catch\(\(\) => 0\)/);
  });
});
