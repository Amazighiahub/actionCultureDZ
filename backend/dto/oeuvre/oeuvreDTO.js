/**
 * OeuvreDTO - Data Transfer Object pour les œuvres
 * Utilisé pour les réponses API (lecture)
 */
const BaseDTO = require('../baseDTO');

class OeuvreDTO extends BaseDTO {
  constructor(data = {}) {
    super(data);

    // Identifiant
    this.id = data.id || data.id_oeuvre;

    // Champs multilingues
    this.titre = BaseDTO.normalizeMultilang(data.titre);
    this.description = BaseDTO.normalizeMultilang(data.description);
    this.resume = BaseDTO.normalizeMultilang(data.resume);

    // Type et catégorie
    this.idTypeOeuvre = BaseDTO.toInt(data.id_type_oeuvre || data.idTypeOeuvre);
    this.typeOeuvre = data.TypeOeuvre ? this._mapTypeOeuvre(data.TypeOeuvre) : null;

    // Langue de l'œuvre
    this.idLangue = BaseDTO.toInt(data.id_langue || data.idLangue);
    this.langue = data.Langue ? this._mapLangue(data.Langue) : null;

    // Créateur
    this.idCreateur = BaseDTO.toInt(data.saisi_par || data.id_createur || data.idCreateur);
    this.createur = (data.Saiseur || data.Createur) ? this._mapCreateur(data.Saiseur || data.Createur) : null;

    // Détails
    this.anneeCreation = BaseDTO.toInt(data.annee_creation || data.anneeCreation);
    this.isbn = BaseDTO.cleanString(data.isbn);
    this.editeur = BaseDTO.cleanString(data.editeur);
    this.pages = BaseDTO.toInt(data.pages);
    this.duree = BaseDTO.toInt(data.duree); // en minutes
    this.prix = BaseDTO.toFloat(data.prix);
    this.devise = data.devise || 'DZD';

    // Média principal
    this.imageUrl = data.image_url || data.imageUrl;
    this.coverUrl = data.cover_url || data.coverUrl;

    // Statut
    this.statut = data.statut || 'brouillon';
    this.estMisEnAvant = BaseDTO.toBool(data.est_mis_en_avant ?? data.estMisEnAvant);

    // Statistiques
    this.nbVues = BaseDTO.toInt(data.nb_vues || data.nbVues);
    this.nbTelechargements = BaseDTO.toInt(data.nb_telechargements || data.nbTelechargements);
    this.nbFavoris = BaseDTO.toInt(data.nb_favoris || data.nbFavoris);
    this.noteMoyenne = BaseDTO.toFloat(data.note_moyenne || data.noteMoyenne);

    // Dates
    this.dateCreation = BaseDTO.toDate(data.date_creation || data.dateCreation || data.createdAt);
    this.dateModification = BaseDTO.toDate(data.date_modification || data.dateModification || data.updatedAt);
    this.dateValidation = BaseDTO.toDate(data.date_validation || data.dateValidation);
    this.datePublication = BaseDTO.toDate(data.date_publication || data.datePublication);

    // Relations chargées
    this.categories = data.Categories ? data.Categories.map(c => this._mapCategorie(c)) : [];
    this.medias = (data.Media || data.Medias) ? (data.Media || data.Medias).map(m => this._mapMedia(m)) : [];
    this.tags = data.Tags ? data.Tags.map(t => this._mapTag(t)) : [];
    this.intervenants = data.Intervenants ? data.Intervenants.map(i => this._mapIntervenant(i)) : [];
  }

  /**
   * Crée un OeuvreDTO depuis une entité Sequelize
   */
  static fromEntity(entity, options = {}) {
    if (!entity) return null;

    const data = entity.get ? entity.get({ plain: true }) : entity;
    const dto = new OeuvreDTO(data);
    dto._raw = data;
    return dto;
  }

