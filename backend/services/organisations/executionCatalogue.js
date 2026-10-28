/**
 * Exécution de l'import du catalogue d'une maison d'édition (fichier lu par importCatalogue.js).
 * Chaque livre est créé comme depuis le formulaire « Nouvelle œuvre » (oeuvreService.create),
 * relié à la fiche « éditeur » de la maison et à son auteur, puis envoyé à l'équipe.
 * Une ligne en erreur n'empêche pas les autres ; les couvertures sont envoyées ensuite par le
 * navigateur, livre par livre (POST /oeuvres/:id/medias/upload).
 */
const { Op } = require('sequelize');
const { texteLisible } = require('../../helpers/i18n');
const { TYPE_LIVRE } = require('./importCatalogue');

const ID_TYPE_ECRIVAIN = 2;
const cleNom = (prenom, nom) => `${texteLisible(prenom)} ${texteLisible(nom)}`
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Fiche « éditeur » de la maison (créée si elle n'en a pas encore) */
async function editeurDeLaMaison(models, org) {
  const existant = await models.Editeur.findOne({ where: { id_organisation: org.id_organisation }, order: [['id_editeur', 'ASC']] });
  if (existant) return existant;
  return models.Editeur.create({
    nom: org.nom, type_editeur: 'maison_edition', id_organisation: org.id_organisation,
    site_web: org.site_web || null, email: org.email || null, telephone: org.telephone || null, actif: true
  });
}

/** Intervenants déjà connus, par « prénom nom » (un auteur de plusieurs livres n'est créé qu'une fois) */
async function annuaireAuteurs(models, lignes) {
  const noms = new Set(lignes.map(l => cleNom(l.auteur.prenom, l.auteur.nom)));
  const auteurs = new Map();
  const candidats = await models.Intervenant.findAll({
    attributes: ['id_intervenant', 'nom', 'prenom'],
    where: { nom: { [Op.ne]: null } }
  });
  for (const i of candidats) {
    const cle = cleNom(i.prenom, i.nom);
    if (noms.has(cle) && !auteurs.has(cle)) auteurs.set(cle, i.id_intervenant);
  }
  return auteurs;
}

/**
 * @param {object} deps - { models, oeuvreService, logger }
 * @param {object} org - organisation (maison d'édition)
 * @param {object[]} lignes - lignes lues (seules « nouveau » et « existe » sont traitées)
 * @param {number} userId - compte qui importe (propriétaire des livres créés)
 */
async function executer({ models, oeuvreService, logger }, org, lignes, userId) {
  const editeur = await editeurDeLaMaison(models, org);
  const aTraiter = lignes.filter(l => l.etat !== 'erreur');
  const auteurs = await annuaireAuteurs(models, aTraiter);
  const crees = [];
  const lies = [];
  const echecs = [];

  for (const l of aTraiter) {
    try {
      if (l.etat === 'existe') {
        // Livre déjà sur le site : seulement relié à la maison d'édition
        await models.OeuvreEditeur.findOrCreate({
          where: { id_oeuvre: l.idOeuvreExistante, id_editeur: editeur.id_editeur, role_editeur: 'editeur_principal' },
          defaults: { statut_edition: 'publie' }
        });
        lies.push({ ligne: l.ligne, id_oeuvre: l.idOeuvreExistante });
        continue;
      }

      const cle = cleNom(l.auteur.prenom, l.auteur.nom);
      let idAuteur = auteurs.get(cle);
      if (!idAuteur) {
        const cree = await models.Intervenant.create({
          nom: { fr: l.auteur.nom }, prenom: l.auteur.prenom ? { fr: l.auteur.prenom } : {}, actif: true
        });
        idAuteur = cree.id_intervenant;
        auteurs.set(cle, idAuteur);
      }

      const nettoyer = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
      const { oeuvre } = await oeuvreService.create({
        titre: nettoyer(l.titre),
        description: nettoyer(l.resume),
        id_type_oeuvre: TYPE_LIVRE,
        id_langue: l.idLangue,
        annee_creation: l.annee || undefined,
        prix: l.prix ?? undefined,
        categories: [...new Set(l.categories.map(c => c.id))],
        details_specifiques: { livre: { isbn: l.isbn, nb_pages: l.pages, id_genre: l.categories[0]?.genre || null } },
        intervenants_existants: [{ id_intervenant: idAuteur, id_type_user: ID_TYPE_ECRIVAIN, role_principal: true }],
        editeurs: [{ id_editeur: editeur.id_editeur, role_editeur: 'editeur_principal', statut_edition: 'publie' }]
      }, userId);
      await oeuvreService.submitForValidation(oeuvre.id_oeuvre ?? oeuvre.id, userId);
      crees.push({ ligne: l.ligne, id_oeuvre: oeuvre.id_oeuvre ?? oeuvre.id, couverture: l.couverture });
    } catch (error) {
      logger?.warn?.(`Import catalogue ${org.id_organisation}, ligne ${l.ligne} : ${error.message}`);
      echecs.push({ ligne: l.ligne, erreur: error.message });
    }
  }
  return { crees, lies, echecs, ignorees: lignes.length - aTraiter.length };
}

module.exports = { executer, editeurDeLaMaison };
