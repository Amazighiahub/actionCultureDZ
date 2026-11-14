/**
 * Documents PDF d'un événement (programme complet, présentation…), joints par l'organisateur et
 * téléchargeables depuis la page de l'événement. Le fichier est mis en ligne par /upload/document
 * (Cloudinary « raw ») ; comme pour les messages aux participants, le site le sert lui-même sous
 * un nom en .pdf (Cloudinary le donne sans extension ni type).
 */
const { estPdfDuSite } = require('./messagesParticipants');

const MAX_DOCUMENTS = 5;
const { MediasEvenement, erreur } = require('./mediasEvenement');

/** Adresse publique du PDF, servie par le site */
const lienDocument = (idEvenement, idMedia) => `/api/evenements/${idEvenement}/documents/${idMedia}/document.pdf`;

class DocumentsEvenement extends MediasEvenement {
  constructor(models) {
    super(models, {
      type: 'document', max: MAX_DOCUMENTS, estDuSite: estPdfDuSite,
      refus: 'Seul l\'organisateur de l\'événement peut gérer ses documents', introuvable: 'Document introuvable'
    });
  }

  /** Documents d'un événement (ordre d'ajout), avec leur adresse de téléchargement */
  async lister(idEvenement) {
    const lignes = await this.models.Media.findAll({
      where: { id_evenement: idEvenement, type_media: 'document' },
      attributes: ['id_media', 'titre', 'url', 'ordre', 'date_creation'],
      order: [['ordre', 'ASC'], ['id_media', 'ASC']],
      raw: true
    });
    return lignes.map(({ url, ...d }) => ({ ...d, lien: lienDocument(idEvenement, d.id_media), pdf: estPdfDuSite(url) }));
  }

  async ajouter(idEvenement, utilisateur, { url, titre }) {
    const evenement = await this._evenement(idEvenement, utilisateur);
    // Seulement un PDF mis en ligne par le site : pas de lien vers un autre domaine
    if (!estPdfDuSite(url)) throw erreur('Choisissez un fichier PDF à envoyer depuis le formulaire');
    const nom = String(titre || '').trim().slice(0, 150);
    if (!nom) throw erreur('Donnez un titre au document (ex. « Programme complet »)');
    const nombre = await this._compter(evenement.id_evenement);
    if (nombre >= MAX_DOCUMENTS) throw erreur(`${MAX_DOCUMENTS} documents au plus par événement : retirez-en un d'abord`);
    const media = await this.models.Media.create({
      id_evenement: evenement.id_evenement,
      type_media: 'document',
      url,
      titre: { fr: nom },
      visible_public: true,
      ordre: nombre,
      metadata: { uploadedBy: utilisateur.id_user }
    });
    return { id_media: media.id_media, titre: media.titre, lien: lienDocument(evenement.id_evenement, media.id_media) };
  }

  /** Adresse Cloudinary du PDF à servir ; 404 si ce n'est pas un document PDF de cet événement */
  async fichier(idEvenement, idMedia) {
    const media = await this.models.Media.findOne({
      where: { id_media: idMedia, id_evenement: idEvenement, type_media: 'document' },
      attributes: ['url'],
      raw: true
    });
    if (!media || !estPdfDuSite(media.url)) throw erreur('Document introuvable', 404);
    return media.url;
  }
}

module.exports = { DocumentsEvenement, lienDocument, MAX_DOCUMENTS };
