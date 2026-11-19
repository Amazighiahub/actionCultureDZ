/**
 * Anti-retour (2026-11-19, lot 3 doublons) : les aides communes ne sont plus recopiées.
 * - erreur renvoyée au client : utils/erreurHttp.erreurHttp (avant : 10 copies d'une fonction « erreur »
 *   et une vingtaine de « Object.assign(new Error(…), { statusCode }) » écrits à la main).
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const DOSSIERS = ['services', 'controllers', 'routes', 'utils', 'helpers', 'middlewares'];

function fichiers(dossier) {
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : fichiers(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}
const tous = DOSSIERS.flatMap((d) => fichiers(path.join(RACINE, d)));
const ou = (re) => tous.filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(RACINE, f).split(path.sep).join('/'));

describe('une seule définition (anti-retour des copies)', () => {
  test('erreur avec code HTTP : seulement dans utils/erreurHttp.js', () => {
    expect(ou(/Object\.assign\(new Error\([^\n]*statusCode/)).toEqual(['utils/erreurHttp.js']);
    // Copie de la fonction (les variantes fondées sur AppError, avec leurs codes, sont un autre outil)
    expect(ou(/^(const|function) (erreur|erreurHttp)\b[^\n]*(Object\.assign|\{\s*$)/m)).toEqual(['utils/erreurHttp.js']);
  });

  test('effacer un fichier qui ne sert plus : seulement par userFileCleanup.effacerSiInutilise', () => {
    // isReferencedElsewhere suivi d'un supprimerParUrl : la suite recopiée dans 3 services avant
    expect(ou(/isReferencedElsewhere[\s\S]{0,400}supprimerParUrl/)).toEqual(['services/user/userFileCleanup.js']);
  });

  test('valider ou suspendre un compte : une seule version (tableau de bord)', () => {
    expect(ou(/async validateUser\(userId, data, moderatorId\)|async suspendUser\(userId, data, moderatorId\)/)).toEqual([]);
  });

  test('modération ou professionnel validé : seulement dans middlewares/authMiddleware.js', () => {
    expect(ou(/const requireModerationOuPro\s*=/)).toEqual(['middlewares/authMiddleware.js']);
  });
});
