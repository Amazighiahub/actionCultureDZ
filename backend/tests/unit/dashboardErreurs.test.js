/**
 * Anti-retour (2026-11-16) : les méthodes du tableau de bord sont passées aux routes sans le contrôleur
 * (dashboardController.getAllUsers) ; une erreur doit répondre par le traitement commun (journal, Sentry,
 * 500 propre), pas faire planter la requête parce que `this` est vide.
 */
jest.mock('../../services/serviceContainer', () => ({
  userManagementService: { getAllUsersFiltered: jest.fn().mockRejectedValue(new Error('base indisponible')) }
}));
const controleur = require('../../controllers/dashboardController');

describe('erreurs du tableau de bord', () => {
  it('méthode appelée seule : erreur traitée par _handleError (500), pas de plantage', async () => {
    const getAllUsers = controleur.getAllUsers; // détachée, comme dans routes/dashboardRoutes.js
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), headersSent: false };
    const req = { query: {}, t: (k) => k };
    await expect(getAllUsers(req, res)).resolves.not.toThrow;
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('plus aucune réponse 500 écrite à la main dans controllers/dashboard', () => {
    const fs = require('fs');
    const path = require('path');
    const dossier = path.join(__dirname, '../../controllers/dashboard');
    const restes = fs.readdirSync(dossier).filter((f) => fs.readFileSync(path.join(dossier, f), 'utf8').includes('res.status(500)'));
    expect(restes).toEqual([]);
  });
});
