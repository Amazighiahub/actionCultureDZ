/**
 * Audit V8, points moyens de fiabilité : annulation et publication selon le statut, suppression
 * d'un événement avec inscrits, capacité au rétablissement, heure de 01:00.
 */
jest.mock('../../middlewares/cacheMiddleware', () => ({ clearCache: jest.fn() }), { virtual: false });
const EvenementService = require('../../services/evenement/evenementService');
const { verifierPlacePourRetablir } = require('../../utils/comptesEvenement');
const { finEffective } = require('../../helpers/finEvenement');

const service = (evenement, { inscrits = 0 } = {}) => {
  const s = Object.create(EvenementService.prototype);
  s.logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  s.cache = { invalidate: jest.fn() };
  s.models = {};
  s.repository = {
    findById: jest.fn(async () => evenement),
    findWithFullDetails: jest.fn(async () => evenement),
    update: jest.fn(),
    delete: jest.fn(),
    countParticipants: jest.fn(async () => inscrits),
    withTransaction: jest.fn(async (cb) => cb({ LOCK: { UPDATE: 'U' } }))
  };
  return s;
};

describe('annuler', () => {
  test.each([['annule', 409], ['termine', 400]])('événement %s : refusé (%i), statut inchangé', async (statut, code) => {
    const s = service({ id_user: 5, statut });
    await expect(s.cancel(2, 5, 'motif')).rejects.toMatchObject({ statusCode: code });
    expect(s.repository.update).not.toHaveBeenCalled();
  });
});

describe('publier', () => {
  test.each(['annule', 'termine', 'publie'])('événement %s : refusé', async (statut) => {
    const s = service({ id_user: 5, statut, nom_evenement: { fr: 'X' } });
    await expect(s.publish(2, 1)).rejects.toMatchObject({ statusCode: 400 });
    expect(s.repository.update).not.toHaveBeenCalled();
  });
});

describe('supprimer (administration)', () => {
  test('événement publié avec inscrits : à annuler d’abord', async () => {
    const s = service({ id_user: 5, statut: 'publie' }, { inscrits: 40 });
    await expect(s.delete(2, 1, { isAdmin: true })).rejects.toMatchObject({ statusCode: 409 });
    expect(s.repository.delete).not.toHaveBeenCalled();
  });
});

describe('rétablir une inscription refusée', () => {
  const modeles = (places, capacite = 30) => ({
    Evenement: { findByPk: jest.fn(async () => ({ capacite_max: capacite })) },
    EvenementUser: { findAll: jest.fn(async () => [{ places }]) }
  });
  const refusee = { statut_participation: 'annule', reponses_inscription: { nombre_personnes: 4 } };

  test('plus assez de places : 409', async () => {
    await expect(verifierPlacePourRetablir(modeles(27), 2, refusee)).rejects.toMatchObject({ statusCode: 409 });
  });
  test('assez de places, sans limite, ou inscription non refusée : accepté', async () => {
    await expect(verifierPlacePourRetablir(modeles(26), 2, refusee)).resolves.toBeUndefined();
    await expect(verifierPlacePourRetablir(modeles(99, null), 2, refusee)).resolves.toBeUndefined();
    await expect(verifierPlacePourRetablir(modeles(99), 2, { statut_participation: 'inscrit' })).resolves.toBeUndefined();
  });
});

describe('heure de 01:00 à Alger', () => {
  const s = Object.create(EvenementService.prototype);
  test('distinguée d’un jour sans heure : l’événement finit bien à 01:00', () => {
    const fin = s._avecHeure('2026-11-06', '01:00');
    expect(fin).toBe('2026-11-06T01:00:01+01:00');
    expect(finEffective('2026-11-05T20:00:00+01:00', fin).toISOString()).toBe('2026-11-06T00:00:01.000Z');
  });
  test('autre heure : inchangée', () => {
    expect(s._avecHeure('2026-11-06', '18:30')).toBe('2026-11-06T18:30:00+01:00');
  });
});

describe('cache : un seul calcul à l’expiration', () => {
  const CacheManager = require('../../utils/CacheManager');
  const Classe = CacheManager.CacheManager || CacheManager;
  const cache = () => new Classe({ namespace: `test${Math.random()}` });

  test('appels simultanés : un seul calcul, et chacun reçoit sa propre copie', async () => {
    const c = cache();
    const calcul = jest.fn(async () => ({ liste: [1] }));
    const [a, b, d] = await Promise.all([c.getOrSet('k', calcul), c.getOrSet('k', calcul), c.getOrSet('k', calcul)]);
    expect(calcul).toHaveBeenCalledTimes(1);
    expect(b).toEqual({ liste: [1] });
    expect(b).not.toBe(a);
    expect(d).not.toBe(b);
  });

  test('invalidé pendant le calcul : résultat non gardé, l’appel suivant recalcule', async () => {
    const c = cache();
    let fin;
    const lent = c.getOrSet('liste:1', () => new Promise((r) => { fin = r; }));
    await new Promise((r) => setImmediate(r));
    c.invalidate('liste');
    fin('ancien');
    await expect(lent).resolves.toBe('ancien');
    await expect(c.getOrSet('liste:1', async () => 'nouveau')).resolves.toBe('nouveau');
  });

  test('erreur du calcul : transmise à tous, puis on peut réessayer', async () => {
    const c = cache();
    const panne = jest.fn(async () => { throw new Error('base'); });
    const r = await Promise.allSettled([c.getOrSet('k', panne), c.getOrSet('k', panne)]);
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected']);
    expect(panne).toHaveBeenCalledTimes(1);
    await expect(c.getOrSet('k', async () => 1)).resolves.toBe(1);
  });
});

