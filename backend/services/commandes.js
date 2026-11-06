/**
 * Commandes de livres, d'œuvres d'art et d'objets d'artisanat. L'acheteur paie directement le
 * professionnel (BaridiMob, CCP, espèces, lien de paiement) : Tala DZ n'encaisse rien et ne prend
 * aucune commission. Le site garde la trace de la commande et prévient chacun à chaque étape.
 *
 * Confidentialité : l'adresse et le téléphone de l'acheteur ne sont montrés qu'au vendeur ;
 * les coordonnées de paiement du vendeur ne sont montrées qu'à ses acheteurs.
 */
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const { texteLisible } = require('../helpers/i18n');
const { notifier } = require('../utils/notifierModeration');
const { aUnMoyen, lireMoyens } = require('./paiementDirect');

/** Livre, œuvre d'art, artisanat */
const TYPES_COMMANDABLES = [1, 6, 7];
const QUANTITE_MAX = 20;
/** Commandes en attente par acheteur, tous vendeurs confondus (évite les commandes en masse) */
const EN_ATTENTE_MAX = 10;
const URL_COMMANDES = '/mes-commandes';

const nomDe = (u) => (u ? [texteLisible(u.prenom), texteLisible(u.nom)].filter(Boolean).join(' ') : '');
const nombre = (v) => (v === null || v === undefined ? null : Number(v));
const arrondi = (n) => Math.round(n * 100) / 100;

const texte = (v, max, champ) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw AppError.badRequest(`${champ} invalide`);
  const t = v.trim().replace(/\r\n?/g, '\n');
  if (t.length > max) throw AppError.badRequest(`${champ} : ${max} caractères au plus`);
  return t || null;
};

/** Modes de livraison proposés par le vendeur (frais en DA ; « à convenir » s'il n'a rien indiqué) */
function optionsLivraison(moyens) {
  const o = {};
  if (moyens?.envoi_algerie !== null && moyens?.envoi_algerie !== undefined) o.algerie = Number(moyens.envoi_algerie);
  if (moyens?.envoi_etranger !== null && moyens?.envoi_etranger !== undefined) o.etranger = Number(moyens.envoi_etranger);
  if (moyens?.main_propre) o.main_propre = 0;
  if (!Object.keys(o).length) o.a_convenir = null;
  return o;
}

/**
 * Ce qu'il faut savoir pour commander une œuvre : prix, livraison, vendeur.
 * Rien de privé (ni coordonnées de paiement, ni adresse) : la réponse est publique.
 */
async function offre(models, idOeuvre) {
  const oeuvre = await models.Oeuvre.findByPk(idOeuvre, {
    attributes: ['id_oeuvre', 'titre', 'statut', 'id_type_oeuvre', 'prix', 'saisi_par'],
  });
  if (!oeuvre || oeuvre.statut !== 'publie') return { commandable: false, raison: 'introuvable' };
  if (!TYPES_COMMANDABLES.includes(oeuvre.id_type_oeuvre)) return { commandable: false, raison: 'type' };

  let prix = nombre(oeuvre.prix);
  let prixMax = null;
  let stock = null;
  if (oeuvre.id_type_oeuvre === 7 && models.Artisanat) {
    const a = await models.Artisanat.findOne({
      where: { id_oeuvre: oeuvre.id_oeuvre }, attributes: ['prix', 'prix_max', 'en_stock', 'sur_commande'],
    });
    if (a) {
      prix = nombre(a.prix) ?? prix;
      prixMax = nombre(a.prix_max);
      if (a.en_stock !== null && a.en_stock !== undefined && !a.sur_commande) stock = Number(a.en_stock);
    }
  }
  // Le vendeur : le compte qui a déposé l'œuvre
  const idVendeur = oeuvre.saisi_par;
  const vendeur = idVendeur
    ? await models.User.findByPk(idVendeur, { attributes: ['id_user', 'nom', 'prenom', 'moyens_paiement'] })
    : null;
  const moyens = lireMoyens(vendeur?.moyens_paiement);
  const base = {
    id_oeuvre: oeuvre.id_oeuvre,
    titre: texteLisible(oeuvre.titre),
    prix, prix_max: prixMax && prix !== null && prixMax > prix ? prixMax : null,
    stock,
    vendeur: vendeur ? { id: vendeur.id_user, nom: nomDe(vendeur) } : null,
  };
  if (!prix || prix <= 0) return { ...base, commandable: false, raison: 'sans_prix' };
  if (!vendeur || !aUnMoyen(moyens)) return { ...base, commandable: false, raison: 'sans_moyen' };
  if (stock === 0) return { ...base, commandable: false, raison: 'epuise' };
  return { ...base, commandable: true, livraison: optionsLivraison(moyens) };
}

