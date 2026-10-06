/**
 * BaseSubtypeService - Classe de base pour tous les sub-services de sous-types
 *
 * Chaque sous-type (Livre, Film, etc.) hérite de cette classe et implémente
 * sa propre logique de création/mise à jour avec les champs spécifiques.
 */

const logger = require('../../../utils/logger');

class BaseSubtypeService {
  /**
   * @param {string} modelName  - Nom du modèle Sequelize (ex: 'Livre')
   * @param {object} models     - Référence aux modèles Sequelize
   * @param {Function} DTOClass - Classe DTO pour validation/transformation (optionnel)
   */
  constructor(modelName, models, DTOClass = null) {
    this.modelName = modelName;
    this.models = models;
    this.DTOClass = DTOClass;
    this.logger = logger;
  }

  /**
   * Retourne le modèle Sequelize correspondant
   * @returns {object|null}
   */
  get model() {
    return this.models?.[this.modelName] || null;
  }

  /**
   * Crée l'enregistrement sous-type pour une œuvre
   * @param {number} oeuvreId           - ID de l'œuvre parente
   * @param {object} detailsSpecifiques - Données spécifiques au sous-type
   * @param {object} transaction        - Transaction Sequelize
   * @returns {Promise<object|null>}    - Enregistrement créé
   */
  async createForOeuvre(oeuvreId, detailsSpecifiques, transaction) {
    if (!this.model) {
      this.logger.warn(`Modèle ${this.modelName} non disponible, création sous-type ignorée`);
      return null;
    }

    const ds = detailsSpecifiques || {};

    // Valider via le DTO si disponible
    this._validateDTO(ds);

    const data = this._buildCreateData(oeuvreId, ds);
    let record;
    try {
      record = await this.model.create(data, { transaction });
    } catch (err) {
      throw this._wrapUniqueConstraintError(err);
    }

    this.logger.info(`${this.modelName} créé pour œuvre ${oeuvreId}`);
    return record;
  }

  /**
   * Met à jour l'enregistrement sous-type d'une œuvre
   * @param {number} oeuvreId           - ID de l'œuvre parente
   * @param {object} detailsSpecifiques - Données à mettre à jour
   * @param {object} transaction        - Transaction Sequelize
   * @returns {Promise<object|null>}    - Enregistrement mis à jour
   */
  async updateForOeuvre(oeuvreId, detailsSpecifiques, transaction) {
    if (!this.model || !detailsSpecifiques) return null;

    // Valider via le DTO si disponible
    this._validateDTO(detailsSpecifiques);

    const existing = await this.model.findOne({ where: { id_oeuvre: oeuvreId } });
    if (!existing) {
      // Si le sous-type n'existe pas encore, on le crée
      return this.createForOeuvre(oeuvreId, detailsSpecifiques, transaction);
    }

    const data = this._buildUpdateData(detailsSpecifiques);
    if (Object.keys(data).length === 0) return existing;

    try {
      await existing.update(data, { transaction });
    } catch (err) {
      throw this._wrapUniqueConstraintError(err);
    }
    this.logger.info(`${this.modelName} mis à jour pour œuvre ${oeuvreId}`);
    return existing;
  }

  /**
   * Valide les données via le DTO associé.
   * Lance une erreur structurée si la validation échoue.
   * @param {object} ds - Données brutes
   * @private
   */
  _validateDTO(ds) {
    if (!this.DTOClass) return;
    const dto = this.DTOClass.fromRequest(ds);
    const validation = dto.validate();
    if (!validation.valid) {
      const err = new Error(`Validation ${this.modelName} échouée`);
      err.code = 'VALIDATION_ERROR';
      err.errors = validation.errors;
      err.statusCode = 400;
      throw err;
    }
  }

  /**
   * Transforme une erreur de contrainte unique Sequelize en erreur explicite
   * (champ concerné + statut 409) au lieu de laisser remonter une
   * SequelizeUniqueConstraintError brute (500 générique côté client).
   * Convention alignée sur errorMiddleware.js (statusCode 409, code UNIQUE_CONSTRAINT).
   * @param {Error} err
   * @returns {Error}
   * @private
   */
  _wrapUniqueConstraintError(err) {
    if (err.name !== 'SequelizeUniqueConstraintError') return err;

    const isProduction = process.env.NODE_ENV === 'production';
    const detail = err.errors?.[0];
    const field = detail?.path || 'valeur';
    const value = !isProduction ? detail?.value : undefined;

    const wrapped = new Error(
      value != null
        ? `La valeur "${value}" du champ "${field}" est déjà utilisée par une autre œuvre`
        : `Un(e) autre œuvre utilise déjà cette valeur pour le champ "${field}"`
    );
    wrapped.code = 'UNIQUE_CONSTRAINT';
    wrapped.statusCode = 409;
    wrapped.errors = [{ field, message: wrapped.message }];
    return wrapped;
  }

  /**
   * Supprime l'enregistrement sous-type d'une œuvre
   * (En général géré par CASCADE, mais utile pour les cas spéciaux)
   * @param {number} oeuvreId
   * @param {object} transaction
   */
  async deleteForOeuvre(oeuvreId, transaction) {
    if (!this.model) return;
    await this.model.destroy({ where: { id_oeuvre: oeuvreId }, transaction });
  }

  /**
   * Charge le sous-type d'une œuvre
   * @param {number} oeuvreId
   * @returns {Promise<object|null>}
   */
  async findByOeuvre(oeuvreId) {
    if (!this.model) return null;
    try {
      return await this.model.findOne({ where: { id_oeuvre: oeuvreId } });
    } catch (_) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Méthodes à surcharger par chaque sous-type
  // ---------------------------------------------------------------------------

  /**
   * Construit les données de création à partir des détails spécifiques.
   * DOIT être surchargé par chaque sous-type.
   * @param {number} oeuvreId
   * @param {object} ds - details_specifiques
   * @returns {object}
   */
  _buildCreateData(oeuvreId, ds) {
    return { id_oeuvre: oeuvreId };
  }

  /**
   * Construit les données de mise à jour.
   * DOIT être surchargé par chaque sous-type.
   * @param {object} ds - details_specifiques
   * @returns {object}
   */
  _buildUpdateData(ds) {
    return {};
  }
}

module.exports = BaseSubtypeService;
