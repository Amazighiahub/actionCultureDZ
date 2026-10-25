/**
 * EvenementService - Logique métier pour les événements
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const { lireTags, resolveTagIds } = require('../../helpers/tags');
const EvenementDTO = require('../../dto/evenement/evenementDTO');
const CacheManager = require('../../utils/CacheManager');
const { verifierReponses, reponsesFormulaireBase } = require('./formulaireInscription');
const { mergeTranslations, lireMultiLang } = require('../../helpers/i18n');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const { evenementPath } = require('../../utils/slug');

/** Nom lisible d'un événement (nom multilingue) pour les notifications */
const nomLisible = (nom) => (typeof nom === 'object' && nom ? (nom.fr || nom.ar || Object.values(nom).find(Boolean)) : nom) || 'Événement';

class EvenementService extends BaseService {
  constructor(evenementRepository, options = {}) {
    super(evenementRepository, options);
    this.notificationService = options.notificationService;
    this.cache = CacheManager.create({
      namespace: 'evenements',
      defaultTTL: 2 * 60 * 1000, // 2 min — les événements changent plus souvent que les metadata
      maxSize: 50
    });
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Liste des événements publiés
   */
  async findPublished(options = {}) {
    const cacheKey = `published:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findPublished(options);
      return {
        data: EvenementDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Événements à venir
   */
  async findUpcoming(options = {}) {
    const cacheKey = `upcoming:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findUpcoming(options);
      return {
        data: EvenementDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Détail complet d'un événement
   */
  async findWithFullDetails(id) {
    const evenement = await this.repository.findWithFullDetails(id);
    if (!evenement) {
      throw this._notFoundError(id);
    }
    return EvenementDTO.fromEntity(evenement);
  }

  /**
   * Événements associés à une œuvre
   */
  async findByOeuvre(oeuvreId) {
    const evenements = await this.repository.findByOeuvre(oeuvreId);
    return EvenementDTO.fromEntities(evenements);
  }

  /**
   * Événements par organisateur
   */
  async findByOrganisateur(userId, options = {}) {
    const result = await this.repository.findByOrganisateur(userId, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
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
    const result = await this.repository.searchEvenements(query, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par wilaya
   */
  async findByWilaya(wilayaId, options = {}) {
    const cacheKey = `wilaya:${wilayaId}:${JSON.stringify(options)}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findByWilaya(wilayaId, options);
      return {
        data: EvenementDTO.fromEntities(result.data),
        pagination: result.pagination
      };
    });
  }

  /**
   * Tous les événements (admin)
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll({
      ...options,
      include: this.repository._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un événement
   */
  async create(data, userId, options = {}) {
    if (!data.nom_evenement && !data.nom) {
      throw this._validationError('Le nom de l\'événement est requis');
    }

    const lieuId = data.id_lieu || data.lieuId;
    if (lieuId && this.models?.Lieu) {
      const lieu = await this.models.Lieu.findByPk(lieuId);
      if (!lieu) throw this._validationError('Le lieu spécifié n\'existe pas');
    }

    // Vérifier les doublons (même nom + même date + même lieu)
    // Formulaire multipart : nom et description arrivent en texte JSON
    data = { ...data, nom_evenement: lireMultiLang(data.nom_evenement || data.nom), description: lireMultiLang(data.description) };
    const nomEvent = data.nom_evenement;
    const nomFr = typeof nomEvent === 'object' ? nomEvent.fr : nomEvent;
    if (nomFr && data.date_debut) {
      const { Sequelize, Op } = require('sequelize');
      const dupWhere = { date_debut: data.date_debut };
      if (lieuId) dupWhere.id_lieu = lieuId;
      const existing = await this.repository.model.findOne({
        where: {
          ...dupWhere,
          [Op.or]: [
            Sequelize.where(Sequelize.fn('JSON_EXTRACT', Sequelize.col('nom_evenement'), Sequelize.literal("'$.fr'")), nomFr),
          ]
        }
      });
      if (existing) {
        const err = new Error('Un événement avec ce nom existe déjà à cette date');
        err.statusCode = 409;
        err.code = 'DUPLICATE_EVENT';
        throw err;
      }
    }

    const typeId = data.id_type_evenement || data.typeEvenementId;
    if (typeId && this.models?.TypeEvenement) {
      const type = await this.models.TypeEvenement.findByPk(typeId);
      if (!type) throw this._validationError('Le type d\'événement spécifié n\'existe pas');
    }

    // Événement présentiel (pas de url_virtuel) → organisation requise
    const urlVirtuel = data.url_virtuel || data.urlVirtuel;
    const orgId = data.id_organisation || data.organisationId;
    if (!urlVirtuel && !orgId) {
      throw this._validationError('Une organisation est requise pour les événements en présentiel');
    }

    const entityData = {
      nom_evenement: data.nom_evenement || data.nom,
      description: data.description || {},
      // Le formulaire envoie le jour et l'heure séparément : les deux sont gardés
      date_debut: this._avecHeure(data.date_debut || data.dateDebut, data.heure_debut || data.heureDebut),
      date_fin: this._avecHeure(data.date_fin || data.dateFin, data.heure_fin || data.heureFin),
      id_lieu: data.id_lieu || data.lieuId,
      id_type_evenement: data.id_type_evenement || data.typeEvenementId,
      // « Publier » : un professionnel envoie l'événement à la validation ; l'administration publie
      statut: this._statutDemande(data.statut, options.isAdmin),
      capacite_max: data.capacite_max || data.capaciteMax,
      tarif: data.tarif || 0,
      inscription_requise: data.inscription_requise || data.inscriptionRequise || false,
      contact_email: data.contact_email || data.contactEmail,
      contact_telephone: data.contact_telephone || data.contactTelephone,
      url_virtuel: data.url_virtuel || data.urlVirtuel,
      image_url: data.image_url || data.imageUrl,
      age_minimum: data.age_minimum || data.ageMinimum,
      accessibilite: data.accessibilite || {},
      certificat_delivre: data.certificat_delivre || data.certificatDelivre || false,
      date_limite_inscription: data.date_limite_inscription || data.dateLimiteInscription,
      id_user: userId
    };

    const evenement = await this.withTransaction(async (transaction) => {
      await this._assertOrganisationMember(orgId, userId, options.isAdmin, transaction);
      const created = await this.repository.create(entityData, { transaction });
      if (orgId && this.models?.EvenementOrganisation) {
        await this.models.EvenementOrganisation.create({
          id_evenement: created.id_evenement,
          id_organisation: parseInt(orgId),
          role: 'organisateur_principal'
        }, { transaction });
      }
      await this._syncTags(created.id_evenement, data.tags, transaction);
      return created;
    });

    const full = await this.repository.findWithFullDetails(evenement.id_evenement);

    this.cache.invalidate();
    this.logger.info(`Événement créé: ${evenement.id_evenement} par user: ${userId}`);
    if (full?.statut === 'en_attente') await this._prevenirModeration(full);

    return EvenementDTO.fromEntity(full);
  }

  /**
   * Modifier un événement
   */
  /**
   * Mots-clés de l'événement (même table que ceux des œuvres). Champ absent : rien ne change ;
   * liste (ou texte JSON du formulaire) : remplace les mots-clés de l'événement.
   */
  async _syncTags(idEvenement, valeur, transaction) {
    const { EvenementTag } = this.models || {};
    const tags = lireTags(valeur);
    if (tags === null || !EvenementTag) return;
    const ids = await resolveTagIds(this.models, tags, transaction);
    await EvenementTag.destroy({ where: { id_evenement: idEvenement }, transaction });
    if (ids.length) {
      await EvenementTag.bulkCreate(ids.map(id_tag => ({ id_evenement: idEvenement, id_tag })), { transaction, ignoreDuplicates: true });
    }
  }

  /**
   * Jour (« 2026-10-29 ») + heure (« 10:00 ») → instant à l'heure de l'Algérie (UTC+1,
   * sans heure d'été). Une date déjà complète, ou sans heure, est gardée telle quelle.
   */
  _avecHeure(date, heure) {
    if (!date || !heure) return date;
    const jour = String(date);
    const hm = String(heure).match(/^(\d{2}):(\d{2})/);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !hm) return date;
    return `${jour}T${hm[1]}:${hm[2]}:00+01:00`;
  }

  /**
   * L'utilisateur doit être membre actif de l'organisation qu'il associe à un événement
   * (sinon il pourrait publier au nom de n'importe quelle organisation).
   */
  async _assertOrganisationMember(orgId, userId, isAdmin, transaction) {
    if (!orgId || isAdmin || !this.models?.UserOrganisation) return;
    const membership = await this.models.UserOrganisation.findOne({
      where: { id_user: userId, id_organisation: parseInt(orgId, 10) },
      transaction
    });
    if (!membership || membership.actif === false) {
      throw this._forbiddenError('Vous n\'êtes pas membre de cette organisation');
    }
  }

  async update(id, data, userId, options = {}) {
    let envoye = false;
    await this.withTransaction(async (transaction) => {
      const existing = await this.repository.findById(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!existing) throw this._notFoundError(id);

      if (parseInt(existing.id_user) !== parseInt(userId) && !options.isAdmin) {
        throw this._forbiddenError('Vous ne pouvez modifier que vos propres événements');
      }

      // L'organisateur complète son événement après publication (lieu exact, tarif, horaires…) ;
      // un événement annulé ou terminé reste figé. Le statut ne change pas ici (routes /publish, /cancel).
      if (['annule', 'termine'].includes(existing.statut)) {
        throw this._validationError('Un événement annulé ou terminé ne peut plus être modifié');
      }

      const updateData = {};
      // Fusion des langues : une langue laissée vide ne remplace pas la traduction existante
      if (data.nom_evenement || data.nom) updateData.nom_evenement = mergeTranslations(existing.nom_evenement, data.nom_evenement || data.nom);
      if (data.description !== undefined) updateData.description = mergeTranslations(existing.description, data.description);
      if (data.date_debut || data.dateDebut) updateData.date_debut = this._avecHeure(data.date_debut || data.dateDebut, data.heure_debut || data.heureDebut);
      if (data.date_fin || data.dateFin) updateData.date_fin = this._avecHeure(data.date_fin || data.dateFin, data.heure_fin || data.heureFin);
      if (data.id_lieu || data.lieuId) updateData.id_lieu = data.id_lieu || data.lieuId;
      if (data.id_type_evenement || data.typeEvenementId) updateData.id_type_evenement = data.id_type_evenement || data.typeEvenementId;
      // Statut : un brouillon peut être envoyé à la validation (ou publié par l'administration) ;
      // le reste passe par les routes dédiées (/publish, /cancel)
      if (existing.statut === 'brouillon' && data.statut === 'publie') {
        updateData.statut = this._statutDemande('publie', options.isAdmin);
        envoye = updateData.statut === 'en_attente';
      }
      if (data.capacite_max || data.capaciteMax) updateData.capacite_max = data.capacite_max || data.capaciteMax;
      if (data.tarif !== undefined) updateData.tarif = data.tarif;
      if (data.image_url || data.imageUrl) updateData.image_url = data.image_url || data.imageUrl;
      if (data.contact_email || data.contactEmail) updateData.contact_email = data.contact_email || data.contactEmail;
      if (data.contact_telephone || data.contactTelephone) updateData.contact_telephone = data.contact_telephone || data.contactTelephone;
      if (data.url_virtuel !== undefined || data.urlVirtuel !== undefined) {
        updateData.url_virtuel = data.url_virtuel ?? data.urlVirtuel ?? null;
      }

      const newOrgId = data.id_organisation || data.organisationId;

      // Validation présentiel → organisation requise (état final après merge)
      const finalUrlVirtuel = updateData.url_virtuel !== undefined ? updateData.url_virtuel : existing.url_virtuel;
      if (!finalUrlVirtuel && !newOrgId && this.models?.EvenementOrganisation) {
        const existingOrgs = await this.models.EvenementOrganisation.count({
          where: { id_evenement: id },
          transaction
        });
        if (existingOrgs === 0) {
          throw this._validationError('Une organisation est requise pour les événements en présentiel');
        }
      }

      await this.repository.update(id, updateData, { transaction });
      await this._syncTags(id, data.tags, transaction);

      if (newOrgId && this.models?.EvenementOrganisation) {
        await this._assertOrganisationMember(newOrgId, userId, options.isAdmin, transaction);
        const existingOrg = await this.models.EvenementOrganisation.findOne({
          where: { id_evenement: id, role: 'organisateur_principal' },
          transaction
        });
        if (existingOrg) {
          await existingOrg.update({ id_organisation: parseInt(newOrgId) }, { transaction });
        } else {
          await this.models.EvenementOrganisation.create({
            id_evenement: id,
            id_organisation: parseInt(newOrgId),
            role: 'organisateur_principal'
          }, { transaction });
        }
      }
    });

    const updated = await this.repository.findWithFullDetails(id);

    this.cache.invalidate();
    // Invalider le cache middleware pour que les listes soient à jour
    const cacheMiddleware = require('../../middlewares/cacheMiddleware');
    await cacheMiddleware.clearCache('professionnel');
    await cacheMiddleware.clearCache('evenement');
    this.logger.info(`Événement modifié: ${id} par user: ${userId}`);
    if (envoye) await this._prevenirModeration(updated);

    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Supprimer un événement
   */
  async delete(id, userId, options = {}) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    // Vérifier propriété (admin bypass) — parseInt pour éviter mismatch string/int
    if (parseInt(existing.id_user) !== parseInt(userId) && !options.isAdmin) {
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres événements');
    }

    // Contrôle d'état : seuls les brouillons peuvent être supprimés (admin bypass)
    if (!options.isAdmin && !['brouillon', 'en_attente'].includes(existing.statut)) {
      throw this._validationError('Seuls les événements en brouillon peuvent être supprimés. Utilisez l\'annulation pour les événements publiés.');
    }

    await this.repository.delete(id);
    this.cache.invalidate();
    // Invalider le cache middleware pour que les listes soient à jour — await pour que Redis soit vidé avant la réponse
    const cacheMiddleware = require('../../middlewares/cacheMiddleware');
    await cacheMiddleware.clearCache('professionnel');
    await cacheMiddleware.clearCache('evenement');
    this.logger.info(`Événement supprimé: ${id} par user: ${userId}`);
    return true;
  }

  // ============================================================================
  // INSCRIPTION / PARTICIPANTS
  // ============================================================================

  /**
   * Inscrire un participant
   */
  async registerParticipant(evenementId, userId, data = {}) {
    const registration = await this.withTransaction(async (transaction) => {
      const evenement = await this.repository.findById(evenementId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!evenement) throw this._notFoundError(evenementId);

      const openStatuses = ['publie', 'planifie', 'en_cours'];
      if (!openStatuses.includes(evenement.statut)) {
        throw this._validationError('Les inscriptions ne sont pas ouvertes pour cet événement');
      }

      if (evenement.date_limite_inscription && new Date() > new Date(evenement.date_limite_inscription)) {
        throw this._validationError('La date limite d\'inscription est dépassée');
      }

      if (evenement.capacite_max) {
        const count = await this.repository.countParticipants(evenementId, { transaction });
        if (count >= evenement.capacite_max) {
          throw this._validationError('L\'événement est complet');
        }
      }

      const reponses_inscription = await this._reponsesInscription(evenement, data, transaction);
      return this.repository.registerParticipant(evenementId, userId, { transaction, reponses_inscription });
    });

    this.logger.info(`Participant inscrit: user ${userId} → événement ${evenementId}`);
    return registration;
  }

  /**
   * Formulaire du type d'événement s'il en a un, sinon formulaire de base
   * (nombre de personnes + commentaire).
   */
  async _reponsesInscription(evenement, data, transaction) {
    const config = await this._configInscription(evenement.id_type_evenement, transaction);
    if (!config) return reponsesFormulaireBase(data);

    const { reponses, erreurs } = verifierReponses(config, data.reponses);
    if (erreurs.length) {
      throw this._validationError(
        `Formulaire d'inscription incomplet : ${erreurs.map(e => e.label).join(', ')}`,
        erreurs
      );
    }
    return reponses;
  }

  async _configInscription(idTypeEvenement, transaction) {
    if (!idTypeEvenement || !this.models?.TypeEvenement) return null;
    const type = await this.models.TypeEvenement.findByPk(idTypeEvenement, {
      attributes: ['config_inscription'],
      transaction
    });
    const config = type?.config_inscription;
    return config && Array.isArray(config.sections) && config.sections.length ? config : null;
  }

  /**
   * Désinscrire un participant
   */
  async unregisterParticipant(evenementId, userId) {
    const result = await this.repository.unregisterParticipant(evenementId, userId);
    if (!result) {
      throw this._notFoundError(evenementId);
    }
    this.logger.info(`Participant désinscrit: user ${userId} → événement ${evenementId}`);
    return true;
  }

  // ============================================================================
  // PARTICIPANTS
  // ============================================================================

  /**
   * Vérifie que le demandeur est le créateur ou un admin
   */
  async _assertEventOwnerOrAdmin(evenementId, userId, isAdmin) {
    const evenement = await this.repository.findById(evenementId);
    if (!evenement) throw this._notFoundError(evenementId);
    if (evenement.id_user !== userId && !isAdmin) {
      throw this._forbiddenError('Accès non autorisé');
    }
    return evenement;
  }

  /**
   * Liste publique des participants confirmés (données limitées pour la confidentialité)
   */
  async getPublicParticipants(evenementId) {
    const participants = await this.repository.getPublicParticipants(evenementId);
    return {
      participants,
      total: participants.length
    };
  }

  /**
   * Liste les participants d'un événement
   */
  async getParticipants(evenementId, requesterId, isAdmin) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, isAdmin);
    return this.repository.getParticipants(evenementId);
  }

  /**
   * Vérifie l'inscription d'un utilisateur à un événement
   */
  async getMyRegistration(evenementId, userId) {
    const inscription = await this.repository.getRegistration(evenementId, userId);
    if (!inscription) {
      return { isRegistered: false, status: null };
    }
    return {
      isRegistered: true,
      status: inscription.statut_participation,
      inscription
    };
  }

  /**
   * Valide ou refuse la participation d'un utilisateur
   */
  async validateParticipation(evenementId, userId, validated, validatedBy, notes) {
    await this._assertEventOwnerOrAdmin(evenementId, validatedBy.id, validatedBy.isAdmin);

    const participation = await this.repository.updateParticipationStatus(evenementId, userId, {
      statut_participation: validated ? 'confirme' : 'annule',
      date_validation: new Date(),
      valide_par: validatedBy.id
    });

    if (!participation) {
      throw this._notFoundError(userId);
    }

    // Notification (best effort, fire-and-forget — ne pas bloquer la réponse HTTP)
    if (this.models?.Notification) {
      const NotificationService = require('../notificationService');
      const notifService = new NotificationService(this.models);
      notifService.notifierValidationParticipation(
        evenementId, userId, validated ? 'confirme' : 'refuse', notes || ''
      ).catch(notifError => {
        this.logger.error('Erreur notification validation participation:', notifError);
      });
    }

    return participation;
  }

  /**
   * Récupère le profil d'un participant inscrit à un événement
   */
  async getParticipantProfil(evenementId, userId) {
    const participation = await this.repository.getRegistration(evenementId, userId);
    if (!participation) {
      throw this._notFoundError(userId);
    }

    const user = await this.repository.getParticipantProfile(userId);
    if (!user) {
      throw this._notFoundError(userId);
    }

    // Questions du formulaire, pour afficher les réponses avec leur intitulé
    const evenement = await this.repository.findById(evenementId, { attributes: ['id_type_evenement'] });
    const formulaire = evenement ? await this._configInscription(evenement.id_type_evenement) : null;

    return { profil: user, participation, formulaire };
  }

  /**
   * Liste les professionnels en attente pour un événement
   */
  async getProfessionnelsEnAttente(evenementId, requesterId, isAdmin) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, isAdmin);
    return this.repository.getPendingProfessionals(evenementId);
  }

