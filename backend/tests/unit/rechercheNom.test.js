/**
 * Recherche par nom de personne : chaque mot compte, jamais d'injection, et un type
 * qui n'est pas un métier n'ouvre pas les comptes visiteurs ou administrateurs.
 */
const { Op } = require('sequelize');
const { conditionNom, conditionAuteurOeuvre } = require('../../repositories/rechercheNom');
const UserRepository = require('../../repositories/userRepository');
const { PROFESSIONAL_TYPE_IDS } = require('../../constants/publicAttributes');

const sequelize = {
  escape: (v) => `'${String(v).replace(/'/g, "''")}'`,
  literal: (v) => ({ val: v }),
};
const colonnes = { nom: 'u.nom', prenom: 'u.prenom' };

describe('conditionNom', () => {
  test('vide : pas de condition', () => {
    expect(conditionNom(sequelize, '   ', colonnes)).toBeNull();
    expect(conditionNom(sequelize, undefined, colonnes)).toBeNull();
  });

  test('chaque mot doit se trouver dans le prénom ou le nom', () => {
    const sql = conditionNom(sequelize, 'amel charrad', colonnes);
    expect(sql).toContain("'%amel%'");
    expect(sql).toContain("'%charrad%'");
    expect(sql).toContain(' AND ');
  });

  test('ne regarde que les valeurs, pas les clés de langue', () => {
    expect(conditionNom(sequelize, 'fr', colonnes)).toContain("JSON_EXTRACT(u.nom, '$.*')");
  });

  test('guillemet et jokers neutralisés', () => {
    const sql = conditionNom(sequelize, "o'brien 100%", colonnes);
    expect(sql).toContain("o''brien");
    expect(sql).toContain('100\\%');
  });

  test('au plus 5 mots', () => {
    const sql = conditionNom(sequelize, 'a b c d e f g', colonnes);
    expect(sql.split(' AND ')).toHaveLength(5);
  });
});

test('auteur d’une œuvre : publiée par, contributeur ou intervenant', () => {
  const sql = conditionAuteurOeuvre(sequelize, 'amel');
  expect(sql).toContain('`saisi_par`');
  expect(sql).toContain('`oeuvre_user`');
  expect(sql).toContain('`oeuvre_intervenant`');
});

describe('annuaire des professionnels', () => {
  const fabriquer = () => {
    const depot = Object.create(UserRepository.prototype);
    depot.model = { sequelize };
    depot.findAll = jest.fn().mockResolvedValue({ data: [], pagination: {} });
    return depot;
  };

  test.each([[1], [29], ['abc'], [undefined]])('type %s : uniquement les métiers', async (type) => {
    const depot = fabriquer();
    await depot.findValidatedProfessionals({ type });
    expect(depot.findAll.mock.calls[0][0].where.id_type_user).toEqual({ [Op.in]: PROFESSIONAL_TYPE_IDS });
  });

  test('métier, wilaya et nom filtrent, profils publics seulement', async () => {
    const depot = fabriquer();
    await depot.findValidatedProfessionals({ type: '7', wilaya: '16', q: 'amel', page: 1, limit: 24 });
    const { where, page, limit } = depot.findAll.mock.calls[0][0];
    expect(where.id_type_user).toBe(7);
    expect(where.wilaya_residence).toBe(16);
    expect(where.profil_public).toBe(true);
    expect(where.statut).toBe('actif');
    expect(where[Op.and][0].val).toContain('%amel%');
    expect([page, limit]).toEqual([1, 24]);
  });
});
