/**
 * Annuaire des organisations : filtres faits par MySQL et compteurs des filtres par un comptage groupé
 * (avant : toutes les organisations lues, avec leur description, à chaque visite ; audit V11 BDD-7).
 */
const OrganisationService = require('../../services/organisations/organisationService');

const ligne = (id, code, idWilaya) => ({
  get: () => ({ id_organisation: id, nom: { fr: `Org ${id}` }, description: null, id_wilaya: idWilaya, TypeOrganisation: code ? { code } : null }),
});

const service = () => {
  const s = Object.create(OrganisationService.prototype);
  s.repository = {
    findAnnuaire: jest.fn().mockResolvedValue([ligne(1, 'maison_edition', 13)]),
    compteurs: jest.fn().mockResolvedValue(new Map([[1, { evenements: 2, oeuvres: 5 }]])),
    typesOrganisation: jest.fn().mockResolvedValue([
      { id_type_organisation: 3, code: 'maison_edition' }, { id_type_organisation: 4, code: 'association' }, { id_type_organisation: 9, code: 'inconnu' },
    ]),
    facettesAnnuaire: jest.fn().mockResolvedValue([
      { code: 'maison_edition', id_wilaya: 13, nom: 'تلمسان', wilaya_name_ascii: 'Tlemcen', n: 6 },
      { code: 'association', id_wilaya: 6, nom: 'بجاية', wilaya_name_ascii: 'Béjaïa', n: 2 },
      { code: null, id_wilaya: null, nom: null, wilaya_name_ascii: null, n: 1 },
    ]),
  };
  return s;
};

describe('annuaire des organisations (audit V11 BDD-7)', () => {
  it('famille traduite en types pour MySQL ; « autres » garde aussi les organisations sans type', async () => {
    const s = service();
    await s.annuaire({ categorie: 'edition' });
    expect(s.repository.findAnnuaire).toHaveBeenCalledWith({ idWilaya: null, idsTypes: [3], avecSansType: false });
    await s.annuaire({ categorie: 'autres', wilaya: 13 });
    expect(s.repository.findAnnuaire).toHaveBeenLastCalledWith({ idWilaya: 13, idsTypes: [9], avecSansType: true });
  });

  it('compteurs des filtres et wilayas présentes, sans relire les fiches', async () => {
    const { organisations, categories, wilayas } = await service().annuaire();
    expect(categories).toEqual({ edition: 6, associations: 2, autres: 1 });
    expect(wilayas.map((w) => w.wilaya_name_ascii)).toEqual(['Béjaïa', 'Tlemcen']);
    expect(organisations[0]).toMatchObject({ id_organisation: 1, categorie: 'edition', evenements: 2, oeuvres: 5 });
  });

  it('vitrine d\'une wilaya : pas de comptage des filtres', async () => {
    const s = service();
    const { categories, wilayas } = await s.annuaire({ wilaya: 13, facettes: false });
    expect(s.repository.facettesAnnuaire).not.toHaveBeenCalled();
    expect(categories).toEqual({});
    expect(wilayas).toEqual([]);
  });
});
