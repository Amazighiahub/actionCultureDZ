/**
 * Newsletter sans compte : aucune inscription sans confirmation, réponse identique pour une adresse
 * déjà connue, pas de relance en boucle, liens signés, adresse effacée au désabonnement.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
jest.mock('../../services/quotaEmail', () => ({ budgetEnvoiGroupe: jest.fn(async () => 200) }));
const mockEnvoi = jest.fn(async () => ({ success: true }));
jest.mock('../../services/emailService', () => ({ sendEmail: mockEnvoi }));

const { budgetEnvoiGroupe } = require('../../services/quotaEmail');
const abonnes = require('../../services/newsletterAbonnes');
const { signUnsubscribe } = require('../../utils/newsletterUnsubscribe');

const ligne = (donnees) => ({
  id_abonne: 5, email: 'a.b@example.com', statut: 'en_attente', date_demande: new Date(),
  update: jest.fn(async function maj(d) { Object.assign(this, d); return this; }),
  ...donnees,
});
const modeles = (existant = null) => ({
  NewsletterAbonne: {
    findOne: jest.fn(async () => existant),
    findByPk: jest.fn(async () => existant),
    create: jest.fn(async d => ligne(d)),
    destroy: jest.fn(async () => 1),
  },
});

beforeEach(() => { mockEnvoi.mockClear(); budgetEnvoiGroupe.mockResolvedValue(200); });

describe('inscription', () => {
  it('garde les points d’une adresse Gmail et reste en attente', async () => {
    const m = modeles();
    await abonnes.demander(m, ' Prenom.Nom@Gmail.com ');
    expect(m.NewsletterAbonne.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'prenom.nom@gmail.com', statut: 'en_attente' }));
    expect(mockEnvoi).toHaveBeenCalledTimes(1);
  });

  it('refuse une adresse invalide', async () => {
    expect(await abonnes.demander(modeles(), 'pas-une-adresse')).toEqual({ invalide: true });
    expect(mockEnvoi).not.toHaveBeenCalled();
  });

  it('une adresse déjà abonnée reçoit la même réponse, sans e-mail', async () => {
    expect(await abonnes.demander(modeles(ligne({ statut: 'actif' })), 'a.b@example.com')).toEqual({ ok: true });
    expect(mockEnvoi).not.toHaveBeenCalled();
  });

  it('pas de nouvel e-mail avant 24 h', async () => {
    await abonnes.demander(modeles(ligne({})), 'a.b@example.com');
    expect(mockEnvoi).not.toHaveBeenCalled();
  });

  it('relance possible après 24 h', async () => {
    await abonnes.demander(modeles(ligne({ date_demande: new Date(Date.now() - 25 * 3600 * 1000) })), 'a.b@example.com');
    expect(mockEnvoi).toHaveBeenCalledTimes(1);
  });

  it('le quota réservé aux e-mails importants reste intact', async () => {
    budgetEnvoiGroupe.mockResolvedValue(0);
    const m = modeles();
    expect(await abonnes.demander(m, 'a@example.com')).toEqual({ ok: true });
    expect(m.NewsletterAbonne.create).not.toHaveBeenCalled();
  });
});

describe('confirmation', () => {
  it('active avec le bon lien', async () => {
    const a = ligne({});
    expect(await abonnes.confirmer(modeles(a), 5, signUnsubscribe(5, 'abonneConfirm'))).toBe(true);
    expect(a.statut).toBe('actif');
  });

  it('refuse un lien faux, ou celui du désabonnement', async () => {
    const a = ligne({});
    expect(await abonnes.confirmer(modeles(a), 5, 'f'.repeat(64))).toBe(false);
    expect(await abonnes.confirmer(modeles(a), 5, signUnsubscribe(5, 'abonnes'))).toBe(false);
    expect(a.statut).toBe('en_attente');
  });

  it('refuse un lien de plus de 7 jours', async () => {
    const a = ligne({ date_demande: new Date(Date.now() - 8 * 24 * 3600 * 1000) });
    expect(await abonnes.confirmer(modeles(a), 5, signUnsubscribe(5, 'abonneConfirm'))).toBe(false);
  });
});

describe('désabonnement', () => {
  it('efface l’adresse', async () => {
    const m = modeles();
    expect(await abonnes.desabonner(m, 5, signUnsubscribe(5, 'abonnes'))).toBe(true);
    expect(m.NewsletterAbonne.destroy).toHaveBeenCalledWith({ where: { id_abonne: 5 } });
  });

  it('un lien de confirmation ne désabonne pas', async () => {
    const m = modeles();
    expect(await abonnes.desabonner(m, 5, signUnsubscribe(5, 'abonneConfirm'))).toBe(false);
    expect(m.NewsletterAbonne.destroy).not.toHaveBeenCalled();
  });
});
