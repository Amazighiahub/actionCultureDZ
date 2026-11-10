/**
 * Deux enregistrements simultanés sur les mêmes données (interblocage MySQL) : MySQL annule toute
 * l'opération, rien n'est enregistré à moitié (la requête n'est plus relancée seule, config/database.js).
 * Réponse claire au lieu d'une erreur serveur ; la personne peut réessayer (audit V11 BDD-1).
 * Une seule source pour middlewares/errorMiddleware.js et controllers/baseController.js (_handleError).
 */
const CODE_CONFLIT = 'CONFLIT_SIMULTANE';
const MESSAGE_CONFLIT = 'Une autre opération modifiait les mêmes données au même moment : rien n’a été enregistré. Réessayez.';

const estInterblocage = (error) => error?.name === 'SequelizeDatabaseError'
  && (error.parent?.code || error.original?.code) === 'ER_LOCK_DEADLOCK';

/** Répond 409 si l'erreur est un interblocage ; renvoie true si la réponse est partie */
function repondreSiConflit(error, req, res, logger) {
  if (!estInterblocage(error)) return false;
  logger?.warn?.('Interblocage MySQL, opération annulée', { route: `${req?.method} ${req?.originalUrl}` });
  res.status(409).json({ success: false, error: MESSAGE_CONFLIT, code: CODE_CONFLIT });
  return true;
}

module.exports = { CODE_CONFLIT, MESSAGE_CONFLIT, estInterblocage, repondreSiConflit };
