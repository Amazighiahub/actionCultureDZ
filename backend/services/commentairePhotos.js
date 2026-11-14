/**
 * Photos jointes à un avis sur un service (restaurant, gîte…) : 3 au plus, avec l'accord de l'auteur
 * sur ses droits (« J'ai le droit de publier ces photos »). Le texte de l'avis paraît tout de suite ;
 * les photos attendent la validation de l'équipe (statut en_attente → publie ou rejete). L'image est
 * d'abord mise en ligne par /upload/image (Cloudinary), puis rattachée à l'avis ici.
 */
const { estImageDuSite } = require('./evenement/messagesParticipants');
const { erreur } = require('./evenement/mediasEvenement');
const { idsAdministrateurs, notifier } = require('../utils/notifierModeration');
const logger = require('../utils/logger');

const MAX_PHOTOS_AVIS = 3;
const DECISIONS = ['publie', 'rejete'];

/**
 * Photos envoyées avec un avis, vérifiées : tableau d'adresses d'images mises en ligne par le site,
 * 3 au plus, sans doublon ; l'accord sur les droits est obligatoire dès qu'il y a une photo.
 * @returns {string[]} adresses retenues (vide s'il n'y a pas de photo)
 */
function verifierPhotos(urls, accord) {
  if (urls === undefined || urls === null) return [];
  if (!Array.isArray(urls)) throw erreur('Les photos envoyées ne sont pas valides');
  if (!urls.length) return [];
  if (urls.length > MAX_PHOTOS_AVIS) throw erreur('Trois photos au plus par avis');
  for (const url of urls) {
    // Seulement une image mise en ligne par le site : pas de lien vers un autre domaine ou un autre compte
    if (typeof url !== 'string' || url.length > 500 || !estImageDuSite(url)) {
      throw erreur('Choisissez une photo à envoyer depuis le formulaire');
    }
  }
  if (new Set(urls).size !== urls.length) throw erreur('La même photo est envoyée deux fois');
  if (accord !== true) throw erreur('Cochez la case pour confirmer que vous avez le droit de publier ces photos');
  return urls;
}

/** L'équipe est prévenue qu'il y a des photos à valider (une alerte par heure au plus : l'écran liste tout) */
async function prevenirEquipe(models, notificationService, idAuteur) {
  try {
    const { premiereFoisPendant } = require('./quotaEmail');
    if (!(await premiereFoisPendant('moderation:photos-avis', 3600))) return;
    for (const idAdmin of await idsAdministrateurs(models)) {
      if (Number(idAdmin) === Number(idAuteur)) continue;
      await notifier(notificationService, idAdmin, {
        titre: 'Photos d’avis à valider',
        message: 'Des visiteurs ont joint des photos à leur avis sur un service : elles attendent votre validation avant de paraître.',
        url_action: '/admin/dashboard?tab=moderation'
      });
    }
  } catch (e) {
    logger.warn(`Équipe non prévenue des photos d'avis : ${e.message}`);
  }
}

/**
 * Rattache les photos (déjà vérifiées) à l'avis, en attente de validation, puis prévient l'équipe.
 * @returns {Promise<object[]>} lignes créées
 */
async function attacher(models, idAvis, idUser, urls, notificationService = null) {
  if (!urls?.length || !models?.CommentairePhoto) return [];
  const maintenant = new Date();
  const lignes = await models.CommentairePhoto.bulkCreate(urls.map((url) => ({
    id_commentaire: idAvis, id_user: idUser, url, statut: 'en_attente', accord_droits_le: maintenant
  })));
  await prevenirEquipe(models, notificationService, idUser);
  return lignes;
}

