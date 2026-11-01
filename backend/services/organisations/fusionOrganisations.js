/**
 * Fusion d'organisations en double dans celle que l'on garde (modération).
 * Déplace événements, membres et fiches « éditeur » (donc les livres), complète les informations
 * manquantes de la page gardée sans rien écraser, garde l'ancienne adresse en redirection,
 * puis supprime les doublons. Tout se fait dans une transaction.
 */
// Du plus fort au plus faible : en cas de double appartenance, on garde le plus fort
const RANGS_MEMBRE = ['directeur', 'responsable', 'collaborateur', 'membre'];
const RANGS_EVENEMENT = ['organisateur_principal', 'co_organisateur', 'partenaire', 'sponsor', 'media_partner', 'soutien'];
const plusFort = (rangs, a, b) => (rangs.indexOf(a) !== -1 && (rangs.indexOf(b) === -1 || rangs.indexOf(a) < rangs.indexOf(b)) ? a : b);

const CHAMPS_SIMPLES = ['logo_url', 'id_wilaya', 'adresse', 'email', 'telephone', 'site_web'];
const vide = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim());
const lireObjet = (v) => {
  if (v && typeof v === 'object') return v;
  try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : {}; } catch { return {}; }
};
/** Ajoute à `garde` les clés vides qu'`autre` a remplies (langues, réseaux) */
const completer = (garde, autre) => {
  const resultat = { ...lireObjet(garde) };
  for (const [cle, valeur] of Object.entries(lireObjet(autre))) {
    if (vide(resultat[cle]) && !vide(valeur)) resultat[cle] = valeur;
  }
  return resultat;
};

function verifier(idGarde, idsDoublons) {
  const doublons = [...new Set(idsDoublons.map(Number).filter(Boolean))].filter(id => id !== Number(idGarde));
  if (!doublons.length) {
    const err = new Error('Choisissez au moins une autre organisation à fusionner');
    err.statusCode = 400; err.code = 'FUSION_VIDE';
    throw err;
  }
  return doublons;
}