  /**
   * Version simplifiée pour les listes
   */
  static toListItem(entity, lang = 'fr') {
    if (!entity) return null;
    const data = entity.get ? entity.get({ plain: true }) : entity;

    return {
      id: data.id_oeuvre,
      titre: BaseDTO.extractMultilang(data.titre, lang),
      description: BaseDTO.extractMultilang(data.description, lang)?.substring(0, 200),
      imageUrl: data.image_url,
      typeOeuvre: data.TypeOeuvre?.nom || null,
      createur: (data.Saiseur || data.Createur) ? {
        id: (data.Saiseur || data.Createur).id_user,
        nom: BaseDTO.extractMultilang((data.Saiseur || data.Createur).nom, lang),
        prenom: BaseDTO.extractMultilang((data.Saiseur || data.Createur).prenom, lang)
      } : null,
      statut: data.statut,
      nbVues: data.nb_vues || 0,
      dateCreation: data.date_creation
    };
  }

  /**
   * Version pour les cartes/aperçus
   */
  toJSON(lang = 'fr') {
    const result = BaseDTO.translateRaw(this._raw, lang);
    return OeuvreDTO._addComputedFields(result);
  }
  toCardJSON(lang = 'fr') {
    const result = BaseDTO.translateRaw(this._raw, lang);
    return OeuvreDTO._addComputedFields(result);
  }

  /**
   * Version détaillée complète
   */
  toDetailJSON(lang = 'fr') {
    const result = BaseDTO.translateRaw(this._raw, lang);
    return OeuvreDTO._addComputedFields(result);
  }

  /**
   * Version admin avec toutes les infos
   */
  toAdminJSON(lang = 'fr') {
    const result = BaseDTO.translateRaw(this._raw, lang);
    return OeuvreDTO._addComputedFields(result);
  }

  /**
   * Ajoute les champs calculés attendus par le frontend
   */
  static _addComputedFields(data) {
    if (!data) return data;
    // image_url / image_principale depuis Media[]
    if (Array.isArray(data.Media) && data.Media.length > 0) {
      const principal = data.Media.find(m => m.is_Principale) || data.Media[0];
      if (!data.image_url) data.image_url = principal.url;
      if (!data.image_principale) data.image_principale = principal.url;
    }
    // Intervenants flat array depuis OeuvreIntervenants join table
    if (Array.isArray(data.OeuvreIntervenants) && !data.Intervenants) {
      data.Intervenants = data.OeuvreIntervenants
        .filter(oi => oi.Intervenant)
        .map(oi => ({ ...oi.Intervenant, OeuvreIntervenant: oi, TypeUser: oi.TypeUser }));
    }
    return data;
  }

  // ============================================================================
  // MAPPERS PRIVÉS
  // ============================================================================

  _mapTypeOeuvre(typeOeuvre) {
    if (!typeOeuvre) return null;
    return {
      id: typeOeuvre.id_type_oeuvre,
      nom: typeOeuvre.nom,
      code: typeOeuvre.code
    };
  }

  _mapLangue(langue) {
    if (!langue) return null;
    return {
      id: langue.id_langue,
      nom: langue.nom,
      code: langue.code
    };
  }

  _mapCreateur(createur) {
    if (!createur) return null;
    return {
      id: createur.id_user,
      nom: BaseDTO.extractMultilang(createur.nom, 'fr'),
      prenom: BaseDTO.extractMultilang(createur.prenom, 'fr'),
      photoUrl: createur.photo_url
    };
  }

  _mapCategorie(categorie) {
    if (!categorie) return null;
    return {
      id: categorie.id_categorie,
      nom: BaseDTO.normalizeMultilang(categorie.nom),
      code: categorie.code
    };
  }

  _mapMedia(media) {
    if (!media) return null;
    return {
      id: media.id_media,
      url: media.url,
      type: media.type,
      titre: media.titre,
      estPrincipal: media.est_principal
    };
  }

  _mapTag(tag) {
    if (!tag) return null;
    return {
      id: tag.id_tag,
      nom: BaseDTO.normalizeMultilang(tag.nom)
    };
  }

  _mapIntervenant(intervenant) {
    if (!intervenant) return null;
    return {
      id: intervenant.id_user,
      nom: BaseDTO.extractMultilang(intervenant.nom, 'fr'),
      prenom: BaseDTO.extractMultilang(intervenant.prenom, 'fr'),
      role: intervenant.OeuvreIntervenant?.role,
      contribution: intervenant.OeuvreIntervenant?.contribution
    };
  }
}

module.exports = OeuvreDTO;
