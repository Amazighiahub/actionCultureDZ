/**
 * Anti-retour (2026-11-20) : les notifications sont lues dans la langue de la personne. Elles sont enregistrées
 * en français puis traduites à la lecture (utils/traductionServeur, i18n/serveur). Chaque titre et texte écrit
 * dans le code doit donc avoir sa traduction arabe et anglaise : une nouvelle notification sans traduction fait
 * échouer ce test.
 */
const fs = require('fs');
const path = require('path');
const { traduireTexteServeur } = require('../../utils/traductionServeur');

const RACINE = path.resolve(__dirname, '..', '..');
const DOSSIERS = ['services', 'controllers', 'routes', 'utils', 'jobs', 'helpers'];
// Messages déjà rédigés dans chaque langue, ou réservés à l'équipe et assemblés de morceaux
const EXCLUS = new Set(['services/messagesProfessionnels.js', 'routes/notificationRoutes.js']);
const APPELS = /sendToUser|notifier\(|Notification\.create|enregistrerNotification/;

function fichiers(d) {
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : fichiers(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

/** Textes de notification : titre et message écrits d'un seul tenant (gabarits sans condition) */
function textes() {
  const trouves = [];
  for (const f of DOSSIERS.flatMap((d) => fichiers(path.join(RACINE, d)))) {
    const rel = path.relative(RACINE, f).split(path.sep).join('/');
    const s = fs.readFileSync(f, 'utf8');
    if (EXCLUS.has(rel) || !APPELS.test(s)) continue;
    let suite = false; // « message: condition » puis « ? '…' » / « : '…' » sur les lignes suivantes
    s.split('\n').forEach((ligne, i) => {
      const morceaux = [...ligne.matchAll(/\b(titre|message)\s*:\s*([`'])((?:\\.|(?!\2).)*)\2/g)];
      // « titre: ok ? 'A' : 'B' » sur une ligne
      const alt = /\b(titre|message)\s*:[^'`?]*\?\s*([`'])((?:\\.|(?!\2).)*)\2\s*:\s*([`'])((?:\\.|(?!\4).)*)\4/.exec(ligne);
      if (alt) morceaux.push([alt[0], alt[1], alt[2], alt[3]], [alt[0], alt[1], alt[4], alt[5]]);
      if (/\b(titre|message)\s*:\s*[^'`\s][^'`]*$/.test(ligne)) suite = true;
      else if (suite && /^\s*[?:]\s*[`']/.test(ligne)) {
        const m = /^\s*[?:]\s*([`'])((?:\\.|(?!\1).)*)\1/.exec(ligne);
        if (m) morceaux.push([m[0], 'message', m[1], m[2]]);
      } else suite = false;
      for (const m of morceaux) {
        const brut = m[3];
        if (!/[a-zà-ÿ]{3}/i.test(brut) || /^[a-z_.]+$/.test(brut)) continue;
        // Gabarit avec une condition (« a été ${ok ? 'acceptée' : 'refusée'} ») : vérifié à part plus bas
        if (m[2] === '`' && /\$\{[^}]*\?/.test(brut)) continue;
        // « ${a} ${b} » assemblé de morceaux : réservé à l'équipe
        if (/^« \$\{[^}]*\} » \$\{[^}]*\}\.$/.test(brut)) continue;
        const exemple = m[2] === '`' ? brut.replace(/\$\{[^}]*\}/g, 'Exemple') : brut.replace(/\\'/g, "'");
        trouves.push({ ou: `${rel}:${i + 1}`, exemple });
      }
    });
  }
  return trouves;
}

describe('Notifications traduites', () => {
  const liste = textes();

  test('l’inventaire trouve bien les notifications', () => {
    expect(liste.length).toBeGreaterThan(60);
  });

  test.each(['ar', 'en'])('chaque titre et texte a sa traduction (%s)', (langue) => {
    const manquants = liste.filter(({ exemple }) => traduireTexteServeur(exemple, langue) === exemple).map(({ ou, exemple }) => `${ou} ${exemple}`);
    expect(manquants).toEqual([]);
  });

  test('phrases à condition : participation acceptée ou refusée, commande avec quantité', () => {
    expect(traduireTexteServeur('Votre participation à « Festival » a été refusée', 'ar')).toBe('تم رفض مشاركتك في «Festival»');
    expect(traduireTexteServeur('Votre participation à « Festival » a été acceptée', 'en')).toBe('Your participation in “Festival” has been accepted');
    expect(traduireTexteServeur('Sara commande « Tapis » (× 2). Il va vous payer directement ; confirmez le paiement quand vous l’avez reçu.', 'en'))
      .toMatch(/^Sara is ordering “Tapis” \(× 2\)/);
  });
});
