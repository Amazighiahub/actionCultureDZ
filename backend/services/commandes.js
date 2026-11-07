/**
 * Commandes de livres, d'œuvres d'art et d'objets d'artisanat. L'acheteur paie directement le
 * professionnel (BaridiMob, CCP, espèces, lien de paiement) : Tala DZ n'encaisse rien et ne prend
 * aucune commission. Le site garde la trace de la commande et prévient chacun à chaque étape.
 *
 * Sécurité :
 * - l'adresse et le téléphone de l'acheteur ne sont montrés qu'au vendeur ; les coordonnées de
 *   paiement du vendeur seulement à ses acheteurs, et seulement tant qu'ils doivent payer ;
 * - chaque commande garde une copie des coordonnées de paiement du moment : si le vendeur (ou
 *   quelqu'un qui aurait volé sa session) les change ensuite, l'acheteur en est averti ;
 * - un vendeur suspendu ou non validé n'est plus commandable et ses coordonnées ne sont plus montrées ;
 * - le montant ne peut être fixé par le vendeur que dans la fourchette annoncée, deux fois au plus ;
 * - étapes protégées contre les doubles clics (transaction, mise à jour conditionnelle) ;
 * - les actions d'un administrateur sur une commande sont journalisées.
 */
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const { texteLisible } = require('../helpers/i18n');
const { notifier } = require('../utils/notifierModeration');
const { aUnMoyen, lireMoyens, CLES_PAIEMENT, INVISIBLES } = require('./paiementDirect');
const { TYPE_USER_IDS } = require('../constants/typeUserIds');

/** Livre, œuvre d'art, artisanat */
const TYPES_COMMANDABLES = [1, 6, 7];
const TYPE_OEUVRE_ART = 6;
const QUANTITE_MAX = 20;
/** Commandes en attente par acheteur, tous vendeurs confondus (évite les commandes en masse) */
const EN_ATTENTE_MAX = 10;
/** Montant le plus élevé qu'une commande peut porter (colonne DECIMAL(10,2)) */
const MONTANT_MAX = 99999999;
/** Frais d'envoi « à convenir » : ce que le vendeur peut ajouter au plus en fixant le montant */
const FRAIS_A_CONVENIR_MAX = 50000;
/** Changements de montant par le vendeur sur une même commande */
const MODIFS_MONTANT_MAX = 2;
const URL_COMMANDES = '/mes-commandes';
/** Compte « Utilisateur supprimé » (voir userRepository) */
const COMPTE_SUPPRIME = 'deleted-user@invalid.local';

const nomDe = (u) => (u ? [texteLisible(u.prenom), texteLisible(u.nom)].filter(Boolean).join(' ') : '');
const nombre = (v) => (v === null || v === undefined ? null : Number(v));
const arrondi = (n) => Math.round(n * 100) / 100;

// Caractères invisibles (contrôle, sens d'écriture forcé, largeur nulle) : même liste que paiementDirect
const texte = (v, max, champ) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string') throw AppError.badRequest(`${champ} invalide`);
  const t = v.replace(/\r\n?/g, '\n').replace(INVISIBLES, '').trim();
  if (t.length > max) throw AppError.badRequest(`${champ} : ${max} caractères au plus`);
  return t || null;
};

/** Seulement de quoi payer (les frais d'envoi sont déjà dans la commande) */
const paiementSeul = (moyens) => (moyens
  ? Object.fromEntries(CLES_PAIEMENT.filter((k) => moyens[k] !== undefined && moyens[k] !== null).map((k) => [k, moyens[k]]))
  : null);
const memesCoordonnees = (a, b) => CLES_PAIEMENT.every((k) => (a?.[k] ?? null) === (b?.[k] ?? null));

/** Vendeur en règle : compte actif d'un professionnel */
const vendeurEnRegle = (u) => !!u && u.statut === 'actif' && Number(u.id_type_user) !== TYPE_USER_IDS.VISITEUR;

