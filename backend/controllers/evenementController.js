const { Op } = require('sequelize');
const uploadService = require('../services/uploadService');

// Factory function to create the controller with injected models
const createEvenementController = (models) => {
  const {
    Evenement,
    User,
    Lieu,
    TypeEvenement,
    EvenementUser,
    EvenementOeuvre,
    Media,
    Notification,
    Programme
  } = models;
  const sequelize = models.sequelize;

  // Middleware d'upload pour les routes qui en ont besoin
  const uploadMiddleware = uploadService.uploadImage().single('image');

  // ============= PUBLIC ENDPOINTS =============

  // GET /evenements
  const getAllEvenements = async (req, res) => {
    try {
      const { page = 1, limit = 10, search, wilaya, type, upcoming, past, sort = 'date_debut' } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      if (search) {
        where[Op.or] = [
          { nom_evenement: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }
      if (upcoming === 'true') where.date_debut = { [Op.gte]: new Date() };
      if (past === 'true') where.date_fin = { [Op.lt]: new Date() };
      if (type) where.id_type_evenement = type;

      const include = [];
      if (Lieu) {
        const loc = {
          model: Lieu,
          as: 'Lieu',
          attributes: ['id_lieu', 'nom', 'adresse'],
          required: false
        };
        if (wilaya && models.Wilaya) {
          loc.include = [{ model: models.Wilaya, as: 'Wilaya', where: { id_wilaya: wilaya }, required: true }];
        }
        include.push(loc);
      }
      if (TypeEvenement) include.push({ model: TypeEvenement, as: 'TypeEvenement', attributes: ['id_type_evenement', 'nom_type'], required: false });
      if (User) include.push({ model: User, as: 'Organisateur', attributes: ['id_user', 'nom', 'prenom'], required: false });

      const { count, rows } = await Evenement.findAndCountAll({
        where,
        include,
        order: [[ 'date_debut', sort === '-date_debut' ? 'DESC' : 'ASC' ]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit), limit: parseInt(limit) }
      });
    } catch (error) {
      console.error('Erreur getAllEvenements:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des événements', details: error.message });
    }
  };

  // GET /evenements/upcoming
  const getEvenementsAvenir = async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const where = { date_debut: { [Op.gte]: new Date() } };
      const include = [];
      if (Lieu) include.push({ model: Lieu, as: 'Lieu', required: false });
      if (TypeEvenement) include.push({ model: TypeEvenement, as: 'TypeEvenement', required: false });

      const { count, rows } = await Evenement.findAndCountAll({ where, include, order: [['date_debut','ASC']], limit: parseInt(limit), offset: parseInt(offset), distinct: true });
      res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count/limit) } });
    } catch (error) {
      console.error('Erreur getEvenementsAvenir:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des événements à venir', details: error.message });
    }
  };

  // GET /evenements/:id
  const getEvenementById = async (req, res) => {
    try {
      const { id } = req.params;
      const include = [
        Lieu && { model: Lieu, as: 'Lieu', required: false },
        TypeEvenement && { model: TypeEvenement, as: 'TypeEvenement', required: false },
        User && { model: User, as: 'Organisateur', attributes: ['id_user','nom','prenom','email'], required: false },
        Media && { model: Media, as: 'Medias', required: false }
      ].filter(Boolean);

      const evenement = await Evenement.findByPk(id, { include });
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });

      const data = evenement.toJSON();
      if (EvenementUser) {
        data.nombre_participants = await EvenementUser.count({ where: { id_evenement: id, statut_participation: 'confirme' } });
      }
      res.json({ success: true, data });
    } catch (error) {
      console.error('Erreur getEvenementById:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'événement', details: error.message });
    }
  };

  // GET /evenements/:id/share-data
  const getSocialShareData = async (req, res) => {
    try {
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      res.json({ success: true, data: { title: evenement.nom_evenement, description: evenement.description||'', url: `https://actionculture.dz/evenements/${id}` } });
    } catch (error) {
      console.error('Erreur getSocialShareData:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // GET /evenements/:id/medias
  const getMedias = async (req, res) => {
    try {
      const { id } = req.params;
      if (!Media) return res.json({ success: true, data: [] });
      const medias = await Media.findAll({ where: { id_evenement: id }, order: [['ordre','ASC']] });
      res.json({ success: true, data: medias });
    } catch (error) {
      console.error('Erreur getMedias:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des médias', details: error.message });
    }
  };

  // GET /evenements/:id/export
  const exportProgramme = async (req, res) => {
    try {
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      res.json({ success: true, data: evenement });
    } catch (error) {
      console.error('Erreur exportProgramme:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // ============= AUTHENTICATED ENDPOINTS =============

  // POST /evenements - Wrapper pour gérer l'upload avant la création
  const createEvenement = [
    uploadMiddleware,
    async (req, res) => {
      const transaction = await sequelize.transaction();
      
      try {
        console.log('📋 Création événement - Body:', req.body);
        console.log('📋 Fichier reçu:', req.file ? 'OUI' : 'NON');
        
        // Validation des données requises
        if (!req.body.nom_evenement || !req.body.id_lieu || !req.body.id_type_evenement) {
          // Si un fichier a été uploadé mais la validation échoue, le supprimer
          if (req.file) {
            await uploadService.deleteFile(req.file.path);
          }
          await transaction.rollback();
          return res.status(400).json({ 
            success: false, 
            error: 'Données manquantes: nom_evenement, id_lieu et id_type_evenement sont requis' 
          });
        }

        // Préparer les données de l'événement
        const evenementData = {
          ...req.body,
          id_user: req.user.id_user,
          statut: 'planifie'
        };

        // Si un fichier image a été uploadé, utiliser le service pour générer l'URL
        if (req.file) {
          evenementData.image_url = uploadService.getFileUrlFromPath(req.file.path);
          console.log('✅ Image uploadée:', evenementData.image_url);
        }

        // Créer l'événement
        const evenement = await Evenement.create(evenementData, { transaction });
        
        // Ajouter l'organisateur comme participant
      

        // Si une image a été uploadée, créer aussi une entrée dans Media
        if (req.file && Media) {
          await Media.create({
            id_evenement: evenement.id_evenement,
            type_media: 'image',
            url: evenementData.image_url,
            nom: req.file.originalname,
            description: 'Image principale de l\'événement',
            ordre: 1
          }, { transaction });
        }

        await transaction.commit();
        
        console.log('✅ Événement créé avec succès:', evenement.id_evenement);
        
        res.status(201).json({ 
          success: true, 
          data: evenement, 
          message: 'Événement créé avec succès' 
        });
        
      } catch (error) {
        await transaction.rollback();
        
        // Si l'upload a réussi mais la création a échoué, supprimer le fichier
        if (req.file) {
          await uploadService.deleteFile(req.file.path);
        }
        
        console.error('❌ Erreur createEvenement:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Erreur lors de la création de l\'événement', 
          details: error.message 
        });
      }
    }
  ];

  // PUT /evenements/:id - Wrapper pour gérer l'upload avant la mise à jour
  const updateEvenement = [
    uploadMiddleware,
    async (req, res) => {
      const transaction = await sequelize.transaction();
      let oldImagePath = null;
      
      try {
        const { id } = req.params;
        const evenement = await Evenement.findByPk(id);
        
        if (!evenement) { 
          if (req.file) {
            await uploadService.deleteFile(req.file.path);
          }
          await transaction.rollback(); 
          return res.status(404).json({ success: false, error: 'Événement non trouvé' }); 
        }
        
        if (evenement.id_user !== req.user.id_user && !req.user.isAdmin) { 
          if (req.file) {
            await uploadService.deleteFile(req.file.path);
          }
          await transaction.rollback(); 
          return res.status(403).json({ success: false, error: 'Non autorisé' }); 
        }

        // Préparer les données de mise à jour
        const updateData = { ...req.body };

        // Si une nouvelle image est uploadée
        if (req.file) {
          updateData.image_url = uploadService.getFileUrlFromPath(req.file.path);
          
          // Extraire le chemin de l'ancienne image pour la supprimer
          if (evenement.image_url) {
            const urlParts = evenement.image_url.split('/');
            const filename = urlParts[urlParts.length - 1];
            oldImagePath = `${uploadService.UPLOAD_IMAGES_DIR}/${filename}`;
          }
          
          console.log('✅ Nouvelle image uploadée:', updateData.image_url);
        }

        await evenement.update(updateData, { transaction });

        // Si une nouvelle image a été uploadée et qu'il y avait une ancienne, supprimer l'ancienne
        if (req.file && oldImagePath) {
          await uploadService.deleteFile(oldImagePath);
          console.log('🗑️ Ancienne image supprimée');
        }

        // Mettre à jour l'entrée Media si nécessaire
        if (req.file && Media) {
          const existingMedia = await Media.findOne({
            where: { 
              id_evenement: id,
              type_media: 'image',
              ordre: 1
            }
          });

          if (existingMedia) {
            await existingMedia.update({
              url: updateData.image_url,
              nom: req.file.originalname
            }, { transaction });
          } else {
            await Media.create({
              id_evenement: id,
              type_media: 'image',
              url: updateData.image_url,
              nom: req.file.originalname,
              description: 'Image principale de l\'événement',
              ordre: 1
            }, { transaction });
          }
        }

        await transaction.commit();
        res.json({ success: true, data: evenement, message: 'Événement mis à jour' });
        
      } catch (error) {
        await transaction.rollback();
        
        // Si le nouvel upload a réussi mais la mise à jour a échoué
        if (req.file) {
          await uploadService.deleteFile(req.file.path);
        }
        
        console.error('❌ Erreur updateEvenement:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Erreur lors de la mise à jour', 
          details: error.message 
        });
      }
    }
  ];

  // DELETE /evenements/:id
  const deleteEvenement = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) { await transaction.rollback(); return res.status(404).json({ success: false, error: 'Événement non trouvé' }); }
      if (evenement.id_user !== req.user.id_user && !req.user.isAdmin) { await transaction.rollback(); return res.status(403).json({ success: false, error: 'Non autorisé' }); }
      
      // Supprimer l'image si elle existe
      if (evenement.image_url) {
        try {
          const urlParts = evenement.image_url.split('/');
          const filename = urlParts[urlParts.length - 1];
          const imagePath = `${uploadService.UPLOAD_IMAGES_DIR}/${filename}`;
          
          await uploadService.deleteFile(imagePath);
        } catch (err) {
          console.error('⚠️ Erreur suppression image:', err.message);
        }
      }
      
      await evenement.destroy({ transaction });
      await transaction.commit();
      res.json({ success: true, message: 'Événement supprimé' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur deleteEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la suppression', details: error.message });
    }
  };

  // PATCH /evenements/:id/cancel
  const cancelEvenement = async (req, res) => {
    try {
      const { id } = req.params;
      const { raison_annulation } = req.body;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      await evenement.update({ statut: 'annule', raison_annulation });
      res.json({ success: true, data: evenement, message: 'Événement annulé' });
    } catch (error) {
      console.error('Erreur cancelEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de l\'annulation', details: error.message });
    }
  };

  // POST /evenements/:id/inscription
  const inscrireUtilisateur = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = req.user.id_user;
      const exist = await EvenementUser.findOne({ where: { id_evenement: id, id_user: userId } });
      if (exist) { 
        await transaction.rollback(); 
        return res.status(400).json({ success: false, error: 'Déjà inscrit' }); 
      }
      const inscription = await EvenementUser.create({ 
        id_evenement: id, 
        id_user: userId, 
        statut_participation: 'confirme', 
        role_participation: 'participant', 
        date_inscription: new Date() 
      }, { transaction });
      await transaction.commit();
      res.status(201).json({ success: true, data: inscription, message: 'Inscription confirmée' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur inscrireUtilisateur:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de l\'inscription', details: error.message });
    }
  };

  // DELETE /evenements/:id/inscription
  const desinscrireUtilisateur = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id_user;
      const count = await EvenementUser.destroy({ 
        where: { 
          id_evenement: id, 
          id_user: userId, 
          role_participation: { [Op.ne]: 'organisateur' } 
        } 
      });
      if (!count) {
        return res.status(404).json({ success: false, error: 'Inscription non trouvée' });
      }
      res.json({ success: true, message: 'Désinscription effectuée' });
    } catch (error) {
      console.error('Erreur desinscrireUtilisateur:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la désinscription', details: error.message });
    }
  };

  // GET /evenements/:id/participants
  const getParticipants = async (req, res) => {
    try {
      const { id } = req.params;
      const participants = await EvenementUser.findAll({ where: { id_evenement: id }, include: [{ model: User, as: 'User', attributes: ['id_user','nom','prenom','email'] }] });
      res.json({ success: true, data: participants });
    } catch (error) {
      console.error('Erreur getParticipants:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des participants', details: error.message });
    }
  };

  // PATCH /evenements/:id/participants/:userId/validate
  const validateParticipation = async (req, res) => {
    try {
      const { id, userId } = req.params;
      const { statut_participation } = req.body;
      const inscription = await EvenementUser.findOne({ where: { id_evenement: id, id_user: userId } });
      if (!inscription) return res.status(404).json({ success: false, error: 'Inscription non trouvée' });
      const status = statut_participation === 'accepter' ? 'confirme' : 'refuse';
      await inscription.update({ statut_participation: status, date_validation: new Date() });
      res.json({ success: true, data: inscription, message: 'Participation validée' });
    } catch (error) {
      console.error('Erreur validateParticipation:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la validation', details: error.message });
    }
  };

  // POST /evenements/:id/medias - Wrapper pour gérer l'upload de médias multiples
  const addMedias = [
    uploadService.uploadImage().array('medias', 10), // Maximum 10 images
    async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ success: false, error: 'Aucun média fourni' });
        }

        const mediaPromises = req.files.map((file, index) => {
          const mediaUrl = uploadService.getFileUrlFromPath(file.path);
          return Media.create({
            id_evenement: id,
            type_media: 'image',
            url: mediaUrl,
            nom: file.originalname,
            description: req.body.descriptions ? req.body.descriptions[index] : null,
            ordre: index + 2 // Commence à 2 car 1 est réservé pour l'image principale
          });
        });

        const createdMedias = await Promise.all(mediaPromises);
        res.status(201).json({ 
          success: true, 
          data: createdMedias, 
          message: `${createdMedias.length} médias ajoutés avec succès` 
        });
      } catch (error) {
        // En cas d'erreur, supprimer les fichiers uploadés
        if (req.files) {
          req.files.forEach(file => uploadService.deleteFile(file.path));
        }
        console.error('Erreur addMedias:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout des médias', details: error.message });
      }
    }
  ];

  // DELETE /evenements/:id/medias/:mediaId
  const deleteMedia = async (req, res) => {
    try {
      const { id, mediaId } = req.params;
      
      const media = await Media.findOne({ where: { id_media: mediaId, id_evenement: id } });
      if (!media) return res.status(404).json({ success: false, error: 'Média non trouvé' });

      // Extraire le chemin du fichier et le supprimer
      if (media.url) {
        const urlParts = media.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const filePath = `${uploadService.UPLOAD_IMAGES_DIR}/${filename}`;
        await uploadService.deleteFile(filePath);
      }

      await media.destroy();
      res.json({ success: true, message: 'Média supprimé' });
    } catch (error) {
      console.error('Erreur deleteMedia:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la suppression', details: error.message });
    }
  };

  // GET /evenements/:id/mes-oeuvres
  const getMesOeuvresEvenement = async (req, res) => {
    try {
      // To implement: fetch oeuvres liées à l'événement et disponibles pour pro
      res.json({ success: true, data: { oeuvres_ajoutees: [], oeuvres_disponibles: [] } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // POST /evenements/:id/oeuvres
  const addOeuvreProfessionnel = async (req, res) => {
    try {
      res.status(201).json({ success: true, message: 'Fonctionnalité en développement' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // DELETE /evenements/:id/oeuvres/:oeuvreId
  const removeOeuvreProfessionnel = async (req, res) => {
    try {
      res.json({ success: true, message: 'Fonctionnalité en développement' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // POST /evenements/:id/notification
  const sendNotificationManuelle = async (req, res) => {
    try {
      // To implement: send notifications based on body message, sujet, participants
      res.json({ success: true, message: 'Notifications non disponibles' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  return {
    getAllEvenements,
    getEvenementsAvenir,
    getEvenementById,
    getSocialShareData,
    getMedias,
    exportProgramme,
    createEvenement,
    updateEvenement,
    deleteEvenement,
    cancelEvenement,
    inscrireUtilisateur,
    desinscrireUtilisateur,
    getParticipants,
    validateParticipation,
    addMedias,
    deleteMedia,
    getMesOeuvresEvenement,
    addOeuvreProfessionnel,
    removeOeuvreProfessionnel,
    sendNotificationManuelle
  };
};

module.exports = createEvenementController;