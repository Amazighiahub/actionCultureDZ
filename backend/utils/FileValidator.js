/**
 * Validateur de fichiers avec détection du magic number
 * Vérifie le type réel du fichier (pas seulement l'extension)
 */

const fs = require('fs');
const path = require('path');

/**
 * Magic numbers (file signatures) pour détection du type réel
 */
const MAGIC_NUMBERS = [
  // Images
  { magic: '89504e47', type: 'image/png', ext: '.png' },
  { magic: 'ffd8ff', type: 'image/jpeg', ext: '.jpg' },
  { magic: '47494638', type: 'image/gif', ext: '.gif' },

  // Vidéos (EBML - Matroska/WebM)
  { magic: '1a45dfa3', type: 'video/webm', ext: '.webm' },

  // Documents
  { magic: '25504446', type: 'application/pdf', ext: '.pdf' },
  { magic: 'd0cf11e0', type: 'application/msword', ext: '.doc' },
  { magic: '504b0304', type: 'application/zip', ext: '.zip' },

  // Audio
  { magic: '494433', type: 'audio/mpeg', ext: '.mp3' },
  { magic: 'fffb', type: 'audio/mpeg', ext: '.mp3' },
  { magic: 'fff3', type: 'audio/mpeg', ext: '.mp3' },
  { magic: 'fff1', type: 'audio/aac', ext: '.aac' },
  { magic: 'fff9', type: 'audio/aac', ext: '.aac' },
  { magic: '4f676753', type: 'audio/ogg', ext: '.ogg' }
];

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

  static async getHeader(filePath, length = 16) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.alloc(length);
      fs.open(filePath, 'r', (err, fd) => {
        if (err) return reject(err);

        fs.read(fd, buffer, 0, length, 0, (err) => {
          fs.close(fd, () => {});
          if (err) return reject(err);
          resolve(buffer);
        });
      });
    });
  }

  /**
   * Valide le type réel d'un fichier
   */
  static async validateFileType(filePath, allowedTypes) {
    try {
      const header = await FileValidator.getHeader(filePath, 16);
      const magicHex = header.subarray(0, 4).toString('hex');

      // Détection MP4 via ftyp (offset 4..8)
      const boxType = header.subarray(4, 8).toString('ascii');
      if (boxType === 'ftyp') {
        const detected = 'video/mp4';
        if (allowedTypes.includes(detected)) {
          return { valid: true, mimeType: detected, extension: '.mp4' };
        }
        return {
          valid: false,
          detected,
          allowed: allowedTypes,
          message: `Type détecté (${detected}) non autorisé`
        };
      }

      // Détection RIFF (WEBP/AVI/WAVE)
      if (magicHex === '52494646') {
        const riffType = header.subarray(8, 12).toString('ascii');
        const riffMap = {
          WEBP: { type: 'image/webp', ext: '.webp' },
          'AVI ': { type: 'video/avi', ext: '.avi' },
          WAVE: { type: 'audio/wav', ext: '.wav' }
        };
        const info = riffMap[riffType];
        if (info) {
          if (allowedTypes.includes(info.type)) {
            return { valid: true, mimeType: info.type, extension: info.ext };
          }
          return {
            valid: false,
            detected: info.type,
            allowed: allowedTypes,
            message: `Type détecté (${info.type}) non autorisé`
          };
        }
      }

      // Chercher une correspondance (signatures simples)
      const magicHexFull = header.toString('hex');
      for (const info of MAGIC_NUMBERS) {
        if (magicHexFull.startsWith(info.magic)) {
          // Cas particulier Office: fichiers ZIP
          if (info.type === 'application/zip') {
            const ext = path.extname(filePath).toLowerCase();
            const officeMimeByExt = {
              '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            };
            const officeMime = officeMimeByExt[ext];
            if (officeMime && allowedTypes.includes(officeMime)) {
              return { valid: true, mimeType: officeMime, extension: ext };
            }
          }

          if (allowedTypes.includes(info.type)) {
            return {
              valid: true,
              mimeType: info.type,
              extension: info.ext
            };
          }

          return {
            valid: false,
            detected: info.type,
            allowed: allowedTypes,
            message: `Type détecté (${info.type}) non autorisé`
          };
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
