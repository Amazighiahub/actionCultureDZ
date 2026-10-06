/**
 * Suppression des fichiers d'un compte supprimé (photo, justificatifs).
 * Appelée APRÈS la transaction de suppression : un échec Cloudinary ne doit pas
 * empêcher l'effacement des données en base (best-effort, journalisé).
 *
 * Un fichier n'est supprimé que s'il n'est plus référencé ailleurs : la photo de
 * profil est modifiable par l'utilisateur, qui pourrait sinon pointer vers le
 * fichier d'un autre compte puis supprimer le sien.
 */
const logger = require('../../utils/logger');

async function isReferencedElsewhere(models, url) {
  const checks = [
    models.User && models.User.unscoped().count({ where: { photo_url: url } }),
    models.Media && models.Media.count({ where: { url } }),
    models.LieuMedia && models.LieuMedia.count({ where: { url } }),
    models.Intervenant && models.Intervenant.count({ where: { photo_url: url } }),
    models.Service && models.Service.count({ where: { photo_url: url } })
  ].filter(Boolean);
  const counts = await Promise.all(checks);
  return counts.some(c => c > 0);
}

/**
 * @param {object} models - modèles Sequelize
 * @param {string[]} urls - fichiers renvoyés par userRepository.hardDeleteUser
 * @param {object} [deps] - injection pour les tests ({ uploadService })
 * @returns {Promise<{deleted: number, skipped: number, failed: number}>}
 */
async function deleteUserFiles(models, urls, deps = {}) {
  const uploadService = deps.uploadService || require('../uploadService');
  const result = { deleted: 0, skipped: 0, failed: 0 };
  for (const url of [...new Set(urls || [])]) {
    try {
      if (await isReferencedElsewhere(models, url)) { result.skipped++; continue; }
      const done = await uploadService.deleteFile(url);
      if (done) result.deleted++; else result.skipped++;
    } catch (err) {
      result.failed++;
      logger.warn(`RGPD: suppression de fichier impossible (${err.message})`);
    }
  }
  return result;
}

module.exports = { deleteUserFiles, isReferencedElsewhere };
