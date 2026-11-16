/**
 * Anti-retour (2026-11-16) : une erreur du serveur passe par le traitement commun (next(error) dans une
 * route, this._handleError dans un contrôleur) : journal avec la trace, Sentry, message masqué en
 * production. Les réponses 500 écrites à la main (souvent avec « catch {} » ou un simple console.error)
 * ne laissaient aucune trace exploitable.
 */
const fs = require('fs');
const path = require('path');

// Exceptions voulues : réponse en texte (plan du site), envoi refusé qui n'est pas une erreur (contact),
// cas de fichiers locaux sans erreur (upload)
const PERMIS = {
  'routes/sitemapRoutes.js': 1,
  'routes/contactRoutes.js': 2,
  'routes/uploadRoutes.js': 1,
  'controllers/uploadController.js': 1
};

function fichiers(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    return e.isDirectory() ? fichiers(p) : (e.name.endsWith('.js') ? [p] : []);
  });
}

describe('réponses 500 écrites à la main', () => {
  it('routes et contrôleurs passent par le traitement commun', () => {
    const racine = path.join(__dirname, '../..');
    const trop = [];
    for (const dossier of ['routes', 'controllers']) {
      for (const f of fichiers(path.join(racine, dossier))) {
        const rel = path.relative(racine, f).split(path.sep).join('/');
        const n = (fs.readFileSync(f, 'utf8').match(/res\.status\(500\)/g) || []).length;
        if (n > (PERMIS[rel] || 0)) trop.push(`${rel} : ${n}`);
      }
    }
    expect(trop).toEqual([]);
  });
});
