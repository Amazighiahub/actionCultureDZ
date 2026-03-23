/**
 * Oeuvre Services - Point d'entrée
 */

const OeuvreService = require('./oeuvreService');
const { subtypeRegistry, initSubtypeServices } = require('./subtypes');

module.exports = {
  OeuvreService,
  subtypeRegistry,
  initSubtypeServices
};
