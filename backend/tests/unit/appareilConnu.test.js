/** Verrou de connexion : un appareil déjà connu du titulaire n'est pas bloqué par une attaque répartie */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test-uniquement-pour-jest-0123456789';
const { AccountRateLimiter, appareilConnu, marquerAppareilConnu } = require('../../middlewares/rateLimitMiddleware');

function reponse() {
  const res = { statusCode: 200, cookies: {} };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.cookie = (n, v) => { res.cookies[n] = v; };
  return res;
}
const verifier = (lim, req) => new Promise((ok) => {
  const res = reponse();
  lim.checkAccountLock(req, res, () => ok('passe'));
  setTimeout(() => ok(res.statusCode === 429 ? 'bloque' : 'passe'), 50);
});

describe('verrou de connexion et appareil connu', () => {
  it('30 échecs répartis sur 6 IP : bloqué ailleurs, pas sur l’appareil du titulaire', async () => {
    const lim = new AccountRateLimiter({ maxAttempts: 5, maxAttemptsGlobal: 30 });
    for (let ip = 1; ip <= 6; ip++) for (let i = 0; i < 5; i++) await lim.recordFailedAttempt('titulaire@example.com', `10.0.0.${ip}`);
    expect(await verifier(lim, { body: { email: 'titulaire@example.com' }, ip: '192.0.2.9', cookies: {} })).toBe('bloque');
    const res = reponse();
    marquerAppareilConnu(res, 'titulaire@example.com');
    const temoin = res.cookies.appareil_connu;
    expect(await verifier(lim, { body: { email: 'titulaire@example.com' }, ip: '192.0.2.9', cookies: { appareil_connu: temoin } })).toBe('passe');
  });

  it('le témoin ne vaut que pour son adresse, et ne peut pas être fabriqué', () => {
    const res = reponse();
    marquerAppareilConnu(res, 'titulaire@example.com');
    const temoin = res.cookies.appareil_connu;
    expect(appareilConnu({ cookies: { appareil_connu: temoin } }, 'TITULAIRE@example.com')).toBe(true);
    expect(appareilConnu({ cookies: { appareil_connu: temoin } }, 'autre@example.com')).toBe(false);
    expect(appareilConnu({ cookies: { appareil_connu: 'faux' } }, 'titulaire@example.com')).toBe(false);
  });

  it('le verrou par (e-mail, IP) s’applique même avec le témoin', async () => {
    const lim = new AccountRateLimiter({ maxAttempts: 5, maxAttemptsGlobal: 30 });
    for (let i = 0; i < 5; i++) await lim.recordFailedAttempt('titulaire@example.com', '192.0.2.9');
    const res = reponse();
    marquerAppareilConnu(res, 'titulaire@example.com');
    expect(await verifier(lim, { body: { email: 'titulaire@example.com' }, ip: '192.0.2.9', cookies: { appareil_connu: res.cookies.appareil_connu } })).toBe('bloque');
  });
});
