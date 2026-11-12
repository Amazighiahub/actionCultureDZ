/**
 * Messages déjà rédigés qu'un professionnel envoie pour garder le lien avec son public : pas de texte
 * libre, donc pas de publicité ni de lien extérieur à relire. Personnalisés au prénom et dans la langue
 * de chaque personne. Un envoi par jour au plus, seulement à ses abonnés ou aux participants de ses événements.
 * Notifications sur le site et le téléphone : jamais d'e-mail, le quota reste aux messages importants.
 */
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { texteLisible } = require('../helpers/i18n');
const { nomComplet } = require('../utils/texte');
const { getClient } = require('../utils/redisClient');

const TAILLE_LOT = 500;
const DELAI_SECONDES = 24 * 3600;
const { EVENEMENT_OUVERT: STATUTS_EVENEMENT_VISIBLE } = require('../constants/statuts');

const erreur = (message, statusCode) => Object.assign(new Error(message), { statusCode });

/** Textes : p = « Bonjour Amina, », q = nom du professionnel, t = titre du contenu */
const TEXTES = {
  fr: {
    bonjour: (prenom) => (prenom ? `Bonjour ${prenom}, ` : 'Bonjour, '),
    oeuvre: (p, q, t) => ({ titre: `Nouveauté de ${q}`, message: `${p}${q} vous invite à découvrir « ${t} ». Donnez votre avis en commentaire !` }),
    evenement: (p, q, t) => ({ titre: `Invitation de ${q}`, message: `${p}${q} vous invite à l’événement « ${t} ». Inscrivez-vous pour y participer !` }),
    profil: (p, q) => ({ titre: `${q} vous donne des nouvelles`, message: `${p}découvrez les nouveautés de ${q} sur son profil Tala DZ.` }),
    suivre: (p, q) => ({ titre: `Restez en contact avec ${q}`, message: `${p}vous avez participé à un événement de ${q}. Abonnez-vous à son profil pour suivre ses nouveautés !` }),
    publication: (p, q, t) => ({ titre: `Nouvelle publication de ${q}`, message: `${p}${q} a publié « ${t} ». Donnez votre avis en commentaire !` }),
    nouvelEvenement: (p, q, t) => ({ titre: `Nouvel événement de ${q}`, message: `${p}${q} organise « ${t} ». Inscrivez-vous pour y participer !` }),
  },
  en: {
    bonjour: (prenom) => (prenom ? `Hello ${prenom}, ` : 'Hello, '),
    oeuvre: (p, q, t) => ({ titre: `News from ${q}`, message: `${p}${q} invites you to discover “${t}”. Share your opinion in a comment!` }),
    evenement: (p, q, t) => ({ titre: `Invitation from ${q}`, message: `${p}${q} invites you to the event “${t}”. Register to take part!` }),
    profil: (p, q) => ({ titre: `News from ${q}`, message: `${p}discover what’s new from ${q} on their Tala DZ profile.` }),
    suivre: (p, q) => ({ titre: `Stay in touch with ${q}`, message: `${p}you took part in an event by ${q}. Follow their profile to see what’s new!` }),
    publication: (p, q, t) => ({ titre: `New publication by ${q}`, message: `${p}${q} has published “${t}”. Share your opinion in a comment!` }),
    nouvelEvenement: (p, q, t) => ({ titre: `New event by ${q}`, message: `${p}${q} is organising “${t}”. Register to take part!` }),
  },
  ar: {
    bonjour: (prenom) => (prenom ? `مرحبًا ${prenom}، ` : 'مرحبًا، '),
    oeuvre: (p, q, t) => ({ titre: `جديد ${q}`, message: `${p}يدعوك ${q} إلى اكتشاف «${t}». شاركنا رأيك في تعليق!` }),
    evenement: (p, q, t) => ({ titre: `دعوة من ${q}`, message: `${p}يدعوك ${q} إلى فعالية «${t}». سجّل للمشاركة!` }),
    profil: (p, q) => ({ titre: `أخبار ${q}`, message: `${p}اكتشف جديد ${q} على صفحته في ثالا دي زد.` }),
    suivre: (p, q) => ({ titre: `ابقَ على تواصل مع ${q}`, message: `${p}شاركت في فعالية نظمها ${q}. تابع صفحته لتعرف جديده!` }),
    publication: (p, q, t) => ({ titre: `منشور جديد من ${q}`, message: `${p}نشر ${q} «${t}». شاركنا رأيك في تعليق!` }),
    nouvelEvenement: (p, q, t) => ({ titre: `فعالية جديدة من ${q}`, message: `${p}ينظم ${q} «${t}». سجّل للمشاركة!` }),
  },
};

