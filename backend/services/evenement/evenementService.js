/**
 * EvenementService - Logique métier pour les événements
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const { lireTags, resolveTagIds } = require('../../helpers/tags');
const { finEffective } = require('../../helpers/finEvenement');
const { entitesBrutes } = require('../../utils/entitesBrutes');
const { verifierPlacePourRetablir } = require('../../utils/comptesEvenement');
const EvenementDTO = require('../../dto/evenement/evenementDTO');
const CacheManager = require('../../utils/CacheManager');
const { verifierReponses, reponsesFormulaireBase, listerChamps } = require('./formulaireInscription');
const { lireTarification, tarificationDe, configAvecProfil, montantInscription } = require('./tarification');
const { mergeTranslations, lireMultiLang, texteLisible } = require('../../helpers/i18n');
const { nomComplet } = require('../../utils/texte');
const { EVENEMENT_OUVERT, EVENEMENT_NON_PUBLIC } = require('../../constants/statuts');
const { idsAdministrateurs, notifier } = require('../../utils/notifierModeration');
const { evenementPath } = require('../../utils/slug');
const { PROFESSIONAL_TYPE_IDS } = require('../../constants/publicAttributes');
const { memeUtilisateur } = require('../../utils/droits');

/** Rôles possibles d'une organisation partenaire (la principale est choisie à part) */
const ROLES_PARTENAIRES = ['co_organisateur', 'partenaire', 'sponsor', 'media_partner', 'soutien'];
const ROLES_PARTENAIRES_MAX = 10;