/** Transaction si la base le permet (les tests utilisent des modèles en mémoire) */
const enTransaction = (models, fn) => (models.sequelize?.transaction ? models.sequelize.transaction(fn) : fn(null));

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
async function offre(models, idOeuvre, { transaction = null } = {}) {
  const tx = transaction ? { transaction } : {};
  const oeuvre = await models.Oeuvre.findByPk(idOeuvre, {
    attributes: ['id_oeuvre', 'titre', 'statut', 'id_type_oeuvre', 'prix', 'saisi_par'], ...tx,
  });
  if (!oeuvre || oeuvre.statut !== 'publie') return { commandable: false, raison: 'introuvable' };
  if (!TYPES_COMMANDABLES.includes(oeuvre.id_type_oeuvre)) return { commandable: false, raison: 'type' };

  let prix = nombre(oeuvre.prix);
  let prixMax = null;
  let stock = null;
  if (oeuvre.id_type_oeuvre === 7 && models.Artisanat) {
    const a = await models.Artisanat.findOne({
      where: { id_oeuvre: oeuvre.id_oeuvre }, attributes: ['prix', 'prix_max', 'en_stock', 'sur_commande'], ...tx,
    });
    if (a) {
      prix = nombre(a.prix) ?? prix;
      prixMax = nombre(a.prix_max);
      if (a.en_stock !== null && a.en_stock !== undefined && !a.sur_commande) stock = Number(a.en_stock);
    }
  }
  const unique = oeuvre.id_type_oeuvre === TYPE_OEUVRE_ART;
  // Le vendeur : le compte qui a déposé l'œuvre
  const idVendeur = oeuvre.saisi_par;
  const vendeur = idVendeur
    ? await models.User.findByPk(idVendeur, { attributes: ['id_user', 'nom', 'prenom', 'statut', 'id_type_user', 'moyens_paiement'], ...tx })
    : null;
  const moyens = lireMoyens(vendeur?.moyens_paiement);
  const base = {
    id_oeuvre: oeuvre.id_oeuvre,
    titre: texteLisible(oeuvre.titre),
    prix, prix_max: prixMax && prix !== null && prixMax > prix ? prixMax : null,
    stock: unique ? 1 : stock,
    unique,
    vendeur: vendeur ? { id: vendeur.id_user, nom: nomDe(vendeur) } : null,
  };
  if (!prix || prix <= 0) return { ...base, commandable: false, raison: 'sans_prix' };
  if (!vendeurEnRegle(vendeur) || !aUnMoyen(moyens)) return { ...base, commandable: false, raison: 'sans_moyen' };
  if (stock === 0) return { ...base, commandable: false, raison: 'epuise' };
  // Œuvre d'art unique déjà payée par quelqu'un : vendue
  if (unique && models.Commande.count) {
    const vendue = await models.Commande.count({ where: { id_oeuvre: oeuvre.id_oeuvre, statut: { [Op.in]: ['payee', 'envoyee'] } }, ...tx });
    if (vendue > 0) return { ...base, commandable: false, raison: 'epuise' };
  }
  return { ...base, commandable: true, livraison: optionsLivraison(moyens), _moyens: moyens };
}

/** Réponse publique de l'offre : sans les coordonnées (gardées pour la copie de la commande) */
async function offrePublique(models, idOeuvre) {
  const { _moyens, ...publique } = await offre(models, idOeuvre);
  return publique;
}

