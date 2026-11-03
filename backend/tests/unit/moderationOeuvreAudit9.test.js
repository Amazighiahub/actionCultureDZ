/**
 * Audit V9, lot 3 : l'équipe est prévenue d'une œuvre à valider, sans bloquer l'envoi si la
 * notification échoue, et sans se prévenir elle-même.
 */
const mockNotifier = jest.fn(async () => true);
const mockAdmins = jest.fn(async () => [8, 9]);
jest.mock('../../utils/notifierModeration', () => ({ idsAdministrateurs: mockAdmins, notifier: mockNotifier }));

const OeuvreService = require('../../services/oeuvre/oeuvreService');

const contexte = () => {
  const oeuvre = { id_oeuvre: 5, statut: 'brouillon', saisi_par: 7, titre: { fr: 'Mon article' } };
  const repository = { findById: jest.fn(async () => oeuvre), update: jest.fn(async () => ({ ...oeuvre, statut: 'en_attente' })) };
  const svc = Object.create(OeuvreService.prototype);
  svc.repository = repository;
  svc.models = { User: {} };
  svc.notificationService = {};
  svc.logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
  return { svc, repository };
};

beforeEach(() => { mockNotifier.mockClear(); mockAdmins.mockClear(); mockAdmins.mockResolvedValue([8, 9]); });

describe('œuvre envoyée en validation', () => {
  it('prévient chaque administrateur', async () => {
    const { svc, repository } = contexte();
    await svc.submitForValidation(5, 7);
    expect(repository.update).toHaveBeenCalledWith(5, expect.objectContaining({ statut: 'en_attente' }));
    expect(mockNotifier).toHaveBeenCalledTimes(2);
    expect(mockNotifier.mock.calls[0][2].message).toContain('Mon article');
  });

  it('un administrateur auteur ne se prévient pas lui-même', async () => {
    const { svc } = contexte();
    await svc.submitForValidation(5, 7).catch(() => {});
    mockNotifier.mockClear();
    mockAdmins.mockResolvedValue([7, 9]);
    const second = contexte();
    await second.svc.submitForValidation(5, 7);
    expect(mockNotifier).toHaveBeenCalledTimes(1);
    expect(mockNotifier.mock.calls[0][1]).toBe(9);
  });

  it('un échec de notification ne bloque pas l’envoi', async () => {
    mockAdmins.mockRejectedValue(new Error('panne'));
    const { svc, repository } = contexte();
    await expect(svc.submitForValidation(5, 7)).resolves.toBeDefined();
    expect(repository.update).toHaveBeenCalled();
  });
});
