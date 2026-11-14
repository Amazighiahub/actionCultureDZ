/**
 * Photos de l'événement (audit V11 OUT-23) : l'organisateur montre comment ça s'est passé. Elles
 * s'affichent dans la galerie de la page de l'événement (GET /evenements/:id/medias). L'image est
 * d'abord mise en ligne par /upload/image (Cloudinary), puis rattachée ici avec sa légende.
 */
const { estImageDuSite } = require('./messagesParticipants');
const { MediasEvenement, erreur } = require('./mediasEvenement');
const { texteSimple } = require('../patrimoine/creditPhoto');

const MAX_PHOTOS = 30;

class PhotosEvenement extends MediasEvenement {
  constructor(models) {
    super(models, {
      type: 'image', max: MAX_PHOTOS, estDuSite: estImageDuSite,
      refus: 'Seul l\'organisateur de l\'événement peut gérer ses photos', introuvable: 'Photo introuvable'
    });
  }

  async ajouter(idEvenement, utilisateur, { url, legende, credit }) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    // Seulement une image mise en ligne par le site : pas de lien vers un autre domaine
    if (!estImageDuSite(url)) throw erreur('Choisissez une photo à envoyer depuis le formulaire');
    const nombre = await this._compter(evenement.id_evenement);
    if (nombre >= MAX_PHOTOS) throw erreur(`${MAX_PHOTOS} photos au plus par événement : retirez-en une d'abord`);
    const titre = texteSimple(legende, 200);
    const media = await this.models.Media.create({
      id_evenement: evenement.id_evenement,
      type_media: 'image',
      url,
      titre: titre ? { fr: titre } : {},
      credit: texteSimple(credit, 150) || null,
      visible_public: true,
      ordre: nombre,
      metadata: { uploadedBy: utilisateur.id_user }
    });
    return { id_media: media.id_media, url: media.url, titre: media.titre, credit: media.credit };
  }
}

module.exports = { PhotosEvenement, MAX_PHOTOS };
