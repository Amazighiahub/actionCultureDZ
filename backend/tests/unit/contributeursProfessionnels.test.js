/**
 * Anti-retour (2026-11-19) : un contributeur ajouté par son compte (utilisateurs_inscrits) n'obtient une
 * fiche d'auteur publique que s'il est un professionnel de l'annuaire public (actif, profil public).
 */
const OeuvreService = require('../../services/oeuvre/oeuvreService');
const { PROFESSIONAL_TYPE_IDS } = require('../../constants/publicAttributes');

describe('Contributeurs : seulement des professionnels publics', () => {
  test('la recherche des comptes sans fiche filtre sur l’annuaire public', async () => {
    const service = Object.create(OeuvreService.prototype);
    service.models = {
      OeuvreIntervenant: { bulkCreate: jest.fn(), destroy: jest.fn() },
      Intervenant: { findAll: jest.fn().mockResolvedValue([]), bulkCreate: jest.fn() },
      User: { findAll: jest.fn().mockResolvedValue([]) }
    };
    await service._associateIntervenants(1, { utilisateurs_inscrits: [{ id_user: 52, id_type_user: 3 }] }, null);
    const where = service.models.User.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ statut: 'actif', profil_public: true });
    expect(where.id_type_user[require('sequelize').Op.in]).toEqual(PROFESSIONAL_TYPE_IDS);
    // Compte privé (rien de renvoyé) : aucune fiche créée
    expect(service.models.Intervenant.bulkCreate).not.toHaveBeenCalled();
  });
});
