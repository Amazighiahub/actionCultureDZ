/**
 * Suppression d'un lieu, commune à /lieux et /patrimoine.
 *
 * - Refusée tant que le lieu ou l'un de ses points de visite accueille un événement
 *   (lieu de l'événement ou d'une séance du programme) : sinon l'événement perdrait son lieu sans prévenir.
 * - Les points de visite (sous-lieux, sur plusieurs niveaux) sont supprimés avec le site :
 *   la clé id_lieu_parent est en SET NULL, ils deviendraient sinon des sites indépendants.
 */
const { Op } = require('sequelize');

/** Identifiants des points de visite, niveau par niveau (du site vers les plus profonds) */
async function niveauxDescendants(models, idLieu, transaction) {
  const niveaux = [];
  let parents = [idLieu];
  const vus = new Set(parents);
  while (parents.length) {
    const enfants = await models.Lieu.findAll({
      where: { id_lieu_parent: { [Op.in]: parents } },
      attributes: ['id_lieu'],
      raw: true,
      transaction
    });
    parents = enfants.map(e => e.id_lieu).filter(id => !vus.has(id));
    parents.forEach(id => vus.add(id));
    if (parents.length) niveaux.push(parents);
  }
  return niveaux;
}

/** Nombre d'événements distincts qui se tiennent dans l'un de ces lieux */
async function compterEvenements(models, ids, transaction) {
  const [directs, parSeance] = await Promise.all([
    models.Evenement.findAll({ where: { id_lieu: { [Op.in]: ids } }, attributes: ['id_evenement'], raw: true, transaction }),
    models.Programme
      ? models.Programme.findAll({ where: { id_lieu: { [Op.in]: ids } }, attributes: ['id_evenement'], raw: true, transaction })
      : []
  ]);
  return new Set([...directs, ...parSeance].map(e => e.id_evenement).filter(Boolean)).size;
}

/**
 * @returns {Promise<{ trouve: boolean, evenements: number, supprime: boolean, points: number }>}
 */
async function supprimerLieu(models, idLieu) {
  const id = Number(idLieu);
  return models.Lieu.sequelize.transaction(async (transaction) => {
    const lieu = await models.Lieu.findByPk(id, { attributes: ['id_lieu'], transaction });
    if (!lieu) return { trouve: false, evenements: 0, supprime: false, points: 0 };

    const niveaux = await niveauxDescendants(models, id, transaction);
    const evenements = await compterEvenements(models, [id, ...niveaux.flat()], transaction);
    if (evenements > 0) return { trouve: true, evenements, supprime: false, points: 0 };

    // Les plus profonds d'abord, puis le site
    for (const ids of [...niveaux].reverse()) {
      await models.Lieu.destroy({ where: { id_lieu: { [Op.in]: ids } }, transaction });
    }
    await lieu.destroy({ transaction });
    return { trouve: true, evenements: 0, supprime: true, points: niveaux.flat().length };
  });
}

module.exports = { supprimerLieu };
