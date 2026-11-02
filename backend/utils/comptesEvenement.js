/**
 * Comptes d'inscriptions d'un événement, calculés par la base dans la même requête
 * (sous-requêtes : pas de requête supplémentaire par événement, cf. DBA-01 dans models/events/evenement.js).
 *
 * Les comptes sont en PERSONNES : une inscription « 4 personnes » prend 4 places (avant : 1 ligne = 1 place,
 * la capacité pouvait être dépassée). nombre_personnes n'est enregistré qu'au-delà de 1.
 * - nombre_inscrits     : places prises (inscrit, confirmé, présent, absent ; ni annulé ni invitation)
 * - nombre_participants : personnes confirmées ou présentes
 */
const { literal, Op } = require('sequelize');

/** Statuts qui occupent une place (capacité de l'événement) */
const STATUTS_PLACE_PRISE = ['inscrit', 'confirme', 'present', 'absent'];

/** Nombre de personnes d'une inscription (table `alias`), 1 par défaut */
const personnesSql = (alias = 'eu') =>
  `GREATEST(1, COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(${alias}.reponses_inscription, '$.nombre_personnes')) AS UNSIGNED), 1))`;
const PERSONNES_SQL = personnesSql();

/**
 * @param {string} alias - alias SQL de la table evenement dans la requête (nom du modèle par défaut)
 * @returns {Array} à passer dans attributes.include
 */
function attributsComptes(alias = 'Evenement') {
  const id = `\`${alias}\`.\`id_evenement\``;
  return [
    [literal(`(SELECT COALESCE(SUM(${PERSONNES_SQL}), 0) FROM evenementusers eu WHERE eu.id_evenement = ${id} AND eu.statut_participation NOT IN ('annule', 'invitation'))`), 'nombre_inscrits'],
    [literal(`(SELECT COALESCE(SUM(${PERSONNES_SQL}), 0) FROM evenementusers eu WHERE eu.id_evenement = ${id} AND eu.statut_participation IN ('confirme', 'present'))`), 'nombre_participants']
  ];
}

/**
 * Rétablir une inscription refusée reprend des places : contrôle de la capacité, comme à l'inscription.
 * Avant, un événement complet à 30/30 passait à 34/30 sans avertissement.
 */
async function verifierPlacePourRetablir(models, idEvenement, inscription) {
  if (inscription?.statut_participation !== 'annule') return;
  const evenement = await models.Evenement.findByPk(idEvenement, { attributes: ['capacite_max'] });
  if (!evenement?.capacite_max) return;
  const [ligne] = await models.EvenementUser.findAll({
    attributes: [[literal(`COALESCE(SUM(${personnesSql('`EvenementUser`')}), 0)`), 'places']],
    where: { id_evenement: idEvenement, statut_participation: { [Op.in]: STATUTS_PLACE_PRISE } },
    raw: true
  });
  const personnes = Math.max(1, parseInt(inscription.reponses_inscription?.nombre_personnes, 10) || 1);
  if ((Number(ligne?.places) || 0) + personnes > evenement.capacite_max) {
    throw Object.assign(new Error('Cet événement est complet : libérez des places avant de rétablir cette inscription'), { statusCode: 409 });
  }
}

module.exports = { attributsComptes, STATUTS_PLACE_PRISE, personnesSql, verifierPlacePourRetablir };
