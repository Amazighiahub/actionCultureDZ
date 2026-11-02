/**
 * Envoi d'un classeur Excel (.xlsx) gardé en mémoire : champ « fichier », 5 Mo, contenu vérifié.
 * Sert les imports (relevé de points de visite, liste d'inscriptions d'un événement, catalogue).
 * Un .xlsx est une archive zip : sa taille une fois décompressée est aussi limitée, sinon un
 * fichier de quelques Ko (« bombe zip ») occuperait toute la mémoire du serveur à la lecture.
 */
const zlib = require('zlib');
const { promisify } = require('util');
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

const decompresser = promisify(zlib.inflateRaw);

/**
 * Taille réelle : les tailles annoncées peuvent être fausses (archive forgée), et la lecture du
 * classeur ne les contrôle qu'une fois tout décompressé. Chaque fichier est donc décompressé avec
 * un plafond. false si la limite est dépassée ou si l'archive est illisible.
 */
async function decompressionSousLimite(buffer) {
  const debut = Math.max(0, buffer.length - 22 - 0xffff);
  let fin = -1;
  for (let i = buffer.length - 22; i >= debut; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) return false;
  const nombre = buffer.readUInt16LE(fin + 10);
  let pos = buffer.readUInt32LE(fin + 16);
  let reste = TAILLE_DECOMPRESSEE_MAX;
  for (let n = 0; n < nombre; n++) {
    if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) return false;
    const methode = buffer.readUInt16LE(pos + 10);
    const compresse = buffer.readUInt32LE(pos + 20);
    const entete = buffer.readUInt32LE(pos + 42);
    if (entete + 30 > buffer.length) return false;
    const donnees = entete + 30 + buffer.readUInt16LE(entete + 26) + buffer.readUInt16LE(entete + 28);
    const brut = buffer.subarray(donnees, donnees + compresse);
    if (methode === 0) {
      reste -= brut.length;
    } else if (methode === 8 && compresse > 0) {
      try {
        reste -= (await decompresser(brut, { maxOutputLength: reste + 1 })).length;
      } catch {
        return false;
      }
    } else if (methode !== 8) {
      return false;
    }
    if (reste < 0) return false;
    pos += 46 + buffer.readUInt16LE(pos + 28) + buffer.readUInt16LE(pos + 30) + buffer.readUInt16LE(pos + 32);
  }
  return true;
}

async function verifierDecompression(req, res, next) {
  const taille = tailleDecompressee(req.file.buffer);
  if (taille === null || taille > TAILLE_DECOMPRESSEE_MAX || !(await decompressionSousLimite(req.file.buffer))) {
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

module.exports = { uploadClasseurXlsx, tailleDecompressee, decompressionSousLimite };
