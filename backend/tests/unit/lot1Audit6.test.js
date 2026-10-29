/**
 * Lot 1 de l'audit V6 : dates des événements, œuvres refusées renvoyées.
 */
jest.mock('../../models', () => ({ Evenement: { findByPk: jest.fn() } }));
const { Evenement } = require('../../models');
const { validateEventCreation } = require('../../middlewares/validationMiddleware');

const jour = (decalageJours) => {
  const d = new Date(Date.now() + decalageJours * 86400e3);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(d);
};
const verifier = (body, { method = 'POST', id } = {}) => new Promise((resolve) => {
  const res = { status: (code) => ({ json: () => resolve(code) }) };
  validateEventCreation({ method, body, params: { id } }, res, () => resolve('ok'));
});

describe('Dates d’un événement', () => {
  test('un événement d’aujourd’hui (ce soir) peut être créé ; hier, non', async () => {
    expect(await verifier({ date_debut: jour(0), date_fin: jour(0) })).toBe('ok');
    expect(await verifier({ date_debut: jour(-1) })).toBe(400);
  });

  test('modifier un événement déjà commencé : accepté si la date de début ne change pas', async () => {
    Evenement.findByPk.mockResolvedValue({ date_debut: new Date(Date.now() - 86400e3) });
    expect(await verifier({ date_debut: jour(-1), date_fin: jour(1) }, { method: 'PUT', id: 7 })).toBe('ok');
    // … mais déplacer le début dans le passé reste refusé
    expect(await verifier({ date_debut: jour(-5), date_fin: jour(1) }, { method: 'PUT', id: 7 })).toBe(400);
  });

  test('fin avant le début : refusé', async () => {
    expect(await verifier({ date_debut: jour(2), date_fin: jour(1) })).toBe(400);
  });
});

describe('Œuvre refusée', () => {
  const OeuvreService = require('../../services/oeuvre/oeuvreService');
  const svc = (statut) => {
    const s = Object.create(OeuvreService.prototype);
    const update = jest.fn(async (id, champs) => ({ id_oeuvre: id, ...champs }));
    s.repository = { findById: jest.fn(async () => ({ id_oeuvre: 3, saisi_par: 8, statut })), update };
    s.logger = { info: jest.fn() };
    return { s, update };
  };

  test('son auteur peut la renvoyer à l’équipe', async () => {
    const { s, update } = svc('rejete');
    await s.submitForValidation(3, 8);
    expect(update).toHaveBeenCalledWith(3, expect.objectContaining({ statut: 'en_attente' }));
  });

  test('une œuvre publiée ne se « soumet » pas', async () => {
    await expect(svc('publie').s.submitForValidation(3, 8)).rejects.toMatchObject({ statusCode: 409 });
  });
});
