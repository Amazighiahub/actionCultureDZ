/**
 * Photos envoyées sans compte (étape « photo » de l'inscription des professionnels, ou changement de
 * photo de profil) : elles arrivent dans le dossier Cloudinary de quarantaine. Celles qu'aucun compte
 * n'utilise au bout de 2 heures sont effacées. Avant : n'importe qui pouvait héberger des images sur le
 * compte Cloudinary du site, sans compte, pour toujours.
 *
 * Une photo n'est effacée que si son adresse exacte n'est utilisée nulle part (profils, intervenants,
 * services, événements, organisations, photos des sites), et si aucun profil ne la contient même
 * transformée : dans le doute, elle est gardée.
 */
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { isReferencedElsewhere } = require('./user/userFileCleanup');

const AGE_MIN_MS = 2 * 60 * 60 * 1000;
const PAR_PAGE = 500;
const PAGES_MAX = 10;

/**
 * @param {object} models - modèles Sequelize
 * @param {object} [deps] - pour les tests : { cloudinary, FOLDERS, deleteAsset, maintenant, estUtilisee, adopter }
 * @returns {Promise<{ vues: number, effacees: number, gardees: number, echecs: number, sorties: number }>}
 */
async function nettoyerQuarantaine(models, deps = {}) {
  const svc = deps.cloudinary ? deps : require('./cloudinaryService');
  const { cloudinary, FOLDERS, deleteAsset } = svc;
  const maintenant = deps.maintenant || Date.now();
  const estUtilisee = deps.estUtilisee || (async (r) => {
    if (await isReferencedElsewhere(models, r.secure_url, { sansMedias: false })) return true;
    // Dernière vérification avant d'effacer : un profil qui contiendrait l'identifiant sous une autre forme
    return (await models.User.unscoped().count({ where: { photo_url: { [Op.like]: `%${r.public_id}%` } } })) > 0;
  });
  // Photo de profil adoptée par un compte : sortie de la quarantaine (dossier des profils) et adresse
  // du profil mise à jour ; la liste de la quarantaine reste courte et le nettoyage rapide
  const adopter = deps.adopter || (async (r) => {
    if (!cloudinary?.uploader?.rename || !FOLDERS?.profile) return false;
    const n = await models.User.unscoped().count({ where: { photo_url: r.secure_url } });
    if (!n) return false;
    // Copiée ailleurs (intervenant, organisation, événement…) : laissée en place, sinon la copie casserait
    if (await isReferencedElsewhere({ ...models, User: undefined }, r.secure_url)) return false;
    const nouveau = `${FOLDERS.profile}/${r.public_id.split('/').pop()}`;
    const res = await cloudinary.uploader.rename(r.public_id, nouveau, { resource_type: 'image' });
    if (!res?.secure_url) return false;
    await models.User.unscoped().update({ photo_url: res.secure_url }, { where: { photo_url: r.secure_url } });
    return true;
  });
  const bilan = { vues: 0, effacees: 0, gardees: 0, echecs: 0, sorties: 0 };
  if (!cloudinary?.api?.resources || !FOLDERS?.quarantaine || !models?.User) return bilan;

  let curseur;
  for (let page = 0; page < PAGES_MAX; page++) {
    const reponse = await cloudinary.api.resources({
      type: 'upload', resource_type: 'image', prefix: `${FOLDERS.quarantaine}/`, max_results: PAR_PAGE,
      ...(curseur ? { next_cursor: curseur } : {}),
    });
    for (const r of reponse?.resources || []) {
      bilan.vues += 1;
      if (maintenant - new Date(r.created_at).getTime() < AGE_MIN_MS) continue;
      if (await estUtilisee(r)) {
        bilan.gardees += 1;
        if (await adopter(r).catch(() => false)) bilan.sorties += 1;
        continue;
      }
      const resultat = await deleteAsset(r.public_id, 'image');
      if (resultat?.result === 'ok' || resultat?.result === 'not found') bilan.effacees += 1;
      else bilan.echecs += 1;
    }
    curseur = reponse?.next_cursor;
    if (!curseur) break;
  }
  if (bilan.effacees || bilan.echecs) logger.info(`Quarantaine : ${bilan.effacees} photo(s) sans compte effacée(s), ${bilan.echecs} échec(s)`);
  return bilan;
}

module.exports = { nettoyerQuarantaine, AGE_MIN_MS };
