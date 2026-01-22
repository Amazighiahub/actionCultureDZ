/**
 * OeuvreDTO - Data Transfer Object pour les œuvres
 * Utilisé pour les réponses API (lecture)
 */
const BaseDTO = require('../BaseDTO');

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
    this.idCreateur = BaseDTO.toInt(data.id_createur || data.idCreateur);
    this.createur = data.Createur ? this._mapCreateur(data.Createur) : null;

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
    this.medias = data.Medias ? data.Medias.map(m => this._mapMedia(m)) : [];
    this.tags = data.Tags ? data.Tags.map(t => this._mapTag(t)) : [];
    this.intervenants = data.Intervenants ? data.Intervenants.map(i => this._mapIntervenant(i)) : [];
  }

  /**
   * Crée un OeuvreDTO depuis une entité Sequelize
   */
  static fromEntity(entity, options = {}) {
    if (!entity) return null;

    const data = entity.get ? entity.get({ plain: true }) : entity;
    return new OeuvreDTO(data);
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
      createur: data.Createur ? {
        id: data.Createur.id_user,
        nom: BaseDTO.extractMultilang(data.Createur.nom, lang),
        prenom: BaseDTO.extractMultilang(data.Createur.prenom, lang)
      } : null,
      statut: data.statut,
      nbVues: data.nb_vues || 0,
      dateCreation: data.date_creation
    };
  }

  /**
   * Version pour les cartes/aperçus
   */
  toCardJSON(lang = 'fr') {
    return {
      id: this.id,
      titre: BaseDTO.extractMultilang(this.titre, lang),
      description: BaseDTO.extractMultilang(this.description, lang)?.substring(0, 150),
      imageUrl: this.imageUrl || this.coverUrl,
      typeOeuvre: this.typeOeuvre?.nom,
      createur: this.createur ? {
        id: this.createur.id,
        nomComplet: `${this.createur.prenom} ${this.createur.nom}`
      } : null,
      anneeCreation: this.anneeCreation,
      nbVues: this.nbVues,
      noteMoyenne: this.noteMoyenne
    };
  }

  /**
   * Version détaillée complète
   */
  toDetailJSON(lang = 'fr') {
    return {
      ...this.toJSON(lang),
      categories: this.categories.map(c => ({
        id: c.id,
        nom: BaseDTO.extractMultilang(c.nom, lang)
      })),
      medias: this.medias,
      tags: this.tags.map(t => ({
        id: t.id,
        nom: BaseDTO.extractMultilang(t.nom, lang)
      })),
      intervenants: this.intervenants.map(i => ({
        id: i.id,
        nom: i.nom,
        prenom: i.prenom,
        role: i.role,
        contribution: i.contribution
      }))
    };
  }

  /**
   * Version admin avec toutes les infos
   */
  toAdminJSON(lang = 'fr') {
    return {
      ...this.toDetailJSON(lang),
      dateValidation: this.dateValidation,
      datePublication: this.datePublication,
      nbTelechargements: this.nbTelechargements,
      nbFavoris: this.nbFavoris,
      // Garder les données multilingues complètes
      titreMultilang: this.titre,
      descriptionMultilang: this.description
    };
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
