/**
 * Auteur affiché d'une œuvre (2026-11-27, analyse V12) : la personne créditée, pas celle qui a saisi la fiche.
 * Avant, les listes d'œuvres, la section Tamazight et les pages lues par les moteurs de recherche montraient
 * « saisi_par » (ex. : Nedjma attribué à la personne qui l'a saisi, et non à Kateb Yacine).
 *
 * Même règle que la fiche œuvre (useOeuvreDetails, OeuvreDetailPage) : le contributeur au rôle principal
 * (membre inscrit d'abord, puis intervenant), sinon le premier contributeur, sinon la personne qui a saisi.
 * Une requête par table pour toute une liste.
 */
const { Op } = require('sequelize');

const parOrdre = (a, b) => (a.ordre_apparition ?? 9999) - (b.ordre_apparition ?? 9999);

/**
 * @param {object} models
 * @param {number[]} ids identifiants d'œuvres
 * @returns {Promise<Map<number, { id_user?: number, id_intervenant?: number, nom: unknown, prenom: unknown }>>}
 */
async function auteursDesOeuvres(models, ids) {
  const resultat = new Map();
  const liste = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!liste.length) return resultat;

  const [membres, intervenants] = await Promise.all([
    models.OeuvreUser?.findAll ? models.OeuvreUser.findAll({
      where: { id_oeuvre: { [Op.in]: liste } },
      attributes: ['id_oeuvre', 'id_user', 'role_principal', 'ordre_apparition'],
      include: models.User ? [{ model: models.User, attributes: ['id_user', 'nom', 'prenom'], required: true }] : [],
    }) : [],
    models.OeuvreIntervenant?.findAll ? models.OeuvreIntervenant.findAll({
      where: { id_oeuvre: { [Op.in]: liste } },
      attributes: ['id_oeuvre', 'id_intervenant', 'role_principal', 'ordre_apparition'],
      include: models.Intervenant ? [{ model: models.Intervenant, as: 'Intervenant', attributes: ['id_intervenant', 'nom', 'prenom'], required: true }] : [],
    }) : [],
  ]);

  for (const id of liste) {
    const m = membres.filter((r) => Number(r.id_oeuvre) === id).sort(parOrdre);
    const i = intervenants.filter((r) => Number(r.id_oeuvre) === id).sort(parOrdre);
    const choix = m.find((r) => r.role_principal) || i.find((r) => r.role_principal) || m[0] || i[0];
    if (!choix) continue;
    if (choix.User) resultat.set(id, { id_user: choix.User.id_user, nom: choix.User.nom, prenom: choix.User.prenom });
    else if (choix.Intervenant) resultat.set(id, { id_intervenant: choix.Intervenant.id_intervenant, nom: choix.Intervenant.nom, prenom: choix.Intervenant.prenom });
  }
  return resultat;
}

module.exports = { auteursDesOeuvres };
