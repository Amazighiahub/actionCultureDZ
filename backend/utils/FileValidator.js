/**
 * Validateur de fichiers avec détection du magic number
 * Vérifie le type réel du fichier (pas seulement l'extension)
 */

const fs = require('fs');
const path = require('path');

/**
 * Magic numbers (file signatures) pour détection du type réel
 */
const MAGIC_NUMBERS = {
  // Images
  '89504e47': { type: 'image/png', ext: '.png' },
  'ffd8ffe0': { type: 'image/jpeg', ext: '.jpg' },
  'ffd8ffe1': { type: 'image/jpeg', ext: '.jpg' },
  'ffd8ffe2': { type: 'image/jpeg', ext: '.jpg' },
  'ffd8ffe3': { type: 'image/jpeg', ext: '.jpg' },
  'ffd8ffe8': { type: 'image/jpeg', ext: '.jpg' },
  'ffd8ffdb': { type: 'image/jpeg', ext: '.jpg' },
  '47494638': { type: 'image/gif', ext: '.gif' }, // GIF89a or GIF87a
  '424d': { type: 'image/bmp', ext: '.bmp' }, // BMP files start with "BM"

  // Documents
  '25504446': { type: 'application/pdf', ext: '.pdf' },
  'd0cf11e0': { type: 'application/msword', ext: '.doc' },
  '504b0304': { type: 'application/zip', ext: '.zip' }, // Office files (docx, xlsx, pptx) use ZIP

  // Vidéos
  '00000018': { type: 'video/mp4', ext: '.mp4' }, // ftyp box
  '00000020': { type: 'video/mp4', ext: '.mp4' }, // ftyp box variant
  '0000001c': { type: 'video/mp4', ext: '.mp4' }, // ftyp box variant

  // Audio
  '494433': { type: 'audio/mpeg', ext: '.mp3' }, // ID3 tag
  'fffb': { type: 'audio/mpeg', ext: '.mp3' }, // MP3 frame sync
  'fff3': { type: 'audio/mpeg', ext: '.mp3' }, // MP3 frame sync
  '4f676753': { type: 'audio/ogg', ext: '.ogg' }
};

// WebP nécessite une vérification spéciale (RIFF....WEBP)
const RIFF_BASED = {
  'WEBP': { type: 'image/webp', ext: '.webp' },
  'AVI ': { type: 'video/avi', ext: '.avi' },
  'WAVE': { type: 'audio/wav', ext: '.wav' }
};

class FileValidator {
  /**
   * Obtient les premiers bytes d'un fichier pour détection
   */
  static async getFileHeader(filePath, bytes = 12) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(bytes);
      fs.open(filePath, 'r', (err, fd) => {
        if (err) return reject(err);

        fs.read(fd, buffer, 0, bytes, 0, (err) => {
          fs.close(fd, () => {});
          if (err) return reject(err);
          resolve(buffer);
        });
      });
    });
  }

  /**
   * Valide le type réel d'un fichier via magic bytes
   */
  static async validateFileType(filePath, allowedTypes) {
    try {
      const header = await FileValidator.getFileHeader(filePath, 12);
      const magicHex = header.slice(0, 4).toString('hex');

      // Vérifier les formats RIFF (WebP, AVI, WAV)
      if (magicHex === '52494646') { // "RIFF"
        const format = header.slice(8, 12).toString('ascii');
        const riffInfo = RIFF_BASED[format];
        if (riffInfo) {
          if (allowedTypes.includes(riffInfo.type)) {
            return { valid: true, mimeType: riffInfo.type, extension: riffInfo.ext };
          }
          return { valid: false, detected: riffInfo.type, allowed: allowedTypes, message: `Type détecté (${riffInfo.type}) non autorisé` };
        }
      }

      // Chercher une correspondance dans MAGIC_NUMBERS
      for (const [magic, info] of Object.entries(MAGIC_NUMBERS)) {
        if (magicHex.startsWith(magic)) {
          if (allowedTypes.includes(info.type)) {
            return { valid: true, mimeType: info.type, extension: info.ext };
          }
          return { valid: false, detected: info.type, allowed: allowedTypes, message: `Type détecté (${info.type}) non autorisé` };
        }
      }

      // Si pas de match, vérifier l'extension comme fallback
      const ext = path.extname(filePath).toLowerCase();
      return { valid: false, detected: 'unknown', message: `Type de fichier non détecté: ${ext}` };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Middleware Express pour valider les uploads
   */
  static uploadValidator(allowedMimeTypes, maxFileSize = 10 * 1024 * 1024) {
    return async (req, res, next) => {
      if (!req.file) {
        return next();
      }

      const file = req.file;

      // Vérifier la taille
      if (file.size > maxFileSize) {
        // Nettoyer le fichier
        fs.unlinkSync(file.path);
        return res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Fichier trop volumineux. Max: ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`,
            received: `${(file.size / 1024 / 1024).toFixed(2)}MB`
          }
        });
      }

      // Valider le type réel
      const validation = await FileValidator.validateFileType(
        file.path,
        allowedMimeTypes
      );

      if (!validation.valid) {
        // Nettoyer le fichier invalide
        fs.unlinkSync(file.path);
        return res.status(400).json({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: validation.message,
            detected: validation.detected,
            allowed: allowedMimeTypes
          }
        });
      }

      // Mettre à jour le mimetype détecté
      req.file.mimetype = validation.mimeType;

      next();
    };
  }

  /**
   * Valide les fichiers uploadés en batch
   */
  static async validateFilesBatch(filePaths, allowedTypes) {
    const results = [];

    for (const filePath of filePaths) {
      const validation = await FileValidator.validateFileType(filePath, allowedTypes);
      results.push({
        file: filePath,
        ...validation
      });
    }

    return results;
  }
}

module.exports = FileValidator;
