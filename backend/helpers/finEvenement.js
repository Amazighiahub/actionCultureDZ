/**
 * Fin réelle d'un événement, à l'heure de l'Algérie (UTC+1, sans heure d'été).
 * Convention du site : un jour enregistré sans heure est à minuit UTC et vaut pour toute la journée ;
 * un événement sans date de fin dure jusqu'au soir de son premier jour.
 * Avant : un événement « le 5 novembre » sans heure était terminé dès 1 h du matin le 5,
 * et un événement sans date de fin n'était jamais terminé.
 */
const { Op, Sequelize } = require('sequelize');

const UNE_HEURE = 60 * 60 * 1000;

const sansHeure = (d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;

/** Minuit (heure d'Algérie) à la fin du jour algérien contenant `d` */
function finDeJournee(d) {
  const local = new Date(d.getTime() + UNE_HEURE);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - UNE_HEURE);
}

/** @returns {Date|null} instant où l'événement est terminé */
function finEffective(dateDebut, dateFin) {
  const fin = dateFin ? new Date(dateFin) : null;
  const finValide = fin && !Number.isNaN(fin.getTime());
  if (finValide && !sansHeure(fin)) return fin;
  const ref = finValide ? fin : (dateDebut ? new Date(dateDebut) : null);
  if (!ref || Number.isNaN(ref.getTime())) return null;
  return finDeJournee(ref);
}

/**
 * Même calcul en SQL (dates stockées en UTC). `alias` : nom de la table dans la requête
 * (« Evenement » dans un findAll avec include ; vide dans un UPDATE).
 */
function finSql(alias = '') {
  const c = (nom) => (alias ? `\`${alias}\`.\`${nom}\`` : `\`${nom}\``);
  return `(CASE WHEN ${c('date_fin')} IS NOT NULL AND TIME(${c('date_fin')}) <> '00:00:00' THEN ${c('date_fin')}
    ELSE TIMESTAMP(DATE(COALESCE(${c('date_fin')}, ${c('date_debut')}) + INTERVAL 1 HOUR)) + INTERVAL 23 HOUR END)`;
}

/** Condition Sequelize : événement pas encore terminé à `maintenant` */
const pasTermine = (maintenant = new Date(), alias = '') =>
  Sequelize.where(Sequelize.literal(finSql(alias)), { [Op.gt]: maintenant });

/** Condition Sequelize : événement terminé à `maintenant` */
const termine = (maintenant = new Date(), alias = '') =>
  Sequelize.where(Sequelize.literal(finSql(alias)), { [Op.lte]: maintenant });

module.exports = { finEffective, finSql, pasTermine, termine };
