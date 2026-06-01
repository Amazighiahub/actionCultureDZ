const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');
const rateLimit = require('express-rate-limit');
const ContactService = require('../services/contact/contactService');
const emailService = require('../services/emailService');

const contactService = new ContactService(emailService);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Trop de messages envoyés. Réessayez dans 1 heure.' }
});

const initContactRoutes = () => {
  const router = express.Router();

  router.post('/',
    contactLimiter,
    [
      body('email').isEmail().withMessage('Email invalide'),
      body('message').isLength({ min: 10, max: 2000 }).withMessage('Message requis (10-2000 caractères)'),
      body('nom').optional().isLength({ max: 100 }),
      body('prenom').optional().isLength({ max: 100 }),
      body('sujet').optional().isLength({ max: 200 })
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const result = await contactService.sendContactMessage(req.body);
        if (result.success) {
          res.json({ success: true, message: 'Message envoyé avec succès' });
        } else {
          res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi' });
        }
      } catch (error) {
        const logger = require('../utils/logger');
        logger.error('Erreur contact:', error.message);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  return router;
};

module.exports = initContactRoutes;
