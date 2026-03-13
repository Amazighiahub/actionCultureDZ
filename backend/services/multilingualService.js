/**
 * MultilingualService - Service pour les operations multilingues
 * Architecture: Controller -> Service -> Models
 */

class MultilingualService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Modeles valides pour les operations multilingues
   */
  static get VALID_MODELS() {
    return ['Oeuvre', 'Evenement', 'Programme', 'Lieu', 'Artisanat'];
  }

  /**
   * Champs multilingues autorises
   */
  static get VALID_FIELDS() {
    return ['nom', 'titre', 'description', 'histoire', 'adresse', 'biographie',
            'nom_evenement', 'lieu_specifique', 'materiel_requis', 'notes_organisateur'];
  }

  /**
   * Recuperer les traductions d'un champ
   */
  async getTranslations(modelName, id, field, language = 'fr') {
    if (!MultilingualService.VALID_MODELS.includes(modelName)) {
      return { error: 'invalidModel' };
    }
    if (!MultilingualService.VALID_FIELDS.includes(field)) {
      return { error: 'invalidField' };
    }

    const Model = this.models[modelName];
    const instance = await Model.findByPk(id);

    if (!instance) {
      return { error: 'notFound' };
    }

    const fieldValue = instance[field];
    let translation = '';

    if (fieldValue && typeof fieldValue === 'object') {
      translation = fieldValue[language] || fieldValue.fr || fieldValue.ar || fieldValue.en || '';
    } else if (typeof fieldValue === 'string') {
      translation = fieldValue;
    }

    return {
      data: {
        id,
        model: modelName,
        field,
        language,
        translation,
        allTranslations: fieldValue
      }
    };
  }

  /**
   * Mettre a jour les traductions d'un champ
   */
  async updateTranslations(modelName, id, field, translations) {
    if (!translations || typeof translations !== 'object') {
      return { error: 'badRequest' };
    }
    if (!MultilingualService.VALID_MODELS.includes(modelName)) {
      return { error: 'invalidModel' };
    }
    if (!MultilingualService.VALID_FIELDS.includes(field)) {
      return { error: 'invalidField' };
    }

    const Model = this.models[modelName];
    const instance = await Model.findByPk(id);

    if (!instance) {
      return { error: 'notFound' };
    }

    await instance.update({ [field]: translations });

    return {
      data: { id, model: modelName, field, translations }
    };
  }
}

module.exports = MultilingualService;
