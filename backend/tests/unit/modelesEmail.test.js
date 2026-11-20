/**
 * Anti-retour (2026-11-19, lot 4) : chaque modèle d'e-mail demandé par le code existe. Avant, l'e-mail
 * « mot de passe modifié » demandait « password-changed » alors que le fichier s'appelait « password-change » :
 * l'e-mail partait dans une version de secours, avec une erreur au journal à chaque envoi.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');

test('modèles d’e-mail demandés = fichiers présents, et aucun fichier orphelin', () => {
  const code = fs.readFileSync(path.join(RACINE, 'services', 'emailService.js'), 'utf8');
  const demandes = [...code.matchAll(/getTemplate\('([\w-]+)'\)/g)].map((m) => m[1]).sort();
  const fichiers = fs.readdirSync(path.join(RACINE, 'templates', 'emails')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).sort();
  expect([...new Set(demandes)]).toEqual(fichiers);
});
