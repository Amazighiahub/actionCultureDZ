/**
 * Les recherches d'œuvres et d'artisanat utilisent bien le nom de l'auteur :
 * ce test charge les vrais dépôts, pour qu'un import manquant ne passe pas inaperçu.
 */
const { Op } = require('sequelize');
const OeuvreRepository = require('../../repositories/oeuvreRepository');
const ArtisanatRepository = require('../../repositories/artisanatRepository');

const sequelize = { escape: (v) => `'${v}'`, literal: (v) => ({ val: v }) };
const texte = (x) => JSON.stringify(x, (_, v) => (typeof v === 'symbol' ? String(v) : v));

test('œuvres : le titre ou le nom de l’auteur', async () => {
  const depot = Object.create(OeuvreRepository.prototype);
  depot.model = { sequelize };
  depot.models = {};
  depot.getDefaultIncludes = () => [];
  depot._sanitizeSearchQuery = (q) => q;
  depot.findAll = jest.fn().mockResolvedValue({ data: [] });
  await depot.searchAdvanced({ query: 'amel' });
  const sql = depot.findAll.mock.calls[0][0].where[Op.and][0].val;
  expect(sql).toContain('texte_recherche');
  expect(sql).toContain('`saisi_par`');
  expect(sql).toContain('%amel%');
});

test('artisanat : le produit ou le nom de l’artisan', async () => {
  const depot = Object.create(ArtisanatRepository.prototype);
  const Oeuvre = {};
  const findAndCountAll = jest.fn().mockResolvedValue({ rows: [], count: 0 });
  depot.model = { sequelize, findAndCountAll };
  depot.models = { Oeuvre };
  depot._defaultIncludes = () => [{ model: Oeuvre }];
  depot._sanitizeSearchQuery = (q) => q;
  await depot.searchArtisanats('amel');
  const { where } = findAndCountAll.mock.calls[0][0].include[0];
  expect(where.statut).toBe('publie');
  const conditions = where[Op.or].map((c) => c.val);
  expect(conditions.some((c) => c.includes('`saisi_par`') && c.includes('%amel%'))).toBe(true);
  expect(texte(conditions)).toContain('titre');
});
