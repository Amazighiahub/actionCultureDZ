// routes/multilingualRoutes.js
// Routes pour les opérations multilingues

const express = require('express');
const router = express.Router();
const MultilingualController = require('../controllers/MultilingualController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const { body, param } = require('express-validator');
const { validateLanguage } = require('../middlewares/language');

const initMultilingualRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const multilingualController = new MultilingualController(models);

  // ========================================================================
  // VALIDATIONS
  // ========================================================================

  const getTranslationsValidation = [
    param('model').isIn(['Oeuvre', 'Evenement', 'Programme', 'Lieu', 'Artisanat']),
    param('id').isInt(),
    param('field').isIn(['titre', 'description', 'nom', 'nom_evenement', 'adresse', 'lieu_specifique'])
  ];

  const updateTranslationsValidation = [
    param('model').isIn(['Oeuvre', 'Evenement', 'Programme', 'Lieu', 'Artisanat']),
    param('id').isInt(),
    param('field').isIn(['titre', 'description', 'nom', 'nom_evenement', 'adresse', 'lieu_specifique']),
    body('translations').isObject().withMessage('Les traductions doivent être un objet')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES
  // ========================================================================

  /**
   * GET /api/multilingual/languages
   * Obtenir toutes les langues supportées
   */
  router.get('/languages', multilingualController.getSupportedLanguages.bind(multilingualController));

  /**
   * GET /api/multilingual/:model/:id/:field
   * Obtenir les traductions d'un champ spécifique
   * Query params: ?language=fr
   */
  router.get('/:model/:id/:field', 
    getTranslationsValidation,
    multilingualController.getTranslations.bind(multilingualController)
  );

  // ========================================================================
  // ROUTES PROTÉGÉES (nécessitent authentification)
  // ========================================================================

  /**
   * PUT /api/multilingual/:model/:id/:field
   * Mettre à jour les traductions d'un champ
   * Body: { translations: { fr: "...", ar: "...", en: "...", "tz-ltn": "...", "tz-tfng": "..." } }
   */
  router.put('/:model/:id/:field',
    authMiddleware.authenticate,
    updateTranslationsValidation,
    multilingualController.updateTranslations.bind(multilingualController)
  );

  // ========================================================================
  // ROUTES PAR LANGUE (optionnel)
  // ========================================================================

  /**
   * GET /api/multilingual/:lang/oeuvres
   * Obtenir les œuvres avec traductions dans une langue spécifique
   */
  router.get('/:lang/oeuvres', 
    validateLanguage,
    async (req, res) => {
      try {
        const { lang } = req.targetLanguage;
        const { Oeuvre } = models;

        const oeuvres = await Oeuvre.findAll({
          attributes: [
            'id_oeuvre',
            ['titre', 'titre_multilingue'],
            ['description', 'description_multilingue'],
            'date_creation',
            'statut'
          ],
          where: { statut: 'publie' }
        });

        // Transformer les résultats pour extraire la traduction
        const translatedOeuvres = oeuvres.map(oeuvre => ({
          ...oeuvre.toJSON(),
          titre: multilingualController.extractTranslation(oeuvre.titre_multilingue, lang),
          description: multilingualController.extractTranslation(oeuvre.description_multilingue, lang)
        }));

        res.json({
          success: true,
          data: translatedOeuvres,
          language: lang
        });
      } catch (error) {
        console.error('Erreur getOeuvresByLanguage:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  /**
   * GET /api/multilingual/:lang/evenements
   * Obtenir les événements avec traductions dans une langue spécifique
   */
  router.get('/:lang/evenements', 
    validateLanguage,
    async (req, res) => {
      try {
        const { lang } = req.targetLanguage;
        const { Evenement } = models;

        const evenements = await Evenement.findAll({
          attributes: [
            'id_evenement',
            ['nom_evenement', 'nom_multilingue'],
            ['description', 'description_multilingue'],
            'date_debut',
            'date_fin',
            'statut'
          ],
          where: { statut: 'publie' }
        });

        // Transformer les résultats
        const translatedEvenements = evenements.map(evenement => ({
          ...evenement.toJSON(),
          nom_evenement: multilingualController.extractTranslation(evenement.nom_multilingue, lang),
          description: multilingualController.extractTranslation(evenement.description_multilingue, lang)
        }));

        res.json({
          success: true,
          data: translatedEvenements,
          language: lang
        });
      } catch (error) {
        console.error('Erreur getEvenementsByLanguage:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  /**
   * GET /api/multilingual/:lang/programmes
   * Obtenir les programmes avec traductions dans une langue spécifique
   */
  router.get('/:lang/programmes', 
    validateLanguage,
    async (req, res) => {
      try {
        const { lang } = req.targetLanguage;
        const { Programme } = models;

        const programmes = await Programme.findAll({
          attributes: [
            'id_programme',
            ['titre', 'titre_multilingue'],
            ['description', 'description_multilingue'],
            'date_programme',
            'heure_debut',
            'heure_fin',
            'statut',
            'type_activite'
          ],
          where: { statut: 'planifie' },
          order: [['date_programme', 'ASC'], ['heure_debut', 'ASC']]
        });

        // Transformer les résultats
        const translatedProgrammes = programmes.map(programme => ({
          ...programme.toJSON(),
          titre: multilingualController.extractTranslation(programme.titre_multilingue, lang),
          description: multilingualController.extractTranslation(programme.description_multilingue, lang)
        }));

        res.json({
          success: true,
          data: translatedProgrammes,
          language: lang
        });
      } catch (error) {
        console.error('Erreur getProgrammesByLanguage:', error);
        res.status(500).json({
          success: false,
          error: 'Erreur serveur'
        });
      }
    }
  );

  return router;
};

module.exports = initMultilingualRoutes;
