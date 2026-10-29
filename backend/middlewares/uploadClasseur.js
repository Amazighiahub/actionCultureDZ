/**
 * Envoi d'un classeur Excel (.xlsx) gardé en mémoire : champ « fichier », 5 Mo, contenu vérifié.
 * Sert les imports (relevé de points de visite, liste d'inscriptions d'un événement, catalogue).
 * Un .xlsx est une archive zip : sa taille une fois décompressée est aussi limitée, sinon un
 * fichier de quelques Ko (« bombe zip ») occuperait toute la mémoire du serveur à la lecture.
 */
const multer = require('multer');
const { multerErrorGuard, validateMagicBytesBuffer } = require('./uploadSecurity');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TAILLE_MAX = 5 * 1024 * 1024;
const TAILLE_DECOMPRESSEE_MAX = 60 * 1024 * 1024;
const NB_FICHIERS_MAX = 2000;

/**
 * Taille totale décompressée annoncée par le répertoire central de l'archive zip
 * (lu sans rien décompresser). null si l'archive est illisible ou au format zip64.
 */
function tailleDecompressee(buffer) {
  // Fin du répertoire central : signature PK\5\6, dans les 22 + 65535 derniers octets
  const debut = Math.max(0, buffer.length - 22 - 0xffff);
  let fin = -1;
  for (let i = buffer.length - 22; i >= debut; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) return null;
  const nombre = buffer.readUInt16LE(fin + 10);
  let pos = buffer.readUInt32LE(fin + 16);
  if (nombre === 0xffff || pos === 0xffffffff || nombre > NB_FICHIERS_MAX) return null;
  let total = 0;
  for (let n = 0; n < nombre; n++) {
    if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) return null;
    const taille = buffer.readUInt32LE(pos + 24);
    if (taille === 0xffffffff) return null;
    total += taille;
    pos += 46 + buffer.readUInt16LE(pos + 28) + buffer.readUInt16LE(pos + 30) + buffer.readUInt16LE(pos + 32);
  }
  return total;
}

function verifierDecompression(req, res, next) {
  const taille = tailleDecompressee(req.file.buffer);
  if (taille === null || taille > TAILLE_DECOMPRESSEE_MAX) {
    return res.status(400).json({ success: false, error: 'Fichier Excel trop volumineux ou illisible : enregistrez-le à nouveau au format .xlsx' });
  }
  next();
}

const uploadClasseurXlsx = [
  multerErrorGuard(multer({ storage: multer.memoryStorage(), limits: { fileSize: TAILLE_MAX, files: 1 } }).single('fichier')),
  (req, res, next) => (req.file ? next() : res.status(400).json({ success: false, error: 'Fichier Excel (.xlsx) requis' })),
  validateMagicBytesBuffer([XLSX_MIME], { maxFileSize: TAILLE_MAX }),
  verifierDecompression
];

module.exports = { uploadClasseurXlsx, tailleDecompressee };
