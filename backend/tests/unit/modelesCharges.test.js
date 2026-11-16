/**
 * Anti-retour (2026-11-16) : models/index.js charge chaque modèle par loadModelSafely, qui ignore en
 * silence un fichier introuvable. Un chemin faux (« ./misc/userCertification ») laissait ainsi un modèle
 * absent sans que personne le voie. Chaque chemin chargé doit correspondre à un fichier.
 */
const fs = require('fs');
const path = require('path');

describe('modèles chargés par models/index.js', () => {
  it('chaque chemin de loadModelSafely existe', () => {
    const dossier = path.join(__dirname, '../../models');
    const source = fs.readFileSync(path.join(dossier, 'index.js'), 'utf8');
    const chemins = [...source.matchAll(/loadModelSafely\('([^']+)'/g)].map((m) => m[1]);
    expect(chemins.length).toBeGreaterThan(40);
    const absents = chemins.filter((c) => {
      const p = path.join(dossier, c);
      return !fs.existsSync(p) && !fs.existsSync(`${p}.js`);
    });
    expect(absents).toEqual([]);
  });
});
