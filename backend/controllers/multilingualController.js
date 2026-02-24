// controllers/MultilingualController.js
// Contrôleur pour gérer les opérations multilingues

class MultilingualController {
  constructor(models) {
    this.models = models;
  }

  /**
   * Obtenir les traductions d'un champ multilingue
   */
  async getTranslations(req, res) {
    try {
      const { model, id, field } = req.params;
      const { language = 'fr' } = req.query;

      // Valider le modèle
      const validModels = ['Oeuvre', 'Evenement', 'Programme', 'Lieu', 'Artisanat'];
      if (!validModels.includes(model)) {
        return res.status(400).json({
          success: false,
          error: 'Modèle non valide',
          validModels
        });
      }

      // Récupérer l'instance
      const Model = this.models[model];
      const instance = await Model.findByPk(id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: `${model} non trouvé`
        });
      }

      // Obtenir la traduction
      const fieldValue = instance[field];
      let translation = '';

      if (fieldValue && typeof fieldValue === 'object') {
        translation = fieldValue[language] || fieldValue.fr || fieldValue.ar || fieldValue.en || '';
      } else if (typeof fieldValue === 'string') {
        translation = fieldValue;
      }

      res.json({
        success: true,
        data: {
          id,
          model,
          field,
          language,
          translation,
          allTranslations: fieldValue
        }
      });
    } catch (error) {
      console.error('Erreur getTranslations:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Mettre à jour les traductions d'un champ multilingue
   */
  async updateTranslations(req, res) {
    try {
      const { model, id, field } = req.params;
      const { translations } = req.body;

      // Valider les traductions
      if (!translations || typeof translations !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Traductions invalides'
        });
      }

      // Valider le modèle
      const validModels = ['Oeuvre', 'Evenement', 'Programme', 'Lieu', 'Artisanat'];
      if (!validModels.includes(model)) {
        return res.status(400).json({
          success: false,
          error: 'Modèle non valide'
        });
      }

      // Récupérer l'instance
      const Model = this.models[model];
      const instance = await Model.findByPk(id);

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: `${model} non trouvé`
        });
      }

      // Mettre à jour le champ
      await instance.update({ [field]: translations });

      res.json({
        success: true,
        data: {
          id,
          model,
          field,
          translations
        }
      });
    } catch (error) {
      console.error('Erreur updateTranslations:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Obtenir toutes les langues supportées
   */
  async getSupportedLanguages(req, res) {
    try {
      const { getLanguagesInfo } = require('../middlewares/language');
      const languages = getLanguagesInfo();

      res.json({
        success: true,
        data: languages
      });
    } catch (error) {
      console.error('Erreur getSupportedLanguages:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur'
      });
    }
  }

  /**
   * Valider et normaliser les données multilingues
   */
  validateMultilingualData(data, requiredFields = []) {
    const errors = [];
    const validatedData = {};

    for (const field of requiredFields) {
      const value = data[field];

      if (!value) {
        errors.push(`Le champ ${field} est requis`);
        continue;
      }

      if (typeof value === 'string') {
        // Convertir string en objet multilingue
        validatedData[field] = { fr: value };
      } else if (typeof value === 'object') {
        // Valider que c'est un objet multilingue valide
        const hasRequiredLang = value.fr || value.ar || value.en;
        if (!hasRequiredLang) {
          errors.push(`Le champ ${field} doit contenir au moins une traduction (fr, ar, ou en)`);
        } else {
          validatedData[field] = value;
        }
      } else {
        errors.push(`Le champ ${field} doit être une chaîne ou un objet multilingue`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData
    };
  }

  /**
   * Extraire la traduction dans la langue demandée
   */
  extractTranslation(multilingualField, language = 'fr') {
    if (!multilingualField) return '';
    
    if (typeof multilingualField === 'string') {
      return multilingualField;
    }

    if (typeof multilingualField === 'object') {
      return multilingualField[language] || 
             multilingualField.fr || 
             multilingualField.ar || 
             multilingualField.en || 
             multilingualField['tz-ltn'] || 
             multilingualField['tz-tfng'] || 
             '';
    }

    return '';
  }

  /**
   * Créer un objet multilingue à partir d'une chaîne
   */
  createMultilingualField(text, targetLanguage = 'fr') {
    const multilingual = {
      fr: '',
      ar: '',
      en: '',
      'tz-ltn': '',
      'tz-tfng': ''
    };

    multilingual[targetLanguage] = text;
    return multilingual;
  }
}

module.exports = MultilingualController;
