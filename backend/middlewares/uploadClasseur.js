/**
 * Envoi d'un classeur Excel (.xlsx) gardé en mémoire : champ « fichier », 5 Mo, contenu vérifié.
 * Sert les imports (relevé de points de visite, liste d'inscriptions d'un événement).
 */
const multer = require('multer');
const { multerErrorGuard, validateMagicBytesBuffer } = require('./uploadSecurity');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TAILLE_MAX = 5 * 1024 * 1024;

const uploadClasseurXlsx = [
  multerErrorGuard(multer({ storage: multer.memoryStorage(), limits: { fileSize: TAILLE_MAX, files: 1 } }).single('fichier')),
  (req, res, next) => (req.file ? next() : res.status(400).json({ success: false, error: 'Fichier Excel (.xlsx) requis' })),
  validateMagicBytesBuffer([XLSX_MIME], { maxFileSize: TAILLE_MAX })
];

module.exports = { uploadClasseurXlsx };
