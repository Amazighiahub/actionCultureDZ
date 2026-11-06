/**
 * Paiement direct au professionnel : Tala DZ affiche ses moyens de paiement et garde la trace de la
 * réservation, mais n'encaisse rien et ne prend aucune commission. L'argent va de l'acheteur au
 * professionnel ; c'est le professionnel qui confirme l'avoir reçu.
 */
const AppError = require('../utils/appError');
const { texteLisible } = require('../helpers/i18n');
const { notifier } = require('../utils/notifierModeration');

const texte = (v, max, champ) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw AppError.badRequest(`${champ} invalide`);
  const t = v.trim();
  if (t.length > max) throw AppError.badRequest(`${champ} : ${max} caractères au plus`);
  return t || null;
};
const chiffres = (v, champ, min, max) => {
  const t = texte(v, 40, champ);
  if (!t) return null;
  const c = t.replace(/[\s.-]/g, '');
  if (!/^\d+$/.test(c) || c.length < min || c.length > max) {
    throw AppError.badRequest(min === max ? `${champ} : ${min} chiffres` : `${champ} : de ${min} à ${max} chiffres`);
  }
  return c;
};

/** Montant en DA (0 : gratuit ; vide : null) */
const montant = (v, champ) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1000000) throw AppError.badRequest(`${champ} : montant invalide`);
  return Math.round(n * 100) / 100;
};

/**
 * Moyens saisis par le professionnel → valeur enregistrée (null s'il n'a rien indiqué)
 * { titulaire, baridimob_rip, ccp_numero, ccp_cle, especes, lien_url, lien_libelle, consignes,
 *   envoi_algerie, envoi_etranger, main_propre }  (frais d'envoi des commandes, en DA ; null : pas d'envoi)
 */
function normaliserMoyens(entree) {
  if (entree === null) return null;
  if (typeof entree !== 'object' || Array.isArray(entree)) throw AppError.badRequest('Moyens de paiement invalides');
  const m = {
    titulaire: texte(entree.titulaire, 100, 'Titulaire du compte'),
    // RIP BaridiMob : 20 chiffres ; CCP : numéro et clé
    baridimob_rip: chiffres(entree.baridimob_rip, 'RIP BaridiMob', 20, 20),
    ccp_numero: chiffres(entree.ccp_numero, 'Numéro de CCP', 6, 12),
    ccp_cle: chiffres(entree.ccp_cle, 'Clé du CCP', 2, 2),
    especes: entree.especes === true,
    lien_url: texte(entree.lien_url, 500, 'Lien de paiement'),
    lien_libelle: texte(entree.lien_libelle, 60, 'Nom du lien'),
    consignes: texte(entree.consignes, 500, 'Consignes'),
    // Commandes de livres, d'œuvres d'art et d'artisanat : frais d'envoi et remise en main propre
    envoi_algerie: montant(entree.envoi_algerie, 'Frais d’envoi en Algérie'),
    envoi_etranger: montant(entree.envoi_etranger, 'Frais d’envoi à l’étranger'),
    main_propre: entree.main_propre === true,
  };
  if (m.lien_url && !/^https:\/\/[^\s]+$/i.test(m.lien_url)) {
    throw AppError.badRequest('Le lien de paiement doit commencer par https://');
  }
  if ((m.ccp_numero && !m.ccp_cle) || (!m.ccp_numero && m.ccp_cle)) {
    throw AppError.badRequest('CCP : indiquez le numéro et la clé');
  }
  const rempli = m.baridimob_rip || m.ccp_numero || m.especes || m.lien_url;
  const autre = m.consignes || m.titulaire || m.envoi_algerie !== null || m.envoi_etranger !== null || m.main_propre;
  if (!rempli) return autre ? { ...m } : null;
  return m;
}

/** Au moins un moyen utilisable par l'acheteur */
const aUnMoyen = (m) => !!(m && (m.baridimob_rip || m.ccp_numero || m.especes || m.lien_url));

