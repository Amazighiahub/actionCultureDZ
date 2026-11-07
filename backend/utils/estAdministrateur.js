/**
 * Vrai administrateur : type « administrateur » ou rôle « Administrateur ». Un modérateur n'en est pas un.
 * Sert aux décisions qu'un modérateur ne doit pas prendre sur son propre contenu.
 */
const { TYPE_USER_IDS } = require('../constants/typeUserIds');

async function estAdministrateur(models, idUser) {
  if (!idUser || !models?.User) return false;
  const u = await models.User.findByPk(idUser, { attributes: ['id_user', 'id_type_user'] });
  if (!u) return false;
  if (Number(u.id_type_user) === TYPE_USER_IDS.ADMINISTRATEUR) return true;
  if (!models.Role) return false;
  const n = await models.User.count({
    where: { id_user: idUser },
    include: [{ model: models.Role, as: 'Roles', where: { nom_role: 'Administrateur' }, attributes: [], through: { attributes: [] } }],
  });
  return n > 0;
}

/** Modérateur qui déciderait de son propre contenu : refusé (un vrai administrateur le peut) */
async function refuserSiSonPropreContenu(models, idDecideur, idProprietaire, quoi) {
  if (!idDecideur || Number(idDecideur) !== Number(idProprietaire)) return;
  if (await estAdministrateur(models, idDecideur)) return;
  throw Object.assign(new Error(`Vous ne pouvez pas valider ${quoi} vous-même : un autre membre de l’équipe doit le faire.`), { statusCode: 403, code: 'AUTO_VALIDATION' });
}

module.exports = { estAdministrateur, refuserSiSonPropreContenu };