const textesPour = (langue) => TEXTES[String(langue || 'fr').slice(0, 2)] || TEXTES.fr;

/** Texte d'une personne, dans sa langue et à son prénom */
function composer(modele, personne, qui, titreContenu = '') {
  const textes = textesPour(personne.langue_preferee);
  return textes[modele](textes.bonjour(texteLisible(personne.prenom)), qui, titreContenu);
}

const lienOeuvre = (o) => `${[4, 5].includes(o.id_type_oeuvre) ? '/articles' : '/oeuvres'}/${o.id_oeuvre}`;

// Limite d'un envoi par jour : Redis, avec un repli en mémoire si Redis est absent
const memoire = new Map();
const cleLimite = (idPro) => `pro:message:${idPro}`;

async function dernierEnvoi(idPro) {
  try {
    const redis = getClient();
    if (redis) {
      const valeur = await redis.get(cleLimite(idPro));
      if (valeur) return Number(valeur);
    }
  } catch {
    // Mémoire
  }
  return memoire.get(idPro) || null;
}

async function noterEnvoi(idPro) {
  const maintenant = Date.now();
  memoire.set(idPro, maintenant);
  try {
    const redis = getClient();
    if (redis) {
      await redis.set(cleLimite(idPro), String(maintenant));
      await redis.expire(cleLimite(idPro), DELAI_SECONDES);
    }
  } catch {
    // Mémoire
  }
}

/**
 * Réserve l'envoi du jour d'un seul coup (avant : lecture puis écriture séparées, deux clics très
 * rapprochés envoyaient deux messages). false si un envoi a déjà eu lieu dans les 24 heures.
 */
async function reserverEnvoi(idPro) {
  const maintenant = Date.now();
  try {
    const redis = getClient();
    if (redis) return (await redis.set(cleLimite(idPro), String(maintenant), { NX: true, EX: DELAI_SECONDES })) === 'OK';
  } catch {
    // Mémoire
  }
  const dernier = memoire.get(idPro);
  if (dernier && maintenant - dernier < DELAI_SECONDES * 1000) return false;
  memoire.set(idPro, maintenant);
  return true;
}

/** Envoi finalement impossible (rien à envoyer, contenu introuvable) : la place est rendue */
async function libererEnvoi(idPro) {
  memoire.delete(idPro);
  try {
    const redis = getClient();
    if (redis) await redis.del(cleLimite(idPro));
  } catch (err) {
    logger.warn(`Message des pros : place du jour non rendue pour ${idPro} (${err.message})`);
  }
}

async function evenementsVisibles(models, idPro) {
  return models.Evenement.findAll({
    where: { id_user: idPro, statut: { [Op.in]: STATUTS_EVENEMENT_VISIBLE } },
    attributes: ['id_evenement', 'nom_evenement', 'date_debut'],
    order: [['date_debut', 'DESC']],
    limit: 50,
  });
}

/** Participants de ses événements qui ne le suivent pas encore (message « Abonnez-vous ») */
async function participantsNonAbonnes(models, idPro) {
  const evenements = await models.Evenement.findAll({ where: { id_user: idPro }, attributes: ['id_evenement'], raw: true });
  if (!evenements.length) return [];
  const inscrits = await models.EvenementUser.findAll({
    where: {
      id_evenement: evenements.map(e => e.id_evenement),
      statut_participation: { [Op.in]: ['inscrit', 'confirme', 'present'] },
    },
    attributes: ['id_user'],
    raw: true,
  });
  const abonnes = await models.SuiviProfessionnel.findAll({ where: { id_professionnel: idPro }, attributes: ['id_user'], raw: true });
  const deja = new Set(abonnes.map(a => a.id_user));
  return [...new Set(inscrits.map(i => i.id_user))].filter(id => id !== idPro && !deja.has(id));
}

