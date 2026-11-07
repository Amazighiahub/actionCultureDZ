/**
 * Une connexion par appareil : le téléphone et l'ordinateur ne se déconnectent plus l'un l'autre,
 * une réponse perdue sur le réseau ne déconnecte pas, et les coupures de sécurité restent complètes.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
const crypto = require('crypto');
const { Op } = require('sequelize');

jest.mock('../../services/emailService', () => ({}));
const UserService = require('../../services/user/userService');
const { REFRESH_COOKIE_MAX_AGE_MS } = require('../../services/auth/authCookieService');

const empreinte = (j) => crypto.createHash('sha256').update(j).digest('hex');
const JOUR = 86400000;

// Fausse table : applique les mêmes filtres que le service utilise
function fabriquer(utilisateur) {
  const lignes = [];
  let suivant = 1;
  const lier = (l) => Object.assign(l, { update: async (v) => Object.assign(l, v) });
  const SessionConnexion = {
    lignes,
    findOne: async ({ where }) => (!where[Op.or]
      ? lignes.find((l) => l.jeton_precedent_hash === where.jeton_precedent_hash) || null
      : lignes.find((l) => where[Op.or].some((c) => (c.jeton_hash
      ? l.jeton_hash === c.jeton_hash
      : l.jeton_precedent_hash === c.jeton_precedent_hash && l.precedent_jusqua > c.precedent_jusqua[Op.gt]))) || null),
    findAll: async ({ where, offset }) => lignes.filter((l) => l.id_user === where.id_user)
      .sort((a, b) => b.id_session - a.id_session).slice(offset),
    create: async (v) => {
      const l = lier({ id_session: suivant++, date_creation: new Date(), jeton_precedent_hash: null, precedent_jusqua: null, ...v });
      lignes.push(l);
      return l;
    },
    destroy: async ({ where }) => {
      const garde = lignes.filter((l) => {
        if (where.expire_le) return l.expire_le >= where.expire_le[Op.lt];
        if (Array.isArray(where.id_session)) return !where.id_session.includes(l.id_session);
        if (where.id_session && where.id_user === undefined) return l.id_session !== where.id_session;
        if (where.id_session) return !(l.id_session === where.id_session && l.id_user === where.id_user);
        return l.id_user !== where.id_user;
      });
      lignes.splice(0, lignes.length, ...garde);
    },
  };
  const repository = {
    model: { unscoped: () => ({ findByPk: async () => utilisateur }) },
    withTransaction: (f) => f({ LOCK: { UPDATE: 'UPDATE' } }),
    findByRefreshToken: async (h) => (utilisateur.refresh_token === h ? utilisateur : null),
    update: async (_, v) => Object.assign(utilisateur, v),
  };
  const service = new UserService(repository, { models: { SessionConnexion } });
  service.models = { SessionConnexion };
  return { service, SessionConnexion };
}

const personne = (extra = {}) => ({ id_user: 7, email: 'a@example.com', statut: 'actif', email_verifie: true, ...extra });

describe('connexions par appareil', () => {
  test('la connexion dure 90 jours, côté cookie comme en base', async () => {
    const { service, SessionConnexion } = fabriquer(personne());
    await service._saveRefreshToken(7, 'jeton');
    expect(REFRESH_COOKIE_MAX_AGE_MS).toBe(90 * JOUR);
    const reste = SessionConnexion.lignes[0].expire_le - Date.now();
    expect(reste).toBeGreaterThan(89 * JOUR);
    expect(reste).toBeLessThan(91 * JOUR);
  });

  test('téléphone et ordinateur restent connectés tous les deux', async () => {
    const { service } = fabriquer(personne());
    await service._saveRefreshToken(7, 'ordinateur');
    await service._saveRefreshToken(7, 'telephone');
    await expect(service.refreshToken('ordinateur')).resolves.toHaveProperty('refreshToken');
    await expect(service.refreshToken('telephone')).resolves.toHaveProperty('refreshToken');
  });

  test('chaque renouvellement repousse la fin de la connexion', async () => {
    const { service, SessionConnexion } = fabriquer(personne());
    await service._saveRefreshToken(7, 'jeton');
    SessionConnexion.lignes[0].expire_le = new Date(Date.now() + JOUR);
    await service.refreshToken('jeton');
    expect(SessionConnexion.lignes[0].expire_le - Date.now()).toBeGreaterThan(89 * JOUR);
  });

  test('réponse perdue : l’ancien jeton marche encore quelques minutes, puis plus', async () => {
    const { service, SessionConnexion } = fabriquer(personne());
    await service._saveRefreshToken(7, 'jeton');
    const { refreshToken: suivant } = await service.refreshToken('jeton');
    const { refreshToken: rattrape } = await service.refreshToken('jeton');
    expect(rattrape).not.toBe(suivant);
    // Le jeton émis entre-temps reste accepté à son tour pour la même raison
    await expect(service.refreshToken(suivant)).resolves.toHaveProperty('refreshToken');

    SessionConnexion.lignes[0].precedent_jusqua = new Date(Date.now() - 1000);
    await expect(service.refreshToken(suivant)).rejects.toThrow();
  });

  test('ancien jeton présenté après le délai (vol probable) : la connexion est coupée', async () => {
    const { service, SessionConnexion } = fabriquer(personne());
    await service._saveRefreshToken(7, 'jeton');
    const { refreshToken: suivant } = await service.refreshToken('jeton');
    SessionConnexion.lignes[0].precedent_jusqua = new Date(Date.now() - 1000);
    await expect(service.refreshToken('jeton')).rejects.toThrow();
    expect(SessionConnexion.lignes).toHaveLength(0);
    // Le jeton le plus récent ne marche plus non plus : il faut se reconnecter
    await expect(service.refreshToken(suivant)).rejects.toThrow();
  });

  test('un jeton inconnu est refusé', async () => {
    const { service } = fabriquer(personne());
    await expect(service.refreshToken('inconnu')).rejects.toThrow();
  });

  test('une connexion expirée est refusée', async () => {
    const { service, SessionConnexion } = fabriquer(personne());
    await service._saveRefreshToken(7, 'jeton');
    SessionConnexion.lignes[0].expire_le = new Date(Date.now() - 1000);
    await expect(service.refreshToken('jeton')).rejects.toThrow();
  });

  test('mot de passe changé après l’ouverture : refusé', async () => {
    const { service, SessionConnexion } = fabriquer(personne({ password_changed_at: new Date() }));
    await service._saveRefreshToken(7, 'jeton');
    SessionConnexion.lignes[0].date_creation = new Date(Date.now() - 10000);
    await expect(service.refreshToken('jeton')).rejects.toThrow();
  });

  test.each(['banni', 'suspendu', 'inactif'])('compte %s : refusé', async (statut) => {
    const { service } = fabriquer(personne({ statut }));
    await service._saveRefreshToken(7, 'jeton');
    await expect(service.refreshToken('jeton')).rejects.toThrow();
  });

  test('personne déjà connectée avant la mise à jour : elle le reste, sur une nouvelle connexion', async () => {
    const u = personne({ refresh_token: empreinte('ancien'), refresh_token_expires: new Date(Date.now() + JOUR) });
    const { service, SessionConnexion } = fabriquer(u);
    await expect(service.refreshToken('ancien')).resolves.toHaveProperty('refreshToken');
    expect(u.refresh_token).toBeNull();
    expect(SessionConnexion.lignes).toHaveLength(1);
  });

  test('ancienne connexion expirée : refusée', async () => {
    const u = personne({ refresh_token: empreinte('ancien'), refresh_token_expires: new Date(Date.now() - 1000) });
    const { service } = fabriquer(u);
    await expect(service.refreshToken('ancien')).rejects.toThrow();
  });

  test('se déconnecter d’un appareil laisse l’autre connecté', async () => {
    const { service } = fabriquer(personne());
    const ordinateur = await service._saveRefreshToken(7, 'ordinateur');
    await service._saveRefreshToken(7, 'telephone');
    await service.revokeRefreshToken(7, ordinateur.id_session);
    await expect(service.refreshToken('ordinateur')).rejects.toThrow();
    await expect(service.refreshToken('telephone')).resolves.toHaveProperty('refreshToken');
  });

  test('sans numéro de session, ou au changement de mot de passe : tout est coupé', async () => {
    const { service } = fabriquer(personne());
    await service._saveRefreshToken(7, 'ordinateur');
    await service._saveRefreshToken(7, 'telephone');
    await service.revokeRefreshToken(7);
    await expect(service.refreshToken('ordinateur')).rejects.toThrow();
    await expect(service.refreshToken('telephone')).rejects.toThrow();
  });

  test('au-delà de 10 appareils, la plus ancienne connexion se ferme', async () => {
    const { service, SessionConnexion } = fabriquer(personne());
    for (let i = 0; i < 12; i += 1) await service._saveRefreshToken(7, `appareil-${i}`);
    expect(SessionConnexion.lignes).toHaveLength(10);
    await expect(service.refreshToken('appareil-0')).rejects.toThrow();
    await expect(service.refreshToken('appareil-11')).resolves.toHaveProperty('refreshToken');
  });

  test('le jeton d’accès porte le numéro de session', () => {
    const { service } = fabriquer(personne());
    const jwt = require('jsonwebtoken');
    expect(jwt.decode(service._generateToken(personne(), 42)).sid).toBe(42);
  });
});
