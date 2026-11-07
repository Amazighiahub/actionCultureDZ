/** Délai des requêtes : 5 minutes pour tous les envois de fichiers, 30 s pour le reste */
const creer = require('../../middlewares/timeoutMiddleware');

function essai(path) {
  jest.useFakeTimers();
  const res = { headersSent: false, on: jest.fn(), status: jest.fn(() => res), json: jest.fn() };
  creer(30000)({ path }, res, () => {});
  jest.advanceTimersByTime(31000);
  const coupe = res.status.mock.calls.length > 0;
  jest.useRealTimers();
  return coupe;
}

describe('délai des envois de fichiers', () => {
  it('extraits, médias des fiches et /upload : pas coupés à 30 s', () => {
    for (const p of ['/api/oeuvres/5/extrait/pdf', '/api/oeuvres/5/extrait/audio', '/api/oeuvres/5/medias/upload', '/api/artisanat/3/medias', '/api/patrimoine/9/medias', '/api/upload/image']) {
      expect(essai(p)).toBe(false);
    }
  });
  it('autres adresses : coupées à 30 s', () => {
    expect(essai('/api/oeuvres/5')).toBe(true);
    expect(essai('/api/oeuvres/5/medias/x')).toBe(true);
  });
});
