/**
 * EvenementRepository - Accès données pour les événements
 * Extends BaseRepository avec des méthodes spécifiques aux événements
 */

const BaseRepository = require('./baseRepository');
const { aColonne, motifLike } = require('../utils/colonnesCalculees');
const AppError = require('../utils/appError');
const { PUBLIC_USER_ATTRIBUTES, PUBLIC_ORGANIZER_ATTRIBUTES } = require('../constants/publicAttributes');

// Programme vu publiquement : tout sauf les notes internes de l'organisateur
const PUBLIC_PROGRAMME_EXCLUDE = ['notes_organisateur'];
const { Op, col, fn, literal, where: seqWhere } = require('sequelize');
const { attributsComptes, STATUTS_PLACE_PRISE, personnesSql } = require('../utils/comptesEvenement');
const { pasTermine, termine, finSql } = require('../helpers/finEvenement');

class EvenementRepository extends BaseRepository {
  constructor(models) {
    super(models.Evenement);
    this.models = models;
  }

  /**
   * Inclusions standard pour les requêtes événements
   */
  /**
   * Includes légers pour les listes (pas de deep join Commune→Daira→Wilaya)
   */
  _defaultIncludes() {
    const includes = [];

    if (this.models.TypeEvenement) {
      includes.push({
        model: this.models.TypeEvenement,
        as: 'TypeEvenement',
        attributes: ['id_type_evenement', 'nom_type']
      });
    }

    if (this.models.Lieu) {
      includes.push({
        model: this.models.Lieu,
        as: 'Lieu',
        attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude'],
        required: false
      });
    }

    if (this.models.User) {
      includes.push({
        model: this.models.User,
        as: 'Organisateur',
        // Pas d'email : le contact public de l'événement est contact_email
        attributes: PUBLIC_ORGANIZER_ATTRIBUTES
      });
    }

    return includes;
  }

  /**
   * Includes complets pour le détail (1 seul record → deep join acceptable)
   */
  _detailIncludes() {
    const includes = this._defaultIncludes();

    // Enrichir Lieu avec la hiérarchie administrative complète
    const lieuIdx = includes.findIndex(i => i.as === 'Lieu');
    if (lieuIdx !== -1 && this.models.Commune) {
      includes[lieuIdx] = {
        ...includes[lieuIdx],
        include: [{
          model: this.models.Commune,
          attributes: ['id_commune', 'nom'],
          required: false,
          include: [{
            model: this.models.Daira,
            attributes: ['id_daira', 'nom'],
            required: false,
            include: this.models.Wilaya ? [{
              model: this.models.Wilaya,
              attributes: ['id_wilaya', 'nom', 'code'],
              required: false
            }] : []
          }]
        }]
      };
    }

    return includes;
  }

  /**
   * Texte cherché dans le nom et la description, toutes langues, sans accents ni majuscules : colonne
   * texte_recherche quand la migration 20261216-recherche-noms est passée, sinon une extraction JSON par
   * langue et par ligne (audit V11 BDD-3)
   */
  async _conditionTexte(q) {
    const alias = this.model.name;
    if (await aColonne(this.model, 'texte_recherche')) {
      return literal(`\`${alias}\`.\`texte_recherche\` LIKE ${motifLike(this.model.sequelize, q)}`);
    }
    const pattern = `%${this._sanitizeSearchQuery(String(q).trim())}%`;
    const langs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
    return {
      [Op.or]: ['nom_evenement', 'description'].flatMap((field) => [
        seqWhere(col(`${alias}.${field}`), { [Op.like]: pattern }),
        ...langs.map((l) => seqWhere(fn('LOWER', fn('JSON_UNQUOTE', fn('JSON_EXTRACT', col(`${alias}.${field}`), literal(`'$."${l}"'`)))), { [Op.like]: pattern.toLowerCase() }))
      ])
    };
  }

