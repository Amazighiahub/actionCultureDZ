/**
 * Désinscription newsletter : lien signé, route publique, en-têtes List-Unsubscribe.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-de-plus-de-32-caracteres-xx';
process.env.API_URL = 'https://taladz.com';

jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const mockUserService = { unsubscribeNewsletter: jest.fn().mockResolvedValue(true) };
jest.mock('../../services/serviceContainer', () => ({
  get userService() { return mockUserService; },
  _initialized: true
}));

const request = require('supertest');
const express = require('express');
const {
  signUnsubscribe, verifyUnsubscribe, buildUnsubscribeUrl, unsubscribeHeaders
} = require('../../utils/newsletterUnsubscribe');
const gdprController = require('../../controllers/gdprController');

describe('lien de désinscription signé', () => {
  it('URL absolue vers l\'API avec signature', () => {
    expect(buildUnsubscribeUrl(42)).toBe(`https://taladz.com/api/users/newsletter/unsubscribe?u=42&t=${signUnsubscribe(42)}`);
  });
  it('accepte la bonne signature, refuse celle d\'un autre utilisateur ou falsifiée', () => {
    expect(verifyUnsubscribe(42, signUnsubscribe(42))).toBe(true);
    expect(verifyUnsubscribe(43, signUnsubscribe(42))).toBe(false);
    expect(verifyUnsubscribe(42, 'a'.repeat(64))).toBe(false);
    expect(verifyUnsubscribe('42 OR 1=1', signUnsubscribe(42))).toBe(false);
  });
  it('en-têtes RFC 8058', () => {
    expect(unsubscribeHeaders('https://x/u')).toEqual({
      'List-Unsubscribe': '<https://x/u>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    });
  });
});

describe('route de désinscription', () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => { req.t = (k) => k; next(); });
  app.get('/unsub', (req, res) => gdprController.unsubscribeNewsletter(req, res));
  app.post('/unsub', (req, res) => gdprController.unsubscribeNewsletter(req, res));

  beforeEach(() => mockUserService.unsubscribeNewsletter.mockClear());

  it('GET avec lien valide : désinscrit et affiche une confirmation', async () => {
    const res = await request(app).get(`/unsub?u=42&t=${signUnsubscribe(42)}`).expect(200);
    expect(res.text).toMatch(/désinscrit/);
    expect(mockUserService.unsubscribeNewsletter).toHaveBeenCalledWith(42);
  });

  it('POST one-click (paramètres dans l\'URL) : désinscrit', async () => {
    await request(app).post(`/unsub?u=7&t=${signUnsubscribe(7)}`).send('List-Unsubscribe=One-Click').expect(200);
    expect(mockUserService.unsubscribeNewsletter).toHaveBeenCalledWith(7);
  });

  it('signature invalide : 400, aucune modification', async () => {
    await request(app).get(`/unsub?u=42&t=${'0'.repeat(64)}`).expect(400);
    expect(mockUserService.unsubscribeNewsletter).not.toHaveBeenCalled();
  });
});
