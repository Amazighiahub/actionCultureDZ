/**
 * SubtypeRegistry - Registre centralisé des sous-types d'œuvres
 *
 * Source de vérité UNIQUE pour le mapping type_oeuvre ID → modèle Sequelize / sub-service.
 * Utilisé par le service ET le repository pour éviter toute désynchronisation.
 *
 * Mapping basé sur la table `type_oeuvre` en base de données :
 *   1 → Livre
 *   2 → Film
 *   3 → Album Musical
 *   4 → Article
 *   5 → Article Scientifique
 *   6 → Artisanat (doublon avec 7 dans les seeds — on garde les deux)
 *   7 → Artisanat
 *   8 → Art (OeuvreArt)
 */

class SubtypeRegistry {
  constructor() {
    /**
     * Chaque entrée contient :
     * - modelName  : nom du modèle Sequelize (exactement comme dans models.XXX)
     * - key        : clé d'association Sequelize (hasOne alias ou nom du modèle)
     * - detailsKey : clé attendue dans requestBody.details_specifiques
     */
    this._entries = new Map([
      [1, { modelName: 'Livre',                key: 'Livre',                detailsKey: 'livre' }],
      [2, { modelName: 'Film',                 key: 'Film',                 detailsKey: 'film' }],
      [3, { modelName: 'AlbumMusical',          key: 'AlbumMusical',          detailsKey: 'album_musical' }],
      [4, { modelName: 'Article',               key: 'Article',               detailsKey: 'article' }],
      [5, { modelName: 'ArticleScientifique',   key: 'ArticleScientifique',   detailsKey: 'article_scientifique' }],
      [6, { modelName: 'OeuvreArt',             key: 'OeuvreArt',             detailsKey: 'oeuvre_art' }],
      [7, { modelName: 'Artisanat',             key: 'Artisanat',             detailsKey: 'artisanat' }]
    ]);

    /** Sub-services indexés par typeId */
    this._services = new Map();
  }

  // ---------------------------------------------------------------------------
  // Mapping statique (modèle / clé)
  // ---------------------------------------------------------------------------

  /**
   * Retourne le nom du modèle Sequelize pour un type donné
   * @param {number} typeId
   * @returns {string|null}
   */
  getModelName(typeId) {
    return this._entries.get(typeId)?.modelName || null;
  }

  /**
   * Retourne la clé d'association Sequelize (pour attacher le sous-type au résultat)
   * @param {number} typeId
   * @returns {string|null}
   */
  getAssociationKey(typeId) {
    return this._entries.get(typeId)?.key || null;
  }

  /**
   * Retourne la clé dans details_specifiques du body
   * @param {number} typeId
   * @returns {string|null}
   */
  getDetailsKey(typeId) {
    return this._entries.get(typeId)?.detailsKey || null;
  }

  /**
   * Vérifie si un type ID est enregistré
   * @param {number} typeId
   * @returns {boolean}
   */
  has(typeId) {
    return this._entries.has(typeId);
  }

  // ---------------------------------------------------------------------------
  // Sub-services dynamiques
  // ---------------------------------------------------------------------------

  /**
   * Enregistre un sub-service pour un type donné
   * @param {number} typeId
   * @param {object} subService - instance du sub-service
   */
  registerService(typeId, subService) {
    this._services.set(typeId, subService);
  }

  /**
   * Récupère le sub-service pour un type donné
   * @param {number} typeId
   * @returns {object|null}
   */
  getService(typeId) {
    return this._services.get(typeId) || null;
  }
}

// Singleton — une seule instance partagée par tout le backend
module.exports = new SubtypeRegistry();
