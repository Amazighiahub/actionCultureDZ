// controllers/EvenementController.js - VERSION i18n
const { Op } = require('sequelize');
const uploadService = require('../services/uploadService');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

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

  // ⚡ Recherche multilingue dans les champs JSON
  const buildMultiLangSearch = (field, search) => {
    return [
      sequelize.where(
        sequelize.fn('JSON_EXTRACT', sequelize.col(field), '$.fr'),
        { [Op.like]: `%${search}%` }
      ),
      sequelize.where(
        sequelize.fn('JSON_EXTRACT', sequelize.col(field), '$.ar'),
        { [Op.like]: `%${search}%` }
      ),
      sequelize.where(
        sequelize.fn('JSON_EXTRACT', sequelize.col(field), '$.en'),
        { [Op.like]: `%${search}%` }
      )
    ];
  };

  const uploadMiddleware = uploadService.uploadImage().single('image');

  // GET /evenements
  const getAllEvenements = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 10, search, wilaya, type, upcoming, past, sort = 'date_debut' } = req.query;
      const offset = (page - 1) * limit;
      const where = {};

      // ⚡ Recherche multilingue
      if (search) {
        where[Op.or] = [
          ...buildMultiLangSearch('nom_evenement', search),
          ...buildMultiLangSearch('description', search)
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
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM evenementusers AS eu
                WHERE eu.id_evenement = Evenement.id_evenement
              )`),
              'nombre_inscrits'
            ],
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM evenementusers AS eu
                WHERE eu.id_evenement = Evenement.id_evenement
                AND eu.statut_participation IN ('confirme', 'present')
              )`),
              'participants_count'
            ]
          ]
        },
        order: [[ 'date_debut', sort === '-date_debut' ? 'DESC' : 'ASC' ]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      const eventsWithComplet = rows.map(event => {
        const eventData = event.toJSON();
        eventData.nombre_inscrits = parseInt(eventData.nombre_inscrits) || 0;
        eventData.participants_count = parseInt(eventData.participants_count) || 0;
        eventData.est_complet = !!(eventData.capacite_max && 
                                 eventData.nombre_inscrits >= eventData.capacite_max);
        delete eventData.nombre_participants;
        delete eventData.note_moyenne;
        return eventData;
      });

      // ⚡ Traduire les résultats
      res.json({
        success: true,
        data: translateDeep(eventsWithComplet, lang),
        pagination: { 
          total: count, 
          page: parseInt(page), 
          pages: Math.ceil(count / limit), 
          limit: parseInt(limit) 
        },
        lang
      });
    } catch (error) {
      console.error('Erreur getAllEvenements:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur lors de la récupération des événements', 
        details: error.message 
      });
    }
  };

  // GET /evenements/upcoming
  const getEvenementsAvenir = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      const where = { date_debut: { [Op.gte]: new Date() } };
      const include = [];
      if (Lieu) include.push({ model: Lieu, as: 'Lieu', required: false });
      if (TypeEvenement) include.push({ model: TypeEvenement, as: 'TypeEvenement', required: false });

      const { count, rows } = await Evenement.findAndCountAll({ where, include, order: [['date_debut','ASC']], limit: parseInt(limit), offset: parseInt(offset), distinct: true });
      
      // ⚡ Traduire
      res.json({ 
        success: true, 
        data: translateDeep(rows, lang), 
        pagination: { total: count, page: parseInt(page), pages: Math.ceil(count/limit) },
        lang
      });
    } catch (error) {
      console.error('Erreur getEvenementsAvenir:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des événements à venir', details: error.message });
    }
  };

  // GET /evenements/:id
  const getEvenementById = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
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
      
      // ⚡ Traduire
      res.json({ 
        success: true, 
        data: translateDeep(data, lang),
        lang
      });
    } catch (error) {
      console.error('Erreur getEvenementById:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'événement', details: error.message });
    }
  };

  // GET /evenements/:id/share-data
  const getSocialShareData = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      
      // ⚡ Traduire le nom et la description
      const translated = translate(evenement, lang);
      res.json({ 
        success: true, 
        data: { 
          title: translated.nom_evenement, 
          description: translated.description || '', 
          url: `https://actionculture.dz/evenements/${id}` 
        } 
      });
    } catch (error) {
      console.error('Erreur getSocialShareData:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // GET /evenements/:id/medias
  const getMedias = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      if (!Media) return res.json({ success: true, data: [] });
      const medias = await Media.findAll({ where: { id_evenement: id }, order: [['ordre','ASC']] });
      res.json({ success: true, data: translateDeep(medias, lang) });
    } catch (error) {
      console.error('Erreur getMedias:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des médias', details: error.message });
    }
  };

  // GET /evenements/:id/export
  const exportProgramme = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      res.json({ success: true, data: translateDeep(evenement, lang) });
    } catch (error) {
      console.error('Erreur exportProgramme:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // ⚡ Préparer un champ multilingue
  const prepareMultiLangField = (value, lang = 'fr') => {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  };

  // POST /evenements
  const createEvenement = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { 
        nom_evenement, 
        description, 
        accessibilite,
        date_debut, 
        date_fin, 
        id_lieu, 
        id_type_evenement,
        capacite_max,
        prix_entree,
        image_url 
      } = req.body;

      // ⚡ Préparer les champs multilingues
      const nomMultiLang = prepareMultiLangField(nom_evenement, lang);
      const descriptionMultiLang = prepareMultiLangField(description, lang);
      const accessibiliteMultiLang = prepareMultiLangField(accessibilite, lang);

      const evenement = await Evenement.create({
        nom_evenement: nomMultiLang,
        description: descriptionMultiLang,
        accessibilite: accessibiliteMultiLang,
        date_debut,
        date_fin,
        id_lieu,
        id_type_evenement,
        capacite_max,
        prix_entree,
        image_url,
        id_organisateur: req.user.id_user,
        statut: 'brouillon'
      }, { transaction });

      // Créer l'inscription de l'organisateur
      if (EvenementUser) {
        await EvenementUser.create({
          id_evenement: evenement.id_evenement,
          id_user: req.user.id_user,
          statut_participation: 'confirme',
          role_participation: 'organisateur',
          date_inscription: new Date()
        }, { transaction });
      }

      await transaction.commit();
      
      // ⚡ Traduire la réponse
      res.status(201).json({ 
        success: true, 
        data: translate(evenement, lang), 
        message: 'Événement créé avec succès' 
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur createEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la création', details: error.message });
    }
  };

  // PUT /evenements/:id
  const updateEvenement = async (req, res) => {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });

      const { nom_evenement, description, accessibilite, ...otherFields } = req.body;
      const updates = { ...otherFields };

      // ⚡ Gérer les champs multilingues
      if (nom_evenement !== undefined) {
        if (typeof nom_evenement === 'object') {
          updates.nom_evenement = mergeTranslations(evenement.nom_evenement, nom_evenement);
        } else {
          updates.nom_evenement = mergeTranslations(evenement.nom_evenement, { [lang]: nom_evenement });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object') {
          updates.description = mergeTranslations(evenement.description, description);
        } else {
          updates.description = mergeTranslations(evenement.description, { [lang]: description });
        }
      }

      if (accessibilite !== undefined) {
        if (typeof accessibilite === 'object') {
          updates.accessibilite = mergeTranslations(evenement.accessibilite, accessibilite);
        } else {
          updates.accessibilite = mergeTranslations(evenement.accessibilite, { [lang]: accessibilite });
        }
      }

      await evenement.update(updates);
      res.json({ 
        success: true, 
        data: translate(evenement, lang), 
        message: 'Événement mis à jour' 
      });
    } catch (error) {
      console.error('Erreur updateEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour', details: error.message });
    }
  };

  // DELETE /evenements/:id
  const deleteEvenement = async (req, res) => {
    try {
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      await evenement.update({ statut: 'archive' });
      res.json({ success: true, message: 'Événement supprimé' });
    } catch (error) {
      console.error('Erreur deleteEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la suppression', details: error.message });
    }
  };

  // PUT /evenements/:id/cancel
  const cancelEvenement = async (req, res) => {
    try {
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id);
      if (!evenement) return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      await evenement.update({ statut: 'annule' });
      res.json({ success: true, message: 'Événement annulé' });
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
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const participants = await EvenementUser.findAll({ 
        where: { id_evenement: id }, 
        include: [{ model: User, as: 'User', attributes: ['id_user','nom','prenom','email'] }] 
      });
      // ⚡ Traduire
      res.json({ success: true, data: translateDeep(participants, lang) });
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

  // POST /evenements/:id/medias
  const addMedias = [
    uploadService.uploadImage().array('medias', 10),
    async (req, res) => {
      try {
        const lang = req.lang || 'fr';  // ⚡
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
            description: req.body.descriptions ? createMultiLang(req.body.descriptions[index], lang) : null,
            ordre: index + 2
          });
        });

        const createdMedias = await Promise.all(mediaPromises);
        res.status(201).json({ 
          success: true, 
          data: translateDeep(createdMedias, lang), 
          message: `${createdMedias.length} médias ajoutés avec succès` 
        });
      } catch (error) {
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
      res.json({ success: true, message: 'Notifications non disponibles' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // ⚡ Récupérer toutes les traductions d'un événement (admin)
  const getEvenementTranslations = async (req, res) => {
    try {
      const { id } = req.params;
      const evenement = await Evenement.findByPk(id, {
        attributes: ['id_evenement', 'nom_evenement', 'description', 'accessibilite']
      });

      if (!evenement) {
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      res.json({
        success: true,
        data: {
          id_evenement: evenement.id_evenement,
          nom_evenement: evenement.nom_evenement,
          description: evenement.description,
          accessibilite: evenement.accessibilite
        }
      });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  };

  // ⚡ Mettre à jour une traduction spécifique (admin)
  const updateEvenementTranslation = async (req, res) => {
    try {
      const { id, lang } = req.params;
      const { nom_evenement, description, accessibilite } = req.body;

      const evenement = await Evenement.findByPk(id);
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
      res.json({ success: true, message: `Traduction ${lang} mise à jour`, data: evenement });
    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
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
    sendNotificationManuelle,
    getEvenementTranslations,      // ⚡ NOUVEAU
    updateEvenementTranslation     // ⚡ NOUVEAU
  };
};

module.exports = createEvenementController;