/** Ce que le professionnel peut envoyer : nombres de destinataires, contenus, prochain envoi possible */
async function options(models, idPro) {
  const [abonnes, participants, oeuvres, evenements, dernier] = await Promise.all([
    models.SuiviProfessionnel.count({ where: { id_professionnel: idPro } }),
    participantsNonAbonnes(models, idPro),
    models.Oeuvre.findAll({
      where: { saisi_par: idPro, statut: 'publie' },
      attributes: ['id_oeuvre', 'titre'],
      order: [['date_creation', 'DESC']],
      limit: 50,
    }),
    evenementsVisibles(models, idPro),
    dernierEnvoi(idPro),
  ]);
  return {
    abonnes,
    participants: participants.length,
    oeuvres,
    evenements,
    prochain_envoi: dernier && Date.now() - dernier < DELAI_SECONDES * 1000 ? new Date(dernier + DELAI_SECONDES * 1000).toISOString() : null,
  };
}

async function creerPourPersonnes(models, ids, fabrique) {
  let prevenus = 0;
  for (let i = 0; i < ids.length; i += TAILLE_LOT) {
    const personnes = await models.User.findAll({
      where: { id_user: ids.slice(i, i + TAILLE_LOT), statut: 'actif', notifications_favoris: { [Op.ne]: false } },
      attributes: ['id_user', 'prenom', 'langue_preferee'],
      raw: true,
    });
    if (personnes.length) {
      await models.Notification.bulkCreate(personnes.map(fabrique));
      prevenus += personnes.length;
    }
  }
  return prevenus;
}

/** Envoi d'un message déjà rédigé. Le contenu choisi doit lui appartenir et être publié. */
async function envoyer(models, idPro, { modele, id_oeuvre: idOeuvre, id_evenement: idEvenement }) {
  if (!['oeuvre', 'evenement', 'profil', 'suivre'].includes(modele)) throw erreur('Message inconnu', 400);

  if (!(await reserverEnvoi(idPro))) {
    throw erreur('Vous avez déjà envoyé un message aujourd’hui. Vous pourrez en envoyer un autre demain.', 429);
  }
  try {
    return await envoyerReserve(models, idPro, modele, idOeuvre, idEvenement);
  } catch (err) {
    // Rendue seulement si rien n'est parti (contenu introuvable, aucun abonné : erreur 400). Une panne au
    // milieu de l'envoi garde la place : sinon un nouvel envoi doublerait les notifications déjà créées.
    if (err?.statusCode === 400) await libererEnvoi(idPro);
    throw err;
  }
}

async function envoyerReserve(models, idPro, modele, idOeuvre, idEvenement) {
  const pro = await models.User.findByPk(idPro, { attributes: ['nom', 'prenom'] });
  const qui = nomComplet(pro) || 'Tala DZ';
  let titreContenu = '';
  let url = `/professionnels/${idPro}`;
  let metadata = { id_professionnel: idPro, modele };

  if (modele === 'oeuvre') {
    const oeuvre = await models.Oeuvre.findOne({ where: { id_oeuvre: idOeuvre ?? 0, saisi_par: idPro, statut: 'publie' }, attributes: ['id_oeuvre', 'titre', 'id_type_oeuvre'] });
    if (!oeuvre) throw erreur('Choisissez une de vos œuvres publiées', 400);
    titreContenu = texteLisible(oeuvre.titre);
    url = lienOeuvre(oeuvre);
    metadata = { ...metadata, id_oeuvre: oeuvre.id_oeuvre };
  }
  if (modele === 'evenement') {
    const evenement = await models.Evenement.findOne({ where: { id_evenement: idEvenement ?? 0, id_user: idPro, statut: { [Op.in]: STATUTS_EVENEMENT_VISIBLE } }, attributes: ['id_evenement', 'nom_evenement'] });
    if (!evenement) throw erreur('Choisissez un de vos événements publiés', 400);
    titreContenu = texteLisible(evenement.nom_evenement);
    url = `/evenements/${evenement.id_evenement}`;
    metadata = { ...metadata, id_evenement: evenement.id_evenement };
  }

  let ids;
  if (modele === 'suivre') {
    ids = await participantsNonAbonnes(models, idPro);
  } else {
    const lignes = await models.SuiviProfessionnel.findAll({ where: { id_professionnel: idPro }, attributes: ['id_user'], raw: true });
    ids = lignes.map(l => l.id_user);
  }
  if (!ids.length) throw erreur(modele === 'suivre' ? 'Aucun participant à inviter pour le moment' : 'Vous n’avez pas encore d’abonnés', 400);

  const prevenus = await creerPourPersonnes(models, ids, (personne) => ({
    id_user: personne.id_user,
    type_notification: 'autre',
    ...composer(modele, personne, qui, titreContenu),
    url_action: url,
    metadata,
    priorite: 'normale',
    lu: false,
    email_envoye: false,
  }));
  await noterEnvoi(idPro);
  logger.info(`Message « ${modele} » du professionnel ${idPro} : ${prevenus} personne(s) prévenue(s)`);
  return { prevenus };
}

