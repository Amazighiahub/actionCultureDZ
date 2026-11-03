/**
 * Notifications sur le téléphone (Web Push). Chaque notification enregistrée sur le site part aussi
 * vers les appareils de la personne, si elle a activé cette option ; elle ne remplace pas l'e-mail.
 * Sans clés VAPID dans l'environnement, rien ne part et le site fonctionne normalement.
 */
const webpush = require('web-push');
const logger = require('../utils/logger');

const MAX_APPAREILS = 5;
const TAILLE_LOT = 10;
const DELAI_ENVOI_MS = 10000;
const DUREE_VIE_SECONDES = 24 * 3600;
// Un rappel « dans 1 heure » n'a plus de sens s'il arrive le lendemain
const DUREE_VIE_RAPPEL_SECONDES = 3600;

// L'adresse d'abonnement vient du navigateur et le serveur l'appelle : seulement les services de
// notification des navigateurs, jamais une adresse choisie par un visiteur
const HOTES_AUTORISES = [
  /^fcm\.googleapis\.com$/,
  /^(.+\.)?push\.apple\.com$/,
  /^(.+\.)?notify\.windows\.com$/,
  /^(.+\.)?push\.services\.mozilla\.com$/,
];

let configure = false;

const clePublique = () => process.env.VAPID_PUBLIC_KEY || null;

function actif() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  if (configure === false) {
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:contact@taladz.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      configure = true;
    } catch (err) {
      // Clé mal copiée : signalée une seule fois, le site continue sans notifications sur téléphone
      logger.error(`Clés VAPID invalides, notifications téléphone désactivées : ${err.message}`);
      configure = 'invalide';
    }
  }
  return configure === true;
}

function adresseAutorisee(endpoint) {
  try {
    const { protocol, hostname } = new URL(endpoint);
    const autorisee = protocol === 'https:' && HOTES_AUTORISES.some(h => h.test(hostname));
    // Navigateur à service inconnu (téléphone sans services Google, par exemple) : visible dans le journal
    if (!autorisee) logger.warn(`Abonnement refusé, service de notification inconnu : ${hostname}`);
    return autorisee;
  } catch {
    return false;
  }
}

/** Enregistre cet appareil. Un téléphone partagé passe au dernier compte qui l'a activé. */
async function abonner(models, idUser, { endpoint, p256dh, auth }) {
  const existant = await models.PushAbonnement.findOne({ where: { endpoint } });
  if (existant) {
    await existant.update({ id_user: idUser, p256dh, auth });
  } else {
    await models.PushAbonnement.create({ id_user: idUser, endpoint, p256dh, auth, date_creation: new Date() });
  }
  // Au plus 5 appareils par personne : les plus anciens sortent
  const appareils = await models.PushAbonnement.findAll({
    where: { id_user: idUser }, attributes: ['id_abonnement'], order: [['id_abonnement', 'DESC']], raw: true
  });
  const enTrop = appareils.slice(MAX_APPAREILS).map(a => a.id_abonnement);
  if (enTrop.length) await models.PushAbonnement.destroy({ where: { id_abonnement: enTrop } });
}

/** Retire cet appareil, seulement s'il appartient à cette personne */
async function desabonner(models, idUser, endpoint) {
  await models.PushAbonnement.destroy({ where: { id_user: idUser, endpoint } });
}

// Un message d'organisateur peut contenir un point de rencontre ou un lien privé : l'écran verrouillé
// d'un téléphone est lisible par tout le monde, le détail reste sur le site
const texteVisible = (n) => (n.type_notification === 'message_evenement'
  ? 'Nouveau message de l’organisateur. Ouvrez Tala DZ pour le lire.'
  : String(n.message || '').slice(0, 240));

const chargeUtile = (n) => JSON.stringify({
  titre: n.type_notification === 'message_evenement' ? 'Message pour votre événement' : String(n.titre || 'Tala DZ').slice(0, 120),
  message: texteVisible(n),
  // Chemin interne seulement, comme les notifications du site
  url: typeof n.url_action === 'string' && /^\/(?![/\\])/.test(n.url_action) ? n.url_action : '/notifications',
  tag: n.id_notification ? `notification-${n.id_notification}` : undefined,
});

async function envoyerA(models, abonnement, charge, ttl) {
  try {
    await webpush.sendNotification(
      { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
      charge,
      { TTL: ttl, timeout: DELAI_ENVOI_MS }
    );
    return true;
  } catch (err) {
    // 404 / 410 : l'appareil n'existe plus ou a retiré son accord
    if (err.statusCode === 404 || err.statusCode === 410) {
      await models.PushAbonnement.destroy({ where: { id_abonnement: abonnement.id_abonnement } }).catch(() => {});
    } else {
      logger.warn(`Notification téléphone non envoyée (${err.statusCode || err.message})`);
    }
    return false;
  }
}

/**
 * Une seule file pour tout le serveur : un envoi à tous lance plusieurs appels, qui ne doivent pas
 * s'additionner ni bloquer les réponses aux visiteurs.
 */
let file = Promise.resolve();
const pause = () => new Promise(resoudre => { setImmediate(resoudre); });

async function traiter(models, notifications) {
  let envoyes = 0;
  const ids = [...new Set(notifications.map(n => n.id_user).filter(Boolean))];
  const choix = await models.User.findAll({
    where: { id_user: ids }, attributes: ['id_user', 'notifications_push', 'notifications_evenements'], raw: true
  });
  const refusTout = new Set(choix.filter(u => u.notifications_push === false || u.notifications_push === 0).map(u => u.id_user));
  // Une annonce suit le même choix que l'e-mail « Ne plus recevoir ces annonces »
  const refusAnnonces = new Set(choix.filter(u => u.notifications_evenements === false || u.notifications_evenements === 0).map(u => u.id_user));
  const abonnements = await models.PushAbonnement.findAll({ where: { id_user: ids.filter(id => !refusTout.has(id)) }, raw: true });
  if (!abonnements.length) return 0;

  const parPersonne = new Map();
  for (const a of abonnements) parPersonne.set(a.id_user, [...(parPersonne.get(a.id_user) || []), a]);

  const envois = notifications.flatMap((n) => {
    if (n.type_notification === 'message_admin' && refusAnnonces.has(n.id_user)) return [];
    const charge = chargeUtile(n);
    const ttl = n.type_notification === 'rappel_evenement' ? DUREE_VIE_RAPPEL_SECONDES : DUREE_VIE_SECONDES;
    return (parPersonne.get(n.id_user) || []).map(a => [a, charge, ttl]);
  });
  for (let i = 0; i < envois.length; i += TAILLE_LOT) {
    const resultats = await Promise.all(envois.slice(i, i + TAILLE_LOT).map(([a, charge, ttl]) => envoyerA(models, a, charge, ttl)));
    envoyes += resultats.filter(Boolean).length;
    await pause();
  }
  return envoyes;
}

/** Envoie ces notifications aux appareils de leurs destinataires ; une erreur ne remonte jamais */
function pourNotifications(models, notifications) {
  if (!actif() || !models?.PushAbonnement || !notifications?.length) return Promise.resolve(0);
  const tache = file.then(() => traiter(models, notifications)).catch((err) => {
    logger.warn(`Notifications téléphone interrompues : ${err.message}`);
    return 0;
  });
  file = tache;
  return tache;
}

module.exports = { actif, clePublique, adresseAutorisee, abonner, desabonner, pourNotifications, MAX_APPAREILS };
