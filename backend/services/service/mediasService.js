/**
 * Galerie de photos et menus d'un service (restaurant, hôtel, gîte…), accord de la responsable du
 * 2026-11-15. Jusqu'à 10 photos et 3 menus (PDF ou image) par service, ajoutés par le professionnel
 * (ou la modération). Même chemin que les documents d'un événement : le fichier est d'abord mis en
 * ligne (/upload/image ou /upload/document), puis rattaché ici ; seuls les fichiers du site passent.
 * La photo principale du service (services.photo_url) reste la première de sa galerie.
 */
const { estImageDuSite, estPdfDuSite } = require('../evenement/messagesParticipants');
const { erreur } = require('../evenement/mediasEvenement');
const { peutGerer, estModeration } = require('../../utils/droits');
const { texteSimple } = require('../patrimoine/creditPhoto');

const MAX = { photo: 10, menu: 3 };

/** Adresse publique d'un menu PDF, servie par le site (Cloudinary donne le PDF sans extension) */
const lienMenu = (idService, idMedia) => `/api/services/${idService}/menus/${idMedia}/menu.pdf`;

/** Le service, si le compte en est le professionnel ou fait partie de la modération */
async function serviceGere(models, idService, utilisateur) {
  const service = await models.Service.findByPk(idService, { attributes: ['id', 'id_user'] });
  if (!service) throw erreur('Service introuvable', 404);
  if (!peutGerer(service.id_user, { userId: utilisateur?.id_user, isModerator: estModeration(utilisateur) })) {
    throw erreur('Seul le professionnel de ce service peut gérer ses photos et menus', 403);
  }
  return service;
}

/** Photos et menus d'un service, dans l'ordre d'ajout */
async function lister(models, idService) {
  if (!models.ServiceMedia) return { photos: [], menus: [] };
  const lignes = await models.ServiceMedia.findAll({
    where: { id_service: idService },
    attributes: ['id', 'type', 'url', 'nom', 'ordre'],
    order: [['ordre', 'ASC'], ['id', 'ASC']],
    raw: true
  });
  return {
    photos: lignes.filter((m) => m.type === 'photo').map(({ id, url }) => ({ id, url })),
    menus: lignes.filter((m) => m.type === 'menu').map(({ id, url, nom }) => (estPdfDuSite(url)
      ? { id, nom, pdf: true, lien: lienMenu(idService, id) }
      : { id, nom, pdf: false, url }))
  };
}

async function ajouter(models, idService, utilisateur, { type, url, nom }) {
  if (!['photo', 'menu'].includes(type)) throw erreur('Genre de fichier invalide');
  const service = await serviceGere(models, idService, utilisateur);
  // Photo : une image du site ; menu : une image ou un PDF du site (pas de lien vers un autre domaine)
  const valide = type === 'photo' ? estImageDuSite(url) : (estImageDuSite(url) || estPdfDuSite(url));
  if (!valide) throw erreur(type === 'photo' ? 'Choisissez une photo à envoyer depuis le formulaire' : 'Choisissez un PDF ou une image à envoyer depuis le formulaire');
  const nombre = await models.ServiceMedia.count({ where: { id_service: service.id, type } });
  if (nombre >= MAX[type]) {
    throw erreur(type === 'photo' ? 'Dix photos au plus par service : retirez-en une d’abord' : 'Trois menus au plus par service : retirez-en un d’abord');
  }
  const media = await models.ServiceMedia.create({
    id_service: service.id, type, url, ordre: nombre, id_user: utilisateur.id_user,
    nom: type === 'menu' ? (texteSimple(nom, 100) || null) : null
  });
  return { id: media.id, type, url: media.url, nom: media.nom };
}

/** Retire une photo ou un menu ; le fichier est effacé s'il ne sert plus ailleurs */
async function retirer(models, idService, idMedia, utilisateur) {
  const service = await serviceGere(models, idService, utilisateur);
  const where = { id: idMedia, id_service: service.id };
  const media = await models.ServiceMedia.findOne({ where, attributes: ['url'], raw: true });
  if (!media) throw erreur('Fichier introuvable', 404);
  await models.ServiceMedia.destroy({ where });
  await require('../user/userFileCleanup').deleteUserFiles(models, [media.url]).catch(() => undefined);
  return true;
}

/** Adresse Cloudinary d'un menu PDF à servir ; 404 si ce n'est pas un menu PDF de ce service */
async function fichierMenu(models, idService, idMedia) {
  const media = models.ServiceMedia
    ? await models.ServiceMedia.findOne({ where: { id: idMedia, id_service: idService, type: 'menu' }, attributes: ['url'], raw: true })
    : null;
  if (!media || !estPdfDuSite(media.url)) throw erreur('Fichier introuvable', 404);
  return media.url;
}

/** Fichiers d'un service supprimé : effacés de Cloudinary (les lignes partent avec le service) */
async function urlsDuService(models, idService) {
  if (!models.ServiceMedia) return [];
  return (await models.ServiceMedia.findAll({ where: { id_service: idService }, attributes: ['url'], raw: true })).map((m) => m.url);
}

module.exports = { lister, ajouter, retirer, fichierMenu, urlsDuService, lienMenu, MAX };