const lireMoyens = (v) => {
  if (!v) return null;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
  return v;
};

async function mesMoyens(models, idUser) {
  const u = await models.User.findByPk(idUser, { attributes: ['moyens_paiement'] });
  return lireMoyens(u?.moyens_paiement);
}

async function enregistrerMoyens(models, idUser, entree) {
  const moyens = normaliserMoyens(entree);
  await models.User.update({ moyens_paiement: moyens }, { where: { id_user: idUser } });
  return moyens;
}

const STATUTS_SANS_PAIEMENT = ['invitation', 'annule'];

/**
 * Ce que voit le participant : montant, état du paiement et moyens de l'organisateur.
 * Les coordonnées ne sont montrées qu'aux personnes inscrites (pas en public).
 */
async function paiementDuParticipant(models, idEvenement, idUser) {
  const inscription = await models.EvenementUser.findOne({
    where: { id_evenement: idEvenement, id_user: idUser },
    attributes: ['statut_participation', 'montant_du', 'date_paiement'],
  });
  if (!inscription || STATUTS_SANS_PAIEMENT.includes(inscription.statut_participation)) {
    throw new AppError('Inscription introuvable', 404, 'INSCRIPTION_INTROUVABLE');
  }
  const montant = inscription.montant_du === null ? null : Number(inscription.montant_du);
  if (montant === 0) return { montant: 0, paye: false, date_paiement: null, moyens: null, organisateur: null };
  const evenement = await models.Evenement.findByPk(idEvenement, { attributes: ['id_user'] });
  const organisateur = evenement?.id_user
    ? await models.User.findByPk(evenement.id_user, { attributes: ['id_user', 'nom', 'prenom', 'moyens_paiement'] })
    : null;
  const moyens = lireMoyens(organisateur?.moyens_paiement);
  return {
    montant,
    paye: !!inscription.date_paiement,
    date_paiement: inscription.date_paiement,
    moyens: aUnMoyen(moyens) ? moyens : null,
    organisateur: organisateur
      ? { id: organisateur.id_user, nom: [texteLisible(organisateur.prenom), texteLisible(organisateur.nom)].filter(Boolean).join(' ') }
      : null,
  };
}

/**
 * L'organisateur (ou l'administration) indique qu'il a reçu le paiement, ou corrige une erreur.
 * Une inscription encore « en attente » est confirmée en même temps : le participant est prévenu.
 */
async function confirmerPaiement(models, evenementService, notificationService, { idEvenement, idParticipant, recu, par }) {
  const evenement = await evenementService._assertEventOwnerOrAdmin(idEvenement, par.id, par.isAdmin);
  const inscription = await models.EvenementUser.findOne({ where: { id_evenement: idEvenement, id_user: idParticipant } });
  if (!inscription || STATUTS_SANS_PAIEMENT.includes(inscription.statut_participation)) {
    throw new AppError('Inscription introuvable', 404, 'INSCRIPTION_INTROUVABLE');
  }
  const dejaRecu = !!inscription.date_paiement;
  await inscription.update({ date_paiement: recu ? (inscription.date_paiement || new Date()) : null });
  if (recu && !dejaRecu) {
    if (inscription.statut_participation === 'inscrit') {
      // Même chemin qu'une validation : statut confirmé et message de confirmation au participant
      await evenementService.validateParticipation(idEvenement, idParticipant, true, par, '');
    } else {
      await notifier(notificationService, idParticipant, {
        titre: 'Paiement reçu',
        message: `L’organisateur a bien reçu votre paiement pour « ${texteLisible(evenement.nom_evenement)} ».`,
        url_action: `/evenements/${idEvenement}`,
        metadata: { id_evenement: Number(idEvenement) },
      });
    }
  }
  return { paye: recu, date_paiement: inscription.date_paiement };
}

module.exports = { normaliserMoyens, aUnMoyen, lireMoyens, mesMoyens, enregistrerMoyens, paiementDuParticipant, confirmerPaiement };
