/**
 * Colonnes de recherche et de tri calculées par MySQL (audit V11 BDD-3, BDD-6) : utilisées quand la
 * migration est passée, sinon l'ancien calcul (base créée depuis les modèles, migration pas encore passée).
 */
const { aColonne, _viderPourTests } = require('../../utils/colonnesCalculees');
const { conditionNom, conditionAuteurOeuvre } = require('../../repositories/rechercheNom');
const { rechercheNomPersonne } = require('../../utils/multiLangSearchBuilder');
const EvenementRepository = require('../../repositories/evenementRepository');

const sequelize = { escape: (v) => `'${String(v).replace(/'/g, "''")}'`, literal: (s) => ({ val: s }) };
const modele = (colonnes, table = 'user') => ({
  getTableName: () => table,
  sequelize: { getQueryInterface: () => ({ describeTable: jest.fn().mockResolvedValue(Object.fromEntries(colonnes.map((c) => [c, {}]))) }) },
});

beforeEach(() => _viderPourTests());

describe('colonnes calculées (audit V11 BDD-3, BDD-6)', () => {
  it('aColonne : présente, absente, modèle factice', async () => {
    expect(await aColonne(modele(['nom', 'nom_recherche']), 'nom_recherche')).toBe(true);
    _viderPourTests();
    expect(await aColonne(modele(['nom']), 'nom_recherche')).toBe(false);
    expect(await aColonne({ sequelize: {} }, 'nom_recherche')).toBe(false);
  });

  it('nom d\'une personne : une seule comparaison sur nom_recherche, chaque mot', () => {
    const sql = conditionNom(sequelize, 'amel charrad', { nom: 'u.`nom`', prenom: 'u.`prenom`', recherche: 'u.`nom_recherche`' });
    expect(sql).toBe("(u.`nom_recherche` LIKE '%amel%') AND (u.`nom_recherche` LIKE '%charrad%')");
    expect(conditionNom(sequelize, 'amel', { nom: 'u.`nom`', prenom: 'u.`prenom`' })).toContain('JSON_EXTRACT(u.`nom`');
    expect(conditionAuteurOeuvre(sequelize, 'amel', 'Oeuvre', { user: true, intervenant: false }))
      .toMatch(/u\.`nom_recherche` LIKE[\s\S]*JSON_EXTRACT\(i\.`nom`/);
  });

  it('rechercheNomPersonne : colonne si elle existe, sinon nom et prénom langue par langue', async () => {
    const avec = await rechercheNomPersonne(sequelize, modele(['nom_recherche']), 'nour', 'User');
    expect(avec).toEqual([{ val: "`User`.`nom_recherche` LIKE '%nour%'" }]);
    _viderPourTests();
    const sans = await rechercheNomPersonne({ ...sequelize, literal: (s) => s }, modele([]), 'nour', 'User');
    expect(sans.length).toBe(10);
  });

  it('liste des événements : à venir d\'abord, puis les terminés pour compléter la page', async () => {
    const repo = Object.create(EvenementRepository.prototype);
    const aVenir = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const passes = [{ id: 9 }, { id: 8 }];
    repo.model = {
      count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(3),
      findAll: jest.fn(async ({ order, limit, offset }) => (order[0][1] === 'ASC' ? aVenir : passes).slice(offset, offset + limit)),
    };
    repo._defaultIncludes = () => [];
    const page2 = await repo._pagePubliee({}, 2, 2);
    // Page 2 de 2 : le 3e à venir, puis le premier terminé
    expect(page2.data.map((e) => e.id)).toEqual([3, 9]);
    expect(page2.pagination).toMatchObject({ total: 5, totalPages: 3, hasNext: true });
  });
});
