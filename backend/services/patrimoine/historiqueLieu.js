/**
 * Modifications des textes d'un lieu : historique et notifications.
 *
 * - Chaque texte modifié (nom, adresse, description, histoire, sections…) garde son ancienne
 *   valeur dans historique_lieu ; l'administration peut revenir à une version précédente.
 * - Le créateur du lieu et les administrateurs sont prévenus (sauf l'auteur de la modification) :
 *   « Karim Bensaid a modifié l'histoire de « Tkout » ».
 */
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const logger = require('../../utils/logger');
const { texteLisible } = require('../../helpers/i18n');

/** Textes suivis, avec leur nom dans les messages */
const LIBELLES = {
  nom: 'le nom',
  adresse: 'l’adresse',
  description: 'la description',
  histoire: 'l’histoire',
  referencesHistoriques: 'les références historiques',
  horaires: 'les horaires',
  architecture: 'l’architecture',
  traditions: 'les traditions',
  gastronomie: 'la gastronomie',
  artisanat_local: 'l’artisanat local',
  personnalites: 'les personnalités',
  infos_pratiques: 'les informations pratiques'
};
/** Textes de la table lieu ; les autres sont dans detail_lieux */
const CHAMPS_LIEU = ['nom', 'adresse'];

const lireJson = (v) => {
  if (typeof v !== 'string') return v ?? null;
  try { return JSON.parse(v); } catch { return v; }
};
const identiques = (a, b) => JSON.stringify(lireJson(a)) === JSON.stringify(lireJson(b));
const texteDe = (v) => texteLisible(v);
const nomPersonne = (user) => [texteDe(user?.prenom), texteDe(user?.nom)].filter(Boolean).join(' ').trim() || 'Une personne';

/** « l'histoire », « l'histoire et les références historiques », « a, b et c » */
function listeLibelles(champs) {
  const l = champs.map(c => LIBELLES[c] || c);
  return l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0];
}

/**
 * Enregistre les textes réellement changés (avant → après).
 * @returns {Promise<string[]>} les champs modifiés
 */
async function enregistrerModifications(models, { idLieu, idUser, avant = {}, apres = {}, transaction, idHistoriqueRestaure = null }) {
  if (!models?.HistoriqueLieu) return [];
  const champs = Object.keys(apres).filter(c => LIBELLES[c] && !identiques(avant[c], apres[c]));
  if (!champs.length) return [];
  await models.HistoriqueLieu.bulkCreate(champs.map(champ => ({
    id_lieu: idLieu,
    champ,
    ancienne_valeur: lireJson(avant[champ]),
    nouvelle_valeur: lireJson(apres[champ]),
    id_user: idUser || null,
    id_historique_restaure: idHistoriqueRestaure
  })), { transaction });
  return champs;
}

/**
 * Prévient le créateur du lieu et les administrateurs, sauf l'auteur.
 * `action` complète « <auteur> … « <lieu> ». », ex. « a modifié l'histoire de ».
 * Une notification manquée n'annule jamais la modification.
 */
async function notifierModification(models, notificationService, { idLieu, idUser, action }) {
  try {
    const lieu = await models.Lieu.findByPk(idLieu, { attributes: ['id_lieu', 'nom', 'id_createur'] });
    if (!lieu) return;
    const auteur = idUser ? await models.User.findByPk(idUser, { attributes: ['nom', 'prenom'] }) : null;
    const destinataires = new Set([lieu.id_createur, ...await idsAdministrateurs(models)].filter(Boolean));
    destinataires.delete(idUser);
    const message = `${nomPersonne(auteur)} ${action} « ${texteDe(lieu.nom)} ».`;
    for (const id of destinataires) {
      await notifier(notificationService, id, {
        titre: 'Modification d’un lieu', message, url_action: `/patrimoine/${idLieu}`, metadata: { id_lieu: idLieu }
      });
    }
  } catch (e) {
    logger.error('Notification de modification d’un lieu :', { message: e.message });
  }
}

/** Notification pour des textes modifiés */
const notifierTextes = (models, notificationService, { idLieu, idUser, champs }) =>
  champs.length ? notifierModification(models, notificationService, { idLieu, idUser, action: `a modifié ${listeLibelles(champs)} de` }) : null;

/** Historique d'un lieu, le plus récent d'abord */
async function listerHistorique(models, idLieu, { limit = 100 } = {}) {
  const lignes = await models.HistoriqueLieu.findAll({
    where: { id_lieu: idLieu },
    include: [{ model: models.User, as: 'Auteur', attributes: ['id_user', 'nom', 'prenom'], required: false }],
    order: [['date_creation', 'DESC'], ['id_historique', 'DESC']],
    limit
  });
  return lignes.map(l => ({
    id_historique: l.id_historique,
    champ: l.champ,
    libelle: LIBELLES[l.champ] || l.champ,
    ancienne_valeur: lireJson(l.ancienne_valeur),
    nouvelle_valeur: lireJson(l.nouvelle_valeur),
    date: l.date_creation,
    auteur: l.Auteur ? nomPersonne(l.Auteur) : null,
    id_historique_restaure: l.id_historique_restaure
  }));
}

/**
 * Revient au texte d'avant une modification : le champ reprend exactement son ancienne valeur
 * (toutes les langues), et ce retour est lui-même gardé dans l'historique.
 * @returns {Promise<{champ: string}|null>} null : ligne introuvable pour ce lieu
 */
async function restaurer(models, { idLieu, idHistorique, idUser }) {
  const ligne = await models.HistoriqueLieu.findOne({ where: { id_historique: idHistorique, id_lieu: idLieu } });
  if (!ligne || !LIBELLES[ligne.champ]) return null;
  const { champ } = ligne;
  const valeur = lireJson(ligne.ancienne_valeur);
  await models.sequelize.transaction(async (transaction) => {
    const cible = CHAMPS_LIEU.includes(champ)
      ? await models.Lieu.findByPk(idLieu, { transaction })
      : await models.DetailLieu.findOne({ where: { id_lieu: idLieu }, transaction });
    if (!cible) throw Object.assign(new Error('Lieu introuvable'), { statusCode: 404 });
    if (champ === 'nom' && !texteDe(valeur)) {
      throw Object.assign(new Error('Un lieu doit garder un nom : cette version n’en avait pas'), { statusCode: 400 });
    }
    const actuelle = cible[champ];
    await cible.update({ [champ]: valeur }, { transaction });
    await enregistrerModifications(models, {
      idLieu, idUser, avant: { [champ]: actuelle }, apres: { [champ]: valeur }, transaction, idHistoriqueRestaure: ligne.id_historique
    });
  });
  return { champ };
}

module.exports = { LIBELLES, CHAMPS_LIEU, enregistrerModifications, notifierModification, notifierTextes, listerHistorique, restaurer };