/** Quelqu'un commente : l'auteur du contenu et, pour une réponse, l'auteur du commentaire de départ */
async function prevenirCommentaire(models, { idAuteurCommentaire, idParent, oeuvreId, evenementId }) {
  try {
    const contenu = oeuvreId
      ? await models.Oeuvre.findByPk(oeuvreId, { attributes: ['id_oeuvre', 'titre', 'saisi_par', 'id_type_oeuvre'] })
      : await models.Evenement.findByPk(evenementId, { attributes: ['id_evenement', 'nom_evenement', 'id_user'] });
    if (!contenu) return 0;
    const parent = idParent ? await models.Commentaire.findByPk(idParent, { attributes: ['id_user'] }) : null;
    const auteurContenu = oeuvreId ? contenu.saisi_par : contenu.id_user;
    const ids = [...new Set([auteurContenu, parent?.id_user].filter(Boolean))].filter(id => id !== idAuteurCommentaire);
    if (!ids.length) return 0;

    const qui = nomComplet(await models.User.findByPk(idAuteurCommentaire, { attributes: ['nom', 'prenom'] })) || 'Quelqu’un';
    const titre = texteLisible(oeuvreId ? contenu.titre : contenu.nom_evenement);
    const url = oeuvreId ? lienOeuvre(contenu) : `/evenements/${contenu.id_evenement}`;
    const personnes = await models.User.findAll({
      where: { id_user: ids, statut: 'actif', notifications_commentaires: { [Op.ne]: false } },
      attributes: ['id_user', 'langue_preferee'],
      raw: true,
    });
    if (!personnes.length) return 0;
    const PHRASES = {
      fr: (r) => ({ titre: 'Nouveau commentaire', message: r ? `${qui} a répondu à votre commentaire sur « ${titre} ».` : `${qui} a commenté « ${titre} ».` }),
      en: (r) => ({ titre: 'New comment', message: r ? `${qui} replied to your comment on “${titre}”.` : `${qui} commented on “${titre}”.` }),
      ar: (r) => ({ titre: 'تعليق جديد', message: r ? `ردّ ${qui} على تعليقك على «${titre}».` : `علّق ${qui} على «${titre}».` }),
    };
    await models.Notification.bulkCreate(personnes.map(p => ({
      id_user: p.id_user,
      type_notification: 'nouveau_commentaire',
      ...(PHRASES[String(p.langue_preferee || 'fr').slice(0, 2)] || PHRASES.fr)(p.id_user !== auteurContenu),
      url_action: url,
      priorite: 'normale',
      lu: false,
      email_envoye: false,
    })));
    return personnes.length;
  } catch (err) {
    logger.warn(`Commentaire non signalé : ${err.message}`);
    return 0;
  }
}

/** Un nouvel abonné : le professionnel le sait, sans son nom */
async function prevenirNouvelAbonne(models, idPro) {
  try {
    const pro = await models.User.findByPk(idPro, { attributes: ['langue_preferee', 'notifications_favoris'] });
    if (!pro || pro.notifications_favoris === false) return;
    const textes = {
      fr: ['Nouvel abonné', 'Une personne vient de s’abonner à votre profil.'],
      en: ['New follower', 'Someone has just followed your profile.'],
      ar: ['متابع جديد', 'بدأ شخص بمتابعة صفحتك.'],
    };
    const [titre, message] = textes[String(pro.langue_preferee || 'fr').slice(0, 2)] || textes.fr;
    await models.Notification.create({
      id_user: idPro, type_notification: 'autre', titre, message, url_action: '/dashboard-pro', priorite: 'normale', lu: false, email_envoye: false,
    });
  } catch (err) {
    logger.warn(`Nouvel abonné non signalé : ${err.message}`);
  }
}

module.exports = { options, envoyer, composer, prevenirCommentaire, prevenirNouvelAbonne, nomComplet, lienOeuvre };
