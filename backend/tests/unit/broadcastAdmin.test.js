/**
 * Envoi à un groupe depuis l'administration : la réponse arrive après la création des
 * notifications, avec le vrai résultat (ou l'erreur), et non plus « envoyé » d'avance.
 */
const mockContainer = { notificationService: {} };
jest.mock('../../services/serviceContainer', () => mockContainer);
const monitoringMethods = require('../../controllers/dashboard/monitoringMethods');

const res = () => { const r = {}; r.status = jest.fn(() => r); r.json = jest.fn(() => r); r.headersSent = false; return r; };
const req = (body) => ({ body, user: { id_user: 1 }, t: (k, d) => d || k });

describe('Administration — envoi à un groupe', () => {
  it('répond avec le nombre réel de notifications et d’e-mails', async () => {
    mockContainer.notificationService.broadcastNotification = jest.fn().mockResolvedValue({ notified: 120, emails: 95, email_etat: 'actif' });
    const r = res();
    await monitoringMethods.broadcastNotification(req({ title: 'Salon', message: 'Venez', target: 'all' }), r);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ notified: 120, emails: 95, email_etat: 'actif' }) }));
  });

  it('erreur de l’envoi : visible par l’administration (500), plus de faux « envoyé »', async () => {
    mockContainer.notificationService.broadcastNotification = jest.fn().mockRejectedValue(new Error("Unknown column 'x'"));
    const r = res();
    await monitoringMethods.broadcastNotification(req({ title: 'Salon', message: 'Venez', target: 'all' }), r);
    expect(r.status).toHaveBeenCalledWith(500);
  });
});