/** L'acheteur commande : le vendeur est prévenu et l'acheteur voit comment le payer */
async function commander(models, notificationService, idAcheteur, entree = {}) {
  const idOeuvre = Number(entree.id_oeuvre);
  if (!Number.isInteger(idOeuvre) || idOeuvre <= 0) throw AppError.badRequest('Œuvre invalide');
  const o = await offre(models, idOeuvre);
  if (!o.commandable) {
    const messages = {
      introuvable: 'Cette œuvre n’est pas disponible.',
      type: 'Cette œuvre ne se commande pas en ligne.',
      sans_prix: 'Cette œuvre n’a pas de prix : contactez directement son auteur.',
      sans_moyen: 'Le vendeur n’a pas encore indiqué comment le payer.',
      epuise: 'Cette œuvre n’est plus en stock.',
    };
    throw AppError.badRequest(messages[o.raison] || 'Commande impossible', 'COMMANDE_IMPOSSIBLE');
  }
  if (o.vendeur.id === Number(idAcheteur)) throw AppError.badRequest('Vous ne pouvez pas commander votre propre œuvre.', 'COMMANDE_PROPRE');

  const quantite = entree.quantite === undefined ? 1 : Number(entree.quantite);
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) {
    throw AppError.badRequest(`Quantité : de 1 à ${QUANTITE_MAX}`);
  }
  if (o.stock !== null && quantite > o.stock) throw AppError.badRequest(`Il en reste ${o.stock} seulement.`);

  const livraison = String(entree.livraison || '');
  if (!Object.prototype.hasOwnProperty.call(o.livraison, livraison)) throw AppError.badRequest('Mode de livraison invalide');
  const adresse = texte(entree.adresse, 500, 'Adresse');
  if ((livraison === 'algerie' || livraison === 'etranger') && !adresse) {
    throw AppError.badRequest('Indiquez l’adresse de livraison.');
  }
  const telephone = texte(entree.telephone, 30, 'Téléphone');
  if (telephone && !/^[+\d][\d\s.()-]{5,29}$/.test(telephone)) throw AppError.badRequest('Téléphone invalide');
  const message = texte(entree.message, 1000, 'Message');

  const enAttente = await models.Commande.count({ where: { id_acheteur: idAcheteur, statut: 'en_attente' } });
  if (enAttente >= EN_ATTENTE_MAX) {
    throw AppError.badRequest('Vous avez déjà plusieurs commandes en attente : attendez qu’elles soient traitées.', 'COMMANDES_EN_ATTENTE');
  }
  const doublon = await models.Commande.findOne({
    where: { id_acheteur: idAcheteur, id_oeuvre: idOeuvre, statut: 'en_attente' }, attributes: ['id_commande'],
  });
  if (doublon) throw AppError.conflict('Vous avez déjà une commande en attente pour cette œuvre.', 'COMMANDE_DOUBLON');

  const frais = o.livraison[livraison];
  const montant = arrondi(o.prix * quantite + (frais || 0));
  const commande = await models.Commande.create({
    id_oeuvre: idOeuvre,
    titre: (o.titre || 'Œuvre').slice(0, 255),
    id_vendeur: o.vendeur.id,
    id_acheteur: idAcheteur,
    quantite,
    prix_unitaire: o.prix,
    prix_a_confirmer: o.prix_max !== null,
    frais_envoi: frais,
    montant_total: montant,
    livraison,
    adresse: livraison === 'main_propre' ? null : adresse,
    telephone,
    message,
  });

  const acheteur = await models.User.findByPk(idAcheteur, { attributes: ['nom', 'prenom'] });
  await notifier(notificationService, o.vendeur.id, {
    titre: 'Nouvelle commande',
    message: `${nomDe(acheteur) || 'Un visiteur'} commande « ${o.titre} »${quantite > 1 ? ` (× ${quantite})` : ''}. Il va vous payer directement ; confirmez le paiement quand vous l’avez reçu.`,
    url_action: URL_COMMANDES,
    metadata: { id_commande: commande.id_commande, id_oeuvre: idOeuvre },
  });
  return detail(models, commande.id_commande, { id: idAcheteur, isAdmin: false });
}

