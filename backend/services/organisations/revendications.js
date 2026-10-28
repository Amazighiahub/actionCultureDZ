/**
 * Demandes « C'est mon organisation » : un professionnel demande à devenir responsable d'une
 * organisation qui n'en a pas (par exemple une maison d'édition reprise de la liste des éditeurs).
 * La modération accepte (il devient responsable) ou refuse avec un motif.
 */
const ROLES_GESTION = ['responsable', 'directeur'];

const erreur = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });
const q = (models, sql, replacements, options = {}) =>
  models.Organisation.sequelize.query(sql, { replacements, type: models.Organisation.sequelize.QueryTypes.SELECT, ...options });

/** Organisations (parmi ids) qui ont au moins un responsable actif */
async function organisationsGerees(models, ids) {
  if (!ids.length) return new Set();
  const lignes = await models.UserOrganisation.findAll({
    where: { id_organisation: ids, actif: true, role: ROLES_GESTION },
    attributes: ['id_organisation']
  });
  return new Set(lignes.map(l => l.id_organisation));
}

/** Dernière demande de ce membre pour cette organisation (statut), ou null */
async function maDemande(models, idOrganisation, userId) {
  if (!userId) return null;
  const [ligne] = await q(models,
    'SELECT statut, motif FROM organisation_revendication WHERE id_organisation = :org AND id_user = :user ORDER BY id DESC LIMIT 1',
    { org: idOrganisation, user: userId }).catch(() => []);
  return ligne || null;
}

async function demander(models, idOrganisation, userId, message) {
  const org = await models.Organisation.findByPk(idOrganisation, { attributes: ['id_organisation', 'nom'] });
  if (!org) throw erreur('Organisation introuvable', 404, 'NOT_FOUND');
  if ((await organisationsGerees(models, [idOrganisation])).size) {
    throw erreur('Cette organisation a déjà un responsable : demandez-lui de vous ajouter comme membre', 409, 'ORGANISATION_DEJA_GEREE');
  }
  const derniere = await maDemande(models, idOrganisation, userId);
  if (derniere?.statut === 'en_attente') throw erreur('Votre demande est déjà en cours de vérification', 409, 'DEMANDE_EN_COURS');
  await models.Organisation.sequelize.query(
    'INSERT INTO organisation_revendication (id_organisation, id_user, message) VALUES (:org, :user, :message)',
    { replacements: { org: idOrganisation, user: userId, message: String(message || '').trim().slice(0, 1000) || null } });
  return org;
}

/** Demandes en attente, avec l'organisation et le compte qui demande */
async function enAttente(models) {
  return q(models, `SELECT r.id, r.message, r.date_creation, r.id_organisation, o.nom AS organisation_nom,
      r.id_user, u.prenom, u.nom, u.email
    FROM organisation_revendication r
    JOIN organisation o ON o.id_organisation = r.id_organisation
    JOIN user u ON u.id_user = r.id_user
    WHERE r.statut = 'en_attente' ORDER BY r.id ASC`);
}

/**
 * @returns {Promise<{ demande: object, organisation: object, refusesAuto: number[] }>}
 */
async function decider(models, idDemande, decision, motif) {
  if (!['acceptee', 'refusee'].includes(decision)) throw erreur('Décision invalide', 400, 'VALIDATION_ERROR');
  const raison = String(motif || '').trim();
  if (decision === 'refusee' && !raison) throw erreur('Un motif de refus est requis', 400, 'VALIDATION_ERROR');
  const sequelize = models.Organisation.sequelize;

  return sequelize.transaction(async (transaction) => {
    const [demande] = await q(models, 'SELECT * FROM organisation_revendication WHERE id = :id FOR UPDATE', { id: idDemande }, { transaction });
    if (!demande) throw erreur('Demande introuvable', 404, 'NOT_FOUND');
    if (demande.statut !== 'en_attente') throw erreur('Cette demande a déjà été traitée', 409, 'DEMANDE_TRAITEE');
    const organisation = await models.Organisation.findByPk(demande.id_organisation, { transaction });
    let refusesAuto = [];

    if (decision === 'acceptee') {
      const dejaGeree = await models.UserOrganisation.findOne({
        where: { id_organisation: demande.id_organisation, actif: true, role: ROLES_GESTION }, transaction
      });
      if (dejaGeree) throw erreur('Cette organisation a déjà un responsable', 409, 'ORGANISATION_DEJA_GEREE');
      const [lien] = await models.UserOrganisation.findOrCreate({
        where: { id_user: demande.id_user, id_organisation: demande.id_organisation },
        defaults: { role: 'responsable', actif: true }, transaction
      });
      if (lien.role !== 'responsable' || !lien.actif) await lien.update({ role: 'responsable', actif: true }, { transaction });
      // Les autres demandes pour la même organisation n'ont plus d'objet
      refusesAuto = (await q(models,
        "SELECT id_user FROM organisation_revendication WHERE id_organisation = :org AND statut = 'en_attente' AND id <> :id",
        { org: demande.id_organisation, id: idDemande }, { transaction })).map(r => r.id_user);
      await sequelize.query(`UPDATE organisation_revendication SET statut = 'refusee', date_decision = NOW(),
          motif = 'Un responsable a déjà été désigné pour cette organisation'
        WHERE id_organisation = :org AND statut = 'en_attente' AND id <> :id`,
      { replacements: { org: demande.id_organisation, id: idDemande }, transaction });
    }
    await sequelize.query('UPDATE organisation_revendication SET statut = :statut, motif = :motif, date_decision = NOW() WHERE id = :id',
      { replacements: { statut: decision, motif: raison || null, id: idDemande }, transaction });
    return { demande: { ...demande, statut: decision }, organisation, refusesAuto };
  });
}

module.exports = { organisationsGerees, maDemande, demander, enAttente, decider };
