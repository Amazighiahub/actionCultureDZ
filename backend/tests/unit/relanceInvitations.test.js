/**
 * Relance groupée : seulement ceux qui n'ont pas fini, jamais au-delà du quota du jour ni de la
 * limite par clic, réservée à l'organisateur, avec un bilan exact.
 */
jest.mock('../../services/quotaEmail', () => ({ budgetEnvoiGroupe: jest.fn(async () => 220) }));

const { budgetEnvoiGroupe } = require('../../services/quotaEmail');
const { ImportInscriptions } = require('../../services/evenement/importInscriptions');

const inscription = (id, verifie, statut = 'inscrit') => ({
  statut_participation: statut,
  User: { id_user: id, email: `personne${id}@example.com`, email_verifie: verifie },
});

const contexte = (inscriptions, statutEvenement = 'publie') => {
  const emailService = {
    sendInvitationInscription: jest.fn(async () => ({ success: true })),
    sendDemandeConfirmationInscription: jest.fn(async () => ({ success: true })),
  };
  const models = {
    Evenement: { findByPk: jest.fn(async () => ({ id_evenement: 2, id_user: 7, statut: statutEvenement })) },
    TypeEvenement: {},
    User: {},
    EvenementUser: { findAll: jest.fn(async () => inscriptions) },
    EmailVerification: {
      lienActif: jest.fn(async () => null),
      createVerificationToken: jest.fn(async () => ({ token: 'jeton' })),
    },
  };
  return { svc: new ImportInscriptions(models, { emailService }), emailService, models };
};
const organisateur = { id_user: 7 };

beforeEach(() => budgetEnvoiGroupe.mockResolvedValue(220));

describe('relance groupée des participants', () => {
  it('ne relance que ceux qui n’ont pas fini', async () => {
    const { svc, emailService } = contexte([
      inscription(1, false), inscription(2, true), inscription(3, true, 'invitation'), inscription(4, false),
    ]);
    const bilan = await svc.renvoyerInvitations(2, organisateur);
    expect(bilan).toEqual({ concernes: 3, envoyes: 3, echecs: 0, restants: 0 });
    expect(emailService.sendInvitationInscription).toHaveBeenCalledTimes(2);
    expect(emailService.sendDemandeConfirmationInscription).toHaveBeenCalledTimes(1);
  });

  it('reprend un lien d’invitation encore valable et lui redonne 8 jours', async () => {
    const { svc, emailService, models } = contexte([inscription(1, false)]);
    const update = jest.fn(async () => {});
    models.EmailVerification.lienActif.mockResolvedValue({ token: 'ancien', metadata: { invitation: true }, update });
    const avant = Date.now();
    await svc.renvoyerInvitations(2, organisateur);
    expect(models.EmailVerification.createVerificationToken).not.toHaveBeenCalled();
    expect(emailService.sendInvitationInscription.mock.calls[0][1]).toBe('ancien');
    const fin = update.mock.calls[0][0].expires_at.getTime();
    expect(fin).toBeGreaterThanOrEqual(avant + 8 * 24 * 3600 * 1000);
    expect(fin).toBeLessThan(avant + 8 * 24 * 3600 * 1000 + 60000);
  });

  it('un lien ordinaire de mot de passe oublié n’est ni repris ni prolongé', async () => {
    const { svc, emailService, models } = contexte([inscription(1, false)]);
    const update = jest.fn(async () => {});
    models.EmailVerification.lienActif.mockResolvedValue({ token: 'ordinaire', metadata: null, update });
    await svc.renvoyerInvitations(2, organisateur);
    expect(update).not.toHaveBeenCalled();
    expect(emailService.sendInvitationInscription.mock.calls[0][1]).toBe('jeton');
  });

  it('s’arrête au quota du jour et annonce ce qui reste', async () => {
    budgetEnvoiGroupe.mockResolvedValue(2);
    const { svc, emailService } = contexte([inscription(1, false), inscription(2, false), inscription(3, false)]);
    const bilan = await svc.renvoyerInvitations(2, organisateur);
    expect(bilan).toMatchObject({ envoyes: 2, restants: 1 });
    expect(emailService.sendInvitationInscription).toHaveBeenCalledTimes(2);
  });

  it('s’arrête à 40 par clic', async () => {
    const liste = Array.from({ length: 45 }, (_, i) => inscription(i + 1, false));
    const bilan = await contexte(liste).svc.renvoyerInvitations(2, organisateur);
    expect(bilan).toMatchObject({ concernes: 45, envoyes: 40, restants: 5 });
  });

  it('compte un échec sans interrompre les autres', async () => {
    const { svc, emailService } = contexte([inscription(1, false), inscription(2, false)]);
    emailService.sendInvitationInscription.mockResolvedValueOnce({ success: false });
    expect(await svc.renvoyerInvitations(2, organisateur)).toMatchObject({ envoyes: 1, echecs: 1 });
  });

  it('un autre compte est refusé, et rien ne part', async () => {
    const { svc, emailService } = contexte([inscription(1, false)]);
    await expect(svc.renvoyerInvitations(2, { id_user: 99 })).rejects.toMatchObject({ statusCode: 403 });
    expect(emailService.sendInvitationInscription).not.toHaveBeenCalled();
  });

  it('un événement terminé ne relance personne', async () => {
    const { svc, emailService } = contexte([inscription(1, false)], 'termine');
    await expect(svc.renvoyerInvitations(2, organisateur)).rejects.toMatchObject({ statusCode: 400 });
    expect(emailService.sendInvitationInscription).not.toHaveBeenCalled();
  });
});
