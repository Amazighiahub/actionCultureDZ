const { Op } = require('sequelize');
const NotificationService = require('../services/NotificationService');

class ProgrammeController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.notificationService = new NotificationService(models); // ✨ AJOUT pour les notifications
  }

  // ========================================================================
  // MÉTHODES DE CONSULTATION
  // ========================================================================

  // Récupérer tous les programmes d'un événement
  async getProgrammesByEvenement(req, res) {
    try {
      const { evenementId } = req.params;
      const { date, type_activite } = req.query;

      const where = { id_evenement: evenementId };
      
      // Filtres optionnels
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
            attributes: ['nom', 'adresse', 'latitude', 'longitude']
          },
          {
            model: this.models.User,
            through: { 
              model: this.models.ProgrammeIntervenant,
              attributes: []
            },
            attributes: ['id_user', 'nom', 'prenom', 'type_user', 'photo_url'],
            as: 'Intervenants'
          }
        ],
        order: [
          ['ordre', 'ASC'],
          ['heure_debut', 'ASC']
        ]
      });

      // Grouper par jour si plusieurs jours
      const programmesByDay = this.groupProgrammesByDay(programmes);

      res.json({
        success: true,
        data: {
          programmes,
          byDay: programmesByDay,
          total: programmes.length
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des programmes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la récupération des programmes' 
      });
    }
  }

  // Récupérer un programme spécifique
  async getProgrammeById(req, res) {
    try {
      const { id } = req.params;

      const programme = await this.models.Programme.findByPk(id, {
        include: [
          {
            model: this.models.Evenement,
            attributes: ['nom_evenement', 'date_debut', 'date_fin', 'id_user']
          },
          {
            model: this.models.Lieu,
            include: [
              { model: this.models.Wilaya, attributes: ['nom'] },
              { model: this.models.Service, attributes: ['nom'] }
            ]
          },
          {
            model: this.models.User,
            through: { 
              model: this.models.ProgrammeIntervenant,
              attributes: []
            },
            attributes: ['id_user', 'nom', 'prenom', 'type_user', 'biographie', 'photo_url'],
            as: 'Intervenants'
          }
        ]
      });

      if (!programme) {
        return res.status(404).json({ 
          success: false, 
          error: 'Programme non trouvé' 
        });
      }

      res.json({
        success: true,
        data: programme
      });

    } catch (error) {
      console.error('Erreur lors de la récupération du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // MÉTHODES DE GESTION (CRUD)
  // ========================================================================

  // Vérifier les chevauchements de programmes
  async verifierChevauchement(id_evenement, heure_debut, heure_fin, exclude_id = null) {
    const where = {
      id_evenement,
      [Op.and]: [
        {
          [Op.or]: [
            {
              // Le nouveau programme commence pendant un autre
              heure_debut: {
                [Op.between]: [heure_debut, heure_fin]
              }
            },
            {
              // Le nouveau programme se termine pendant un autre
              heure_fin: {
                [Op.between]: [heure_debut, heure_fin]
              }
            },
            {
              // Le nouveau programme englobe un autre
              [Op.and]: [
                { heure_debut: { [Op.lte]: heure_debut } },
                { heure_fin: { [Op.gte]: heure_fin } }
              ]
            },
            {
              // Un autre programme est englobé
              [Op.and]: [
                { heure_debut: { [Op.gte]: heure_debut } },
                { heure_fin: { [Op.lte]: heure_fin } }
              ]
            }
          ]
        }
      ]
    };

    if (exclude_id) {
      where.id_programme = { [Op.ne]: exclude_id };
    }

    const chevauchements = await this.models.Programme.findAll({
      where,
      attributes: ['id_programme', 'titre', 'heure_debut', 'heure_fin']
    });

    return chevauchements;
  }

  // Créer un nouveau programme ✨ MODIFIÉ avec notification
  async createProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { evenementId } = req.params;
      const {
        titre,
        description,
        heure_debut,
        heure_fin,
        id_lieu,
        lieu_specifique,
        type_activite,
        duree_estimee,
        nb_participants_max,
        materiel_requis,
        notes_organisateur,
        intervenants = []
      } = req.body;

      // Vérifier que l'événement existe et appartient à l'utilisateur
      const evenement = await this.models.Evenement.findByPk(evenementId);
      if (!evenement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé'
        });
      }

      if (evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          error: 'Vous ne pouvez ajouter des programmes qu\'à vos propres événements'
        });
      }

      // Vérifier la cohérence des dates
      if (heure_debut && heure_fin) {
        const debut = new Date(heure_debut);
        const fin = new Date(heure_fin);
        
        // Vérifier que début < fin
        if (debut >= fin) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'L\'heure de début doit être antérieure à l\'heure de fin'
          });
        }

        // Vérifier que les dates sont dans la période de l'événement
        if (evenement.date_debut && debut < new Date(evenement.date_debut)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Le programme ne peut pas commencer avant l\'événement'
          });
        }

        if (evenement.date_fin && fin > new Date(evenement.date_fin)) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Le programme ne peut pas se terminer après l\'événement'
          });
        }

        // Vérifier les chevauchements
        const chevauchements = await this.verifierChevauchement(
          evenementId,
          debut,
          fin
        );

        if (chevauchements.length > 0) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            error: 'Ce créneau horaire entre en conflit avec d\'autres programmes',
            conflits: chevauchements.map(p => ({
              titre: p.titre,
              debut: p.heure_debut,
              fin: p.heure_fin
            }))
          });
        }
      }

      // Déterminer l'ordre du nouveau programme
      const maxOrdre = await this.models.Programme.max('ordre', {
        where: { id_evenement: evenementId }
      });
      const ordre = (maxOrdre || 0) + 1;

      // Créer le programme
      const programme = await this.models.Programme.create({
        titre,
        description,
        id_evenement: evenementId,
        id_lieu,
        heure_debut: heure_debut ? new Date(heure_debut) : null,
        heure_fin: heure_fin ? new Date(heure_fin) : null,
        lieu_specifique,
        ordre,
        statut: 'planifie',
        type_activite,
        duree_estimee,
        nb_participants_max,
        materiel_requis,
        notes_organisateur
      }, { transaction });

      // Ajouter les intervenants si fournis
      if (intervenants.length > 0) {
        // Vérifier que les intervenants sont des professionnels
        const intervenantsValides = await this.models.User.findAll({
          where: { 
            id_user: { [Op.in]: intervenants },
            type_user: { [Op.ne]: 'visiteur' }
          }
        });

        if (intervenantsValides.length > 0) {
          await programme.addUsers(intervenantsValides, { transaction });
        }
      }

      await transaction.commit();

      // ✨ NOUVEAU : Notifier les participants du nouveau programme
      try {
        await this.notificationService.notifierNouveauProgramme(programme.id_programme);
        console.log('✅ Participants notifiés du nouveau programme');
      } catch (notifError) {
        console.error('❌ Erreur envoi notification:', notifError);
        // Ne pas faire échouer la création si l'email échoue
      }

      // Récupérer le programme complet
      const programmeComplet = await this.getProgrammeComplet(programme.id_programme);

      res.status(201).json({
        success: true,
        message: 'Programme créé avec succès',
        data: programmeComplet,
        notificationSent: true
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la création du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de la création du programme' 
      });
    }
  }

  // Mettre à jour un programme ✨ MODIFIÉ avec notification
  async updateProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const updates = req.body;

      // Récupérer le programme avec l'événement
      const programme = await this.models.Programme.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Programme non trouvé' 
        });
      }

      // Vérifier les permissions
      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({ 
          success: false, 
          error: 'Accès refusé' 
        });
      }

      // Vérifier la cohérence des dates si modifiées
      if (updates.heure_debut || updates.heure_fin) {
        const debut = new Date(updates.heure_debut || programme.heure_debut);
        const fin = new Date(updates.heure_fin || programme.heure_fin);
        
        if (debut >= fin) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'L\'heure de début doit être antérieure à l\'heure de fin'
          });
        }

        // Vérifier les chevauchements
        const chevauchements = await this.verifierChevauchement(
          programme.id_evenement,
          debut,
          fin,
          id
        );

        if (chevauchements.length > 0) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            error: 'Ce créneau horaire entre en conflit avec d\'autres programmes',
            conflits: chevauchements.map(p => ({
              titre: p.titre,
              debut: p.heure_debut,
              fin: p.heure_fin
            }))
          });
        }
      }

      // Mettre à jour le programme
      const { intervenants, ...programmeUpdates } = updates;
      await programme.update(programmeUpdates, { transaction });

      // Mettre à jour les intervenants si fournis
      if (intervenants !== undefined) {
        // Supprimer tous les intervenants actuels
        await programme.setUsers([], { transaction });

        // Ajouter les nouveaux intervenants
        if (intervenants.length > 0) {
          const intervenantsValides = await this.models.User.findAll({
            where: { 
              id_user: { [Op.in]: intervenants },
              type_user: { [Op.ne]: 'visiteur' }
            }
          });

          if (intervenantsValides.length > 0) {
            await programme.addUsers(intervenantsValides, { transaction });
          }
        }
      }

      await transaction.commit();

      // ✨ NOUVEAU : Notifier les participants si changement important
      const changementsImportants = 
        updates.heure_debut || 
        updates.heure_fin || 
        updates.lieu_specifique || 
        updates.statut === 'annule' ||
        updates.statut === 'reporte';

      if (changementsImportants) {
        try {
          let typeModification = 'general';
          if (updates.statut === 'annule') typeModification = 'annule';
          else if (updates.statut === 'reporte') typeModification = 'reporte';
          else if (updates.heure_debut || updates.heure_fin) typeModification = 'horaire';
          else if (updates.lieu_specifique) typeModification = 'lieu';

          await this.notificationService.notifierModificationProgramme(
            id,
            typeModification
          );
          console.log('✅ Participants notifiés de la modification');
        } catch (notifError) {
          console.error('❌ Erreur envoi notification:', notifError);
        }
      }

      const programmeComplet = await this.getProgrammeComplet(id);

      res.json({
        success: true,
        message: 'Programme mis à jour avec succès',
        data: programmeComplet,
        notificationSent: changementsImportants
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la mise à jour du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
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
        return res.status(404).json({ 
          success: false, 
          error: 'Programme non trouvé' 
        });
      }

      // Vérifier les permissions
      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: 'Accès refusé' 
        });
      }

      // Réorganiser l'ordre des autres programmes
      await this.models.Programme.decrement('ordre', {
        where: {
          id_evenement: programme.id_evenement,
          ordre: { [Op.gt]: programme.ordre }
        },
        transaction
      });

      await programme.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Programme supprimé avec succès'
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la suppression du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // MÉTHODES AVANCÉES
  // ========================================================================

  // Réorganiser l'ordre des programmes
  async reorderProgrammes(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { evenementId } = req.params;
      const { programmes } = req.body; // [{id: 1, ordre: 1}, {id: 2, ordre: 2}, ...]

      // Vérifier que l'événement appartient à l'utilisateur
      const evenement = await this.models.Evenement.findOne({
        where: { 
          id_evenement: evenementId,
          id_user: req.user.id_user
        }
      });

      if (!evenement && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé ou accès refusé'
        });
      }

      // Mettre à jour l'ordre de chaque programme
      for (const prog of programmes) {
        await this.models.Programme.update(
          { ordre: prog.ordre },
          { 
            where: { 
              id_programme: prog.id,
              id_evenement: evenementId
            },
            transaction
          }
        );
      }

      await transaction.commit();

      // Récupérer la liste mise à jour
      const programmesUpdated = await this.models.Programme.findAll({
        where: { id_evenement: evenementId },
        order: [['ordre', 'ASC']],
        include: [
          { model: this.models.Lieu, attributes: ['nom'] },
          { model: this.models.User, as: 'Intervenants', attributes: ['nom', 'prenom'] }
        ]
      });

      res.json({
        success: true,
        message: 'Ordre des programmes mis à jour',
        data: programmesUpdated
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la réorganisation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Dupliquer un programme
  async duplicateProgramme(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { id } = req.params;
      const { heure_debut, heure_fin } = req.body;

      const programmeSource = await this.models.Programme.findByPk(id, {
        include: [
          { model: this.models.Evenement },
          { 
            model: this.models.User,
            as: 'Intervenants'
          }
        ]
      });

      if (!programmeSource) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Programme source non trouvé' 
        });
      }

      // Vérifier les permissions
      if (programmeSource.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({ 
          success: false, 
          error: 'Accès refusé' 
        });
      }

      // Vérifier les chevauchements si nouvelles heures fournies
      if (heure_debut && heure_fin) {
        const chevauchements = await this.verifierChevauchement(
          programmeSource.id_evenement,
          new Date(heure_debut),
          new Date(heure_fin)
        );

        if (chevauchements.length > 0) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            error: 'Le créneau choisi entre en conflit avec d\'autres programmes'
          });
        }
      }

      // Créer une copie du programme
      const nouveauProgramme = await this.models.Programme.create({
        titre: `${programmeSource.titre} (copie)`,
        description: programmeSource.description,
        id_evenement: programmeSource.id_evenement,
        id_lieu: programmeSource.id_lieu,
        heure_debut: heure_debut ? new Date(heure_debut) : programmeSource.heure_debut,
        heure_fin: heure_fin ? new Date(heure_fin) : programmeSource.heure_fin,
        lieu_specifique: programmeSource.lieu_specifique,
        ordre: programmeSource.ordre + 0.5, // Insérer après l'original
        statut: 'planifie',
        type_activite: programmeSource.type_activite,
        duree_estimee: programmeSource.duree_estimee,
        nb_participants_max: programmeSource.nb_participants_max,
        materiel_requis: programmeSource.materiel_requis,
        notes_organisateur: programmeSource.notes_organisateur
      }, { transaction });

      // Copier les intervenants
      if (programmeSource.Intervenants && programmeSource.Intervenants.length > 0) {
        await nouveauProgramme.setUsers(programmeSource.Intervenants, { transaction });
      }

      await transaction.commit();

      // Réorganiser les ordres
      await this.reorganiserOrdres(programmeSource.id_evenement);

      const programmeComplet = await this.getProgrammeComplet(nouveauProgramme.id_programme);

      res.status(201).json({
        success: true,
        message: 'Programme dupliqué avec succès',
        data: programmeComplet
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Erreur lors de la duplication:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // Mettre à jour le statut d'un programme ✨ MODIFIÉ avec notification
  async updateStatut(req, res) {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      const statutsValides = ['planifie', 'en_cours', 'termine', 'annule', 'reporte'];
      if (!statutsValides.includes(statut)) {
        return res.status(400).json({
          success: false,
          error: 'Statut invalide'
        });
      }

      const programme = await this.models.Programme.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        return res.status(404).json({ 
          success: false, 
          error: 'Programme non trouvé' 
        });
      }

      // Vérifier les permissions
      if (programme.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          error: 'Accès refusé' 
        });
      }

      await programme.update({ statut });

      // ✨ NOUVEAU : Notifier si annulation ou report
      if (statut === 'annule' || statut === 'reporte') {
        try {
          await this.notificationService.notifierModificationProgramme(
            id,
            statut
          );
          console.log(`✅ Participants notifiés: programme ${statut}`);
        } catch (notifError) {
          console.error('❌ Erreur envoi notification:', notifError);
        }
      }

      res.json({
        success: true,
        message: `Statut du programme mis à jour: ${statut}`,
        data: programme,
        notificationSent: statut === 'annule' || statut === 'reporte'
      });

    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
      });
    }
  }

  // ========================================================================
  // EXPORT ET UTILITAIRES
  // ========================================================================

  // Exporter le programme d'un événement
  async exportProgramme(req, res) {
    try {
      const { evenementId } = req.params;
      const { format = 'json' } = req.query;

      const evenement = await this.models.Evenement.findByPk(evenementId, {
        include: [
          { model: this.models.TypeEvenement },
          { model: this.models.Lieu }
        ]
      });

      if (!evenement) {
        return res.status(404).json({
          success: false,
          error: 'Événement non trouvé'
        });
      }

      const programmes = await this.models.Programme.findAll({
        where: { id_evenement: evenementId },
        include: [
          { model: this.models.Lieu },
          { model: this.models.User, as: 'Intervenants' }
        ],
        order: [['ordre', 'ASC'], ['heure_debut', 'ASC']]
      });

      if (format === 'csv') {
        // Export CSV
        const csv = this.convertProgrammesToCSV(evenement, programmes);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="programme-${evenementId}.csv"`);
        res.send('\uFEFF' + csv); // BOM pour UTF-8
      } else if (format === 'pdf') {
        // Export PDF (nécessite une librairie comme pdfkit)
        return res.status(501).json({
          success: false,
          error: 'Export PDF non encore implémenté'
        });
      } else {
        // Export JSON par défaut
        res.json({
          success: true,
          data: {
            evenement: {
              nom: evenement.nom_evenement,
              date_debut: evenement.date_debut,
              date_fin: evenement.date_fin,
              lieu: evenement.Lieu?.nom,
              type: evenement.TypeEvenement?.nom_type
            },
            programmes: programmes.map(p => ({
              ordre: p.ordre,
              titre: p.titre,
              description: p.description,
              heure_debut: p.heure_debut,
              heure_fin: p.heure_fin,
              lieu: p.Lieu?.nom || p.lieu_specifique,
              type_activite: p.type_activite,
              statut: p.statut,
              intervenants: p.Intervenants?.map(i => ({
                nom: i.nom,
                prenom: i.prenom,
                type: i.type_user
              }))
            }))
          }
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur' 
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
        { model: this.models.Lieu },
        { 
          model: this.models.User, 
          as: 'Intervenants',
          through: { attributes: [] }
        }
      ]
    });
  }

  async reorganiserOrdres(evenementId) {
    const programmes = await this.models.Programme.findAll({
      where: { id_evenement: evenementId },
      order: [['ordre', 'ASC']]
    });

    for (let i = 0; i < programmes.length; i++) {
      await programmes[i].update({ ordre: i + 1 });
    }
  }

  convertProgrammesToCSV(evenement, programmes) {
    const headers = ['Ordre', 'Titre', 'Description', 'Date', 'Heure début', 'Heure fin', 'Lieu', 'Type', 'Statut', 'Intervenants'];
    const rows = programmes.map(prog => [
      prog.ordre,
      `"${(prog.titre || '').replace(/"/g, '""')}"`,
      `"${(prog.description || '').replace(/"/g, '""')}"`,
      prog.heure_debut ? new Date(prog.heure_debut).toLocaleDateString('fr-FR') : '',
      prog.heure_debut ? new Date(prog.heure_debut).toLocaleTimeString('fr-FR') : '',
      prog.heure_fin ? new Date(prog.heure_fin).toLocaleTimeString('fr-FR') : '',
      `"${(prog.Lieu?.nom || prog.lieu_specifique || '').replace(/"/g, '""')}"`,
      prog.type_activite || '',
      prog.statut || 'planifie',
      `"${(prog.Intervenants?.map(i => `${i.prenom} ${i.nom}`).join(', ') || '').replace(/"/g, '""')}"`
    ]);

    return [
      `"Événement: ${evenement.nom_evenement}"`,
      `"Du ${evenement.date_debut ? new Date(evenement.date_debut).toLocaleDateString('fr-FR') : ''} au ${evenement.date_fin ? new Date(evenement.date_fin).toLocaleDateString('fr-FR') : ''}"`,
      `"Lieu: ${evenement.Lieu?.nom || ''}"`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
  }
}

module.exports = ProgrammeController;