/** L'acheteur commande : le vendeur est prévenu et l'acheteur voit comment le payer */
async function commander(models, notificationService, idAcheteur, entree = {}) {
  const idOeuvre = Number(entree.id_oeuvre);
  if (!Number.isInteger(idOeuvre) || idOeuvre <= 0) throw AppError.badRequest('Œuvre invalide');

  // Lecture de la demande d'abord (rien n'est écrit si un champ est faux)
  const quantite = entree.quantite === undefined ? 1 : Number(entree.quantite);
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) {
    throw AppError.badRequest(`Quantité : de 1 à ${QUANTITE_MAX}`);
  }
  const livraison = String(entree.livraison || '');
  const adresse = texte(entree.adresse, 500, 'Adresse');
  const telephone = texte(entree.telephone, 30, 'Téléphone');
  if (telephone && !/^[+\d][\d\s.()-]{5,29}$/.test(telephone)) throw AppError.badRequest('Téléphone invalide');
  const message = texte(entree.message, 1000, 'Message');

  const { commande, o } = await enTransaction(models, async (transaction) => {
    const tx = transaction ? { transaction } : {};
    // Les commandes d'un même acheteur passent l'une après l'autre (deux clics = une commande)
    if (transaction) {
      await models.User.findByPk(idAcheteur, { attributes: ['id_user'], lock: transaction.LOCK.UPDATE, ...tx });
      // Une vente en cours de confirmation sur cette œuvre passe d'abord (pièce unique, stock)
      await models.Oeuvre.findByPk(idOeuvre, { attributes: ['id_oeuvre'], lock: transaction.LOCK.SHARE, ...tx });
    }

    const o = await offre(models, idOeuvre, { transaction });
    if (!o.commandable) {
      const messages = {
        introuvable: 'Cette œuvre n’est pas disponible.',
        type: 'Cette œuvre ne se commande pas en ligne.',
        sans_prix: 'Cette œuvre n’a pas de prix : contactez directement son auteur.',
        sans_moyen: 'Le vendeur n’a pas encore indiqué comment le payer.',
        epuise: 'Cette œuvre n’est plus disponible.',
      };
      throw AppError.badRequest(messages[o.raison] || 'Commande impossible', 'COMMANDE_IMPOSSIBLE');
    }
    if (o.vendeur.id === Number(idAcheteur)) throw AppError.badRequest('Vous ne pouvez pas commander votre propre œuvre.', 'COMMANDE_PROPRE');
    if (o.unique && quantite > 1) throw AppError.badRequest('Cette œuvre est unique : quantité 1.');
    if (o.stock !== null && quantite > o.stock) throw AppError.badRequest(`Il en reste ${o.stock} seulement.`);
    if (!Object.prototype.hasOwnProperty.call(o.livraison, livraison)) throw AppError.badRequest('Mode de livraison invalide');
    if ((livraison === 'algerie' || livraison === 'etranger') && !adresse) {
      throw AppError.badRequest('Indiquez l’adresse de livraison.');
    }

    const enAttente = await models.Commande.count({ where: { id_acheteur: idAcheteur, statut: 'en_attente' }, ...tx });
    if (enAttente >= EN_ATTENTE_MAX) {
      throw AppError.badRequest('Vous avez déjà plusieurs commandes en attente : attendez qu’elles soient traitées.', 'COMMANDES_EN_ATTENTE');
    }
    const doublon = await models.Commande.findOne({
      where: { id_acheteur: idAcheteur, id_oeuvre: idOeuvre, statut: 'en_attente' }, attributes: ['id_commande'], ...tx,
    });
    if (doublon) throw AppError.conflict('Vous avez déjà une commande en attente pour cette œuvre.', 'COMMANDE_DOUBLON');

    const frais = o.livraison[livraison];
    const montant = arrondi(o.prix * quantite + (frais || 0));
    if (montant > MONTANT_MAX) throw AppError.badRequest('Montant trop élevé pour une commande en ligne : contactez le vendeur.');
    const commande = await models.Commande.create({
      id_oeuvre: idOeuvre,
      titre: (o.titre || 'Œuvre').slice(0, 255),
      id_vendeur: o.vendeur.id,
      id_acheteur: idAcheteur,
      quantite,
      prix_unitaire: o.prix,
      prix_max_unitaire: o.prix_max,
      prix_a_confirmer: o.prix_max !== null,
      frais_envoi: frais,
      montant_total: montant,
      livraison,
      adresse: livraison === 'main_propre' ? null : adresse,
      telephone,
      message,
      // Copie des coordonnées du moment : un changement ultérieur ne détourne pas cette commande
      moyens_paiement: paiementSeul(o._moyens),
    }, tx);
    return { commande, o };
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
  { model: models.User, as: 'Vendeur', attributes: ['id_user', 'nom', 'prenom', 'statut', 'id_type_user', 'moyens_paiement'] },
  { model: models.User, as: 'Acheteur', attributes: ['id_user', 'nom', 'prenom', 'email'] },
];

/** Rôle sur la commande : l'acheteur reste acheteur même s'il est administrateur */
function roleDe(c, par) {
  const estAcheteur = c.id_acheteur === Number(par.id);
  const estVendeur = c.id_vendeur === Number(par.id);
  return { estAcheteur, estVendeur, moderation: !estAcheteur && !estVendeur && !!par.isAdmin };
}

/** Ce que voit chacun : l'acheteur les moyens de paiement, le vendeur l'adresse de livraison */
function vue(c, par) {
  const { estAcheteur, estVendeur, moderation } = roleDe(c, par);
  const r = {
    id_commande: c.id_commande,
    id_oeuvre: c.id_oeuvre,
    titre: c.titre,
    quantite: c.quantite,
    prix_unitaire: nombre(c.prix_unitaire),
    prix_max_unitaire: nombre(c.prix_max_unitaire),
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
    role: estAcheteur ? 'acheteur' : 'vendeur',
    vendeur: { id: c.id_vendeur, nom: nomDe(c.Vendeur) },
    acheteur: { id: c.id_acheteur, nom: nomDe(c.Acheteur) },
  };
  if (estVendeur || moderation || estAcheteur) {
    r.adresse = c.adresse;
    r.telephone = c.telephone;
  }
  if (estVendeur || moderation) {
    r.acheteur.email = c.Acheteur?.email || null;
    // Montant que le vendeur peut encore fixer, et ses bornes
    if (c.statut === 'en_attente' && montantModifiable(c) && (Number(c.modifs_montant) || 0) < MODIFS_MONTANT_MAX) {
      r.montant_bornes = bornesMontant(c);
    }
  }

  // Coordonnées de paiement : seulement à l'acheteur, tant qu'il doit payer, et si le vendeur est en règle
  if (estAcheteur && c.statut === 'en_attente') {
    const actuelles = lireMoyens(c.Vendeur?.moyens_paiement);
    const copie = lireMoyens(c.moyens_paiement) || paiementSeul(actuelles);
    if (c.Vendeur && !vendeurEnRegle(c.Vendeur)) {
      r.vendeur_indisponible = true;
    } else if (aUnMoyen(copie)) {
      r.moyens = copie;
      // Le vendeur a changé ses coordonnées depuis la commande : à vérifier avec lui avant de payer
      if (!memesCoordonnees(copie, paiementSeul(actuelles))) r.moyens_modifies = true;
    }
  }
  return r;
}

async function chercher(models, idCommande, par, transaction = null) {
  let c;
  if (transaction) {
    c = await models.Commande.findByPk(idCommande, { transaction, lock: transaction.LOCK.UPDATE });
    if (c) {
      const [Vendeur, Acheteur] = await Promise.all([
        models.User.findByPk(c.id_vendeur, { attributes: INCLURE(models)[0].attributes, transaction }),
        models.User.findByPk(c.id_acheteur, { attributes: INCLURE(models)[1].attributes, transaction }),
      ]);
      c.Vendeur = Vendeur;
      c.Acheteur = Acheteur;
    }
  } else {
    c = await models.Commande.findByPk(idCommande, { include: INCLURE(models) });
  }
  if (!c) throw AppError.notFound('Commande', 'COMMANDE_INTROUVABLE');
  const autorise = par.isAdmin || c.id_vendeur === Number(par.id) || c.id_acheteur === Number(par.id);
  if (!autorise) throw AppError.notFound('Commande', 'COMMANDE_INTROUVABLE');
  return c;
}

async function detail(models, idCommande, par) {
  return vue(await chercher(models, idCommande, par), par);
}

/** Achats (role acheteur) ou ventes (role vendeur), les plus récentes d'abord */
async function liste(models, idUser, role) {
  const where = role === 'ventes' ? { id_vendeur: idUser } : { id_acheteur: idUser };
  const lignes = await models.Commande.findAll({
    where, include: INCLURE(models), order: [['date_creation', 'DESC']], limit: 200,
  });
  return lignes.map((c) => vue(c, { id: idUser, isAdmin: false }));
}

/** Nombre de ventes à traiter (en attente de paiement ou à envoyer) */
async function ventesATraiter(models, idUser) {
  return models.Commande.count({ where: { id_vendeur: idUser, statut: { [Op.in]: ['en_attente', 'payee'] } } });
}

/** Le vendeur peut fixer le montant : prix annoncé en fourchette, ou frais d'envoi à convenir */
const montantModifiable = (c) => (c.prix_max_unitaire !== null && c.prix_max_unitaire !== undefined) || c.livraison === 'a_convenir';

/** Bornes du montant que le vendeur peut fixer */
function bornesMontant(c) {
  const q = Number(c.quantite) || 1;
  const prix = Number(c.prix_unitaire);
  const prixMax = c.prix_max_unitaire !== null && c.prix_max_unitaire !== undefined ? Number(c.prix_max_unitaire) : prix;
  const frais = c.frais_envoi === null || c.frais_envoi === undefined ? null : Number(c.frais_envoi);
  const min = arrondi(prix * q + (frais || 0));
  const max = arrondi(Math.max(prix, prixMax) * q + (frais === null ? (c.livraison === 'a_convenir' ? FRAIS_A_CONVENIR_MAX : 0) : frais));
  return { min, max: Math.min(max, MONTANT_MAX) };
}

/**
 * Étapes d'une commande :
 * - le vendeur : « paiement reçu » (en_attente → payee), « envoyée » (payee → envoyee), annuler ;
 *   il peut aussi fixer le montant tant que la commande attend le paiement, si le prix était à
 *   confirmer ou la livraison à convenir, dans la fourchette annoncée, deux fois au plus
 * - l'acheteur : annuler tant qu'il n'a pas payé
 * - l'administration (modération) : comme le vendeur, chaque action est journalisée
 * Tout est vérifié avant d'écrire : une demande en partie fausse ne change rien.
 */
async function mettreAJour(models, notificationService, idCommande, par, entree = {}) {
  const statut = entree.statut;
  const veutMontant = entree.montant_total !== undefined && entree.montant_total !== null && entree.montant_total !== '';
  if (statut === undefined && !veutMontant) throw AppError.badRequest('Rien à changer');

  // L'œuvre de la commande, lue avant la transaction : dans la transaction, elle est verrouillée en premier
  const tete = await models.Commande.findByPk(idCommande, { attributes: ['id_commande', 'id_oeuvre'] });
  if (!tete) throw AppError.notFound('Commande', 'COMMANDE_INTROUVABLE');

  const resultat = await enTransaction(models, async (transaction) => {
    const oeuvreVerrouillee = tete.id_oeuvre
      ? await models.Oeuvre.findByPk(tete.id_oeuvre, { attributes: ['id_oeuvre', 'id_type_oeuvre'], ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}) })
      : null;
    const c = await chercher(models, idCommande, par, transaction);
    const etatAvant = c.statut;
    const { estAcheteur, estVendeur, moderation } = roleDe(c, par);
    const peutVendre = estVendeur || moderation;
    const changements = {};
    const messages = [];
    const maintenant = new Date();

    if (veutMontant) {
      if (!peutVendre) throw AppError.forbidden('Seul le vendeur fixe le montant');
      if (c.statut !== 'en_attente') throw AppError.badRequest('Le montant ne change plus après le paiement');
      if (!montantModifiable(c)) {
        throw AppError.badRequest('Le prix de cette commande est déjà fixé', 'MONTANT_FIXE');
      }
      if ((Number(c.modifs_montant) || 0) >= MODIFS_MONTANT_MAX) {
        throw AppError.badRequest('Le montant a déjà été changé : écrivez à l’acheteur.', 'MONTANT_TROP_CHANGE');
      }
      const m = Number(entree.montant_total);
      const { min, max } = bornesMontant(c);
      if (!Number.isFinite(m) || m < min || m > max) {
        throw AppError.badRequest(`Montant : entre ${min} et ${max} DA pour cette commande`, 'MONTANT_HORS_BORNES');
      }
      changements.montant_total = arrondi(m);
      changements.prix_a_confirmer = false;
      changements.modifs_montant = (Number(c.modifs_montant) || 0) + 1;
      messages.push({ a: c.id_acheteur, titre: 'Montant de votre commande', message: `Le vendeur a fixé le montant de « ${c.titre} » : ${arrondi(m)} DA. Vous pouvez annuler si vous n’êtes pas d’accord.` });
    }

    if (statut !== undefined) {
      const passages = {
        payee: { de: ['en_attente'], qui: peutVendre },
        envoyee: { de: ['payee'], qui: peutVendre },
        annulee: { de: peutVendre ? ['en_attente', 'payee'] : ['en_attente'], qui: peutVendre || estAcheteur },
      };
      const p = Object.prototype.hasOwnProperty.call(passages, statut) ? passages[statut] : null;
      if (!p) throw AppError.badRequest('Étape invalide');
      if (!p.qui) throw AppError.forbidden('Action réservée au vendeur');
      if (!p.de.includes(c.statut)) throw AppError.badRequest('Cette étape n’est plus possible pour cette commande', 'ETAPE_IMPOSSIBLE');
      if (statut === 'payee' && veutMontant) throw AppError.badRequest('Fixez le montant, puis confirmez le paiement séparément');

      changements.statut = statut;
      if (statut === 'payee') {
        changements.date_paiement = maintenant;
        messages.push({ a: c.id_acheteur, titre: 'Paiement reçu', message: `Le vendeur a bien reçu votre paiement pour « ${c.titre} ».` });
      } else if (statut === 'envoyee') {
        changements.date_envoi = maintenant;
        messages.push(c.livraison === 'main_propre'
          ? { a: c.id_acheteur, titre: 'Commande prête', message: `« ${c.titre} » est prête : le vendeur vous la remet en main propre.` }
          : { a: c.id_acheteur, titre: 'Commande envoyée', message: `« ${c.titre} » vous a été envoyée.` });
      } else {
        changements.date_annulation = maintenant;
        changements.annulee_par = estAcheteur ? 'acheteur' : 'vendeur';
        messages.push(estAcheteur
          ? { a: c.id_vendeur, titre: 'Commande annulée', message: `${nomDe(c.Acheteur) || 'L’acheteur'} a annulé sa commande de « ${c.titre} ».` }
          : { a: c.id_acheteur, titre: 'Commande annulée', message: `Le vendeur a annulé votre commande de « ${c.titre} ».` });
      }
      if (['envoyee', 'annulee'].includes(statut) && c.Acheteur?.email === COMPTE_SUPPRIME) {
        // Acheteur parti : son adresse n'était gardée que pour l'envoi
        Object.assign(changements, { adresse: null, telephone: null, message: null });
      }
    }

    const tx = transaction ? { transaction } : {};
    const verrou = transaction ? { lock: transaction.LOCK.UPDATE } : {};
    const oeuvre = c.id_oeuvre && (changements.statut === 'payee' || (changements.statut === 'annulee' && etatAvant === 'payee'))
      ? oeuvreVerrouillee : null;
    const artisanat = oeuvre?.id_type_oeuvre === 7 && models.Artisanat?.findOne
      ? await models.Artisanat.findOne({ where: { id_oeuvre: c.id_oeuvre }, attributes: ['id_artisanat', 'en_stock', 'sur_commande'], ...tx, ...verrou })
      : null;
    const stockSuivi = artisanat && !artisanat.sur_commande && artisanat.en_stock !== null && artisanat.en_stock !== undefined;
    let autresEnAttente = [];
    if (changements.statut === 'payee') {
      if (oeuvre?.id_type_oeuvre === TYPE_OEUVRE_ART) {
        const vendues = await models.Commande.findAll({
          where: { id_oeuvre: c.id_oeuvre, id_commande: { [Op.ne]: c.id_commande }, statut: { [Op.in]: ['payee', 'envoyee'] } },
          attributes: ['id_commande'], ...tx, ...verrou,
        });
        if (vendues.length) throw AppError.conflict('Cette œuvre unique est déjà vendue à un autre acheteur : annulez cette commande.', 'DEJA_VENDUE');
        // Les autres demandes pour cette pièce unique sont annulées (leurs acheteurs ne paieront pas pour rien)
        if (models.Commande.findAll) {
          autresEnAttente = await models.Commande.findAll({
            where: { id_oeuvre: c.id_oeuvre, id_commande: { [Op.ne]: c.id_commande }, statut: 'en_attente' }, attributes: ['id_commande', 'id_acheteur'], ...tx, ...verrou,
          });
        }
      }
      if (stockSuivi && Number(artisanat.en_stock) < (Number(c.quantite) || 1)) {
        throw AppError.conflict(`Stock insuffisant (${artisanat.en_stock}) : mettez le stock à jour ou annulez cette commande.`, 'STOCK_INSUFFISANT');
      }
    }

    // Mise à jour conditionnelle : si l'état a changé entre-temps (autre clic, autre personne), rien n'est écrit
    if (models.Commande.update) {
      const [n] = await models.Commande.update(changements, { where: { id_commande: c.id_commande, statut: etatAvant }, ...tx });
      if (!n) throw AppError.conflict('La commande vient de changer : rechargez la page.', 'COMMANDE_CHANGEE');
    } else {
      await c.update(changements, tx);
    }

    // Stock de l'artisanat : baisse quand le paiement est confirmé, revient si la vente payée est annulée
    if (stockSuivi && changements.statut === 'payee') {
      await artisanat.update({ en_stock: Number(artisanat.en_stock) - (Number(c.quantite) || 1) }, tx);
    } else if (stockSuivi && changements.statut === 'annulee' && etatAvant === 'payee') {
      await artisanat.update({ en_stock: Number(artisanat.en_stock) + (Number(c.quantite) || 1) }, tx);
    }
    for (const autre of autresEnAttente) {
      await models.Commande.update({ statut: 'annulee', date_annulation: maintenant, annulee_par: 'vendeur' },
        { where: { id_commande: autre.id_commande, statut: 'en_attente' }, ...tx });
      messages.push({ a: autre.id_acheteur, titre: 'Œuvre déjà vendue', message: `« ${c.titre} » a été vendue à un autre acheteur : votre commande est annulée. Ne payez pas.`, id: autre.id_commande });
    }

    if (moderation && models.AuditLog?.create) {
      await models.AuditLog.create({
        id_admin: par.id, action: 'commande_moderation', entity_type: 'commande', entity_id: c.id_commande,
        details: { avant: etatAvant, changements: Object.keys(changements), statut: changements.statut || null },
      }, tx);
    }
    return { id: c.id_commande, messages };
  });

  for (const m of resultat.messages) {
    await notifier(notificationService, m.a, { titre: m.titre, message: m.message, url_action: URL_COMMANDES, metadata: { id_commande: m.id || resultat.id } });
  }
  return detail(models, resultat.id, par);
}

/**
 * Suppression d'un compte : bloquée par ce que la personne peut encore régler elle-même
 * - ses ventes à payer ou à envoyer (elle peut les terminer ou les annuler) ;
 * - ses achats à payer (elle peut les annuler). Un achat déjà payé ne la bloque pas : elle ne peut
 *   pas l'annuler, et la commande reste pour le vendeur.
 */
async function commandesEnCours(models, idUser, transaction = null) {
  if (!models.Commande?.count) return 0;
  return models.Commande.count({
    ...(transaction ? { transaction } : {}),
    where: {
      [Op.or]: [
        { id_vendeur: idUser, statut: { [Op.in]: ['en_attente', 'payee'] } },
        { id_acheteur: idUser, statut: 'en_attente' },
      ],
    },
  });
}

module.exports = {
  TYPES_COMMANDABLES, QUANTITE_MAX, EN_ATTENTE_MAX, MONTANT_MAX, FRAIS_A_CONVENIR_MAX, MODIFS_MONTANT_MAX,
  optionsLivraison, offre, offrePublique, commander, detail, liste, ventesATraiter, mettreAJour, bornesMontant,
  commandesEnCours,
};