/** Ce que la fusion va déplacer (affiché avant confirmation) */
async function apercu(models, idGarde, idsDoublons) {
  const doublons = verifier(idGarde, idsDoublons);
  const { Organisation, EvenementOrganisation, UserOrganisation, Editeur, OeuvreEditeur } = models;
  const garde = await Organisation.findByPk(idGarde, { attributes: ['id_organisation', 'nom'] });
  const autres = await Organisation.findAll({ where: { id_organisation: doublons }, attributes: ['id_organisation', 'nom'] });
  if (!garde || autres.length !== doublons.length) {
    const err = new Error('Organisation introuvable'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
  }
  const evenements = await EvenementOrganisation.count({ where: { id_organisation: doublons }, distinct: true, col: 'id_evenement' });
  const membres = await UserOrganisation.count({ where: { id_organisation: doublons, actif: true }, distinct: true, col: 'id_user' });
  const editeurs = await Editeur.findAll({ where: { id_organisation: doublons }, attributes: ['id_editeur'] });
  const livres = editeurs.length && OeuvreEditeur
    ? await OeuvreEditeur.count({ where: { id_editeur: editeurs.map(e => e.id_editeur) }, distinct: true, col: 'id_oeuvre' })
    : 0;
  return { garde: garde.get({ plain: true }), doublons: autres.map(o => o.get({ plain: true })), evenements, membres, livres };
}

/**
 * @returns {Promise<{ garde: object, fusionnees: number[], responsables: number[] }>}
 */
async function fusionner(models, idGarde, idsDoublons) {
  const doublons = verifier(idGarde, idsDoublons);
  const { Organisation, EvenementOrganisation, UserOrganisation, Editeur, OeuvreEditeur } = models;
  const sequelize = Organisation.sequelize;

  return sequelize.transaction(async (transaction) => {
    // Verrous pris en une fois, par numéro croissant : deux fusions croisées (A dans B et B dans A)
    // ne peuvent pas s'attendre l'une l'autre
    const verrouillees = await Organisation.findAll({
      where: { id_organisation: [Number(idGarde), ...doublons] },
      order: [['id_organisation', 'ASC']], transaction, lock: transaction.LOCK.UPDATE
    });
    const garde = verrouillees.find(o => o.id_organisation === Number(idGarde));
    const autres = verrouillees.filter(o => o.id_organisation !== Number(idGarde));
    if (!garde || autres.length !== doublons.length) {
      const err = new Error('Organisation introuvable'); err.statusCode = 404; err.code = 'NOT_FOUND'; throw err;
    }
    const responsablesAvant = (await UserOrganisation.findAll({
      where: { id_organisation: [idGarde, ...doublons], actif: true, role: ['responsable', 'directeur'] },
      attributes: ['id_user'], transaction
    })).map(m => m.id_user);

    for (const autre of autres) {
      const idAutre = autre.id_organisation;

      // 1. Événements : un seul lien par événement, avec le rôle le plus fort
      for (const lien of await EvenementOrganisation.findAll({ where: { id_organisation: idAutre }, transaction })) {
        const existant = await EvenementOrganisation.findOne({ where: { id_organisation: idGarde, id_evenement: lien.id_evenement }, transaction });
        if (existant) {
          const role = plusFort(RANGS_EVENEMENT, lien.role, existant.role);
          if (role !== existant.role) await existant.update({ role }, { transaction });
          await lien.destroy({ transaction });
        } else {
          await lien.update({ id_organisation: idGarde }, { transaction });
        }
      }

      // 2. Membres : une seule appartenance, avec le rôle le plus fort
      for (const membre of await UserOrganisation.findAll({ where: { id_organisation: idAutre }, transaction })) {
        const existant = await UserOrganisation.findOne({ where: { id_organisation: idGarde, id_user: membre.id_user }, transaction });
        if (existant) {
          const role = plusFort(RANGS_MEMBRE, membre.role, existant.role);
          const actif = existant.actif || membre.actif;
          if (role !== existant.role || actif !== existant.actif) await existant.update({ role, actif }, { transaction });
          await membre.destroy({ transaction });
        } else {
          await membre.update({ id_organisation: idGarde }, { transaction });
        }
      }

      // 3. Fiches « éditeur » (livres) : regroupées sur une seule fiche de la page gardée
      let principal = await Editeur.findOne({ where: { id_organisation: idGarde }, order: [['id_editeur', 'ASC']], transaction });
      for (const editeur of await Editeur.findAll({ where: { id_organisation: idAutre }, order: [['id_editeur', 'ASC']], transaction })) {
        if (!principal) {
          // La première fiche déplacée devient la fiche de la page gardée ; les suivantes s'y regroupent
          await editeur.update({ id_organisation: idGarde }, { transaction });
          principal = editeur;
          continue;
        }
        if (OeuvreEditeur) {
          for (const livre of await OeuvreEditeur.findAll({ where: { id_editeur: editeur.id_editeur }, transaction })) {
            // Clé unique de la table : (id_oeuvre, id_editeur), quel que soit le rôle
            const deja = await OeuvreEditeur.findOne({
              where: { id_editeur: principal.id_editeur, id_oeuvre: livre.id_oeuvre }, transaction
            });
            if (deja) await livre.destroy({ transaction });
            else await livre.update({ id_editeur: principal.id_editeur }, { transaction });
          }
        }
        await editeur.destroy({ transaction });
      }

      // 4. Informations manquantes de la page gardée, sans rien écraser
      const champs = {};
      for (const c of CHAMPS_SIMPLES) if (vide(garde[c]) && !vide(autre[c])) champs[c] = autre[c];
      champs.nom = completer(garde.nom, autre.nom);
      champs.description = completer(garde.description, autre.description);
      const reseaux = completer(garde.reseaux, autre.reseaux);
      if (Object.keys(reseaux).length) champs.reseaux = reseaux;
      // Une page déjà publiée absorbée : la page gardée l'est aussi (sauf si la modération l'a refusée)
      if (autre.statut === 'valide' && !['valide', 'rejete'].includes(garde.statut)) champs.statut = 'valide';
      await garde.update(champs, { transaction });

      // 5. Ancienne adresse → page gardée (y compris les redirections qui menaient au doublon)
      await sequelize.query('UPDATE organisation_redirection SET id_organisation = :garde WHERE id_organisation = :autre',
        { replacements: { garde: idGarde, autre: idAutre }, transaction });
      await sequelize.query(`INSERT INTO organisation_redirection (ancien_id, id_organisation) VALUES (:autre, :garde)
        ON DUPLICATE KEY UPDATE id_organisation = VALUES(id_organisation)`,
        { replacements: { garde: idGarde, autre: idAutre }, transaction });

      // 6. Demandes « C'est mon organisation » : reportées sur la page gardée (la cascade les effaçait)
      await sequelize.query('UPDATE organisation_revendication SET id_organisation = :garde WHERE id_organisation = :autre',
        { replacements: { garde: idGarde, autre: idAutre }, transaction });

      await autre.destroy({ transaction });
    }

    // Page gardée déjà gérée : les demandes « C'est mon organisation » encore en attente n'ont plus d'objet
    // (avant : elles restaient bloquées, l'acceptation répondant toujours « a déjà un responsable »)
    let demandesRefusees = [];
    const geree = await models.UserOrganisation.findOne({
      where: { id_organisation: idGarde, actif: true, role: ['responsable', 'directeur'] }, transaction
    });
    if (geree) {
      demandesRefusees = (await sequelize.query(
        "SELECT DISTINCT id_user FROM organisation_revendication WHERE id_organisation = :garde AND statut = 'en_attente'",
        { replacements: { garde: idGarde }, type: sequelize.QueryTypes.SELECT, transaction })).map(r => r.id_user);
      await sequelize.query(`UPDATE organisation_revendication SET statut = 'refusee', date_decision = NOW(),
          motif = 'Cette organisation a déjà un responsable : demandez-lui de vous ajouter comme membre'
        WHERE id_organisation = :garde AND statut = 'en_attente'`, { replacements: { garde: idGarde }, transaction });
    }

    return { garde, fusionnees: doublons, responsables: [...new Set(responsablesAvant)], demandesRefusees };
  });
}

/** Organisation gardée à la place d'un numéro fusionné (null si aucune redirection) */
async function redirection(models, ancienId) {
  const [lignes] = await models.Organisation.sequelize.query(
    'SELECT id_organisation FROM organisation_redirection WHERE ancien_id = :id', { replacements: { id: Number(ancienId) } }
  ).catch(() => [[]]);
  return lignes[0]?.id_organisation || null;
}

module.exports = { apercu, fusionner, redirection, completer, plusFort, RANGS_MEMBRE };
