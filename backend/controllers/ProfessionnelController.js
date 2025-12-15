// controllers/ProfessionnelController.js - VERSION i18n
const { Op } = require('sequelize');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

class ProfessionnelController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ⚡ Recherche multilingue
  buildMultiLangSearch(field, search) {
    return [
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.fr'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.ar'),
        { [Op.like]: `%${search}%` }
      ),
      this.sequelize.where(
        this.sequelize.fn('JSON_EXTRACT', this.sequelize.col(field), '$.en'),
        { [Op.like]: `%${search}%` }
      )
    ];
  }

  // Récupérer tous les professionnels
  async getAllProfessionnels(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, specialite, wilaya, search, verifie } = req.query;
      const offset = (page - 1) * limit;

      const where = {
        id_type_user: { [Op.in]: [2, 3, 4] }  // Types professionnels
      };

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...this.buildMultiLangSearch('nom', search),
          ...this.buildMultiLangSearch('prenom', search),
          ...this.buildMultiLangSearch('biographie', search),
          { entreprise: { [Op.like]: `%${search}%` } }
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

      const professionnels = await this.models.User.findAndCountAll({
        where,
        include,
        attributes: { exclude: ['mot_de_passe', 'reset_token'] },
        limit: parseInt(limit),
        offset,
        order: [[this.sequelize.fn('JSON_EXTRACT', this.sequelize.col('User.nom'), `$.${lang}`), 'ASC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          professionnels: translateDeep(professionnels.rows, lang),
          pagination: {
            total: professionnels.count,
            page: parseInt(page),
            pages: Math.ceil(professionnels.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Récupérer un professionnel par ID
  async getProfessionnelById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const professionnel = await this.models.User.findByPk(id, {
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
        attributes: { exclude: ['mot_de_passe', 'reset_token'] }
      });

      if (!professionnel) {
        return res.status(404).json({ success: false, error: 'Professionnel non trouvé' });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(professionnel, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Profil du professionnel connecté
  async getMyProfile(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡

      const professionnel = await this.models.User.findByPk(req.user.id_user, {
        include: [
          { model: this.models.TypeUser },
          { model: this.models.Wilaya }
        ],
        attributes: { exclude: ['mot_de_passe', 'reset_token'] }
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(professionnel, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Mettre à jour le profil
  async updateMyProfile(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { nom, prenom, biographie, ...otherFields } = req.body;

      const user = await this.models.User.findByPk(req.user.id_user);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      const updates = { ...otherFields };

      // ⚡ Gérer les champs multilingues
      if (nom !== undefined) {
        if (typeof nom === 'object') {
          updates.nom = mergeTranslations(user.nom, nom);
        } else {
          updates.nom = mergeTranslations(user.nom, { [lang]: nom });
        }
      }

      if (prenom !== undefined) {
        if (typeof prenom === 'object') {
          updates.prenom = mergeTranslations(user.prenom, prenom);
        } else {
          updates.prenom = mergeTranslations(user.prenom, { [lang]: prenom });
        }
      }

      if (biographie !== undefined) {
        if (typeof biographie === 'object') {
          updates.biographie = mergeTranslations(user.biographie, biographie);
        } else {
          updates.biographie = mergeTranslations(user.biographie, { [lang]: biographie });
        }
      }

      await user.update(updates);

      const userUpdated = await this.models.User.findByPk(req.user.id_user, {
        include: [{ model: this.models.TypeUser }],
        attributes: { exclude: ['mot_de_passe', 'reset_token'] }
      });

      // ⚡ Traduire
      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: translateDeep(userUpdated, lang)
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Œuvres du professionnel
  async getMesOeuvres(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, statut } = req.query;
      const offset = (page - 1) * limit;

      const where = { saisi_par: req.user.id_user };
      if (statut) where.statut = statut;

      const oeuvres = await this.models.Oeuvre.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeOeuvre },
          { model: this.models.Media, limit: 1 }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_creation', 'DESC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          oeuvres: translateDeep(oeuvres.rows, lang),
          pagination: {
            total: oeuvres.count,
            page: parseInt(page),
            pages: Math.ceil(oeuvres.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Événements du professionnel
  async getMesEvenements(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 20, statut } = req.query;
      const offset = (page - 1) * limit;

      const where = { id_organisateur: req.user.id_user };
      if (statut) where.statut = statut;

      const evenements = await this.models.Evenement.findAndCountAll({
        where,
        include: [
          { model: this.models.TypeEvenement },
          { model: this.models.Lieu }
        ],
        limit: parseInt(limit),
        offset,
        order: [['date_debut', 'DESC']]
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          evenements: translateDeep(evenements.rows, lang),
          pagination: {
            total: evenements.count,
            page: parseInt(page),
            pages: Math.ceil(evenements.count / limit)
          }
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Statistiques du professionnel
  async getMesStatistiques(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const userId = req.user.id_user;

      const [
        totalOeuvres,
        totalEvenements,
        oeuvresPubliees,
        evenementsActifs
      ] = await Promise.all([
        this.models.Oeuvre.count({ where: { saisi_par: userId } }),
        this.models.Evenement.count({ where: { id_organisateur: userId } }),
        this.models.Oeuvre.count({ where: { saisi_par: userId, statut: 'publie' } }),
        this.models.Evenement.count({ 
          where: { 
            id_organisateur: userId,
            date_fin: { [Op.gte]: new Date() }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalOeuvres,
          totalEvenements,
          oeuvresPubliees,
          evenementsActifs,
          tauxPublication: totalOeuvres > 0 ? Math.round((oeuvresPubliees / totalOeuvres) * 100) : 0
        },
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }

  // Recherche de professionnels
  async searchProfessionnels(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const where = {
        id_type_user: { [Op.in]: [2, 3, 4] },
        [Op.or]: [
          ...this.buildMultiLangSearch('nom', q),
          ...this.buildMultiLangSearch('prenom', q),
          { entreprise: { [Op.like]: `%${q}%` } }
        ]
      };

      const professionnels = await this.models.User.findAll({
        where,
        attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'entreprise'],
        include: [{ model: this.models.TypeUser, attributes: ['nom_type'] }],
        limit: parseInt(limit)
      });

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(professionnels, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  }
}

module.exports = ProfessionnelController;
