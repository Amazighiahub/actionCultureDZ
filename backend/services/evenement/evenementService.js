/**
 * EvenementService - Logique métier pour les événements
 * Architecture: Controller → Service → Repository → Database
 */

const BaseService = require('../core/baseService');
const EvenementDTO = require('../../dto/evenement/evenementDTO');

class EvenementService extends BaseService {
  constructor(evenementRepository, options = {}) {
    super(evenementRepository, options);
  }

  // ============================================================================
  // LECTURE
  // ============================================================================

  /**
   * Liste des événements publiés
   */
  async findPublished(options = {}) {
    const result = await this.repository.findPublished(options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Événements à venir
   */
  async findUpcoming(options = {}) {
    const result = await this.repository.findUpcoming(options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Détail complet d'un événement
   */
  async findWithFullDetails(id) {
    const evenement = await this.repository.findWithFullDetails(id);
    if (!evenement) {
      throw this._notFoundError(id);
    }
    return EvenementDTO.fromEntity(evenement);
  }

  /**
   * Événements associés à une œuvre
   */
  async findByOeuvre(oeuvreId) {
    const evenements = await this.repository.findByOeuvre(oeuvreId);
    return EvenementDTO.fromEntities(evenements);
  }

  /**
   * Événements par organisateur
   */
  async findByOrganisateur(userId, options = {}) {
    const result = await this.repository.findByOrganisateur(userId, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Recherche
   */
  async search(query, options = {}) {
    if (!query || query.length < 2) {
      throw this._validationError('Requête de recherche trop courte (min 2 caractères)');
    }
    const result = await this.repository.searchEvenements(query, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Par wilaya
   */
  async findByWilaya(wilayaId, options = {}) {
    const result = await this.repository.findByWilaya(wilayaId, options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Tous les événements (admin)
   */
  async findAll(options = {}) {
    const result = await this.repository.findAll({
      ...options,
      include: this.repository._defaultIncludes(),
      order: [['date_creation', 'DESC']]
    });
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  // ============================================================================
  // ÉCRITURE
  // ============================================================================

  /**
   * Créer un événement
   */
  async create(data, userId) {
    if (!data.nom_evenement && !data.nom) {
      throw this._validationError('Le nom de l\'événement est requis');
    }

    const lieuId = data.id_lieu || data.lieuId;
    if (lieuId && this.models?.Lieu) {
      const lieu = await this.models.Lieu.findByPk(lieuId);
      if (!lieu) throw this._validationError('Le lieu spécifié n\'existe pas');
    }

    const typeId = data.id_type_evenement || data.typeEvenementId;
    if (typeId && this.models?.TypeEvenement) {
      const type = await this.models.TypeEvenement.findByPk(typeId);
      if (!type) throw this._validationError('Le type d\'événement spécifié n\'existe pas');
    }

    const entityData = {
      nom_evenement: data.nom_evenement || data.nom,
      description: data.description || {},
      date_debut: data.date_debut || data.dateDebut,
      date_fin: data.date_fin || data.dateFin,
      id_lieu: data.id_lieu || data.lieuId,
      id_type_evenement: data.id_type_evenement || data.typeEvenementId,
      statut: data.statut || 'brouillon',
      capacite_max: data.capacite_max || data.capaciteMax,
      tarif: data.tarif || 0,
      inscription_requise: data.inscription_requise || data.inscriptionRequise || false,
      contact_email: data.contact_email || data.contactEmail,
      contact_telephone: data.contact_telephone || data.contactTelephone,
      url_virtuel: data.url_virtuel || data.urlVirtuel,
      image_url: data.image_url || data.imageUrl,
      age_minimum: data.age_minimum || data.ageMinimum,
      accessibilite: data.accessibilite || {},
      certificat_delivre: data.certificat_delivre || data.certificatDelivre || false,
      date_limite_inscription: data.date_limite_inscription || data.dateLimiteInscription,
      id_user: userId
    };

    const evenement = await this.repository.create(entityData);
    const full = await this.repository.findWithFullDetails(evenement.id_evenement);

    this.logger.info(`Événement créé: ${evenement.id_evenement} par user: ${userId}`);

    return EvenementDTO.fromEntity(full);
  }

  /**
   * Modifier un événement
   */
  async update(id, data, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    // Vérifier propriété
    if (existing.id_user !== userId) {
      throw this._forbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    const updateData = {};
    if (data.nom_evenement || data.nom) updateData.nom_evenement = data.nom_evenement || data.nom;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date_debut || data.dateDebut) updateData.date_debut = data.date_debut || data.dateDebut;
    if (data.date_fin || data.dateFin) updateData.date_fin = data.date_fin || data.dateFin;
    if (data.id_lieu || data.lieuId) updateData.id_lieu = data.id_lieu || data.lieuId;
    if (data.id_type_evenement || data.typeEvenementId) updateData.id_type_evenement = data.id_type_evenement || data.typeEvenementId;
    if (data.statut) updateData.statut = data.statut;
    if (data.capacite_max || data.capaciteMax) updateData.capacite_max = data.capacite_max || data.capaciteMax;
    if (data.tarif !== undefined) updateData.tarif = data.tarif;
    if (data.image_url || data.imageUrl) updateData.image_url = data.image_url || data.imageUrl;
    if (data.contact_email || data.contactEmail) updateData.contact_email = data.contact_email || data.contactEmail;
    if (data.contact_telephone || data.contactTelephone) updateData.contact_telephone = data.contact_telephone || data.contactTelephone;

    await this.repository.update(id, updateData);
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Événement modifié: ${id} par user: ${userId}`);

    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Supprimer un événement
   */
  async delete(id, userId) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw this._notFoundError(id);
    }

    if (existing.id_user !== userId) {
      throw this._forbiddenError('Vous ne pouvez supprimer que vos propres événements');
    }

    await this.repository.delete(id);
    this.logger.info(`Événement supprimé: ${id} par user: ${userId}`);
    return true;
  }

  // ============================================================================
  // INSCRIPTION / PARTICIPANTS
  // ============================================================================

  /**
   * Inscrire un participant
   */
  async registerParticipant(evenementId, userId) {
    const evenement = await this.repository.findById(evenementId);
    if (!evenement) {
      throw this._notFoundError(evenementId);
    }

    if (evenement.date_limite_inscription && new Date() > new Date(evenement.date_limite_inscription)) {
      throw this._validationError('La date limite d\'inscription est dépassée');
    }

    const registration = await this.withTransaction(async (transaction) => {
      if (evenement.capacite_max) {
        const count = await this.repository.countParticipants(evenementId, { transaction });
        if (count >= evenement.capacite_max) {
          throw this._validationError('L\'événement est complet');
        }
      }

      return this.repository.registerParticipant(evenementId, userId, { transaction });
    });

    this.logger.info(`Participant inscrit: user ${userId} → événement ${evenementId}`);
    return registration;
  }

  /**
   * Désinscrire un participant
   */
  async unregisterParticipant(evenementId, userId) {
    const result = await this.repository.unregisterParticipant(evenementId, userId);
    if (!result) {
      throw this._notFoundError(evenementId);
    }
    this.logger.info(`Participant désinscrit: user ${userId} → événement ${evenementId}`);
    return true;
  }

  // ============================================================================
  // MODÉRATION
  // ============================================================================

  /**
   * Événements en attente
   */
  async findPending(options = {}) {
    const result = await this.repository.findPending(options);
    return {
      data: EvenementDTO.fromEntities(result.data),
      pagination: result.pagination
    };
  }

  /**
   * Publier un événement
   */
  async publish(id, adminId) {
    const evenement = await this.repository.findById(id);
    if (!evenement) throw this._notFoundError(id);

    await this.repository.update(id, { statut: 'publie' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Événement publié: ${id} par admin: ${adminId}`);
    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Annuler un événement
   */
  async cancel(id, adminId, motif) {
    const evenement = await this.repository.findById(id);
    if (!evenement) throw this._notFoundError(id);

    await this.repository.update(id, { statut: 'annule' });
    const updated = await this.repository.findWithFullDetails(id);

    this.logger.info(`Événement annulé: ${id} par admin: ${adminId}, motif: ${motif}`);
    return EvenementDTO.fromEntity(updated);
  }

  /**
   * Statistiques
   */
  async getStats() {
    return this.repository.getStats();
  }
}

module.exports = EvenementService;
