/**
 * Anti-retour (2026-11-17) : ajouter un contributeur à un article ou une œuvre propose aussi les
 * professionnels de l'annuaire public (et pas seulement les fiches d'auteurs). Un professionnel qui a
 * déjà sa fiche n'apparaît qu'une fois ; le compte lié à une fiche n'est jamais renvoyé.
 */
jest.mock('../../services/serviceContainer', () => ({
  intervenantService: { searchIntervenants: jest.fn() },
  userService: { findValidatedProfessionals: jest.fn() }
}));
const container = require('../../services/serviceContainer');
const controller = require('../../controllers/intervenantController');

const reponse = () => {
  const res = { json: jest.fn(), status: jest.fn(() => res) };
  return res;
};

describe('Recherche de contributeurs : fiches d’auteurs et professionnels', () => {
  beforeEach(() => jest.clearAllMocks());

  test('les professionnels sans fiche sont ajoutés, marqués « professionnel »', async () => {
    container.intervenantService.searchIntervenants.mockResolvedValue([
      { id_intervenant: 4, nom: 'Benali', prenom: 'Karim', id_user: 37, specialites: [] }
    ]);
    container.userService.findValidatedProfessionals.mockResolvedValue({ data: [
      { toJSON: () => ({ id_user: 37, nom: 'Benali', prenom: 'Karim' }) },
      { toJSON: () => ({ id_user: 52, nom: 'Benaissa', prenom: 'Samia', entreprise: 'Atelier Samia', TypeUser: { nom_type: 'Artiste' } }) }
    ] });
    const res = reponse();
    await controller.searchIntervenants({ query: { q: 'Ben' }, lang: 'fr' }, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ id: 4, source: 'intervenant' });
    expect(data[0]).not.toHaveProperty('id_user');
    expect(data[1]).toMatchObject({ id: null, id_user: 52, source: 'professionnel', label: 'Samia Benaissa', organisation: 'Atelier Samia' });
    expect(container.userService.findValidatedProfessionals).toHaveBeenCalledWith(expect.objectContaining({ q: 'Ben', page: 1 }));
  });

  test('l’annuaire en panne ne bloque pas la recherche des fiches', async () => {
    container.intervenantService.searchIntervenants.mockResolvedValue([{ id_intervenant: 4, nom: 'Benali', prenom: 'Karim' }]);
    container.userService.findValidatedProfessionals.mockRejectedValue(new Error('panne'));
    const res = reponse();
    await controller.searchIntervenants({ query: { q: 'Ben' }, lang: 'fr' }, res);
    expect(res.json.mock.calls[0][0].data).toHaveLength(1);
  });
});
