/**
 * Traduction d'une langue par l'administration (PATCH /oeuvres/:id/translation/:lang et
 * /users/:id/translation/:lang) : la méthode appelée n'existait pas, erreur 500 à chaque appel (audit V11).
 */
const OeuvreService = require('../../services/oeuvre/oeuvreService');
const UserService = require('../../services/user/userService');

const ligne = (donnees) => ({ ...donnees, update: jest.fn(async function (u) { Object.assign(this, u); }) });

describe('traduction par l\'administration', () => {
  it('œuvre : la langue reçue est fusionnée, les autres langues restent', async () => {
    const oeuvre = ligne({ titre: { fr: 'La Colline oubliée', ar: '' }, description: { fr: 'Roman' } });
    const s = Object.create(OeuvreService.prototype);
    s.models = { Oeuvre: { findByPk: jest.fn().mockResolvedValue(oeuvre) } };
    s.cache = { invalidate: jest.fn() };
    s.findWithFullDetails = jest.fn().mockResolvedValue({ id: 1 });
    await s.updateTranslation(1, 'ar', { titre: '  الربوة المنسية ', inconnu: 'x' });
    expect(oeuvre.update).toHaveBeenCalledWith({ titre: { fr: 'La Colline oubliée', ar: 'الربوة المنسية' } });
    expect(s.findWithFullDetails).toHaveBeenCalledWith(1, { incrementViews: false });
  });

  it('compte : prénom et nom ; rien de valide → 400 ; introuvable → 404', async () => {
    const user = ligne({ prenom: { fr: 'Amel' }, nom: { fr: 'Charrad' }, biographie: null });
    const s = Object.create(UserService.prototype);
    s.models = { User: { findByPk: jest.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(user).mockResolvedValueOnce(null) } };
    s.findById = jest.fn().mockResolvedValue({ id: 7 });
    await s.updateTranslation(7, 'tz-ltn', { prenom: 'Amel', nom: 'Ccerrad' });
    expect(user.update).toHaveBeenCalledWith({ prenom: { fr: 'Amel', 'tz-ltn': 'Amel' }, nom: { fr: 'Charrad', 'tz-ltn': 'Ccerrad' } });
    await expect(s.updateTranslation(7, 'ar', { prenom: '   ' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(s.updateTranslation(8, 'ar', { prenom: 'أمل' })).rejects.toMatchObject({ statusCode: 404 });
  });
});
