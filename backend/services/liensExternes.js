/**
 * Liens d'un professionnel : articles de presse, YouTube, Instagram, TikTok, Facebook.
 * Simples liens qui ouvrent le site d'origine : aucune vidéo n'est intégrée à Tala DZ.
 * Un lien peut être rattaché à une œuvre (donc aussi un article ou un produit d'artisanat)
 * ou à un événement dont la personne est l'auteur ou un contributeur.
 */
const { Op } = require('sequelize');

const MAX_LIENS = 100;
const { EVENEMENT_PUBLIC: STATUTS_EVENEMENT_PUBLICS } = require('../constants/statuts');
const RESEAUX = {
  youtube: ['youtube.com', 'youtu.be'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  facebook: ['facebook.com', 'fb.com', 'fb.watch'],
};

const erreur = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const texte = (valeur, max) => (typeof valeur === 'string' ? valeur.trim().slice(0, max) : '') || null;

/** Le site du lien donne son type ; tout autre site est traité comme un article de presse */
function typeDepuisUrl(url) {
  const hote = new URL(url).hostname.toLowerCase();
  const reseau = Object.entries(RESEAUX).find(([, domaines]) => domaines.some((d) => hote === d || hote.endsWith(`.${d}`)));
  return reseau ? reseau[0] : 'presse';
}

function urlValide(valeur) {
  const brut = typeof valeur === 'string' ? valeur.trim() : '';
  let url;
  try {
    url = new URL(brut);
  } catch {
    throw erreur('Lien invalide : il doit commencer par https://', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) {
    throw erreur('Lien invalide : il doit commencer par https://', 400);
  }
  if (url.href.length > 500) throw erreur('Ce lien est trop long', 400);
  return url.href;
}

function dateValide(valeur) {
  if (!valeur) return null;
  const correcte = typeof valeur === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valeur)
    && new Date(`${valeur}T00:00:00Z`).toISOString().startsWith(valeur);
  if (!correcte) throw erreur('Date invalide', 400);
  return valeur;
}

const entier = (valeur) => {
  const n = Number(valeur);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Seulement sur ses propres contenus : auteur ou contributeur de l'œuvre, créateur de l'événement */
async function verifierRattachement(models, idUser, idOeuvre, idEvenement) {
  if (idOeuvre && idEvenement) throw erreur('Choisissez une œuvre ou un événement, pas les deux', 400);
  if (idOeuvre) {
    const oeuvre = await models.Oeuvre.findByPk(idOeuvre, { attributes: ['id_oeuvre', 'saisi_par'] });
    const sienne = oeuvre && (Number(oeuvre.saisi_par) === Number(idUser)
      || await models.OeuvreUser.findOne({ where: { id_oeuvre: idOeuvre, id_user: idUser }, attributes: ['id_oeuvre'] }));
    if (!sienne) throw erreur('Vous ne pouvez rattacher un lien qu’à vos propres contenus', 403);
  }
  if (idEvenement) {
    const evenement = await models.Evenement.findOne({ where: { id_evenement: idEvenement, id_user: idUser }, attributes: ['id_evenement'] });
    if (!evenement) throw erreur('Vous ne pouvez rattacher un lien qu’à vos propres contenus', 403);
  }
}

async function preparer(models, idUser, donnees) {
  const url = urlValide(donnees.url);
  const idOeuvre = entier(donnees.id_oeuvre);
  const idEvenement = entier(donnees.id_evenement);
  await verifierRattachement(models, idUser, idOeuvre, idEvenement);
  return {
    url,
    type_lien: typeDepuisUrl(url),
    titre: texte(donnees.titre, 200),
    source: texte(donnees.source, 100),
    date_publication: dateValide(donnees.date_publication),
    id_oeuvre: idOeuvre,
    id_evenement: idEvenement,
  };
}

async function creer(models, idUser, donnees) {
  const valeurs = await preparer(models, idUser, donnees);
  const nombre = await models.LienExterne.count({ where: { id_user: idUser } });
  if (nombre >= MAX_LIENS) throw erreur(`Vous avez atteint la limite de ${MAX_LIENS} liens`, 400);
  const doublon = await models.LienExterne.findOne({
    where: { id_user: idUser, url: valeurs.url, id_oeuvre: valeurs.id_oeuvre, id_evenement: valeurs.id_evenement },
    attributes: ['id_lien'],
  });
  if (doublon) throw erreur('Ce lien est déjà ajouté à cet endroit', 409);
  return models.LienExterne.create({ id_user: idUser, ...valeurs });
}

async function trouverSien(models, idLien, idUser, admin = false) {
  const lien = await models.LienExterne.findByPk(idLien);
  if (!lien || (!admin && Number(lien.id_user) !== Number(idUser))) throw erreur('Lien introuvable', 404);
  return lien;
}

async function modifier(models, idLien, idUser, donnees) {
  const lien = await trouverSien(models, idLien, idUser);
  const valeurs = await preparer(models, idUser, donnees);
  await lien.update(valeurs);
  return lien;
}

/** Le professionnel retire ses liens ; un administrateur peut retirer un lien qui pose problème */
async function supprimer(models, idLien, idUser, admin) {
  const lien = await trouverSien(models, idLien, idUser, admin);
  await lien.destroy();
}

/** Où pointe le rattachement ; seul un contenu visible du public est indiqué */
function cibleDe(ligne, idsArtisanat) {
  const { Oeuvre: oeuvre, Evenement: evenement } = ligne;
  if (oeuvre && oeuvre.statut === 'publie') {
    const idArtisanat = idsArtisanat.get(oeuvre.id_oeuvre);
    if (idArtisanat) return { type: 'artisanat', id: idArtisanat, titre: oeuvre.titre };
    return { type: [4, 5].includes(oeuvre.id_type_oeuvre) ? 'article' : 'oeuvre', id: oeuvre.id_oeuvre, titre: oeuvre.titre };
  }
  if (evenement && STATUTS_EVENEMENT_PUBLICS.includes(evenement.statut)) {
    return { type: 'evenement', id: evenement.id_evenement, titre: evenement.nom_evenement };
  }
  return null;
}

async function lister(models, where, { requis = {} } = {}) {
  const lignes = await models.LienExterne.findAll({
    where,
    attributes: ['id_lien', 'type_lien', 'url', 'titre', 'source', 'date_publication', 'id_oeuvre', 'id_evenement'],
    include: [
      { model: models.Oeuvre, as: 'Oeuvre', attributes: ['id_oeuvre', 'titre', 'statut', 'id_type_oeuvre'], required: false },
      { model: models.Evenement, as: 'Evenement', attributes: ['id_evenement', 'nom_evenement', 'statut'], required: false },
      ...(requis.proprietaireActif
        ? [{ model: models.User, as: 'Proprietaire', attributes: [], required: true, where: { statut: 'actif' } }]
        : []),
    ],
    order: [[models.sequelize.literal('date_publication IS NULL'), 'ASC'], ['date_publication', 'DESC'], ['id_lien', 'DESC']],
    limit: MAX_LIENS,
  });
  const plain = lignes.map((l) => (l.get ? l.get({ plain: true }) : l));
  const idsOeuvres = [...new Set(plain.map((l) => l.Oeuvre?.id_oeuvre).filter(Boolean))];
  const artisanats = idsOeuvres.length && models.Artisanat
    ? await models.Artisanat.findAll({ where: { id_oeuvre: { [Op.in]: idsOeuvres } }, attributes: ['id_artisanat', 'id_oeuvre'], raw: true })
    : [];
  const idsArtisanat = new Map(artisanats.map((a) => [a.id_oeuvre, a.id_artisanat]));
  return plain.map(({ Oeuvre: _o, Evenement: _e, ...lien }, i) => ({ ...lien, cible: cibleDe(plain[i], idsArtisanat) }));
}

const mesLiens = (models, idUser) => lister(models, { id_user: idUser });
const liensDuPortfolio = (models, idUser) => lister(models, { id_user: idUser });

/** Fiche publique d'une œuvre : vide si elle n'est pas publiée */
async function liensDeLOeuvre(models, idOeuvre) {
  const oeuvre = await models.Oeuvre.findOne({ where: { id_oeuvre: idOeuvre, statut: 'publie' }, attributes: ['id_oeuvre'] });
  return oeuvre ? lister(models, { id_oeuvre: idOeuvre }, { requis: { proprietaireActif: true } }) : [];
}

async function liensDeLEvenement(models, idEvenement) {
  const evenement = await models.Evenement.findOne({
    where: { id_evenement: idEvenement, statut: { [Op.in]: STATUTS_EVENEMENT_PUBLICS } },
    attributes: ['id_evenement'],
  });
  return evenement ? lister(models, { id_evenement: idEvenement }, { requis: { proprietaireActif: true } }) : [];
}

/** Ce à quoi la personne peut rattacher un lien, publié ou non */
async function mesContenus(models, idUser) {
  const contributions = (await models.OeuvreUser.findAll({ where: { id_user: idUser }, attributes: ['id_oeuvre'], raw: true })).map((r) => r.id_oeuvre);
  const [oeuvres, evenements] = await Promise.all([
    models.Oeuvre.findAll({
      where: {
        statut: { [Op.ne]: 'rejete' },
        [Op.or]: [{ saisi_par: idUser }, ...(contributions.length ? [{ id_oeuvre: { [Op.in]: contributions } }] : [])],
      },
      attributes: ['id_oeuvre', 'titre'],
      order: [['date_creation', 'DESC']],
      limit: 200,
    }),
    models.Evenement.findAll({
      where: { id_user: idUser },
      attributes: ['id_evenement', 'nom_evenement'],
      order: [['date_debut', 'DESC']],
      limit: 200,
    }),
  ]);
  const plain = (rows) => rows.map((r) => (r.get ? r.get({ plain: true }) : r));
  return { oeuvres: plain(oeuvres), evenements: plain(evenements) };
}

module.exports = {
  MAX_LIENS, STATUTS_EVENEMENT_PUBLICS, typeDepuisUrl, urlValide, creer, modifier, supprimer, mesLiens, liensDuPortfolio, liensDeLOeuvre, liensDeLEvenement, mesContenus,
};
