/**
 * Newsletter : liens vers les contenus, sections vides masquées, titres échappés ; envoi aux comptes
 * puis aux abonnés sans compte, sans doublon, jamais au-delà du quota, rien sans nouveauté.
 */
jest.mock('../../services/quotaEmail', () => ({ budgetEnvoiGroupe: jest.fn(async () => 220) }));

const { Op } = require('sequelize');
const { budgetEnvoiGroupe } = require('../../services/quotaEmail');
const cronService = require('../../services/cronService');

const html = (...args) => cronService.generateNewsletterHtml(...args);

beforeEach(() => {
  process.env.FRONTEND_URL = 'https://taladz.com';
  budgetEnvoiGroupe.mockResolvedValue(220);
});

describe('modèle de la newsletter', () => {
  it('met un lien vers chaque événement et chaque œuvre', () => {
    const page = html(
      [{ id_evenement: 2, nom_evenement: { fr: 'Chantier-école' }, date_debut: '2026-12-01T10:00:00Z' }],
      [{ id_oeuvre: 9, titre: { fr: 'Un livre' }, id_type_oeuvre: 1 }, { id_oeuvre: 10, titre: { fr: 'Un article' }, id_type_oeuvre: 4 }]
    );
    expect(page).toContain('https://taladz.com/evenements/2');
    expect(page).toContain('https://taladz.com/oeuvres/9');
    expect(page).toContain('https://taladz.com/articles/10');
    expect(page).toContain('1 décembre 2026');
  });

  it('n’affiche pas une section vide', () => {
    const page = html([], [{ id_oeuvre: 9, titre: 'Un livre', id_type_oeuvre: 1 }]);
    expect(page).not.toContain('Nouveaux événements');
    expect(page).toContain('Nouvelles œuvres');
  });

  it('échappe un titre, y compris une variable du modèle', () => {
    const page = html([{ id_evenement: 2, nom_evenement: '<b>x</b> {{unsubscribe_url}}' }], []);
    expect(page).not.toContain('<b>x</b>');
    expect(page).not.toContain('{{unsubscribe_url}}');
  });
});

describe('envoi de la newsletter', () => {
  const lancer = async ({ evenements = [{ id_evenement: 2, nom_evenement: 'Ghoufi' }], comptes = [], abonnes = [] } = {}) => {
    const addBulkEmails = jest.fn(async () => ({ success: true }));
    const avant = { models: cronService.models, services: cronService.services };
    cronService.models = {
      Evenement: { findAll: jest.fn(async () => evenements) },
      Oeuvre: { findAll: jest.fn(async () => []) },
      User: {
        findAll: jest.fn(async ({ where, offset }) => (where.email
          ? comptes.filter(c => where.email.includes(c.email))
          : (offset ? [] : comptes))),
        count: jest.fn(async () => comptes.length),
      },
      NewsletterAbonne: {
        findAll: jest.fn(async ({ where, limit }) => abonnes.filter(a => a.id_abonne > where.id_abonne[Op.gt]).slice(0, limit)),
        count: jest.fn(async () => abonnes.length),
      },
    };
    cronService.services = { emailQueueService: { addBulkEmails } };
    await cronService.sendWeeklyNewsletter();
    Object.assign(cronService, avant);
    return addBulkEmails.mock.calls.flatMap(c => c[0].map(e => e.to));
  };
  const compte = (id, email) => ({ id_user: id, email, nom: 'N', prenom: 'P' });
  const abonne = (id, email) => ({ id_abonne: id, email });

  it('sert les comptes puis les abonnés, une seule fois par adresse', async () => {
    const dest = await lancer({
      comptes: [compte(1, 'a@example.com')],
      abonnes: [abonne(1, 'a@example.com'), abonne(2, 'b@example.com')],
    });
    expect(dest).toEqual(['a@example.com', 'b@example.com']);
  });

  it('n’envoie rien sans nouveauté', async () => {
    expect(await lancer({ evenements: [], abonnes: [abonne(1, 'b@example.com')] })).toEqual([]);
  });

  it('s’arrête à la part du quota disponible', async () => {
    budgetEnvoiGroupe.mockResolvedValue(1);
    const dest = await lancer({ comptes: [compte(1, 'a@example.com')], abonnes: [abonne(2, 'b@example.com')] });
    expect(dest).toEqual(['a@example.com']);
  });
});
