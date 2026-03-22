/**
 * ProgrammeService - Service pour les programmes d'événements
 * Gère : CRUD programmes, intervenants, réorganisation, export, traductions
 *
 * Architecture: Controller → Service → Repository → Database
 */
const BaseService = require('./core/baseService');
const { Op } = require('sequelize');
const { createMultiLang, mergeTranslations } = require('../helpers/i18n');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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

  async createProgramme(evenementId, userId, isAdmin, lang, data) {
    const { titre, description, intervenants = [], id_lieu, ...rest } = data;

    const evenement = await this.models.Evenement.findByPk(evenementId);
    if (!evenement) return { error: 'evenementNotFound' };

    if (evenement.id_user !== userId && !isAdmin) {
      return { error: 'forbidden' };
    }

    if (id_lieu) {
      const lieu = await this.models.Lieu.findByPk(id_lieu);
      if (!lieu) return { error: 'lieuNotFound' };
    }

    const transaction = await this.sequelize.transaction();
    try {
      const programmeData = {
        titre: this._prepareMultiLang(titre, lang),
        description: this._prepareMultiLang(description, lang),
        id_evenement: evenementId,
        id_lieu,
        ordre: rest.ordre || await this.repository.getNextOrdre(evenementId),
        statut: 'planifie',
        ...this._pickFields(rest, ['heure_debut', 'heure_fin', 'lieu_specifique', 'type_activite', 'duree_estimee', 'nb_participants_max', 'materiel_requis', 'notes_organisateur'])
      };

      const programme = await this.repository.create(programmeData, { transaction });

      // Résoudre chaque intervenant : toujours un User
      for (const interv of intervenants) {
        const userId = await this._resolveIntervenantAsUser(interv, transaction);

        await this.models.ProgrammeIntervenant.create({
          id_programme: programme.id_programme,
          id_user: userId,
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

  async updateProgramme(id, userId, isAdmin, lang, data) {
    const { titre, description, ...rest } = data;

    const allowedFields = ['id_lieu', 'lieu_specifique', 'heure_debut', 'heure_fin', 'type_activite', 'duree_estimee', 'nb_participants_max', 'materiel_requis', 'notes_organisateur', 'ordre', 'intervenants'];
    const updates = {};
    allowedFields.forEach(f => { if (rest[f] !== undefined) updates[f] = rest[f]; });

    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId && !isAdmin) {
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

  async deleteProgramme(id, userId, isAdmin) {
    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId && !isAdmin) {
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

  async updateStatut(id, userId, isAdmin, statut) {
    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId && !isAdmin) {
        await transaction.rollback();
        return { error: 'forbidden' };
      }

      const ancienStatut = programme.statut;
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

  async duplicateProgramme(id, userId, isAdmin) {
    const transaction = await this.sequelize.transaction();
    try {
      const programme = await this.repository.model.findByPk(id, {
        include: [{ model: this.models.Evenement }]
      });

      if (!programme) {
        await transaction.rollback();
        return { error: 'notFound' };
      }

      if (programme.Evenement.id_user !== userId && !isAdmin) {
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

  async reorderProgrammes(evenementId, userId, isAdmin, programmes) {
    const evenement = await this.models.Evenement.findByPk(evenementId);
    if (!evenement) return { error: 'evenementNotFound' };

    if (evenement.id_user !== userId && !isAdmin) {
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
  // HELPERS
  // ========================================================================

  async _getProgrammeComplet(id) {
    return this.repository.model.findByPk(id, {
      include: [
        { model: this.models.Lieu, as: 'Lieu' },
        {
          model: this.models.User,
          as: 'Intervenants',
          attributes: ['id_user', 'prenom', 'nom', 'email', 'photo_url'],
          through: {
            attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 'ordre_intervention', 'duree_intervention', 'biographie_courte']
          }
        }
      ]
    });
  }

  /**
   * Résout un intervenant : cherche dans User, sinon crée un compte User.
   * Génère un mot de passe temporaire et envoie un email d'invitation.
   *
   * @param {Object} interv - { email, nom, prenom, id_user, ... }
   * @param {Transaction} transaction
   * @returns {number} id_user
   */
  async _resolveIntervenantAsUser(interv, transaction) {
    // Cas 1 : id_user fourni directement
    if (interv.id_user) {
      const user = await this.models.User.findByPk(interv.id_user, { transaction });
      if (user) return user.id_user;
    }

    // Cas 2 : Chercher par email
    if (interv.email) {
      const user = await this.models.User.findOne({
        where: { email: interv.email },
        transaction
      });
      if (user) return user.id_user;
    }

    // Cas 3 : Pas trouvé → créer un nouveau User
    if (!interv.email) {
      throw new Error('Email obligatoire pour créer un intervenant');
    }

    const tempPassword = crypto.randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newUser = await this.models.User.create({
      nom: this._prepareMultiLang(interv.nom, 'fr') || { fr: '', ar: '' },
      prenom: this._prepareMultiLang(interv.prenom, 'fr') || { fr: '', ar: '' },
      email: interv.email,
      password: hashedPassword,
      id_type_user: 1,
      statut: 'actif',
      accepte_conditions: true
    }, { transaction });

    // Envoyer le mail d'invitation en arrière-plan (ne pas bloquer la transaction)
    setImmediate(() => {
      this._sendIntervenantInviteEmail(newUser, tempPassword).catch(err => {
        console.error('Erreur envoi mail intervenant:', err.message);
      });
    });

    return newUser.id_user;
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
