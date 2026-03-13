/**
 * ProgrammeService - Service pour les programmes d'événements
 * Gère : CRUD programmes, intervenants, réorganisation, export, traductions
 */
const { Op } = require('sequelize');
const { createMultiLang, mergeTranslations } = require('../helpers/i18n');

class ProgrammeService {
  constructor(models) {
    this.models = models;
    this.sequelize = models.sequelize || Object.values(models)[0]?.sequelize;
  }

  // ========================================================================
  // LECTURE
  // ========================================================================

  async getProgrammesByEvenement(evenementId, { date, type_activite } = {}) {
    const where = { id_evenement: evenementId };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.heure_debut = { [Op.gte]: startDate, [Op.lt]: endDate };
    }
    if (type_activite) where.type_activite = type_activite;

    const programmes = await this.models.Programme.findAll({
      where,
      include: [
        {
          model: this.models.Lieu, as: 'Lieu',
          attributes: ['nom', 'adresse', 'latitude', 'longitude']
        },
        {
          model: this.models.User,
          through: {
            model: this.models.ProgrammeIntervenant,
            attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 'ordre_intervention', 'duree_intervention']
          },
          attributes: ['id_user', 'nom', 'prenom', 'id_type_user', 'photo_url', 'email', 'telephone', 'entreprise', 'biographie'],
          as: 'Intervenants'
        }
      ],
      order: [['ordre', 'ASC'], ['heure_debut', 'ASC']]
    });

    return { programmes, byDay: this._groupByDay(programmes) };
  }

  async getProgrammeById(id) {
    return this.models.Programme.findByPk(id, {
      include: [
        {
          model: this.models.Evenement,
          attributes: ['nom_evenement', 'date_debut', 'date_fin', 'id_user']
        },
        {
          model: this.models.Lieu, as: 'Lieu',
          attributes: ['id_lieu', 'nom', 'adresse', 'latitude', 'longitude', 'typeLieu']
        },
        {
          model: this.models.User,
          through: {
            model: this.models.ProgrammeIntervenant,
            attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 'biographie_courte', 'honoraires', 'frais_deplacement']
          },
          attributes: ['id_user', 'nom', 'prenom', 'id_type_user', 'biographie', 'photo_url', 'email', 'telephone', 'entreprise'],
          as: 'Intervenants'
        }
      ]
    });
  }

  async getExportData(evenementId) {
    return this.models.Programme.findAll({
      where: { id_evenement: evenementId },
      include: [
        { model: this.models.Evenement, attributes: ['nom_evenement', 'date_debut', 'date_fin'] },
        { model: this.models.Lieu, as: 'Lieu', attributes: ['nom', 'adresse'] },
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
      order: [['ordre', 'ASC'], ['heure_debut', 'ASC']]
    });
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
      const programme = await this.models.Programme.create({
        titre: this._prepareMultiLang(titre, lang),
        description: this._prepareMultiLang(description, lang),
        id_evenement: evenementId,
        id_lieu,
        ordre: rest.ordre || await this._getNextOrdre(evenementId),
        statut: 'planifie',
        ...this._pickFields(rest, ['heure_debut', 'heure_fin', 'lieu_specifique', 'type_activite', 'duree_estimee', 'nb_participants_max', 'materiel_requis', 'notes_organisateur'])
      }, { transaction });

      for (const interv of intervenants) {
        await this.models.ProgrammeIntervenant.create({
          id_programme: programme.id_programme,
          id_user: interv.id_user,
          role_intervenant: interv.role || 'intervenant',
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
      const programme = await this.models.Programme.findByPk(id, {
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
      const programme = await this.models.Programme.findByPk(id, {
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
      const programme = await this.models.Programme.findByPk(id, {
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
      const programme = await this.models.Programme.findByPk(id, {
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

      const newProgramme = await this.models.Programme.create({
        titre: programme.titre,
        description: programme.description,
        id_evenement: programme.id_evenement,
        id_lieu: programme.id_lieu,
        lieu_specifique: programme.lieu_specifique,
        ordre: await this._getNextOrdre(programme.id_evenement),
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
        await this.models.Programme.update(
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
    return this.models.Programme.findByPk(id, {
      attributes: ['id_programme', 'titre', 'description']
    });
  }

  async updateProgrammeTranslation(id, targetLang, { titre, description }) {
    const programme = await this.models.Programme.findByPk(id);
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
    return this.models.Programme.findByPk(id, {
      include: [
        { model: this.models.Lieu, as: 'Lieu' },
        {
          model: this.models.User, as: 'Intervenants',
          through: {
            attributes: ['role_intervenant', 'statut_confirmation', 'sujet_intervention', 'ordre_intervention', 'duree_intervention', 'biographie_courte']
          }
        }
      ]
    });
  }

  async _getNextOrdre(evenementId) {
    const maxOrdre = await this.models.Programme.max('ordre', {
      where: { id_evenement: evenementId }
    });
    return (maxOrdre || 0) + 1;
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
