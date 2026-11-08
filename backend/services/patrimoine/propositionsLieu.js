/**
 * Propositions de modification d'un site patrimoine (audit V7 M5 : « tout le monde propose, l'équipe valide »).
 *
 * L'équipe (administration, modération) et le créateur du site modifient directement. Toute autre
 * personne envoie une proposition (textes du site, personnalité rattachée, monument ou vestige ajouté
 * ou modifié), invisible sur le site tant que l'équipe ne l'a pas acceptée. Acceptée, elle passe par
 * les mêmes fonctions qu'une modification directe (historique, notifications) ; refusée, le motif est
 * envoyé à son auteur.
 */
const { estModeration } = require('../../utils/droits');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const { texteLisible } = require('../../helpers/i18n');
const logger = require('../../utils/logger');
const elements = require('./elementsLieu');

const ACTIONS = ['detail', 'personnalite', 'element_ajout', 'element_modif', 'creation'];
const LIBELLES = {
  creation: 'un nouveau lieu :',
  detail: 'une modification des textes de',
  personnalite: 'une personnalité pour',
  element_ajout: 'un ajout à',
  element_modif: 'une modification de'
};

const erreur = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });
const lireJson = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};

/** true : la modification de ce compte doit passer par une proposition */
async function doitProposer(models, user, idLieu) {
  if (!user || estModeration(user)) return false;
  const lieu = await models.Lieu.findByPk(idLieu, { attributes: ['id_lieu', 'id_createur'] });
  if (!lieu) throw erreur('Site introuvable', 404, 'NOT_FOUND');
  return Number(lieu.id_createur) !== Number(user.id_user);
}

// Garde-fous : un compte ne peut pas noyer la file de relecture de l'équipe
const PLAFOND_EN_ATTENTE = 20;
const TAILLE_MAX_DONNEES = 200 * 1024;

/** true si ce compte a déjà trop de propositions en attente */
async function plafondAtteint(models, idUser) {
  const [{ n }] = await models.sequelize.query(
    "SELECT COUNT(*) AS n FROM proposition_lieu WHERE id_user = :user AND statut = 'en_attente'",
    { type: models.sequelize.QueryTypes.SELECT, replacements: { user: idUser } }
  );
  return Number(n) >= PLAFOND_EN_ATTENTE;
}

/** Enregistre la proposition et prévient l'équipe */
async function proposer(models, notificationService, { idLieu, user, action, donnees }) {
  if (!ACTIONS.includes(action)) throw erreur('Action invalide', 400, 'VALIDATION_ERROR');
  const json = JSON.stringify(donnees);
  if (Buffer.byteLength(json) > TAILLE_MAX_DONNEES) throw erreur('Proposition trop longue', 413, 'PROPOSITION_TROP_LONGUE');
  const sql = { type: models.sequelize.QueryTypes.SELECT };
  const [{ n }] = await models.sequelize.query(
    "SELECT COUNT(*) AS n FROM proposition_lieu WHERE id_user = :user AND statut = 'en_attente'",
    { ...sql, replacements: { user: user.id_user } }
  );
  if (Number(n) >= PLAFOND_EN_ATTENTE) {
    throw erreur('Vous avez déjà beaucoup de propositions en attente : l\'équipe doit d\'abord les relire', 409, 'TROP_DE_PROPOSITIONS');
  }
  // Double clic : la même proposition, encore en attente, n'est pas enregistrée une seconde fois
  const [identique] = await models.sequelize.query(
    `SELECT id FROM proposition_lieu WHERE id_user = :user AND id_lieu = :lieu AND action = :action
       AND statut = 'en_attente' AND donnees = CAST(:donnees AS JSON) LIMIT 1`,
    { ...sql, replacements: { user: user.id_user, lieu: idLieu, action, donnees: json } }
  ).catch(() => []);
  if (identique) return { id: identique.id };
  const [id] = await models.sequelize.query(
    'INSERT INTO proposition_lieu (id_lieu, id_user, action, donnees) VALUES (:lieu, :user, :action, :donnees)',
    { replacements: { lieu: idLieu, user: user.id_user, action, donnees: json } }
  );
  try {
    const lieu = await models.Lieu.findByPk(idLieu, { attributes: ['nom'] });
    const qui = [texteLisible(user.prenom), texteLisible(user.nom)].filter(Boolean).join(' ') || 'Un membre';
    for (const idAdmin of await idsAdministrateurs(models)) {
      await notifier(notificationService, idAdmin, {
        titre: 'Proposition à relire',
        message: `${qui} propose ${LIBELLES[action]} « ${texteLisible(lieu?.nom)} ».`,
        url_action: '/admin/dashboard?tab=patrimoine', metadata: { id_lieu: idLieu, id_proposition: id }
      });
    }
  } catch (e) {
    logger.error('Notification de proposition de lieu :', { message: e.message });
  }
  return { id };
}

