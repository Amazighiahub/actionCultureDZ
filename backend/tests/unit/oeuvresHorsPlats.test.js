/**
 * Catalogue des Œuvres : les plats (articles de la section Gastronomie d'un lieu) n'y figurent pas ;
 * ils restent dans Artisanat › Gastronomie et sur la page du lieu.
 */
const { Op } = require('sequelize');
const OeuvreRepository = require('../../repositories/oeuvreRepository');

const repo = () => {
  const r = Object.create(OeuvreRepository.prototype);
  r.findAll = jest.fn().mockResolvedValue({ data: [], pagination: {} });
  r.getDefaultIncludes = () => [];
  r.models = { Categorie: {} };
  return r;
};
const exclutLesPlats = (where) => (where[Op.and] || []).some(c => String(c.val).includes("section_patrimoine = 'gastronomie'"));

describe('Œuvres publiées sans les plats de la Gastronomie', () => {
  it('liste, filtre par type et par catégorie', async () => {
    const r = repo();
    await r.findPublished({ page: 1 });
    await r.findByType(4, {});
    await r.findByCategory(1, {});
    for (const [options] of r.findAll.mock.calls) {
      expect(options.where.statut).toBe('publie');
      expect(exclutLesPlats(options.where)).toBe(true);
    }
  });
});
