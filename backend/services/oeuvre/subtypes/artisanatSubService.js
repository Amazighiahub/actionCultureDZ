/**
 * ArtisanatSubService - Logique spécifique au sous-type Artisanat
 */

const BaseSubtypeService = require('./baseSubtypeService');
const ArtisanatDTO = require('../../../dto/oeuvre/subtypes/artisanatDTO');

class ArtisanatSubService extends BaseSubtypeService {
  constructor(models) {
    super('Artisanat', models, ArtisanatDTO);
  }

  _buildCreateData(oeuvreId, ds) {
    return {
      id_oeuvre: oeuvreId,
      id_materiau: ds.id_materiau || null,
      id_technique: ds.id_technique || null,
      dimensions: ds.dimensions || null,
      poids: ds.poids != null ? parseFloat(ds.poids) : null,
      prix: ds.prix != null ? parseFloat(ds.prix) : null
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.id_materiau !== undefined) data.id_materiau = ds.id_materiau;
    if (ds.id_technique !== undefined) data.id_technique = ds.id_technique;
    if (ds.dimensions !== undefined) data.dimensions = ds.dimensions;
    if (ds.poids !== undefined) data.poids = parseFloat(ds.poids);
    if (ds.prix !== undefined) data.prix = parseFloat(ds.prix);
    return data;
  }
}

module.exports = ArtisanatSubService;