  /**
   * Filtres de la liste publique : texte (toutes langues), statut d'affichage, type.
   * @param {{ q?: string, statut?: string, type?: string }} filters
   * @returns {Promise<object>} conditions Sequelize (à combiner avec le reste du where)
   */
  async _buildPublicFilters({ q, statut, type } = {}) {
    const and = [];
    const now = new Date();

    if (q && String(q).trim().length >= 2) {
      and.push(await this._conditionTexte(q));
    }

    // Statuts tels qu'affichés sur le site (calculés aussi depuis les dates)
    if (statut === 'a_venir') {
      and.push({ statut: { [Op.in]: ['publie', 'planifie'] }, date_debut: { [Op.gt]: now } });
    } else if (statut === 'en_cours') {
      and.push({
        [Op.or]: [
          { statut: 'en_cours' },
          { statut: { [Op.in]: ['publie', 'planifie'] }, date_debut: { [Op.lte]: now }, [Op.and]: [pasTermine(now, this.model.name)] }
        ]
      });
    } else if (statut === 'termine') {
      and.push({
        [Op.or]: [
          { statut: 'termine' },
          { statut: { [Op.in]: ['publie', 'planifie', 'en_cours'] }, [Op.and]: [termine(now, this.model.name)] }
        ]
      });
    }

    // Type : identifiant, ou nom venant du site (« conference » pour « Conférence »)
    if (type && this.models.TypeEvenement) {
      if (/^\d+$/.test(String(type))) {
        and.push({ id_type_evenement: Number(type) });
      } else {
        const normalize = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const wanted = normalize(type);
        const types = await this.models.TypeEvenement.findAll({ attributes: ['id_type_evenement', 'nom_type'], raw: true });
        const ids = types
          .filter((tp) => {
            let names = tp.nom_type;
            if (typeof names === 'string') {
              try { names = JSON.parse(names); } catch { names = { fr: names }; }
            }
            const values = names && typeof names === 'object' ? Object.values(names) : [names];
            return values.some((n) => {
              const name = normalize(n);
              return name && (name === wanted || name.startsWith(wanted) || wanted.startsWith(name));
            });
          })
          .map((tp) => tp.id_type_evenement);
        // Type inconnu : aucun résultat (plutôt que tout afficher)
        and.push({ id_type_evenement: { [Op.in]: ids.length ? ids : [-1] } });
      }
    }

    return and;
  }

