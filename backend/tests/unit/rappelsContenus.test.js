/**
 * Rappels aux professionnels : une notification par événement sans photo et par service ancien,
 * jamais deux fois le même rappel (même lien, même compte). Les requêtes elles-mêmes ont été
 * essayées sur une base MySQL réelle (dates simulées) ; ici, la logique d'envoi.
 */
const { rappelerPhotos, rappelerServices, lienPhotos, lienService } = require('../../services/rappelsContenus');

const sequelize = { literal: jest.fn((s) => s), where: jest.fn(() => ({})), escape: jest.fn(() => "'2027-01-03'") };

function modeles({ evenements = [], services = [], dejaEnvoyes = [] } = {}) {
  return {
    sequelize,
    Evenement: { findAll: jest.fn().mockResolvedValue(evenements) },
    Media: {},
    Service: { findAll: jest.fn().mockResolvedValue(services) },
    Notification: { count: jest.fn(async ({ where }) => (dejaEnvoyes.includes(where.url_action) ? 1 : 0)) }
  };
}

describe('rappels aux professionnels', () => {
  it('un rappel « photos » par événement, sauf s’il a déjà été envoyé', async () => {
    const envoi = { sendToUser: jest.fn() };
    const m = modeles({
      evenements: [{ id_evenement: 7, id_user: 3, nom_evenement: { fr: 'Fête des cerises' } }, { id_evenement: 8, id_user: 4, nom_evenement: { fr: 'Salon' } }],
      dejaEnvoyes: [lienPhotos(8)]
    });
    await expect(rappelerPhotos(m, envoi)).resolves.toBe(1);
    expect(envoi.sendToUser).toHaveBeenCalledWith(3, expect.objectContaining({
      type_notification: 'autre', url_action: '/dashboard-pro?gerer=7&onglet=documents'
    }));
    expect(envoi.sendToUser.mock.calls[0][1].message).toContain('Fête des cerises');
  });

  it('un rappel « à jour ? » par service ancien, vers sa page de modification', async () => {
    const envoi = { sendToUser: jest.fn() };
    const m = modeles({ services: [{ id: 5, id_user: 9, nom: { fr: 'Gîte' } }] });
    await expect(rappelerServices(m, envoi)).resolves.toBe(1);
    expect(envoi.sendToUser).toHaveBeenCalledWith(9, expect.objectContaining({ url_action: lienService(5) }));
  });

  it('sans modèles (base indisponible) : rien n’est envoyé', async () => {
    await expect(rappelerPhotos({}, { sendToUser: jest.fn() })).resolves.toBe(0);
    await expect(rappelerServices({}, { sendToUser: jest.fn() })).resolves.toBe(0);
  });
});
