/**
 * Extrait d'un livre : l'écrivain envoie son PDF entier, le site ne garde que les premières pages.
 * Le fichier temporaire est réécrit sur place ; le livre complet n'est jamais enregistré.
 *
 * Sécurité : un PDF est un fichier non fiable (il peut être piégé pour épuiser la mémoire ou le
 * processeur, par exemple un flux compressé qui grossit à des centaines de Mo).
 * 1. qpdf (outil spécialisé) découpe le livre dans un PROCESSUS séparé, sous une limite de mémoire
 *    imposée par le système (ulimit) et un délai : s'il dépasse, seul ce processus est arrêté.
 *    Le fichier produit part d'un document vide (ni actions d'ouverture, ni JavaScript du document)
 *    et n'a plus de flux d'objets compressés.
 * 2. Sur ce petit fichier déjà nettoyé, pdf-lib retire les annotations et actions des pages
 *    (liens, JavaScript), dans un fil séparé à mémoire limitée.
 * Un seul PDF à la fois, deux autres en attente au plus.
 * Sans qpdf (poste de développement Windows) : pdf-lib seul, refusé en production.
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { Worker } = require('worker_threads');

const MEMOIRE_QPDF_KO = 512 * 1024;
const DELAI_QPDF_MS = 25000;
const MEMOIRE_FIL_MO = 160;
const DELAI_FIL_MS = 20000;
const EN_ATTENTE_MAX = 2;

/** Pages gardées, annotations retirées (pdf-lib) : dans le fil séparé, ou directement dans les tests */
async function garderPremieresPages(chemin, maxPages) {
  const { PDFDocument, PDFName } = require('pdf-lib');
  const source = await PDFDocument.load(await fs.promises.readFile(chemin), { updateMetadata: false });
  const pagesTotal = source.getPageCount();
  if (pagesTotal === 0) throw new Error('PDF sans page');
  const pagesGardees = Math.min(pagesTotal, maxPages);
  const extrait = await PDFDocument.create();
  const copies = await extrait.copyPages(source, Array.from({ length: pagesGardees }, (_, i) => i));
  for (const p of copies) {
    // Ni liens ni actions automatiques venus du fichier d'origine
    p.node.delete(PDFName.of('Annots'));
    p.node.delete(PDFName.of('AA'));
    extrait.addPage(p);
  }
  const titre = source.getTitle();
  if (titre) extrait.setTitle(titre.slice(0, 200));
  const octets = await extrait.save({ useObjectStreams: true });
  await fs.promises.writeFile(chemin, octets);
  return { pagesTotal, pagesGardees, taille: octets.length };
}

/** qpdf sous limite de mémoire (ulimit -v) et de temps ; arguments passés sans interprétation */
function qpdf(args, delaiMs = DELAI_QPDF_MS) {
  return new Promise((ok, ko) => {
    // « && » : si la limite de mémoire ne peut pas être posée, qpdf ne tourne pas
    execFile('sh', ['-c', `ulimit -v ${MEMOIRE_QPDF_KO} && exec qpdf "$@"`, 'qpdf', ...args],
      { timeout: delaiMs, killSignal: 'SIGKILL', maxBuffer: 64 * 1024 },
      (err, stdout) => {
        // qpdf : 0 = bon, 3 = bon avec avertissements (fichier légèrement abîmé mais lisible)
        if (err && err.code !== 3) return ko(new Error('PDF illisible ou trop complexe'));
        ok(String(stdout));
      });
  });
}

// Seule la réussite est retenue : un essai raté (serveur chargé) est refait à la demande suivante
let qpdfPresent = false;
async function qpdfDisponible() {
  if (qpdfPresent) return true;
  if (process.platform === 'win32') return false;
  qpdfPresent = await new Promise((ok) => execFile('qpdf', ['--version'], { timeout: 10000 }, (err) => ok(!err)));
  return qpdfPresent;
}

function filPdfLib(chemin, maxPages) {
  return new Promise((ok, ko) => {
    const fil = new Worker(path.join(__dirname, 'extraitPdfFil.js'), {
      workerData: { chemin, maxPages },
      resourceLimits: { maxOldGenerationSizeMb: MEMOIRE_FIL_MO, maxYoungGenerationSizeMb: 32 },
    });
    let fini = false;
    const terminer = (err, r) => { if (fini) return; fini = true; clearTimeout(minuteur); err ? ko(err) : ok(r); };
    const minuteur = setTimeout(() => { fil.terminate(); terminer(new Error('PDF trop long à traiter')); }, DELAI_FIL_MS);
    fil.once('message', (m) => (m?.erreur ? terminer(new Error(m.erreur)) : terminer(null, m)));
    fil.once('error', (e) => terminer(e));
    fil.once('exit', (code) => terminer(new Error(`PDF non traité (arrêt ${code})`)));
  });
}

// File d'attente : un seul PDF traité à la fois. La place est passée directement au suivant
// (avant : une autre demande pouvait se glisser entre la sortie de l'un et l'entrée de l'autre)
let enCours = 0;
const attente = [];
const liberer = () => {
  const suivant = attente.shift();
  if (suivant) suivant();
  else enCours--;
};

class PdfOccupe extends Error {
  constructor() { super('Le serveur traite déjà d’autres PDF : réessayez dans une minute.'); this.code = 'PDF_OCCUPE'; }
}

async function traiter(chemin, maxPages) {
  if (await qpdfDisponible()) {
    const total = parseInt(await qpdf(['--show-npages', chemin], 10000), 10);
    if (!Number.isInteger(total) || total < 1) throw new Error('PDF sans page');
    const garde = Math.min(total, maxPages);
    const sortie = `${chemin}.extrait`;
    try {
      // Document vide + pages choisies : rien du document d'origine (actions, JavaScript, pièces jointes)
      await qpdf(['--empty', '--object-streams=disable', '--pages', chemin, `1-${garde}`, '--', sortie]);
      await fs.promises.rename(sortie, chemin);
    } finally {
      await fs.promises.unlink(sortie).catch(() => {});
    }
    const r = await filPdfLib(chemin, maxPages);
    return { ...r, pagesTotal: total };
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Traitement des PDF indisponible');
  return filPdfLib(chemin, maxPages);
}

/** Traitement isolé : mémoire et durée limitées, file d'attente courte */
async function garderPremieresPagesIsole(chemin, maxPages) {
  if (enCours >= 1) {
    if (attente.length >= EN_ATTENTE_MAX) throw new PdfOccupe();
    // La place est reçue de celui qui sort : enCours reste à 1
    await new Promise((ok) => attente.push(ok));
  } else {
    enCours = 1;
  }
  try {
    return await traiter(chemin, maxPages);
  } finally {
    liberer();
  }
}

module.exports = { garderPremieresPages, garderPremieresPagesIsole, PdfOccupe };
