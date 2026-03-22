/**
 * ProfessionnelService - Service pour les professionnels de la culture
 * Gère : profils, œuvres, événements, artisanats, statistiques, exports
 */
const { Op } = require('sequelize');
const { mergeTranslations } = require('../helpers/i18n');
const { buildMultiLangSearch } = require('../utils/multiLangSearchBuilder');
const { sanitizeLike } = require('../utils/sanitize');

class ProfessionnelService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // CONSULTATION
  // ========================================================================

  async getAllProfessionnels({ page = 1, limit = 20, search, specialite, wilaya, verifie, lang = 'fr' }) {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const where = {
      id_type_user: { [Op.in]: [2, 3, 4] }
    };

    if (search) {
      const safeSearch = `%${sanitizeLike(search)}%`;
      where[Op.or] = [
        ...buildMultiLangSearch(this.sequelize, 'nom', search),
        ...buildMultiLangSearch(this.sequelize, 'prenom', search),
        ...buildMultiLangSearch(this.sequelize, 'biographie', search),
        { entreprise: { [Op.like]: safeSearch } }
      ];
    }

    if (verifie !== undefined) {
      where.verifie = verifie === 'true';
    }

    const include = [
      { model: this.models.TypeUser, attributes: ['nom_type'] }
    ];

    if (wilaya) {
      include.push({
        model: this.models.Wilaya,
        where: { id_wilaya: wilaya }
      });
    }

    const safeLang = lang.replace(/[^a-z-]/gi, '');
    const { rows, count } = await this.models.User.findAndCountAll({
      where,
      include,
      attributes: { exclude: ['password', 'reset_token'] },
      limit: parseInt(limit),
      offset,
      order: [[this.sequelize.literal(`JSON_EXTRACT(\`User\`.\`nom\`, '$.${safeLang}')`), 'ASC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit) }
    };
  }

  async getProfessionnelById(id) {
    return this.models.User.findByPk(id, {
      include: [
        { model: this.models.TypeUser },
        { model: this.models.Wilaya },
        {
          model: this.models.Oeuvre,
          as: 'OeuvresSaisies',
          where: { statut: 'publie' },
          required: false,
          limit: 10
        },
        {
          model: this.models.Evenement,
          as: 'EvenementsOrganises',
          required: false,
          limit: 5
        }
      ],
      attributes: { exclude: ['password', 'reset_token'] }
    });
  }

  async getMyProfile(userId) {
    return this.models.User.findByPk(userId, {
      include: [
        { model: this.models.TypeUser },
        { model: this.models.Wilaya }
      ],
      attributes: { exclude: ['password', 'reset_token'] }
    });
  }

  async updateMyProfile(userId, lang, { nom, prenom, biographie, ...otherFields }) {
    const user = await this.models.User.findByPk(userId);
    if (!user) return null;

    const updates = { ...otherFields };

    // Gérer les champs multilingues
    if (nom !== undefined) {
      updates.nom = typeof nom === 'object'
        ? mergeTranslations(user.nom, nom)
        : mergeTranslations(user.nom, { [lang]: nom });
    }
    if (prenom !== undefined) {
      updates.prenom = typeof prenom === 'object'
        ? mergeTranslations(user.prenom, prenom)
        : mergeTranslations(user.prenom, { [lang]: prenom });
    }
    if (biographie !== undefined) {
      updates.biographie = typeof biographie === 'object'
        ? mergeTranslations(user.biographie, biographie)
        : mergeTranslations(user.biographie, { [lang]: biographie });
    }

    await user.update(updates);

    return this.models.User.findByPk(userId, {
      include: [{ model: this.models.TypeUser }],
      attributes: { exclude: ['password', 'reset_token'] }
    });
  }

  async searchProfessionnels(q, limit = 10) {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const where = {
      id_type_user: { [Op.in]: [2, 3, 4] },
      [Op.or]: [
        ...buildMultiLangSearch(this.sequelize, 'nom', q),
        ...buildMultiLangSearch(this.sequelize, 'prenom', q),
        { entreprise: { [Op.like]: `%${sanitizeLike(q)}%` } }
      ]
    };

    return this.models.User.findAll({
      where,
      attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'entreprise'],
      include: [{ model: this.models.TypeUser, attributes: ['nom_type'] }],
      limit: safeLimit
    });
  }

  // ========================================================================
  // ŒUVRES
  // ========================================================================

  async getMesOeuvres(userId, { page = 1, limit = 20, statut }) {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const where = { saisi_par: userId };
    if (statut) where.statut = statut;

    const { rows, count } = await this.models.Oeuvre.findAndCountAll({
      where,
      include: [
        { model: this.models.TypeOeuvre },
        { model: this.models.Media, limit: 1 }
      ],
      limit: parseInt(limit),
      offset,
      order: [['date_creation', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) }
    };
  }

  async getMyOeuvres(userId, { page = 1, limit = 20, statut, type }) {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const where = { saisi_par: userId };

    if (statut) {
      where.statut = statut;
    } else {
      where.statut = { [Op.ne]: 'archive' };
    }
    if (type) where.id_type_oeuvre = type;

    const { rows, count } = await this.models.Oeuvre.findAndCountAll({
      where,
      include: [
        { model: this.models.TypeOeuvre, attributes: ['id_type_oeuvre', 'nom_type'], required: false },
        { model: this.models.Media, limit: 1, required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['date_creation', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)), limit: parseInt(limit) }
    };
  }

  // ========================================================================
  // ARTISANATS
  // ========================================================================

  async getMyArtisanats(userId, { page = 1, limit = 20, statut }) {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    if (!this.models.Artisanat) {
      return { data: [], total: 0, pagination: { total: 0, page: 1, pages: 0, limit } };
    }

    const offset = (page - 1) * limit;
    const oeuvreWhere = { saisi_par: userId };
    if (statut) oeuvreWhere.statut = statut;

    const { rows, count } = await this.models.Artisanat.findAndCountAll({
      include: [
        {
          model: this.models.Oeuvre,
          where: oeuvreWhere,
          attributes: ['id_oeuvre', 'titre', 'statut', 'date_creation'],
          include: [{ model: this.models.Media, limit: 1, required: false }]
        },
        { model: this.models.Materiau, attributes: ['id_materiau', 'nom'], required: false },
        { model: this.models.Technique, attributes: ['id_technique', 'nom'], required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['date_creation', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)), limit: parseInt(limit) }
    };
  }

  // ========================================================================
  // ÉVÉNEMENTS
  // ========================================================================

  async getMesEvenements(userId, { page = 1, limit = 20, statut }) {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const where = { id_user: userId };
    if (statut) where.statut = statut;

    const { rows, count } = await this.models.Evenement.findAndCountAll({
      where,
      include: [
        { model: this.models.TypeEvenement, as: 'TypeEvenement', required: false },
        { model: this.models.Lieu, as: 'Lieu', required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['date_debut', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) }
    };
  }

  async getMyEvenements(userId, { page = 1, limit = 20, statut }) {
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const where = { id_user: userId };

    if (statut === 'avenir') {
      where.date_debut = { [Op.gte]: new Date() };
    } else if (statut === 'passe') {
      where.date_fin = { [Op.lt]: new Date() };
    } else if (statut === 'en_cours') {
      where.date_debut = { [Op.lte]: new Date() };
      where.date_fin = { [Op.gte]: new Date() };
    }

    const { rows, count } = await this.models.Evenement.findAndCountAll({
      where,
      include: [
        { model: this.models.TypeEvenement, as: 'TypeEvenement', attributes: ['id_type_evenement', 'nom_type'], required: false },
        { model: this.models.Lieu, as: 'Lieu', attributes: ['id_lieu', 'nom', 'adresse'], required: false }
      ],
      limit: parseInt(limit),
      offset,
      order: [['date_debut', 'DESC']]
    });

    return {
      data: rows,
      total: count,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)), limit: parseInt(limit) }
    };
  }

  async getEventCalendar(userId, { year, month }) {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    const evenements = await this.models.Evenement.findAll({
      where: {
        id_user: userId,
        [Op.or]: [
          { date_debut: { [Op.between]: [startDate, endDate] } },
          { date_fin: { [Op.between]: [startDate, endDate] } }
        ]
      },
      attributes: ['id_evenement', 'titre', 'date_debut', 'date_fin', 'statut'],
      order: [['date_debut', 'ASC']]
    });

    return { year: parseInt(currentYear), month: parseInt(currentMonth), evenements };
  }

  // ========================================================================
  // STATISTIQUES
  // ========================================================================

  async getMesStatistiques(userId) {
    const [totalOeuvres, totalEvenements, oeuvresPubliees, evenementsActifs] = await Promise.all([
      this.models.Oeuvre.count({ where: { saisi_par: userId } }),
      this.models.Evenement.count({ where: { id_user: userId } }),
      this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'publie' } }),
      this.models.Evenement.count({
        where: { id_user: userId, date_fin: { [Op.gte]: new Date() } }
      })
    ]);

    return {
      totalOeuvres,
      totalEvenements,
      oeuvresPubliees,
      evenementsActifs,
      tauxPublication: totalOeuvres > 0 ? Math.round((oeuvresPubliees / totalOeuvres) * 100) : 0
    };
  }

  async getOeuvreStats(oeuvreId, userId) {
    const oeuvre = await this.models.Oeuvre.findOne({
      where: { id_oeuvre: oeuvreId, saisi_par: userId }
    });
    if (!oeuvre) return null;

    const [vues, favoris, commentaires] = await Promise.all([
      oeuvre.nb_vues || 0,
      this.models.Favori ? this.models.Favori.count({ where: { id_oeuvre: oeuvreId } }) : 0,
      this.models.Commentaire ? this.models.Commentaire.count({ where: { id_oeuvre: oeuvreId } }) : 0
    ]);

    return { vues, favoris, commentaires };
  }

  async getEvenementStats(evenementId, userId) {
    const evenement = await this.models.Evenement.findOne({
      where: { id_evenement: evenementId, id_user: userId }
    });
    if (!evenement) return null;

    const EvenementUser = this.models.EvenementUser;
    const [inscrits, confirmes, presents] = await Promise.all([
      EvenementUser ? EvenementUser.count({ where: { id_evenement: evenementId } }) : 0,
      EvenementUser ? EvenementUser.count({ where: { id_evenement: evenementId, statut_participation: 'confirme' } }) : 0,
      EvenementUser ? EvenementUser.count({ where: { id_evenement: evenementId, statut_participation: 'present' } }) : 0
    ]);

    return {
      inscrits,
      confirmes,
      presents,
      places_restantes: evenement.capacite_max ? evenement.capacite_max - inscrits : null
    };
  }

  async getAnalyticsOverview(userId, period = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [totalOeuvres, totalEvenements, oeuvresRecentes, evenementsRecents] = await Promise.all([
      this.models.Oeuvre.count({ where: { saisi_par: userId } }),
      this.models.Evenement.count({ where: { id_user: userId } }),
      this.models.Oeuvre.count({
        where: { saisi_par: userId, date_creation: { [Op.gte]: startDate } }
      }),
      this.models.Evenement.count({
        where: { id_user: userId, date_creation: { [Op.gte]: startDate } }
      })
    ]);

    return {
      period: parseInt(period),
      totaux: { oeuvres: totalOeuvres, evenements: totalEvenements },
      periode: { nouvelles_oeuvres: oeuvresRecentes, nouveaux_evenements: evenementsRecents }
    };
  }

  // ========================================================================
  // DASHBOARD
  // ========================================================================

  async getDashboard(userId) {
    const [
      totalOeuvres, oeuvresPubliees, oeuvresEnAttente,
      totalEvenements, evenementsAvenir,
      totalArtisanats,
      recentOeuvres, recentEvenements
    ] = await Promise.all([
      this.models.Oeuvre.count({ where: { saisi_par: userId } }),
      this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'publie' } }),
      this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'en_attente' } }),
      this.models.Evenement.count({ where: { id_user: userId } }),
      this.models.Evenement.count({
        where: { id_user: userId, date_debut: { [Op.gte]: new Date() } }
      }),
      this.models.Artisanat ? this.models.Artisanat.count({
        include: [{ model: this.models.Oeuvre, where: { saisi_par: userId }, required: true }]
      }) : 0,
      this.models.Oeuvre.findAll({
        where: { saisi_par: userId },
        include: [{ model: this.models.TypeOeuvre, attributes: ['nom_type'], required: false }],
        limit: 5,
        order: [['date_creation', 'DESC']]
      }),
      this.models.Evenement.findAll({
        where: { id_user: userId },
        include: [{ model: this.models.TypeEvenement, as: 'TypeEvenement', attributes: ['nom_type'], required: false }],
        limit: 5,
        order: [['date_creation', 'DESC']]
      })
    ]);

    return {
      statistiques: {
        oeuvres: { total: totalOeuvres, publiees: oeuvresPubliees, en_attente: oeuvresEnAttente },
        evenements: { total: totalEvenements, a_venir: evenementsAvenir },
        artisanats: { total: totalArtisanats, en_vente: 0 }
      },
      recent: { oeuvres: recentOeuvres, evenements: recentEvenements }
    };
  }

  // ========================================================================
  // GESTION PARTICIPANTS
  // ========================================================================

  async manageParticipants(evenementId, organisateurId, { userId, action, notes }) {
    const evenement = await this.models.Evenement.findOne({
      where: { id_evenement: evenementId, id_user: organisateurId }
    });
    if (!evenement) return { error: 'notFound' };

    const EvenementUser = this.models.EvenementUser;
    const participation = await EvenementUser.findOne({
      where: { id_evenement: evenementId, id_user: userId }
    });
    if (!participation) return { error: 'participantNotFound' };

    const updates = { date_validation: new Date(), valide_par: organisateurId };

    switch (action) {
      case 'confirmer':
        updates.statut_participation = 'confirme';
        break;
      case 'rejeter':
        updates.statut_participation = 'annule';
        break;
      case 'marquer_present':
        updates.statut_participation = 'present';
        updates.presence_confirmee = true;
        break;
      case 'marquer_absent':
        updates.statut_participation = 'absent';
        updates.presence_confirmee = false;
        break;
    }

    if (notes) updates.notes = notes;
    await participation.update(updates);

    const participant = await this.models.User.findByPk(userId, {
      attributes: ['id_user', 'nom', 'prenom', 'email']
    });

    return { participation, participant };
  }

  // ========================================================================
  // PROFIL PROFESSIONNEL
  // ========================================================================

  async updateProfessionalProfile(userId, body) {
    const allowedFields = ['nom', 'prenom', 'biographie', 'entreprise', 'telephone', 'photo_url', 'site_web', 'adresse', 'specialite'];
    const updates = {};
    allowedFields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });

    const user = await this.models.User.findByPk(userId);
    if (!user) return null;

    await user.update(updates);
    return user;
  }

  // ========================================================================
  // EXPORT
  // ========================================================================

  async getExportData(userId, type) {
    const EXPORT_LIMIT = 10000;
    switch (type) {
      case 'oeuvres':
        return this.models.Oeuvre.findAll({ where: { saisi_par: userId }, raw: true, limit: EXPORT_LIMIT });
      case 'evenements':
        return this.models.Evenement.findAll({ where: { id_user: userId }, raw: true, limit: EXPORT_LIMIT });
      case 'artisanats':
        if (!this.models.Artisanat) return [];
        return this.models.Artisanat.findAll({
          include: [{ model: this.models.Oeuvre, where: { saisi_par: userId }, required: true }],
          raw: true,
          limit: EXPORT_LIMIT
        });
      default:
        return null;
    }
  }

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  async getNotifications(userId, { limit = 20, offset = 0, marque }) {
    if (!this.models.Notification) {
      return { notifications: [], total: 0, non_lues: 0 };
    }

    const where = { id_user: userId };
    if (marque !== undefined) {
      where.lu = marque === 'true';
    }

    const { rows, count } = await this.models.Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date_creation', 'DESC']]
    });

    const non_lues = await this.models.Notification.count({ where: { id_user: userId, lu: false } });

    return { notifications: rows, total: count, non_lues };
  }
}

module.exports = ProfessionnelService;
