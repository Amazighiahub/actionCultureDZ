const BaseService = require('../core/baseService');
const { texteLisible } = require('../../helpers/i18n');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const { categorieDuType } = require('./categories');
const fusion = require('./fusionOrganisations');
const { ressemble } = require('./nomsRessemblants');
const catalogue = require('./importCatalogue');
const { executer } = require('./executionCatalogue');
const revendications = require('./revendications');

// Réseaux sociaux acceptés sur la page d'une organisation
const RESEAUX = ['facebook', 'instagram', 'youtube', 'x', 'linkedin', 'tiktok'];
// Rôles qui peuvent modifier la page
const ROLES_GESTION = ['responsable', 'directeur'];
// Éditeurs (liste des œuvres) qui reçoivent une page d'organisation « Maison d'édition »
const TYPES_EDITEUR_PAGE = ['maison_edition', 'editeur_scientifique'];
// Maisons dont le catalogue est en cours d'import (un seul à la fois par maison)
const importsEnCours = new Set();

const sansAccent = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Même nom dans chaque langue (espaces de début et de fin ignorés)
function memesTextes(a, b) {
  const objet = (v) => (v && typeof v === 'object' ? v : { fr: v });
  const x = objet(a); const y = objet(b);
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].every(k => String(x[k] || '').trim() === String(y[k] || '').trim());
}
const textes = (v) => (v && typeof v === 'object' ? Object.values(v) : [v]).map(sansAccent).join(' ');

/** Champs de la vitrine envoyés par le formulaire (les autres sont ignorés) */
function champsVitrine(data) {
  const champs = {};
  const texte = (v, max) => (v === undefined ? undefined : (String(v || '').trim().slice(0, max) || null));
  if (data.logo_url !== undefined) champs.logo_url = texte(data.logo_url, 500);
  if (data.adresse !== undefined) champs.adresse = texte(data.adresse, 255);
  if (data.email !== undefined) champs.email = texte(data.email, 255);
  if (data.telephone !== undefined) champs.telephone = texte(data.telephone, 30);
  if (data.site_web !== undefined) champs.site_web = texte(data.site_web, 255);
  if (data.id_wilaya !== undefined) champs.id_wilaya = Number(data.id_wilaya) || null;
  if (data.reseaux !== undefined) {
    const reseaux = {};
    for (const nom of RESEAUX) {
      const url = String(data.reseaux?.[nom] || '').trim();
      if (/^https:\/\/[^\s]+$/i.test(url)) reseaux[nom] = url.slice(0, 255);
    }
    champs.reseaux = Object.keys(reseaux).length ? reseaux : null;
  }
  return champs;
}

