/**
 * Anti-retour (2026-11-24) : le tri « Populaires » des artisanats classait comme « Plus récents »
 * (valeur inconnue du serveur). Il classe maintenant par nombre de visites (table vues), puis par date.
 */
const ArtisanatRepository = require('../../repositories/artisanatRepository');

const repo = () => {
  const findAndCountAll = jest.fn().mockResolvedValue({ rows: [], count: 0 });
  const models = { Artisanat: { findAndCountAll }, Oeuvre: {}, Materiau: null, Technique: null };
  return { r: new ArtisanatRepository(models), findAndCountAll, models };
};

describe('Artisanat : tri « Populaires »', () => {
  test('les plus visités d’abord, puis les plus récents', async () => {
    const { r, findAndCountAll, models } = repo();
    await r.findPublished({ sort: 'populaire' });
    const { order } = findAndCountAll.mock.calls[0][0];
    expect(String(order[0][0].val)).toMatch(/FROM vues v WHERE v\.type_entite = 'artisanat' AND v\.id_entite = `Artisanat`\.`id_artisanat`/);
    expect(order[0][1]).toBe('DESC');
    expect(order[1]).toEqual([models.Oeuvre, 'date_creation', 'DESC']);
  });

  test('« Plus récents » inchangé', async () => {
    const { r, findAndCountAll, models } = repo();
    await r.findPublished({ sort: 'recent' });
    expect(findAndCountAll.mock.calls[0][0].order).toEqual([[models.Oeuvre, 'date_creation', 'DESC']]);
  });
});