  // ============================================================================
  // OEUVRES D'UN ÉVÉNEMENT
  // ============================================================================

  /**
   * Récupère les oeuvres d'un user pour un événement (ajoutées + disponibles)
   */
  async getMesOeuvres(evenementId, userId) {
    const { oeuvresAjoutees, toutesOeuvres } = await this.repository.getOeuvresForUser(evenementId, userId);
    const idsAjoutees = new Set(oeuvresAjoutees.map(eo => eo.id_oeuvre));
    const oeuvresDisponibles = toutesOeuvres.filter(o => !idsAjoutees.has(o.id_oeuvre));
    return { oeuvres_ajoutees: oeuvresAjoutees, oeuvres_disponibles: oeuvresDisponibles };
  }

  /**
   * Ajoute une oeuvre à un événement
   */
  async addOeuvreToEvent(evenementId, oeuvreId, userId, data = {}, options = {}) {
    // L'événement doit exister et être encore ouvert
    const evenement = await this.repository.findById(evenementId);
    if (!evenement) throw this._notFoundError(evenementId);
    if (['annule', 'termine'].includes(evenement.statut)) {
      throw this._validationError('Cet événement n\'accepte plus de nouvelles œuvres');
    }

    // Seuls l'organisateur, un participant confirmé ou un admin peuvent y présenter une œuvre
    const isOrganizer = Number(evenement.id_user) === Number(userId);
    if (!isOrganizer && !options.isAdmin) {
      const participation = this.models?.EvenementUser && await this.models.EvenementUser.findOne({
        where: { id_evenement: evenementId, id_user: userId, statut_participation: ['confirme', 'present'] }
      });
      if (!participation) {
        throw this._forbiddenError('Seuls l\'organisateur et les participants confirmés peuvent ajouter une œuvre');
      }
    }

    // Vérifier ownership de l'œuvre
    const oeuvre = await this.repository.findOeuvreByOwner(oeuvreId, userId);
    if (!oeuvre) {
      throw this._notFoundError(oeuvreId);
    }

    // Vérifier doublon
    const existing = await this.repository.findEvenementOeuvre(evenementId, oeuvreId);
    if (existing) {
      const error = this._validationError('Oeuvre déjà ajoutée à cet événement');
      error.statusCode = 409;
      throw error;
    }

    return this.repository.addOeuvreToEvent({
      id_evenement: evenementId,
      id_oeuvre: oeuvreId,
      id_presentateur: userId,
      description_presentation: data.description_presentation,
      duree_presentation: data.duree_presentation
    });
  }

