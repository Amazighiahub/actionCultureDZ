/**
 * Une seule règle « contenu public » (constants/statuts.estPublic, 2026-11-16) : avant, la liste
 * ['brouillon', 'en_attente'] était recopiée dans une dizaine de fichiers, et les avis d'une œuvre
 * retirée restaient lisibles.
 */
const fs = require('fs');
const path = require('path');
const { estPublic } = require('../../constants/statuts');

describe('contenu public', () => {
  it('œuvre : publiée seulement ; événement : tout sauf brouillon et en attente', () => {
    expect(estPublic('oeuvre', 'publie')).toBe(true);
    for (const s of ['brouillon', 'en_attente', 'refuse', 'archive', 'retire']) expect(estPublic('oeuvre', s)).toBe(false);
    for (const s of ['publie', 'planifie', 'en_cours', 'termine', 'annule', 'reporte']) expect(estPublic('evenement', s)).toBe(true);
    for (const s of ['brouillon', 'en_attente']) expect(estPublic('evenement', s)).toBe(false);
  });

  it('anti-retour : la liste n’est plus recopiée hors de constants/statuts.js', () => {
    const racine = path.join(__dirname, '../..');
    const fichiers = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? fichiers(p) : (e.name.endsWith('.js') ? [p] : []);
    });
    const copies = ['controllers', 'services', 'routes', 'middlewares', 'utils', 'repositories']
      .flatMap((d) => fichiers(path.join(racine, d)))
      .filter((f) => fs.readFileSync(f, 'utf8').includes("['brouillon', 'en_attente']"))
      .map((f) => path.relative(racine, f));
    expect(copies).toEqual([]);
  });

  it('avis d’une œuvre retirée : 404, plus lisibles', async () => {
    const instance = require('../../controllers/commentaireController');
    const service = { findOeuvre: jest.fn().mockResolvedValue(null), getCommentairesOeuvre: jest.fn() };
    // Le service est un accesseur (container) : on le remplace par un objet de test
    const c = Object.create(Object.getPrototypeOf(instance), { service: { value: service } });
    c._paginate = () => ({ page: 1, limit: 10, offset: 0 });
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await c.getCommentairesOeuvre({ params: { oeuvreId: '5' }, query: {}, t: (k) => k, lang: 'fr' }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(service.getCommentairesOeuvre).not.toHaveBeenCalled();
  });
});