class OrganisationService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
    this.notificationService = options.notificationService;
  }

  async findByUser(userId) {
    return this.repository.findByUser(userId);
  }

  async findById(id) {
    const org = await this.repository.findById(id);
    if (!org) throw this._notFoundError(id);
    return org;
  }

  async getTypes() {
    return this.repository.findTypes();
  }

  /**
   * Crée une organisation.
   * - Si une organisation avec le même nom existe déjà, lie l'utilisateur dessus.
   * - Sinon, crée et lie comme responsable.
   */
  async create(data, userId) {
    const { nom, id_type_organisation, description, site_web } = data;

    const nomI18n = typeof nom === 'string' ? { fr: nom } : nom;
    const descI18n = typeof description === 'string' ? { fr: description } : (description || {});
    const searchStr = texteLisible(nom).trim();

    if (searchStr) {
      const existing = await this.repository.findByName(searchStr);
      if (existing) {
        // Ne pas rattacher automatiquement : sinon il suffirait de connaître le nom
        // d'une organisation pour publier des événements en son nom.
        const geree = this.models
          ? (await revendications.organisationsGerees(this.models, [existing.id_organisation])).size > 0
          : true;
        throw this._conflictError(geree
          ? 'Cette organisation existe déjà. Demandez à son responsable de vous ajouter comme membre.'
          : "Cette organisation existe déjà sur Tala DZ, sans responsable : ouvrez sa page et touchez « C'est mon organisation »."
        );
      }
    }

    // Nouvelle organisation : utilisable tout de suite par ses membres (événements),
    // sa page publique attend la vérification de l'équipe
    const organisation = await this.repository.create({
      ...champsVitrine(data),
      nom: nomI18n,
      id_type_organisation,
      description: descI18n,
      site_web: site_web || null,
      statut: 'en_attente'
    });

    await this.repository.linkUser(userId, organisation.id_organisation, 'responsable');
    await this._prevenirModeration(organisation, userId);
    return { organisation, created: true };
  }

  // ==========================================================================
  // PAGE PUBLIQUE
  // ==========================================================================

  /**
   * Annuaire : organisations vérifiées, filtrées par famille (associations, edition…),
   * wilaya et texte ; avec le nombre d'événements et d'œuvres de chacune.
   */
  async annuaire({ categorie = null, wilaya = null, q = '' } = {}) {
    const lignes = (await this.repository.findAnnuaire()).map(o => o.get({ plain: true }));
    const compteurs = await this.repository.compteurs(lignes.map(o => o.id_organisation));
    let organisations = lignes.map(o => ({
      ...o,
      categorie: categorieDuType(o.TypeOrganisation?.code),
      ...compteurs.get(o.id_organisation)
    }));

    // Familles et wilayas réellement présentes, pour les filtres
    const categories = {};
    for (const o of organisations) categories[o.categorie] = (categories[o.categorie] || 0) + 1;
    const wilayas = [...new Map(organisations.filter(o => o.Wilaya).map(o => [o.Wilaya.id_wilaya, o.Wilaya])).values()]
      .sort((a, b) => String(a.wilaya_name_ascii || '').localeCompare(String(b.wilaya_name_ascii || '')));

    if (categorie) organisations = organisations.filter(o => o.categorie === categorie);
    if (wilaya) organisations = organisations.filter(o => o.id_wilaya === Number(wilaya));
    const recherche = sansAccent(q).trim();
    if (recherche) {
      organisations = organisations.filter(o => textes(o.nom).includes(recherche) || textes(o.description).includes(recherche));
    }
    return { organisations, categories, wilayas };
  }

  /**
   * Vitrine d'une organisation : fiche, membres, événements, œuvres publiées.
   * Une organisation pas encore vérifiée n'est visible que de ses membres et de la modération.
   */
  async vitrine(id, { userId = null, isModerator = false } = {}) {
    const org = await this.repository.findVitrine(id);
    if (!org) {
      // Organisation fusionnée dans une autre : l'ancienne adresse mène à la page gardée
      const garde = this.models ? await fusion.redirection(this.models, id) : null;
      if (garde) return { redirection: garde };
      throw this._notFoundError(id);
    }
    const role = userId ? await this.repository.roleMembre(id, userId) : null;
    if (org.statut !== 'valide' && !role && !isModerator) throw this._notFoundError(id);

    const [membres, evenements, oeuvres, gerees, demande] = await Promise.all([
      this.repository.membres(id),
      this.repository.evenements(id),
      this.repository.oeuvres(id),
      this.models ? revendications.organisationsGerees(this.models, [Number(id)]) : new Set([Number(id)]),
      this.models ? revendications.maDemande(this.models, Number(id), userId) : null
    ]);
    const organisation = org.get({ plain: true });
    return {
      ...organisation,
      categorie: categorieDuType(organisation.TypeOrganisation?.code),
      membres,
      evenements,
      oeuvres,
      peutModifier: isModerator || ROLES_GESTION.includes(role),
      // Personne ne gère la page : un professionnel peut demander à en devenir responsable
      sansResponsable: !gerees.size,
      maDemande: demande
    };
  }

  /**
   * Modifier la page : responsables de l'organisation ou modération.
   * Une page refusée repart en vérification après correction ; une page publiée aussi si son nom
   * ou son type change (sinon une page vérifiée pourrait prendre le nom d'une autre organisation).
   */
  async modifier(id, data, { userId = null, isModerator = false } = {}) {
    const org = await this.repository.findById(id);
    if (!org) throw this._notFoundError(id);
    const role = userId ? await this.repository.roleMembre(id, userId) : null;
    if (!isModerator && !ROLES_GESTION.includes(role)) {
      throw this._forbiddenError("Seuls les responsables de l'organisation peuvent modifier sa page");
    }

    const champs = champsVitrine(data);
    if (data.nom !== undefined) {
      const nom = typeof data.nom === 'string' ? { fr: data.nom } : data.nom;
      if (!texteLisible(nom).trim()) throw this._validationError('Le nom est requis');
      champs.nom = nom;
    }
    if (data.description !== undefined) {
      champs.description = typeof data.description === 'string' ? { fr: data.description } : (data.description || {});
    }
    if (data.id_type_organisation !== undefined && Number(data.id_type_organisation) > 0) {
      champs.id_type_organisation = Number(data.id_type_organisation);
    }
    if (!isModerator) {
      const identiteChangee = (champs.nom !== undefined && !memesTextes(champs.nom, org.nom))
        || (champs.id_type_organisation !== undefined && champs.id_type_organisation !== Number(org.id_type_organisation));
      if (org.statut === 'rejete' || (org.statut === 'valide' && identiteChangee)) champs.statut = 'en_attente';
    }

    await org.update(champs);
    if (champs.statut === 'en_attente') await this._prevenirModeration(org, userId);
    return this.repository.findVitrine(id);
  }

  /**
   * Une maison d'édition ajoutée à la liste des éditeurs reçoit sa page : reliée à l'organisation
   * du même nom si elle existe, sinon créée (sans membre, à vérifier par l'équipe).
   */
  async pagePourEditeur(editeur, auteurId = null) {
    if (!editeur || editeur.id_organisation || !TYPES_EDITEUR_PAGE.includes(editeur.type_editeur)) return null;
    const nom = typeof editeur.nom === 'string' ? { fr: editeur.nom } : editeur.nom;
    let org = await this.repository.findByName(texteLisible(nom).trim());
    if (!org) {
      const type = await this.repository.findTypeParCode('maison_edition');
      if (!type) return null;
      org = await this.repository.create({
        nom,
        id_type_organisation: type.id_type_organisation,
        description: editeur.description || {},
        site_web: editeur.site_web || null,
        email: editeur.email || null,
        telephone: editeur.telephone || null,
        statut: 'en_attente'
      });
      await this._prevenirModeration(org, auteurId);
    }
    await editeur.update({ id_organisation: org.id_organisation });
    return org;
  }

  /**
   * Organisations au nom ressemblant (« Santa Cruz » / « Éditions Santa-Cruz ») :
   * proposées avant d'en créer une nouvelle, et à la modération pour repérer les doublons.
   */
  async ressemblantes(nom, { exclure = null, limite = 5 } = {}) {
    if (!nom || (typeof nom === 'string' && !nom.trim())) return [];
    const toutes = (await this.repository.findPourModeration()).map(o => o.get({ plain: true }));
    const proches = toutes.filter(o => o.id_organisation !== Number(exclure) && ressemble(nom, o.nom)).slice(0, limite);
    const gerees = await revendications.organisationsGerees(this.models, proches.map(o => o.id_organisation));
    return proches.map(o => ({
      id_organisation: o.id_organisation, nom: o.nom, statut: o.statut, logo_url: o.logo_url,
      TypeOrganisation: o.TypeOrganisation ? { nom: o.TypeOrganisation.nom, code: o.TypeOrganisation.code } : null,
      sansResponsable: !gerees.has(o.id_organisation)
    }));
  }

  // ==========================================================================
  // CATALOGUE D'UNE MAISON D'ÉDITION (import Excel)
  // ==========================================================================

  /** Maison d'édition vérifiée, dont le compte est responsable (ou modération) */
  async _maisonPourCatalogue(id, { userId = null, isModerator = false } = {}) {
    const org = await this.repository.findVitrine(id);
    if (!org) throw this._notFoundError(id);
    if (org.TypeOrganisation?.code !== 'maison_edition') {
      throw this._validationError("L'import de catalogue est réservé aux maisons d'édition");
    }
    const role = userId ? await this.repository.roleMembre(id, userId) : null;
    if (!isModerator && !ROLES_GESTION.includes(role)) {
      throw this._forbiddenError("Seuls les responsables de la maison d'édition peuvent importer son catalogue");
    }
    if (!isModerator && org.statut !== 'valide') {
      throw this._forbiddenError("La page de votre maison d'édition doit d'abord être vérifiée par l'équipe Tala DZ");
    }
    return org;
  }

  /** Langues et catégories des livres (pour le modèle et la vérification) */
  async _referencesCatalogue() {
    const container = require('../serviceContainer');
    const groupes = await container.metadataService.getCategoriesForType(catalogue.TYPE_LIVRE);
    return { groupes, refs: await catalogue.references(this.models, groupes) };
  }

  /** Modèle Excel à remplir (avec les listes de langues et de catégories du site) */
  async modeleCatalogue(id, droits) {
    await this._maisonPourCatalogue(id, droits);
    const { groupes } = await this._referencesCatalogue();
    const langues = (await this.models.Langue.findAll({ attributes: ['nom'], order: [['id_langue', 'ASC']] }))
      .map(l => texteLisible(l.nom)).filter(Boolean);
    const categories = [...new Set(groupes.flatMap(g => (g.categories || []).map(c => texteLisible(c.nom))).filter(Boolean))];
    return catalogue.modeleCatalogue({ langues, categories });
  }

  /** Aperçu ligne par ligne, sans rien enregistrer */
  async apercuCatalogue(id, buffer, nomsImages, droits) {
    await this._maisonPourCatalogue(id, droits);
    const { refs } = await this._referencesCatalogue();
    const lu = await catalogue.lireCatalogue(buffer, nomsImages, refs);
    return {
      resume: lu.resume,
      imagesSansLivre: lu.imagesSansLivre,
      lignes: lu.lignes.map(l => ({
        ligne: l.ligne, titre: texteLisible(l.titre), auteur: `${l.auteur.prenom} ${l.auteur.nom}`.trim(),
        isbn: l.isbn, couverture: l.couverture, etat: l.etat, erreurs: l.erreurs
      }))
    };
  }

  /**
   * Import : les lignes valides sont enregistrées, l'équipe est prévenue une seule fois.
   * Un seul import à la fois par maison (double clic, deux onglets) : sinon les mêmes livres
   * seraient créés deux fois.
   */
  async importerCatalogue(id, buffer, nomsImages, droits) {
    const org = await this._maisonPourCatalogue(id, droits);
    const cle = Number(id);
    if (importsEnCours.has(cle)) {
      throw this._conflictError('Un import de ce catalogue est déjà en cours : attendez qu’il se termine.');
    }
    importsEnCours.add(cle);
    try {
      return await this._importer(org, buffer, nomsImages, droits);
    } finally {
      importsEnCours.delete(cle);
    }
  }

  async _importer(org, buffer, nomsImages, droits) {
    const id = org.id_organisation;
    const { refs } = await this._referencesCatalogue();
    const lu = await catalogue.lireCatalogue(buffer, nomsImages, refs);
    const container = require('../serviceContainer');
    const bilan = await executer({ models: this.models, oeuvreService: container.oeuvreService, logger: this.logger },
      org, lu.lignes, droits.userId, { direct: !!droits.isModerator });
    this.logger.info(`Catalogue ${id} : ${bilan.crees.length} livre(s) créé(s), ${bilan.lies.length} relié(s), `
      + `${bilan.aVerifier.length} à vérifier, ${bilan.dejaPresents.length} déjà présent(s), ${bilan.echecs.length} échec(s)`);
    if ((bilan.crees.length || bilan.aVerifier.length) && this.models) {
      const parties = [];
      if (bilan.crees.length) parties.push(`a importé ${bilan.crees.length} livre(s) : ils attendent votre vérification`);
      if (bilan.aVerifier.length) {
        const isbn = bilan.aVerifier.map(l => l.isbn).filter(Boolean).slice(0, 10).join(', ');
        parties.push(`se dit éditeur de ${bilan.aVerifier.length} livre(s) déjà sur le site (ISBN ${isbn}) : reliez-les à la maison si c'est exact`);
      }
      for (const idAdmin of await idsAdministrateurs(this.models)) {
        if (idAdmin === droits.userId) continue;
        await notifier(this.notificationService, idAdmin, {
          titre: 'Catalogue à vérifier',
          message: `« ${texteLisible(org.nom)} » ${parties.join(' ; ')}.`,
          url_action: '/admin/dashboard?tab=oeuvres',
          metadata: { id_organisation: Number(id), livres_a_relier: bilan.aVerifier.map(l => l.id_oeuvre) }
        });
      }
    }
    return bilan;
  }

  // ==========================================================================
  // « C'EST MON ORGANISATION » (organisation sans responsable)
  // ==========================================================================

  /** Un professionnel demande à devenir responsable ; l'équipe est prévenue */
  async demanderResponsabilite(id, userId, message) {
    const org = await revendications.demander(this.models, Number(id), userId, message);
    for (const idAdmin of await idsAdministrateurs(this.models)) {
      if (idAdmin === userId) continue;
      await notifier(this.notificationService, idAdmin, {
        titre: 'Demande de responsable',
        message: `Un professionnel demande à gérer la page « ${texteLisible(org.nom)} ».`,
        url_action: '/admin/dashboard?tab=organisations', metadata: { id_organisation: Number(id) }
      });
    }
    return { statut: 'en_attente' };
  }

  async demandesResponsabilite() {
    return revendications.enAttente(this.models);
  }

  /** Accepter (le demandeur devient responsable) ou refuser avec un motif ; les demandeurs sont prévenus */
  async deciderResponsabilite(idDemande, decision, motif, adminId) {
    const { demande, organisation, refusesAuto } = await revendications.decider(this.models, Number(idDemande), decision, motif);
    const nomOrg = texteLisible(organisation?.nom);
    this.logger.info(`Demande de responsable ${idDemande} (${nomOrg}) : ${decision} par admin: ${adminId}`);
    await notifier(this.notificationService, demande.id_user, decision === 'acceptee'
      ? { titre: 'Vous gérez maintenant votre page', message: `Vous êtes responsable de « ${nomOrg} » : modifiez sa page et ajoutez vos contenus.`,
        url_action: `/organisations/${demande.id_organisation}`, metadata: { id_organisation: demande.id_organisation } }
      : { titre: 'Demande non acceptée', message: `Votre demande pour « ${nomOrg} » n'a pas été acceptée : ${String(motif).trim().slice(0, 300)}`,
        url_action: `/organisations/${demande.id_organisation}`, metadata: { id_organisation: demande.id_organisation } });
    for (const idUser of refusesAuto) {
      await notifier(this.notificationService, idUser, {
        titre: 'Demande non acceptée', message: `« ${nomOrg} » a déjà un responsable : demandez-lui de vous ajouter comme membre.`,
        url_action: `/organisations/${demande.id_organisation}`, metadata: { id_organisation: demande.id_organisation }
      });
    }
    return { statut: decision };
  }

  // ==========================================================================
  // MODÉRATION
  // ==========================================================================

  /** Ce que la fusion va déplacer, pour le résumé affiché avant confirmation */
  async apercuFusion(idGarde, idsDoublons) {
    return fusion.apercu(this.models, idGarde, idsDoublons);
  }

  /** Fusionner des doublons dans l'organisation gardée ; ses responsables sont prévenus */
  async fusionner(idGarde, idsDoublons, adminId) {
    const resultat = await fusion.fusionner(this.models, idGarde, idsDoublons);
    this.logger.info(`Organisations ${resultat.fusionnees.join(', ')} fusionnées dans ${idGarde} par admin: ${adminId}`);
    for (const idUser of resultat.responsables) {
      if (idUser === adminId) continue;
      await notifier(this.notificationService, idUser, {
        titre: 'Organisation regroupée',
        message: `Les pages en double de votre organisation ont été regroupées dans « ${texteLisible(resultat.garde.nom)} ».`,
        url_action: `/organisations/${idGarde}`, metadata: { id_organisation: Number(idGarde) }
      });
    }
    return this.repository.findVitrine(idGarde);
  }

  async listePourModeration() {
    return this.repository.findPourModeration();
  }

  async valider(id, adminId) {
    const org = await this.repository.findById(id);
    if (!org) throw this._notFoundError(id);
    await org.update({ statut: 'valide' });
    this.logger.info(`Organisation validée: ${id} par admin: ${adminId}`);
    for (const idUser of await this.repository.responsables(id)) {
      await notifier(this.notificationService, idUser, {
        titre: 'Page de votre organisation publiée',
        message: `« ${texteLisible(org.nom)} » est en ligne : les visiteurs la trouvent dans l'annuaire des organisations.`,
        url_action: `/organisations/${id}`, metadata: { id_organisation: id }
      });
    }
    return org;
  }

  async refuser(id, adminId, motif) {
    const raison = String(motif || '').trim();
    if (!raison) throw this._validationError('Un motif de refus est requis');
    const org = await this.repository.findById(id);
    if (!org) throw this._notFoundError(id);
    await org.update({ statut: 'rejete' });
    this.logger.info(`Organisation refusée: ${id} par admin: ${adminId}`);
    for (const idUser of await this.repository.responsables(id)) {
      await notifier(this.notificationService, idUser, {
        titre: 'Page de votre organisation à corriger',
        message: `« ${texteLisible(org.nom)} » n'a pas été publiée : ${raison.slice(0, 300)}. Modifiez-la : elle repartira en vérification.`,
        url_action: `/organisations/${id}/modifier`, metadata: { id_organisation: id }
      });
    }
    return org;
  }

  /** Une organisation attend une vérification : les administrateurs sont prévenus */
  async _prevenirModeration(org, auteurId) {
    if (!this.models) return;
    for (const idAdmin of await idsAdministrateurs(this.models)) {
      if (idAdmin === auteurId) continue;
      await notifier(this.notificationService, idAdmin, {
        titre: 'Organisation à vérifier',
        message: `« ${texteLisible(org.nom)} » attend votre vérification avant que sa page soit publiée.`,
        url_action: '/admin/dashboard?tab=organisations', metadata: { id_organisation: org.id_organisation }
      });
    }
  }
}

module.exports = OrganisationService;
