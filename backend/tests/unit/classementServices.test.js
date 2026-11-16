/**
 * Classement des services par type et wilaya : note pondérée (un seul 5/5 ne passe pas devant vingt
 * 4,8/5), seulement les services notés, total = tous les services du groupe.
 */
const { classer } = require('../../services/service/classementServices');

const s = (id, type, wilaya) => ({ id, type_service: type, wilaya: wilaya ? { id_wilaya: wilaya } : null });

describe('classement des services', () => {
  const services = [s(1, 'restaurant', 16), s(2, 'restaurant', 16), s(3, 'restaurant', 16), s(4, 'restaurant', 16),
    s(5, 'hotel', 16), s(6, 'restaurant', 31), s(7, 'restaurant', null)];
  const notes = new Map([
    [1, { moyenne: 5, nombre: 1 }],
    [2, { moyenne: 4.8, nombre: 20 }],
    [3, { moyenne: 3.5, nombre: 4 }],
    [5, { moyenne: 4, nombre: 2 }],
    [6, { moyenne: 2, nombre: 1 }],
    [7, { moyenne: 5, nombre: 9 }]
  ]);
  const r = classer(services, notes);

  it('vingt avis à 4,8 devant un seul avis à 5 ; total = tous les restaurants de la wilaya', () => {
    expect(r.get(2)).toEqual({ rang: 1, total: 4 });
    expect(r.get(1)).toEqual({ rang: 2, total: 4 });
    expect(r.get(3)).toEqual({ rang: 3, total: 4 });
  });

  it('sans avis : pas classé ; groupes séparés par type et par wilaya ; sans wilaya : pas classé', () => {
    expect(r.has(4)).toBe(false);
    expect(r.get(5)).toEqual({ rang: 1, total: 1 });
    expect(r.get(6)).toEqual({ rang: 1, total: 1 });
    expect(r.has(7)).toBe(false);
  });

  it('aucune note : rien', () => {
    expect(classer(services, new Map()).size).toBe(0);
  });
});
