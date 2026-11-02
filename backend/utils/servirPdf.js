/**
 * Sert au navigateur un PDF stocké sur Cloudinary (documents d'événement, programme d'un message).
 * pipeline() propage les erreurs : avec .pipe(), une coupure pendant le transfert n'avait aucun
 * écouteur, devenait une uncaughtException et arrêtait tout le serveur (audit V8, C1).
 */
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const logger = require('./logger');

const DELAI_MS = 20000;

/**
 * @param {import('express').Response} res
 * @param {string} url adresse du PDF, déjà contrôlée par l'appelant
 * @param {{ nomFichier: string, enCachePublic?: boolean }} options
 * @returns {Promise<boolean>} false si Cloudinary n'a pas fourni le fichier (rien n'est envoyé)
 */
async function servirPdf(res, url, { nomFichier, enCachePublic = true }) {
  let fichier;
  try {
    fichier = await fetch(url, { signal: AbortSignal.timeout(DELAI_MS) });
  } catch (e) {
    logger.warn(`PDF indisponible : ${e.message}`);
    return false;
  }
  if (!fichier.ok || !fichier.body) return false;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${nomFichier}"`,
    // Un événement non publié ne doit pas rester dans un cache partagé
    'Cache-Control': enCachePublic ? 'public, max-age=3600' : 'private, no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  const taille = fichier.headers.get('content-length');
  if (taille) res.set('Content-Length', taille);

  try {
    await pipeline(Readable.fromWeb(fichier.body), res);
  } catch (e) {
    // Transfert coupé (Cloudinary, ou visiteur qui ferme la page) : l'envoi est abandonné, le serveur continue
    logger.warn(`Envoi du PDF interrompu : ${e.message}`);
    if (!res.destroyed) res.destroy();
  }
  return true;
}

module.exports = { servirPdf };
