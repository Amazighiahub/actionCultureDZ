/**
 * Audit V11 COD-18 (statuts des événements, source unique) et COD-B11 (bloc pagination commun).
 */
const statuts = require('../../constants/statuts');
const { construirePagination, decalage, bornerPagination } = require('../../utils/pagination');

describe('constants/statuts (COD-18)', () => {
  test('listes d\'événement identiques aux anciennes copies', () => {
    expect(statuts.EVENEMENT_PUBLIE).toEqual(['publie', 'planifie']);
    expect(statuts.EVENEMENT_OUVERT).toEqual(['publie', 'planifie', 'en_cours']);
    expect(statuts.EVENEMENT_VISIBLE).toEqual(['publie', 'planifie', 'en_cours', 'termine']);
    expect(statuts.EVENEMENT_PUBLIC).toEqual(['publie', 'planifie', 'en_cours', 'termine', 'reporte', 'annule']);
    expect(statuts.EVENEMENT_NON_PUBLIC).toEqual(['brouillon', 'en_attente']);
    expect(statuts.OEUVRE_NON_PUBLIC).toEqual(['brouillon', 'en_attente']);
  });

  test('chaque liste d\'événement ne contient que des valeurs de l\'ENUM du modèle', () => {
    for (const nom of ['EVENEMENT_PUBLIE', 'EVENEMENT_OUVERT', 'EVENEMENT_VISIBLE', 'EVENEMENT_PUBLIC', 'EVENEMENT_NON_PUBLIC']) {
      for (const s of statuts[nom]) expect(statuts.EVENEMENT_TOUS).toContain(s);
    }
  });

  test('listes gelées : un appelant ne peut pas les modifier', () => {
    expect(Object.isFrozen(statuts.EVENEMENT_VISIBLE)).toBe(true);
    expect(() => { 'use strict'; statuts.EVENEMENT_PUBLIE.push('brouillon'); }).toThrow();
  });

  test('les services reprennent la même liste', () => {
    expect(require('../../services/liensExternes').STATUTS_EVENEMENT_PUBLICS).toBe(statuts.EVENEMENT_PUBLIC);
  });
});

describe('utils/pagination construirePagination (COD-B11)', () => {
  test('aucun élément', () => {
    expect(construirePagination(0, 1, 20)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0, pages: 0, hasNext: false, hasPrev: false });
  });

  test('un élément', () => {
    expect(construirePagination(1, 1, 20)).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1, pages: 1, hasNext: false, hasPrev: false });
  });

  test('21 éléments : page 1 puis page 2 sur 2', () => {
    expect(construirePagination(21, 1, 20)).toMatchObject({ totalPages: 2, pages: 2, hasNext: true, hasPrev: false });
    expect(construirePagination(21, 2, 20)).toMatchObject({ page: 2, totalPages: 2, pages: 2, hasNext: false, hasPrev: true });
  });

  test('decalage = lignes à sauter', () => {
    expect(decalage(1, 20)).toBe(0);
    expect(decalage(3, 10)).toBe(20);
  });

  test('bornerPagination inchangé', () => {
    expect(bornerPagination('abc', '500')).toEqual({ page: 1, limit: 100 });
    expect(bornerPagination(undefined, undefined, 50)).toEqual({ page: 1, limit: 50 });
  });
});
