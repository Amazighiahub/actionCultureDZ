/**
 * E-mails d'invitation : la personne doit comprendre que le mot de passe sert aussi à se connecter à
 * Tala DZ, et avec quel identifiant. Aucun envoi réel : sendEmail est remplacé.
 */
const emailService = require('../../services/emailService');

const user = { email: 'amina@example.com', prenom: 'Amina' };
const evenement = { id_evenement: 2, nom_evenement: 'Chantier' };
const ancienneUrl = process.env.FRONTEND_URL;
let envoi;

beforeAll(() => { process.env.FRONTEND_URL = 'https://taladz.example.com'; });
afterAll(() => { process.env.FRONTEND_URL = ancienneUrl; });
beforeEach(() => {
  envoi = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true });
});
afterEach(() => envoi.mockRestore());

describe('invitation avec choix du mot de passe', () => {
  it('annonce l’accès à Tala DZ dès le sujet', async () => {
    await emailService.sendInvitationInscription(user, 'jeton', evenement);
    expect(envoi.mock.calls[0][1]).toBe('Votre accès à Tala DZ et votre inscription : Chantier');
  });

  it('explique comment se connecter, avec le bon identifiant et la bonne adresse', async () => {
    await emailService.sendInvitationInscription(user, 'jeton', evenement);
    const html = envoi.mock.calls[0][2];
    expect(html).toContain('Ce mot de passe sert aussi à vous connecter à Tala DZ');
    expect(html).toContain('<b>amina@example.com</b>');
    expect(html).toContain('href="https://taladz.example.com/auth"');
    expect(html).toContain('href="https://taladz.example.com/reset-password/jeton"');
    expect(html).toContain('ce n\'est pas celui de votre boîte e-mail');
  });
});

describe('demande de confirmation à un compte existant', () => {
  it('rappelle comment se connecter et quoi faire en cas d’oubli', async () => {
    await emailService.sendDemandeConfirmationInscription(user, evenement);
    const html = envoi.mock.calls[0][2];
    expect(html).toContain('<b>amina@example.com</b> et votre mot de passe Tala DZ');
    expect(html).toContain('Mot de passe oublié');
  });
});
