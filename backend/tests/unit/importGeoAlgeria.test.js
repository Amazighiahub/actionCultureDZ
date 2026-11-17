/**
 * Anti-retour (2026-11-17) : import des lieux GeoAlgeria par l'administration.
 * - commune retrouvée par son nom, homonymes départagés par la wilaya, orthographe voisine tolérée ;
 * - les points importés sont créés en brouillon par la création habituelle ; un doublon (409) est sauté ;
 * - la source OpenStreetMap est citée (licence ODbL) ; décisions limitées aux brouillons.
 */
const g = require('../../services/patrimoine/importGeoAlgeria');

const communes = (() => {
  const lignes = [
    { id_commune: 1, ascii: 'Ouargla', codeW: 30, cle: 'ouargla' },
    { id_commune: 2, ascii: 'El Kseur', codeW: 6, cle: 'elkseur' },
    { id_commune: 3, ascii: 'El Kseur', codeW: 30, cle: 'elkseur' },
    { id_commune: 4, ascii: 'Beni Foudhala El Hakania', codeW: 5, cle: 'benifoudhalaelhakania' }
  ];
  const index = new Map();
  for (const c of lignes) index.set(c.cle, [...(index.get(c.cle) || []), c]);
  return { lignes, index };
})();

describe('Import GeoAlgeria : commune du point', () => {
  test('même nom ; homonymes départagés par la wilaya ; orthographe voisine dans la wilaya', () => {
    expect(g.communeDuPoint(communes, { commune: { fr: 'Ouargla', wilaya48: 30 } }).id_commune).toBe(1);
    expect(g.communeDuPoint(communes, { commune: { fr: 'El Kseur', wilaya48: 6 } }).id_commune).toBe(2);
    expect(g.communeDuPoint(communes, { commune: { fr: 'Béni Fedhala El Hakania', wilaya48: 5 } }).id_commune).toBe(4);
    // Nom trop différent, ou autre wilaya : pas de rattachement au hasard
    expect(g.communeDuPoint(communes, { commune: { fr: 'Tamanrasset', wilaya48: 11 } })).toBeNull();
    expect(g.communeDuPoint(communes, { commune: { fr: 'El Kseur', wilaya48: 9 } })).toBeNull();
  });

  test('source citée : OpenStreetMap (ODbL) ou Wikidata', () => {
    expect(g.mentionSource({ source: 'osm' }).fr).toMatch(/© contributeurs OpenStreetMap/);
    expect(g.mentionSource({ source: 'wikidata' }).fr).toMatch(/Wikidata/);
  });
});

describe('Import GeoAlgeria : import et décisions', () => {
  const models = {
    sequelize: { query: jest.fn(), QueryTypes: { SELECT: 'SELECT' } },
    Lieu: { update: jest.fn().mockResolvedValue([2]) }
  };

  test('import : création en brouillon par la création habituelle ; doublon sauté ; liste bornée', async () => {
    g._vider();
    models.sequelize.query.mockResolvedValue([{ id_commune: 1, ascii: 'Ouargla', nom: { ar: 'ورقلة' }, codeW: 30 }]);
    const create = jest.fn()
      .mockResolvedValueOnce({ id_lieu: 900 })
      .mockRejectedValueOnce(Object.assign(new Error('existe'), { statusCode: 409 }));
    const lieux = require('../../data/geoalgeria/lieux.json').lieux.filter((p) => p.commune?.fr === 'Ouargla').slice(0, 2);
    expect(lieux).toHaveLength(2);
    const bilan = await g.importer(models, { create }, lieux.map((p) => p.id), 75);
    expect(bilan).toMatchObject({ crees: 1, deja: 1, ids: [900] });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ communeId: 1, id_createur: 75, latitude: lieux[0].lat }), { isModerator: true, enAttente: true });
    await expect(g.importer(models, { create }, [], 75)).rejects.toMatchObject({ statusCode: 400 });
    await expect(g.importer(models, { create }, Array.from({ length: 501 }, (_, i) => `x${i}`), 75)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('publier ou écarter : seulement des brouillons de sites principaux', async () => {
    await g.decider(models, [5, '6', 'x'], 'publier');
    expect(models.Lieu.update).toHaveBeenCalledWith({ statut: 'publie' }, { where: { id_lieu: [5, 6], statut: 'brouillon', id_lieu_parent: null } });
    await g.decider(models, [5], 'ecarter');
    expect(models.Lieu.update).toHaveBeenLastCalledWith({ statut: 'archive' }, expect.anything());
    await expect(g.decider(models, [5], 'supprimer')).rejects.toMatchObject({ statusCode: 400 });
  });
});