/** Nom lisible d'un événement (nom multilingue) pour les notifications */
const nomLisible = (nom) => texteLisible(nom) || 'Événement';

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
    const cacheKey = `brut:published:${JSON.stringify(options)}`;
    const { data, pagination } = await this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findPublished(options);
      return { data: entitesBrutes(result.data), pagination: result.pagination };
    });
    return { data: EvenementDTO.fromEntities(data), pagination };
  }

  /**
   * Événements à venir
   */
  async findUpcoming(options = {}) {
    const cacheKey = `brut:upcoming:${JSON.stringify(options)}`;
    const { data, pagination } = await this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findUpcoming(options);
      return { data: entitesBrutes(result.data), pagination: result.pagination };
    });
    return { data: EvenementDTO.fromEntities(data), pagination };
  }

  /**
   * Détail complet d'un événement
   */
  async findWithFullDetails(id) {
    const evenement = await this.repository.findWithFullDetails(id);
    if (!evenement) {
      throw this._notFoundError(id);
    }
    const dto = EvenementDTO.fromEntity(evenement);
    // Formulaire réellement posé : celui du type + « Vous êtes » quand le prix dépend du profil
    const raw = dto?._raw;
    if (raw?.TypeEvenement || tarificationDe(raw).mode === 'profil') {
      const config = configAvecProfil(raw.TypeEvenement?.config_inscription, tarificationDe(raw));
      if (config) raw.TypeEvenement = { ...(raw.TypeEvenement || {}), config_inscription: config };
    }
    return dto;
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
    const cacheKey = `brut:wilaya:${wilayaId}:${JSON.stringify(options)}`;
    const { data, pagination } = await this.cache.getOrSet(cacheKey, async () => {
      const result = await this.repository.findByWilaya(wilayaId, options);
      return { data: entitesBrutes(result.data), pagination: result.pagination };
    });
    return { data: EvenementDTO.fromEntities(data), pagination };
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
      // Même heure que celle enregistrée ; un événement annulé peut être recréé
      const debutPrevu = new Date(this._avecHeure(data.date_debut, data.heure_debut || data.heureDebut));
      const dupWhere = { date_debut: debutPrevu, statut: { [Op.ne]: 'annule' } };
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

    const auteurId = await this._auteurDesigne(data.id_organisateur, userId, options.isAdmin, urlVirtuel ? null : orgId);
    const partenaires = await this._lirePartenaires(data.partenaires, userId, options.isAdmin);

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
      contact_email: this._contactEmail(data.contact_email ?? data.contactEmail) ?? undefined,
      contact_telephone: this._contactTelephone(data.contact_telephone ?? data.contactTelephone) ?? undefined,
      url_virtuel: data.url_virtuel || data.urlVirtuel,
      image_url: data.image_url || data.imageUrl,
      image_partage_url: data.image_partage_url || undefined,
      age_minimum: data.age_minimum || data.ageMinimum,
      accessibilite: data.accessibilite || {},
      certificat_delivre: data.certificat_delivre || data.certificatDelivre || false,
      date_limite_inscription: this._limiteInscription(
        data.date_limite_inscription ?? data.dateLimiteInscription,
        this._avecHeure(data.date_debut || data.dateDebut, data.heure_debut || data.heureDebut)
      ),
      id_user: auteurId
    };
    Object.assign(entityData, this._tarification(data));

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
      await this._syncPartenaires(created.id_evenement, partenaires, orgId, transaction);
      await this._syncTags(created.id_evenement, data.tags, transaction);
      return created;
    });

    const full = await this.repository.findWithFullDetails(evenement.id_evenement);

    this.cache.invalidate();
    this.logger.info(`Événement créé: ${evenement.id_evenement} par user: ${userId}${auteurId !== userId ? ` pour l'organisateur ${auteurId}` : ''}`);
    await this._viderCachesListes();
    if (full?.statut === 'en_attente') await this._prevenirModeration(full);
    if (full && auteurId !== userId) await this._prevenirOrganisateurDesigne(full);

    return EvenementDTO.fromEntity(full);
  }

  /**
   * Organisations partenaires (co-organisateur, partenaire, sponsor, média, soutien) envoyées par le
   * formulaire : null quand le champ est absent (rien ne change), sinon la liste vérifiée.
   * Une organisation partenaire doit être vérifiée, sauf celles dont l'auteur est membre, celles déjà
   * liées à l'événement (ajoutées par l'administration) et, pour l'administration, celles en attente.
   */
  async _lirePartenaires(valeur, userId, isAdmin, dejaLiees = []) {
    if (valeur === undefined || valeur === null) return null;
    let liste = valeur;
    if (typeof liste === 'string') {
      try { liste = liste.trim() ? JSON.parse(liste) : []; } catch { throw this._validationError('Liste des organisations partenaires invalide'); }
    }
    if (!Array.isArray(liste)) throw this._validationError('Liste des organisations partenaires invalide');
    if (liste.length > ROLES_PARTENAIRES_MAX) throw this._validationError('Dix organisations partenaires au plus');
    const parId = new Map();
    for (const p of liste) {
      const id = Number(p?.id_organisation);
      if (!Number.isInteger(id) || id <= 0 || !ROLES_PARTENAIRES.includes(p?.role)) {
        throw this._validationError('Liste des organisations partenaires invalide');
      }
      parId.set(id, p.role);
    }
    if (!parId.size || !this.models?.Organisation) return [...parId].map(([id_organisation, role]) => ({ id_organisation, role }));
    const ids = [...parId.keys()];
    const trouvees = await this.models.Organisation.findAll({ where: { id_organisation: ids }, attributes: ['id_organisation', 'statut'], raw: true });
    const membreDe = new Set();
    if (!isAdmin && this.models.UserOrganisation) {
      const lignes = await this.models.UserOrganisation.findAll({ where: { id_user: userId, id_organisation: ids, actif: true }, attributes: ['id_organisation'], raw: true });
      lignes.forEach((l) => membreDe.add(Number(l.id_organisation)));
    }
    const liees = new Set(dejaLiees.map(Number));
    for (const id of ids) {
      const org = trouvees.find((o) => Number(o.id_organisation) === id);
      if (!org || org.statut === 'rejete') throw this._validationError('Une organisation partenaire n’existe pas ou a été refusée');
      if (org.statut !== 'valide' && !isAdmin && !membreDe.has(id) && !liees.has(id)) {
        throw this._validationError('Une organisation partenaire n’est pas encore vérifiée');
      }
    }
    return ids.map((id) => ({ id_organisation: id, role: parId.get(id) }));
  }

  /** Remplace les partenaires de l'événement ; l'organisation principale reste à part */
  async _syncPartenaires(idEvenement, partenaires, orgPrincipale, transaction) {
    const { EvenementOrganisation } = this.models || {};
    if (partenaires === null || !EvenementOrganisation) return;
    const { Op } = require('sequelize');
    await EvenementOrganisation.destroy({ where: { id_evenement: idEvenement, role: { [Op.ne]: 'organisateur_principal' } }, transaction });
    const principale = Number(orgPrincipale) || null;
    const lignes = partenaires
      .filter((p) => p.id_organisation !== principale)
      .map((p) => ({ id_evenement: idEvenement, id_organisation: p.id_organisation, role: p.role }));
    if (lignes.length) await EvenementOrganisation.bulkCreate(lignes, { transaction, ignoreDuplicates: true });
  }

  /** Événement ajouté par l'administration au nom d'un professionnel : il en est prévenu */
  async _prevenirOrganisateurDesigne(evenement) {
    try {
      const nom = nomLisible(evenement.nom_evenement);
      const publie = !EVENEMENT_NON_PUBLIC.includes(evenement.statut);
      await notifier(this.notificationService, evenement.id_user, {
        titre: 'Événement ajouté à votre nom',
        message: publie
          ? `L'administration de Tala DZ a publié « ${nom} » à votre nom. Vous pouvez le compléter ou le modifier depuis votre espace.`
          : `L'administration de Tala DZ a préparé « ${nom} » à votre nom. Vous pouvez le compléter ou le modifier depuis votre espace.`,
        url_action: `/modifier-evenement/${evenement.id_evenement}`, metadata: { id_evenement: evenement.id_evenement }
      });
      if (publie) await this._prevenirAbonnes(evenement.id_user, nom, evenementPath(evenement.id_evenement, evenement.nom_evenement), evenement.id_evenement);
    } catch (err) {
      this.logger?.error?.('Avertissement de l’organisateur désigné :', err.message);
    }
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
  _limiteInscription(valeur, dateDebut) {
    if (valeur === undefined) return undefined;
    const texte = String(valeur ?? '').trim();
    if (!texte) return null;
    // Un jour vaut jusqu'à 23 h 59 à l'heure d'Algérie
    const limite = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texte) ? `${texte}T23:59:59+01:00` : texte);
    if (Number.isNaN(limite.getTime())) throw this._validationError('Date limite d\'inscription invalide');
    const debut = dateDebut ? new Date(dateDebut) : null;
    if (debut && !Number.isNaN(debut.getTime()) && limite > debut) {
      // Le jour même : jusqu'au début de l'événement ; au-delà : refusé
      if (limite.getTime() - debut.getTime() >= 24 * 60 * 60 * 1000) {
        throw this._validationError('La date limite d\'inscription doit être avant le début de l\'événement');
      }
      return debut;
    }
    return limite;
  }

  /** E-mail de contact : vide → null ; absent → undefined (inchangé) ; invalide → message clair */
  _contactEmail(valeur) {
    if (valeur === undefined) return undefined;
    const email = String(valeur ?? '').trim();
    if (!email) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw this._validationError('E-mail de contact invalide');
    return email.slice(0, 255);
  }

  /** Téléphone de contact : vide → null ; absent → undefined (inchangé) */
  _contactTelephone(valeur) {
    if (valeur === undefined) return undefined;
    return String(valeur ?? '').trim().slice(0, 30) || null;
  }

  _avecHeure(date, heure) {
    if (!date || !heure) return date;
    const jour = String(date);
    const hm = String(heure).match(/^(\d{2}):(\d{2})/);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !hm) return date;
    // 01:00 à Alger vaut minuit UTC, la convention d'un jour sans heure : 1 seconde les distingue
    return `${jour}T${hm[1]}:${hm[2]}:${hm[1] === '01' && hm[2] === '00' ? '01' : '00'}+01:00`;
  }

  /**
   * L'utilisateur doit être membre actif de l'organisation qu'il associe à un événement
   * (sinon il pourrait publier au nom de n'importe quelle organisation).
   */
  /**
   * Organisateur de l'événement : la personne connectée. L'administration peut ajouter un événement
   * au nom d'un compte (son numéro, id_organisateur) : ce compte en devient l'organisateur et pourra le
   * modifier. Il doit donc être un professionnel actif et, pour un événement en présentiel, membre
   * actif de l'organisation choisie (la modification le vérifie aussi).
   */
  async _auteurDesigne(idOrganisateur, userId, isAdmin, orgId) {
    if (idOrganisateur === undefined || idOrganisateur === null || idOrganisateur === '' || !isAdmin) return userId;
    const id = Number(idOrganisateur);
    if (!Number.isInteger(id) || id <= 0) throw this._validationError('Numéro de compte de l’organisateur invalide');
    if (id === Number(userId) || !this.models?.User) return id;
    const compte = await this.models.User.findByPk(id, { attributes: ['id_user', 'statut', 'id_type_user'] });
    if (!compte || compte.statut !== 'actif') throw this._validationError('Ce compte n’existe pas ou n’est pas actif');
    let professionnel = PROFESSIONAL_TYPE_IDS.includes(compte.id_type_user);
    if (!professionnel && this.models.User.sequelize) {
      const [roles] = await this.models.User.sequelize.query(
        "SELECT 1 FROM userroles ur JOIN role r ON r.id_role = ur.id_role WHERE ur.id_user = ? AND r.nom_role = 'Professionnel' LIMIT 1",
        { replacements: [id] }
      );
      professionnel = roles.length > 0;
    }
    if (!professionnel) throw this._validationError('Ce compte n’est pas un compte professionnel');
    if (orgId && this.models.UserOrganisation) {
      const membre = await this.models.UserOrganisation.findOne({ where: { id_user: id, id_organisation: parseInt(orgId, 10), actif: true } });
      if (!membre) throw this._validationError('Ce compte n’est pas membre de l’organisation choisie');
    }
    return id;
  }

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
    let changements = null;
    let aVerifier = false;
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
      if (data.date_debut || data.dateDebut) {
        updateData.date_debut = this._avecHeure(data.date_debut || data.dateDebut, data.heure_debut || data.heureDebut);
        // Nouvelle date : les rappels (veille, dernière minute) repartiront pour elle
        if (new Date(updateData.date_debut).getTime() !== new Date(existing.date_debut).getTime()) {
          updateData.rappel_envoye = false;
          updateData.rappel_derniere_minute = false;
        }
      }
      // Vidé dans le formulaire : la valeur est effacée (avant, le message annonçait un succès sans rien changer)
      const finRecue = data.date_fin ?? data.dateFin;
      if (finRecue !== undefined) updateData.date_fin = finRecue ? this._avecHeure(finRecue, data.heure_fin || data.heureFin) : null;
      if (data.id_lieu || data.lieuId) updateData.id_lieu = data.id_lieu || data.lieuId;
      if (data.id_type_evenement || data.typeEvenementId) updateData.id_type_evenement = data.id_type_evenement || data.typeEvenementId;
      // Statut : un brouillon peut être envoyé à la validation (ou publié par l'administration) ;
      // le reste passe par les routes dédiées (/publish, /cancel)
      if (existing.statut === 'brouillon' && data.statut === 'publie') {
        updateData.statut = this._statutDemande('publie', options.isAdmin);
        envoye = updateData.statut === 'en_attente';
      }
      const capaciteRecue = data.capacite_max ?? data.capaciteMax;
      if (capaciteRecue !== undefined) updateData.capacite_max = Number(capaciteRecue) > 0 ? capaciteRecue : null;
      if (data.tarif !== undefined) updateData.tarif = data.tarif;
      Object.assign(updateData, this._tarification(data));
      if (data.image_url || data.imageUrl) updateData.image_url = data.image_url || data.imageUrl;
      // Image de partage : nouvelle image, ou null quand elle est retirée (le contrôleur ne la prend que d'un fichier)
      if (data.image_partage_url !== undefined) updateData.image_partage_url = data.image_partage_url;
      // Contacts et date limite : un champ vidé efface la valeur
      const email = this._contactEmail(data.contact_email ?? data.contactEmail);
      if (email !== undefined) updateData.contact_email = email;
      const telephone = this._contactTelephone(data.contact_telephone ?? data.contactTelephone);
      if (telephone !== undefined) updateData.contact_telephone = telephone;
      const limite = this._limiteInscription(data.date_limite_inscription ?? data.dateLimiteInscription,
        updateData.date_debut || existing.date_debut);
      if (limite !== undefined) updateData.date_limite_inscription = limite;
      if (data.url_virtuel !== undefined || data.urlVirtuel !== undefined) {
        updateData.url_virtuel = data.url_virtuel || data.urlVirtuel || null;
        // Passage en ligne : l'ancien lieu n'est plus affiché. Un événement déjà en ligne garde
        // son lieu s'il en a un (événement à la fois sur place et en ligne).
        if (updateData.url_virtuel && !existing.url_virtuel && !updateData.id_lieu) updateData.id_lieu = null;
      }

      const newOrgId = data.id_organisation || data.organisationId;
      // Liens actuels lus seulement quand le formulaire envoie la liste des partenaires
      const liensActuels = data.partenaires !== undefined && data.partenaires !== null && this.models?.EvenementOrganisation
        ? await this.models.EvenementOrganisation.findAll({ where: { id_evenement: id }, attributes: ['id_organisation', 'role'], raw: true, transaction })
        : [];
      const partenairesActuels = liensActuels.filter((l) => l.role !== 'organisateur_principal');
      const partenaires = await this._lirePartenaires(data.partenaires, userId, options.isAdmin, partenairesActuels.map((l) => l.id_organisation));

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

      // Date ou lieu changés sur un événement visible : les inscrits seront prévenus après l'enregistrement
      if (EVENEMENT_OUVERT.includes(existing.statut)) {
        const dateChangee = updateData.date_debut
          && new Date(updateData.date_debut).getTime() !== new Date(existing.date_debut).getTime();
        // id_lieu à null compte aussi : un événement passé en ligne perd son lieu, les inscrits doivent le savoir
        const lieuChange = updateData.id_lieu !== undefined && Number(updateData.id_lieu || 0) !== Number(existing.id_lieu || 0);
        const lienChange = String(finalUrlVirtuel || '').trim() !== String(existing.url_virtuel || '').trim();
        if (dateChangee || lieuChange || lienChange) {
          changements = { date: !!dateChangee, lieu: lieuChange, lien: lienChange };
        }
      }

      // Événement déjà publié dont le nom, le texte, l'image, le lien ou le tarif changent : la modération
      // vérifie (sinon un événement validé pouvait être réécrit en arnaque sur une page de confiance)
      // Publié = publie, planifie ou en_cours (le modèle range un événement publié selon ses dates)
      const SENSIBLES = ['nom_evenement', 'description', 'image_url', 'image_partage_url', 'url_virtuel', 'tarif'];
      const valeur = (c, v) => (c === 'tarif' ? (v === null || v === undefined || v === '' ? null : Number(v)) : JSON.stringify(v ?? null));
      const changes = SENSIBLES.filter((c) => updateData[c] !== undefined && valeur(c, updateData[c]) !== valeur(c, existing[c]));
      // Partenaires changés : une page publiée ne doit pas se réclamer d'une institution sans contrôle
      const empreinte = (l) => l.map((p) => `${p.id_organisation}=${p.role}`).sort().join(',');
      if (partenaires !== null && empreinte(partenaires) !== empreinte(partenairesActuels)) changes.push(`partenaires:${empreinte(partenaires)}`);
      if (EVENEMENT_OUVERT.includes(existing.statut) && !options.isAdmin && changes.length) {
        aVerifier = changes.map((c) => (c.startsWith('partenaires:') ? c : `${c}:${valeur(c, updateData[c])}`)).join('|');
      }

      await this.repository.update(id, updateData, { transaction });
      await this._syncTags(id, data.tags, transaction);

      if (newOrgId && this.models?.EvenementOrganisation) {
        await this._assertOrganisationMember(newOrgId, userId, options.isAdmin, transaction);
        // Une organisation n'a qu'une ligne par événement : partenaire devenue principale, l'ancienne ligne part
        if (partenaires !== null) await this._syncPartenaires(id, [], null, transaction);
        else {
          const { Op } = require('sequelize');
          await this.models.EvenementOrganisation.destroy({ where: { id_evenement: id, id_organisation: parseInt(newOrgId), role: { [Op.ne]: 'organisateur_principal' } }, transaction });
        }
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
      if (partenaires !== null) {
        const principale = newOrgId || liensActuels.find((l) => l.role === 'organisateur_principal')?.id_organisation;
        await this._syncPartenaires(id, partenaires, principale, transaction);
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
    if (aVerifier) await this._signalerModificationPubliee(updated, aVerifier);
    if (changements) {
      // En arrière-plan : un e-mail en échec n'annule pas la modification
      const notifService = this.notificationService || new (require('../notificationService'))(this.models);
      notifService.notifierChangementEvenement(id, changements)
        .catch(err => this.logger.error('Erreur notification changement événement:', err));
    }

    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Personne invitée par un import, qui n'a pas encore confirmé : l'organisateur ne voit que ce que
   * contenait son classeur. Sinon, importer une adresse donnait le nom et la photo de son titulaire,
   * et révélait si elle avait un compte (audit V8, sécurité M1).
   */
  _masquerInvitation(ligne) {
    if (ligne.statut_participation !== 'invitation') return ligne;
    const brut = ligne.get ? ligne.get({ plain: true }) : ligne;
    const email = brut.User?.email || '';
    return {
      ...brut,
      User: brut.User && {
        id_user: brut.User.id_user,
        email,
        nom: brut.reponses_inscription?._nom_import || email.split('@')[0],
        prenom: '',
        photo_url: null,
        id_type_user: null
      }
    };
  }

  /** Médias d'un événement, sans recharger toute sa fiche */
  async findMedias(id) {
    if (!this.models?.Media) return [];
    return this.models.Media.findAll({ where: { id_evenement: id }, order: [['ordre', 'ASC'], ['id_media', 'ASC']], raw: true });
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
    if (!options.isAdmin && !EVENEMENT_NON_PUBLIC.includes(existing.statut)) {
      throw this._validationError('Seuls les événements en brouillon peuvent être supprimés. Utilisez l\'annulation pour les événements publiés.');
    }
    // Administration : un événement visible avec des inscrits s'annule d'abord (ils sont alors prévenus).
    // Sinon leurs inscriptions disparaissaient sans qu'ils le sachent.
    if ([...EVENEMENT_OUVERT, 'reporte'].includes(existing.statut) && await this.repository.countParticipants(id) > 0) {
      throw Object.assign(this._validationError('Cet événement a des inscrits : annulez-le d\'abord pour qu\'ils soient prévenus'), { statusCode: 409 });
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

      if (!EVENEMENT_OUVERT.includes(evenement.statut)) {
        throw this._validationError(evenement.statut === 'annule'
          ? 'Cet événement a été annulé'
          : 'Les inscriptions ne sont pas ouvertes pour cet événement');
      }

      if (evenement.date_limite_inscription && new Date() > new Date(evenement.date_limite_inscription)) {
        throw this._validationError('La date limite d\'inscription est dépassée');
      }

      // Événement terminé (même règle que le passage en « terminé » : jour sans heure = toute la journée,
      // sans date de fin = jusqu'au soir du premier jour). Avant : inscription possible des mois après.
      const fin = finEffective(evenement.date_debut, evenement.date_fin);
      if (fin && fin <= new Date()) {
        throw this._validationError('Cet événement est terminé');
      }

      // Déjà inscrit (ou refusé) : réponse habituelle du dépôt, sans contrôle de capacité
      // (avant : une personne déjà inscrite recevait « complet »)
      const existante = await this.models?.EvenementUser?.findOne({
        where: { id_evenement: evenementId, id_user: userId },
        attributes: ['statut_participation', 'reponses_inscription'],
        transaction
      });
      if (existante && existante.statut_participation !== 'invitation') {
        return this.repository.registerParticipant(evenementId, userId, { transaction });
      }

      // Invitation (import d'une liste) confirmée par la personne : ses réponses du classeur sont gardées
      // si elle n'en envoie pas de nouvelles (bouton « Confirmer » de la page de l'événement)
      const reponses_inscription = existante && !data.reponses
        ? existante.reponses_inscription
        : await this._reponsesInscription(evenement, data, transaction);

      // Capacité en personnes : « 4 personnes » prend 4 places (avant : 1 inscription = 1 place)
      if (evenement.capacite_max) {
        const reponses = typeof reponses_inscription === 'string' ? JSON.parse(reponses_inscription) : (reponses_inscription || {});
        const demandees = Math.max(1, parseInt(reponses.nombre_personnes, 10) || 1);
        const prises = await this.repository.countParticipants(evenementId, { transaction });
        if (prises + demandees > evenement.capacite_max) {
          const restantes = Math.max(0, evenement.capacite_max - prises);
          throw this._validationError(restantes
            ? `Il reste ${restantes} place(s) : réduisez le nombre de personnes`
            : 'L\'événement est complet');
        }
      }
      // Le montant est calculé ici (profil, présence, nombre de personnes), jamais choisi par le participant
      const montant_du = montantInscription(evenement, reponses_inscription || {});
      return this.repository.registerParticipant(evenementId, userId, { transaction, reponses_inscription, montant_du });
    });

    this.logger.info(`Participant inscrit: user ${userId} → événement ${evenementId}`);
    return registration;
  }

  /**
   * Formulaire du type d'événement s'il en a un, sinon formulaire de base
   * (nombre de personnes + commentaire).
   */
  async _reponsesInscription(evenement, data, transaction) {
    const config = configAvecProfil(await this._configInscription(evenement.id_type_evenement, transaction), tarificationDe(evenement));
    if (!config) return reponsesFormulaireBase(data);

    const { reponses, erreurs } = verifierReponses(config, data.reponses);
    if (erreurs.length) {
      throw this._validationError(
        `Formulaire d'inscription incomplet : ${erreurs.map(e => e.label).join(', ')}`,
        erreurs
      );
    }
    // Formulaire posé à côté du formulaire de base : nombre de personnes et commentaire gardés aussi
    if (!config.remplace_formulaire_base) Object.assign(reponses, reponsesFormulaireBase(data) || {});
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
    // Après le début de l'événement, ou présence déjà notée : la désinscription effaçait la présence
    // (statistiques, attestations). Une invitation (import d'une liste) se refuse à tout moment.
    const inscription = await this.repository.getRegistration(evenementId, userId);
    if (inscription && ['present', 'absent'].includes(inscription.statut_participation)) {
      throw this._validationError("Votre présence a déjà été notée : la désinscription n'est plus possible");
    }
    if (inscription && inscription.statut_participation !== 'invitation') {
      const evenement = await this.repository.findById(evenementId, { attributes: ['id_evenement', 'date_debut'] });
      if (evenement?.date_debut && new Date(evenement.date_debut) <= new Date()) {
        throw this._validationError("L'événement a commencé : la désinscription n'est plus possible");
      }
    }
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
    if (!memeUtilisateur(evenement.id_user, userId) && !isAdmin) {
      throw this._forbiddenError('Accès non autorisé');
    }
    return evenement;
  }

  /**
   * Liste publique des participants confirmés (données limitées pour la confidentialité)
   */
  async getPublicParticipants(evenementId) {
    // Événement pas encore publié : personne n'y est encore « attendu » publiquement
    const evenement = await this.repository.findById(evenementId, { attributes: ['id_evenement', 'statut'] });
    if (!evenement || EVENEMENT_NON_PUBLIC.includes(evenement.statut)) {
      return { participants: [], total: 0 };
    }
    // total : toutes les personnes confirmées, y compris celles qui ne sont pas nommées
    return this.repository.getPublicParticipants(evenementId);
  }

  /**
   * Liste les participants d'un événement
   */
  async getParticipants(evenementId, requesterId, isAdmin) {
    await this._assertEventOwnerOrAdmin(evenementId, requesterId, isAdmin);
    const lignes = await this.repository.getParticipants(evenementId);
    return lignes.map(l => this._masquerInvitation(l));
  }

  /** Choix de la question « Vous êtes » de l'événement (pour corriger le profil d'un participant) */
  async getProfilsParticipants(evenementId, requesterId, isAdmin) {
    const evenement = await this._assertEventOwnerOrAdmin(evenementId, requesterId, isAdmin);
    return this._optionsProfil(evenement);
  }

  async _optionsProfil(evenement) {
    const config = configAvecProfil(await this._configInscription(evenement.id_type_evenement), tarificationDe(evenement));
    const champ = listerChamps(config).find(c => c.cle === 'profil');
    return (champ?.options || []).map(o => ({ valeur: o.valeur, label: o.label }));
  }

  /**
   * L'organisateur corrige le profil d'un participant (ex. « Amateur du patrimoine » importé) :
   * réponse « Vous êtes » remplacée, montant recalculé. Aucun message n'est envoyé.
   */
  async changerProfilParticipant(evenementId, userId, profil, requester) {
    const evenement = await this._assertEventOwnerOrAdmin(evenementId, requester.id, requester.isAdmin);
    const options = await this._optionsProfil(evenement);
    if (!options.some(o => o.valeur === profil)) throw this._validationError("Ce profil n'est pas un choix du formulaire");
    const inscription = await this.repository.getRegistration(evenementId, userId);
    if (!inscription) throw this._notFoundError(userId);
    const actuelles = typeof inscription.reponses_inscription === 'string'
      ? JSON.parse(inscription.reponses_inscription) : (inscription.reponses_inscription || {});
    const { profil_autre: _ancien, ...reponses } = { ...actuelles, profil };
    await inscription.update({ reponses_inscription: reponses, montant_du: montantInscription(evenement, reponses) });
    return inscription;
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
    await this._refuserSiInvitation(evenementId, userId, validated);
    const avant = await this.repository.getRegistration(evenementId, userId);
    const nouveauStatut = validated ? 'confirme' : 'annule';
    if (validated && this.models) await verifierPlacePourRetablir(this.models, evenementId, avant);

    const participation = await this.repository.updateParticipationStatus(evenementId, userId, {
      statut_participation: nouveauStatut,
      date_validation: new Date(),
      valide_par: validatedBy.id
    });

    if (!participation) {
      throw this._notFoundError(userId);
    }

    // Notification (best effort, fire-and-forget — ne pas bloquer la réponse HTTP). Rien si le statut
    // ne change pas : un double clic envoyait deux e-mails et deux SMS.
    if (this.models?.Notification && avant?.statut_participation !== nouveauStatut) {
      // Service partagé (avec ses repositories) ; instance locale seulement à défaut (tests)
      const notifService = this.notificationService || new (require('../notificationService'))(this.models);
      notifService.notifierValidationParticipation(
        evenementId, userId, validated ? 'confirme' : 'refuse', notes || ''
      ).catch(notifError => {
        this.logger.error('Erreur notification validation participation:', notifError);
      });
    }

    return participation;
  }

  /** Une invitation (import d'une liste) n'est confirmée par l'organisateur qu'après l'accord de la personne */
  async _refuserSiInvitation(evenementId, userId, confirmer) {
    if (!confirmer) return;
    const inscription = await this.repository.getRegistration(evenementId, userId);
    if (inscription?.statut_participation === 'invitation') {
      throw this._validationError("Cette personne n'a pas encore confirmé son inscription");
    }
  }

  /**
   * Récupère le profil d'un participant inscrit à un événement
   */
  async getParticipantProfil(evenementId, userId) {
    const participation = await this.repository.getRegistration(evenementId, userId);
    // Invitation : la personne n'a encore rien accepté, son profil n'est pas montré
    if (!participation || participation.statut_participation === 'invitation') {
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
    // Un modérateur ne valide pas son propre événement
    await require('../../utils/estAdministrateur').refuserSiSonPropreContenu(this.models, adminId, evenement.id_user, 'votre propre événement');
    const nom = nomLisible(evenement.nom_evenement);
    const lien = evenementPath(id, evenement.nom_evenement);

    // Refus : l'événement revient en brouillon, l'organisateur le corrige et le renvoie
    if (statut === 'rejete') {
      const motif = String(raison || '').trim();
      if (!motif) throw this._validationError('Un motif de refus est requis');
      if (evenement.statut !== 'en_attente') throw this._validationError('Cet événement n\'est pas en attente de validation');
      await this.repository.update(id, { statut: 'brouillon' });
      this.cache.invalidate();
      await this._viderCachesListes();
      this.logger.info(`Événement refusé: ${id} par admin: ${adminId}`);
      await notifier(this.notificationService, evenement.id_user, {
        titre: 'Événement à corriger',
        message: `« ${nom} » n'a pas été publié : ${motif.slice(0, 300)}. Modifiez-le, puis touchez « Publier l'événement » pour le renvoyer.`,
        url_action: '/dashboard-pro', metadata: { id_evenement: id }
      });
      return EvenementDTO.fromEntity(await this.repository.findWithFullDetails(id));
    }

    // Un événement annulé ou terminé ne revient pas en ligne sans que personne ne soit prévenu
    if (!['brouillon', 'en_attente', 'reporte'].includes(evenement.statut)) {
      throw this._validationError('Seul un événement en attente ou en brouillon peut être publié');
    }
    await this.repository.update(id, { statut: 'publie' });
    const updated = await this.repository.findWithFullDetails(id);

    this.cache.invalidate();
    await this._viderCachesListes();
    this.logger.info(`Événement publié: ${id} par admin: ${adminId}`);
    require('../indexNow').signalerPlusTard(lien);
    if (EVENEMENT_NON_PUBLIC.includes(evenement.statut)) {
      await notifier(this.notificationService, evenement.id_user, {
        titre: 'Événement publié',
        message: `« ${nom} » est en ligne : tout le monde peut le voir et s'y inscrire.`,
        url_action: lien, metadata: { id_evenement: id }
      });
      await this._prevenirAbonnes(evenement.id_user, nom, lien, id);
    }
    return EvenementDTO.fromEntity(updated);
  }

  /** Listes en cache (tableau de bord du professionnel, listes publiques) : à jour après un changement */
  async _viderCachesListes() {
    const cacheMiddleware = require('../../middlewares/cacheMiddleware');
    await cacheMiddleware.clearCache('professionnel');
    await cacheMiddleware.clearCache('evenement');
  }

  /** Gratuit, payant ou selon le profil : { tarification, tarif } à enregistrer (rien si non envoyé) */
  _tarification(data) {
    const lu = lireTarification(data.tarification, data.tarif);
    if (!lu) return {};
    if (lu.erreur) throw this._validationError(lu.erreur);
    return { tarification: lu.tarification, tarif: lu.tarif };
  }

  /** Statut à la demande « Publier » : publié pour l'administration, en attente de validation sinon */
  _statutDemande(statut, isAdmin) {
    if (statut !== 'publie') return 'brouillon';
    return isAdmin ? 'publie' : 'en_attente';
  }

  /** Événement publié : les personnes qui suivent son organisateur sont prévenues */
  async _prevenirAbonnes(idOrganisateur, nom, lien, idEvenement) {
    // Une notification ne bloque jamais une publication
    try {
      const organisateur = await this.models?.User?.findByPk(idOrganisateur, { attributes: ['nom', 'prenom'] });
      const qui = nomComplet(organisateur) || 'Un professionnel que vous suivez';
      await require('../suivisProfessionnels').prevenirAbonnes(this.models, idOrganisateur, {
        composer: (personne) => require('../messagesProfessionnels').composer('nouvelEvenement', personne, qui, nom),
        url_action: lien,
        type_notification: 'nouvel_evenement',
        metadata: { id_evenement: idEvenement }
      });
    } catch (err) {
      this.logger.error(`Abonnés de l'organisateur non prévenus : ${err.message}`);
    }
  }

  /** Événement publié modifié par son organisateur : l'équipe est prévenue (une fois toutes les 6 h) */
  async _signalerModificationPubliee(evenement, contenu = '') {
    try {
      const { premiereFoisPendant } = require('../quotaEmail');
      // Une fois par contenu : une nouvelle réécriture dans les 6 h est signalée elle aussi
      const empreinte = require('crypto').createHash('sha256').update(String(contenu)).digest('hex').slice(0, 16);
      if (!(await premiereFoisPendant(`moderation:evenement:${evenement.id_evenement}:${empreinte}`, 6 * 3600))) return;
      const nom = nomLisible(evenement.nom_evenement);
      for (const idAdmin of await idsAdministrateurs(this.models)) {
        if (idAdmin === evenement.id_user) continue;
        await notifier(this.notificationService, idAdmin, {
          titre: 'Événement publié modifié',
          message: `« ${nom} », déjà publié, a été modifié par son organisateur (nom, texte, image, lien, tarif ou partenaires) : à vérifier.`,
          url_action: `/evenements/${evenement.id_evenement}`, metadata: { id_evenement: evenement.id_evenement }
        });
      }
    } catch (err) {
      this.logger?.error?.('Signalement de modification d’un événement publié :', err.message);
    }
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

    // Sous verrou : un double clic n'envoie pas deux séries d'e-mails et de SMS. Un événement terminé
    // reste terminé : ses participants ne doivent pas recevoir « annulé » après y être allés.
    await this.repository.withTransaction(async (transaction) => {
      const actuel = await this.repository.findById(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (actuel.statut === 'annule') {
        throw Object.assign(this._validationError('Cet événement est déjà annulé'), { statusCode: 409 });
      }
      if (actuel.statut === 'termine') throw this._validationError('Un événement terminé ne peut pas être annulé');
      await this.repository.update(id, { statut: 'annule' }, { transaction });
    });
    const updated = await this.repository.findWithFullDetails(id);

    // Notification annulation (best effort, fire-and-forget)
    if (this.models?.Notification) {
      const notifService = this.notificationService || new (require('../notificationService'))(this.models);
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

  /**
   * Statistiques publiques (cached 5 min) : seulement les événements visibles sur le site, ni
   * brouillons, ni en attente, ni annulés (audit V11 BDD-18)
   */
  async getPublicStats() {
    return this.cache.getOrSet('public_stats', () => this.repository.getStats({ publiques: true }), 5 * 60 * 1000);
  }
}

module.exports = EvenementService;
