/**
 * Transformer un événement créé par erreur en activité d'un autre événement du même organisateur
 * (2026-11-17 : un organisateur avait créé un second événement au lieu d'ajouter une activité au
 * programme du premier). Modération seulement, sur le modèle de la fusion des organisations :
 * un résumé avant confirmation, puis tout dans une transaction.
 *
 * Ce qui est déplacé vers l'événement gardé : ses activités (ou, s'il n'en a pas, une activité faite
 * de son titre, sa description, son jour, ses heures et son lieu), photos et documents, inscrits
 * (sans doublon : une personne déjà inscrite garde son inscription), œuvres présentées, commentaires,
 * liens, messages aux participants, favoris et vues. L'événement en double est ensuite supprimé ;
 * ses inscrits sont prévenus par l'appelant (décision de la responsable : toujours prévenir).
 */
const { texteLisible } = require('../../helpers/i18n');
const { EVENEMENT_PUBLIC } = require('../../constants/statuts');

const UNE_HEURE = 60 * 60 * 1000;
const STATUTS_A_PREVENIR = ['inscrit', 'confirme', 'present'];
/** Événements qui peuvent recevoir l'activité : publics et non annulés (pas de brouillon ni d'attente) */
const CIBLES_POSSIBLES = EVENEMENT_PUBLIC.filter((st) => st !== 'annule');
/** Force d'une inscription : quand une personne est inscrite aux deux, la plus forte est gardée */
const FORCE = { present: 5, confirme: 4, inscrit: 3, absent: 2, invitation: 1, annule: 0 };
const force = (l) => (FORCE[l.statut_participation] ?? 0) * 2 + (l.date_paiement ? 1 : 0);

function erreur(message, statusCode, code) {
  return Object.assign(new Error(message), { statusCode, code });
}

/** Jour et heure d'Algérie (UTC+1) d'une date d'événement ; heure nulle pour un jour « sans heure » */
function jourEtHeure(valeur) {
  const d = valeur ? new Date(valeur) : null;
  if (!d || Number.isNaN(d.getTime())) return { jour: null, heure: null };
  const sansHeure = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (sansHeure) return { jour: d.toISOString().slice(0, 10), heure: null };
  const local = new Date(d.getTime() + UNE_HEURE).toISOString();
  return { jour: local.slice(0, 10), heure: `${local.slice(11, 16)}:00` };
}

const lireObjet = (v) => {
  if (v && typeof v === 'object') return v;
  try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch { return v ? { fr: String(v) } : {}; }
};

/** Activité faite de l'événement en double (la description est exigée en français ou en arabe) */
function activiteDepuis(source, idCible, ordre) {
  const titre = lireObjet(source.nom_evenement);
  const description = lireObjet(source.description);
  const debut = jourEtHeure(source.date_debut);
  const fin = jourEtHeure(source.date_fin);
  return {
    id_evenement: idCible,
    titre,
    description: (description.fr || description.ar) ? description : { ...description, fr: texteLisible(titre) || 'Activité' },
    id_lieu: source.id_lieu || null,
    date_programme: debut.jour,
    heure_debut: debut.heure,
    // Heure de fin gardée seulement le même jour (une activité tient en une journée)
    heure_fin: fin.heure && fin.jour === debut.jour ? fin.heure : null,
    ordre,
    statut: 'planifie',
    type_activite: 'autre'
  };
}

