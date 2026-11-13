/**
 * Écrire à un professionnel depuis sa page : e-mail au pro avec l'adresse du visiteur en
 * « Répondre à », texte échappé, garde-fous (soi-même, pro introuvable, 3 par jour au même pro).
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
jest.mock('../../services/quotaEmail', () => ({
  ...jest.requireActual('../../services/quotaEmail'),
  premiereFoisPendant: jest.fn().mockResolvedValue(true),
  oublierUneFois: jest.fn().mockResolvedValue()
}));
const quota = require('../../services/quotaEmail');
const { contacterProfessionnel } = require('../../services/contacterProfessionnel');

const PRO = { id_user: 21, prenom: 'Rayan', nom: 'Yacine', email: 'pro@example.com' };
const VISITEUR = { id_user: 71, prenom: 'Lina', nom: 'Exemple', email: 'lina@example.com', statut: 'actif' };
const preparer = ({ pro = PRO, visiteur = VISITEUR, envoi = { success: true } } = {}) => ({
  models: { User: { findOne: jest.fn().mockResolvedValue(pro), findByPk: jest.fn().mockResolvedValue(visiteur) } },
  emailService: {
    _escapeHtml: (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    sendEmail: jest.fn().mockResolvedValue(envoi)
  }
});

describe('contacterProfessionnel', () => {
  beforeEach(() => quota.premiereFoisPendant.mockReset().mockResolvedValue(true));

  it('envoie au pro, réponse vers le visiteur, texte échappé, adresse du pro jamais renvoyée', async () => {
    const { models, emailService } = preparer();
    const r = await contacterProfessionnel(models, emailService, { idExpediteur: 71, idPro: 21, sujet: 'Atelier\r\nBcc: x@example.com', message: 'Bonjour <script>alert(1)</script> !' });
    expect(r).toEqual({ envoye: true });
    const [destinataire, objet, html, , texte, options] = emailService.sendEmail.mock.calls[0];
    expect(destinataire).toBe('pro@example.com');
    expect(objet).not.toMatch(/[\r\n]/);
    expect(objet).toMatch(/Lina Exemple/);
    expect(html).not.toMatch(/<script>/);
    expect(html).toMatch(/&lt;script&gt;/);
    expect(texte).toMatch(/Bonjour/);
    expect(options.headers['Reply-To']).toBe('lina@example.com');
    // Part du quota à part : ces messages ne privent jamais le site de ses autres e-mails
    expect(options.type).toBe('contact_pro');
    expect(JSON.stringify(r)).not.toMatch(/pro@example\.com/);
  });

  it('refus : à soi-même (400), message trop court (400), pro introuvable ou privé (404), compte inactif (403)', async () => {
    const ok = { idExpediteur: 71, idPro: 21, message: 'Un message assez long' };
    await expect(contacterProfessionnel(...Object.values(preparer()), { ...ok, idPro: 71 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(contacterProfessionnel(...Object.values(preparer()), { ...ok, message: 'court' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(contacterProfessionnel(...Object.values(preparer({ pro: null })), ok)).rejects.toMatchObject({ statusCode: 404 });
    await expect(contacterProfessionnel(...Object.values(preparer({ visiteur: { ...VISITEUR, statut: 'suspendu' } })), ok)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('3 messages par jour au même pro, puis 429 ; envoi en échec → 503', async () => {
    quota.premiereFoisPendant.mockResolvedValue(false);
    const ok = { idExpediteur: 71, idPro: 21, message: 'Un message assez long' };
    const a = preparer();
    await expect(contacterProfessionnel(a.models, a.emailService, ok)).rejects.toMatchObject({ statusCode: 429 });
    expect(quota.premiereFoisPendant).toHaveBeenCalledTimes(3);
    expect(a.emailService.sendEmail).not.toHaveBeenCalled();

    quota.premiereFoisPendant.mockResolvedValue(true);
    const b = preparer({ envoi: { success: false, error: '550 <pro@example.com> rejected' } });
    await expect(contacterProfessionnel(b.models, b.emailService, ok)).rejects.toMatchObject({ statusCode: 503 });
    // Rien n'est parti : la place du jour pour ce pro est rendue
    expect(quota.oublierUneFois).toHaveBeenCalledWith('contact-pro:71:21:1');

    const c = preparer({ envoi: { success: false, limite: 'type' } });
    await expect(contacterProfessionnel(c.models, c.emailService, ok)).rejects.toMatchObject({ statusCode: 429, code: 'CONTACT_PRO_QUOTA' });
  });

  it('caractères invisibles retirés du sujet et du nom (sens d’écriture forcé)', async () => {
    const { models, emailService } = preparer({ visiteur: { ...VISITEUR, prenom: 'Li\u202Ena' } });
    await contacterProfessionnel(models, emailService, { idExpediteur: 71, idPro: 21, sujet: 'A\u202Etelier\u2028x', message: 'Un message assez long' });
    const objet = emailService.sendEmail.mock.calls[0][1];
    expect(objet).not.toMatch(/[\u202E\u2028]/);
    expect(objet).toMatch(/Lina Exemple/);
  });
});

describe('quota : messages aux professionnels à part', () => {
  it('part « contact_pro » et compteur par destinataire distinct (les autres e-mails du pro passent encore)', async () => {
    jest.resetModules();
    jest.unmock('../../services/quotaEmail');
    const q = jest.requireActual('../../services/quotaEmail');
    expect(q.PARTS_PAR_DEFAUT.contact_pro).toBeGreaterThan(0);
    const pro = `pro-${Date.now()}@example.com`;
    let ok = 0;
    for (let i = 0; i < 8; i++) if ((await q.reserverEnvoi(pro, 'contact_pro')).ok) ok++;
    expect(ok).toBe(5);
    // Ses e-mails ordinaires (commande, inscription…) ne sont pas bloqués par ces messages
    expect((await q.reserverEnvoi(pro, 'transactionnel')).ok).toBe(true);
  });
});
