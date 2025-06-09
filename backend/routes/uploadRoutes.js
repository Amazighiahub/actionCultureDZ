// routes/uploadRoutes.js - Version simplifiée pour commencer

const express = require('express');
const router = express.Router();
const uploadService = require('../services/uploadService');
const createAuthMiddleware = require('../middlewares/authMiddleware');

const initUploadRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);

  console.log('🔧 Initialisation des routes upload...');

  // ✅ ROUTE DE TEST : Vérifier que les routes upload fonctionnent
  router.get('/', (req, res) => {
    res.json({
      message: 'Routes upload actives',
      routes: [
        'GET /api/upload/ - Cette route',
        'POST /api/upload/image/public - Upload public pour inscription',
        'POST /api/upload/image - Upload avec authentification'
      ],
      config: {
        images_dir: process.env.UPLOAD_IMAGES_DIR || 'uploads/images',
        max_size: '10MB'
      }
    });
  });

  // ✅ ROUTE PUBLIQUE : Upload sans authentification (pour inscription)
  router.post('/image/public', (req, res) => {
    console.log('📤 Route /image/public appelée');
    console.log('📋 Headers:', req.headers);
    console.log('📋 Body keys:', Object.keys(req.body || {}));
    
    // Utiliser le middleware d'upload
    const upload = uploadService.uploadImage().single('image');
    
    upload(req, res, (err) => {
      if (err) {
        console.error('❌ Erreur middleware upload:', err);
        return res.status(400).json({
          success: false,
          error: `Erreur upload: ${err.message}`
        });
      }

      console.log('📁 Fichier reçu:', req.file ? 'OUI' : 'NON');
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucune image fournie'
        });
      }

      // Générer l'URL complète
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
      
      console.log('✅ Upload réussi:');
      console.log('  📁 Fichier:', req.file.filename);
      console.log('  📁 Chemin:', req.file.path);
      console.log('  🔗 URL:', fileUrl);

      res.json({
        success: true,
        message: 'Image uploadée avec succès',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          size: req.file.size,
          path: req.file.path
        }
      });
    });
  });

  // ✅ ROUTE AVEC AUTH : Upload pour utilisateurs connectés
  router.post('/image', 
    authMiddleware.authenticate,
    (req, res) => {
      console.log('📤 Route /image (avec auth) appelée');
      console.log('👤 Utilisateur:', req.user?.email);
      
      const upload = uploadService.uploadImage().single('image');
      
      upload(req, res, (err) => {
        if (err) {
          console.error('❌ Erreur middleware upload:', err);
          return res.status(400).json({
            success: false,
            error: `Erreur upload: ${err.message}`
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'Aucune image fournie'
          });
        }

        // Générer l'URL complète
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
        
        console.log('✅ Upload réussi (avec auth):', fileUrl);

        res.json({
          success: true,
          message: 'Image uploadée avec succès',
          data: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: fileUrl,
            size: req.file.size,
            path: req.file.path
          }
        });
      });
    }
  );

  console.log('✅ Routes upload initialisées');
  console.log('  📍 GET /api/upload/');
  console.log('  📍 POST /api/upload/image/public');
  console.log('  📍 POST /api/upload/image');

  return router;
};

module.exports = initUploadRoutes;