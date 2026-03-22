// controllers/MultilingualController.js

const BaseController = require('./baseController');
const container = require('../services/serviceContainer');

class MultilingualController extends BaseController {
  get multilingualService() {
    return container.multilingualService;
  }

  /**
   * Obtenir les traductions d'un champ multilingue
   */
  async getTranslations(req, res) {
    try {
      const { model, id, field } = req.params;
      const { language = 'fr' } = req.query;

      const result = await this.multilingualService.getTranslations(model, id, field, language);

      if (result.error === 'invalidModel' || result.error === 'invalidField') {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      this._sendSuccess(res, result.data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Mettre a jour les traductions d'un champ multilingue
   */
  async updateTranslations(req, res) {
    try {
      const { model, id, field } = req.params;
      const { translations } = req.body;

      const result = await this.multilingualService.updateTranslations(model, id, field, translations);

      if (result.error === 'badRequest' || result.error === 'invalidModel' || result.error === 'invalidField') {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }
      if (result.error === 'notFound') {
        return res.status(404).json({ success: false, error: req.t('common.notFound') });
      }

      this._sendSuccess(res, result.data);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Obtenir toutes les langues supportees
   */
  async getSupportedLanguages(req, res) {
    try {
      const { getLanguagesInfo } = require('../middlewares/language');
      const languages = getLanguagesInfo();

      this._sendSuccess(res, languages);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  /**
   * Valider et normaliser les donnees multilingues
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
        validatedData[field] = { fr: value };
      } else if (typeof value === 'object') {
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

    return { isValid: errors.length === 0, errors, validatedData };
  }

  /**
   * Extraire la traduction dans la langue demandee
   */
  extractTranslation(multilingualField, language = 'fr') {
    if (!multilingualField) return '';
    if (typeof multilingualField === 'string') return multilingualField;
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
   * Creer un objet multilingue a partir d'une chaine
   */
  createMultilingualField(text, targetLanguage = 'fr') {
    const multilingual = { fr: '', ar: '', en: '', 'tz-ltn': '', 'tz-tfng': '' };
    multilingual[targetLanguage] = text;
    return multilingual;
  }
}

module.exports = new MultilingualController();
