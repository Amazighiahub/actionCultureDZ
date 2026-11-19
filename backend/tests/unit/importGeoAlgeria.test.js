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
    Lieu: { update: jest.fn().mockResolvedValue([2]), findAll: jest.fn().mockResolvedValue([]) }
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

  test('publier ou écarter : seulement des brouillons (sites et points de visite)', async () => {
    await g.decider(models, [5, '6', 'x'], 'publier');
    expect(models.Lieu.update).toHaveBeenCalledWith({ statut: 'publie' }, { where: { id_lieu: [5, 6], statut: 'brouillon' } });
    await g.decider(models, [5], 'ecarter');
    expect(models.Lieu.update).toHaveBeenLastCalledWith({ statut: 'archive' }, expect.anything());
    await expect(g.decider(models, [5], 'supprimer')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Import GeoAlgeria : points de visite d’un site existant (Timgad)', () => {
  const timgad = { id_lieu: 24, nom: { fr: 'Timgad' }, latitude: '35.4836', longitude: '6.4668', typePatrimoine: 'site_archeologique', id_lieu_parent: null };
  const capitole = { id_lieu: 30, nom: { fr: 'Capitole' }, latitude: '35.4842', longitude: '6.4660', id_lieu_parent: 24 };
  const voisins = [timgad, capitole];
  const point = (nom, lat, lng, type = 'archaeological_site') => ({ categorie: 'historique', type, nom: { fr: nom }, lat, lng });

  test('une ruine à moins de 1,5 km de Timgad en devient un point ; le site lui-même non ; un monument aux morts non', () => {
    expect(g.siteParent(voisins, point('Arc de Trajan', 35.4847, 6.4652))?.id_lieu).toBe(24);
    // Le site lui-même, sous un autre nom : pas un point, mais « déjà sur Tala DZ »
    expect(g.siteParent(voisins, point('Ruines romaines de Timgad', 35.4836, 6.4668))).toBeNull();
    expect(g.dejaPresent(voisins, point('Ruines romaines de Timgad', 35.4900, 6.4700), null)?.id_lieu).toBe(24);
    expect(g.siteParent(voisins, point('Timgad', 35.4836, 6.4668))).toBeNull();
    const imedghassen = { id_lieu: 40, nom: { fr: 'Imedghassen (Medracen), mausolée royal numide' }, latitude: '35.7', longitude: '6.3', typePatrimoine: 'site_archeologique', id_lieu_parent: null };
    expect(g.siteParent([imedghassen], point('Medracen', 35.701, 6.301))).toBeNull();
    expect(g.dejaPresent([imedghassen], point('Medracen', 35.701, 6.301), null)?.id_lieu).toBe(40);
    expect(g.siteParent(voisins, point('Monument aux morts', 35.4847, 6.4652, 'war_memorial'))).toBeNull();
    expect(g.siteParent(voisins, point('Lambèse', 35.4889, 6.2558))).toBeNull();
  });

  test('déjà présent parmi les points du site : même nom, ou à 30 m ; un voisin à 80 m reste nouveau', () => {
    expect(g.dejaPresent(voisins, point('Capitole', 35.4800, 6.4600), timgad)?.id_lieu).toBe(30);
    expect(g.dejaPresent(voisins, point('Capitol', 35.48422, 6.46602), timgad)?.id_lieu).toBe(30);
    expect(g.dejaPresent(voisins, point('Forum', 35.4849, 6.4660), timgad)).toBeNull();
  });
});

describe('Import GeoAlgeria : qualité des noms (2026-11-19)', () => {
  test('nom générique complété par la commune, en français et en arabe', () => {
    expect(g.nomAvecCommune({ fr: 'Ksar', ar: 'القصر' }, { ascii: 'Zaouiet Kounta', nom: 'زاوية كنتة' })).toEqual({ fr: 'Ksar de Zaouiet Kounta', ar: 'قصر زاوية كنتة' });
    expect(g.nomAvecCommune({ fr: 'Monument aux martyrs', ar: 'نصب الشهداء' }, { ascii: 'Kimmel', nom: 'كيمل' })).toEqual({ fr: 'Monument aux martyrs de Kimmel', ar: 'نصب الشهداء بكيمل' });
    expect(g.nomAvecCommune({ fr: 'Site archéologique important', ar: 'موقع أثري مهم' }, { ascii: 'Arris', nom: 'أريس' })).toEqual({ fr: 'Site archéologique d’Arris', ar: 'موقع أثري بأريس' });
    // Un vrai nom ne change pas
    expect(g.nomAvecCommune({ fr: 'Arc de Trajan', ar: 'قوس تراجان' }, { ascii: 'Timgad', nom: 'تيمقاد' })).toEqual({ fr: 'Arc de Trajan', ar: 'قوس تراجان' });
  });

  test('banques, cités, ronds-points, écoles primaires : pas du patrimoine', () => {
    for (const n of ['Banque de développement local', 'Cité Khalla', 'Rond-point du 20 Avril', 'École primaire de Souk Ouadda']) expect(g.pasPatrimoine({ fr: n })).toBe(true);
    for (const n of ['Villa des Fresques', 'Ancien bordj siège de la Jemâa', 'Siège de Laghouat']) expect(g.pasPatrimoine({ fr: n })).toBe(false);
  });

  test('un lieu au même endroit (30 m) qu’un lieu existant n’est jamais recréé, même comme point de visite', () => {
    const site = { id_lieu: 24, nom: { fr: 'Timgad' }, latitude: '35.4836', longitude: '6.4668', typePatrimoine: 'site_archeologique', id_lieu_parent: null };
    const ancienSite = { id_lieu: 900, nom: '{"fr":"Forum"}', latitude: '35.48491', longitude: '6.46601', id_lieu_parent: null };
    expect(g.dejaPresent([site, ancienSite], { categorie: 'historique', type: 'archaeological_site', nom: { fr: 'Forum romain' }, lat: 35.4849, lng: 6.4660 }, site)?.id_lieu).toBe(900);
  });
});