describe('journaux sans jeton', () => {
  const { redactUrl } = require('../../utils/maskPII');
  test('page d’origine : jeton masqué', () => {
    expect(redactUrl('https://taladz.com/reset-password/abc123')).toBe('https://taladz.com/reset-password/***');
  });
  test('page d’origine absente : rien à masquer', () => {
    expect(redactUrl(undefined)).toBeUndefined();
  });
});

describe('fichier Excel forgé (bombe zip)', () => {
  const zlib = require('zlib');
  const { decompressionSousLimite, tailleDecompressee } = require('../../middlewares/uploadClasseur');

  // Archive à un seul fichier : tailleAnnoncee permet de mentir sur le contenu
  const archive = (contenu, tailleAnnoncee = contenu.length) => {
    const nom = Buffer.from('a.xml');
    const compresse = zlib.deflateRawSync(contenu);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compresse.length, 18); local.writeUInt32LE(tailleAnnoncee, 22); local.writeUInt16LE(nom.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compresse.length, 20); central.writeUInt32LE(tailleAnnoncee, 24); central.writeUInt16LE(nom.length, 28);
    const position = local.length + nom.length + compresse.length;
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 10); fin.writeUInt32LE(central.length + nom.length, 12); fin.writeUInt32LE(position, 16);
    return Buffer.concat([local, nom, compresse, central, nom, fin]);
  };

  test('taille annoncée fausse : refusé malgré l’annonce', async () => {
    const forge = archive(Buffer.alloc(70 * 1024 * 1024), 100);
    expect(tailleDecompressee(forge)).toBe(100);
    await expect(decompressionSousLimite(forge)).resolves.toBe(false);
  });
  test('fichier normal : accepté', async () => {
    await expect(decompressionSousLimite(archive(Buffer.from('<a>bonjour</a>')))).resolves.toBe(true);
  });
});

describe('PDF du site', () => {
  const { estPdfDuSite } = require('../../services/evenement/messagesParticipants');
  const avant = process.env.CLOUDINARY_CLOUD_NAME;
  beforeAll(() => { process.env.CLOUDINARY_CLOUD_NAME = 'tala'; });
  afterAll(() => { process.env.CLOUDINARY_CLOUD_NAME = avant; });

  test('fichier du compte du site : accepté', () => {
    expect(estPdfDuSite('https://res.cloudinary.com/tala/raw/upload/v1/x.pdf')).toBe(true);
  });
  test.each([
    'https://res.cloudinary.com/tala/raw/upload/../../../autre/raw/upload/x.pdf',
    'https://res.cloudinary.com/tala/raw/upload/%2e%2e/%2e%2e/%2e%2e/autre/raw/upload/x.pdf',
    'https://res.cloudinary.com/autre/raw/upload/x.pdf',
    'http://res.cloudinary.com/tala/raw/upload/x.pdf',
    'pas une adresse'
  ])('refusé : %s', (url) => {
    expect(estPdfDuSite(url)).toBe(false);
  });
});

describe('modifier un événement : effacer un champ', () => {
  const avec = (data) => {
    const existant = { id_user: 5, statut: 'brouillon', date_debut: new Date('2026-12-01'), url_virtuel: null };
    const s = service(existant);
    s.withTransaction = (cb) => cb({ LOCK: { UPDATE: 'U' } });
    s.repository.update = jest.fn(async () => existant);
    return s.update(2, { url_virtuel: 'https://example.com/salle', ...data }, 5).then(() => s.repository.update.mock.calls[0][1]);
  };
  test('date de fin et capacité vidées : effacées', async () => {
    const maj = await avec({ date_fin: '', capacite_max: '' });
    expect(maj.date_fin).toBeNull();
    expect(maj.capacite_max).toBeNull();
  });
  test('absentes : inchangées', async () => {
    const maj = await avec({});
    expect(maj).not.toHaveProperty('date_fin');
    expect(maj).not.toHaveProperty('capacite_max');
  });
  test('passage en ligne : l’ancien lieu est retiré', async () => {
    expect((await avec({})).id_lieu).toBeNull();
  });
  test('déjà en ligne : le lieu reste', async () => {
    const existant = { id_user: 5, statut: 'brouillon', date_debut: new Date('2026-12-01'), url_virtuel: 'https://example.com/a', id_lieu: 9 };
    const s = service(existant);
    s.withTransaction = (cb) => cb({ LOCK: { UPDATE: 'U' } });
    s.repository.update = jest.fn(async () => existant);
    await s.update(2, { url_virtuel: 'https://example.com/a' }, 5);
    expect(s.repository.update.mock.calls[0][1]).not.toHaveProperty('id_lieu');
  });
});

describe('lien d’invitation de 7 jours', () => {
  const EmailVerificationService = require('../../services/emailVerificationService');
  const emailService = require('../../services/emailService');

  test('« mot de passe oublié » sur un compte importé : même lien renvoyé, pas de remplacement', async () => {
    const envoi = jest.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue({ success: true });
    const EmailVerification = {
      hasActiveToken: jest.fn().mockResolvedValue(true),
      lienActif: jest.fn().mockResolvedValue({ token: 'lien-7-jours' }),
      createVerificationToken: jest.fn()
    };
    const s = new EmailVerificationService({
      User: { findOne: jest.fn().mockResolvedValue({ id_user: 4, email_verifie: false, accepte_conditions: false }) },
      EmailVerification
    });
    await s.requestPasswordReset('invite@example.com', '127.0.0.1');
    expect(EmailVerification.createVerificationToken).not.toHaveBeenCalled();
    expect(envoi).toHaveBeenCalledWith(expect.anything(), 'lien-7-jours');
    envoi.mockRestore();
  });
});
