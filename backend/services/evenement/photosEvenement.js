/**
 * Photos de l'événement (audit V11 OUT-23) : l'organisateur montre comment ça s'est passé. Elles
 * s'affichent dans la galerie de la page de l'événement (GET /evenements/:id/medias). L'image est
 * d'abord mise en ligne par /upload/image (Cloudinary), puis rattachée ici avec sa légende.
 */
const { estImageDuSite } = require('./messagesParticipants');
const { MediasEvenement, erreur } = require('./mediasEvenement');
const { texteSimple } = require('../patrimoine/creditPhoto');

// 60 (avant : 30) : une exposition sur plusieurs jours montre chaque journée
const MAX_PHOTOS = 60;

class PhotosEvenement extends MediasEvenement {
  constructor(models) {
    super(models, {
      type: 'image', max: MAX_PHOTOS, estDuSite: estImageDuSite,
      refus: 'Seul l\'organisateur de l\'événement peut gérer ses photos', introuvable: 'Photo introuvable'
    });
  }

  /** Le jour du programme choisi, s'il appartient bien à cet événement ; sinon null (tout l'événement) */
  async _jour(idEvenement, idProgramme) {
    if (idProgramme === undefined || idProgramme === null || idProgramme === '') return null;
    const id = Number(idProgramme);
    if (!Number.isInteger(id) || id <= 0) throw erreur('Jour du programme invalide');
    const jour = await this.models.Programme.findOne({ where: { id_programme: id, id_evenement: idEvenement }, attributes: ['id_programme'] });
    if (!jour) throw erreur('Ce jour ne fait pas partie du programme de l’événement');
    return id;
  }

  async ajouter(idEvenement, utilisateur, { url, legende, credit, id_programme: idProgramme }) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    // Seulement une image mise en ligne par le site : pas de lien vers un autre domaine
    if (!estImageDuSite(url)) throw erreur('Choisissez une photo à envoyer depuis le formulaire');
    const jour = await this._jour(evenement.id_evenement, idProgramme);
    const nombre = await this._compter(evenement.id_evenement);
    if (nombre >= MAX_PHOTOS) throw erreur(`${MAX_PHOTOS} photos au plus par événement : retirez-en une d'abord`);
    const titre = texteSimple(legende, 200);
    const media = await this.models.Media.create({
      id_evenement: evenement.id_evenement,
      id_programme: jour,
      type_media: 'image',
      url,
      titre: titre ? { fr: titre } : {},
      credit: texteSimple(credit, 150) || null,
      visible_public: true,
      ordre: nombre,
      metadata: { uploadedBy: utilisateur.id_user }
    });
    return { id_media: media.id_media, url: media.url, titre: media.titre, credit: media.credit, id_programme: jour };
  }

  /** Range une photo déjà publiée dans un jour du programme (ou la remet sur tout l'événement : null) */
  async changerJour(idEvenement, idMedia, utilisateur, idProgramme) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    const jour = await this._jour(evenement.id_evenement, idProgramme);
    const [n] = await this.models.Media.update({ id_programme: jour },
      { where: { id_media: idMedia, id_evenement: evenement.id_evenement, type_media: 'image' } });
    if (!n) {
      // MySQL compte 0 ligne si la valeur ne change pas : la photo existe-t-elle ?
      const existe = await this.models.Media.count({ where: { id_media: idMedia, id_evenement: evenement.id_evenement, type_media: 'image' } });
      if (!existe) throw erreur('Photo introuvable', 404);
    }
    return { id_media: idMedia, id_programme: jour };
  }
}

module.exports = { PhotosEvenement, MAX_PHOTOS };
