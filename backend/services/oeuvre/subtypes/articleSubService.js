/**
 * ArticleSubService - Logique spécifique au sous-type Article
 */

const BaseSubtypeService = require('./baseSubtypeService');
const ArticleDTO = require('../../../dto/oeuvre/subtypes/articleDTO');

class ArticleSubService extends BaseSubtypeService {
  constructor(models) {
    super('Article', models, ArticleDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      auteur: ds.auteur || null,
      source: ds.source || null,
      resume: ds.resume || null,
      url_source: ds.url_source || null,
      sous_titre: ds.sous_titre || null,
      statut: 'brouillon'
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.auteur !== undefined) data.auteur = ds.auteur;
    if (ds.source !== undefined) data.source = ds.source;
    if (ds.resume !== undefined) data.resume = ds.resume;
    if (ds.url_source !== undefined) data.url_source = ds.url_source;
    if (ds.sous_titre !== undefined) data.sous_titre = ds.sous_titre;
    if (ds.statut !== undefined) data.statut = ds.statut;
    return data;
  }
}

module.exports = ArticleSubService;