async function lirePaire(models, idSource, idCible, options = {}) {
  const source = Number(idSource);
  const cible = Number(idCible);
  if (!source || !cible) throw erreur('Choisissez l’événement qui recevra l’activité', 400, 'CIBLE_MANQUANTE');
  if (source === cible) throw erreur('Choisissez un autre événement que celui à transformer', 400, 'MEME_EVENEMENT');
  // Verrous pris par numéro croissant : deux transformations croisées ne s'attendent pas l'une l'autre
  const lignes = await models.Evenement.findAll({
    where: { id_evenement: [source, cible] }, order: [['id_evenement', 'ASC']], ...options
  });
  const src = lignes.find((e) => e.id_evenement === source);
  const dst = lignes.find((e) => e.id_evenement === cible);
  if (!src || !dst) throw erreur('Événement introuvable', 404, 'NOT_FOUND');
  if (!src.id_user || Number(src.id_user) !== Number(dst.id_user)) {
    throw erreur('Les deux événements doivent avoir le même organisateur', 400, 'ORGANISATEURS_DIFFERENTS');
  }
  if (dst.statut === 'annule') throw erreur('L’événement choisi est annulé : choisissez-en un autre', 400, 'CIBLE_ANNULEE');
  if (!CIBLES_POSSIBLES.includes(dst.statut)) {
    throw erreur('L’événement choisi n’est pas encore public : publiez-le d’abord', 400, 'CIBLE_NON_PUBLIQUE');
  }
  return { src, dst };
}

/** Autres événements du même organisateur, non annulés, les plus récents d'abord */
async function cibles(models, idSource) {
  const src = await models.Evenement.findByPk(Number(idSource), { attributes: ['id_evenement', 'id_user'] });
  if (!src) throw erreur('Événement introuvable', 404, 'NOT_FOUND');
  if (!src.id_user) return [];
  const { Op } = require('sequelize');
  return models.Evenement.findAll({
    where: { id_user: src.id_user, id_evenement: { [Op.ne]: src.id_evenement }, statut: CIBLES_POSSIBLES },
    attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'date_fin', 'statut'],
    order: [['date_debut', 'DESC']], limit: 50, raw: true
  });
}

/** Ce que la transformation va déplacer (affiché avant confirmation) */
async function apercu(models, idSource, idCible) {
  const { src, dst } = await lirePaire(models, idSource, idCible);
  const { Programme, Media, EvenementUser } = models;
  const [activites, photos, inscriptions, dejaInscrits] = await Promise.all([
    Programme.count({ where: { id_evenement: src.id_evenement } }),
    Media ? Media.count({ where: { id_evenement: src.id_evenement } }) : 0,
    EvenementUser.findAll({ where: { id_evenement: src.id_evenement }, attributes: ['id_user', 'statut_participation'], raw: true }),
    EvenementUser.findAll({ where: { id_evenement: dst.id_evenement }, attributes: ['id_user'], raw: true })
  ]);
  const deja = new Set(dejaInscrits.map((l) => l.id_user));
  return {
    source: { id_evenement: src.id_evenement, nom_evenement: src.nom_evenement, date_debut: src.date_debut },
    cible: { id_evenement: dst.id_evenement, nom_evenement: dst.nom_evenement, date_debut: dst.date_debut },
    // Sans activité, l'événement en double devient une activité
    activites: activites || 1,
    photos,
    inscrits: inscriptions.filter((l) => !deja.has(l.id_user)).length,
    dejaInscrits: inscriptions.filter((l) => deja.has(l.id_user)).length
  };
}

/**
 * Déplace une table de liaison à clé unique. Quand la ligne existe des deux côtés, `garderSource(src, dst)`
 * décide laquelle reste (par défaut celle de l'événement gardé) ; l'autre est supprimée.
 */
async function deplacerSansDoublon(modele, idSource, idCible, cle, transaction, garderSource = () => false) {
  if (!modele) return;
  const gardees = new Map((await modele.findAll({ where: { id_evenement: idCible }, transaction })).map((l) => [l[cle], l]));
  for (const ligne of await modele.findAll({ where: { id_evenement: idSource }, transaction })) {
    const deja = gardees.get(ligne[cle]);
    if (deja && !garderSource(ligne, deja)) { await ligne.destroy({ transaction }); continue; }
    if (deja) await deja.destroy({ transaction });
    await ligne.update({ id_evenement: idCible }, { transaction });
  }
}

/**
 * @returns {Promise<{ cible: object, aPrevenir: number[], nomSource: string }>}
 */
