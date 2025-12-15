// routes/admin/adminEvenementsRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const path = require('path');

// ⚡ Import du middleware de validation de langue
const { validateLanguage, SUPPORTED_LANGUAGES } = require('../../middlewares/language');

const initAdminEvenementsRoutes = (models) => {
  // Import des middlewares
  let authMiddleware, validationMiddleware, auditMiddleware;
  
  try {
    authMiddleware = require('../../middlewares/authMiddleware')(models);
    validationMiddleware = require('../../middlewares/validationMiddleware');
    auditMiddleware = require('../../middlewares/auditMiddleware');
  } catch (error) {
    console.warn('⚠️ Utilisation des middlewares de fallback');
    authMiddleware = {
      authenticate: (req, res, next) => {
        req.user = { id_user: 1, isAdmin: true, email: 'admin@test.com' };
        next();
      },
      requireAdmin: (req, res, next) => {
        if (!req.user || !req.user.isAdmin) {
          return res.status(403).json({ success: false, message: 'Accès admin requis' });
        }
        next();
      }
    };
    
    validationMiddleware = {
      handleValidationErrors: (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
      }
    };
    
    auditMiddleware = {
      logAction: (action) => (req, res, next) => {
        console.log(`📝 Action: ${action}`);
        next();
      }
    };
  }

  const { body, query, param } = require('express-validator');

  // ⚡ Import des helpers i18n
  const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../../helpers/i18n');

  // Toutes les routes nécessitent l'authentification admin
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // ========================================================================
  // ⚡ ROUTES DE TRADUCTION
  // ========================================================================

  // Récupérer toutes les traductions d'un événement
  router.get('/:id/translations',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const evenement = await models.Evenement.findByPk(req.params.id, {
          attributes: ['id_evenement', 'nom_evenement', 'description', 'accessibilite']
        });

        if (!evenement) {
          return res.status(404).json({ success: false, error: 'Événement non trouvé' });
        }

        res.json({
          success: true,
          data: evenement,
          languages: SUPPORTED_LANGUAGES
        });
      } catch (error) {
        console.error('Erreur getEvenementTranslations:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // Mettre à jour une traduction spécifique
  router.patch('/:id/translation/:lang',
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validateLanguage,
    [
      body('nom_evenement').optional().isString().isLength({ max: 255 }),
      body('description').optional().isString().isLength({ max: 5000 }),
      body('accessibilite').optional().isString().isLength({ max: 1000 })
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('UPDATE_EVENEMENT_TRANSLATION'),
    async (req, res) => {
      try {
        const { id, lang } = req.params;
        const { nom_evenement, description, accessibilite } = req.body;

        const evenement = await models.Evenement.findByPk(id);
        if (!evenement) {
          return res.status(404).json({ success: false, error: 'Événement non trouvé' });
        }

        const updates = {};
        if (nom_evenement) updates.nom_evenement = mergeTranslations(evenement.nom_evenement, { [lang]: nom_evenement });
        if (description) updates.description = mergeTranslations(evenement.description, { [lang]: description });
        if (accessibilite) updates.accessibilite = mergeTranslations(evenement.accessibilite, { [lang]: accessibilite });

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ success: false, error: 'Aucune donnée à mettre à jour' });
        }

        await evenement.update(updates);

        res.json({
          success: true,
          message: `Traduction ${lang} mise à jour`,
          data: evenement
        });
      } catch (error) {
        console.error('Erreur updateEvenementTranslation:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // ========================================================================
  // ROUTES CRUD STANDARD
  // ========================================================================

  // GET /api/admin/evenements - Liste des événements
  router.get('/',
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('statut').optional().isIn(['a_venir', 'en_cours', 'termine', 'annule']),
      query('type').optional().isString(),
      query('search').optional().isString(),
      query('wilaya').optional().isInt({ min: 1, max: 58 }),
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601()
    ],
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const lang = req.lang || 'fr';  // ⚡
        const { page = 1, limit = 10, statut, type, search, wilaya, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;
        
        if (!models.Evenement) {
          return res.json({
            success: true,
            data: { items: [], pagination: { total: 0, page: parseInt(page), pages: 0, limit: parseInt(limit) } }
          });
        }
        
        const where = {};
        if (statut) where.statut = statut;
        if (type) where.type_evenement = type;
        if (wilaya) where.id_wilaya = wilaya;
        
        // ⚡ Recherche multilingue
        if (search) {
          const sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
          where[Op.or] = [
            sequelize.where(
              sequelize.fn('JSON_EXTRACT', sequelize.col('nom_evenement'), '$.fr'),
              { [Op.like]: `%${search}%` }
            ),
            sequelize.where(
              sequelize.fn('JSON_EXTRACT', sequelize.col('nom_evenement'), '$.ar'),
              { [Op.like]: `%${search}%` }
            ),
            sequelize.where(
              sequelize.fn('JSON_EXTRACT', sequelize.col('description'), '$.fr'),
              { [Op.like]: `%${search}%` }
            )
          ];
        }
        
        if (startDate && endDate) {
          where.date_debut = { [Op.between]: [new Date(startDate), new Date(endDate)] };
        }
        
        const evenements = await models.Evenement.findAndCountAll({
          where,
          include: [
            {
              model: models.User,
              as: 'Organisateur',
              attributes: ['id_user', 'nom', 'prenom', 'email'],
              required: false
            }
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['date_creation', 'DESC']],
          distinct: true
        });
        
        // ⚡ Traduire les résultats
        res.json({
          success: true,
          data: {
            items: translateDeep(evenements.rows, lang),
            pagination: {
              total: evenements.count,
              page: parseInt(page),
              pages: Math.ceil(evenements.count / limit),
              limit: parseInt(limit)
            }
          },
          lang
        });
      } catch (error) {
        console.error('Erreur liste événements admin:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // POST /api/admin/evenements - Créer un événement
  router.post('/',
    [
      body('nom_evenement').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 3;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 3);
        return false;
      }).withMessage('Nom requis (min 3 caractères)'),
      body('description').custom((value) => {
        if (typeof value === 'string') return value.trim().length >= 10;
        if (typeof value === 'object') return Object.values(value).some(v => v && v.length >= 10);
        return false;
      }).withMessage('Description requise (min 10 caractères)')
    ],
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('CREATE_EVENEMENT'),
    async (req, res) => {
      try {
        const lang = req.lang || 'fr';  // ⚡
        const { nom_evenement, description, accessibilite, ...otherData } = req.body;

        // ⚡ Préparer les champs multilingues
        const prepareField = (value) => {
          if (!value) return null;
          if (typeof value === 'object') return value;
          return createMultiLang(value, lang);
        };

        const evenementData = {
          ...otherData,
          nom_evenement: prepareField(nom_evenement),
          description: prepareField(description),
          accessibilite: prepareField(accessibilite),
          date_creation: new Date()
        };

        const evenement = await models.Evenement.create(evenementData);

        res.status(201).json({
          success: true,
          message: 'Événement créé avec succès',
          data: translate(evenement, lang)
        });
      } catch (error) {
        console.error('Erreur création événement:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // GET /api/admin/evenements/:id - Détails
  router.get('/:id',
    param('id').isInt({ min: 1 }),
    validationMiddleware.handleValidationErrors,
    async (req, res) => {
      try {
        const lang = req.lang || 'fr';  // ⚡
        const evenement = await models.Evenement.findByPk(req.params.id, {
          include: [
            { model: models.User, as: 'Organisateur', attributes: ['id_user', 'nom', 'prenom', 'email'] },
            { model: models.Programme },
            { model: models.Lieu }
          ]
        });

        if (!evenement) {
          return res.status(404).json({ success: false, error: 'Événement non trouvé' });
        }

        res.json({
          success: true,
          data: translateDeep(evenement, lang),
          lang
        });
      } catch (error) {
        console.error('Erreur détails événement:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // PUT /api/admin/evenements/:id - Modifier
  router.put('/:id',
    param('id').isInt({ min: 1 }),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('UPDATE_EVENEMENT'),
    async (req, res) => {
      try {
        const lang = req.lang || 'fr';  // ⚡
        const evenement = await models.Evenement.findByPk(req.params.id);

        if (!evenement) {
          return res.status(404).json({ success: false, error: 'Événement non trouvé' });
        }

        const { nom_evenement, description, accessibilite, ...otherUpdates } = req.body;
        const updates = { ...otherUpdates };

        // ⚡ Gérer les champs multilingues
        if (nom_evenement !== undefined) {
          updates.nom_evenement = typeof nom_evenement === 'object' 
            ? mergeTranslations(evenement.nom_evenement, nom_evenement)
            : mergeTranslations(evenement.nom_evenement, { [lang]: nom_evenement });
        }
        if (description !== undefined) {
          updates.description = typeof description === 'object'
            ? mergeTranslations(evenement.description, description)
            : mergeTranslations(evenement.description, { [lang]: description });
        }
        if (accessibilite !== undefined) {
          updates.accessibilite = typeof accessibilite === 'object'
            ? mergeTranslations(evenement.accessibilite, accessibilite)
            : mergeTranslations(evenement.accessibilite, { [lang]: accessibilite });
        }

        await evenement.update(updates);

        res.json({
          success: true,
          message: 'Événement mis à jour',
          data: translate(evenement, lang)
        });
      } catch (error) {
        console.error('Erreur mise à jour événement:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  // DELETE /api/admin/evenements/:id - Supprimer
  router.delete('/:id',
    param('id').isInt({ min: 1 }),
    validationMiddleware.handleValidationErrors,
    auditMiddleware.logAction('DELETE_EVENEMENT'),
    async (req, res) => {
      try {
        const evenement = await models.Evenement.findByPk(req.params.id);

        if (!evenement) {
          return res.status(404).json({ success: false, error: 'Événement non trouvé' });
        }

        await evenement.destroy();

        res.json({ success: true, message: 'Événement supprimé' });
      } catch (error) {
        console.error('Erreur suppression événement:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  console.log('✅ Routes admin événements i18n initialisées');
  console.log('  🌍 Routes traduction: GET /:id/translations, PATCH /:id/translation/:lang');

  return router;
};

module.exports = initAdminEvenementsRoutes;
