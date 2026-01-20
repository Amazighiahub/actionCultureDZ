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
  '47494638': { type: 'image/gif', ext: '.gif' }, // GIF89a or GIF87a
  '52494646': { type: 'image/webp', ext: '.webp' },

  // Documents
  '25504446': { type: 'application/pdf', ext: '.pdf' },
  'd0cf11e0': { type: 'application/msword', ext: '.doc' },
  '504b0304': { type: 'application/zip', ext: '.zip' }, // Office files use ZIP

  // Vidéos
  '000000': { type: 'video/mp4', ext: '.mp4' }, // Simple check for MP4
  '52494646': { type: 'video/avi', ext: '.avi' },

  // Audio
  '494433': { type: 'audio/mpeg', ext: '.mp3' }, // ID3 tag
  '4f676753': { type: 'audio/ogg', ext: '.ogg' }
};

class FileValidator {
  /**
   * Obtient le magic number (premiers bytes) d'un fichier
   */
  static async getMagicNumber(filePath) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(4);
      fs.open(filePath, 'r', (err, fd) => {
        if (err) return reject(err);

        fs.read(fd, buffer, 0, 4, 0, (err) => {
          fs.close(fd, () => {});
          if (err) return reject(err);

          const hex = buffer.toString('hex');
          resolve(hex);
        });
      });
    });
  }

  /**
   * Valide le type réel d'un fichier
   */
  static async validateFileType(filePath, allowedTypes) {
    try {
      const magicHex = await FileValidator.getMagicNumber(filePath);

      // Chercher une correspondance
      for (const [magic, info] of Object.entries(MAGIC_NUMBERS)) {
        if (magicHex.startsWith(magic)) {
          if (allowedTypes.includes(info.type)) {
            return {
              valid: true,
              mimeType: info.type,
              extension: info.ext
            };
          } else {
            return {
              valid: false,
              detected: info.type,
              allowed: allowedTypes,
              message: `Type détecté (${info.type}) non autorisé`
            };
          }
        }
      }

      // Si pas de match, vérifier l'extension
      const ext = path.extname(filePath).toLowerCase();
      return {
        valid: false,
        detected: 'unknown',
        message: `Type de fichier non détecté: ${ext}`
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
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
