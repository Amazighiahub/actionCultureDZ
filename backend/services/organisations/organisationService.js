const BaseService = require('../core/baseService');
const { texteLisible } = require('../../helpers/i18n');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const { categorieDuType } = require('./categories');
const fusion = require('./fusionOrganisations');
const { ressemble } = require('./nomsRessemblants');

// Réseaux sociaux acceptés sur la page d'une organisation
const RESEAUX = ['facebook', 'instagram', 'youtube', 'x', 'linkedin', 'tiktok'];
// Rôles qui peuvent modifier la page
const ROLES_GESTION = ['responsable', 'directeur'];
// Éditeurs (liste des œuvres) qui reçoivent une page d'organisation « Maison d'édition »
const TYPES_EDITEUR_PAGE = ['maison_edition', 'editeur_scientifique'];

const sansAccent = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
        throw this._conflictError(
          'Cette organisation existe déjà. Demandez à son responsable de vous ajouter comme membre.'
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

    const [membres, evenements, oeuvres] = await Promise.all([
      this.repository.membres(id),
      this.repository.evenements(id),
      this.repository.oeuvres(id)
    ]);
    const organisation = org.get({ plain: true });
    return {
      ...organisation,
      categorie: categorieDuType(organisation.TypeOrganisation?.code),
      membres,
      evenements,
      oeuvres,
      peutModifier: isModerator || ROLES_GESTION.includes(role)
    };
  }

  /**
   * Modifier la page : responsables de l'organisation ou modération.
   * Une page refusée repart en vérification après correction.
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
    if (org.statut === 'rejete' && !isModerator) champs.statut = 'en_attente';

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
    return toutes
      .filter(o => o.id_organisation !== Number(exclure) && ressemble(nom, o.nom))
      .slice(0, limite)
      .map(o => ({
        id_organisation: o.id_organisation, nom: o.nom, statut: o.statut, logo_url: o.logo_url,
        TypeOrganisation: o.TypeOrganisation ? { nom: o.TypeOrganisation.nom, code: o.TypeOrganisation.code } : null
      }));
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
