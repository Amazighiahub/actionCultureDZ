/**
 * Anti-retour (2026-11-19) : découpage à 69 wilayas. La migration, le fichier de remplissage d'une base neuve
 * (algeria_cities.json) et la constante NB_WILAYAS doivent dire la même chose.
 */
const { NOUVELLES, DAIRAS, PARTAGE } = require('../../migrations/20261232-wilayas-69');
const { NB_WILAYAS } = require('../../constants/geographie');
const villes = require('../../algeria_cities.json');

describe('Découpage à 69 wilayas', () => {
  test('onze nouvelles wilayas, de 59 à 69, et la constante à 69', () => {
    expect(NOUVELLES.map(([code]) => code)).toEqual([59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69]);
    expect(NB_WILAYAS).toBe(69);
    for (const [, ar, ascii] of NOUVELLES) { expect(ar).toMatch(/[؀-ۿ]/); expect(ascii).toBeTruthy(); }
  });

  test('chaque nouvelle wilaya reçoit au moins une daïra, toujours depuis une ancienne', () => {
    const recues = new Set([...DAIRAS.map(([, , n]) => n), PARTAGE.nouvelleWilaya]);
    expect([...recues].sort((a, b) => a - b)).toEqual(NOUVELLES.map(([c]) => c));
    for (const [ancienne] of DAIRAS) expect(ancienne).toBeLessThanOrEqual(58);
  });

  test('base neuve : 69 wilayas, 108 communes dans les nouvelles, El Aricha et El Gor dans la daïra d’El Aricha', () => {
    const codes = new Set(villes.map((v) => Number(v.wilaya_code)));
    expect(codes.size).toBe(NB_WILAYAS);
    expect(villes.filter((v) => Number(v.wilaya_code) >= 59)).toHaveLength(108);
    const aricha = villes.filter((v) => v.daira_name_ascii === 'El Aricha').map((v) => v.commune_name_ascii).sort();
    expect(aricha).toEqual(['El Aricha', 'El Gor']);
    expect(villes.find((v) => v.commune_name_ascii === 'Sebdou').wilaya_code).toBe('13');
    // Une daïra n'appartient qu'à une seule wilaya
    const wilayaDe = new Map();
    for (const v of villes) {
      const cle = `${v.daira_name_ascii}`;
      if (!wilayaDe.has(cle)) wilayaDe.set(cle, new Set());
      wilayaDe.get(cle).add(v.wilaya_code);
    }
    for (const [, d] of DAIRAS) expect(wilayaDe.get(d).size).toBe(1);
  });
});