  /**
   * Met à jour une oeuvre dans un événement
   */
  async updateOeuvreInEvent(evenementId, oeuvreId, userId, body) {
    const updates = {};
    if (body.description_presentation !== undefined) updates.description_presentation = body.description_presentation;
    if (body.duree_presentation !== undefined) updates.duree_presentation = body.duree_presentation;
    if (body.ordre_presentation !== undefined) updates.ordre_presentation = body.ordre_presentation;
    else if (body.ordre !== undefined) updates.ordre_presentation = body.ordre;

    const result = await this.repository.updateOeuvreInEvent(evenementId, oeuvreId, userId, updates);
    if (!result) {
      throw this._notFoundError(oeuvreId);
    }
    return result;
  }

  /**
   * Réordonne les oeuvres d'un événement
   */
  async reorderOeuvres(evenementId, userId, oeuvres) {
    if (!oeuvres || !oeuvres.length) {
      throw this._validationError('Liste des oeuvres requise');
    }
    await this.repository.reorderOeuvres(evenementId, userId, oeuvres);
    return this.repository.getOeuvresOrdered(evenementId, userId);
  }

  /**
   * Supprime une oeuvre d'un événement
   */
  async removeOeuvreFromEvent(evenementId, oeuvreId, userId) {
    const deleted = await this.repository.removeOeuvreFromEvent(evenementId, oeuvreId, userId);
    if (!deleted) {
      throw this._notFoundError(oeuvreId);
    }
    return true;
  }

