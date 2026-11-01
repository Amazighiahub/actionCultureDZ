/**
 * Renvoi de l'e-mail de vérification : permis 2 minutes après le précédent
 * (avant : refusé tant que le premier lien restait valable, soit 24 h).
 */
jest.mock('../../services/emailService', () => ({ sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }) }));
const EmailVerificationService = require('../../services/emailVerificationService');

const creer = (envoisRecents) => new EmailVerificationService({
  User: { findByPk: jest.fn().mockResolvedValue({ id_user: 4, email: 'a@example.com', email_verifie: false }) },
  EmailVerification: {
    count: jest.fn().mockResolvedValue(envoisRecents),
    createVerificationToken: jest.fn().mockResolvedValue({ token: 'jeton', destroy: jest.fn() })
  }
});

describe("renvoi de l'e-mail de vérification", () => {
  test('lien envoyé il y a moins de 2 minutes : 429', async () => {
    await expect(creer(1).sendVerificationEmail(4, '1.1.1.1')).rejects.toMatchObject({ statusCode: 429 });
  });

  test('premier lien plus ancien : nouvel envoi', async () => {
    const s = creer(0);
    await expect(s.sendVerificationEmail(4, '1.1.1.1')).resolves.toMatchObject({ email: 'a@example.com' });
    expect(s.models.EmailVerification.createVerificationToken).toHaveBeenCalled();
  });
});
