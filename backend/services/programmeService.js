/**
 * ProgrammeService - Service pour les programmes d'événements
 * Gère : CRUD programmes, intervenants, réorganisation, export, traductions
 *
 * Architecture: Controller → Service → Repository → Database
 */
const BaseService = require('./core/baseService');
const { Op } = require('sequelize');
const { createMultiLang, mergeTranslations } = require('../helpers/i18n');

class ProgrammeService extends BaseService {
  constructor(repository, options = {}) {
    super(repository, options);
  }

  /** @returns {import('sequelize').Sequelize} */
  get sequelize() {
    return this.repository.model.sequelize;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  async getProgrammesByEvenement(evenementId, filters = {}) {
    const programmes = await this.repository.findByEvenement(evenementId, filters);
    return { programmes, byDay: this._groupByDay(programmes) };
  }

  async getProgrammeById(id) {
    return this._getProgrammeComplet(id);
  }

  async getExportData(evenementId) {
    return this.repository.findByEvenement(evenementId);
  }

  // ========================================================================
  // CRÉATION / MODIFICATION / SUPPRESSION
  // ========================================================================

  async createProgramme(evenementId, userId, lang, data) {
    const { titre, description, intervenants = [], id_lieu, ...rest } = data;

    const evenement = await this.models.Evenement.findByPk(evenementId);
    if (!evenement) return { error: 'evenementNotFound' };

    // Seul le propriétaire de l'événement peut gérer les programmes
    if (evenement.id_user !== userId) {
      return { error: 'forbidden' };
    }

    // Vérifier que l'événement est modifiable
    const unmodifiableStatuses = ['annule', 'termine'];
    if (unmodifiableStatuses.includes(evenement.statut)) {
      return { error: 'forbidden' };
    }

    if (id_lieu) {
      const lieu = await this.models.Lieu.findByPk(id_lieu);
      if (!lieu) return { error: 'lieuNotFound' };
    }

    const transaction = await this.sequelize.transaction();
    try {
      const programmeData = {
        titre: this._prepareMultiLang(titre, lang) || {},
        description: this._prepareMultiLang(description, lang) || { fr: '' },
        id_evenement: evenementId,
        id_lieu,
        ordre: rest.ordre || await this.repository.getNextOrdre(evenementId),
        statut: 'planifie',
        ...this._pickFields(rest, ['heure_debut', 'heure_fin', 'lieu_specifique', 'type_activite', 'duree_estimee', 'nb_participants_max', 'materiel_requis', 'notes_organisateur'])
      };

      // Convert ISO datetime to TIME for MySQL TIME columns
      if (programmeData.heure_debut) programmeData.heure_debut = this._toTimeOnly(programmeData.heure_debut);
      if (programmeData.heure_fin) programmeData.heure_fin = this._toTimeOnly(programmeData.heure_fin);

      const programme = await this.repository.create(programmeData, { transaction });

      // Résoudre chaque intervenant : cherche/crée dans table Intervenant
      for (const interv of intervenants) {
        const intervenantId = await this._resolveIntervenant(interv, transaction);

        await this.models.ProgrammeIntervenant.create({
          id_programme: programme.id_programme,
          id_intervenant: intervenantId,
          role_intervenant: interv.role || 'principal',
          sujet_intervention: interv.sujet,
          ordre_intervention: interv.ordre || 1,
          duree_intervention: interv.duree,
          statut_confirmation: 'en_attente'
        }, { transaction });
      }

      await transaction.commit();
      return { programme: await this._getProgrammeComplet(programme.id_programme) };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateProgramme(id, userId, lang, data) {
    const { titre, description, ...rest } = data;

    const allowedFields = ['id_lieu', 'lieu_specifique', 'heure_debut', 'heure_fin', 'type_activite', 'duree_estimee', 'nb_participants_max', 'materiel_requis', 'notes_organisateur', 'ordre'];
    const updates = {};
    allowedFields.forEach(f => { if (rest[f] !== undefined) updates[f] = rest[f]; });

    // Convert ISO datetime to TIME for MySQL TIME columns
    if (updates.heure_debut) updates.heure_debut = this._toTimeOnly(updates.heure_debut);
    if (updates.heure_fin) updates.heure_fin = this._toTimeOnly(updates.heure_fin);

    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement, as: 'Evenement' }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      // Vérifier que l'événement est modifiable
      const unmodifiableStatuses = ['annule', 'termine'];
      if (unmodifiableStatuses.includes(programme.Evenement.statut)) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      if (titre !== undefined) {
        updates.titre = typeof titre === 'object'
          ? mergeTranslations(programme.titre, titre)
          : mergeTranslations(programme.titre, { [lang]: titre });
      }
      if (description !== undefined) {
        updates.description = typeof description === 'object'
          ? mergeTranslations(programme.description, description)
          : mergeTranslations(programme.description, { [lang]: description });
      }

      await programme.update(updates, { transaction });
      await transaction.commit();

      return { programme: await this._getProgrammeComplet(id) };
    } catch (error) {
      try { await transaction.rollback(); } catch (e) { /* already rolled back */ }
      throw error;
    }
  }

  async deleteProgramme(id, userId) {
    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement, as: 'Evenement' }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      await this.models.ProgrammeIntervenant.destroy({
        where: { id_programme: id }, transaction
      });
      await programme.destroy({ transaction });

      await transaction.commit();
      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateStatut(id, userId, statut) {
    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement, as: 'Evenement' }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      const ancienStatut = programme.statut;

      // Validation des transitions de statut
      const validTransitions = {
        planifie: ['en_cours', 'annule', 'reporte'],
        en_cours: ['termine', 'annule'],
        reporte: ['planifie', 'annule'],
        termine: [],
        annule: []
      };
      const allowed = validTransitions[ancienStatut] || [];
      if (!allowed.includes(statut)) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      await programme.update({ statut }, { transaction });
      await transaction.commit();

      return {
        programme: {
          id_programme: programme.id_programme,
          titre: programme.titre,
          ancien_statut: ancienStatut,
          nouveau_statut: statut
        },
        shouldNotify: statut === 'annule' || statut === 'reporte'
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async duplicateProgramme(id, userId) {
    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement, as: 'Evenement' }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      const newProgramme = await this.repository.create({
        titre: programme.titre,
        description: programme.description,
        id_evenement: programme.id_evenement,
        id_lieu: programme.id_lieu,
        lieu_specifique: programme.lieu_specifique,
        ordre: await this.repository.getNextOrdre(programme.id_evenement),
        statut: 'planifie',
        type_activite: programme.type_activite,
        duree_estimee: programme.duree_estimee,
        nb_participants_max: programme.nb_participants_max,
        materiel_requis: programme.materiel_requis,
        notes_organisateur: programme.notes_organisateur
      }, { transaction });

      await transaction.commit();
      return { programme: await this._getProgrammeComplet(newProgramme.id_programme) };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async reorderProgrammes(evenementId, userId, programmes) {
    const evenement = await this.models.Evenement.findByPk(evenementId);
    if (!evenement) return { error: 'evenementNotFound' };

    if (evenement.id_user !== userId) {
      return { error: 'forbidden' };
    }

    const transaction = await this.sequelize.transaction();
    try {
      for (const item of programmes) {
        await this.repository.model.update(
          { ordre: item.ordre },
          { where: { id_programme: item.id, id_evenement: evenementId }, transaction }
        );
      }
      await transaction.commit();
      return { success: true };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ========================================================================
  // TRADUCTIONS
  // ========================================================================

  async getProgrammeTranslations(id) {
    return this.repository.findById(id);
  }

  async updateProgrammeTranslation(id, targetLang, { titre, description }) {
    const programme = await this.repository.findById(id);
    if (!programme) return null;

    const updates = {};
    if (titre) updates.titre = mergeTranslations(programme.titre, { [targetLang]: titre });
    if (description) updates.description = mergeTranslations(programme.description, { [targetLang]: description });

    if (Object.keys(updates).length === 0) return { empty: true };

    await programme.update(updates);
    return programme;
  }

  // ========================================================================
  // INTERVENANTS
  // ========================================================================

  async updateIntervenantStatus(programmeId, targetUserId, requestUserId, statut) {
    const validStatuts = ['en_attente', 'confirme', 'decline', 'annule'];
    if (!validStatuts.includes(statut)) {
      return { error: 'invalidStatus' };
    }

    const programme = await this.repository.model.findByPk(programmeId, {
      include: [{ model: this.models.Evenement, as: 'Evenement' }]
    });

    if (!programme) return { error: 'notFound' };

    const isEventOwner = programme.Evenement.id_user === requestUserId;
    const isIntervenant = targetUserId === requestUserId;

    if (!isEventOwner && !isIntervenant) {
      return { error: 'forbidden' };
    }

    // L'intervenant ne peut que confirmer ou décliner
    if (isIntervenant && !isEventOwner) {
      if (!['confirme', 'decline'].includes(statut)) {
        return { error: 'forbidden' };
      }
    }

    const pi = await this.models.ProgrammeIntervenant.findOne({
      where: { id_programme: programmeId, id_intervenant: targetUserId }
    });

    if (!pi) return { error: 'intervenantNotFound' };

    await pi.update({
      statut_confirmation: statut,
      date_confirmation: new Date()
    });

    return { success: true, data: pi };
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  async _getProgrammeComplet(id) {
    return this.repository.model.findByPk(id, {
      include: [
        { model: this.models.Lieu, as: 'Lieu' },
        {
          model: this.models.Intervenant,
          as: 'Intervenants',
          attributes: ['id_intervenant', 'nom', 'prenom', 'email', 'photo_url', 'biographie', 'id_user'],
          through: {
            attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 'ordre_intervention', 'duree_intervention', 'biographie_courte']
          },
          include: [{
            model: this.models.User,
            as: 'UserAccount',
            attributes: ['id_user', 'nom', 'prenom', 'photo_url', 'email'],
            required: false
          }]
        }
      ]
    });
  }

  /**
   * Résout un intervenant : cherche dans la table Intervenant par id ou email.
   * Si l'email correspond à un User existant, lie l'intervenant à ce User.
   * Crée un nouvel Intervenant si nécessaire.
   *
   * @param {Object} interv - { email, nom, prenom, id_intervenant, id_user, ... }
   * @param {Transaction} transaction
   * @returns {number} id_intervenant
   */
  async _resolveIntervenant(interv, transaction) {
    // Cas 1 : id_intervenant fourni directement
    if (interv.id_intervenant) {
      const existing = await this.models.Intervenant.findByPk(interv.id_intervenant, { transaction });
      if (existing) return existing.id_intervenant;
    }

    // Cas 2 : Chercher un intervenant existant par email
    if (interv.email) {
      const existing = await this.models.Intervenant.findOne({
        where: { email: interv.email },
        transaction
      });
      if (existing) return existing.id_intervenant;
    }

    // Cas 3 : Créer un nouvel Intervenant
    // Vérifier si un User existe avec cet email pour lier id_user
    let userId = interv.id_user || null;
    if (!userId && interv.email) {
      const user = await this.models.User.findOne({
        where: { email: interv.email },
        transaction
      });
      if (user) userId = user.id_user;
    }

    const newIntervenant = await this.models.Intervenant.create({
      nom: this._prepareMultiLang(interv.nom, 'fr') || { fr: '', ar: '' },
      prenom: this._prepareMultiLang(interv.prenom, 'fr') || { fr: '', ar: '' },
      email: interv.email || null,
      telephone: interv.telephone || null,
      biographie: interv.biographie ? this._prepareMultiLang(interv.biographie, 'fr') : null,
      id_user: userId,
      statut: 'actif'
    }, { transaction });

    return newIntervenant.id_intervenant;
  }

  /**
   * Envoie un email d'invitation à un intervenant nouvellement créé.
   */
  async _sendIntervenantInviteEmail(user, tempPassword) {
    try {
      const emailService = require('./emailService');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      await emailService.sendEmail({
        to: user.email,
        subject: 'Invitation - Vous êtes intervenant sur ActionCulture',
        html: `
          <h2>Bienvenue sur ActionCulture</h2>
          <p>Vous avez été ajouté comme intervenant dans un programme.</p>
          <p>Un compte a été créé pour vous :</p>
          <ul>
            <li><strong>Email :</strong> ${user.email}</li>
            <li><strong>Mot de passe temporaire :</strong> ${tempPassword}</li>
          </ul>
          <p><a href="${frontendUrl}/login">Se connecter</a></p>
          <p>Nous vous recommandons de changer votre mot de passe après la première connexion.</p>
        `
      });
    } catch (err) {
      console.error('Échec envoi mail intervenant:', err.message);
    }
  }

  _prepareMultiLang(value, lang = 'fr') {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value;
    return createMultiLang(value, lang);
  }

  _pickFields(obj, fields) {
    const result = {};
    fields.forEach(f => { if (obj[f] !== undefined) result[f] = obj[f]; });
    return result;
  }

  /**
   * Convertit une valeur ISO datetime ou datetime en format TIME (HH:MM:SS)
   * pour stockage dans une colonne TIME de MySQL.
   */
  _toTimeOnly(value) {
    if (!value) return value;
    const str = String(value);
    // Already TIME format (HH:MM or HH:MM:SS)
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) return str;
    // Extract time from ISO format (2026-12-01T09:00:00Z)
    const match = str.match(/T(\d{2}:\d{2}:\d{2})/);
    if (match) return match[1];
    // Try parsing as Date and extract UTC time
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().slice(11, 19);
    return value;
  }

  _groupByDay(programmes) {
    const byDay = {};
    programmes.forEach(p => {
      if (p.heure_debut) {
        const date = new Date(p.heure_debut).toLocaleDateString('fr-FR');
        if (!byDay[date]) byDay[date] = [];
        byDay[date].push(p);
      }
    });
    return byDay;
  }

  formatProgrammesToCSV(programmes) {
    let csv = 'Date,Heure début,Heure fin,Titre,Description,Lieu,Type,Intervenants\n';
    const escapeCsv = (field) => {
      if (!field) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    programmes.forEach(p => {
      const date = p.heure_debut ? new Date(p.heure_debut).toLocaleDateString('fr-FR') : '';
      const heureDebut = p.heure_debut ? new Date(p.heure_debut).toLocaleTimeString('fr-FR') : '';
      const heureFin = p.heure_fin ? new Date(p.heure_fin).toLocaleTimeString('fr-FR') : '';
      const lieu = p.Lieu?.nom || p.lieu_specifique || '';
      const intervenants = p.Intervenants?.map(i => `${i.prenom} ${i.nom}`).join('; ') || '';
      csv += `${escapeCsv(date)},${escapeCsv(heureDebut)},${escapeCsv(heureFin)},${escapeCsv(p.titre)},${escapeCsv(p.description)},${escapeCsv(lieu)},${escapeCsv(p.type_activite)},${escapeCsv(intervenants)}\n`;
    });
    return csv;
  }
}

module.exports = ProgrammeService;
