/**
 * Extrait d'un livre : l'écrivain envoie son PDF entier, le site ne garde que les premières pages.
 * Le fichier temporaire est réécrit sur place ; le livre complet n'est jamais enregistré.
 */
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

/**
 * @returns {Promise<{ pagesTotal: number, pagesGardees: number, taille: number }>}
 * @throws si le PDF est illisible ou protégé par un mot de passe
 */
async function garderPremieresPages(chemin, maxPages) {
  const source = await PDFDocument.load(await fs.promises.readFile(chemin), { updateMetadata: false });
  const pagesTotal = source.getPageCount();
  if (pagesTotal === 0) throw new Error('PDF sans page');
  const pagesGardees = Math.min(pagesTotal, maxPages);
  const extrait = await PDFDocument.create();
  const copies = await extrait.copyPages(source, Array.from({ length: pagesGardees }, (_, i) => i));
  copies.forEach((p) => extrait.addPage(p));
  const titre = source.getTitle();
  if (titre) extrait.setTitle(titre);
  const octets = await extrait.save({ useObjectStreams: true });
  await fs.promises.writeFile(chemin, octets);
  return { pagesTotal, pagesGardees, taille: octets.length };
}

module.exports = { garderPremieresPages };
