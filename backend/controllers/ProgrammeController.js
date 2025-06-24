// controllers/ProgrammeController.js - Version complète avec toutes les méthodes
const { Op } = require('sequelize');
const NotificationService = require('../services/NotificationService');

class ProgrammeController {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
    this.notificationService = new NotificationService(models);
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
            as: 'Lieu',  // Ajout de l'alias
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
            as: 'Lieu',  // Alias obligatoire
            attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typeLieu']
            // Retirer les includes imbriqués qui peuvent causer des erreurs
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

  // Exporter le programme d'un événement
  async exportProgramme(req, res) {
    try {
      const { evenementId } = req.params;
      const { format = 'json' } = req.query;

      // Récupérer tous les programmes avec leurs relations
      const programmes = await this.models.Programme.findAll({
        where: { id_evenement: evenementId },
        include: [
          {
            model: this.models.Evenement,
            attributes: ['nom_evenement', 'date_debut', 'date_fin']
          },
          {
            model: this.models.Lieu,
            as: 'Lieu',  // Ajout de l'alias
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
          error: 'Aucun programme trouvé pour cet événement'
        });
      }

      // Formatter selon le format demandé
      switch (format) {
        case 'csv':
          const csv = this.formatProgrammesToCSV(programmes);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="programme-${evenementId}.csv"`);
          res.send(csv);
          break;

        case 'pdf':
          // TODO: Implémenter l'export PDF avec une librairie comme pdfkit ou puppeteer
          res.status(501).json({
            success: false,
            error: 'Export PDF non encore implémenté'
          });
          break;

        case 'json':
        default:
          res.json({
            success: true,
            data: {
              evenement: programmes[0]?.Evenement || null,
              programmes: programmes.map(p => ({
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
            }
          });
      }

    } catch (error) {
      console.error('Erreur lors de l\'export du programme:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur lors de l\'export' 
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
              heure_debut: {
                [Op.between]: [heure_debut, heure_fin]
              }
            },
            {
              heure_fin: {
                [Op.between]: [heure_debut, heure_fin]
              }
            },
            {
              [Op.and]: [
                { heure_debut: { [Op.lte]: heure_debut } },
                { heure_fin: { [Op.gte]: heure_fin } }
              ]
            },
            {
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

  // Créer un nouveau programme
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
        intervenants = [] // Array de {id_user, role_intervenant, ...}
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
        
        if (debut >= fin) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'L\'heure de début doit être antérieure à l\'heure de fin'
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

      // Ajouter les intervenants (Users) si fournis
      if (intervenants.length > 0) {
        // Vérifier que les users existent et ne sont pas des visiteurs
        const userIds = intervenants.map(i => i.id_user);
        const usersValides = await this.models.User.findAll({
          where: { 
            id_user: { [Op.in]: userIds },
            id_type_user: { [Op.ne]: 'visiteur' }  // Utiliser id_type_user
          }
        });

        if (usersValides.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Aucun intervenant valide trouvé'
          });
        }

        // Créer les associations dans ProgrammeIntervenant
        for (const intervenant of intervenants) {
          const userValide = usersValides.find(u => u.id_user === intervenant.id_user);
          if (userValide) {
            await this.models.ProgrammeIntervenant.create({
              id_programme: programme.id_programme,
              id_user: intervenant.id_user,
              role_intervenant: intervenant.role_intervenant || 'principal',
              sujet_intervention: intervenant.sujet_intervention,
              biographie_courte: intervenant.biographie_courte,
              ordre_intervention: intervenant.ordre_intervention || 0,
              duree_intervention: intervenant.duree_intervention,
              honoraires: intervenant.honoraires,
              frais_deplacement: intervenant.frais_deplacement,
              logement_requis: intervenant.logement_requis || false,
              materiel_technique: intervenant.materiel_technique,
              statut_confirmation: 'en_attente'
            }, { transaction });
          }
        }
      }

      await transaction.commit();

      // Notifier les participants du nouveau programme
      try {
        await this.notificationService.notifierNouveauProgramme(programme.id_programme);
        console.log('✅ Participants notifiés du nouveau programme');
      } catch (notifError) {
        console.error('❌ Erreur envoi notification:', notifError);
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

  // Mettre à jour un programme
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
            conflits: chevauchements
          });
        }
      }

      // Mettre à jour le programme
      const { intervenants, ...programmeUpdates } = updates;
      await programme.update(programmeUpdates, { transaction });

      // Mettre à jour les intervenants si fournis
      if (intervenants !== undefined) {
        // Supprimer tous les intervenants actuels
        await this.models.ProgrammeIntervenant.destroy({
          where: { id_programme: id },
          transaction
        });

        // Ajouter les nouveaux intervenants
        if (intervenants.length > 0) {
          const userIds = intervenants.map(i => i.id_user);
          const usersValides = await this.models.User.findAll({
            where: { 
              id_user: { [Op.in]: userIds },
              id_type_user: { [Op.ne]: 'visiteur' }  // Utiliser id_type_user
            }
          });

          for (const intervenant of intervenants) {
            const userValide = usersValides.find(u => u.id_user === intervenant.id_user);
            if (userValide) {
              await this.models.ProgrammeIntervenant.create({
                id_programme: id,
                id_user: intervenant.id_user,
                role_intervenant: intervenant.role_intervenant || 'principal',
                sujet_intervention: intervenant.sujet_intervention,
                biographie_courte: intervenant.biographie_courte,
                ordre_intervention: intervenant.ordre_intervention || 0,
                duree_intervention: intervenant.duree_intervention,
                honoraires: intervenant.honoraires,
                frais_deplacement: intervenant.frais_deplacement,
                logement_requis: intervenant.logement_requis || false,
                materiel_technique: intervenant.materiel_technique,
                statut_confirmation: intervenant.statut_confirmation || 'en_attente'
              }, { transaction });
            }
          }
        }
      }

      await transaction.commit();

      // Notifier si changement important
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

          await this.notificationService.notifierModificationProgramme(id, typeModification);
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

  // Réorganiser l'ordre des programmes
  async reorderProgrammes(req, res) {
    const transaction = await this.sequelize.transaction();

    try {
      const { evenementId } = req.params;
      const { programmes } = req.body; // Array de {id, ordre}

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
          error: 'Accès refusé'
        });
      }

      // Vérifier que tous les programmes appartiennent bien à cet événement
      const programmeIds = programmes.map(p => p.id);
      const programmesExistants = await this.models.Programme.findAll({
        where: {
          id_programme: { [Op.in]: programmeIds },
          id_evenement: evenementId
        }
      });

      if (programmesExistants.length !== programmes.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Certains programmes n\'appartiennent pas à cet événement'
        });
      }

      // Mettre à jour l'ordre de chaque programme
      for (const { id, ordre } of programmes) {
        await this.models.Programme.update(
          { ordre },
          { 
            where: { 
              id_programme: id,
              id_evenement: evenementId 
            },
            transaction 
          }
        );
      }

      await transaction.commit();

      // Récupérer les programmes réorganisés
      const programmesReordonnes = await this.models.Programme.findAll({
        where: { id_evenement: evenementId },
        order: [['ordre', 'ASC']],
        include: [
          { 
            model: this.models.Lieu, 
            as: 'Lieu',  // Ajout de l'alias
            attributes: ['nom'] 
          },
          { 
            model: this.models.User, 
            as: 'Intervenants',
            attributes: ['nom', 'prenom']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Ordre des programmes mis à jour',
        data: programmesReordonnes
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

      // Récupérer le programme à dupliquer
      const programmeOriginal = await this.models.Programme.findByPk(id, {
        include: [
          { model: this.models.Evenement },
          {
            model: this.models.User,
            as: 'Intervenants',
            through: { 
              model: this.models.ProgrammeIntervenant
            }
          }
        ]
      });

      if (!programmeOriginal) {
        await transaction.rollback();
        return res.status(404).json({ 
          success: false, 
          error: 'Programme non trouvé' 
        });
      }

      // Vérifier les permissions
      if (programmeOriginal.Evenement.id_user !== req.user.id_user && !req.user.isAdmin) {
        await transaction.rollback();
        return res.status(403).json({ 
          success: false, 
          error: 'Accès refusé' 
        });
      }

      // Préparer les nouvelles dates
      const nouvelleHeureDebut = heure_debut ? new Date(heure_debut) : null;
      const nouvelleHeureFin = heure_fin ? new Date(heure_fin) : null;

      // Vérifier les chevauchements si des dates sont fournies
      if (nouvelleHeureDebut && nouvelleHeureFin) {
        const chevauchements = await this.verifierChevauchement(
          programmeOriginal.id_evenement,
          nouvelleHeureDebut,
          nouvelleHeureFin
        );

        if (chevauchements.length > 0) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            error: 'Le créneau horaire choisi entre en conflit avec d\'autres programmes'
          });
        }
      }

      // Déterminer l'ordre du nouveau programme
      const maxOrdre = await this.models.Programme.max('ordre', {
        where: { id_evenement: programmeOriginal.id_evenement }
      });

      // Créer la copie du programme
      const nouveauProgramme = await this.models.Programme.create({
        titre: `${programmeOriginal.titre} (copie)`,
        description: programmeOriginal.description,
        id_evenement: programmeOriginal.id_evenement,
        id_lieu: programmeOriginal.id_lieu,
        heure_debut: nouvelleHeureDebut || programmeOriginal.heure_debut,
        heure_fin: nouvelleHeureFin || programmeOriginal.heure_fin,
        lieu_specifique: programmeOriginal.lieu_specifique,
        ordre: (maxOrdre || 0) + 1,
        statut: 'planifie',
        type_activite: programmeOriginal.type_activite,
        duree_estimee: programmeOriginal.duree_estimee,
        nb_participants_max: programmeOriginal.nb_participants_max,
        materiel_requis: programmeOriginal.materiel_requis,
        notes_organisateur: programmeOriginal.notes_organisateur
      }, { transaction });

      // Copier les intervenants
      if (programmeOriginal.Intervenants && programmeOriginal.Intervenants.length > 0) {
        for (const intervenant of programmeOriginal.Intervenants) {
          await this.models.ProgrammeIntervenant.create({
            id_programme: nouveauProgramme.id_programme,
            id_user: intervenant.id_user,
            role_intervenant: intervenant.ProgrammeIntervenant.role_intervenant,
            sujet_intervention: intervenant.ProgrammeIntervenant.sujet_intervention,
            biographie_courte: intervenant.ProgrammeIntervenant.biographie_courte,
            ordre_intervention: intervenant.ProgrammeIntervenant.ordre_intervention,
            duree_intervention: intervenant.ProgrammeIntervenant.duree_intervention,
            honoraires: intervenant.ProgrammeIntervenant.honoraires,
            frais_deplacement: intervenant.ProgrammeIntervenant.frais_deplacement,
            logement_requis: intervenant.ProgrammeIntervenant.logement_requis,
            materiel_technique: intervenant.ProgrammeIntervenant.materiel_technique,
            statut_confirmation: 'en_attente'
          }, { transaction });
        }
      }

      await transaction.commit();

      // Récupérer le programme dupliqué complet
      const programmeDuplique = await this.getProgrammeComplet(nouveauProgramme.id_programme);

      res.status(201).json({
        success: true,
        message: 'Programme dupliqué avec succès',
        data: programmeDuplique
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

      // Enregistrer l'ancien statut pour les notifications
      const ancienStatut = programme.statut;

      // Mettre à jour le statut
      await programme.update({ statut }, { transaction });

      await transaction.commit();

      // Notifier si changement important
      if (statut === 'annule' || statut === 'reporte') {
        try {
          await this.notificationService.notifierModificationProgramme(
            id, 
            statut === 'annule' ? 'annule' : 'reporte'
          );
          console.log(`✅ Participants notifiés du changement de statut: ${statut}`);
        } catch (notifError) {
          console.error('❌ Erreur envoi notification:', notifError);
        }
      }

      res.json({
        success: true,
        message: `Statut du programme mis à jour: ${ancienStatut} → ${statut}`,
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
        { 
          model: this.models.Lieu,
          as: 'Lieu'  // Ajout de l'alias
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

  async reorganiserOrdres(evenementId) {
    const programmes = await this.models.Programme.findAll({
      where: { id_evenement: evenementId },
      order: [['ordre', 'ASC']]
    });

    for (let i = 0; i < programmes.length; i++) {
      await programmes[i].update({ ordre: i + 1 });
    }
  }

  formatProgrammesToCSV(programmes) {
    // En-têtes CSV
    let csv = 'Date,Heure début,Heure fin,Titre,Description,Lieu,Type,Intervenants\n';
    
    // Lignes de données
    programmes.forEach(p => {
      const date = p.heure_debut ? new Date(p.heure_debut).toLocaleDateString('fr-FR') : '';
      const heureDebut = p.heure_debut ? new Date(p.heure_debut).toLocaleTimeString('fr-FR') : '';
      const heureFin = p.heure_fin ? new Date(p.heure_fin).toLocaleTimeString('fr-FR') : '';
      const lieu = p.Lieu?.nom || p.lieu_specifique || '';
      const intervenants = p.Intervenants?.map(i => `${i.prenom} ${i.nom}`).join('; ') || '';
      
      // Échapper les guillemets et entourer les champs contenant des virgules
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