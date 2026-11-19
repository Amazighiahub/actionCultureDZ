/**
 * Anti-retour (2026-11-19) : annuler l'import des lieux ne supprime jamais un lieu déjà utilisé
 * (services, photos, événements, parcours, favoris…) ; un point de visite gardé garde aussi son site.
 */
const migration = require('../../migrations/20261233-import-lieux-osm');

describe('Import des lieux : descente prudente', () => {
  test('lieux utilisés retirés de la liste à supprimer, jusqu’à stabilité', async () => {
    const appels = [];
    let tour = 0;
    const sequelize = {
      transaction: (fn) => fn({}),
      query: jest.fn(async (sql, opts = {}) => {
        appels.push({ sql, gardes: opts.replacements?.gardes });
        if (/SHOW TABLES/.test(sql)) return [[{ t: 'import_lieux_osm' }]];
        if (/^SELECT id_lieu FROM import_lieux_osm/.test(sql)) return [[{ id_lieu: 4 }, { id_lieu: 12 }, { id_lieu: 30 }]];
        if (/information_schema/.test(sql)) return [[{ t: 'services', c: 'id_lieu' }, { t: 'lieu', c: 'id_lieu_parent' }, { t: 'detail_lieux', c: 'id_lieu' }]];
        if (/UNION/.test(sql)) {
          tour += 1;
          // 1er tour : un point de visite utilisé (service) ; 2e tour : son site importé ; puis plus rien
          return [tour === 1 ? [{ id: 12 }] : tour === 2 ? [{ id: 4 }] : []];
        }
        return [[]];
      })
    };
    await migration.down({ sequelize });

    const union = appels.find((a) => /UNION/.test(a.sql)).sql;
    expect(union).toMatch(/FROM `services` x WHERE x.`id_lieu` IN \(:liste\)/);
    expect(union).toMatch(/favoris/);
    expect(union).not.toMatch(/detail_lieux/);
    const retires = appels.filter((a) => /DELETE FROM import_lieux_osm/.test(a.sql)).map((a) => a.gardes);
    expect(retires).toEqual([[12], [4]]);
    // Les suppressions viennent après : seuls les lieux encore listés partent
    const premierDelete = appels.findIndex((a) => /DELETE l FROM lieu/.test(a.sql));
    const dernierRetrait = appels.map((a) => /DELETE FROM import_lieux_osm/.test(a.sql)).lastIndexOf(true);
    expect(premierDelete).toBeGreaterThan(dernierRetrait);
  });
});