  /**
   * Trouve les événements publiés avec pagination (et filtres de la liste publique)
   */
  async findPublished(options = {}) {
    const { page = 1, limit = 20, filters = {} } = options;
    const p = parseInt(page);
    const l = parseInt(limit);
    const extra = await this._buildPublicFilters(filters);
    // Les événements terminés restent visibles (« Tous » et « Terminés ») : ils ne sont jamais archivés
    // automatiquement ; seule l'administration retire un événement (annulation ou suppression).
    // Avant, « Tous » les cachait : un salon passé disparaissait de la liste dès le lendemain.
    const visibleStatuts = ['publie', 'planifie', 'en_cours', 'termine'];
    const where = { ...options.where, statut: { [Op.in]: visibleStatuts }, ...(extra.length ? { [Op.and]: extra } : {}) };
    // À venir et en cours d'abord (date croissante), puis les terminés (le plus récent d'abord)
    if (await aColonne(this.model, 'fin_effective')) return this._pagePubliee(where, p, l);
    const alias = this.model.name;
    const passe = `(\`${alias}\`.\`statut\` = 'termine' OR ${finSql(alias)} <= NOW())`;
    const ordre = [
      [literal(passe), 'ASC'],
      [literal(`CASE WHEN ${passe} THEN -UNIX_TIMESTAMP(\`${alias}\`.\`date_debut\`) ELSE UNIX_TIMESTAMP(\`${alias}\`.\`date_debut\`) END`), 'ASC']
    ];

    const [total, rows] = await Promise.all([
      this.model.count({ where }),
      this.model.findAll({
        where,
        attributes: { include: attributsComptes() },
        include: this._defaultIncludes(),
        order: ordre,
        limit: l,
        offset: (p - 1) * l,
        subQuery: false
      })
    ]);

    return {
      data: rows,
      pagination: {
        page: p, limit: l, total,
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    };
  }

  /**
   * Page de la liste publique avec la colonne fin_effective (migration 20261217-liste-evenements) : deux
   * lectures dans l'ordre de l'index (statut, fin_effective, date_debut) au lieu d'un tri de tous les
   * événements sur une expression calculée (audit V11 BDD-6). Même ordre : à venir et en cours par date
   * croissante, puis terminés du plus récent au plus ancien ; les terminés ne sont lus que si la page
   * n'est pas pleine.
   */
  async _pagePubliee(where, p, l) {
    const maintenant = new Date();
    const aVenir = { [Op.and]: [where, { statut: { [Op.ne]: 'termine' }, fin_effective: { [Op.gt]: maintenant } }] };
    const passes = { [Op.and]: [where, { [Op.or]: [{ statut: 'termine' }, { fin_effective: { [Op.lte]: maintenant } }] }] };
    const [total, nbAVenir] = await Promise.all([this.model.count({ where }), this.model.count({ where: aVenir })]);
    const commun = { attributes: { include: attributsComptes() }, include: this._defaultIncludes(), subQuery: false };
    const debut = (p - 1) * l;
    const rows = debut < nbAVenir
      ? await this.model.findAll({ ...commun, where: aVenir, order: [['date_debut', 'ASC'], ['id_evenement', 'ASC']], limit: l, offset: debut })
      : [];
    if (rows.length < l) {
      rows.push(...await this.model.findAll({
        ...commun,
        where: passes,
        order: [['date_debut', 'DESC'], ['id_evenement', 'DESC']],
        limit: l - rows.length,
        offset: Math.max(0, debut - nbAVenir)
      }));
    }
    return {
      data: rows,
      pagination: {
        page: p, limit: l, total,
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    };
  }

  /**
   * Trouve les événements à venir
   */
  async findUpcoming(options = {}) {
    const { page = 1, limit = 20 } = options;
    const p = parseInt(page);
    const l = parseInt(limit);
    const where = {
      ...options.where,
      date_debut: { [Op.gte]: new Date() },
      statut: { [Op.in]: ['publie', 'planifie'] }
    };

    const [total, rows] = await Promise.all([
      this.model.count({ where }),
      this.model.findAll({
        where,
        attributes: { include: attributsComptes() },
        include: this._defaultIncludes(),
        order: [['date_debut', 'ASC']],
        limit: l,
        offset: (p - 1) * l,
        subQuery: false
      })
    ]);

    return {
      data: rows,
      pagination: {
        page: p, limit: l, total,
        totalPages: Math.ceil(total / l),
        hasNext: p * l < total,
        hasPrev: p > 1
      }
    };
  }

  /**
   * Trouve un événement avec tous ses détails
   */
  /** Listes (admin, organisateur, wilaya, en attente) : avec les comptes d'inscriptions */
  async findAll(options = {}) {
    return super.findAll({ ...options, attributes: options.attributes || { include: attributsComptes() } });
  }

  async findWithFullDetails(id) {
    // Use default includes (lightweight) + Programme, Media, Organisation
    const includes = this._defaultIncludes();

    // Questions du formulaire d'inscription du type (page détail uniquement, pas les listes)
    const typeIdx = includes.findIndex(i => i.as === 'TypeEvenement');
    if (typeIdx !== -1) {
      includes[typeIdx] = {
        ...includes[typeIdx],
        attributes: [...includes[typeIdx].attributes, 'config_inscription']
      };
    }

    if (this.models.Programme) {
      includes.push({
        model: this.models.Programme,
        as: 'Programmes',
        required: false,
        // Requête à part : jointes ensemble, activités × médias × mots-clés multipliaient les lignes
        // (351 pour un seul événement), et les comptes d'inscrits étaient recalculés pour chacune
        separate: true,
        attributes: { exclude: PUBLIC_PROGRAMME_EXCLUDE },
        order: [['date_programme', 'ASC'], ['heure_debut', 'ASC']],
        include: this.models.Lieu ? [{
          model: this.models.Lieu,
          as: 'Lieu',
          attributes: ['nom', 'adresse', 'latitude', 'longitude'],
          required: false
        }] : []
      });
    }

    if (this.models.Media) {
      includes.push({
        model: this.models.Media,
        as: 'Medias',
        required: false,
        separate: true
      });
    }

    if (this.models.TagMotCle && this.models.EvenementTag) {
      includes.push({
        model: this.models.TagMotCle,
        as: 'Tags',
        attributes: ['id_tag', 'nom'],
        through: { attributes: [] },
        required: false
      });
    }

    if (this.models.Organisation) {
      includes.push({
        model: this.models.Organisation,
        // Ce que la page affiche, sans les coordonnées de l'organisation
        attributes: ['id_organisation', 'nom', 'description', 'logo_url', 'site_web', 'statut'],
        // rôle de l'organisation (organisateur principal, partenaire, sponsor…) pour la page publique
        through: { attributes: ['role'] },
        as: 'Organisations',
        required: false
      });
    }

    return this.model.findByPk(id, {
      attributes: { include: attributsComptes() },
      include: includes
    });
  }

  /**
   * Trouve les événements par organisateur
   */
  async findByOrganisateur(userId, options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, id_user: userId },
      include: this._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Trouve les événements associés à une œuvre
   */
  async findByOeuvre(oeuvreId) {
    return this.model.findAll({
      where: { statut: { [Op.notIn]: ['brouillon', 'en_attente'] } },
      attributes: { include: attributsComptes() },
      include: [
        ...this._defaultIncludes(),
        {
          model: this.models.Oeuvre,
          as: 'Oeuvres',
          where: { id_oeuvre: oeuvreId },
          through: { attributes: [] },
          required: true
        }
      ],
      order: [['date_debut', 'ASC']],
      limit: 50
    });
  }

  /**
   * Recherche événements (multilingue)
   */
  async searchEvenements(query, options = {}) {
    if (await aColonne(this.model, 'texte_recherche')) {
      const { page = 1, limit = 20 } = options;
      return this.findAll({
        ...options,
        page,
        limit,
        where: { [Op.and]: [await this._conditionTexte(query), { ...options.additionalWhere, statut: { [Op.notIn]: ['brouillon', 'en_attente'] } }] },
        include: this._defaultIncludes()
      });
    }
    return this.search(query, ['nom_evenement', 'description'], {
      ...options,
      additionalWhere: { ...options.additionalWhere, statut: { [Op.notIn]: ['brouillon', 'en_attente'] } },
      include: this._defaultIncludes()
    });
  }

  /**
   * Trouve par wilaya
   */
  async findByWilaya(wilayaId, options = {}) {
    const include = this._detailIncludes().map(inc => {
      if (inc.as === 'Lieu') {
        return {
          ...inc,
          required: true,
          include: [{
            model: this.models.Commune,
            required: true,
            include: [{
              model: this.models.Daira,
              required: true,
              include: [{
                model: this.models.Wilaya,
                where: { id_wilaya: wilayaId },
                required: true
              }]
            }]
          }]
        };
      }
      return inc;
    });

    return this.findAll({
      ...options,
      where: { ...options.where, statut: { [Op.in]: ['publie', 'planifie', 'en_cours'] } },
      include
    });
  }

  /**
   * Inscrit un utilisateur à un événement
   */
  async registerParticipant(evenementId, userId, options = {}) {
    if (!this.models.EvenementUser) {
      throw new Error('Model EvenementUser not available');
    }

    const { transaction, ...data } = options;
    const queryOpts = transaction ? { transaction } : {};

    const existing = await this.models.EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId },
      ...queryOpts
    });

