/**
 * ServiceService - Logique métier pour les services culturels
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const ServiceDTO = require('../../dto/service/serviceDTO');
const { mergeTranslations, texteLisible } = require('../../helpers/i18n');
const { sansAccent } = require('../../utils/texte');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const { memeUtilisateur } = require('../../utils/droits');

/** Nom lisible d'un service (nom multilingue) pour les notifications */
const nomLisible = (nom) => texteLisible(nom) || 'Service';

/** Valeur à comparer : vide = '', nombre = sa valeur (« 36.70000000 » = 36.7), multilingue sans ses langues vides */
function valeurComparable(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'object') {
    return JSON.stringify(Object.entries(v).filter(([, x]) => x !== '' && x != null).sort(([a], [b]) => a.localeCompare(b)));
  }
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : String(n);
}

class ServiceService extends BaseService {
  constructor(serviceRepository, options = {}) {
    super(serviceRepository, options);
    this.notificationService = options.notificationService;
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Services validés avec filtres
   */
  async findValidated(options = {}) {
    const result = await this.repository.findValidated(options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Annuaire des services aux visiteurs (page Patrimoine › Services aux visiteurs) :
   * services validés, filtrés par type, wilaya et texte ; les wilayas proposées sont
   * celles où il existe au moins un service (avant filtrage).
   */
  /**
   * @param {object} [options]
   * @param {(ids:number[]) => Promise<Map<number,{moyenne:number,nombre:number}>>} [options.notesDe] - notes des avis ;
   *   avec elle, chaque service reçoit sa note et son classement (calculé sur tous les services, avant les filtres)
   */
  async annuaire({ type = null, wilaya = null, q = '', notesDe = null } = {}) {
    const lignes = (await this.repository.findAnnuaire()).map(s => s.get({ plain: true }));
    let services = lignes.map(s => {
      const w = s.Lieu?.Commune?.Daira?.Wilaya || null;
      const { Lieu, Professionnel, ...reste } = s;
      return {
        ...reste,
        lieu: Lieu ? { id_lieu: Lieu.id_lieu, nom: Lieu.nom, commune: Lieu.Commune ? { id_commune: Lieu.Commune.id_commune, nom: Lieu.Commune.nom } : null } : null,
        wilaya: w,
        professionnel: Professionnel || null
      };
    });

    if (notesDe) {
      const notes = await notesDe(services.map(s => s.id));
      const { rangs } = await this.classement(notesDe);
      services = services.map(s => ({ ...s, note: notes.get(Number(s.id)) || null, classement: rangs.get(Number(s.id)) || null }));
    }

    const wilayas = [...new Map(services.filter(s => s.wilaya).map(s => [s.wilaya.id_wilaya, s.wilaya])).values()]
      .sort((a, b) => String(a.wilaya_name_ascii || '').localeCompare(String(b.wilaya_name_ascii || '')));

    if (type) services = services.filter(s => s.type_service === type);
    if (wilaya) services = services.filter(s => s.wilaya?.id_wilaya === Number(wilaya));
    const recherche = sansAccent(q).trim();
    if (recherche) {
      const textes = (v) => (v && typeof v === 'object' ? Object.values(v) : [v]).map(sansAccent).join(' ');
      services = services.filter(s => textes(s.nom).includes(recherche) || textes(s.description).includes(recherche)
        || textes(s.lieu?.nom).includes(recherche));
    }
    return { services, wilayas };
  }

  /**
   * Classement par type et par wilaya de tous les services validés, gardé 10 minutes en mémoire
   * (avant : recalculé à chaque fiche ouverte, sur l'annuaire entier). Relecture du 2026-11-16.
   * @returns {Promise<{ rangs: Map<number,{rang:number,total:number}>, wilayas: Map<number, object|null> }>}
   */
  async classement(notesDe) {
    const maintenant = Date.now();
    if (this._classementCache && maintenant - this._classementCache.quand < 10 * 60 * 1000) return this._classementCache.valeur;
    const services = this.repository.findPourClassement ? await this.repository.findPourClassement() : [];
    const notes = await notesDe(services.map(s => s.id));
    const valeur = {
      rangs: require('./classementServices').classer(services, notes),
      wilayas: new Map(services.map(s => [Number(s.id), s.wilaya]))
    };
    this._classementCache = { quand: maintenant, valeur };
    return valeur;
  }

  /**
   * Détail complet
   */
  async findWithFullDetails(id) {
    const service = await this.repository.findWithFullDetails(id);
    if (!service) {
      throw this._notFoundError(id);
    }
    return ServiceDTO.fromEntity(service);
  }

  /**
   * Par lieu
   */
  async findByLieu(lieuId, options = {}) {
    const result = await this.repository.findByLieu(lieuId, options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par professionnel
   */
  async findByProfessionnel(userId, options = {}) {
    const result = await this.repository.findByProfessionnel(userId, options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Recherche
   */
  async search(query, options = {}) {
    if (!query || query.length < 2) {
      throw this._validationError('Requête de recherche trop courte (min 2 caractères)');
    }
    const result = await this.repository.searchServices(query, options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un service
   */
  async create(data, userId) {
    if (!data.nom) {
      throw this._validationError('Le nom du service est requis');
    }
    if (!data.type_service && !data.typeService) {
      throw this._validationError('Le type de service est requis');
    }

    const lieuId = data.id_lieu || data.lieuId;
    if (lieuId && this.models?.Lieu) {
      const lieu = await this.models.Lieu.findByPk(lieuId);
      if (!lieu) throw this._validationError('Le lieu spécifié n\'existe pas');
    }

    // Validate GPS coordinates if provided
    const { isValidLatitude, isValidLongitude } = require('../utils/geoUtils');
    if (data.latitude != null && data.latitude !== '' && !isValidLatitude(data.latitude)) {
      throw this._validationError('Coordonnées GPS invalides (latitude : -90 à 90)');
    }
    if (data.longitude != null && data.longitude !== '' && !isValidLongitude(data.longitude)) {
      throw this._validationError('Coordonnées GPS invalides (longitude : -180 à 180)');
    }

    const entityData = {
      nom: data.nom,
      description: data.description || {},
      type_service: data.type_service || data.typeService,
      disponible: data.disponible !== undefined ? data.disponible : true,
      id_lieu: data.id_lieu || data.lieuId || null,
      id_user: userId,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      adresse: data.adresse || {},
      telephone: data.telephone || null,
      email: data.email || null,
      site_web: data.site_web || data.siteWeb || null,
      horaires: data.horaires || {},
      tarif_min: data.tarif_min || data.tarifMin || null,
      tarif_max: data.tarif_max || data.tarifMax || null,
      photo_url: data.photo_url || data.photoUrl || null,
      // Équipements, langues, capacité, réservation (lot 2) : vérifiés, listes fermées
      ...require('./detailsService').detailsService(data),
      statut: 'en_attente'
    };

    const service = await this.repository.create(entityData);
    const full = await this.repository.findWithFullDetails(service.id);

    this.logger.info(`Service créé: ${service.id} par user: ${userId}`);
    await this._prevenirModeration(service.id, entityData.nom, userId);
    return ServiceDTO.fromEntity(full);
  }

  /**
   * Propriétaire du service, ou modération (admin / modérateur).
   * Un service sans propriétaire (équipement d'un site) n'est gérable que par la modération.
   */
  _canManage(existing, userId, isModerator) {
    if (isModerator) return true;
    return memeUtilisateur(existing.id_user, userId);
  }

  /**
   * Modifier un service
   * @param {boolean} [isModerator] - admin ou modérateur
   */
  async update(id, data, userId, isModerator = false) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (!this._canManage(existing, userId, isModerator)) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres services');
    }

    const updateData = {};
    // Fusion des langues : une langue laissée vide ne remplace pas la traduction existante
    if (data.nom) updateData.nom = mergeTranslations(existing.nom, data.nom);
    if (data.description !== undefined) updateData.description = mergeTranslations(existing.description, data.description);
    if (data.type_service || data.typeService) updateData.type_service = data.type_service || data.typeService;
    if (data.disponible !== undefined) updateData.disponible = data.disponible;
    if (data.id_lieu || data.lieuId) {
      // Lieu inexistant : message clair (avant : erreur 500 de clé étrangère)
      const lieuId = data.id_lieu || data.lieuId;
      if (this.models?.Lieu && !(await this.models.Lieu.findByPk(lieuId, { attributes: ['id_lieu'] }))) {
        throw this._validationError("Le lieu spécifié n'existe pas");
      }
      updateData.id_lieu = lieuId;
    }
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.adresse) updateData.adresse = mergeTranslations(existing.adresse, data.adresse);
    // Champ laissé vide : null (avant : '' était refusé par la règle isEmail du modèle, et un service
    // sans e-mail ne pouvait plus être modifié du tout)
    const videEnNull = (v) => (typeof v === 'string' && !v.trim() ? null : v);
    if (data.telephone !== undefined) updateData.telephone = videEnNull(data.telephone);
    if (data.email !== undefined) updateData.email = videEnNull(data.email);
    if (data.site_web !== undefined || data.siteWeb !== undefined) updateData.site_web = videEnNull(data.site_web || data.siteWeb || null);
    if (data.horaires) updateData.horaires = data.horaires;
    // Tarif vidé (null) ou gratuit (0) : enregistré tel quel (avant : « || » les changeait en undefined, rien n'était écrit)
    const tarif = (a, b) => { const v = a !== undefined ? a : b; return v === '' ? null : v; };
    if (data.tarif_min !== undefined || data.tarifMin !== undefined) updateData.tarif_min = tarif(data.tarif_min, data.tarifMin);
    if (data.tarif_max !== undefined || data.tarifMax !== undefined) updateData.tarif_max = tarif(data.tarif_max, data.tarifMax);
    if (data.photo_url || data.photoUrl) updateData.photo_url = data.photo_url || data.photoUrl;
    Object.assign(updateData, require('./detailsService').detailsService(data));

    // Un service déjà validé dont le contenu public change repasse en modération
    // (sinon un pro pourrait faire valider un contenu puis le remplacer).
    // Lieu, type et position comptent aussi (un service pouvait être déplacé sur un autre lieu sans
    // relecture) ; horaires, tarifs et disponibilité restent modifiables sans repasser en attente.
    // Lien de réservation et WhatsApp : des coordonnées, relues comme le site web et le téléphone ;
    // équipements, langues et capacité (listes fermées) restent modifiables sans relecture
    const PUBLIC_FIELDS = ['nom', 'description', 'site_web', 'email', 'telephone', 'photo_url', 'adresse', 'lien_reservation', 'whatsapp'];
    const POSITION = ['id_lieu', 'type_service', 'latitude', 'longitude'];
    // Le formulaire renvoie tous les champs : on compare les valeurs, leur seule présence retirait le
    // service du site à chaque changement d'horaire
    const change = f => updateData[f] !== undefined && valeurComparable(updateData[f]) !== valeurComparable(existing[f]);
    if (!isModerator && existing.statut === 'valide' && [...PUBLIC_FIELDS, ...POSITION].some(change)) {
      updateData.statut = 'en_attente';
    }
    // Un service refusé, corrigé par son propriétaire, repart en validation
    if (!isModerator && existing.statut === 'rejete') {
      updateData.statut = 'en_attente';
    }

    await this.repository.update(id, updateData);
    if (updateData.statut === 'en_attente') await this._prevenirModeration(id, updateData.nom || existing.nom, userId);
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Service modifié: ${id} par user: ${userId}`);
    return ServiceDTO.fromEntity(updated);
  }

  /**
   * Supprimer
   */
  async delete(id, userId, isModerator = false) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (!this._canManage(existing, userId, isModerator)) {
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres services');
    }

    // Galerie et menus : les lignes partent avec le service ; leurs fichiers sont effacés ensuite
    const fichiers = await require('./mediasService').urlsDuService(this.models || {}, id).catch(() => []);
    await this.repository.delete(id);
    if (fichiers.length) await require('../user/userFileCleanup').deleteUserFiles(this.models, fichiers).catch(() => undefined);
    this.logger.info(`Service supprimé: ${id} par user: ${userId}`);
    return true;
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /** Tous les services des professionnels, par statut (modération) */
  async findForModeration(options = {}) {
    const result = await this.repository.findForModeration(options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /** Un service attend une validation : les administrateurs sont prévenus */
  async _prevenirModeration(id, nom, auteurId) {
    if (!this.models) return;
    for (const idAdmin of await idsAdministrateurs(this.models)) {
      if (idAdmin === auteurId) continue;
      await notifier(this.notificationService, idAdmin, {
        titre: 'Service à valider',
        message: `« ${nomLisible(nom)} » attend votre validation avant d'être publié.`,
        url_action: '/admin/dashboard?tab=services', metadata: { id_service: id }
      });
    }
  }

  /**
   * En attente de validation
   */
  async findPending(options = {}) {
    const result = await this.repository.findPending(options);
    return {
      data: ServiceDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Valider un service
   */
  async validate(id, adminId) {
    const service = await this.repository.findById(id);
    if (!service) throw this._notFoundError(id);

    if (service.statut === 'valide') {
      throw this._conflictError('Ce service est déjà validé');
    }
    await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, adminId, service.id_user, 'votre propre service');

    await this.repository.update(id, { statut: 'valide' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Service validé: ${id} par admin: ${adminId}`);
    await notifier(this.notificationService, service.id_user, {
      titre: 'Service publié',
      message: `« ${nomLisible(service.nom)} » est en ligne : les visiteurs le voient sur Tala DZ.`,
      url_action: `/services/${id}`, metadata: { id_service: id }
    });
    return ServiceDTO.fromEntity(updated);
  }

  /**
   * Rejeter un service
   */
  async reject(id, adminId, motif) {
    const service = await this.repository.findById(id);
    if (!service) throw this._notFoundError(id);

    if (!motif || motif.trim().length === 0) {
      throw this._validationError('Un motif de rejet est requis');
    }
    await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, adminId, service.id_user, 'votre propre service');

    await this.repository.update(id, { statut: 'rejete' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Service rejeté: ${id} par admin: ${adminId}, motif: ${motif}`);
    await notifier(this.notificationService, service.id_user, {
      titre: 'Service à corriger',
      message: `« ${nomLisible(service.nom)} » n'a pas été publié : ${String(motif).trim().slice(0, 300)}. Modifiez-le : il repartira en validation.`,
      url_action: `/modifier-service/${id}`, metadata: { id_service: id }
    });
    return ServiceDTO.fromEntity(updated);
  }

  /**
   * Statistiques
   */
  async getStats() {
    return this.repository.getStats();
  }
}

module.exports = ServiceService;