async function transformer(models, idSource, idCible) {
  const { Evenement, Programme, Media, EvenementUser, EvenementOeuvre, Commentaire, LienExterne,
    MessageEvenement, ParcoursLieu, Favori, Vue } = models;

  return Evenement.sequelize.transaction(async (transaction) => {
    const { src, dst } = await lirePaire(models, idSource, idCible, { transaction, lock: transaction.LOCK.UPDATE });
    const s = src.id_evenement;
    const c = dst.id_evenement;
    const deplacer = (modele) => modele && modele.update({ id_evenement: c }, { where: { id_evenement: s }, transaction });

    // 1. Activités : à la suite de celles de l'événement gardé
    const suivant = ((await Programme.max('ordre', { where: { id_evenement: c }, transaction })) || 0) + 1;
    const activites = await Programme.findAll({ where: { id_evenement: s }, order: [['ordre', 'ASC'], ['id_programme', 'ASC']], transaction });
    let nouvelle = null;
    if (activites.length) {
      for (const [i, activite] of activites.entries()) await activite.update({ id_evenement: c, ordre: suivant + i }, { transaction });
    } else {
      nouvelle = await Programme.create(activiteDepuis(src, c, suivant), { transaction });
    }

    // 2. Photos et documents : rattachés à la nouvelle activité quand ils n'avaient pas de jour
    if (Media) {
      if (nouvelle) await Media.update({ id_programme: nouvelle.id_programme }, { where: { id_evenement: s, id_programme: null }, transaction });
      await deplacer(Media);
    }

    // 3. Inscrits : une personne inscrite aux deux garde l'inscription la plus forte (présente, confirmée,
    //    inscrite… et, à force égale, celle qui est payée) ; puis les œuvres
    const aPrevenir = (await EvenementUser.findAll({
      where: { id_evenement: s, statut_participation: STATUTS_A_PREVENIR }, attributes: ['id_user'], raw: true, transaction
    })).map((l) => l.id_user);
    await deplacerSansDoublon(EvenementUser, s, c, 'id_user', transaction, (a, b) => force(a) > force(b));
    // Articles et œuvres de l'événement en double : affichés sous l'activité qu'il devient
    if (nouvelle && EvenementOeuvre?.rawAttributes?.id_programme) {
      await EvenementOeuvre.update({ id_programme: nouvelle.id_programme }, { where: { id_evenement: s, id_programme: null }, transaction });
    }
    await deplacerSansDoublon(EvenementOeuvre, s, c, 'id_oeuvre', transaction);

    // 4. Commentaires, liens, messages aux participants, parcours
    for (const modele of [Commentaire, LienExterne, MessageEvenement, ParcoursLieu]) await deplacer(modele);

    // 5. Favoris (un seul par personne) et vues
    if (Favori) {
      const ont = new Set((await Favori.findAll({ where: { type_entite: 'evenement', id_entite: c }, attributes: ['id_user'], raw: true, transaction }))
        .map((f) => f.id_user));
      for (const favori of await Favori.findAll({ where: { type_entite: 'evenement', id_entite: s }, transaction })) {
        if (!ont.has(favori.id_user)) await favori.update({ id_entite: c }, { transaction });
      }
    }
    // Une même session a pu voir les deux : IGNORE laisse ces vues-là, effacées avec l'événement en double
    if (Vue) {
      await Evenement.sequelize.query(`UPDATE IGNORE \`${Vue.getTableName()}\` SET id_entite = :c WHERE type_entite = 'evenement' AND id_entite = :s`,
        { replacements: { c, s }, transaction });
    }

    // 6. L'événement en double disparaît (ses mots-clés, liens d'organisation et signalements avec lui)
    const nomSource = texteLisible(src.nom_evenement);
    await src.destroy({ transaction });
    return { cible: dst, aPrevenir: [...new Set(aPrevenir)], nomSource };
  });
}

module.exports = { cibles, apercu, transformer, jourEtHeure, activiteDepuis, force, CIBLES_POSSIBLES };