    if (existing) {
      // Un participant rejeté (annulé) ne peut pas se ré-inscrire
      if (existing.statut_participation === 'annule') {
        throw AppError.badRequest('Inscription refusée — participation annulée par l\'organisateur', 'REGISTRATION_REFUSED');
      }
      // Invitation (import d'une liste) : la personne confirme elle-même → inscription normale,
      // que l'organisateur confirme ou refuse ensuite
      if (existing.statut_participation === 'invitation') {
        return existing.update({ statut_participation: 'inscrit', ...data }, queryOpts);
      }
      // Déjà inscrit/confirmé/présent → pas de changement
      return existing;
    }

    return this.models.EvenementUser.create({
      id_evenement: evenementId,
      id_user: userId,
      statut_participation: 'inscrit',
      date_inscription: new Date(),
      ...data
    }, queryOpts);
  }

  /**
   * Désinscrit un utilisateur
   */
  async unregisterParticipant(evenementId, userId) {
    if (!this.models.EvenementUser) return false;

    // Un refus de l'organisateur (« annule ») est gardé : sans lui, se désinscrire puis se
    // réinscrire effaçait le refus (registerParticipant ne le voyait plus)
    const where = { id_evenement: evenementId, id_user: userId };
    const result = await this.models.EvenementUser.destroy({
      where: { ...where, statut_participation: { [Op.ne]: 'annule' } }
    });
    if (result > 0) return true;
    return !!(await this.models.EvenementUser.findOne({ where: { ...where, statut_participation: 'annule' }, attributes: ['id_evenement'] }));
  }

  /**
   * Compte les participants d'un événement
   */
  async countParticipants(evenementId, options = {}) {
    if (!this.models.EvenementUser) return 0;

    // Places prises en personnes (nombre_personnes de chaque inscription, 1 par défaut)
    const [ligne] = await this.models.EvenementUser.findAll({
      attributes: [[literal(`COALESCE(SUM(${personnesSql('`EvenementUser`')}), 0)`), 'places']],
      where: {
        id_evenement: evenementId,
        statut_participation: { [Op.in]: STATUTS_PLACE_PRISE }
      },
      raw: true,
      ...options
    });
    return Number(ligne?.places) || 0;
  }

  // ============================================================================
  // PARTICIPANTS
  // ============================================================================

  /**
   * Liste publique des participants confirmés (données limitées, pas d'email)
   */
  async getPublicParticipants(evenementId) {
    const where = {
      id_evenement: evenementId,
      statut_participation: { [Op.in]: ['confirme', 'present'] }
    };
    // Nommés publiquement : seulement les personnes au profil public qui ont accepté les
    // conditions (pas un compte créé par l'import d'une liste, jamais ouvert par son titulaire)
    const [participants, total] = await Promise.all([
      this.models.EvenementUser.findAll({
        where,
        attributes: ['role_participation', 'date_inscription'],
        include: [{
          model: this.models.User,
          as: 'User',
          attributes: ['id_user', 'nom', 'prenom', 'photo_url'],
          where: { profil_public: true, accepte_conditions: true },
          required: true
        }],
        order: [['date_inscription', 'ASC']]
      }),
      // En personnes : une inscription « 4 personnes » en compte 4
      this.models.EvenementUser.findAll({
        where,
        attributes: [[literal(`COALESCE(SUM(${personnesSql('`EvenementUser`')}), 0)`), 'n']],
        raw: true
      }).then(([ligne]) => Number(ligne?.n) || 0)
    ]);
    return { participants, total };
  }

  /**
   * Récupère les participants d'un événement avec profil utilisateur
   */
  async getParticipants(evenementId) {
    return this.models.EvenementUser.findAll({
      where: { id_evenement: evenementId },
      include: [{
        model: this.models.User,
        as: 'User',
        // email_verifie : faux tant qu'un compte créé par import n'a pas choisi son mot de passe
        attributes: ['id_user', 'nom', 'prenom', 'email', 'photo_url', 'id_type_user', 'email_verifie']
      }],
      order: [['date_inscription', 'DESC']]
    });
  }

  /**
   * Récupère l'inscription d'un utilisateur à un événement
   */
  async getRegistration(evenementId, userId) {
    return this.models.EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId }
    });
  }

  /**
   * Valide ou refuse la participation d'un utilisateur
   */
  async updateParticipationStatus(evenementId, userId, data) {
    const participation = await this.models.EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId }
    });
    if (!participation) return null;
    await participation.update(data);
    return participation;
  }

  /**
   * Récupère les professionnels en attente pour un événement
   */
  async getPendingProfessionals(evenementId, limit = 50) {
    return this.models.EvenementUser.findAll({
      where: {
        id_evenement: evenementId,
        statut_participation: 'inscrit'
      },
      include: [{
        model: this.models.User,
        as: 'User',
        // Identité et e-mail seulement (pas de date de naissance, adresse, documents…)
        attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'id_type_user', 'entreprise', 'email'],
        include: [
          { model: this.models.TypeUser, as: 'TypeUser', required: false }
        ]
      }],
      order: [['date_inscription', 'ASC']],
      limit
    });
  }

  /**
   * Profil d'un participant, vu par l'organisateur : identité, présentation, e-mail (pour le
   * contacter) ; le téléphone seulement s'il l'a rendu public (celui donné à l'inscription est
   * dans ses réponses). Jamais la date de naissance, l'adresse, les documents ni l'état du compte.
   */
  async getParticipantProfile(userId) {
    const user = await this.models.User.findByPk(userId, {
      attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'biographie', 'id_type_user', 'entreprise',
        'specialites', 'site_web', 'reseaux_sociaux', 'wilaya_residence', 'email', 'telephone', 'telephone_public'],
      include: [
        { model: this.models.TypeUser, as: 'TypeUser', required: false },
        { model: this.models.Wilaya, as: 'Wilaya', required: false },
        {
          model: this.models.Oeuvre,
          as: 'OeuvresSaisies',
          where: { statut: 'publie' },
          required: false,
          limit: 10
        }
      ]
    });
    if (user && !user.telephone_public) user.setDataValue('telephone', null);
    return user;
  }

  // ============================================================================
  // OEUVRES D'UN ÉVÉNEMENT
  // ============================================================================

  /**
   * Récupère les oeuvres ajoutées + disponibles pour un user dans un événement
   */
  async getOeuvresForUser(evenementId, userId) {
    const [oeuvresAjoutees, toutesOeuvres] = await Promise.all([
      this.models.EvenementOeuvre.findAll({
        where: { id_evenement: evenementId },
        include: [{
          model: this.models.Oeuvre,
          as: 'Oeuvre',
          where: { saisi_par: userId },
          required: true
        }],
        order: [['ordre_presentation', 'ASC']]
      }),
      // Plafond : un catalogue importé peut compter des milliers de livres
      this.models.Oeuvre.findAll({
        where: { saisi_par: userId, statut: 'publie' },
        attributes: ['id_oeuvre', 'titre', 'statut', 'id_type_oeuvre'],
        order: [['date_creation', 'DESC']],
        limit: 500
      })
    ]);
    return { oeuvresAjoutees, toutesOeuvres };
  }

  /**
   * Vérifie qu'une oeuvre appartient à un utilisateur
   */
  async findOeuvreByOwner(oeuvreId, userId) {
    return this.models.Oeuvre.findOne({
      where: { id_oeuvre: oeuvreId, saisi_par: userId }
    });
  }

  /**
   * Vérifie si une oeuvre est déjà associée à un événement
   */
  async findEvenementOeuvre(evenementId, oeuvreId) {
    return this.models.EvenementOeuvre.findOne({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId }
    });
  }

  /**
   * Ajoute une oeuvre à un événement
   */
  async addOeuvreToEvent(data) {
    const maxOrdre = await this.models.EvenementOeuvre.max('ordre_presentation', {
      where: { id_evenement: data.id_evenement }
    });

    let association;
    try {
      association = await this.models.EvenementOeuvre.create({
        ...data,
        ordre_presentation: (maxOrdre || 0) + 1
      });
    } catch (error) {
      // Double clic : l'œuvre vient d'être ajoutée par l'autre requête, on renvoie ce lien
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      association = await this.models.EvenementOeuvre.findOne({ where: { id_evenement: data.id_evenement, id_oeuvre: data.id_oeuvre } });
      if (!association) throw error;
    }

    return this.models.EvenementOeuvre.findByPk(association.id_EventOeuvre, {
      include: [{ model: this.models.Oeuvre, as: 'Oeuvre', required: false }]
    });
  }

  /**
   * Met à jour une association oeuvre-événement
   */
  async updateOeuvreInEvent(evenementId, oeuvreId, userId, updates) {
    const association = await this.models.EvenementOeuvre.findOne({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId, id_presentateur: userId }
    });
    if (!association) return null;

    await association.update(updates);

    return this.models.EvenementOeuvre.findOne({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId },
      include: [{ model: this.models.Oeuvre, as: 'Oeuvre', required: false }]
    });
  }

  /**
   * Réordonne les oeuvres d'un événement (dans une transaction)
   */
  async reorderOeuvres(evenementId, userId, oeuvres) {
    if (!oeuvres || oeuvres.length === 0) return;

    // Valider toutes les données d'abord
    const parsed = oeuvres.map(item => {
      const idOeuvre = parseInt(item.id_oeuvre);
      const ordre = parseInt(item.ordre ?? item.ordre_presentation);
      if (!Number.isInteger(idOeuvre) || !Number.isInteger(ordre)) {
        throw new Error('Données de réorganisation invalides');
      }
      return { idOeuvre, ordre };
    });

    // 1 seul UPDATE avec CASE WHEN au lieu de N UPDATEs séquentiels
    const cases = parsed.map(p => `WHEN ${p.idOeuvre} THEN ${p.ordre}`).join(' ');
    const ids = parsed.map(p => p.idOeuvre).join(',');

    const tableName = this.models.EvenementOeuvre.tableName || 'evenement_oeuvre';

    const [results] = await this.model.sequelize.query(
      `UPDATE \`${tableName}\`
       SET ordre_presentation = CASE id_oeuvre ${cases} END
       WHERE id_evenement = ? AND id_presentateur = ? AND id_oeuvre IN (${ids})`,
      {
        replacements: [evenementId, userId],
        type: 'UPDATE'
      }
    );

    return results;
  }

  /**
   * Récupère les oeuvres ordonnées d'un user pour un événement
   */
  async getOeuvresOrdered(evenementId, userId) {
    return this.models.EvenementOeuvre.findAll({
      where: { id_evenement: evenementId, id_presentateur: userId },
      include: [{ model: this.models.Oeuvre, as: 'Oeuvre', required: false }],
      order: [['ordre_presentation', 'ASC']]
    });
  }

  /**
   * Supprime une oeuvre d'un événement
   */
  async removeOeuvreFromEvent(evenementId, oeuvreId, userId) {
    return this.models.EvenementOeuvre.destroy({
      where: { id_evenement: evenementId, id_oeuvre: oeuvreId, id_presentateur: userId }
    });
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Trouve les événements en attente de validation (admin)
   */
  async findPending(options = {}) {
    return this.findAll({
      ...options,
      where: { ...options.where, statut: 'en_attente' },
      include: this._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
  }

  /**
   * Statistiques événements
   */
  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, upcoming, ongoing, thisMonthCount, byType] = await Promise.all([
      this.count(),
      this.count({ date_debut: { [Op.gt]: now }, statut: { [Op.in]: ['publie', 'planifie'] } }),
      this.count({ statut: 'en_cours' }),
      this.count({ date_creation: { [Op.gte]: thisMonth } }),
      this.models.TypeEvenement ? this.model.findAll({
        attributes: [
          'id_type_evenement',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id_evenement')), 'count']
        ],
        include: [{ model: this.models.TypeEvenement, as: 'TypeEvenement', attributes: ['nom_type'] }],
        group: ['id_type_evenement', 'TypeEvenement.id_type_evenement'],
        raw: false,
        limit: 50
      }) : []
    ]);

    return { total, upcoming, ongoing, thisMonth: thisMonthCount, byType };
  }
}

module.exports = EvenementRepository;
