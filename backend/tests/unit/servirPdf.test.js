/** Une coupure pendant l'envoi d'un PDF ne doit jamais arrêter le serveur */
const { PassThrough } = require('stream');
const { servirPdf } = require('../../utils/servirPdf');

const reponse = () => {
  const res = new PassThrough();
  res.set = jest.fn();
  res.resume();
  return res;
};
const corps = (chunks, erreur) => new ReadableStream({
  start(c) {
    chunks.forEach(x => c.enqueue(new TextEncoder().encode(x)));
    if (erreur) c.error(erreur); else c.close();
  }
});
const fetchOk = (body) => { global.fetch = jest.fn(async () => ({ ok: true, body, headers: new Headers() })); };

describe('servirPdf', () => {
  const origine = global.fetch;
  afterAll(() => { global.fetch = origine; });

  test('transfert normal : en-têtes PDF et cache public', async () => {
    fetchOk(corps(['%PDF-']));
    const res = reponse();
    await expect(servirPdf(res, 'https://x/y', { nomFichier: 'd.pdf' })).resolves.toBe(true);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'application/pdf', 'Cache-Control': 'public, max-age=3600' }));
  });

  test('coupure pendant le transfert : aucune exception, la réponse est fermée', async () => {
    fetchOk(corps(['%PDF-'], new Error('coupure')));
    const res = reponse();
    await expect(servirPdf(res, 'https://x/y', { nomFichier: 'd.pdf' })).resolves.toBe(true);
    expect(res.destroyed).toBe(true);
  });

  test('Cloudinary injoignable ou en erreur : false, rien n\'est envoyé', async () => {
    global.fetch = jest.fn(async () => { throw new Error('timeout'); });
    const r1 = reponse();
    await expect(servirPdf(r1, 'https://x/y', { nomFichier: 'd.pdf' })).resolves.toBe(false);
    expect(r1.set).not.toHaveBeenCalled();
    global.fetch = jest.fn(async () => ({ ok: false, body: null, headers: new Headers() }));
    await expect(servirPdf(reponse(), 'https://x/y', { nomFichier: 'd.pdf' })).resolves.toBe(false);
  });

  test('événement non publié : pas de cache partagé', async () => {
    fetchOk(corps(['%PDF-']));
    const res = reponse();
    await servirPdf(res, 'https://x/y', { nomFichier: 'd.pdf', enCachePublic: false });
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Cache-Control': 'private, no-store' }));
  });
});
