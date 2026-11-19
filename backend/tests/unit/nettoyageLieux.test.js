/**
 * Anti-retour (2026-11-19) : nettoyage des lieux importés (audit des 1 034 lieux en ligne).
 * Noms génériques complétés (fr et ar), noms corrigés, types religieux, doublons, hors patrimoine.
 */
const g = require('../../services/patrimoine/importGeoAlgeria');
const { nomNettoye, typeCorrige, doublons } = require('../../services/patrimoine/nettoyageLieux');

describe('Nettoyage des lieux : noms', () => {
  test('toutes les formes « X des martyrs » et les noms vagues reçoivent la commune', () => {
    const commune = { ascii: 'Guelma', nom: 'قالمة' };
    for (const fr of ['Mémorial des martyrs', 'Monument des Martyrs', 'Mémorial du martyr', 'Stèle des Martyrs', 'Place des Martyrs',
      'Makam Echahid', 'Maqam el Chahid', 'Carré des martyrs', 'Tombe solaire', 'Château', 'Dar', 'Mur français', 'Muraille byzantine',
      'Aqueduc romain', 'Théâtre romain', 'Place du 1er Novembre', 'Cathédrale', 'Martyr']) {
      expect(g.nomAvecCommune({ fr }, commune).fr).toBe(`${fr} de Guelma`);
    }
    // Un vrai nom ne change pas ; un nom déjà complété non plus
    expect(g.nomAvecCommune({ fr: 'Mosquée Ketchaoua' }, commune).fr).toBe('Mosquée Ketchaoua');
    expect(g.nomAvecCommune({ fr: 'Monument des martyrs de Guelma' }, commune).fr).toBe('Monument des martyrs de Guelma');
    expect(g.estGenerique('Tombe solaire de Djanet', 'Djanet')).toBe(true);
    expect(g.estGenerique('Mosquée Ketchaoua', 'Casbah')).toBe(false);
  });

  test('arabe : « ب » + commune, sauf si le nom cite déjà la commune', () => {
    expect(g.nomAvecCommune({ fr: 'Place des Martyrs', ar: 'ساحة الشهداء' }, { ascii: 'Bouira', nom: 'البويرة' }).ar).toBe('ساحة الشهداء بالبويرة');
    expect(g.nomAvecCommune({ fr: 'Place des Martyrs', ar: 'ساحة الشهداء رقان' }, { ascii: 'Reggane', nom: 'رقان' }).ar).toBe('ساحة الشهداء رقان');
  });

  test('majuscule, « Mémorial », « martyrs », fautes fréquentes ; l’arabe n’est pas touché', () => {
    expect(nomNettoye({ fr: 'le vieux marché', ar: 'السوق القديم' })).toEqual({ fr: 'Le vieux marché', ar: 'السوق القديم' });
    expect(nomNettoye({ fr: 'Memorial aux martyres' }).fr).toBe('Mémorial aux martyrs');
    expect(nomNettoye({ fr: 'Mosqué Sid Lhadj Bohos' }).fr).toBe('Mosquée Sid Lhadj Bohos');
    expect(nomNettoye({ fr: 'Puis de marché' }).fr).toBe('Puits de marché');
    const intact = { fr: 'Arc de Trajan' };
    expect(nomNettoye(intact)).toBe(intact);
  });

  test('rues et châteaux d’eau : pas du patrimoine', () => {
    expect(g.pasPatrimoine({ fr: 'Rue du martyr Chebati' })).toBe(true);
    expect(g.pasPatrimoine({ fr: 'Château d’eau' })).toBe(true);
    expect(g.pasPatrimoine({ fr: 'Château de Draria' })).toBe(false);
  });
});

describe('Nettoyage des lieux : types', () => {
  test('mosquée, zaouïa, minaret classés monument ou forteresse → édifice religieux ; des ruines restent un site', () => {
    expect(typeCorrige({ fr: 'Mosquée Oqba ibn Nafi' }, 'palais_forteresse')).toBe('edifice_religieux');
    expect(typeCorrige({ fr: 'Zaouïa Sidi Benamer' }, 'monument')).toBe('edifice_religieux');
    expect(typeCorrige({ fr: 'Ruines de la mosquée de Mansourah' }, 'monument')).toBe('monument');
    expect(typeCorrige({ fr: 'Basilique de Theveste' }, 'site_archeologique')).toBe('site_archeologique');
    expect(typeCorrige({ fr: 'Fort Joinville' }, 'palais_forteresse')).toBe('palais_forteresse');
  });
});

describe('Nettoyage des lieux : doublons', () => {
  const l = (id_lieu, fr, lat, lng, o = {}) => ({ id_lieu, fr, lat, lng, parent: null, importe: true, commune: 'X', nbEnfants: 0, ...o });

  test('le lieu importé en double est retiré au profit du lieu saisi à la main', () => {
    expect(doublons([
      l(71, 'Mosquée Ketchaoua', 36.7856, 3.0600, { importe: false, parent: 69 }),
      l(2815, 'Mosquée Ketchaoua', 36.7864, 3.0601, { parent: 2792 })
    ])).toEqual([{ retire: 2815, garde: 71 }]);
  });

  test('deux sites du même nom à moins de 15 km : le plus riche en points de visite est gardé', () => {
    expect(doublons([
      l(2202, "Parc National d'El Kala", 36.77, 8.43, { nbEnfants: 2 }),
      l(2800, "Parc national d'El Kala", 36.88, 8.44)
    ])).toEqual([{ retire: 2800, garde: 2202 }]);
  });

  test('jamais fusionnés : sites génériques (tombes de Djanet), lieux saisis à la main, lieux éloignés, points à plus de 300 m', () => {
    expect(doublons([l(1, 'Tombe solaire de Djanet', 24.55, 9.48, { commune: 'Djanet' }), l(2, 'Tombe solaire de Djanet', 24.56, 9.49, { commune: 'Djanet' })])).toEqual([]);
    expect(doublons([l(1, 'Fort', 36, 3, { importe: false }), l(2, 'Fort', 36, 3, { importe: false })])).toEqual([]);
    expect(doublons([l(1, 'Ksar el Kaoua', 35.9, 1.2), l(2, 'Ksar el Kaoua', 34.0, 1.2)])).toEqual([]);
    expect(doublons([l(1, "Mur d'enceinte", 35.4903, 6.2560, { parent: 5 }), l(2, "Mur d'enceinte", 35.4935, 6.2560, { parent: 6 })])).toEqual([]);
  });
});