const INCLURE = (models) => [
  { model: models.User, as: 'Vendeur', attributes: ['id_user', 'nom', 'prenom', 'moyens_paiement'] },
  { model: models.User, as: 'Acheteur', attributes: ['id_user', 'nom', 'prenom', 'email'] },
];

/** Ce que voit chacun : l'acheteur les moyens de paiement, le vendeur l'adresse de livraison */
function vue(c, idUser, isAdmin) {
  const estVendeur = c.id_vendeur === Number(idUser) || isAdmin;
  const estAcheteur = c.id_acheteur === Number(idUser);
  const moyens = lireMoyens(c.Vendeur?.moyens_paiement);
  const r = {
    id_commande: c.id_commande,
    id_oeuvre: c.id_oeuvre,
    titre: c.titre,
    quantite: c.quantite,
    prix_unitaire: nombre(c.prix_unitaire),
    prix_a_confirmer: !!c.prix_a_confirmer,
    frais_envoi: nombre(c.frais_envoi),
    montant_total: nombre(c.montant_total),
    livraison: c.livraison,
    message: c.message,
    statut: c.statut,
    date_creation: c.date_creation,
    date_paiement: c.date_paiement,
    date_envoi: c.date_envoi,
    date_annulation: c.date_annulation,
    annulee_par: c.annulee_par,
    role: estAcheteur && !isAdmin ? 'acheteur' : 'vendeur',
    vendeur: { id: c.id_vendeur, nom: nomDe(c.Vendeur) },
    acheteur: { id: c.id_acheteur, nom: nomDe(c.Acheteur) },
  };
  if (estVendeur) {
    r.adresse = c.adresse;
    r.telephone = c.telephone;
    r.acheteur.email = c.Acheteur?.email || null;
  }
  // Coordonnées de paiement : seulement tant que l'acheteur doit payer
  if (estAcheteur && c.statut === 'en_attente' && aUnMoyen(moyens)) {
    // Les frais d'envoi sont déjà dans la commande : seulement de quoi payer
    const CLES = ['titulaire', 'baridimob_rip', 'ccp_numero', 'ccp_cle', 'especes', 'lien_url', 'lien_libelle', 'consignes'];
    r.moyens = Object.fromEntries(CLES.filter((k) => moyens[k] !== undefined).map((k) => [k, moyens[k]]));
  }
  if (estAcheteur) {
    r.adresse = c.adresse;
    r.telephone = c.telephone;
  }
  return r;
}

async function chercher(models, idCommande, par) {
  const c = await models.Commande.findByPk(idCommande, { include: INCLURE(models) });
  if (!c) throw AppError.notFound('Commande', 'COMMANDE_INTROUVABLE');
  const autorise = par.isAdmin || c.id_vendeur === Number(par.id) || c.id_acheteur === Number(par.id);
  if (!autorise) throw AppError.notFound('Commande', 'COMMANDE_INTROUVABLE');
  return c;
}

async function detail(models, idCommande, par) {
  return vue(await chercher(models, idCommande, par), par.id, par.isAdmin);
}

/** Achats (role acheteur) ou ventes (role vendeur), les plus récentes d'abord */
async function liste(models, idUser, role) {
  const where = role === 'ventes' ? { id_vendeur: idUser } : { id_acheteur: idUser };
  const lignes = await models.Commande.findAll({
    where, include: INCLURE(models), order: [['date_creation', 'DESC']], limit: 200,
  });
  return lignes.map((c) => vue(c, idUser, false));
}

