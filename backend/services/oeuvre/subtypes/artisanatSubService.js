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
      prix: ds.prix != null ? parseFloat(ds.prix) : null,
      prix_max: ds.prix_max != null && ds.prix_max !== '' ? parseFloat(ds.prix_max) : null,
      delai_fabrication: ds.delai_fabrication != null && ds.delai_fabrication !== '' ? parseInt(ds.delai_fabrication, 10) : null,
      en_stock: ds.en_stock != null && ds.en_stock !== '' ? parseInt(ds.en_stock, 10) : null,
      sur_commande: !!ds.sur_commande
    };
  }

  _buildUpdateData(ds) {
    const data = {};
    if (ds.id_materiau !== undefined) data.id_materiau = ds.id_materiau;
    if (ds.id_technique !== undefined) data.id_technique = ds.id_technique;
    if (ds.dimensions !== undefined) data.dimensions = ds.dimensions;
    if (ds.poids !== undefined) data.poids = parseFloat(ds.poids);
    if (ds.prix !== undefined) data.prix = parseFloat(ds.prix);
    if (ds.prix_max !== undefined) data.prix_max = ds.prix_max === '' || ds.prix_max === null ? null : parseFloat(ds.prix_max);
    if (ds.delai_fabrication !== undefined) data.delai_fabrication = ds.delai_fabrication === '' || ds.delai_fabrication === null ? null : parseInt(ds.delai_fabrication, 10);
    if (ds.en_stock !== undefined) data.en_stock = ds.en_stock === '' || ds.en_stock === null ? null : parseInt(ds.en_stock, 10);
    if (ds.sur_commande !== undefined) data.sur_commande = !!ds.sur_commande;
    return data;
  }
}

module.exports = ArtisanatSubService;
