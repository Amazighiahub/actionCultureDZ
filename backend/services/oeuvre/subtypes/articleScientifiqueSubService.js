/**
 * ArticleScientifiqueSubService - Logique spécifique au sous-type Article Scientifique
 */

const BaseSubtypeService = require('./baseSubtypeService');
const ArticleScientifiqueDTO = require('../../../dto/oeuvre/subtypes/articleScientifiqueDTO');

class ArticleScientifiqueSubService extends BaseSubtypeService {
  constructor(models) {
    super('ArticleScientifique', models, ArticleScientifiqueDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      journal: ds.journal || null,
      doi: ds.doi || null,
      volume: ds.volume || null,
      numero: ds.numero || null,
      pages: ds.pages || null,
      issn: ds.issn || null,
      impact_factor: ds.impact_factor != null ? parseFloat(ds.impact_factor) : null,
      peer_reviewed: ds.peer_reviewed !== false,
      open_access: ds.open_access === true,
      resume: ds.resume || null,
      citation_apa: ds.citation_apa || null,
      url_hal: ds.url_hal || null,
      url_arxiv: ds.url_arxiv || null
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.journal !== undefined) data.journal = ds.journal;
    if (ds.doi !== undefined) data.doi = ds.doi;
    if (ds.volume !== undefined) data.volume = ds.volume;
    if (ds.numero !== undefined) data.numero = ds.numero;
    if (ds.pages !== undefined) data.pages = ds.pages;
    if (ds.issn !== undefined) data.issn = ds.issn;
    if (ds.impact_factor !== undefined) data.impact_factor = parseFloat(ds.impact_factor);
    if (ds.peer_reviewed !== undefined) data.peer_reviewed = ds.peer_reviewed;
    if (ds.open_access !== undefined) data.open_access = ds.open_access;
    if (ds.resume !== undefined) data.resume = ds.resume;
    if (ds.citation_apa !== undefined) data.citation_apa = ds.citation_apa;
    if (ds.url_hal !== undefined) data.url_hal = ds.url_hal;
    if (ds.url_arxiv !== undefined) data.url_arxiv = ds.url_arxiv;
    return data;
  }
}

module.exports = ArticleScientifiqueSubService;