/** Nombre de ventes à traiter (en attente de paiement ou à envoyer) */
async function ventesATraiter(models, idUser) {
  return models.Commande.count({ where: { id_vendeur: idUser, statut: { [Op.in]: ['en_attente', 'payee'] } } });
}

/**
 * Étapes d'une commande :
 * - le vendeur : « paiement reçu » (en_attente → payee), « envoyée » (payee → envoyee), annuler ;
 *   il peut aussi fixer le montant tant que la commande attend le paiement (prix à confirmer, frais à convenir)
 * - l'acheteur : annuler tant qu'il n'a pas payé
 */
async function mettreAJour(models, notificationService, idCommande, par, entree = {}) {
  const c = await chercher(models, idCommande, par);
  const estVendeur = par.isAdmin || c.id_vendeur === Number(par.id);
  const estAcheteur = c.id_acheteur === Number(par.id);
  const statut = entree.statut;
  const maintenant = new Date();

  if (entree.montant_total !== undefined) {
    if (!estVendeur) throw AppError.forbidden('Seul le vendeur fixe le montant');
    if (c.statut !== 'en_attente') throw AppError.badRequest('Le montant ne change plus après le paiement');
    const m = Number(entree.montant_total);
    if (!Number.isFinite(m) || m <= 0 || m > 100000000) throw AppError.badRequest('Montant invalide');
    await c.update({ montant_total: arrondi(m), prix_a_confirmer: false });
    await notifier(notificationService, c.id_acheteur, {
      titre: 'Montant de votre commande',
      message: `Le vendeur a fixé le montant de « ${c.titre} » : ${arrondi(m)} DA.`,
      url_action: URL_COMMANDES, metadata: { id_commande: c.id_commande },
    });
  }

  if (statut !== undefined) {
    const passages = {
      payee: { de: ['en_attente'], qui: estVendeur },
      envoyee: { de: ['payee'], qui: estVendeur },
      annulee: { de: estVendeur ? ['en_attente', 'payee'] : ['en_attente'], qui: estVendeur || estAcheteur },
    };
    const p = passages[statut];
    if (!p) throw AppError.badRequest('Étape invalide');
    if (!p.qui) throw AppError.forbidden('Action réservée au vendeur');
    if (!p.de.includes(c.statut)) throw AppError.badRequest('Cette étape n’est plus possible pour cette commande', 'ETAPE_IMPOSSIBLE');

    if (statut === 'payee') {
      await c.update({ statut, date_paiement: maintenant });
      await notifier(notificationService, c.id_acheteur, {
        titre: 'Paiement reçu',
        message: `Le vendeur a bien reçu votre paiement pour « ${c.titre} ».`,
        url_action: URL_COMMANDES, metadata: { id_commande: c.id_commande },
      });
    } else if (statut === 'envoyee') {
      await c.update({ statut, date_envoi: maintenant });
      await notifier(notificationService, c.id_acheteur, {
        titre: c.livraison === 'main_propre' ? 'Commande prête' : 'Commande envoyée',
        message: c.livraison === 'main_propre'
          ? `« ${c.titre} » est prête : le vendeur vous la remet en main propre.`
          : `« ${c.titre} » vous a été envoyée.`,
        url_action: URL_COMMANDES, metadata: { id_commande: c.id_commande },
      });
    } else {
      const parAcheteur = estAcheteur && !estVendeur;
      await c.update({ statut, date_annulation: maintenant, annulee_par: parAcheteur ? 'acheteur' : 'vendeur' });
      await notifier(notificationService, parAcheteur ? c.id_vendeur : c.id_acheteur, {
        titre: 'Commande annulée',
        message: parAcheteur
          ? `${nomDe(c.Acheteur) || 'L’acheteur'} a annulé sa commande de « ${c.titre} ».`
          : `Le vendeur a annulé votre commande de « ${c.titre} ».`,
        url_action: URL_COMMANDES, metadata: { id_commande: c.id_commande },
      });
    }
  }
  return detail(models, c.id_commande, par);
}

module.exports = {
  TYPES_COMMANDABLES, QUANTITE_MAX, EN_ATTENTE_MAX,
  optionsLivraison, offre, commander, detail, liste, ventesATraiter, mettreAJour,
};
