/**
 * OeuvreArtSubService - Logique spécifique au sous-type Œuvre d'Art
 */

const BaseSubtypeService = require('./baseSubtypeService');
const OeuvreArtDTO = require('../../../dto/oeuvre/subtypes/oeuvreArtDTO');

class OeuvreArtSubService extends BaseSubtypeService {
  constructor(models) {
    super('OeuvreArt', models, OeuvreArtDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      technique: ds.technique || null,
      dimensions: ds.dimensions || null,
      support: ds.support || null
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.technique !== undefined) data.technique = ds.technique;
    if (ds.dimensions !== undefined) data.dimensions = ds.dimensions;
    if (ds.support !== undefined) data.support = ds.support;
    return data;
  }
}

module.exports = OeuvreArtSubService;