/** Photos qui attendent une décision, avec l'avis, le service et l'auteur (les plus anciennes d'abord) */
async function listerEnAttente(models) {
  if (!models.CommentairePhoto) return [];
  const photos = await models.CommentairePhoto.findAll({
    where: { statut: 'en_attente' },
    attributes: ['id_photo', 'url', 'date_creation', 'id_commentaire'],
    include: [
      {
        model: models.Commentaire, as: 'Avis', required: true,
        attributes: ['id_commentaire', 'contenu', 'id_service', 'statut'],
        include: models.Service ? [{ model: models.Service, attributes: ['id', 'nom'], required: false }] : []
      },
      { model: models.User, as: 'Auteur', attributes: ['id_user', 'prenom', 'nom'], required: false }
    ],
    order: [['date_creation', 'ASC']],
    limit: 100
  });
  return photos.map((p) => ({
    id_photo: p.id_photo,
    url: p.url,
    date_creation: p.date_creation,
    id_commentaire: p.id_commentaire,
    contenu: p.Avis?.contenu || '',
    statut_avis: p.Avis?.statut || null,
    id_service: p.Avis?.id_service || null,
    service_nom: p.Avis?.Service?.nom || null,
    auteur: p.Auteur ? { id_user: p.Auteur.id_user, prenom: p.Auteur.prenom, nom: p.Auteur.nom } : null
  }));
}

/**
 * Décision de l'équipe : « publie » (la photo paraît avec l'avis) ou « rejete » (motif obligatoire,
 * le fichier est effacé de Cloudinary, la ligne reste pour l'historique). L'auteur est prévenu.
 */
async function decider(models, notificationService, idPhoto, moderateur, decision, motif) {
  if (!DECISIONS.includes(decision)) throw erreur('Décision invalide');
  const raison = typeof motif === 'string' ? motif.trim().slice(0, 1000) : '';
  if (decision === 'rejete' && !raison) throw erreur('Écrivez le motif du refus');
  if (!models.CommentairePhoto) throw erreur('Photo introuvable', 404);

  const photo = await models.CommentairePhoto.findByPk(idPhoto, {
    attributes: ['id_photo', 'url', 'id_user', 'statut', 'id_commentaire'],
    include: [{ model: models.Commentaire, as: 'Avis', attributes: ['id_service'], required: false }]
  });
  if (!photo) throw erreur('Photo introuvable', 404);
  // Mise à jour conditionnelle : deux membres de l'équipe qui décident en même temps, un seul passe
  const [nombre] = await models.CommentairePhoto.update({
    statut: decision,
    motif_refus: decision === 'rejete' ? raison : null,
    id_moderateur: moderateur?.id_user || null,
    date_moderation: new Date()
  }, { where: { id_photo: photo.id_photo, statut: 'en_attente' } });
  if (!nombre) throw erreur('Cette photo a déjà été examinée', 409);

  if (decision === 'rejete') {
    try {
      await require('./cloudinaryService').supprimerParUrl(photo.url);
    } catch (e) {
      logger.warn(`Photo d'avis refusée non effacée de Cloudinary : ${e.message}`);
    }
  }

  const idService = photo.Avis?.id_service;
  await notifier(notificationService, photo.id_user, decision === 'publie'
    ? {
      titre: 'Photo de votre avis publiée',
      message: 'Votre photo est maintenant visible avec votre avis. Merci !',
      url_action: idService ? `/services/${idService}` : undefined
    }
    : {
      titre: 'Photo de votre avis refusée',
      message: `Votre photo n’a pas été publiée avec votre avis. Motif : ${raison}`,
      url_action: idService ? `/services/${idService}` : undefined
    });

  return { id_photo: photo.id_photo, statut: decision };
}

/**
 * Photos d'avis supprimés (ou d'un compte effacé) : lignes retirées, puis fichiers effacés de
 * Cloudinary s'ils ne servent plus ailleurs. Un échec n'empêche jamais la suppression de l'avis.
 */
async function supprimerPhotosAvis(models, idsCommentaire) {
  if (!models?.CommentairePhoto || !idsCommentaire?.length) return;
  try {
    const where = { id_commentaire: idsCommentaire };
    const urls = (await models.CommentairePhoto.findAll({ where, attributes: ['url'], raw: true })).map((p) => p.url);
    if (!urls.length) return;
    await models.CommentairePhoto.destroy({ where });
    await require('./user/userFileCleanup').deleteUserFiles(models, urls);
  } catch (e) {
    logger.warn(`Photos d'avis non effacées : ${e.message}`);
  }
}

module.exports = { verifierPhotos, attacher, listerEnAttente, decider, supprimerPhotosAvis, MAX_PHOTOS_AVIS };
