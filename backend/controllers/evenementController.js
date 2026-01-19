// controllers/EvenementController.js - VERSION i18n
const { Op } = require('sequelize');
const uploadService = require('../services/uploadService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

// ✅ OPTIMISATION: Import de l'utilitaire de recherche multilingue centralisé
const { buildMultiLangSearch: buildMultiLangSearchUtil } = require('../utils/MultiLangSearchBuilder');

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
    Programme,
    Oeuvre,
    TypeOeuvre
  } = models;
  const sequelize = models.sequelize;

  // ⚡ Recherche multilingue - utilise l'utilitaire centralisé
  const buildMultiLangSearch = (field, search) => {
    return buildMultiLangSearchUtil(sequelize, field, search);
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
          attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude'],
          required: false
        };
        // Lieu -> Commune -> Daira -> Wilaya (pas d'association directe Lieu -> Wilaya)
        if (wilaya && models.Commune) {
          loc.include = [{
            model: models.Commune,
            required: true,
            include: [{
              model: models.Daira,
              required: true,
              include: [{
                model: models.Wilaya,
                where: { id_wilaya: wilaya },
                required: true
              }]
            }]
          }];
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
      
      // Calculer manuellement les champs VIRTUAL (les getters async ne fonctionnent pas avec toJSON)
      if (EvenementUser) {
        // Compter tous les inscrits (tous statuts sauf annulé)
        const nombreInscrits = await EvenementUser.count({ 
          where: { 
            id_evenement: id, 
            statut_participation: { [Op.ne]: 'annule' } 
          } 
        });
        // Compter les participants confirmés/présents
        const nombreParticipants = await EvenementUser.count({ 
          where: { 
            id_evenement: id, 
            statut_participation: { [Op.in]: ['confirme', 'present'] } 
          } 
        });
        // Écraser les champs VIRTUAL avec les vraies valeurs
        data.nombre_inscrits = nombreInscrits;
        data.nombre_participants = nombreParticipants;
        data.est_complet = !!(data.capacite_max && nombreInscrits >= data.capacite_max);
      } else {
        data.nombre_inscrits = 0;
        data.nombre_participants = 0;
        data.est_complet = false;
      }
      
      // Nettoyer les champs VIRTUAL mal résolus (objets vides)
      if (typeof data.note_moyenne === 'object') data.note_moyenne = null;
      
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
  // Body optionnel: { oeuvres: [id_oeuvre1, id_oeuvre2, ...], notes: "..." }
  const inscrireUtilisateur = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = req.user.id_user;
      const { oeuvres = [], notes = '' } = req.body;

      // Vérifier si déjà inscrit
      const exist = await EvenementUser.findOne({ where: { id_evenement: id, id_user: userId } });
      if (exist) { 
        await transaction.rollback(); 
        return res.status(400).json({ success: false, error: 'Déjà inscrit à cet événement' }); 
      }

      // Récupérer l'événement avec son type
      const evenement = await Evenement.findByPk(id, {
        include: [{ model: TypeEvenement, as: 'TypeEvenement' }]
      });
      
      if (!evenement) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      // Vérifier si l'événement est complet
      if (evenement.capacite_max) {
        const nombreInscrits = await EvenementUser.count({ 
          where: { id_evenement: id, statut_participation: { [Op.ne]: 'annule' } } 
        });
        if (nombreInscrits >= evenement.capacite_max) {
          await transaction.rollback();
          return res.status(400).json({ success: false, error: 'Événement complet' });
        }
      }

      // Vérifier la date limite d'inscription
      if (evenement.date_limite_inscription && new Date() > new Date(evenement.date_limite_inscription)) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: 'Date limite d\'inscription dépassée' });
      }

      // Vérifier la configuration de soumission du type d'événement
      const typeEvenement = evenement.TypeEvenement;
      const configSoumission = typeEvenement?.config_soumission;
      const accepteSoumissions = typeEvenement?.accepte_soumissions;

      // Si le type d'événement requiert des soumissions
      if (accepteSoumissions && configSoumission?.requis && (!oeuvres || oeuvres.length === 0)) {
        await transaction.rollback();
        const label = configSoumission.label?.fr || 'Œuvres';
        return res.status(400).json({ 
          success: false, 
          error: `Ce type d'événement requiert la soumission d'œuvres`,
          message: `Veuillez soumettre vos ${label.toLowerCase()}`,
          config_soumission: configSoumission
        });
      }

      // Vérifier le nombre max de soumissions
      if (accepteSoumissions && configSoumission?.max_soumissions && oeuvres.length > configSoumission.max_soumissions) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false, 
          error: `Nombre maximum de soumissions dépassé (max: ${configSoumission.max_soumissions})` 
        });
      }

      // Créer l'inscription
      const inscription = await EvenementUser.create({ 
        id_evenement: id, 
        id_user: userId, 
        statut_participation: accepteSoumissions && configSoumission?.requis ? 'inscrit' : 'confirme',
        role_participation: 'participant', 
        date_inscription: new Date(),
        notes: notes || null
      }, { transaction });

      // Si des œuvres sont soumises, les lier à l'événement
      const oeuvresSoumises = [];
      if (accepteSoumissions && oeuvres && oeuvres.length > 0 && EvenementOeuvre) {
        // Vérifier que les œuvres appartiennent à l'utilisateur
        const Oeuvre = models.Oeuvre;
        if (Oeuvre) {
          for (const idOeuvre of oeuvres) {
            const oeuvre = await Oeuvre.findOne({ 
              where: { id_oeuvre: idOeuvre, id_user: userId } 
            });
            
            if (!oeuvre) {
              await transaction.rollback();
              return res.status(400).json({ 
                success: false, 
                error: `L'œuvre ${idOeuvre} n'existe pas ou ne vous appartient pas` 
              });
            }

            // Vérifier le type d'œuvre si configuré
            if (configSoumission?.type_oeuvre && configSoumission.type_oeuvre.length > 0) {
              const typeOeuvre = await oeuvre.getTypeOeuvre?.();
              const nomType = typeOeuvre?.nom_type?.fr?.toLowerCase() || '';
              const typesAcceptes = configSoumission.type_oeuvre.map(t => t.toLowerCase());
              
              // Vérification souple du type
              const typeValide = typesAcceptes.some(t => 
                nomType.includes(t) || t.includes(nomType)
              );
              
              if (!typeValide && configSoumission.type_oeuvre.length > 0) {
                console.warn(`Type d'œuvre "${nomType}" non strictement validé pour les types acceptés: ${typesAcceptes.join(', ')}`);
              }
            }

            // Créer le lien événement-œuvre
            const lien = await EvenementOeuvre.create({
              id_evenement: id,
              id_oeuvre: idOeuvre,
              id_presentateur: userId,
              ordre_presentation: oeuvresSoumises.length + 1
            }, { transaction });

            oeuvresSoumises.push({ id_oeuvre: idOeuvre, lien });
          }
        }
      }

      await transaction.commit();

      // ===== ENVOI DES NOTIFICATIONS =====
      // Récupérer les informations complètes pour les notifications
      const user = await User.findByPk(userId, {
        attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone']
      });

      const eventWithLieu = await Evenement.findByPk(id, {
        include: [
          { model: Lieu, as: 'Lieu', required: false },
          { model: TypeEvenement, as: 'TypeEvenement', required: false }
        ]
      });

      // Préparer les données de l'événement pour les notifications
      const nomEvenement = translate(eventWithLieu.nom_evenement, 'fr');
      const dateDebut = eventWithLieu.date_debut
        ? new Date(eventWithLieu.date_debut).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      const dateFin = eventWithLieu.date_fin && eventWithLieu.date_fin !== eventWithLieu.date_debut
        ? new Date(eventWithLieu.date_fin).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : null;
      const heureDebut = eventWithLieu.heure_debut || '';
      const lieuNom = eventWithLieu.Lieu ? translate(eventWithLieu.Lieu.nom, 'fr') : '';
      const adresse = eventWithLieu.Lieu?.adresse || '';
      const typeNom = eventWithLieu.TypeEvenement ? translate(eventWithLieu.TypeEvenement.nom_type, 'fr') : '';

      // Récupérer les titres des œuvres soumises pour l'email
      let oeuvresDetails = [];
      if (oeuvresSoumises.length > 0) {
        const Oeuvre = models.Oeuvre;
        if (Oeuvre) {
          const oeuvresData = await Oeuvre.findAll({
            where: { id_oeuvre: oeuvresSoumises.map(o => o.id_oeuvre) },
            attributes: ['id_oeuvre', 'titre']
          });
          oeuvresDetails = oeuvresData.map(o => ({ titre: translate(o.titre, 'fr') }));
        }
      }

      // Générer une référence unique pour l'inscription
      const reference = `EVT-${id}-${userId}-${Date.now().toString(36).toUpperCase()}`;

      // Envoi de l'email de confirmation (asynchrone, non bloquant)
      if (user?.email) {
        emailService.sendEventRegistrationConfirmation({
          email: user.email,
          prenom: user.prenom,
          nomEvenement,
          dateDebut,
          dateFin,
          heureDebut,
          lieu: lieuNom,
          adresse,
          typeEvenement: typeNom,
          nombrePersonnes: 1,
          reference,
          oeuvresSoumises: oeuvresDetails.length > 0 ? oeuvresDetails : null,
          eventUrl: `${process.env.FRONTEND_URL}/evenements/${id}`,
          contactEmail: eventWithLieu.contact_email,
          contactTelephone: eventWithLieu.contact_telephone
        }).catch(err => console.error('Erreur envoi email confirmation:', err));
      }

      // Envoi du SMS de confirmation (asynchrone, non bloquant)
      if (user?.telephone) {
        smsService.sendEventRegistrationConfirmation({
          telephone: user.telephone,
          prenom: user.prenom,
          nomEvenement,
          dateEvenement: dateDebut,
          lieu: lieuNom,
          reference
        }).catch(err => console.error('Erreur envoi SMS confirmation:', err));
      }

      res.status(201).json({
        success: true,
        data: {
          inscription,
          oeuvres_soumises: oeuvresSoumises.length,
          type_evenement: typeEvenement?.nom_type,
          accepte_soumissions: accepteSoumissions,
          reference
        },
        message: accepteSoumissions && oeuvresSoumises.length > 0
          ? `Inscription confirmée avec ${oeuvresSoumises.length} œuvre(s) soumise(s)`
          : 'Inscription confirmée'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur inscrireUtilisateur:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de l\'inscription', details: error.message });
    }
  };

  // GET /evenements/:id/config-inscription
  // Retourne la configuration du formulaire d'inscription selon le type d'événement
  const getConfigInscription = async (req, res) => {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const evenement = await Evenement.findByPk(id, {
        include: [{ model: TypeEvenement, as: 'TypeEvenement' }]
      });

      if (!evenement) {
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      const typeEvenement = evenement.TypeEvenement;
      const configSoumission = typeEvenement?.config_soumission;
      const accepteSoumissions = typeEvenement?.accepte_soumissions || false;

      // Calculer les places disponibles
      let placesDisponibles = null;
      if (evenement.capacite_max) {
        const nombreInscrits = await EvenementUser.count({ 
          where: { id_evenement: id, statut_participation: { [Op.ne]: 'annule' } } 
        });
        placesDisponibles = evenement.capacite_max - nombreInscrits;
      }

      // Vérifier si l'utilisateur est déjà inscrit
      let dejaInscrit = false;
      if (req.user) {
        const inscription = await EvenementUser.findOne({ 
          where: { id_evenement: id, id_user: req.user.id_user } 
        });
        dejaInscrit = !!inscription;
      }

      res.json({
        success: true,
        data: {
          id_evenement: evenement.id_evenement,
          nom_evenement: translateDeep(evenement.nom_evenement, lang),
          type_evenement: translateDeep(typeEvenement?.nom_type, lang),
          inscription_requise: evenement.inscription_requise,
          date_limite_inscription: evenement.date_limite_inscription,
          places_disponibles: placesDisponibles,
          est_complet: placesDisponibles !== null && placesDisponibles <= 0,
          deja_inscrit: dejaInscrit,
          accepte_soumissions: accepteSoumissions,
          config_soumission: accepteSoumissions ? {
            type_oeuvre: configSoumission?.type_oeuvre || [],
            requis: configSoumission?.requis || false,
            max_soumissions: configSoumission?.max_soumissions || 10,
            label: translateDeep(configSoumission?.label, lang) || 'Œuvres à soumettre'
          } : null
        }
      });

    } catch (error) {
      console.error('Erreur getConfigInscription:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la configuration', details: error.message });
    }
  };

  // GET /evenements/:id/mon-inscription
  // Retourne le statut d'inscription de l'utilisateur connecté
  const getMonInscription = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id_user;

      const inscription = await EvenementUser.findOne({
        where: { id_evenement: id, id_user: userId },
        attributes: ['statut_participation', 'role_participation', 'date_inscription', 'notes']
      });

      if (!inscription) {
        return res.json({
          success: true,
          data: {
            isRegistered: false,
            status: null
          }
        });
      }

      // Mapper les statuts pour le frontend
      const statusMap = {
        'inscrit': 'pending',
        'confirme': 'confirmed',
        'annule': 'cancelled',
        'refuse': 'cancelled',
        'liste_attente': 'waiting_list'
      };

      res.json({
        success: true,
        data: {
          isRegistered: true,
          status: statusMap[inscription.statut_participation] || 'pending',
          inscription: {
            statut_participation: inscription.statut_participation,
            role_participation: inscription.role_participation,
            date_inscription: inscription.date_inscription,
            notes: inscription.notes
          }
        }
      });
    } catch (error) {
      console.error('Erreur getMonInscription:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la vérification', details: error.message });
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
  // Retourne les participants avec leurs œuvres soumises et profil complet
  const getParticipants = async (req, res) => {
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { statut, role } = req.query;

      // Construire le filtre
      const where = { id_evenement: id };
      if (statut) where.statut_participation = statut;
      if (role) where.role_participation = role;

      // Récupérer les participants avec profil étendu
      const participants = await EvenementUser.findAll({ 
        where,
        include: [{ 
          model: User, 
          as: 'User', 
          attributes: [
            'id_user', 'nom', 'prenom', 'email', 
            'bio', 'photo_profil', 'site_web',
            'telephone', 'statut', 'date_inscription'
          ],
          include: models.TypeUser ? [{ 
            model: models.TypeUser, 
            as: 'TypeUser',
            attributes: ['id_type_user', 'nom_type']
          }] : []
        }],
        order: [['date_inscription', 'DESC']]
      });

      // Pour chaque participant, récupérer ses œuvres soumises à cet événement
      const participantsAvecOeuvres = await Promise.all(
        participants.map(async (participant) => {
          const data = participant.toJSON();
          
          // Récupérer les œuvres soumises par ce participant pour cet événement
          if (EvenementOeuvre && Oeuvre) {
            const oeuvresSoumises = await EvenementOeuvre.findAll({
              where: { 
                id_evenement: id, 
                id_presentateur: participant.id_user 
              },
              include: [{
                model: Oeuvre,
                as: 'Oeuvre',
                attributes: ['id_oeuvre', 'titre', 'description', 'image_url', 'date_creation'],
                include: TypeOeuvre ? [{
                  model: TypeOeuvre,
                  as: 'TypeOeuvre',
                  attributes: ['id_type_oeuvre', 'nom_type']
                }] : []
              }]
            });
            data.oeuvres_soumises = oeuvresSoumises.map(eo => ({
              ...eo.Oeuvre?.toJSON(),
              ordre_presentation: eo.ordre_presentation,
              description_presentation: eo.description_presentation,
              duree_presentation: eo.duree_presentation
            }));
          } else {
            data.oeuvres_soumises = [];
          }

          return data;
        })
      );

      // Statistiques
      const stats = {
        total: participants.length,
        par_statut: {},
        par_role: {}
      };
      
      participants.forEach(p => {
        stats.par_statut[p.statut_participation] = (stats.par_statut[p.statut_participation] || 0) + 1;
        stats.par_role[p.role_participation] = (stats.par_role[p.role_participation] || 0) + 1;
      });

      res.json({ 
        success: true, 
        data: translateDeep(participantsAvecOeuvres, lang),
        stats,
        lang
      });
    } catch (error) {
      console.error('Erreur getParticipants:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des participants', details: error.message });
    }
  };

  // GET /evenements/:id/participants/:userId/profil
  // Voir le profil complet d'un participant inscrit
  const getParticipantProfil = async (req, res) => {
    try {
      const lang = req.lang || 'fr';
      const { id, userId } = req.params;

      // Vérifier que l'utilisateur est bien inscrit à cet événement
      const inscription = await EvenementUser.findOne({
        where: { id_evenement: id, id_user: userId }
      });

      if (!inscription) {
        return res.status(404).json({ 
          success: false, 
          error: 'Ce participant n\'est pas inscrit à cet événement' 
        });
      }

      // Récupérer le profil complet de l'utilisateur
      const user = await User.findByPk(userId, {
        attributes: [
          'id_user', 'nom', 'prenom', 'email',
          'bio', 'photo_profil', 'site_web',
          'telephone', 'statut', 'date_inscription',
          'linkedin', 'facebook', 'twitter', 'instagram'
        ],
        include: [
          models.TypeUser ? { 
            model: models.TypeUser, 
            as: 'TypeUser',
            attributes: ['id_type_user', 'nom_type']
          } : null,
          models.Organisation ? {
            model: models.Organisation,
            as: 'Organisations',
            through: { attributes: ['role'] },
            attributes: ['id_organisation', 'nom', 'logo_url']
          } : null
        ].filter(Boolean)
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      // Récupérer les œuvres soumises pour cet événement
      let oeuvresSoumises = [];
      if (EvenementOeuvre && Oeuvre) {
        const oeuvresEvent = await EvenementOeuvre.findAll({
          where: { id_evenement: id, id_presentateur: userId },
          include: [{
            model: Oeuvre,
            as: 'Oeuvre',
            include: TypeOeuvre ? [{
              model: TypeOeuvre,
              as: 'TypeOeuvre',
              attributes: ['id_type_oeuvre', 'nom_type']
            }] : []
          }]
        });
        oeuvresSoumises = oeuvresEvent.map(eo => ({
          ...eo.Oeuvre?.toJSON(),
          ordre_presentation: eo.ordre_presentation,
          description_presentation: eo.description_presentation
        }));
      }

      // Récupérer les autres œuvres de l'utilisateur (portfolio)
      let portfolio = [];
      if (Oeuvre) {
        portfolio = await Oeuvre.findAll({
          where: { id_user: userId },
          attributes: ['id_oeuvre', 'titre', 'description', 'image_url', 'date_creation'],
          include: TypeOeuvre ? [{
            model: TypeOeuvre,
            as: 'TypeOeuvre',
            attributes: ['id_type_oeuvre', 'nom_type']
          }] : [],
          limit: 20,
          order: [['date_creation', 'DESC']]
        });
      }

      // Historique des participations à d'autres événements
      const historiqueParticipations = await EvenementUser.findAll({
        where: { 
          id_user: userId,
          statut_participation: { [Op.in]: ['confirme', 'present'] }
        },
        include: [{
          model: Evenement,
          as: 'Evenement',
          attributes: ['id_evenement', 'nom_evenement', 'date_debut', 'statut']
        }],
        limit: 10,
        order: [['date_inscription', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          profil: translateDeep(user.toJSON(), lang),
          inscription: {
            statut_participation: inscription.statut_participation,
            role_participation: inscription.role_participation,
            date_inscription: inscription.date_inscription,
            notes: inscription.notes,
            evaluation_evenement: inscription.evaluation_evenement,
            commentaire_evaluation: inscription.commentaire_evaluation
          },
          oeuvres_soumises: translateDeep(oeuvresSoumises, lang),
          portfolio: translateDeep(portfolio, lang),
          historique_participations: translateDeep(historiqueParticipations.map(h => ({
            evenement: h.Evenement,
            statut: h.statut_participation,
            date: h.date_inscription
          })), lang)
        },
        lang
      });

    } catch (error) {
      console.error('Erreur getParticipantProfil:', error);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération du profil', details: error.message });
    }
  };

  // PATCH /evenements/:id/participants/:userId/validate
  // Body: { statut_participation: 'accepter' | 'refuser', message?: string, notify_email?: boolean, notify_sms?: boolean }
  const validateParticipation = async (req, res) => {
    try {
      const { id, userId } = req.params;
      const { statut_participation, message: messageOrganisateur, notify_email = true, notify_sms = true } = req.body;

      const inscription = await EvenementUser.findOne({ where: { id_evenement: id, id_user: userId } });
      if (!inscription) return res.status(404).json({ success: false, error: 'Inscription non trouvée' });

      const status = statut_participation === 'accepter' ? 'confirme' : 'refuse';
      await inscription.update({
        statut_participation: status,
        date_validation: new Date(),
        valide_par: req.user?.id_user
      });

      // Récupérer les informations pour les notifications
      const participant = await User.findByPk(userId, {
        attributes: ['id_user', 'nom', 'prenom', 'email', 'telephone']
      });

      const evenement = await Evenement.findByPk(id, {
        attributes: ['id_evenement', 'nom_evenement']
      });

      const nomEvenement = translate(evenement?.nom_evenement, 'fr');
      const statutNotif = statut_participation === 'accepter' ? 'accepte' : 'refuse';

      // Envoi de l'email de notification (asynchrone, non bloquant)
      if (notify_email && participant?.email) {
        emailService.sendSubmissionValidationEmail({
          email: participant.email,
          prenom: participant.prenom,
          nomEvenement,
          statut: statutNotif,
          message: messageOrganisateur,
          eventUrl: `${process.env.FRONTEND_URL}/evenements/${id}`
        }).catch(err => console.error('Erreur envoi email validation:', err));
      }

      // Envoi du SMS de notification (asynchrone, non bloquant)
      if (notify_sms && participant?.telephone) {
        smsService.sendSubmissionValidation({
          telephone: participant.telephone,
          prenom: participant.prenom,
          nomEvenement,
          statut: statutNotif
        }).catch(err => console.error('Erreur envoi SMS validation:', err));
      }

      res.json({
        success: true,
        data: inscription,
        message: statut_participation === 'accepter'
          ? 'Participation confirmée - Notification envoyée'
          : 'Participation refusée - Notification envoyée'
      });
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
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const userId = req.user.id_user;

      // Vérifier que l'utilisateur est organisateur ou participant de l'événement
      const evenement = await Evenement.findByPk(id);
      if (!evenement) {
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      // Récupérer les oeuvres déjà ajoutées à l'événement
      const oeuvresAjoutees = await EvenementOeuvre.findAll({
        where: { id_evenement: id },
        include: [
          {
            model: Oeuvre,
            as: 'Oeuvre',
            include: [
              { model: TypeOeuvre, as: 'TypeOeuvre', required: false }
            ]
          },
          { model: User, as: 'Presentateur', attributes: ['id_user', 'nom', 'prenom'], required: false }
        ],
        order: [['ordre_presentation', 'ASC']]
      });

      // Récupérer les oeuvres disponibles de l'utilisateur (non encore ajoutées)
      const oeuvresIds = oeuvresAjoutees.map(eo => eo.id_oeuvre);
      const oeuvresDisponibles = await Oeuvre.findAll({
        where: {
          id_user: userId,
          statut: 'publie',
          ...(oeuvresIds.length > 0 ? { id_oeuvre: { [Op.notIn]: oeuvresIds } } : {})
        },
        include: [
          { model: TypeOeuvre, as: 'TypeOeuvre', required: false }
        ],
        order: [['date_creation', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          oeuvres_ajoutees: translateDeep(oeuvresAjoutees, lang),
          oeuvres_disponibles: translateDeep(oeuvresDisponibles, lang)
        }
      });
    } catch (error) {
      console.error('Erreur getMesOeuvresEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // POST /evenements/:id/oeuvres
  const addOeuvreProfessionnel = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;
      const { id_oeuvre, description_presentation, duree_presentation } = req.body;
      const userId = req.user.id_user;

      // Vérifier que l'événement existe
      const evenement = await Evenement.findByPk(id);
      if (!evenement) {
        await transaction.rollback();
        return res.status(404).json({ success: false, error: 'Événement non trouvé' });
      }

      // Vérifier que l'oeuvre appartient à l'utilisateur
      const oeuvre = await Oeuvre.findOne({
        where: { id_oeuvre, id_user: userId }
      });
      if (!oeuvre) {
        await transaction.rollback();
        return res.status(403).json({ success: false, error: 'Cette œuvre ne vous appartient pas' });
      }

      // Vérifier si l'oeuvre est déjà ajoutée
      const existing = await EvenementOeuvre.findOne({
        where: { id_evenement: id, id_oeuvre }
      });
      if (existing) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: 'Cette œuvre est déjà associée à cet événement' });
      }

      // Calculer le prochain ordre
      const maxOrdre = await EvenementOeuvre.max('ordre_presentation', {
        where: { id_evenement: id }
      }) || 0;

      // Créer l'association
      const evenementOeuvre = await EvenementOeuvre.create({
        id_evenement: id,
        id_oeuvre,
        id_presentateur: userId,
        description_presentation,
        duree_presentation,
        ordre_presentation: maxOrdre + 1
      }, { transaction });

      await transaction.commit();

      // Récupérer avec les relations pour la réponse
      const result = await EvenementOeuvre.findByPk(evenementOeuvre.id_EventOeuvre, {
        include: [
          { model: Oeuvre, as: 'Oeuvre' },
          { model: User, as: 'Presentateur', attributes: ['id_user', 'nom', 'prenom'] }
        ]
      });

      res.status(201).json({
        success: true,
        data: translateDeep(result, lang),
        message: 'Œuvre ajoutée à l\'événement avec succès'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur addOeuvreProfessionnel:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // PUT /evenements/:id/oeuvres/:oeuvreId
  const updateOeuvreEvenement = async (req, res) => {
    try {
      const lang = req.lang || 'fr';
      const { id, oeuvreId } = req.params;
      const { description_presentation, duree_presentation, ordre_presentation } = req.body;

      const evenementOeuvre = await EvenementOeuvre.findOne({
        where: { id_evenement: id, id_oeuvre: oeuvreId }
      });

      if (!evenementOeuvre) {
        return res.status(404).json({ success: false, error: 'Association non trouvée' });
      }

      await evenementOeuvre.update({
        ...(description_presentation !== undefined && { description_presentation }),
        ...(duree_presentation !== undefined && { duree_presentation }),
        ...(ordre_presentation !== undefined && { ordre_presentation })
      });

      const result = await EvenementOeuvre.findByPk(evenementOeuvre.id_EventOeuvre, {
        include: [
          { model: Oeuvre, as: 'Oeuvre' },
          { model: User, as: 'Presentateur', attributes: ['id_user', 'nom', 'prenom'] }
        ]
      });

      res.json({
        success: true,
        data: translateDeep(result, lang),
        message: 'Association mise à jour'
      });
    } catch (error) {
      console.error('Erreur updateOeuvreEvenement:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // DELETE /evenements/:id/oeuvres/:oeuvreId
  const removeOeuvreProfessionnel = async (req, res) => {
    try {
      const { id, oeuvreId } = req.params;
      const userId = req.user.id_user;

      // Vérifier que l'association existe
      const evenementOeuvre = await EvenementOeuvre.findOne({
        where: { id_evenement: id, id_oeuvre: oeuvreId }
      });

      if (!evenementOeuvre) {
        return res.status(404).json({ success: false, error: 'Association non trouvée' });
      }

      // Vérifier que l'utilisateur est le présentateur ou l'organisateur
      const evenement = await Evenement.findByPk(id);
      const isOrganisateur = evenement.id_organisateur === userId;
      const isPresentateur = evenementOeuvre.id_presentateur === userId;

      if (!isOrganisateur && !isPresentateur) {
        return res.status(403).json({ success: false, error: 'Non autorisé à supprimer cette œuvre de l\'événement' });
      }

      await evenementOeuvre.destroy();
      res.json({ success: true, message: 'Œuvre retirée de l\'événement avec succès' });
    } catch (error) {
      console.error('Erreur removeOeuvreProfessionnel:', error);
      res.status(500).json({ success: false, error: 'Erreur', details: error.message });
    }
  };

  // PUT /evenements/:id/oeuvres/reorder
  const reorderOeuvresEvenement = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { oeuvres } = req.body; // [{id_oeuvre: 1, ordre: 1}, {id_oeuvre: 2, ordre: 2}]

      for (const item of oeuvres) {
        await EvenementOeuvre.update(
          { ordre_presentation: item.ordre },
          { where: { id_evenement: id, id_oeuvre: item.id_oeuvre }, transaction }
        );
      }

      await transaction.commit();
      res.json({ success: true, message: 'Ordre des œuvres mis à jour' });
    } catch (error) {
      await transaction.rollback();
      console.error('Erreur reorderOeuvresEvenement:', error);
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
    getMonInscription,
    getParticipants,
    getParticipantProfil,
    validateParticipation,
    getConfigInscription,
    addMedias,
    deleteMedia,
    getMesOeuvresEvenement,
    addOeuvreProfessionnel,
    updateOeuvreEvenement,
    removeOeuvreProfessionnel,
    reorderOeuvresEvenement,
    sendNotificationManuelle,
    getEvenementTranslations,
    updateEvenementTranslation
  };
};

module.exports = createEvenementController;
