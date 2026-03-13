// controllers/ProgrammeController.js - VERSION i18n
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');

// ⚡ Import du helper i18n
const { translate, translateDeep, createMultiLang, mergeTranslations } = require('../helpers/i18n');

class ProgrammeController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.notificationService = new NotificationService(models);
  }

  // ⚡ Préparer un champ multilingue
  prepareMultiLangField(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  // ========================================================================
  // MÉTHODES DE CONSULTATION
  // ========================================================================

  // Récupérer tous les programmes d'un événement
  async getProgrammesByEvenement(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { evenementId } = req.params;
      const { date, type_activite } = req.query;

      const where = { id_evenement: evenementId };
      
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        
        where.heure_debut = {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        };
      }
      
      if (type_activite) {
        where.type_activite = type_activite;
      }

      const programmes = await this.models.Programme.findAll({
        where,
        include: [
          {
            model: this.models.Lieu,
            as: 'Lieu',
            attributes: ['nom', 'adresse', 'latitude', 'longitude']
          },
          {
            model: this.models.User,
            through: { 
              model: this.models.ProgrammeIntervenant,
              attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 
                          'ordre_intervention', 'duree_intervention']
            },
            attributes: ['id_user', 'nom', 'prenom', 'id_type_user', 'photo_url', 
                        'email', 'telephone', 'entreprise', 'biographie'],
            as: 'Intervenants'
          }
        ],
        order: [
          ['ordre', 'ASC'],
          ['heure_debut', 'ASC']
        ]
      });

      const programmesByDay = this.groupProgrammesByDay(programmes);

      // ⚡ Traduire
      res.json({
        success: true,
        data: {
          programmes: translateDeep(programmes, lang),
          byDay: translateDeep(programmesByDay, lang),
          total: programmes.length
        },
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des programmes:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // Récupérer un programme spécifique
  async getProgrammeById(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;

      const programme = await this.models.Programme.findByPk(id, {
        include: [
          {
            model: this.models.Evenement,
            attributes: ['nom_evenement', 'date_debut', 'date_fin', 'id_user']
          },
          {
            model: this.models.Lieu,
            as: 'Lieu',
            attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typeLieu']
          },
          {
            model: this.models.User,
            through: { 
              model: this.models.ProgrammeIntervenant,
              attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention',
                          'biographie_courte', 'honoraires', 'frais_deplacement']
            },
            attributes: ['id_user', 'nom', 'prenom', 'id_type_user', 'biographie', 
                        'photo_url', 'email', 'telephone', 'entreprise'],
            as: 'Intervenants'
          }
        ]
      });

      if (!programme) {
        return res.status(404).json({ 
          success: false, 
          error: req.t('programme.notFound') 
        });
      }

      // ⚡ Traduire
      res.json({
        success: true,
        data: translateDeep(programme, lang),
        lang
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // Exporter le programme d'un événement
  async exportProgramme(req, res) {
    try {
      const lang = req.lang || 'fr';  // ⚡
      const { evenementId } = req.params;
      const { format = 'json' } = req.query;

      const programmes = await this.models.Programme.findAll({
        where: { id_evenement: evenementId },
        include: [
          {
            model: this.models.Evenement,
            attributes: ['nom_evenement', 'date_debut', 'date_fin']
          },
          {
            model: this.models.Lieu,
            as: 'Lieu',
            attributes: ['nom', 'adresse']
          },
          {
            model: this.models.User,
            through: { 
              model: this.models.ProgrammeIntervenant,
              attributes: ['role_intervenant', 'sujet_intervention']
            },
            attributes: ['nom', 'prenom', 'entreprise'],
            as: 'Intervenants'
          }
        ],
        order: [
          ['ordre', 'ASC'],
          ['heure_debut', 'ASC']
        ]
      });

      if (programmes.length === 0) {
        return res.status(404).json({
          success: false,
          error: req.t('programme.notFound')
        });
      }

      // ⚡ Traduire
      const translatedProgrammes = translateDeep(programmes, lang);

      switch (format) {
        case 'csv':
          const csv = this.formatProgrammesToCSV(translatedProgrammes);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="programme-${evenementId}.csv"`);
          res.send(csv);
          break;

        case 'pdf':
          res.status(501).json({
            success: false,
            error: req.t('common.notImplemented')
          });
          break;

        case 'json':
        default:
          res.json({
            success: true,
            data: {
              evenement: translatedProgrammes[0]?.Evenement || null,
              programmes: translatedProgrammes.map(p => ({
                titre: p.titre,
                description: p.description,
                heure_debut: p.heure_debut,
                heure_fin: p.heure_fin,
                lieu: p.Lieu?.nom || p.lieu_specifique,
                type_activite: p.type_activite,
                intervenants: p.Intervenants?.map(i => ({
                  nom: `${i.prenom} ${i.nom}`,
                  entreprise: i.entreprise,
                  role: i.ProgrammeIntervenant?.role_intervenant,
                  sujet: i.ProgrammeIntervenant?.sujet_intervention
                }))
              })),
              total: programmes.length
            },
            lang
          });
      }

    } catch (error) {
      console.error('Erreur lors de l\'export du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // ========================================================================
  // MÉTHODES DE GESTION (CRUD)
  // ========================================================================

  // Créer un programme
  async createProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const lang = req.lang || 'fr';  // ⚡
      const { evenementId } = req.params;
      const {
        titre,
        description,
        heure_debut,
        heure_fin,
        id_lieu,
        lieu_specifique,
        type_activite,
        ordre,
        duree_estimee,
        nb_participants_max,
        materiel_requis,
        notes_organisateur,
        intervenants = []
      } = req.body;

      // Vérifier l'événement
      const evenement = await this.models.Evenement.findByPk(evenementId);
      if (!evenement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: req.t('evenement.notFound')
        });
      }

      // Vérifier les permissions
      if (evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      if (id_lieu) {
        const lieu = await this.models.Lieu.findByPk(id_lieu);
        if (!lieu) {
          await transaction.rollback();
          return res.status(404).json({ success: false, error: req.t('lieu.notFound') });
        }
      }

      const titreMultiLang = this.prepareMultiLangField(titre, lang);
      const descriptionMultiLang = this.prepareMultiLangField(description, lang);

      // Créer le programme
      const programme = await this.models.Programme.create({
        titre: titreMultiLang,
        description: descriptionMultiLang,
        id_evenement: evenementId,
        id_lieu,
        heure_debut,
        heure_fin,
        lieu_specifique,
        ordre: ordre || await this.getNextOrdre(evenementId),
        statut: 'planifie',
        type_activite,
        duree_estimee,
        nb_participants_max,
        materiel_requis,
        notes_organisateur
      }, { transaction });

      // Ajouter les intervenants
      if (intervenants.length > 0) {
        for (const intervenant of intervenants) {
          await this.models.ProgrammeIntervenant.create({
            id_programme: programme.id_programme,
            id_user: intervenant.id_user,
            role_intervenant: intervenant.role || 'intervenant',
            sujet_intervention: intervenant.sujet,
            ordre_intervention: intervenant.ordre || 1,
            duree_intervention: intervenant.duree,
            statut_confirmation: 'en_attente'
          }, { transaction });
        }
      }

      await transaction.commit();

      // Récupérer le programme complet
      const programmeComplet = await this.getProgrammeComplet(programme.id_programme);

      // ⚡ Traduire
      res.status(201).json({
        success: true,
        message: req.t('programme.created'),
        data: translateDeep(programmeComplet, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création du programme:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  // Mettre à jour un programme
  async updateProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const lang = req.lang || 'fr';  // ⚡
      const { id } = req.params;
      const { titre, description } = req.body;

      // Whitelist des champs modifiables
      const allowedFields = ['id_lieu', 'lieu_specifique', 'heure_debut', 'heure_fin', 'type_activite', 'duree_estimee', 'nb_participants_max', 'materiel_requis', 'notes_organisateur', 'ordre', 'intervenants'];
      const updates = {};
      allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const programme = await this.models.Programme.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: req.t('programme.notFound')
        });
      }

      // Vérifier les permissions
      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      // ⚡ Gérer les champs multilingues
      if (titre !== undefined) {
        if (typeof titre === 'object') {
          updates.titre = mergeTranslations(programme.titre, titre);
        } else {
          updates.titre = mergeTranslations(programme.titre, { [lang]: titre });
        }
      }

      if (description !== undefined) {
        if (typeof description === 'object') {
          updates.description = mergeTranslations(programme.description, description);
        } else {
          updates.description = mergeTranslations(programme.description, { [lang]: description });
        }
      }

      await programme.update(updates, { transaction });

      await transaction.commit();

      // Récupérer le programme mis à jour
      const programmeComplet = await this.getProgrammeComplet(id);

      // ⚡ Traduire
      res.json({
        success: true,
        message: req.t('programme.updated'),
        data: translateDeep(programmeComplet, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  // Supprimer un programme
  async deleteProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;

      const programme = await this.models.Programme.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: req.t('programme.notFound')
        });
      }

      // Vérifier les permissions
      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      // Supprimer les associations intervenants
      await this.models.ProgrammeIntervenant.destroy({
        where: { id_programme: id },
        transaction
      });

      await programme.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: req.t('programme.deleted')
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la suppression:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  // ⚡ Récupérer toutes les traductions d'un programme (admin)
  async getProgrammeTranslations(req, res) {
    try {
      const { id } = req.params;

      const programme = await this.models.Programme.findByPk(id, {
        attributes: ['id_programme', 'titre', 'description']
      });

      if (!programme) {
        return res.status(404).json({
          success: false,
          error: req.t('programme.notFound')
        });
      }

      res.json({
        success: true,
        data: programme
      });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  }

  // ⚡ Mettre à jour une traduction spécifique (admin)
  async updateProgrammeTranslation(req, res) {
    try {
      const { id, lang } = req.params;
      const { titre, description } = req.body;

      const programme = await this.models.Programme.findByPk(id);
      if (!programme) {
        return res.status(404).json({ success: false, error: req.t('programme.notFound') });
      }

      const updates = {};
      if (titre) updates.titre = mergeTranslations(programme.titre, { [lang]: titre });
      if (description) updates.description = mergeTranslations(programme.description, { [lang]: description });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      }

      await programme.update(updates);
      res.json({ success: true, message: req.t('translation.updated', { lang }), data: programme });

    } catch (error) {
      console.error('Erreur:', error);
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  }

  // Mettre à jour le statut d'un programme
  async updateStatut(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const { statut } = req.body;

      const programme = await this.models.Programme.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: req.t('programme.notFound') 
        });
      }

      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({ 
          success: false, 
          error: req.t('auth.forbidden') 
        });
      }

      const ancienStatut = programme.statut;

      await programme.update({ statut }, { transaction });

      await transaction.commit();

      if (statut === 'annule' || statut === 'reporte') {
        try {
          await this.notificationService.notifierModificationProgramme(
            id, 
            statut === 'annule' ? 'annule' : 'reporte'
          );
        } catch (notifError) {
          console.error('❌ Erreur envoi notification:', notifError);
        }
      }

      res.json({
        success: true,
        message: req.t('programme.statusUpdated'),
        data: {
          id_programme: programme.id_programme,
          titre: programme.titre,
          ancien_statut: ancienStatut,
          nouveau_statut: statut
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour du statut:', error);
      res.status(500).json({ 
        success: false, 
        error: req.t('common.serverError') 
      });
    }
  }

  // ========================================================================
  // MÉTHODES SUPPLÉMENTAIRES
  // ========================================================================

  // Dupliquer un programme
  async duplicateProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const lang = req.lang || 'fr';
      const { id } = req.params;

      const programme = await this.models.Programme.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: req.t('programme.notFound')
        });
      }

      // Vérifier les permissions
      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      // Créer la copie
      const newProgramme = await this.models.Programme.create({
        titre: programme.titre,
        description: programme.description,
        id_evenement: programme.id_evenement,
        id_lieu: programme.id_lieu,
        lieu_specifique: programme.lieu_specifique,
        ordre: await this.getNextOrdre(programme.id_evenement),
        statut: 'planifie',
        type_activite: programme.type_activite,
        duree_estimee: programme.duree_estimee,
        nb_participants_max: programme.nb_participants_max,
        materiel_requis: programme.materiel_requis,
        notes_organisateur: programme.notes_organisateur
      }, { transaction });

      await transaction.commit();

      const programmeComplet = await this.getProgrammeComplet(newProgramme.id_programme);

      res.status(201).json({
        success: true,
        message: req.t('programme.duplicated'),
        data: translateDeep(programmeComplet, lang)
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la duplication:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  // Réorganiser l'ordre des programmes
  async reorderProgrammes(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { evenementId } = req.params;
      const { programmes } = req.body;

      // Vérifier l'événement
      const evenement = await this.models.Evenement.findByPk(evenementId);
      if (!evenement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: req.t('evenement.notFound')
        });
      }

      // Vérifier les permissions
      if (evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: req.t('auth.forbidden')
        });
      }

      // Mettre à jour l'ordre de chaque programme
      for (const item of programmes) {
        await this.models.Programme.update(
          { ordre: item.ordre },
          {
            where: {
              id_programme: item.id,
              id_evenement: evenementId
            },
            transaction
          }
        );
      }

      await transaction.commit();

      res.json({
        success: true,
        message: req.t('programme.reordered')
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la réorganisation:', error);
      res.status(500).json({
        success: false,
        error: req.t('common.serverError')
      });
    }
  }

  // ========================================================================
  // MÉTHODES UTILITAIRES
  // ========================================================================

  groupProgrammesByDay(programmes) {
    const byDay = {};
    
    programmes.forEach(programme => {
      if (programme.heure_debut) {
        const date = new Date(programme.heure_debut).toLocaleDateString('fr-FR');
        if (!byDay[date]) {
          byDay[date] = [];
        }
        byDay[date].push(programme);
      }
    });
    
    return byDay;
  }

  async getProgrammeComplet(id) {
    return await this.models.Programme.findByPk(id, {
      include: [
        { 
          model: this.models.Lieu,
          as: 'Lieu'
        },
        { 
          model: this.models.User, 
          as: 'Intervenants',
          through: { 
            attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention',
                        'ordre_intervention', 'duree_intervention', 'biographie_courte']
          }
        }
      ]
    });
  }

  async getNextOrdre(evenementId) {
    const maxOrdre = await this.models.Programme.max('ordre', {
      where: { id_evenement: evenementId }
    });
    return (maxOrdre || 0) + 1;
  }

  formatProgrammesToCSV(programmes) {
    let csv = 'Date,Heure début,Heure fin,Titre,Description,Lieu,Type,Intervenants\n';
    
    programmes.forEach(p => {
      const date = p.heure_debut ? new Date(p.heure_debut).toLocaleDateString('fr-FR') : '';
      const heureDebut = p.heure_debut ? new Date(p.heure_debut).toLocaleTimeString('fr-FR') : '';
      const heureFin = p.heure_fin ? new Date(p.heure_fin).toLocaleTimeString('fr-FR') : '';
      const lieu = p.Lieu?.nom || p.lieu_specifique || '';
      const intervenants = p.Intervenants?.map(i => `${i.prenom} ${i.nom}`).join('; ') || '';
      
      const escapeCsv = (field) => {
        if (!field) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      csv += `${escapeCsv(date)},${escapeCsv(heureDebut)},${escapeCsv(heureFin)},${escapeCsv(p.titre)},${escapeCsv(p.description)},${escapeCsv(lieu)},${escapeCsv(p.type_activite)},${escapeCsv(intervenants)}\n`;
    });
    
    return csv;
  }
}

module.exports = ProgrammeController;
