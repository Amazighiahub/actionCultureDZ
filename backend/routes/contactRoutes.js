/**
 * Routes pour le formulaire de contact
 */
const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');
const rateLimit = require('express-rate-limit');

const initContactRoutes = () => {
  const router = express.Router();

  // Rate limit: 5 messages par heure par IP
  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Trop de messages envoyés. Réessayez dans 1 heure.' }
  });

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
        const { prenom, nom, email, sujet, message } = req.body;
        const emailService = require('../services/emailService');

        const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'contact@taladz.com';

        const html = `
          <h2>Nouveau message de contact — Tala DZ</h2>
          <p><strong>De :</strong> ${prenom || ''} ${nom || ''}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Sujet :</strong> ${sujet || 'Sans sujet'}</p>
          <hr/>
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `;

        const result = await emailService.sendEmail(
          contactEmail,
          `[Contact Tala DZ] ${sujet || 'Nouveau message'}`,
          html
        );

        if (result.success) {
          res.json({ success: true, message: 'Message envoyé avec succès' });
        } else {
          res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi' });
        }
      } catch (error) {
        console.error('Erreur contact:', error.message);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
      }
    }
  );

  return router;
};

module.exports = initContactRoutes;