  /**
   * Exporte les données d'un événement (après vérification d'autorisation)
   */
  async exportEventData(evenementId, requesterId, isAdmin) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, isAdmin);
    const evenement = await this.repository.findWithFullDetails(evenementId);
    if (!evenement) throw this._notFoundError(evenementId);
    return EvenementDTO.fromEntity(evenement);
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Événements en attente
   */
  async findPending(options = {}) {
    const result = await this.repository.findPending(options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Publier un événement
   */
  async publish(id, adminId, { statut, raison } = {}) {
    const evenement = await this.repository.findById(id);
    if (!evenement) throw this._notFoundError(id);
    const nom = nomLisible(evenement.nom_evenement);
    const lien = evenementPath(id, evenement.nom_evenement);

    // Refus : l'événement revient en brouillon, l'organisateur le corrige et le renvoie
    if (statut === 'rejete') {
      const motif = String(raison || '').trim();
      if (!motif) throw this._validationError('Un motif de refus est requis');
      if (evenement.statut !== 'en_attente') throw this._validationError('Cet événement n\'est pas en attente de validation');
      await this.repository.update(id, { statut: 'brouillon' });
      this.cache.invalidate();
      this.logger.info(`Événement refusé: ${id} par admin: ${adminId}`);
      await notifier(this.notificationService, evenement.id_user, {
        titre: 'Événement à corriger',
        message: `« ${nom} » n'a pas été publié : ${motif.slice(0, 300)}. Modifiez-le, puis touchez « Publier l'événement » pour le renvoyer.`,
        url_action: '/dashboard-pro', metadata: { id_evenement: id }
      });
      return EvenementDTO.fromEntity(await this.repository.findWithFullDetails(id));
    }

    await this.repository.update(id, { statut: 'publie' });
    const updated = await this.repository.findWithFullDetails(id);

    this.cache.invalidate();
    this.logger.info(`Événement publié: ${id} par admin: ${adminId}`);
    if (['brouillon', 'en_attente'].includes(evenement.statut)) {
      await notifier(this.notificationService, evenement.id_user, {
        titre: 'Événement publié',
        message: `« ${nom} » est en ligne : tout le monde peut le voir et s'y inscrire.`,
        url_action: lien, metadata: { id_evenement: id }
      });
    }
    return EvenementDTO.fromEntity(updated);
  }

  /** Statut à la demande « Publier » : publié pour l'administration, en attente de validation sinon */
  _statutDemande(statut, isAdmin) {
    if (statut !== 'publie') return 'brouillon';
    return isAdmin ? 'publie' : 'en_attente';
  }

  /** Un événement attend une validation : les administrateurs sont prévenus */
  async _prevenirModeration(evenement) {
    const nom = nomLisible(evenement.nom_evenement);
    for (const idAdmin of await idsAdministrateurs(this.models)) {
      if (idAdmin === evenement.id_user) continue;
      await notifier(this.notificationService, idAdmin, {
        titre: 'Événement à valider',
        message: `« ${nom} » attend votre validation avant d'être publié.`,
        url_action: '/admin/dashboard?tab=evenements', metadata: { id_evenement: evenement.id_evenement }
      });
    }
  }

  /**
   * Annuler un événement
   */
  async cancel(id, userId, motif, options = {}) {
    const evenement = await this.repository.findById(id);
    if (!evenement) throw this._notFoundError(id);

    // Vérifier propriété (admin bypass) — parseInt pour éviter mismatch string/int
    const ownerId = parseInt(evenement.id_user);
    const callerId = parseInt(userId);
    if (ownerId !== callerId && !options.isAdmin) {
      this.logger.warn(`Cancel denied: event owner=${ownerId}, caller=${callerId}, isAdmin=${options.isAdmin}`);
      throw this._forbiddenError('Vous ne pouvez annuler que vos propres événements');
    }

    await this.repository.update(id, { statut: 'annule' });
    const updated = await this.repository.findWithFullDetails(id);

    // Notification annulation (best effort, fire-and-forget)
    if (this.models?.Notification) {
      const NotificationService = require('../notificationService');
      const notifService = new NotificationService(this.models);
      notifService.notifierAnnulationEvenement(id, motif || 'Annulation par l\'organisateur')
        .catch(notifError => this.logger.error('Erreur notification annulation:', notifError));
    }

    this.cache.invalidate();
    // Invalider le cache middleware (professionnel/dashboard, listes) — await pour que Redis soit vidé avant la réponse
    const cacheMiddleware = require('../../middlewares/cacheMiddleware');
    await cacheMiddleware.clearCache('professionnel');
    await cacheMiddleware.clearCache('evenement');
    this.logger.info(`Événement annulé: ${id} par user: ${userId}, motif: ${motif}`);
    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Statistiques (cached 5 min)
   */
  async getStats() {
    return this.cache.getOrSet('stats', () => this.repository.getStats(), 5 * 60 * 1000);
  }
}

module.exports = EvenementService;
