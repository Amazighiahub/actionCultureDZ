/**
 * Après « vite build » : écrit une copie compressée (.gz, niveau maximal) des fichiers texte de dist/.
 * nginx les sert directement (gzip_static) : environ 15 % de moins que la compression faite à la
 * volée (niveau 1 par défaut), sans calcul à chaque visite.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, constants } from 'node:zlib';

const DOSSIER = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const TEXTE = /\.(js|mjs|css|html|svg|json|txt|xml|webmanifest)$/;
const TAILLE_MIN = 1024;

let fichiers = 0;
let avant = 0;
let apres = 0;
const parcourir = (dossier) => {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) { parcourir(chemin); continue; }
    if (!TEXTE.test(nom)) continue;
    const contenu = readFileSync(chemin);
    if (contenu.length < TAILLE_MIN) continue;
    const gz = gzipSync(contenu, { level: constants.Z_BEST_COMPRESSION });
    writeFileSync(`${chemin}.gz`, gz);
    fichiers++;
    avant += contenu.length;
    apres += gz.length;
  }
};
parcourir(DOSSIER);
console.log(`précompression : ${fichiers} fichiers, ${Math.round(avant / 1024)} Ko → ${Math.round(apres / 1024)} Ko (gzip 9)`);
