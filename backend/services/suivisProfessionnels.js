/**
 * Suivre un professionnel : ses abonnés sont prévenus quand une de ses œuvres ou un de ses événements
 * est publié. Notification sur le site et sur le téléphone, jamais d'e-mail : le quota reste aux messages
 * importants. Le professionnel voit seulement le nombre d'abonnés, jamais leurs noms.
 */
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { PROFESSIONAL_TYPE_IDS } = require('../constants/publicAttributes');

const TAILLE_LOT = 500;

const erreur = (message, statusCode) => Object.assign(new Error(message), { statusCode });

async function suivre(models, idUser, idPro) {
  if (Number(idUser) === Number(idPro)) throw erreur('Vous ne pouvez pas vous suivre vous-même', 400);
  const pro = await models.User.findOne({
    where: { id_user: idPro, statut: 'actif', profil_public: true, accepte_conditions: true, id_type_user: { [Op.in]: PROFESSIONAL_TYPE_IDS } },
    attributes: ['id_user'],
  });
  if (!pro) throw erreur('Ce professionnel est introuvable', 404);
  const [, cree] = await models.SuiviProfessionnel.findOrCreate({
    where: { id_user: idUser, id_professionnel: idPro },
    defaults: { date_creation: new Date() },
  });
  if (cree) await require('./messagesProfessionnels').prevenirNouvelAbonne(models, idPro);
}

async function nePlusSuivre(models, idUser, idPro) {
  await models.SuiviProfessionnel.destroy({ where: { id_user: idUser, id_professionnel: idPro } });
}

/** Nombre d'abonnés, et si cette personne suit ce professionnel */
async function etat(models, idPro, idUser = null) {
  const [total, ligne] = await Promise.all([
    models.SuiviProfessionnel.count({ where: { id_professionnel: idPro } }),
    idUser ? models.SuiviProfessionnel.findOne({ where: { id_user: idUser, id_professionnel: idPro }, attributes: ['id_suivi'] }) : null,
  ]);
  return { total, suit: !!ligne };
}

/** Les professionnels que cette personne suit, pour les retrouver et arrêter de les suivre */
async function mesSuivis(models, idUser) {
  const lignes = await models.SuiviProfessionnel.findAll({
    where: { id_user: idUser },
    attributes: ['id_professionnel', 'date_creation'],
    order: [['date_creation', 'DESC']],
    raw: true,
  });
  if (!lignes.length) return [];
  const pros = await models.User.findAll({
    where: { id_user: lignes.map(l => l.id_professionnel), statut: 'actif', profil_public: true },
    attributes: ['id_user', 'nom', 'prenom', 'photo_url'],
  });
  const parId = new Map(pros.map(p => [p.id_user, p]));
  return lignes.filter(l => parId.has(l.id_professionnel)).map(l => parId.get(l.id_professionnel));
}

/**
 * Publication d'un contenu : une notification par abonné, par lots. Respecte le réglage « favoris » des
 * préférences et ne fait jamais échouer la publication.
 */
async function prevenirAbonnes(models, idPro, { titre, message, composer, url_action, type_notification, metadata }) {
  if (!models?.SuiviProfessionnel || !idPro) return 0;
  let prevenus = 0;
  try {
    let dernier = 0;
    for (;;) {
      const lot = await models.SuiviProfessionnel.findAll({
        where: { id_professionnel: idPro, id_suivi: { [Op.gt]: dernier } },
        attributes: ['id_suivi', 'id_user'],
        order: [['id_suivi', 'ASC']],
        limit: TAILLE_LOT,
        raw: true,
      });
      if (!lot.length) break;
      dernier = lot.at(-1).id_suivi;
      const destinataires = await models.User.findAll({
        where: { id_user: lot.map(l => l.id_user), statut: 'actif', notifications_favoris: { [Op.ne]: false } },
        attributes: ['id_user', 'prenom', 'langue_preferee'],
        raw: true,
      });
      if (destinataires.length) {
        await models.Notification.bulkCreate(destinataires.map(u => ({
          id_user: u.id_user, type_notification, ...(composer ? composer(u) : { titre, message }), url_action, metadata, priorite: 'normale', lu: false, email_envoye: false,
        })));
        prevenus += destinataires.length;
      }
      if (lot.length < TAILLE_LOT) break;
    }
  } catch (err) {
    logger.warn(`Abonnés non prévenus : ${err.message}`);
  }
  return prevenus;
}

module.exports = { suivre, nePlusSuivre, etat, mesSuivis, prevenirAbonnes };
