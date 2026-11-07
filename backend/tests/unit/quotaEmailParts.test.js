/** Quota d'e-mails par type et par destinataire (sans Redis : compteurs en mémoire) */
jest.mock('../../utils/redisClient', () => ({ getClient: () => null }));

describe('quota d’e-mails par type et par destinataire', () => {
  let q;
  beforeEach(() => {
    jest.resetModules();
    process.env.EMAIL_PART_VERIFICATION = '3';
    process.env.EMAIL_MAX_PAR_DESTINATAIRE = '2';
    q = require('../../services/quotaEmail');
  });
  afterAll(() => { delete process.env.EMAIL_PART_VERIFICATION; delete process.env.EMAIL_MAX_PAR_DESTINATAIRE; });

  it('une part ordinaire épuisée (newsletter) est refusée, sans priver « mot de passe oublié »', async () => {
    process.env.EMAIL_PART_NEWSLETTER = '2';
    for (const n of [1, 2]) expect((await q.reserverEnvoi(`faux${n}@example.com`, 'newsletter')).ok).toBe(true);
    expect(await q.reserverEnvoi('faux3@example.com', 'newsletter')).toEqual({ ok: false, raison: 'type' });
    expect((await q.reserverEnvoi('vraie@example.com', 'reinitialisation')).ok).toBe(true);
    delete process.env.EMAIL_PART_NEWSLETTER;
  });

  it('pas plus de N e-mails ordinaires par jour vers la même adresse, quelle que soit la casse', async () => {
    expect((await q.reserverEnvoi('cible@example.com', 'transactionnel')).ok).toBe(true);
    expect((await q.reserverEnvoi('CIBLE@example.com ', 'groupe')).ok).toBe(true);
    expect(await q.reserverEnvoi('cible@example.com', 'transactionnel')).toEqual({ ok: false, raison: 'destinataire' });
  });

  it('avis répété : envoyé la première fois seulement pendant la période', async () => {
    expect(await q.premiereFoisPendant('changement:5', 60)).toBe(true);
    expect(await q.premiereFoisPendant('changement:5', 60)).toBe(false);
    expect(await q.premiereFoisPendant('changement:6', 60)).toBe(true);
  });

  it('budget des envois groupés : borné par la part « groupe »', async () => {
    expect(await q.budgetEnvoiGroupe()).toBeLessThanOrEqual(q.PARTS_PAR_DEFAUT.groupe);
  });
});

describe('après la relecture du lot B', () => {
  let q;
  beforeEach(() => {
    jest.resetModules();
    process.env.EMAIL_PART_VERIFICATION = '1';
    process.env.EMAIL_PART_CONTACT = '50';
    process.env.EMAIL_MAX_PAR_DESTINATAIRE = '2';
    q = require('../../services/quotaEmail');
  });
  afterAll(() => { delete process.env.EMAIL_PART_VERIFICATION; delete process.env.EMAIL_PART_CONTACT; delete process.env.EMAIL_MAX_PAR_DESTINATAIRE; });

  it('formulaire de contact : 10 messages du jour vers l’adresse de l’équipe passent', async () => {
    for (let i = 0; i < 10; i++) expect((await q.reserverEnvoi('equipe@example.com', 'contact', { sansLimiteDestinataire: true })).ok).toBe(true);
  });
  it('e-mail important dont la part est épuisée : il passe encore sur le reste du quota', async () => {
    expect((await q.reserverEnvoi('a@example.com', 'verification')).ok).toBe(true);
    expect((await q.reserverEnvoi('b@example.com', 'verification')).ok).toBe(true);
    expect(await q.reserverEnvoi('c@example.com', 'transactionnel')).toMatchObject({ ok: true });
  });
  it('e-mails ordinaires vers une adresse épuisés : la personne reçoit encore son mot de passe oublié', async () => {
    await q.reserverEnvoi('cible@example.com', 'transactionnel');
    await q.reserverEnvoi('cible@example.com', 'transactionnel');
    expect((await q.reserverEnvoi('cible@example.com', 'transactionnel')).ok).toBe(false);
    expect((await q.reserverEnvoi('cible@example.com', 'reinitialisation')).ok).toBe(true);
  });
  it('envoi raté : les places réservées sont rendues', async () => {
    const r1 = await q.reserverEnvoi('d@example.com', 'transactionnel');
    await q.rendreEnvoi(r1);
    await q.reserverEnvoi('d@example.com', 'transactionnel');
    expect((await q.reserverEnvoi('d@example.com', 'transactionnel')).ok).toBe(true);
  });
});

describe('garde du « mot de passe oublié » (deuxième relecture)', () => {
  let q;
  beforeEach(() => {
    jest.resetModules();
    process.env.EMAIL_QUOTA_JOUR = '60';
    q = require('../../services/quotaEmail');
  });
  afterAll(() => { delete process.env.EMAIL_QUOTA_JOUR; });

  it('fausses inscriptions puis envois ordinaires : le mot de passe oublié passe encore', async () => {
    let i = 0;
    while ((await q.reserverEnvoi(`faux${i}@example.com`, 'verification')).ok) i++;
    while ((await q.reserverEnvoi(`n${i++}@example.com`, 'newsletter')).ok);
    while ((await q.reserverEnvoi(`g${i++}@example.com`, 'groupe')).ok);
    expect(await q.envoyesAujourdhui()).toBeLessThanOrEqual(60 - 20);
    expect((await q.reserverEnvoi('vrai@example.com', 'reinitialisation')).ok).toBe(true);
  });

  it('le total du jour ne dépasse jamais le quota, même en parallèle', async () => {
    await Promise.all(Array.from({ length: 200 }, (_, k) => q.reserverEnvoi(`p${k}@example.com`, 'reinitialisation')));
    expect(await q.envoyesAujourdhui()).toBeLessThanOrEqual(60);
  });
});