/** Propositions en attente, avec le site, l'auteur et le nom de la personnalité proposée */
async function enAttente(models) {
  const lignes = await models.sequelize.query(`SELECT p.id, p.id_lieu, p.action, p.donnees, p.date_creation,
      l.nom AS lieu_nom, p.id_user, u.prenom, u.nom, u.email
    FROM proposition_lieu p
    JOIN lieu l ON l.id_lieu = p.id_lieu
    JOIN user u ON u.id_user = p.id_user
    WHERE p.statut = 'en_attente' ORDER BY p.id ASC LIMIT 200`, { type: models.sequelize.QueryTypes.SELECT });
  const idIntervenant = (ligne) => (ligne.action === 'personnalite' ? Number(ligne.donnees.corps?.id_intervenant) : null);
  for (const ligne of lignes) ligne.donnees = lireJson(ligne.donnees) || {};
  const ids = [...new Set(lignes.map(idIntervenant).filter(Boolean))];
  const personnes = ids.length && models.Intervenant
    ? await models.Intervenant.findAll({ where: { id_intervenant: ids }, attributes: ['id_intervenant', 'nom', 'prenom'] })
    : [];
  const noms = new Map(personnes.map(p => [p.id_intervenant, [texteLisible(p.prenom), texteLisible(p.nom)].filter(Boolean).join(' ')]));
  for (const ligne of lignes) {
    const idPersonne = idIntervenant(ligne);
    if (idPersonne && models.Intervenant) ligne.donnees.intervenant = noms.get(idPersonne) || null;
  }
  return lignes;
}

/** Applique une proposition acceptée, comme une modification directe de son auteur */
async function appliquer(models, notificationService, p) {
  const { corps = {}, genre, idElement } = p.donnees;
  switch (p.action) {
    case 'detail':
      if (!(await elements.enrichirDetail(models, notificationService, p.id_lieu, p.id_user, corps))) {
        throw erreur('Proposition vide', 400, 'VALIDATION_ERROR');
      }
      return;
    case 'personnalite':
      await elements.rattacherPersonnalite(models, p.id_lieu, corps, p.id_user);
      return;
    case 'element_ajout':
      await elements.ajouterElement(models, genre, p.id_lieu, corps, p.id_user);
      return;
    case 'element_modif':
      await elements.modifierElement(models, genre, p.id_lieu, Number(idElement), corps);
      return;
    case 'creation':
      // Lieu ajouté par un membre : publié
      await models.Lieu.update({ statut: 'publie' }, { where: { id_lieu: p.id_lieu, statut: 'brouillon' } });
      return;
    default:
      throw erreur('Action invalide', 400, 'VALIDATION_ERROR');
  }
}

/**
 * Accepter (la modification est appliquée) ou refuser avec un motif ; l'auteur est prévenu.
 * La proposition est verrouillée le temps de la décision (deux modérateurs en même temps : une seule passe).
 */
async function decider(models, notificationService, idProposition, decision, motif, idModerateur) {
  if (!['acceptee', 'refusee'].includes(decision)) throw erreur('Décision invalide', 400, 'VALIDATION_ERROR');
  const raison = String(motif || '').trim().slice(0, 1000);
  if (decision === 'refusee' && !raison) throw erreur('Un motif de refus est requis', 400, 'VALIDATION_ERROR');
  const sequelize = models.sequelize;

  const p = await sequelize.transaction(async (transaction) => {
    const [ligne] = await sequelize.query('SELECT * FROM proposition_lieu WHERE id = :id FOR UPDATE',
      { replacements: { id: idProposition }, type: sequelize.QueryTypes.SELECT, transaction });
    if (!ligne) throw erreur('Proposition introuvable', 404, 'NOT_FOUND');
    if (ligne.statut !== 'en_attente') throw erreur('Cette proposition a déjà été traitée', 409, 'PROPOSITION_TRAITEE');
    await sequelize.query(`UPDATE proposition_lieu SET statut = :statut, motif = :motif, id_moderateur = :moderateur,
        date_decision = NOW() WHERE id = :id`,
    { replacements: { statut: decision, motif: raison || null, moderateur: idModerateur, id: idProposition }, transaction });
    return { ...ligne, donnees: lireJson(ligne.donnees) || {} };
  });

  if (decision === 'acceptee') {
    try {
      await appliquer(models, notificationService, p);
    } catch (e) {
      // Plus applicable (élément supprimé, personnalité déjà rattachée…) : la proposition reste à traiter
      await sequelize.query("UPDATE proposition_lieu SET statut = 'en_attente', id_moderateur = NULL, date_decision = NULL WHERE id = :id",
        { replacements: { id: idProposition } });
      throw e;
    }
  }

  // Nouveau lieu refusé : archivé (invisible sur le site, l'équipe peut le retrouver)
  if (decision === 'refusee' && p.action === 'creation') {
    await models.Lieu.update({ statut: 'archive' }, { where: { id_lieu: p.id_lieu, statut: 'brouillon' } });
  }
  const lieu = await models.Lieu.findByPk(p.id_lieu, { attributes: ['nom'] });
  const nomLieu = texteLisible(lieu?.nom);
  await notifier(notificationService, p.id_user, decision === 'acceptee'
    ? { titre: 'Proposition acceptée', message: `Merci ! Votre proposition pour « ${nomLieu} » est publiée.`,
      url_action: `/patrimoine/${p.id_lieu}`, metadata: { id_lieu: p.id_lieu } }
    : { titre: 'Proposition non retenue', message: `Votre proposition pour « ${nomLieu} » n'a pas été retenue : ${raison.slice(0, 300)}`,
      url_action: `/patrimoine/${p.id_lieu}`, metadata: { id_lieu: p.id_lieu } });
  return { statut: decision };
}

module.exports = { ACTIONS, doitProposer, proposer, enAttente, decider, plafondAtteint };
