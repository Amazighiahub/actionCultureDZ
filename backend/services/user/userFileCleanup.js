/**
 * Effacement des fichiers Cloudinary qui ne servent plus (compte supprimé, photo ou menu retiré…).
 * Appelée APRÈS la transaction de suppression : un échec Cloudinary ne doit pas
 * empêcher l'effacement des données en base (best-effort, journalisé).
 *
 * Un fichier n'est supprimé que s'il n'est plus utilisé nulle part : la photo de profil est
 * modifiable par l'utilisateur, qui pourrait sinon pointer vers le fichier d'un autre compte puis
 * supprimer le sien. Dans le doute, le fichier est gardé.
 *
 * 2026-11-15 : chaque envoi (/upload/image, /document, /audio, /video, photo de profil) crée une ligne
 * Media « journal », rattachée à rien. Avant, ces lignes comptaient comme un usage : aucun fichier
 * n'était jamais effacé (photos retirées, photo de profil d'un compte supprimé…). Elles ne comptent
 * plus, sauf si un bloc d'article ou un extrait de livre les cite par leur id_media. Les colonnes et
 * textes qui peuvent contenir une adresse ont été recensés en entier (inventaire du 2026-11-15) ;
 * ceux en texte libre ou JSON sont cherchés par l'identifiant du fichier, qui reconnaît aussi une
 * adresse transformée (/w_400/…).
 */
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

/** Identifiant du fichier dans l'adresse (sans version ni transformation), sinon l'adresse entière */
function cleFichier(url) {
  let publicId = null;
  try {
    publicId = require('../cloudinaryService').lireUrlCloudinary(url)?.publicId || null;
  } catch { /* service indisponible (tests) : adresse entière */ }
  // Un identifiant trop court reconnaîtrait n'importe quoi : adresse entière
  return publicId && publicId.length >= 8 ? publicId : url;
}

/** Motif LIKE « contient » : % et _ du texte cherché ne sont pas des jokers */
const motifContient = (texte) => `%${String(texte).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Colonne texte ou JSON qui contient le motif (JSON lu comme texte) */
function contient(model, colonne, motif, json = false) {
  if (!model?.count) return null;
  if (json && model.sequelize?.where) {
    const s = model.sequelize;
    return model.count({ where: s.where(s.cast(s.col(colonne), 'CHAR'), { [Op.like]: motif }) });
  }
  return model.count({ where: { [colonne]: { [Op.like]: motif } } });
}

/**
 * Lignes Media de cette adresse qui servent vraiment : rattachées à une œuvre ou un événement, ou
 * citées par un bloc d'article ou un extrait de livre. Les lignes « journal » d'un envoi ne comptent pas.
 */
async function mediaUtilise(models, url) {
  const Media = models.Media;
  if (!Media) return false;
  if (!Media.findAll) return (await Media.count({ where: { url } })) > 0; // modèle partiel : prudence
  const lignes = await Media.findAll({ where: { url }, attributes: ['id_media', 'id_oeuvre', 'id_evenement'], raw: true });
  if (lignes.some((m) => m.id_oeuvre || m.id_evenement)) return true;
  const ids = lignes.map((m) => m.id_media);
  if (!ids.length) return false;
  const citations = await Promise.all([
    models.ArticleBlock?.count?.({ where: { id_media: ids } }),
    models.Livre?.count?.({ where: { [Op.or]: [{ id_media_extrait_pdf: ids }, { id_media_extrait_audio: ids }] } })
  ]);
  return citations.some((c) => c > 0);
}

/**
 * @param {object} [options]
 * @param {boolean} [options.sansMedias] - ne pas compter les lignes Media (photo de profil : ses propres envois)
 * @param {boolean} [options.sansTextes] - sans les recherches « contient » dans les articles (parcours complets) :
 *   pour la quarantaine, qui ne contient que des photos envoyées sans compte (profil)
 */
async function isReferencedElsewhere(models, url, { sansMedias = false, sansTextes = false } = {}) {
  const motif = motifContient(cleFichier(url));
  const checks = [
    models.User && models.User.unscoped().count({ where: { photo_url: url } }),
    // Justificatifs d'un compte (JSON) : par l'identifiant du fichier
    models.User && contient(models.User.unscoped(), 'documents_fournis', motif, true),
    !sansMedias && mediaUtilise(models, url),
    models.Media?.count?.({ where: { thumbnail_url: url } }),
    models.LieuMedia?.count?.({ where: { url } }),
    models.Intervenant?.count?.({ where: { photo_url: url } }),
    models.Service?.count?.({ where: { photo_url: url } }),
    models.Evenement?.count?.({ where: { image_url: url } }),
    // Image de partage d'un événement (réseaux sociaux)
    models.Evenement?.count?.({ where: { image_partage_url: url } }),
    models.Organisation?.count?.({ where: { logo_url: url } }),
    // Photo jointe à un avis sur un service
    models.CommentairePhoto?.count?.({ where: { url, statut: { [Op.ne]: 'rejete' } } }),
    // Photo de galerie ou menu d'un service
    models.ServiceMedia?.count?.({ where: { url } }),
    // Programme PDF joint à un message aux participants
    models.MessageEvenement?.count?.({ where: { lien_programme: url } }),
    models.UserCertification?.count?.({ where: { [Op.or]: [{ fichier_certificat: url }, { url_verification: url }] } }),
    models.QRCode?.count?.({ where: { qr_image_url: url } }),
    models.Signalement?.count?.({ where: { url_screenshot: url } })
  ].filter(Boolean);
  const utilise = (counts) => counts.some(c => c === true || c > 0);
  if (utilise(await Promise.all(checks))) return true;
  if (sansTextes) return false;
  // Ensuite seulement (parcours complets de tables, plus lents) : textes et JSON qui peuvent citer une
  // image — blocs d'articles, propositions de modification en attente (leur image n'est rattachée
  // qu'à l'acceptation), texte complet d'un article
  return utilise(await Promise.all([
    contient(models.ArticleBlock, 'contenu', motif),
    contient(models.ArticleBlock, 'metadata', motif, true),
    contient(models.ArticleRevision, 'contenu', motif, true),
    contient(models.Article, 'contenu_complet', motif)
  ].filter(Boolean)));
}

/** Lignes « journal » d'un fichier effacé : elles ne servaient à rien (/upload/file/:id renverrait un fichier absent) */
async function oublierJournal(models, url) {
  if (!models.Media?.destroy) return;
  await models.Media.destroy({ where: { url, id_oeuvre: null, id_evenement: null } });
}

/**
 * @param {object} models - modèles Sequelize
 * @param {string[]} urls - fichiers qui ne servent peut-être plus
 * @param {object} [deps] - injection pour les tests ({ supprimerParUrl })
 * @returns {Promise<{deleted: number, skipped: number, failed: number}>}
 */
async function deleteUserFiles(models, urls, deps = {}) {
  const supprimerParUrl = deps.supprimerParUrl || require('../cloudinaryService').supprimerParUrl;
  const result = { deleted: 0, skipped: 0, failed: 0 };
  for (const url of [...new Set((urls || []).filter(Boolean))]) {
    try {
      if (await isReferencedElsewhere(models, url)) { result.skipped++; continue; }
      const done = await supprimerParUrl(url);
      if (done) {
        result.deleted++;
        await oublierJournal(models, url).catch(() => undefined);
      } else result.skipped++;
    } catch (err) {
      result.failed++;
      logger.warn(`Fichier non effacé de Cloudinary (${err.message})`);
    }
  }
  return result;
}

module.exports = { deleteUserFiles, isReferencedElsewhere, oublierJournal };
