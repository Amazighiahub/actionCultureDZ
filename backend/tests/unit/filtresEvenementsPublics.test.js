/**
 * Filtres wilaya et période de la page Événements (audit V11 UX-17) : avant, ignorés par le serveur.
 */
const { Op } = require('sequelize');
const EvenementRepository = require('../../repositories/evenementRepository');

const depot = () => {
  const repo = Object.create(EvenementRepository.prototype);
  repo.model = { name: 'Evenement' };
  return repo;
};

describe('filtres publics des événements (audit V11 UX-17)', () => {
  it('wilaya : sous-requête lieu → commune → daïra, identifiant entier seulement', async () => {
    const [cond] = await depot()._buildPublicFilters({ wilaya: '5' });
    expect(cond.id_lieu[Op.in].val).toMatch(/d\.wilayaId = 5\)/);
    expect(await depot()._buildPublicFilters({ wilaya: '5 OR 1=1' })).toEqual([]);
    expect(await depot()._buildPublicFilters({ wilaya: '-3' })).toEqual([]);
  });

  it('période : chevauchement, jours d\'Algérie ; dates mal formées ignorées', async () => {
    const conds = await depot()._buildPublicFilters({ dateDebut: '2026-11-20', dateFin: '2026-11-21' });
    expect(conds).toHaveLength(2);
    expect(conds[0].date_debut[Op.lte].toISOString()).toBe('2026-11-21T22:59:59.000Z');
    expect(conds[1].logic[Op.gte].toISOString()).toBe('2026-11-19T23:00:00.000Z');
    expect(await depot()._buildPublicFilters({ dateDebut: "2026-11-20'; DROP", dateFin: 'demain' })).toEqual([]);
  });
});
