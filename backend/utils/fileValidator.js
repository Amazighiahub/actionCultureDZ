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
   * Detecte le type reel a partir d'un buffer (premiers 16 octets suffisent).
   * Utilise pour le pipeline memoryStorage qui valide AVANT Cloudinary.
   *
   * @param {Buffer} buffer      buffer entier du fichier (on lit les 16 premiers bytes)
   * @param {string[]} allowedTypes  whitelist MIME
   * @returns {{ valid: boolean, mimeType?: string, extension?: string, detected?: string, message?: string }}
   */
  static validateBuffer(buffer, allowedTypes, { originalname = '' } = {}) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
      return { valid: false, detected: 'empty', message: 'Buffer vide ou trop court' };
    }

    const header = buffer.subarray(0, Math.min(16, buffer.length));
    const magicHex = header.subarray(0, 4).toString('hex');

    // MP4 / ISO base media : le magic number est 'ftyp' a l'offset 4..8.
    if (header.length >= 8 && header.subarray(4, 8).toString('ascii') === 'ftyp') {
      const detected = 'video/mp4';
      if (allowedTypes.includes(detected)) {
        return { valid: true, mimeType: detected, extension: '.mp4' };
      }
      return { valid: false, detected, allowed: allowedTypes, message: `Type detecte (${detected}) non autorise` };
    }

    // RIFF : WEBP / AVI / WAVE se distinguent par le token a l'offset 8..12.
    if (magicHex === '52494646' && header.length >= 12) {
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
        return { valid: false, detected: info.type, allowed: allowedTypes, message: `Type detecte (${info.type}) non autorise` };
      }
    }

    // Signatures simples (PNG, JPEG, GIF, PDF, MP3, OGG, DOC, ZIP...).
    const magicHexFull = header.toString('hex');
    for (const info of MAGIC_NUMBERS) {
      if (magicHexFull.startsWith(info.magic)) {
        // Les formats Office modernes (.docx/.xlsx/.pptx) sont des ZIP :
        // on regarde l'extension du fichier client pour le MIME final.
        if (info.type === 'application/zip') {
          const ext = path.extname(originalname).toLowerCase();
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
          return { valid: true, mimeType: info.type, extension: info.ext };
        }
        return { valid: false, detected: info.type, allowed: allowedTypes, message: `Type detecte (${info.type}) non autorise` };
      }
    }

    return {
      valid: false,
      detected: 'unknown',
      message: 'Signature de fichier inconnue'
    };
  }

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

      // Fichier Cloudinary : pas de fichier local pour magic-bytes.
      // Valider au minimum le mimetype rapporté par multer contre la whitelist.
      if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `Type de fichier non autorisé: ${file.mimetype}`,
              allowedTypes: allowedMimeTypes
            }
          });
        }
        return next();
      }

      // Vérifier la taille
      if (file.size > maxFileSize) {
        // Nettoyer le fichier local
        if (file.path && !file.path.startsWith('http')) { try { fs.unlinkSync(file.path); } catch (_) {} }
        return res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Fichier trop volumineux. Max: ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`,
            received: `${(file.size / 1024 / 1024).toFixed(2)}MB`
          }
        });
      }

      // Valider le type réel (magic number) pour les fichiers locaux
      const validation = await FileValidator.validateFileType(
        file.path,
        allowedMimeTypes
      );

      if (!validation.valid) {
        // Nettoyer le fichier invalide
        if (file.path && !file.path.startsWith('http')) { try { fs.unlinkSync(file.path); } catch (_) {} }
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
