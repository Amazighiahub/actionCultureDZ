/**
 * Fichiers joints à un événement par son organisateur (ou l'administration) : documents PDF et photos.
 * Socle commun : droits, nombre maximum, retrait et effacement du fichier sur Cloudinary.
 * Chaque genre (documentsEvenement.js, photosEvenement.js) précise son type, sa limite et la
 * vérification de l'adresse (fichier mis en ligne par le site seulement).
 */
const { memeUtilisateur } = require('../../utils/droits');

const erreur = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

class MediasEvenement {
  /**
   * @param {object} models
   * @param {{ type: string, max: number, estDuSite: (url: string) => boolean, refus: string, introuvable: string }} genre
   */
  constructor(models, genre) {
    this.models = models;
    this.genre = genre;
  }

  /** L'événement, si le compte en est l'organisateur ou fait partie de l'administration */
  async _evenement(idEvenement, utilisateur) {
    const evenement = await this.models.Evenement.findByPk(idEvenement, { attributes: ['id_evenement', 'id_user', 'date_fin', 'date_debut'] });
    if (!evenement) throw erreur('Événement introuvable', 404);
    if (!utilisateur?.isAdmin && !memeUtilisateur(evenement.id_user, utilisateur?.id_user)) {
      throw erreur(this.genre.refus, 403);
    }
    return evenement;
  }

  _compter(idEvenement) {
    return this.models.Media.count({ where: { id_evenement: idEvenement, type_media: this.genre.type } });
  }

  async retirer(idEvenement, idMedia, utilisateur) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    const where = { id_media: idMedia, id_evenement: evenement.id_evenement, type_media: this.genre.type };
    const media = await this.models.Media.findOne({ where, attributes: ['url'], raw: true });
    const n = await this.models.Media.destroy({ where });
    if (!n) throw erreur(this.genre.introuvable, 404);
    await this._effacerFichier(media?.url);
    return true;
  }

  /** Le fichier retiré ne reste pas sur Cloudinary, sauf si un autre média s'en sert. Un échec n'empêche pas le retrait. */
  async _effacerFichier(url) {
    if (!this.genre.estDuSite(url)) return;
    try {
      if (await this.models.Media.count({ where: { url } })) return;
      await require('../cloudinaryService').supprimerParUrl(url);
    } catch (e) {
      require('../../utils/logger').warn(`Fichier non effacé de Cloudinary : ${e.message}`);
    }
  }
}

module.exports = { MediasEvenement, erreur };
